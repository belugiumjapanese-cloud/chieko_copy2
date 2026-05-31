-- Folder Library sync support.
-- Run this after full_app_schema.sql and app_support_after_full_schema.sql.
-- It lets users save someone else's public folder as a live reference, keeps
-- folder save counts updated, and allows public-folder pins to be read.

alter table public.folders
  add column if not exists saves_count integer not null default 0;

create table if not exists public.saved_folders (
  folder_id uuid not null references public.folders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (folder_id, user_id)
);

create index if not exists saved_folders_user_idx
on public.saved_folders (user_id, created_at desc);

create index if not exists saved_folders_folder_idx
on public.saved_folders (folder_id, created_at desc);

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

create or replace function public.refresh_folder_save_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_folder_id uuid;
begin
  target_folder_id := coalesce(new.folder_id, old.folder_id);
  update public.folders
  set saves_count = (select count(*) from public.saved_folders where folder_id = target_folder_id)
  where id = target_folder_id;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists saved_folders_refresh_counts on public.saved_folders;
create trigger saved_folders_refresh_counts
after insert or delete on public.saved_folders
for each row execute function public.refresh_folder_save_counts();

update public.folders f
set saves_count = coalesce((
  select count(*)
  from public.saved_folders sf
  where sf.folder_id = f.id
), 0);

drop policy if exists "posts readable by visibility" on public.posts;
create policy "posts readable by visibility" on public.posts for select using (
  visibility = 'public'
  or user_id = auth.uid()
  or exists (select 1 from public.saved_posts s where s.post_id = posts.id and s.user_id = auth.uid())
  or exists (
    select 1
    from public.folder_posts fp
    join public.folders f on f.id = fp.folder_id
    left join public.follows ff on ff.follower_id = auth.uid() and ff.following_id = f.user_id
    where fp.post_id = posts.id
      and (
        f.visibility = 'public'
        or f.user_id = auth.uid()
        or (f.visibility = 'followers' and ff.follower_id is not null)
      )
  )
  or exists (
    select 1
    from public.community_posts cp
    join public.communities c on c.id = cp.community_id
    left join public.community_members cm on cm.community_id = c.id and cm.user_id = auth.uid()
    where cp.post_id = posts.id and (c.visibility = 'public' or cm.user_id is not null)
  )
);

drop policy if exists "folder_posts readable" on public.folder_posts;
create policy "folder_posts readable" on public.folder_posts for select using (
  user_id = auth.uid()
  or exists (select 1 from public.folders f where f.id = folder_posts.folder_id and f.visibility = 'public')
  or exists (select 1 from public.saved_folders sf where sf.folder_id = folder_posts.folder_id and sf.user_id = auth.uid())
);

create or replace function public.app_folder_save_notifications()
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
    sf.folder_id,
    sf.user_id,
    sf.created_at
  from public.saved_folders sf
  join public.folders f on f.id = sf.folder_id
  where f.user_id = auth.uid()
    and sf.user_id <> auth.uid()
  order by sf.created_at desc
  limit 200;
$$;

grant execute on function public.app_folder_save_notifications() to authenticated;

