-- FIX_CREATOR_APPROVAL_KATHRYN_NOW.sql
-- App shows "pending" unless public.users.is_approved_creator = true
-- (creator_applications.status alone is NOT enough for the UI).
--
-- 1) See your row:
select id, email, is_approved_creator, creator_application_status
from public.users
where lower(trim(email)) = lower(trim('kedonnelly5@gmail.com'));

-- 2) Fix Kathryn (and sync application row if it exists):
update public.users
set
  is_approved_creator = true,
  creator_application_status = 'approved'
where lower(trim(email)) = lower(trim('kedonnelly5@gmail.com'));

update public.creator_applications
set status = 'approved', reviewed_at = coalesce(reviewed_at, now())
where user_id = (
  select id from public.users
  where lower(trim(email)) = lower(trim('kedonnelly5@gmail.com'))
)
and status is distinct from 'approved';

-- 3) Confirm:
select id, email, is_approved_creator, creator_application_status
from public.users
where lower(trim(email)) = lower(trim('kedonnelly5@gmail.com'));
