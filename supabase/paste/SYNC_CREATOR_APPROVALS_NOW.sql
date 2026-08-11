-- SYNC_CREATOR_APPROVALS_NOW.sql
-- Fix drift: application says approved but users.is_approved_creator is still false
-- (app used to only check the boolean → people stuck on "pending").
-- Safe to re-run.

-- A) Application approved → flip user flag
update public.users u
set
  is_approved_creator = true,
  creator_application_status = 'approved'
where coalesce(u.is_approved_creator, false) = false
  and exists (
    select 1
    from public.creator_applications ca
    where ca.user_id = u.id
      and ca.status = 'approved'
  );

-- B) User status already approved → ensure boolean matches
update public.users
set is_approved_creator = true
where creator_application_status = 'approved'
  and coalesce(is_approved_creator, false) = false;

-- Report who is approved now
select id, email, is_approved_creator, creator_application_status
from public.users
where is_approved_creator = true
   or creator_application_status = 'approved'
order by email;
