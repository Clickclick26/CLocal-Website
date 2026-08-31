#!/usr/bin/env python3
"""Build consumer SEO pages from scripts/consumer-guides.json. No shop lists."""

from __future__ import annotations

import json
import uuid
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = Path(__file__).resolve().parent / "consumer-guides.json"
TODAY = date.today().isoformat()
INDEXNOW_KEY_FILE = ROOT / ".indexnow-key"


def waitlist_form(slug: str) -> str:
    return f"""    <div class="role-waitlist-wrap" id="join">
      <div class="hero-waitlist">
        <h2 class="hero-form-title">Join the waitlist</h2>
        <p class="hero-form-lead">
          South and East Belfast. Join below. You’re also in with a chance to win brunch at General Merchants.
        </p>
        <form class="invite-form" id="invite-form" action="https://formsubmit.co/hello@clocal.co.uk" method="POST">
          <input type="text" name="_honey" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <input type="hidden" name="_subject" value="CLocal waitlist ({slug})" />
          <input type="hidden" name="_captcha" value="false" />
          <input type="hidden" name="_template" value="table" />
          <input type="hidden" name="_next" value="https://clocal.co.uk/?waitlist=ok#early-access" />
          <input type="hidden" name="_autoresponse" value="Thanks, you're on the CLocal waitlist for South and East Belfast. That also enters you for a chance to win one of several vouchers for brunch at General Merchants (18+, T&Cs apply). We'll email you again when it's your turn." />
          <div class="form-row">
            <div>
              <label class="sr-only" for="invite-name">Name</label>
              <input id="invite-name" name="name" type="text" placeholder="Your name" required autocomplete="name" />
            </div>
            <div>
              <label class="sr-only" for="invite-email">Email</label>
              <input id="invite-email" name="email" type="email" placeholder="Email" required autocomplete="email" inputmode="email" />
            </div>
          </div>
          <label class="sr-only" for="invite-postcode">Postcode</label>
          <input id="invite-postcode" name="postcode" type="text" placeholder="Postcode (e.g. BT7 1NN)" required autocomplete="postal-code" />
          <details class="role-field" id="role-field" open>
            <summary class="role-summary">
              <span id="role-summary-text">I am a…</span>
              <span class="role-summary-caret" aria-hidden="true"></span>
            </summary>
            <p class="role-helper">Most people here are joining as themselves.</p>
            <label class="role-option">
              <input type="checkbox" name="role" value="Consumer" checked />
              <span>I live here</span>
            </label>
            <label class="role-option">
              <input type="checkbox" name="role" value="Creator" />
              <span>Creator</span>
            </label>
            <label class="role-option">
              <input type="checkbox" name="role" value="Business" />
              <span>Business</span>
            </label>
          </details>
          <input type="hidden" name="newsletter" id="newsletter-value" value="yes" />
          <label class="newsletter-option" for="invite-newsletter">
            <input id="invite-newsletter" type="checkbox" checked />
            <span>Email me CLocal news and invites</span>
          </label>
          <button class="btn btn-pill large" type="submit">Join the waitlist</button>
        </form>
        <p class="form-status" id="invite-status" role="status" hidden></p>
        <p class="hero-note">Prize draw: 18+. Full rules on the site before we announce a winner.</p>
        <div class="trust">
          <span>Private &amp; secure</span>
          <span>Waitlist open</span>
          <span>South and East Belfast</span>
        </div>
      </div>
    </div>"""


def page_html(g: dict, others: list[dict]) -> str:
    faq = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": g["faq_name"],
                    "acceptedAnswer": {"@type": "Answer", "text": g["faq_answer"]},
                }
            ],
        },
        ensure_ascii=False,
        indent=2,
    )
    body = []
    for heading, para in g["body"]:
        body.append(f"      <h2>{heading}</h2>\n      <p>{para}</p>")
    related = []
    for o in others:
        if o["slug"] == g["slug"]:
            continue
        related.append(
            f'<li><a href="{o["slug"]}.html">{o["h1a"]} {o["h1b"]}</a></li>'
        )
    related_html = "\n          ".join(related[:5])
    return f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{g["title"]}</title>
  <meta name="description" content="{g["description"]}" />
  <link rel="canonical" href="https://clocal.co.uk/{g["slug"]}.html" />
  <link rel="icon" href="assets/favicon/favicon.ico?v=2" sizes="32x32" />
  <link rel="icon" type="image/png" href="assets/favicon/favicon-16.png?v=2" sizes="16x16" />
  <link rel="icon" type="image/png" href="assets/favicon/favicon-32.png?v=2" sizes="32x32" />
  <link rel="icon" type="image/png" href="assets/favicon/favicon-192.png?v=2" sizes="192x192" />
  <link rel="apple-touch-icon" href="assets/favicon/apple-touch-icon.png?v=2" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
  <script type="application/ld+json">
{faq}
  </script>
</head>
<body>
  <div class="page-glow" aria-hidden="true"></div>
  <header class="nav">
    <a class="nav-brand" href="index.html" aria-label="CLocal home">
      <img class="brand-logo" src="assets/clocal-logo.png" alt="CLocal" width="140" height="40" />
    </a>
    <nav class="nav-links" aria-label="Primary">
      <a href="index.html#how">How it works</a>
      <a href="hidden-gems-belfast.html">Hidden gems</a>
      <a href="index.html#early-access">Waitlist</a>
    </nav>
    <a class="btn btn-pill" href="#join">Join the waitlist</a>
  </header>
  <main class="role-page-main">
    <div class="role-hero">
      <p class="hero-eyebrow">South and East Belfast</p>
      <h1>{g["h1a"]}<br />{g["h1b"]}</h1>
      <p class="section-lead">{g["lead"]}</p>
    </div>
    <div class="guide-prose">
{chr(10).join(body)}
      <h2>More nearby</h2>
      <ul>
          {related_html}
      </ul>
    </div>
    <p class="role-signature">
      <span class="hand">Join. Then go local.</span>
    </p>
{waitlist_form(g["slug"])}
  </main>
  <footer class="footer">
    <div class="footer-brand">
      <img class="footer-wordmark" src="assets/clocal-logo.png" alt="CLocal" width="120" height="34" />
      <p>Go local. Find hidden gems. Complimentary invites. Nearby LocalGems.</p>
      <nav class="footer-social" aria-label="Social media">
        <a href="https://www.instagram.com/clocal_app/" target="_blank" rel="noopener noreferrer">Instagram</a>
        <a href="https://www.facebook.com/profile.php?id=61592855575524" target="_blank" rel="noopener noreferrer">Facebook</a>
        <a class="footer-quiet" href="hidden-gems-belfast.html">Hidden gems</a>
        <a class="footer-quiet" href="things-to-do-south-belfast.html">South Belfast</a>
        <a class="footer-quiet" href="things-to-do-east-belfast.html">East Belfast</a>
        <a class="footer-quiet" href="support.html">Help</a>
      </nav>
    </div>
    <p>© <span id="year"></span> CLocal. All rights reserved.</p>
  </footer>
  <script src="script.js"></script>
</body>
</html>
"""


def sitemap(slugs: list[str]) -> str:
    urls = [
        ("https://clocal.co.uk/", "1.0", "weekly"),
        ("https://clocal.co.uk/hidden-gems-belfast.html", "0.9", "weekly"),
    ]
    for slug in slugs:
        urls.append((f"https://clocal.co.uk/{slug}.html", "0.8", "weekly"))
    urls += [
        ("https://clocal.co.uk/creators.html", "0.4", "monthly"),
        ("https://clocal.co.uk/partners.html", "0.3", "monthly"),
    ]
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, pri, freq in urls:
        parts.append("  <url>")
        parts.append(f"    <loc>{loc}</loc>")
        parts.append(f"    <lastmod>{TODAY}</lastmod>")
        parts.append(f"    <changefreq>{freq}</changefreq>")
        parts.append(f"    <priority>{pri}</priority>")
        parts.append("  </url>")
    parts.append("</urlset>")
    return "\n".join(parts) + "\n"


def indexnow_key() -> str:
    if INDEXNOW_KEY_FILE.exists():
        return INDEXNOW_KEY_FILE.read_text().strip()
    key = uuid.uuid4().hex
    INDEXNOW_KEY_FILE.write_text(key + "\n")
    return key


def main() -> None:
    guides = json.loads(DATA.read_text())["guides"]
    slugs = [g["slug"] for g in guides]
    for g in guides:
        out = ROOT / f"{g['slug']}.html"
        out.write_text(page_html(g, guides), encoding="utf-8")
        print("wrote", out.name)
    (ROOT / "sitemap.xml").write_text(sitemap(slugs), encoding="utf-8")
    key = indexnow_key()
    (ROOT / f"{key}.txt").write_text(key, encoding="utf-8")
    print("sitemap + IndexNow key")


if __name__ == "__main__":
    main()
