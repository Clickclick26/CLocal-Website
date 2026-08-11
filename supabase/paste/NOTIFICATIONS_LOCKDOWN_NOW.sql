-- NOTIFICATIONS_LOCKDOWN_NOW.sql
-- Paste in CLocal Supabase (after USER_NOTIFICATIONS_NOW). Safe to re-run.
-- Elena beta locks: admin-only insert; users can only mark read (not rewrite rows).

-- 1) Inserts: admin only (no self-spam inbox junk)
drop policy if exists user_notifications_insert_admin on public.user_notifications;
create policy user_notifications_insert_admin
on public.user_notifications for insert
to authenticated
with check (public.is_admin());

-- 2) Updates: own rows only, and only for marking read
-- (with check keeps user_id stable; app only sends read_at)
drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own
on public.user_notifications for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
);

-- Optional trigger: block changing title/body/href/kind after insert
create or replace function public.user_notifications_guard_update()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.href is distinct from old.href
     or new.kind is distinct from old.kind
     or new.created_at is distinct from old.created_at then
    raise exception 'Notifications are read-only except marking read';
  end if;
  return new;
end;
$$;

drop trigger if exists user_notifications_guard_update on public.user_notifications;
create trigger user_notifications_guard_update
before update on public.user_notifications
for each row
execute function public.user_notifications_guard_update();
