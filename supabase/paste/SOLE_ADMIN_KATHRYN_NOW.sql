-- SOLE_ADMIN_KATHRYN_NOW.sql
-- Paste in Supabase SQL Editor (PRODUCTION) when Kathryn asks to lock admin.
--
-- RULE: Only Kathryn (kedonnelly5@gmail.com) may be is_admin = true.
-- Nobody else can self-grant (already blocked by SECURITY_HARDENING + 025).
-- Do NOT grant admin to anyone else unless Kathryn explicitly asks.
--
-- Safe to re-run.

-- 1) Everyone else: revoke admin
update public.users
set is_admin = false
where lower(trim(email)) is distinct from lower(trim('kedonnelly5@gmail.com'))
  and coalesce(is_admin, false) = true;

-- 2) Kathryn: ensure admin
update public.users
set is_admin = true
where lower(trim(email)) = lower(trim('kedonnelly5@gmail.com'));

-- 3) Prove it — expect exactly one row (Kathryn)
select id, email, name, is_admin, created_at
from public.users
where is_admin = true
order by created_at;
