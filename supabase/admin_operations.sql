-- Admin / operations support for the Spot Map app.
-- Run this after full_app_schema.sql, app_support_after_full_schema.sql,
-- and notifications_support.sql.
--
-- After running this file, add your own user id to public.admin_users:
-- insert into public.admin_users (user_id, role)
-- values ('YOUR_AUTH_USER_ID_HERE', 'owner')
-- on conflict (user_id) do update set role = excluded.role;

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin', 'moderator')),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin users can read self" on public.admin_users;
create policy "admin users can read self"
on public.admin_users
for select
using (user_id = auth.uid());

create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_events_created_idx
on public.app_events (created_at desc);

create index if not exists app_events_user_created_idx
on public.app_events (user_id, created_at desc);

create index if not exists app_events_type_created_idx
on public.app_events (event_type, created_at desc);

alter table public.app_events enable row level security;

drop policy if exists "users insert own app events" on public.app_events;
create policy "users insert own app events"
on public.app_events
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users read own app events" on public.app_events;
create policy "users read own app events"
on public.app_events
for select
to authenticated
using (user_id = auth.uid());

create table if not exists public.recommend_items (
  id uuid primary key default gen_random_uuid(),
  item_type text not null default 'event',
  title text not null,
  description text,
  image_url text,
  target_url text,
  folder_id uuid references public.folders(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  community_id uuid references public.communities(id) on delete set null,
  priority integer not null default 100,
  is_published boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.recommend_items') is not null then
    alter table public.recommend_items
      drop constraint if exists recommend_items_item_type_check;

    alter table public.recommend_items
      add constraint recommend_items_item_type_check
      check (item_type in ('event', 'folder_pick', 'official_folder', 'community_pick', 'post_pick', 'announcement'));
  end if;
end $$;

create index if not exists recommend_items_publish_idx
on public.recommend_items (is_published, priority, created_at desc);

create index if not exists recommend_items_folder_idx
on public.recommend_items (folder_id);

create index if not exists recommend_items_community_idx
on public.recommend_items (community_id);

create index if not exists recommend_items_post_idx
on public.recommend_items (post_id);

drop trigger if exists recommend_items_set_updated_at on public.recommend_items;
create trigger recommend_items_set_updated_at
before update on public.recommend_items
for each row execute function public.set_updated_at();

alter table public.recommend_items enable row level security;

drop policy if exists "published recommend items readable" on public.recommend_items;
create policy "published recommend items readable"
on public.recommend_items
for select
using (
  is_published = true
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);

drop policy if exists "admins can read recommend items" on public.recommend_items;
create policy "admins can read recommend items"
on public.recommend_items
for select
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop view if exists public.admin_community_hierarchy;
create view public.admin_community_hierarchy
with (security_invoker = true)
as
select
  c.id as community_id,
  c.name as community_name,
  c.community_type,
  c.post_policy,
  c.visibility as community_visibility,
  cm.user_id,
  pr.username,
  pr.display_name,
  pr.avatar_url,
  cm.role,
  cm.contribution_level,
  cm.approved_posts_count,
  cm.status,
  cm.created_at as joined_at
from public.community_members cm
join public.communities c on c.id = cm.community_id
join public.profiles pr on pr.id = cm.user_id
where exists (select 1 from public.admin_users a where a.user_id = auth.uid())
order by
  c.name,
  case cm.role when 'owner' then 0 when 'moderator' then 1 else 2 end,
  cm.contribution_level desc,
  cm.approved_posts_count desc;

-- Writes are intentionally handled by the Next.js admin API using
-- SUPABASE_SERVICE_ROLE_KEY. Do not expose that key to the browser.
