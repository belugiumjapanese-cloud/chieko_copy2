-- Spot / memory map app schema
-- Run this in Supabase SQL Editor after deleting old app tables if needed.
-- Supabase Auth stores email/password in auth.users. public.profiles extends it.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text not null default '',
  bio text not null default '',
  avatar_url text,
  website_url text,
  follower_count integer not null default 0,
  following_count integer not null default 0,
  pin_count integer not null default 0,
  public_pin_count integer not null default 0,
  folder_count integer not null default 0,
  public_folder_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username is null or username ~ '^[a-zA-Z0-9_\\.]{3,32}$')
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  latitude double precision not null,
  longitude double precision not null,
  image_url text,
  external_url text,
  source_type text not null default 'original' check (source_type in ('original', 'downloaded', 'quoted')),
  source_credit text,
  address text,
  visibility text not null default 'private' check (visibility in ('private', 'public', 'followers')),
  tags text[] not null default '{}',
  taken_at timestamptz,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  saves_count integer not null default 0,
  reports_count integer not null default 0,
  search_vector tsvector not null default ''::tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  color text not null default '#126b58',
  thumbnail_url text,
  visibility text not null default 'private' check (visibility in ('private', 'public', 'followers')),
  is_paid boolean not null default false,
  paid_from_index integer,
  category text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.folder_posts (
  folder_id uuid not null references public.folders(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sort_order integer not null default 0,
  note text not null default '',
  created_at timestamptz not null default now(),
  primary key (folder_id, post_id)
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_posts (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  owner_id uuid not null references public.profiles(id) on delete cascade,
  visibility text not null default 'public' check (visibility in ('public', 'invite_only', 'private')),
  invite_code text unique,
  member_count integer not null default 1,
  posts_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_slug_format check (slug ~ '^[a-z0-9_-]{3,48}$')
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.community_posts (
  community_id uuid not null references public.communities(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_override text,
  description_override text,
  tags_override text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (community_id, post_id)
);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default '',
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists posts_user_created_idx on public.posts (user_id, created_at desc);
create index if not exists posts_visibility_created_idx on public.posts (visibility, created_at desc);
create index if not exists posts_geo_idx on public.posts (latitude, longitude);
create index if not exists posts_search_idx on public.posts using gin (search_vector);
create index if not exists posts_tags_idx on public.posts using gin (tags);
create index if not exists folders_user_idx on public.folders (user_id, created_at desc);
create index if not exists folder_posts_post_idx on public.folder_posts (post_id);
create index if not exists saved_posts_user_idx on public.saved_posts (user_id, created_at desc);
create index if not exists community_posts_post_idx on public.community_posts (post_id);
create index if not exists community_messages_idx on public.community_messages (community_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts
for each row execute function public.set_updated_at();

create or replace function public.set_post_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector =
    to_tsvector(
      'simple',
      coalesce(new.title, '') || ' ' ||
      coalesce(new.description, '') || ' ' ||
      coalesce(new.address, '') || ' ' ||
      coalesce(array_to_string(new.tags, ' '), '')
    );
  return new;
end;
$$;

drop trigger if exists posts_set_search_vector on public.posts;
create trigger posts_set_search_vector before insert or update of title, description, address, tags on public.posts
for each row execute function public.set_post_search_vector();

drop trigger if exists folders_set_updated_at on public.folders;
create trigger folders_set_updated_at before update on public.folders
for each row execute function public.set_updated_at();

drop trigger if exists communities_set_updated_at on public.communities;
create trigger communities_set_updated_at before update on public.communities
for each row execute function public.set_updated_at();

drop trigger if exists post_comments_set_updated_at on public.post_comments;
create trigger post_comments_set_updated_at before update on public.post_comments
for each row execute function public.set_updated_at();

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at before update on public.community_posts
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    'user_' || substr(new.id::text, 1, 8),
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

create or replace function public.refresh_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    update public.profiles set follower_count = follower_count + 1 where id = new.following_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.profiles set following_count = greatest(0, following_count - 1) where id = old.follower_id;
    update public.profiles set follower_count = greatest(0, follower_count - 1) where id = old.following_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists follows_refresh_counts on public.follows;
create trigger follows_refresh_counts
after insert or delete on public.follows
for each row execute function public.refresh_follow_counts();

create or replace function public.recount_profile_pins(target_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set
    pin_count = (select count(*) from public.posts where user_id = target_user_id),
    public_pin_count = (select count(*) from public.posts where user_id = target_user_id and visibility = 'public')
  where id = target_user_id;
$$;

create or replace function public.refresh_profile_pin_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recount_profile_pins(new.user_id);
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    perform public.recount_profile_pins(old.user_id);
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_refresh_profile_counts on public.posts;
create trigger posts_refresh_profile_counts
after insert or update of user_id, visibility or delete on public.posts
for each row execute function public.refresh_profile_pin_counts();

create or replace function public.recount_profile_folders(target_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set
    folder_count = (select count(*) from public.folders where user_id = target_user_id),
    public_folder_count = (select count(*) from public.folders where user_id = target_user_id and visibility = 'public')
  where id = target_user_id;
$$;

create or replace function public.refresh_profile_folder_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.recount_profile_folders(new.user_id);
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    perform public.recount_profile_folders(old.user_id);
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists folders_refresh_profile_counts on public.folders;
create trigger folders_refresh_profile_counts
after insert or update of user_id, visibility or delete on public.folders
for each row execute function public.refresh_profile_folder_counts();

create or replace function public.refresh_post_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post_id uuid;
begin
  target_post_id := coalesce(new.post_id, old.post_id);
  update public.posts
  set
    likes_count = (select count(*) from public.post_likes where post_id = target_post_id),
    comments_count = (select count(*) from public.post_comments where post_id = target_post_id),
    saves_count = (select count(*) from public.saved_posts where post_id = target_post_id),
    reports_count = (select count(*) from public.post_reports where post_id = target_post_id)
  where id = target_post_id;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists post_likes_refresh_counts on public.post_likes;
create trigger post_likes_refresh_counts
after insert or delete on public.post_likes
for each row execute function public.refresh_post_counts();

drop trigger if exists post_comments_refresh_counts on public.post_comments;
create trigger post_comments_refresh_counts
after insert or delete on public.post_comments
for each row execute function public.refresh_post_counts();

drop trigger if exists saved_posts_refresh_counts on public.saved_posts;
create trigger saved_posts_refresh_counts
after insert or delete on public.saved_posts
for each row execute function public.refresh_post_counts();

drop trigger if exists post_reports_refresh_counts on public.post_reports;
create trigger post_reports_refresh_counts
after insert or delete on public.post_reports
for each row execute function public.refresh_post_counts();

create or replace function public.refresh_community_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_community_id uuid;
begin
  target_community_id := coalesce(new.community_id, old.community_id);
  update public.communities
  set
    member_count = (select count(*) from public.community_members where community_id = target_community_id),
    posts_count = (select count(*) from public.community_posts where community_id = target_community_id)
  where id = target_community_id;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists community_members_refresh_counts on public.community_members;
create trigger community_members_refresh_counts
after insert or delete on public.community_members
for each row execute function public.refresh_community_counts();

drop trigger if exists community_posts_refresh_counts on public.community_posts;
create trigger community_posts_refresh_counts
after insert or delete on public.community_posts
for each row execute function public.refresh_community_counts();

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.folders enable row level security;
alter table public.folder_posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.saved_posts enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_messages enable row level security;
alter table public.post_reports enable row level security;

drop policy if exists "profiles readable" on public.profiles;
create policy "profiles readable" on public.profiles for select using (true);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "follows readable" on public.follows;
create policy "follows readable" on public.follows for select using (true);
drop policy if exists "follows own writes" on public.follows;
create policy "follows own writes" on public.follows for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());

drop policy if exists "posts readable by visibility" on public.posts;
create policy "posts readable by visibility" on public.posts for select using (
  visibility = 'public'
  or user_id = auth.uid()
  or exists (select 1 from public.saved_posts s where s.post_id = posts.id and s.user_id = auth.uid())
  or exists (
    select 1
    from public.community_posts cp
    join public.communities c on c.id = cp.community_id
    left join public.community_members cm on cm.community_id = c.id and cm.user_id = auth.uid()
    where cp.post_id = posts.id and (c.visibility = 'public' or cm.user_id is not null)
  )
);
drop policy if exists "posts insert own" on public.posts;
create policy "posts insert own" on public.posts for insert with check (user_id = auth.uid());
drop policy if exists "posts update own" on public.posts;
create policy "posts update own" on public.posts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "posts delete own" on public.posts;
create policy "posts delete own" on public.posts for delete using (user_id = auth.uid());

drop policy if exists "folders readable" on public.folders;
create policy "folders readable" on public.folders for select using (
  visibility = 'public'
  or user_id = auth.uid()
  or (visibility = 'followers' and exists (
    select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = folders.user_id
  ))
);
drop policy if exists "folders own writes" on public.folders;
create policy "folders own writes" on public.folders for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "folder_posts readable" on public.folder_posts;
create policy "folder_posts readable" on public.folder_posts for select using (
  user_id = auth.uid()
  or exists (select 1 from public.folders f where f.id = folder_posts.folder_id and f.visibility = 'public')
);
drop policy if exists "folder_posts own writes" on public.folder_posts;
create policy "folder_posts own writes" on public.folder_posts for all using (user_id = auth.uid()) with check (
  user_id = auth.uid()
  and exists (select 1 from public.folders f where f.id = folder_posts.folder_id and f.user_id = auth.uid())
);

drop policy if exists "post_likes readable" on public.post_likes;
create policy "post_likes readable" on public.post_likes for select using (true);
drop policy if exists "post_likes own writes" on public.post_likes;
create policy "post_likes own writes" on public.post_likes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "post_comments readable" on public.post_comments;
create policy "post_comments readable" on public.post_comments for select using (
  exists (select 1 from public.posts p where p.id = post_comments.post_id and (p.visibility = 'public' or p.user_id = auth.uid()))
);
drop policy if exists "post_comments insert authenticated" on public.post_comments;
create policy "post_comments insert authenticated" on public.post_comments for insert with check (user_id = auth.uid());
drop policy if exists "post_comments own update" on public.post_comments;
create policy "post_comments own update" on public.post_comments for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "post_comments own delete" on public.post_comments;
create policy "post_comments own delete" on public.post_comments for delete using (user_id = auth.uid());

drop policy if exists "saved_posts own readable" on public.saved_posts;
create policy "saved_posts own readable" on public.saved_posts for select using (user_id = auth.uid());
drop policy if exists "saved_posts own writes" on public.saved_posts;
create policy "saved_posts own writes" on public.saved_posts for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.app_is_community_member(target_community_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(target_user_id is not null and exists (
    select 1
    from public.community_members m
    where m.community_id = target_community_id
      and m.user_id = target_user_id
  ), false);
$$;

create or replace function public.app_is_community_owner(target_community_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(target_user_id is not null and exists (
    select 1
    from public.communities c
    where c.id = target_community_id
      and c.owner_id = target_user_id
  ), false);
$$;

create or replace function public.app_is_community_public(target_community_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.communities c
    where c.id = target_community_id
      and c.visibility = 'public'
  );
$$;

drop policy if exists "communities readable" on public.communities;
create policy "communities readable" on public.communities for select using (
  visibility = 'public'
  or owner_id = auth.uid()
  or public.app_is_community_member(id, auth.uid())
);
drop policy if exists "communities insert own" on public.communities;
create policy "communities insert own" on public.communities for insert with check (owner_id = auth.uid());
drop policy if exists "communities update owner" on public.communities;
create policy "communities update owner" on public.communities for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "communities delete owner" on public.communities;
create policy "communities delete owner" on public.communities for delete using (owner_id = auth.uid());

drop policy if exists "community_members readable" on public.community_members;
create policy "community_members readable" on public.community_members for select using (
  user_id = auth.uid()
  or public.app_is_community_public(community_id)
  or public.app_is_community_owner(community_id, auth.uid())
);
drop policy if exists "community_members join self" on public.community_members;
create policy "community_members join self" on public.community_members for insert with check (user_id = auth.uid());
drop policy if exists "community_members leave self" on public.community_members;
create policy "community_members leave self" on public.community_members for delete using (
  user_id = auth.uid()
  or public.app_is_community_owner(community_id, auth.uid())
);

drop policy if exists "community_posts readable" on public.community_posts;
create policy "community_posts readable" on public.community_posts for select using (
  public.app_is_community_public(community_id)
  or public.app_is_community_member(community_id, auth.uid())
);
drop policy if exists "community_posts insert own post as member" on public.community_posts;
create policy "community_posts insert own post as member" on public.community_posts for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.posts p where p.id = community_posts.post_id and p.user_id = auth.uid())
  and public.app_is_community_member(community_id, auth.uid())
);
drop policy if exists "community_posts update own" on public.community_posts;
create policy "community_posts update own" on public.community_posts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "community_posts delete own or owner" on public.community_posts;
create policy "community_posts delete own or owner" on public.community_posts for delete using (
  user_id = auth.uid()
  or public.app_is_community_owner(community_id, auth.uid())
);

drop policy if exists "community_messages readable" on public.community_messages;
create policy "community_messages readable" on public.community_messages for select using (
  public.app_is_community_public(community_id)
  or public.app_is_community_member(community_id, auth.uid())
);
drop policy if exists "community_messages insert member" on public.community_messages;
create policy "community_messages insert member" on public.community_messages for insert with check (
  user_id = auth.uid()
  and public.app_is_community_member(community_id, auth.uid())
);
drop policy if exists "community_messages delete own" on public.community_messages;
create policy "community_messages delete own" on public.community_messages for delete using (user_id = auth.uid());

drop policy if exists "post_reports insert own" on public.post_reports;
create policy "post_reports insert own" on public.post_reports for insert with check (user_id = auth.uid());
drop policy if exists "post_reports own readable" on public.post_reports;
create policy "post_reports own readable" on public.post_reports for select using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values
  ('post-images', 'post-images', false),
  ('profile-images', 'profile-images', false)
on conflict (id) do nothing;

drop policy if exists "authenticated can read post images" on storage.objects;
create policy "authenticated can read post images" on storage.objects for select to authenticated
using (bucket_id = 'post-images');

drop policy if exists "users upload own post images" on storage.objects;
create policy "users upload own post images" on storage.objects for insert to authenticated
with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update own post images" on storage.objects;
create policy "users update own post images" on storage.objects for update to authenticated
using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own post images" on storage.objects;
create policy "users delete own post images" on storage.objects for delete to authenticated
using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "authenticated can read profile images" on storage.objects;
create policy "authenticated can read profile images" on storage.objects for select to authenticated
using (bucket_id = 'profile-images');

drop policy if exists "users upload own profile images" on storage.objects;
create policy "users upload own profile images" on storage.objects for insert to authenticated
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update own profile images" on storage.objects;
create policy "users update own profile images" on storage.objects for update to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own profile images" on storage.objects;
create policy "users delete own profile images" on storage.objects for delete to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
