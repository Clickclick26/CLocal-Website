-- SUPPORT_TICKET_THREAD_NOW.sql
-- Paste in Supabase SQL Editor (once). Adds contact email + private replies.
-- Safe to re-run.

alter table public.support_tickets
  add column if not exists contact_email text;

alter table public.support_tickets
  drop constraint if exists support_tickets_contact_email_len;
alter table public.support_tickets
  add constraint support_tickets_contact_email_len
  check (contact_email is null or char_length(contact_email) between 3 and 254);

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid not null references public.users (id) on delete cascade,
  author_role text not null check (author_role in ('user', 'admin')),
  body text not null,
  created_at timestamptz not null default now(),
  constraint support_ticket_messages_body_len check (char_length(body) between 1 and 5000)
);

create index if not exists support_ticket_messages_ticket_idx
  on public.support_ticket_messages (ticket_id, created_at asc);

alter table public.support_ticket_messages enable row level security;

grant select, insert on public.support_ticket_messages to authenticated;

drop policy if exists support_ticket_messages_select_own on public.support_ticket_messages;
create policy support_ticket_messages_select_own
on public.support_ticket_messages for select
to authenticated
using (
  exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and t.user_id = (select auth.uid())
  )
);

drop policy if exists support_ticket_messages_select_admin on public.support_ticket_messages;
create policy support_ticket_messages_select_admin
on public.support_ticket_messages for select
to authenticated
using (public.is_admin());

drop policy if exists support_ticket_messages_insert_own on public.support_ticket_messages;
create policy support_ticket_messages_insert_own
on public.support_ticket_messages for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and author_role = 'user'
  and exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and t.user_id = (select auth.uid())
  )
);

drop policy if exists support_ticket_messages_insert_admin on public.support_ticket_messages;
create policy support_ticket_messages_insert_admin
on public.support_ticket_messages for insert
to authenticated
with check (
  public.is_admin()
  and author_id = (select auth.uid())
  and author_role = 'admin'
);

revoke update, delete on public.support_ticket_messages from authenticated;
