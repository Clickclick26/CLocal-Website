-- LOCK_APPROVED_CREATORS_NOW.sql
-- Prevents approved creators from being silently demoted back to pending
-- by client bugs / upserts. Streaks are already RPC-only (no client DELETE).
-- Safe to re-run. Paste in Supabase SQL Editor.

create or replace function public.guard_users_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Trusted admin RPCs (approve/reject) set this for one transaction.
  if current_setting('clocal.admin_action', true) = 'true' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Clients must never self-grant admin / creator approval on create.
    if auth.uid() is not null and not public.is_admin_user(auth.uid()) then
      new.is_admin := false;
      new.is_approved_creator := false;
      if new.creator_application_status is null
         or new.creator_application_status = 'approved' then
        new.creator_application_status := 'not_applied';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE path
  if new.email is distinct from old.email then
    new.email := old.email;
  end if;

  if not public.is_admin_user(auth.uid()) then
    new.is_admin := old.is_admin;
    new.is_approved_creator := old.is_approved_creator;

    -- Hard lock: once approved, stay approved unless admin_action RPC.
    if old.is_approved_creator is true
       or old.creator_application_status = 'approved' then
      new.is_approved_creator := true;
      new.creator_application_status := 'approved';
    elsif new.creator_application_status is distinct from old.creator_application_status then
      -- Block self-approve; allow pending/rejected/not_applied changes otherwise.
      if new.creator_application_status = 'approved' then
        new.creator_application_status := old.creator_application_status;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_users_sensitive_fields on public.users;
create trigger trg_guard_users_sensitive_fields
before insert or update on public.users
for each row execute function public.guard_users_sensitive_fields();

-- Streaks: confirm clients cannot DELETE (should already be true — no delete policy).
-- Report policies for peace of mind:
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('streaks', 'rewards', 'reward_transactions', 'users')
order by tablename, cmd, policyname;
