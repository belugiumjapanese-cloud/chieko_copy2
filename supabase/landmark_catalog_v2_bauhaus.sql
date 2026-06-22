-- Landmark catalog v2: unlimited names, architects, and searchable keywords.
-- Run after architecture_landmark_search.sql.
-- This migration is additive and seeds Bauhaus Dessau as the first example.

begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.landmark_names (
  id uuid primary key default gen_random_uuid(),
  landmark_id uuid not null references public.landmarks(id) on delete cascade,
  name text not null,
  locale text not null default 'und',
  name_type text not null default 'alias'
    check (name_type in ('primary', 'official', 'alias', 'former', 'short')),
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (landmark_id, locale, name)
);

create table if not exists public.landmark_architects (
  landmark_id uuid not null references public.landmarks(id) on delete cascade,
  architect_id uuid not null references public.architects(id) on delete cascade,
  role text not null default 'architect',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (landmark_id, architect_id)
);

create table if not exists public.landmark_keywords (
  id uuid primary key default gen_random_uuid(),
  landmark_id uuid not null references public.landmarks(id) on delete cascade,
  keyword text not null,
  locale text not null default 'und',
  keyword_type text not null default 'related'
    check (keyword_type in ('related', 'style', 'movement', 'material', 'feature', 'use')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (landmark_id, locale, keyword)
);

create index if not exists landmark_names_landmark_idx
  on public.landmark_names (landmark_id, is_primary desc, sort_order);
create index if not exists landmark_names_name_trgm_idx
  on public.landmark_names using gin (name gin_trgm_ops);
create index if not exists landmark_architects_architect_idx
  on public.landmark_architects (architect_id, sort_order);
create index if not exists landmark_keywords_landmark_idx
  on public.landmark_keywords (landmark_id, sort_order);
create index if not exists landmark_keywords_keyword_trgm_idx
  on public.landmark_keywords using gin (keyword gin_trgm_ops);

alter table public.landmark_names enable row level security;
alter table public.landmark_architects enable row level security;
alter table public.landmark_keywords enable row level security;

drop policy if exists "landmark names readable" on public.landmark_names;
create policy "landmark names readable"
  on public.landmark_names for select using (true);

drop policy if exists "landmark architects readable" on public.landmark_architects;
create policy "landmark architects readable"
  on public.landmark_architects for select using (true);

drop policy if exists "landmark keywords readable" on public.landmark_keywords;
create policy "landmark keywords readable"
  on public.landmark_keywords for select using (true);

grant select on public.landmark_names to anon, authenticated;
grant select on public.landmark_architects to anon, authenticated;
grant select on public.landmark_keywords to anon, authenticated;

-- Preserve all existing catalog records in the new relation tables.
insert into public.landmark_architects (landmark_id, architect_id, role, sort_order)
select id, architect_id, 'architect', 0
from public.landmarks
where architect_id is not null
on conflict (landmark_id, architect_id) do nothing;

insert into public.landmark_names (landmark_id, name, locale, name_type, is_primary, sort_order)
select id, name_en, 'en', 'primary', true, 0
from public.landmarks
where trim(name_en) <> ''
on conflict (landmark_id, locale, name) do update set
  name_type = excluded.name_type,
  is_primary = excluded.is_primary,
  sort_order = excluded.sort_order;

insert into public.landmark_names (landmark_id, name, locale, name_type, is_primary, sort_order)
select id, name_ja, 'ja', 'primary', true, 0
from public.landmarks
where trim(name_ja) <> ''
on conflict (landmark_id, locale, name) do update set
  name_type = excluded.name_type,
  is_primary = excluded.is_primary,
  sort_order = excluded.sort_order;

insert into public.landmark_names (landmark_id, name, locale, name_type, is_primary, sort_order)
select l.id, alias_name, 'und', 'alias', false, alias_order
from public.landmarks l
cross join lateral unnest(l.aliases) with ordinality as alias_row(alias_name, alias_order)
where trim(alias_name) <> ''
on conflict (landmark_id, locale, name) do nothing;

-- Search view consumed by the app. The old singular columns stay available for
-- compatibility while the new arrays expose every name, architect, and keyword.
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
  coalesce(architect_rollup.architect_ids[1], l.architect_id) as architect_id,
  primary_architect.catalog_key as architect_catalog_key,
  coalesce(architect_rollup.architect_names_en[1], primary_architect.name_en) as architect_name_en,
  coalesce(architect_rollup.architect_names_ja[1], primary_architect.name_ja) as architect_name_ja,
  coalesce(architect_rollup.architect_aliases, primary_architect.aliases, array[]::text[]) as architect_aliases,
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
  coalesce(post_rollup.post_ids, array[]::uuid[]) as post_ids,
  coalesce(architect_rollup.architect_ids, array[]::uuid[]) as architect_ids,
  coalesce(architect_rollup.architect_names_en, array[]::text[]) as architect_names_en,
  coalesce(architect_rollup.architect_names_ja, array[]::text[]) as architect_names_ja,
  coalesce(name_rollup.names, array[]::text[]) as names,
  coalesce(keyword_rollup.keywords, array[]::text[]) as keywords,
  l.source_url
from public.landmarks l
left join public.content_categories c on c.id = l.category_id
left join lateral (
  select
    array_agg(a.id order by la.sort_order, a.name_en) as architect_ids,
    array_agg(a.name_en order by la.sort_order, a.name_en) as architect_names_en,
    array_agg(a.name_ja order by la.sort_order, a.name_en) as architect_names_ja,
    array(
      select distinct architect_alias
      from public.landmark_architects la2
      join public.architects a2 on a2.id = la2.architect_id
      cross join lateral unnest(a2.aliases) as architect_alias
      where la2.landmark_id = l.id
      order by architect_alias
    ) as architect_aliases
  from public.landmark_architects la
  join public.architects a on a.id = la.architect_id
  where la.landmark_id = l.id
) architect_rollup on true
left join public.architects primary_architect
  on primary_architect.id = coalesce(architect_rollup.architect_ids[1], l.architect_id)
left join lateral (
  select array_agg(ln.name order by ln.is_primary desc, ln.sort_order, ln.name) as names
  from public.landmark_names ln
  where ln.landmark_id = l.id
) name_rollup on true
left join lateral (
  select array_agg(lk.keyword order by lk.sort_order, lk.keyword) as keywords
  from public.landmark_keywords lk
  where lk.landmark_id = l.id
) keyword_rollup on true
left join lateral (
  select array_agg(lp.post_id order by lp.created_at) as post_ids
  from public.landmark_posts lp
  where lp.landmark_id = l.id
) post_rollup on true
where l.status = 'published';

grant select on public.app_landmark_search to anon, authenticated;

-- Seed: Walter Gropius.
insert into public.architects (catalog_key, name_en, name_ja, aliases)
values (
  'walter-gropius',
  'Walter Gropius',
  'ヴァルター・グロピウス',
  array['Walter Adolph Gropius', 'W. Gropius', 'グロピウス']
)
on conflict (catalog_key) do update set
  name_en = excluded.name_en,
  name_ja = excluded.name_ja,
  aliases = excluded.aliases;

-- Seed: Bauhaus Dessau. No cover image is set intentionally; the app chooses an
-- uploaded #外観 image first, then any uploaded image as the hero fallback.
insert into public.landmarks (
  catalog_key,
  category_id,
  architect_id,
  name_en,
  name_ja,
  aliases,
  description,
  address,
  latitude,
  longitude,
  completion_year,
  cover_image_url,
  source_url,
  status
)
select
  'bauhaus-dessau-building',
  c.id,
  a.id,
  'Bauhaus Dessau',
  'バウハウス デッサウ校',
  array['Bauhaus Building Dessau', 'Bauhausgebäude Dessau', 'バウハウス・デッサウ校'],
  'The Bauhaus school building in Dessau, completed in 1926 and designed by Walter Gropius.',
  'Gropiusallee 38, 06846 Dessau-Roßlau, Germany',
  51.8393593,
  12.2273397,
  1926,
  null,
  'https://bauhaus-dessau.de/',
  'published'
from public.content_categories c
cross join public.architects a
where c.slug = 'architecture'
  and a.catalog_key = 'walter-gropius'
on conflict (catalog_key) do update set
  category_id = excluded.category_id,
  architect_id = excluded.architect_id,
  name_en = excluded.name_en,
  name_ja = excluded.name_ja,
  aliases = excluded.aliases,
  description = excluded.description,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  completion_year = excluded.completion_year,
  source_url = excluded.source_url,
  status = excluded.status;

insert into public.landmark_architects (landmark_id, architect_id, role, sort_order)
select l.id, a.id, 'architect', 0
from public.landmarks l
cross join public.architects a
where l.catalog_key = 'bauhaus-dessau-building'
  and a.catalog_key = 'walter-gropius'
on conflict (landmark_id, architect_id) do update set
  role = excluded.role,
  sort_order = excluded.sort_order;

insert into public.landmark_names (landmark_id, name, locale, name_type, is_primary, sort_order)
select l.id, seed.name, seed.locale, seed.name_type, seed.is_primary, seed.sort_order
from public.landmarks l
cross join (
  values
    ('Bauhaus Dessau', 'en', 'primary', true, 0),
    ('Bauhaus Building Dessau', 'en', 'official', false, 10),
    ('バウハウス デッサウ校', 'ja', 'primary', true, 0),
    ('バウハウス・デッサウ校', 'ja', 'alias', false, 10),
    ('Bauhausgebäude Dessau', 'de', 'official', false, 0)
) as seed(name, locale, name_type, is_primary, sort_order)
where l.catalog_key = 'bauhaus-dessau-building'
on conflict (landmark_id, locale, name) do update set
  name_type = excluded.name_type,
  is_primary = excluded.is_primary,
  sort_order = excluded.sort_order;

insert into public.landmark_keywords (landmark_id, keyword, locale, keyword_type, sort_order)
select l.id, seed.keyword, seed.locale, seed.keyword_type, seed.sort_order
from public.landmarks l
cross join (
  values
    ('バウハウス', 'ja', 'movement', 0),
    ('Bauhaus', 'en', 'movement', 1),
    ('モダニズム', 'ja', 'style', 10),
    ('Modernism', 'en', 'style', 11)
) as seed(keyword, locale, keyword_type, sort_order)
where l.catalog_key = 'bauhaus-dessau-building'
on conflict (landmark_id, locale, keyword) do update set
  keyword_type = excluded.keyword_type,
  sort_order = excluded.sort_order;

commit;

-- Verification: should return the Bauhaus record with all names and keywords.
select
  catalog_key,
  name_en,
  name_ja,
  architect_names_en,
  architect_names_ja,
  names,
  keywords,
  address,
  latitude,
  longitude,
  source_url
from public.app_landmark_search
where catalog_key = 'bauhaus-dessau-building';
