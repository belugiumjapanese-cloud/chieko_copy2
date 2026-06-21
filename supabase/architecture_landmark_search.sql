-- Architecture / landmark search support for Drop.
-- Run this AFTER supabase/full_app_schema.sql and app_support_after_full_schema.sql.
-- This migration is additive: it does not drop existing app tables or data.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.content_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ja text not null default '',
  description text not null default '',
  cover_image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_categories_slug_format check (slug ~ '^[a-z0-9_-]{2,48}$')
);

create table if not exists public.architects (
  id uuid primary key default gen_random_uuid(),
  catalog_key text unique,
  name_en text not null,
  name_ja text not null default '',
  aliases text[] not null default '{}',
  bio text not null default '',
  website_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.landmarks (
  id uuid primary key default gen_random_uuid(),
  catalog_key text unique,
  category_id uuid references public.content_categories(id) on delete set null,
  architect_id uuid references public.architects(id) on delete set null,
  name_en text not null,
  name_ja text not null default '',
  aliases text[] not null default '{}',
  description text not null default '',
  address text not null default '',
  latitude double precision not null,
  longitude double precision not null,
  completion_year integer,
  cover_image_url text,
  source_url text,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint landmarks_latitude_check check (latitude between -90 and 90),
  constraint landmarks_longitude_check check (longitude between -180 and 180)
);

create table if not exists public.landmark_posts (
  landmark_id uuid not null references public.landmarks(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  linked_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (landmark_id, post_id),
  unique (post_id)
);

create table if not exists public.profile_categories (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.content_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

alter table public.architects
  add column if not exists catalog_key text unique;

alter table public.landmarks
  add column if not exists catalog_key text unique;

create index if not exists content_categories_active_sort_idx
on public.content_categories (is_active, sort_order, created_at);

create index if not exists architects_name_en_trgm_idx
on public.architects using gin (name_en gin_trgm_ops);

create index if not exists architects_name_ja_trgm_idx
on public.architects using gin (name_ja gin_trgm_ops);

create index if not exists architects_aliases_idx
on public.architects using gin (aliases);

create index if not exists landmarks_name_en_trgm_idx
on public.landmarks using gin (name_en gin_trgm_ops);

create index if not exists landmarks_name_ja_trgm_idx
on public.landmarks using gin (name_ja gin_trgm_ops);

create index if not exists landmarks_aliases_idx
on public.landmarks using gin (aliases);

create index if not exists landmarks_architect_idx
on public.landmarks (architect_id, status);

create index if not exists landmarks_category_idx
on public.landmarks (category_id, status);

create index if not exists landmarks_geo_idx
on public.landmarks (latitude, longitude);

create index if not exists landmark_posts_post_idx
on public.landmark_posts (post_id);

create index if not exists profile_categories_category_idx
on public.profile_categories (category_id, created_at desc);

drop trigger if exists content_categories_set_updated_at on public.content_categories;
create trigger content_categories_set_updated_at before update on public.content_categories
for each row execute function public.set_updated_at();

drop trigger if exists architects_set_updated_at on public.architects;
create trigger architects_set_updated_at before update on public.architects
for each row execute function public.set_updated_at();

drop trigger if exists landmarks_set_updated_at on public.landmarks;
create trigger landmarks_set_updated_at before update on public.landmarks
for each row execute function public.set_updated_at();

alter table public.content_categories enable row level security;
alter table public.architects enable row level security;
alter table public.landmarks enable row level security;
alter table public.landmark_posts enable row level security;
alter table public.profile_categories enable row level security;

drop policy if exists "active categories readable" on public.content_categories;
create policy "active categories readable"
on public.content_categories for select
using (is_active or auth.uid() is not null);

drop policy if exists "architects readable" on public.architects;
create policy "architects readable"
on public.architects for select
using (true);

drop policy if exists "published landmarks readable" on public.landmarks;
create policy "published landmarks readable"
on public.landmarks for select
using (status = 'published' or created_by = auth.uid());

drop policy if exists "landmark post links readable" on public.landmark_posts;
create policy "landmark post links readable"
on public.landmark_posts for select
using (
  exists (
    select 1 from public.landmarks l
    where l.id = landmark_posts.landmark_id
      and (l.status = 'published' or l.created_by = auth.uid())
  )
  and exists (
    select 1 from public.posts p
    where p.id = landmark_posts.post_id
      and (p.visibility = 'public' or p.user_id = auth.uid())
  )
);

drop policy if exists "users link own posts to landmarks" on public.landmark_posts;
create policy "users link own posts to landmarks"
on public.landmark_posts for insert to authenticated
with check (
  linked_by = auth.uid()
  and exists (
    select 1 from public.posts p
    where p.id = landmark_posts.post_id and p.user_id = auth.uid()
  )
);

drop policy if exists "users unlink own posts from landmarks" on public.landmark_posts;
create policy "users unlink own posts from landmarks"
on public.landmark_posts for delete to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = landmark_posts.post_id and p.user_id = auth.uid()
  )
);

drop policy if exists "category memberships readable" on public.profile_categories;
create policy "category memberships readable"
on public.profile_categories for select
using (true);

drop policy if exists "users manage own categories" on public.profile_categories;
create policy "users manage own categories"
on public.profile_categories for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Only service-role/admin SQL should create or edit the shared landmark catalog.
-- Regular app users can read the catalog and link their own posts to it.

create or replace view public.app_landmark_search
with (security_invoker = true)
as
select
  l.id,
  l.catalog_key,
  l.category_id,
  c.slug as category_slug,
  c.name_en as category_name_en,
  c.name_ja as category_name_ja,
  l.architect_id,
  a.catalog_key as architect_catalog_key,
  a.name_en as architect_name_en,
  a.name_ja as architect_name_ja,
  a.aliases as architect_aliases,
  l.name_en,
  l.name_ja,
  l.aliases,
  l.description,
  l.address,
  l.latitude,
  l.longitude,
  l.completion_year,
  l.cover_image_url,
  l.created_at,
  coalesce(
    array_agg(lp.post_id order by lp.created_at) filter (where lp.post_id is not null),
    '{}'::uuid[]
  ) as post_ids
from public.landmarks l
left join public.architects a on a.id = l.architect_id
left join public.content_categories c on c.id = l.category_id
left join public.landmark_posts lp on lp.landmark_id = l.id
where l.status = 'published'
group by l.id, a.id, c.id;

grant select on public.app_landmark_search to anon, authenticated;

insert into public.content_categories (slug, name_en, name_ja, description, sort_order)
values
  ('architecture', 'Architecture', '建築', 'Buildings, details, architects, and urban observations.', 10),
  ('landscape', 'Landscape', 'ランドスケープ', 'Gardens, parks, public space, and designed landscapes.', 20)
on conflict (slug) do update set
  name_en = excluded.name_en,
  name_ja = excluded.name_ja,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- One searchable reference record. It can be edited or removed later from Table Editor.
insert into public.architects (catalog_key, name_en, name_ja, aliases)
values (
  'le-corbusier',
  'Le Corbusier',
  'ル・コルビュジエ',
  array['Le Corbu', 'Charles-Edouard Jeanneret']
)
on conflict (catalog_key) do update set
  name_en = excluded.name_en,
  name_ja = excluded.name_ja,
  aliases = excluded.aliases;

insert into public.landmarks (
  catalog_key,
  category_id,
  architect_id,
  name_en,
  name_ja,
  aliases,
  address,
  latitude,
  longitude,
  completion_year,
  status
)
select
  'villa-savoye-poissy',
  c.id,
  a.id,
  'Villa Savoye',
  'サヴォア邸',
  array['Villa Savoye Poissy', 'サボア邸'],
  '82 Rue de Villiers, 78300 Poissy, France',
  48.9245,
  2.0285,
  1931,
  'published'
from public.content_categories c
cross join public.architects a
where c.slug = 'architecture'
  and a.catalog_key = 'le-corbusier'
on conflict (catalog_key) do update set
  category_id = excluded.category_id,
  architect_id = excluded.architect_id,
  name_en = excluded.name_en,
  name_ja = excluded.name_ja,
  aliases = excluded.aliases,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  completion_year = excluded.completion_year,
  status = excluded.status;

-- CSV work split
-- 1) architects.csv: name_en,name_ja,aliases,bio,website_url
-- 2) landmarks.csv: category_id,architect_id,name_en,name_ja,aliases,address,
--    latitude,longitude,completion_year,cover_image_url,source_url,status
-- Import architects first, copy their generated ids, then import landmarks.
