# CLocal Landing Page

Marketing site for **CLocal** — video-first local discovery.

**Live:** https://clocal.co.uk  
**Repo:** https://github.com/Clickclick26/CLocal-Website

## Brand colors

- Vibrant Teal `#008080`
- Bright Sage `#77DD77`
- Intense Turquoise `#00FFFF`

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
