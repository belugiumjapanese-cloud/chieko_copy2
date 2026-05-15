-- App support layer for the current Spot / memory map schema.
-- Run this AFTER the main schema in Supabase SQL Editor.
-- This does not drop or recreate your core tables.

-- 1) Storage read setup
-- The current frontend uses image_url values directly. For that to work with
-- Supabase Storage public URLs, the buckets need public read access.
-- Later, if private images must be truly private, switch the app to signed URLs.
update storage.buckets
set public = true
where id in ('post-images', 'profile-images');

drop policy if exists "public can read post images" on storage.objects;
create policy "public can read post images"
on storage.objects
for select
to public
using (bucket_id = 'post-images');

drop policy if exists "public can read profile images" on storage.objects;
create policy "public can read profile images"
on storage.objects
for select
to public
using (bucket_id = 'profile-images');

-- 2) Auth profile bootstrap refinement
-- The main schema already creates handle_new_user(). This version also honors
-- the username passed from the app sign-up form when it is valid and unused.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_username text;
begin
  candidate_username := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '^@', ''), '');

  if candidate_username is null
    or candidate_username !~ '^[a-zA-Z0-9_\.]{3,32}$'
    or exists (select 1 from public.profiles p where p.username = candidate_username)
  then
    candidate_username := 'user_' || substr(new.id::text, 1, 8);
  end if;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    candidate_username,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Avoid recursive membership reads from the first schema draft.
-- Public community membership remains readable, while private membership is
-- limited to the member themself or the community owner.
drop policy if exists "community_members readable" on public.community_members;
create policy "community_members readable"
on public.community_members
for select
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.communities c
    where c.id = community_members.community_id
      and (c.visibility = 'public' or c.owner_id = auth.uid())
  )
);

-- 3) Views shaped for the app UI
-- Use security_invoker so the underlying RLS policies still apply.

drop function if exists public.app_chaos_posts(integer);
drop function if exists public.app_timeline_posts(integer);
drop function if exists public.app_my_world_posts(integer);
drop function if exists public.app_to_visit_posts(integer);
drop function if exists public.app_search_posts(text, integer);
drop function if exists public.app_recent_public_folders(integer);
drop function if exists public.app_random_public_folders(integer);
drop function if exists public.app_search_folders(text, integer);
drop function if exists public.app_joined_communities(integer);
drop function if exists public.app_recommended_communities(integer);
drop function if exists public.app_community_posts(uuid, integer);
drop function if exists public.app_community_feed(uuid, integer);
drop function if exists public.app_add_post_to_folder(uuid, uuid);
drop function if exists public.app_remove_post_from_folder(uuid, uuid);

drop view if exists public.app_post_cards;
create view public.app_post_cards
with (security_invoker = true)
as
select
  p.id,
  p.user_id,
  pr.username,
  pr.display_name,
  pr.avatar_url,
  p.title,
  p.description,
  p.latitude,
  p.longitude,
  p.image_url,
  p.external_url,
  p.source_type,
  p.source_credit,
  p.address,
  p.visibility,
  p.tags,
  p.taken_at,
  p.likes_count,
  p.comments_count,
  p.saves_count,
  p.reports_count,
  p.created_at,
  p.updated_at,
  coalesce(
    array_agg(distinct fp.folder_id) filter (where fp.folder_id is not null),
    '{}'::uuid[]
  ) as folder_ids,
  coalesce(
    array_agg(distinct cp.community_id) filter (where cp.community_id is not null),
    '{}'::uuid[]
  ) as community_ids
from public.posts p
join public.profiles pr on pr.id = p.user_id
left join public.folder_posts fp on fp.post_id = p.id
left join public.community_posts cp on cp.post_id = p.id
group by
  p.id,
  pr.id;

drop view if exists public.app_folder_cards;
create view public.app_folder_cards
with (security_invoker = true)
as
select
  f.id,
  f.user_id,
  pr.username,
  pr.display_name,
  pr.avatar_url,
  f.name,
  f.description,
  f.color,
  f.visibility,
  f.is_paid,
  f.paid_from_index,
  f.category,
  f.tags,
  f.created_at,
  f.updated_at,
  coalesce(count(fp.post_id), 0)::integer as pin_count,
  preview.image_url as preview_image_url,
  coalesce(
    array_agg(fp.post_id order by fp.sort_order, fp.created_at) filter (where fp.post_id is not null),
    '{}'::uuid[]
  ) as post_ids
from public.folders f
join public.profiles pr on pr.id = f.user_id
left join public.folder_posts fp on fp.folder_id = f.id
left join lateral (
  select p.image_url
  from public.folder_posts fp2
  join public.posts p on p.id = fp2.post_id
  where fp2.folder_id = f.id
  order by fp2.sort_order, fp2.created_at
  limit 1
) preview on true
group by
  f.id,
  pr.id,
  preview.image_url;

drop view if exists public.app_community_cards;
create view public.app_community_cards
with (security_invoker = true)
as
select
  c.id,
  c.slug,
  c.name,
  c.description,
  c.owner_id,
  pr.username as owner_username,
  pr.display_name as owner_display_name,
  pr.avatar_url as owner_avatar_url,
  c.visibility,
  c.invite_code,
  c.member_count,
  c.posts_count,
  c.created_at,
  c.updated_at,
  preview.image_url as preview_image_url,
  exists (
    select 1
    from public.community_members cm
    where cm.community_id = c.id
      and cm.user_id = auth.uid()
  ) as joined_by_me
from public.communities c
join public.profiles pr on pr.id = c.owner_id
left join lateral (
  select p.image_url
  from public.community_posts cp
  join public.posts p on p.id = cp.post_id
  where cp.community_id = c.id
  order by cp.created_at desc
  limit 1
) preview on true;

drop view if exists public.app_community_activity;
create view public.app_community_activity
with (security_invoker = true)
as
select
  ('post:' || cp.community_id::text || ':' || cp.post_id::text) as id,
  cp.community_id,
  cp.user_id,
  pr.username,
  pr.display_name,
  cp.post_id,
  'post'::text as activity_type,
  coalesce(cp.title_override, p.title) as title,
  coalesce(cp.description_override, p.description) as body,
  cp.created_at
from public.community_posts cp
join public.posts p on p.id = cp.post_id
join public.profiles pr on pr.id = cp.user_id
union all
select
  ('message:' || m.id::text) as id,
  m.community_id,
  m.user_id,
  pr.username,
  pr.display_name,
  m.post_id,
  'message'::text as activity_type,
  ''::text as title,
  m.body,
  m.created_at
from public.community_messages m
join public.profiles pr on pr.id = m.user_id;

-- 4) RPCs for screens in the current app

drop function if exists public.app_chaos_posts(integer);
create function public.app_chaos_posts(limit_count integer default 80)
returns setof public.app_post_cards
language sql
stable
security invoker
as $$
  select *
  from public.app_post_cards
  where visibility = 'public'
  order by created_at desc
  limit greatest(1, least(limit_count, 200));
$$;

drop function if exists public.app_timeline_posts(integer);
create function public.app_timeline_posts(limit_count integer default 80)
returns setof public.app_post_cards
language sql
stable
security invoker
as $$
  select pc.*
  from public.app_post_cards pc
  where pc.visibility = 'public'
    and (
      exists (
        select 1
        from public.follows f
        where f.follower_id = auth.uid()
          and f.following_id = pc.user_id
      )
      or exists (
        select 1
        from public.community_posts cp
        join public.community_members cm on cm.community_id = cp.community_id
        where cp.post_id = pc.id
          and cm.user_id = auth.uid()
      )
    )
  order by pc.created_at desc
  limit greatest(1, least(limit_count, 200));
$$;

drop function if exists public.app_my_world_posts(integer);
create function public.app_my_world_posts(limit_count integer default 200)
returns setof public.app_post_cards
language sql
stable
security invoker
as $$
  select *
  from public.app_post_cards
  where user_id = auth.uid()
  order by created_at desc
  limit greatest(1, least(limit_count, 500));
$$;

drop function if exists public.app_to_visit_posts(integer);
create function public.app_to_visit_posts(limit_count integer default 200)
returns setof public.app_post_cards
language sql
stable
security invoker
as $$
  select pc.*
  from public.saved_posts s
  join public.app_post_cards pc on pc.id = s.post_id
  where s.user_id = auth.uid()
  order by s.created_at desc
  limit greatest(1, least(limit_count, 500));
$$;

drop function if exists public.app_search_posts(text, integer);
create function public.app_search_posts(search_text text, limit_count integer default 80)
returns setof public.app_post_cards
language sql
stable
security invoker
as $$
  select pc.*
  from public.app_post_cards pc
  join public.posts p on p.id = pc.id
  where pc.visibility = 'public'
    and (
      nullif(trim(search_text), '') is null
      or p.search_vector @@ plainto_tsquery('simple', search_text)
      or pc.title ilike '%' || search_text || '%'
      or pc.description ilike '%' || search_text || '%'
      or pc.address ilike '%' || search_text || '%'
      or exists (
        select 1 from unnest(pc.tags) tag
        where tag ilike '%' || search_text || '%'
      )
    )
  order by pc.created_at desc
  limit greatest(1, least(limit_count, 200));
$$;

drop function if exists public.app_recent_public_folders(integer);
create function public.app_recent_public_folders(limit_count integer default 30)
returns setof public.app_folder_cards
language sql
stable
security invoker
as $$
  select *
  from public.app_folder_cards
  where visibility = 'public'
  order by created_at desc
  limit greatest(1, least(limit_count, 100));
$$;

drop function if exists public.app_random_public_folders(integer);
create function public.app_random_public_folders(limit_count integer default 30)
returns setof public.app_folder_cards
language sql
stable
security invoker
as $$
  select *
  from public.app_folder_cards
  where visibility = 'public'
  order by random()
  limit greatest(1, least(limit_count, 100));
$$;

drop function if exists public.app_search_folders(text, integer);
create function public.app_search_folders(search_text text, limit_count integer default 30)
returns setof public.app_folder_cards
language sql
stable
security invoker
as $$
  select *
  from public.app_folder_cards
  where visibility = 'public'
    and (
      nullif(trim(search_text), '') is null
      or name ilike '%' || search_text || '%'
      or description ilike '%' || search_text || '%'
      or category ilike '%' || search_text || '%'
      or exists (
        select 1 from unnest(tags) tag
        where tag ilike '%' || search_text || '%'
      )
    )
  order by created_at desc
  limit greatest(1, least(limit_count, 100));
$$;

drop function if exists public.app_joined_communities(integer);
create function public.app_joined_communities(limit_count integer default 50)
returns setof public.app_community_cards
language sql
stable
security invoker
as $$
  select c.*
  from public.app_community_cards c
  where c.joined_by_me = true
  order by c.created_at desc
  limit greatest(1, least(limit_count, 100));
$$;

drop function if exists public.app_recommended_communities(integer);
create function public.app_recommended_communities(limit_count integer default 50)
returns setof public.app_community_cards
language sql
stable
security invoker
as $$
  select c.*
  from public.app_community_cards c
  where c.visibility = 'public'
    and c.joined_by_me = false
  order by c.posts_count desc, c.member_count desc, c.created_at desc
  limit greatest(1, least(limit_count, 100));
$$;

drop function if exists public.app_community_posts(uuid, integer);
create function public.app_community_posts(target_community_id uuid, limit_count integer default 200)
returns setof public.app_post_cards
language sql
stable
security invoker
as $$
  select pc.*
  from public.community_posts cp
  join public.app_post_cards pc on pc.id = cp.post_id
  where cp.community_id = target_community_id
  order by cp.created_at desc
  limit greatest(1, least(limit_count, 500));
$$;

drop function if exists public.app_community_feed(uuid, integer);
create function public.app_community_feed(target_community_id uuid, limit_count integer default 100)
returns setof public.app_community_activity
language sql
stable
security invoker
as $$
  select *
  from public.app_community_activity
  where community_id = target_community_id
  order by created_at desc
  limit greatest(1, least(limit_count, 300));
$$;

drop function if exists public.app_add_post_to_folder(uuid, uuid);
create function public.app_add_post_to_folder(target_folder_id uuid, target_post_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  insert into public.folder_posts (folder_id, post_id, user_id)
  select f.id, target_post_id, auth.uid()
  from public.folders f
  where f.id = target_folder_id
    and f.user_id = auth.uid()
  on conflict (folder_id, post_id) do nothing;
end;
$$;

drop function if exists public.app_remove_post_from_folder(uuid, uuid);
create function public.app_remove_post_from_folder(target_folder_id uuid, target_post_id uuid)
returns void
language sql
security invoker
as $$
  delete from public.folder_posts
  where folder_id = target_folder_id
    and post_id = target_post_id
    and user_id = auth.uid();
$$;

-- 5) Optional saved folders support.
-- Useful if later Find lets users save a whole public folder.
create table if not exists public.saved_folders (
  folder_id uuid not null references public.folders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (folder_id, user_id)
);

create index if not exists saved_folders_user_idx
on public.saved_folders (user_id, created_at desc);

alter table public.saved_folders enable row level security;

drop policy if exists "saved_folders own readable" on public.saved_folders;
create policy "saved_folders own readable"
on public.saved_folders
for select
using (user_id = auth.uid());

drop policy if exists "saved_folders own writes" on public.saved_folders;
create policy "saved_folders own writes"
on public.saved_folders
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
