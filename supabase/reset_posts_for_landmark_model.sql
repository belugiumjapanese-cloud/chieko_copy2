-- Reset all legacy posts and prepare the posts table for the new landmark flow.
--
-- DESTRUCTIVE: this permanently deletes every row in public.posts.
-- Run this once in the Supabase SQL Editor as the postgres role.
-- Users, profiles, folders, communities, architects, landmarks, and chat messages
-- are intentionally preserved.

begin;

-- A post can now originate from either a photo or a directly placed map pin.
alter table public.posts
  add column if not exists post_kind text not null default 'photo';

alter table public.posts
  drop constraint if exists posts_post_kind_check;

alter table public.posts
  add constraint posts_post_kind_check
  check (post_kind in ('photo', 'map_pin'));

-- Keep the source of the coordinates explicit for future editing and moderation.
alter table public.posts
  add column if not exists location_source text not null default 'manual';

alter table public.posts
  drop constraint if exists posts_location_source_check;

alter table public.posts
  add constraint posts_location_source_check
  check (location_source in ('photo_gps', 'manual', 'landmark'));

comment on column public.posts.post_kind is
  'New post format: photo selected by the user or a pin placed directly on the map.';

comment on column public.posts.location_source is
  'How coordinates were resolved: photo GPS, manual map placement, or canonical landmark.';

create index if not exists posts_post_kind_idx
  on public.posts (post_kind, created_at desc);

create index if not exists posts_location_source_idx
  on public.posts (location_source, created_at desc);

-- DELETE honors the existing foreign-key actions. It removes dependent likes,
-- comments, saves, reports, folder links, community links, and landmark links.
-- Unlike TRUNCATE ... CASCADE, it preserves community_messages and only clears
-- their optional post_id where the current FK uses ON DELETE SET NULL.
delete from public.posts;

-- Row counters are stored for fast profile/community rendering. Reset them
-- explicitly so the UI cannot show stale totals after the destructive reset.
update public.profiles
set
  pin_count = 0,
  public_pin_count = 0;

update public.communities
set posts_count = 0;

commit;

-- Verification: this value should be 0.
select count(*) as remaining_posts from public.posts;
