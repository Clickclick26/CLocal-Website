-- CLocal waitlist audit + list ownership (mini-Mailchimp phase 1).
-- Safe to run in the ClickClick CRM Supabase project.

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  postcode text not null,
  roles text[] not null default '{}',
  newsletter boolean not null default true,
  source text not null default 'clocal-waitlist',
  region text,
  confirm_email_status text not null default 'pending',
  confirm_email_error text,
  raw jsonb not null default '{}'::jsonb,
  constraint waitlist_signups_email_unique unique (email)
);

create index if not exists waitlist_signups_created_at_idx
  on public.waitlist_signups (created_at desc);

alter table public.waitlist_signups enable row level security;

-- No public policies: only service role (Edge Function) reads/writes.
-- Logged-in CRM users can be granted select later via a policy if needed.

comment on table public.waitlist_signups is
  'CLocal landing waitlist. Robot saves here and emails from hello@ via Titan SMTP.';
