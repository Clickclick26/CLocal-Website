-- CHECK_VIDEO_UPLOAD_READY_NOW.sql
-- Read-only. Paste in Supabase SQL Editor to see why creator upload fails.

-- 1) Kathryn approved?
select id, email, is_approved_creator, creator_application_status
from public.users
where lower(trim(email)) = lower(trim('kedonnelly5@gmail.com'));

-- 2) authorize_video_upload RPC exists? (migration 044)
select to_regprocedure('public.authorize_video_upload()') is not null
  as authorize_video_upload_exists;

-- 3) Would authorize pass for Kathryn? (run while signed in as her in SQL editor
--    won't work as postgres — instead check flag above. Edge uses auth.uid().)
select
  case
    when exists (
      select 1 from public.users
      where lower(trim(email)) = lower(trim('kedonnelly5@gmail.com'))
        and is_approved_creator = true
    ) then 'PASS — approved creator flag is on'
    else 'FAIL — is_approved_creator is false; run FIX_CREATOR_APPROVAL_KATHRYN_NOW.sql'
  end as creator_flag_check;
