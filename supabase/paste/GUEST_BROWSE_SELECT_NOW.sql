-- GUEST_BROWSE_SELECT_NOW.sql
-- Paste in CLocal Supabase. Guests can LOOK at shop invites (gifts).
-- Claiming / follow / rewards stay authenticated-only.
-- Safe to re-run.
--
-- Note: businesses/flashes already allow public/anon select in earlier migrations.
-- This only adds anon read for *active* gifts (view cards, not claim).

drop policy if exists gifts_select_public_active on public.gifts;
create policy gifts_select_public_active
on public.gifts for select
to anon, authenticated
using (
  coalesce(status, 'active') = 'active'
);

grant select on table public.gifts to anon;
