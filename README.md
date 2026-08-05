# CLocal Landing Page

Marketing site for **CLocal** — video-first local discovery.

**Live:** https://clocal.co.uk  
**Repo:** https://github.com/Clickclick26/CLocal-Website

## Brand colours

- Vibrant Teal `#008080`
- Bright Sage `#77DD77`
- Intense Turquoise `#00FFFF`

## Waitlist form (FormSubmit)

Submissions go to **hello@clocal.co.uk** via [FormSubmit.co](https://formsubmit.co) (AJAX, no mailto).

**One-time setup:** After the first real submit from the live site, FormSubmit emails `hello@clocal.co.uk`. Open that email and click the confirmation link. Until you do, new waitlist entries may not arrive.

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
