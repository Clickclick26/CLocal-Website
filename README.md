# CLocal Landing Page

Marketing site for **CLocal** — video-first local discovery.

**Live:** https://clocal.co.uk  
**Repo:** https://github.com/Clickclick26/CLocal-Website

## Brand colours

- Vibrant Teal `#008080`
- Bright Sage `#77DD77`
- Intense Turquoise `#00FFFF`

## Waitlist form (ClickClick CRM + Resend)

The form posts JSON to a **public** Supabase Edge Function in **clickclick-crm** (`waitlist-ingest`). That function:

1. Saves / updates a CRM contact (`source=clocal-waitlist`, tags `clocal`, `waitlist`, roles)
2. Writes a `waitlist_signups` audit row
3. Sends a confirm email from **hello@clocal.co.uk** via **Resend**

Public URL only lives in `config.js` (no API keys on GitHub Pages).

```js
window.CLOCAL_CONFIG = {
  waitlistUrl: "https://<PROJECT_REF>.supabase.co/functions/v1/waitlist-ingest",
};
```

Until `waitlistUrl` is filled, the form shows a short “email hello@…” message instead of posting.

Full CRM deploy notes: `~/Projects/clickclick-crm/docs/clocal-waitlist-ingest.md`

### Soft validation (email + postcode)

Client-side checks catch empty fields and obvious garbage only:

- **Email:** format only — `local@domain.tld` (must have `@`, a dot in the domain, no spaces). **Any TLD allowed**. Do **not** add disposable-domain / TLD blocklists.
- **Postcode:** loose UK format (e.g. `BT7 1NN`). Other UK codes are accepted.
- **Newsletter:** checkbox default **on**. Sent as `newsletter: true/false`.
- **Honeypot:** `_honey` (hidden). Bots that fill it get a fake success.

### Kathryn setup checklist

Do these in order. Paste keys only in the dashboards named below — **never in chat or git**.

#### 1. Resend

1. Create account at [resend.com](https://resend.com) (free tier is fine).
2. Add domain **clocal.co.uk**.
3. Copy the DNS records Resend shows (SPF, DKIM, maybe a verify TXT).

#### 2. 123reg DNS

1. Open **123reg** → **clocal.co.uk** → DNS.
2. Add Resend’s records exactly.
3. Keep the existing GitHub Pages **A** records for the website.
4. If there is already one SPF TXT on `@`, merge into a single SPF (Resend docs explain how).
5. Wait until Resend shows the domain **Verified**.

#### 3. Supabase secrets (clickclick-crm project)

Dashboard → **Project Settings → Edge Functions → Secrets** (or CLI on your machine):

- `RESEND_API_KEY` = key from Resend
- `CLOCAL_MAIL_FROM` = `CLocal <hello@clocal.co.uk>`

Service role / project URL are normally injected for Edge Functions. Do not put them in this repo.

#### 4. Deploy CRM pieces

From **clickclick-crm**:

```bash
supabase db push
# or paste supabase/migrations/0008_waitlist_signups.sql in the SQL Editor

supabase functions deploy waitlist-ingest
```

Confirm the function has **Verify JWT = off** (`supabase/config.toml`).

#### 5. Point this landing site

1. Copy the function URL: `https://<PROJECT_REF>.supabase.co/functions/v1/waitlist-ingest`
2. Put it in `config.js` → `waitlistUrl`
3. Commit + push this repo so GitHub Pages updates

#### 6. Test

1. Submit the form on https://clocal.co.uk with an inbox you control
2. CRM → Contacts: `source=clocal-waitlist`, tags include `clocal` / `waitlist`
3. Check the confirm email (and Spam once)
4. Check Resend → Emails for delivery

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
