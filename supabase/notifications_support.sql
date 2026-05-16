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
