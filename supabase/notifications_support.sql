-- Optional support for "saved your pin" notifications.
-- Run this after full_app_schema.sql / app_support_after_full_schema.sql.

create or replace function public.app_save_notifications()
returns table (
  post_id uuid,
  user_id uuid,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.post_id,
    s.user_id,
    s.created_at
  from public.saved_posts s
  join public.posts p on p.id = s.post_id
  where p.user_id = auth.uid()
    and s.user_id <> auth.uid()
  order by s.created_at desc
  limit 200;
$$;

grant execute on function public.app_save_notifications() to authenticated;

-- Optional support for folder likes and "liked your folder" notifications.
create table if not exists public.folder_likes (
  folder_id uuid not null references public.folders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (folder_id, user_id)
);

create index if not exists folder_likes_folder_idx
on public.folder_likes (folder_id, created_at desc);

create index if not exists folder_likes_user_idx
on public.folder_likes (user_id, created_at desc);

alter table public.folder_likes enable row level security;

drop policy if exists "folder_likes readable" on public.folder_likes;
create policy "folder_likes readable"
on public.folder_likes
for select
using (true);

drop policy if exists "folder_likes own writes" on public.folder_likes;
create policy "folder_likes own writes"
on public.folder_likes
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.app_folder_like_notifications()
returns table (
  folder_id uuid,
  user_id uuid,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    fl.folder_id,
    fl.user_id,
    fl.created_at
  from public.folder_likes fl
  join public.folders f on f.id = fl.folder_id
  where f.user_id = auth.uid()
    and fl.user_id <> auth.uid()
  order by fl.created_at desc
  limit 200;
$$;

grant execute on function public.app_folder_like_notifications() to authenticated;

-- Optional paid folder price.
alter table public.folders
  add column if not exists folder_price_yen integer;

create or replace view public.app_folder_cards
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
  f.thumbnail_url,
  f.folder_kind,
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
  ) as post_ids,
  f.folder_price_yen
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
group by f.id, pr.id, preview.image_url;

-- Optional community invite notifications.
create table if not exists public.community_invites (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (community_id, invited_user_id)
);

create index if not exists community_invites_user_idx
on public.community_invites (invited_user_id, created_at desc);

alter table public.community_invites enable row level security;

drop policy if exists "community_invites own readable" on public.community_invites;
create policy "community_invites own readable"
on public.community_invites
for select
using (invited_user_id = auth.uid() or invited_by = auth.uid());

drop policy if exists "community_invites owner writes" on public.community_invites;
create policy "community_invites owner writes"
on public.community_invites
for all
using (
  invited_by = auth.uid()
  and exists (
    select 1
    from public.communities c
    where c.id = community_invites.community_id
      and c.owner_id = auth.uid()
  )
)
with check (
  invited_by = auth.uid()
  and exists (
    select 1
    from public.communities c
    where c.id = community_invites.community_id
      and c.owner_id = auth.uid()
  )
);

create or replace function public.app_send_community_invite(target_community_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.communities c
    where c.id = target_community_id
      and c.owner_id = auth.uid()
  ) then
    raise exception 'Only the community owner can invite users';
  end if;

  insert into public.community_invites (community_id, invited_by, invited_user_id)
  values (target_community_id, auth.uid(), target_user_id)
  on conflict (community_id, invited_user_id)
  do update set invited_by = excluded.invited_by, created_at = now(), accepted_at = null;
end;
$$;

grant execute on function public.app_send_community_invite(uuid, uuid) to authenticated;

create or replace function public.app_invite_notifications()
returns table (
  id uuid,
  community_id uuid,
  invited_by uuid,
  invited_user_id uuid,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    i.id,
    i.community_id,
    i.invited_by,
    i.invited_user_id,
    i.created_at
  from public.community_invites i
  where i.invited_user_id = auth.uid()
    and i.accepted_at is null
  order by i.created_at desc
  limit 100;
$$;

grant execute on function public.app_invite_notifications() to authenticated;

create or replace function public.app_accept_community_invite(target_community_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.community_invites i
    where i.community_id = target_community_id
      and i.invited_user_id = auth.uid()
  ) then
    raise exception 'Invite not found';
  end if;

  insert into public.community_members (community_id, user_id, role)
  values (target_community_id, auth.uid(), 'member')
  on conflict (community_id, user_id) do nothing;

  update public.community_invites
  set accepted_at = now()
  where community_id = target_community_id
    and invited_user_id = auth.uid();
end;
$$;

grant execute on function public.app_accept_community_invite(uuid) to authenticated;
