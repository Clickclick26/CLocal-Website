-- VERIFY_SECURITY_LOCKDOWN_NOW.sql
-- Paste in Supabase SQL Editor AFTER:
--   1) paste/SECURITY_HARDENING_NOW.sql
--   2) migrations/025_injection_hardening.sql
--
-- Read-only checks. Does not change data.
-- Expect every row's result = 'PASS'. Any FAIL / WARN means locks are incomplete.
--
-- TWO CAVEATS (still true even when all PASS):
--   • Admins/operators can see member emails and support tickets — only grant is_admin
--     to people you trust.
--   • If these scripts were never pasted on THIS project, assume it is NOT locked.

with checks as (
  -- 1) users sensitive-field trigger fires on INSERT and UPDATE
  select
    'users_guard_trigger_insert_update' as check_id,
    case
      when exists (
        select 1
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = 'users'
          and t.tgname = 'trg_guard_users_sensitive_fields'
          and not t.tgisinternal
          and (t.tgtype & 4) = 4   -- INSERT
          and (t.tgtype & 16) = 16 -- UPDATE
      ) then 'PASS'
      else 'FAIL — re-run SECURITY_HARDENING_NOW.sql then migrations/025_injection_hardening.sql'
    end as result

  union all

  -- 2) guard function mentions INSERT path (self-admin strip)
  select
    'users_guard_fn_blocks_insert_admin',
    case
      when to_regprocedure('public.guard_users_sensitive_fields()') is null then
        'FAIL — missing guard_users_sensitive_fields; paste SECURITY + INJECTION'
      when pg_get_functiondef(to_regprocedure('public.guard_users_sensitive_fields()'))
           ~* 'tg_op\s*=\s*''INSERT'''
      then 'PASS'
      else 'FAIL — users guard missing INSERT path; paste migrations/025_injection_hardening.sql'
    end

  union all

  -- 3) businesses plan guard exists
  select
    'businesses_plan_guard',
    case
      when to_regprocedure('public.guard_businesses_sensitive_fields()') is not null
       and exists (
         select 1 from pg_trigger t
         join pg_class c on c.oid = t.tgrelid
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relname = 'businesses'
           and t.tgname = 'trg_guard_businesses_sensitive_fields'
           and not t.tgisinternal
       ) then 'PASS'
      else 'FAIL — paste migrations/025_injection_hardening.sql'
    end

  union all

  -- 4) anon cannot use public.users
  select
    'anon_revoked_on_users',
    case
      when not has_table_privilege('anon', 'public.users', 'select')
       and not has_table_privilege('anon', 'public.users', 'insert')
       and not has_table_privilege('anon', 'public.users', 'update')
       and not has_table_privilege('anon', 'public.users', 'delete')
      then 'PASS'
      else 'FAIL — paste SECURITY_HARDENING_NOW.sql (anon still has rights on users)'
    end

  union all

  -- 5) admin helpers exist
  select
    'is_admin_rpc_present',
    case
      when to_regprocedure('public.is_admin()') is not null
       and to_regprocedure('public.is_admin_user(uuid)') is not null
      then 'PASS'
      else 'FAIL — paste migrations/019a_admin_dashboard.sql'
    end

  union all

  -- 6) user_roles cannot self-grant admin
  select
    'user_roles_admin_guard',
    case
      when to_regprocedure('public.guard_user_roles_admin()') is not null
       and exists (
         select 1 from pg_trigger t
         join pg_class c on c.oid = t.tgrelid
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relname = 'user_roles'
           and t.tgname = 'trg_guard_user_roles_admin'
           and not t.tgisinternal
       ) then 'PASS'
      else 'FAIL — paste SECURITY_HARDENING_NOW.sql'
    end

  union all

  -- 7) VIP demo checkout off (or setting missing = treat as WARN if VIP table path unused)
  select
    'vip_demo_checkout_off',
    case
      when to_regclass('public.app_settings') is null then
        'WARN — app_settings missing (run VIP / demo guards if you use VIP)'
      when exists (
        select 1 from public.app_settings
        where key = 'vip_demo_checkout_enabled'
          and value = 'false'::jsonb
      ) then 'PASS'
      when exists (
        select 1 from public.app_settings
        where key = 'vip_demo_checkout_enabled'
          and value = 'true'::jsonb
      ) then 'FAIL — VIP demo is ON; paste migrations/025_injection_hardening.sql or set false'
      else 'WARN — vip_demo_checkout_enabled not set; paste migrations/025_injection_hardening.sql'
    end

  union all

  -- 8) RLS on users
  select
    'users_rls_enabled',
    case
      when exists (
        select 1 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname = 'users' and c.relrowsecurity
      ) then 'PASS'
      else 'FAIL — enable RLS on public.users'
    end

  union all

  -- 9) Admin-only select policy present (emails for operators)
  select
    'users_admin_select_policy',
    case
      when exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'users'
          and policyname = 'users_select_admin'
      ) then 'PASS'
      else 'FAIL — paste migrations/019a_admin_dashboard.sql (admins need users_select_admin)'
    end

  union all

  -- 10) Own-row select still present (members see themselves only)
  select
    'users_own_select_policy',
    case
      when exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'users'
          and policyname = 'users_select_own'
      ) then 'PASS'
      else 'FAIL — members need users_select_own; paste FIX_USERS_PERMISSIONS_NOW.sql'
    end
)
select check_id, result
from checks
order by
  case when result like 'FAIL%' then 0 when result like 'WARN%' then 1 else 2 end,
  check_id;
