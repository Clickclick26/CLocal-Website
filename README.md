# CLocal Landing Page

Marketing site for **CLocal** — video-first local discovery.

**Live:** https://clocal.co.uk  
**Repo:** https://github.com/Clickclick26/CLocal-Website

## Brand colours

- Vibrant Teal `#008080`
- Bright Sage `#77DD77`
- Intense Turquoise `#00FFFF`

## Waitlist form (current: FormSubmit)

Submissions go to **hello@clocal.co.uk** via [FormSubmit.co](https://formsubmit.co) (classic HTML POST, then redirect back with `?waitlist=ok`).

### One-time activation (required)

FormSubmit will **not** forward waitlist emails until you activate once:

1. Submit the waitlist once from **https://clocal.co.uk** (not a local `file://` page).
2. Check **hello@clocal.co.uk** — including **Spam / Junk**. FormSubmit mail often lands there, especially on custom domains.
3. Open the email and click **Activate Form**.
4. After that, new sign-ups arrive at `hello@clocal.co.uk`. FormSubmit also keeps pending submissions for ~30 days and sends them after you activate.

### If the activation email never arrives

- Search the inbox for `formsubmit` / `Activate Form`.
- Wait a few minutes and submit again from the live site (each attempt can resend activation).
- **Alternate test:** temporarily change the form `action` (and only that) to a personal Gmail you control, submit once, activate there, then either keep that inbox or switch the action URL to the **random hash** FormSubmit puts in the activation email (hides your address and still delivers to the activated inbox).
- Do **not** expect AJAX/`fetch` to fix a missing activation email — FormSubmit already says it sent one; delivery to business mail is the usual blocker.

## Waitlist → ClickClick CRM (preferred next step)

**ClickClick CRM** is the custom app at `~/Projects/clickclick-crm` (Supabase + dialer). It is **not** HubSpot / Salesforce / Attio.

It already knows brand **CLocal** (`brands.id = clocal`). Contacts use `source` + `tags`; deals use `brand_id`.

There is **no public waitlist webhook yet**. Contacts are insertable only by logged-in CRM users (RLS). The static GitHub Pages site must **never** hold a Supabase service-role key.

### Recommended shape

1. In **clickclick-crm**, add a Supabase Edge Function, e.g. `waitlist-ingest`.
2. Function secret (server-side only): `WAITLIST_INGEST_SECRET` — Kathryn pastes this in Supabase → Edge Functions → Secrets.
3. Landing posts to that function URL with a public header secret (or signed token), **not** the DB service key.
4. Function inserts a `contacts` row tagged as CLocal, then optionally emails `hello@clocal.co.uk`.

### Suggested contact fields for CLocal waitlist

| Field | Value |
|-------|--------|
| `source` | `clocal-waitlist` |
| `tags` | `['clocal', 'waitlist', '<role>']` (Consumer / Creator / Business) |
| `stage` | `new` |
| `region` | infer from postcode when possible, else `belfast` / `other` |
| `notes` | `postcode: …; roles: …` |
| later deal `brand_id` | `clocal` |

### Landing config (when the function exists)

In `script.js`, replace FormSubmit with something like:

```js
const WAITLIST_URL = "https://<PROJECT_REF>.supabase.co/functions/v1/waitlist-ingest";
// Public ingest secret only — NEVER the service_role key.
const WAITLIST_SECRET = "PASTE_PUBLIC_INGEST_SECRET_HERE";
```

Until that function ships: keep FormSubmit, then CSV-import into CRM with `source=clocal-waitlist` and tag `clocal`.

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
