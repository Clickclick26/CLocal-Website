-- GIFTS_PAID_BUSINESS_ONLY_NOW.sql
-- Happy-hour / complimentary consumer gifts: paid businesses only.
-- (Separate from LocalGem PAYG and from influencer-gifting — product rule 2026-08-06.)
--
-- Paste after SECURITY hardening. Safe to re-run.

drop policy if exists gifts_insert_owner on public.gifts;
drop policy if exists "gifts_insert_owner" on public.gifts;

create policy gifts_insert_owner on public.gifts
for insert to authenticated
with check (
  exists (
    select 1
    from public.businesses b
    where b.id = business_id
      and b.owner_id = (select auth.uid())
      and b.plan = 'paid'
  )
);

-- Owners can still update/list their existing gifts even if they later go free
-- (insert is the paid gate). Verify:
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'gifts'
order by policyname;
