# CLocal Landing Page

Marketing site for **CLocal** — video-first local discovery.

**Live:** https://clocal.co.uk  
**Repo:** https://github.com/Clickclick26/CLocal-Website

## Brand colours

- Vibrant Teal `#008080`
- Bright Sage `#77DD77`
- Intense Turquoise `#00FFFF`

## Waitlist robot (our mini Mailchimp — phase 1)

The form posts JSON to a **public** Supabase Edge Function: `waitlist-ingest`.

That robot:

1. Saves the person in `waitlist_signups` (your list)
2. Best-effort sync into CRM `contacts` if that table exists
3. Sends “you’re on the list” from **`hello@clocal.co.uk`** via **123 Reg Titan SMTP**
4. Pings `hello@` so you see new signups

**No Resend.** The mail truck is your Titan mailbox.

Public URL only lives in `config.js` (no passwords on GitHub Pages).

```js
window.CLOCAL_CONFIG = {
  waitlistUrl: "https://gapybapywpdogexibtgj.supabase.co/functions/v1/waitlist-ingest",
};
```

If the robot is down, the form falls back to FormSubmit → `hello@` so signups are not lost.

### Soft validation (email + postcode)

- **Email:** format only — any TLD OK. No disposable-domain blocklists.
- **Postcode:** loose UK format (e.g. `BT7 1NN`).
- **Newsletter:** checkbox default **on** → `newsletter: true/false`.
- **Honeypot:** `_honey` (hidden). Bots that fill it get a fake success.

### Kathryn setup checklist (do in order)

Paste secrets only in Supabase — **never in chat or git**.

#### 1. Supabase SQL

In the ClickClick CRM Supabase project (ref `gapybapywpdogexibtgj`):

1. Open **SQL Editor**
2. Paste and run `supabase/migrations/20260806120000_waitlist_signups.sql`

#### 2. Titan mail secrets

Dashboard → **Project Settings → Edge Functions → Secrets**:

| Secret | Value |
|--------|--------|
| `TITAN_SMTP_HOST` | `smtp.titan.email` |
| `TITAN_SMTP_PORT` | `465` |
| `TITAN_SMTP_USER` | `hello@clocal.co.uk` |
| `TITAN_SMTP_PASS` | your `hello@` mailbox password |
| `CLOCAL_MAIL_FROM` | `CLocal <hello@clocal.co.uk>` |
| `CLOCAL_NOTIFY_TO` | `hello@clocal.co.uk` |

If Titan rejects `smtp.titan.email`, try `smtpout.secureserver.net` (same user/pass, port 465).

#### 3. Deploy the robot

From this repo (needs [Supabase CLI](https://supabase.com/docs/guides/cli) logged into the CRM project):

```bash
supabase functions deploy waitlist-ingest --project-ref gapybapywpdogexibtgj
```

Confirm **Verify JWT = off** for this function (`supabase/config.toml`).

Or in the dashboard: Edge Functions → create `waitlist-ingest` → paste `supabase/functions/waitlist-ingest/index.ts` → disable JWT.

#### 4. Test

1. Submit the form on https://clocal.co.uk with an inbox you control
2. Check confirm email (and Spam once)
3. Check `hello@` for the admin ping
4. In Supabase → Table Editor → `waitlist_signups`

### Later (CRM polish)

- Better screens for Consumer / Creator / Business data types
- Invite blast send button (same Titan truck)
- Import old FormSubmit rows into `waitlist_signups`

## Preview locally

```bash
python3 -m http.server 5173
```

Open http://localhost:5173

## Domain / DNS (GitHub Pages)

Apex domain `clocal.co.uk` should use these **A** records:

| Type | Name | Value |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |

Optional www:

| Type | Name | Value |
|------|------|-------|
| CNAME | www | clickclick26.github.io |

In GitHub: Settings → Pages → Custom domain → `clocal.co.uk` → enable HTTPS when ready.
