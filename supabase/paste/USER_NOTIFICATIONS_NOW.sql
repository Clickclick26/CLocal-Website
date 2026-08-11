-- USER_NOTIFICATIONS_NOW.sql
-- Paste in CLocal Supabase SQL Editor (once). Safe to re-run.
-- In-app notification inbox + phone alerts preference flag.

alter table public.users
  add column if not exists notifications_enabled boolean not null default false;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null default 'general'
    check (kind in ('general', 'reward', 'ticket', 'message', 'system')),
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_notifications_title_len check (char_length(title) between 1 and 120),
  constraint user_notifications_body_len check (char_length(body) between 1 and 500)
);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists user_notifications_user_time_idx
  on public.user_notifications (user_id, created_at desc);

alter table public.user_notifications enable row level security;

grant select, update, insert on public.user_notifications to authenticated;

drop policy if exists user_notifications_select_own on public.user_notifications;
create policy user_notifications_select_own
on public.user_notifications for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own
on public.user_notifications for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists user_notifications_insert_admin on public.user_notifications;
create policy user_notifications_insert_admin
on public.user_notifications for insert
to authenticated
with check (public.is_admin() or user_id = (select auth.uid()));

revoke delete on public.user_notifications from authenticated;
