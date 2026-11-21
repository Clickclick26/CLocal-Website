#!/usr/bin/env python3
"""Build the public events pages for clocal.co.uk from the CLocal events table.

Written 2026-11-21 (Kathryn: "can my events be seo optimised").

Why this exists: www.clocal.app is a static export, so every /event/<id> page
ships the same generic HTML and Google and share previews cannot see an event's
own title or flyer. The events pages that are meant to rank therefore live here,
as real static HTML with their own title, description, share image and
schema.org Event data, next to the rest of the clocal.co.uk SEO.

Writes:
  events.html              the "what's on" hub (indexable)
  event-<slug>.html        one page per published event, plus events that
                           finished in the last 30 days (they say so)
Deletes event-*.html pages whose event is gone or finished over 30 days ago.

Then rerun, in this order, from the repo root:
  python3 scripts/build_events.py
  python3 scripts/build_sitemap.py
  git add -A && git commit && git push      (live in about a minute)
  python3 scripts/ping_indexnow.py          (optional, Bing)

Reads only public data: published events, through the same public anon key the
app already ships. The key is read from the environment (CLOCAL_SUPABASE_URL,
CLOCAL_SUPABASE_ANON_KEY) or from ../CLocal/.env. It is never written to this
repo, which is public.

Slugs are the title plus the first 6 characters of the event id, so two events
with the same title never clash and a title edit does not change the id part.
"""
import html
import json
import os
import pathlib
import re
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://clocal.co.uk"
APP = "https://www.clocal.app"
TZ = ZoneInfo("Europe/London")
KEEP_FINISHED_DAYS = 30
PLAY = ("https://play.google.com/store/apps/details?id=app.clocal.mobile"
        "&amp;referrer=utm_source%3Dclocal_co_uk%26utm_medium%3Devents")
CATEGORIES = {"markets": "Markets", "food-drink": "Food and drink", "family": "Family",
              "music": "Music", "arts": "Arts and culture", "other": "Other"}
COUNTRY = {"Republic of Ireland": "IE"}  # everything else is GB


def creds():
    url = os.environ.get("CLOCAL_SUPABASE_URL")
    key = os.environ.get("CLOCAL_SUPABASE_ANON_KEY")
    if not (url and key):
        env = ROOT.parent / "CLocal" / ".env"
        vals = {}
        if env.exists():
            for line in env.read_text().splitlines():
                if "=" in line and not line.lstrip().startswith("#"):
                    k, v = line.split("=", 1)
                    vals[k.strip()] = v.strip().strip('"').strip("'")
        url = url or vals.get("EXPO_PUBLIC_SUPABASE_URL")
        key = key or vals.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")
    if not (url and key):
        raise SystemExit("Set CLOCAL_SUPABASE_URL and CLOCAL_SUPABASE_ANON_KEY (or fill ../CLocal/.env).")
    return url.rstrip("/"), key


def fetch_events():
    url, key = creds()
    cols = ("id,title,description,location,starts_at,ends_at,image_url,category,"
            "latitude,longitude,area,region")
    q = urllib.parse.urlencode({"select": cols, "status": "eq.published",
                                "order": "starts_at.asc", "limit": "500"})
    req = urllib.request.Request(f"{url}/rest/v1/events?{q}",
                                 headers={"apikey": key, "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def parse(ts):
    return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(TZ) if ts else None


def slug(ev):
    base = re.sub(r"[^a-z0-9]+", "-", ev["title"].lower()).strip("-")[:50].strip("-")
    return f"{base or 'event'}-{ev['id'].replace('-', '')[:6]}"


def page_name(ev):
    return f"event-{slug(ev)}.html"


def esc(s):
    return html.escape(s or "", quote=True)


def clock(d):
    h = d.hour % 12 or 12
    suffix = "am" if d.hour < 12 else "pm"
    return f"{h}{suffix}" if d.minute == 0 else f"{h}:{d.minute:02d}{suffix}"


def when_text(ev):
    s, e = parse(ev["starts_at"]), parse(ev["ends_at"])
    if not s:
        return ""
    day = f"{s.strftime('%A')} {s.day} {s.strftime('%B')}"
    if e and e.date() == s.date():
        return f"{day}, {clock(s)} to {clock(e)}"
    if e:
        return f"{day} {clock(s)} to {e.strftime('%A')} {e.day} {e.strftime('%B')} {clock(e)}"
    return f"{day}, {clock(s)}"


def place_text(ev):
    """Venue, then the town, unless the venue name already says the town."""
    loc, area = (ev.get("location") or "").strip(), (ev.get("area") or "").strip()
    if loc and area and area.lower() not in loc.lower():
        return f"{loc}, {area}"
    return loc or area


def short_date(ev):
    s = parse(ev["starts_at"])
    return f"{s.day} {s.strftime('%b')}" if s else ""


def is_finished(ev, now):
    s, e = parse(ev["starts_at"]), parse(ev["ends_at"])
    end = e or (s + timedelta(hours=12) if s else None)
    return bool(end and end < now)


def keep(ev, now):
    s, e = parse(ev["starts_at"]), parse(ev["ends_at"])
    if not s:
        return False  # undated events cannot be a proper Event page
    end = e or s + timedelta(hours=12)
    return end > now - timedelta(days=KEEP_FINISHED_DAYS)


def first_sentence(text, limit):
    text = " ".join((text or "").split())
    m = re.match(r"(.+?[.!?])(\s|$)", text)
    out = m.group(1) if m else text
    if len(out) <= limit:
        return out
    cut = out[:limit]
    # Cut at the last comma if there is a reasonable one, else the last space, so it never ends mid-list.
    i = cut.rfind(",")
    cut = cut[:i] if i > limit * 0.5 else cut.rsplit(" ", 1)[0]
    return cut.rstrip(",;: ") + "."


def head(title, desc, canonical, image, image_alt, extra_ld="", robots=None):
    ld = f'\n  <script type="application/ld+json">\n{extra_ld}\n  </script>' if extra_ld else ""
    robots_tag = f'\n  <meta name="robots" content="{robots}" />' if robots else ""
    return f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}" />{robots_tag}
  <link rel="canonical" href="{canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="CLocal" />
  <meta property="og:locale" content="en_GB" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:title" content="{esc(title)}" />
  <meta property="og:description" content="{esc(desc)}" />
  <meta property="og:image" content="{esc(image)}" />
  <meta property="og:image:alt" content="{esc(image_alt)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{esc(title)}" />
  <meta name="twitter:description" content="{esc(desc)}" />
  <meta name="twitter:image" content="{esc(image)}" />
  <link rel="icon" href="assets/favicon/favicon.ico?v=2" sizes="32x32" />
  <link rel="icon" type="image/png" href="assets/favicon/favicon-16.png?v=2" sizes="16x16" />
  <link rel="icon" type="image/png" href="assets/favicon/favicon-32.png?v=2" sizes="32x32" />
  <link rel="icon" type="image/png" href="assets/favicon/favicon-192.png?v=2" sizes="192x192" />
  <link rel="apple-touch-icon" href="assets/favicon/apple-touch-icon.png?v=2" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />{ld}
  <script src="consent.js" defer></script>
</head>
"""


NAV = f"""<body>
  <div class="page-glow" aria-hidden="true"></div>

  <header class="nav">
    <a class="nav-brand" href="index.html" aria-label="CLocal home">
      <img class="brand-logo" src="assets/clocal-logo.png" alt="CLocal" width="140" height="40" />
    </a>
    <nav class="nav-links" aria-label="Primary">
      <a href="index.html#how">How it works</a>
      <a href="events.html">What's on</a>
      <a href="hidden-gems-belfast.html">Hidden gems</a>
      <a href="partners.html">Partners</a>
      <a href="{PLAY}" rel="noopener">Get the app</a>
    </nav>
    <a class="play-badge" href="{PLAY}" rel="noopener" aria-label="Get it on Google Play"><img src="assets/google-play-badge.svg" alt="Get it on Google Play" width="180" height="54" /></a><a class="web-app-btn" href="https://www.clocal.app/" rel="noopener">Open the web app</a>
  </header>
"""

FOOT = """
  <footer class="footer">
    <div class="footer-brand">
      <img class="footer-wordmark" src="assets/clocal-logo.png" alt="CLocal" width="120" height="34" />
      <p>Go local. Find hidden gems. Invites on the house. Nearby LocalGems.</p>
      <nav class="footer-social" aria-label="Social media">
        <a href="https://www.instagram.com/clocal_app/" target="_blank" rel="noopener noreferrer">Instagram</a>
        <a href="https://www.facebook.com/profile.php?id=61592855575524" target="_blank" rel="noopener noreferrer">Facebook</a>
        <a class="footer-quiet" href="events.html">What's on</a>
        <a class="footer-quiet" href="things-to-do-south-belfast.html">South Belfast</a>
        <a class="footer-quiet" href="things-to-do-east-belfast.html">East Belfast</a>
        <a class="footer-quiet" href="https://www.clocal.app/what-is-a-localgem" target="_blank" rel="noopener">What is a LocalGem?</a>
        <a class="footer-quiet" href="support.html">Help</a>
      </nav>
    </div>
    <p>© <span id="year"></span> CLocal. All rights reserved.</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>
"""

GET_THE_APP = f"""    <div class="role-waitlist-wrap" id="join">
      <div class="hero-waitlist">
        <h2 class="hero-form-title">CLocal is live on Android</h2>
        <p class="hero-form-lead">Free to download on Google Play. Say you are going and keep track of what is on near you.</p>
        <a class="play-badge" href="{PLAY}" rel="noopener" aria-label="Get it on Google Play"><img src="assets/google-play-badge.svg" alt="Get it on Google Play" width="180" height="54" /></a><a class="web-app-btn" href="https://www.clocal.app/" rel="noopener">Open the web app</a>
        <p class="hero-note">Apple iOS: coming soon.</p>
      </div>
    </div>
"""


def google_calendar(ev):
    s, e = parse(ev["starts_at"]), parse(ev["ends_at"]) or (parse(ev["starts_at"]) + timedelta(hours=2))
    f = lambda d: d.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    q = urllib.parse.urlencode({"action": "TEMPLATE", "text": ev["title"], "dates": f"{f(s)}/{f(e)}",
                                "location": ev["location"] or "",
                                "details": f"{SITE}/{page_name(ev)}"})
    return "https://calendar.google.com/calendar/render?" + q


def event_ld(ev, now):
    s, e = parse(ev["starts_at"]), parse(ev["ends_at"])
    country = COUNTRY.get(ev.get("region") or "", "GB")
    address = {"@type": "PostalAddress", "addressCountry": country}
    if ev.get("area"):
        address["addressLocality"] = ev["area"]
    place = {"@type": "Place", "name": ev["location"] or ev.get("area") or "Venue", "address": address}
    if ev.get("latitude") is not None and ev.get("longitude") is not None:
        place["geo"] = {"@type": "GeoCoordinates", "latitude": ev["latitude"], "longitude": ev["longitude"]}
    d = {"@context": "https://schema.org", "@type": "Event", "name": ev["title"],
         "startDate": s.isoformat(), "eventStatus": "https://schema.org/EventScheduled",
         "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
         "location": place, "url": f"{SITE}/{page_name(ev)}"}
    if e:
        d["endDate"] = e.isoformat()
    if ev.get("description"):
        d["description"] = " ".join(ev["description"].split())
    if ev.get("image_url"):
        d["image"] = [ev["image_url"]]
    return json.dumps(d, indent=2, ensure_ascii=False)


def event_page(ev, now):
    name = page_name(ev)
    canonical = f"{SITE}/{name}"
    finished = is_finished(ev, now)
    place = place_text(ev)
    title_bits = [ev["title"], ev.get("area") or None, short_date(ev)]
    title = ", ".join(b for b in title_bits if b) + " | CLocal"
    desc_when = when_text(ev)
    desc = f"{ev['title']}: {desc_when}" + (f", {place}" if place else "") + ". "
    desc += first_sentence(ev.get("description"), max(0, 158 - len(desc)))
    desc = desc.strip()
    image = ev.get("image_url") or f"{SITE}/assets/social/og-card-2026-11.png"
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n|\n", ev.get("description") or "") if p.strip()]
    body_p = "\n".join(f"      <p>{esc(p)}</p>" for p in paragraphs)
    cat = CATEGORIES.get(ev.get("category") or "")
    status = '      <p class="guide-answer">This event has finished. Browse <a href="events.html">what is on now</a>.</p>\n' if finished else ""
    img = (f'      <p style="margin-bottom:1.25rem"><img src="{esc(ev["image_url"])}" alt="{esc(ev["title"])} flyer" '
           f'style="max-width:100%;height:auto;border-radius:16px" loading="lazy" /></p>\n') if ev.get("image_url") else ""
    cal = "" if finished else f'        <li><a href="{esc(google_calendar(ev))}" rel="noopener">Add it to Google Calendar</a></li>\n'
    more = (f'      <h2>More on CLocal</h2>\n      <ul>\n'
            f'        <li><a href="{APP}/event/{ev["id"]}" rel="noopener">Say you are going, in the CLocal app</a></li>\n'
            f'{cal}'
            f'        <li><a href="events.html">Everything that is on</a></li>\n'
            f'      </ul>\n')
    eyebrow = " · ".join(x for x in [cat, ev.get("area")] if x) or "Local event"
    out = head(title, desc, canonical, image, f"{ev['title']} flyer",
               event_ld(ev, now), robots="noindex, follow" if finished else None)
    out += NAV + f"""
  <main class="role-page-main">
    <div class="role-hero">
      <p class="hero-eyebrow">{esc(eyebrow)}</p>
      <h1>{esc(ev['title'])}</h1>
      <p class="section-lead">{esc(desc_when)}{(' · ' + esc(place)) if place else ''}</p>
    </div>

    <div class="guide-prose">
{status}{img}{body_p}

{more}    </div>

{GET_THE_APP}  </main>
"""
    return out + FOOT


def hub_page(events, now):
    live = [e for e in events if not is_finished(e, now)]
    regions = {e.get("region") for e in live if e.get("region")}
    if len(regions) > 1:
        title, h1, eyebrow = "Local events across the UK and Ireland | CLocal", "What's on near you", "Local events"
    else:
        title, h1, eyebrow = "What's on in Belfast and Northern Ireland | CLocal", "What's on in Belfast", "Events"
    desc = ("Markets, food nights and other local events, with dates, places and a flyer for each. "
            "Say you are going in the CLocal app.")
    canonical = f"{SITE}/events.html"
    items = [{"@type": "ListItem", "position": i + 1, "url": f"{SITE}/{page_name(e)}", "name": e["title"]}
             for i, e in enumerate(live)]
    ld = json.dumps({"@context": "https://schema.org", "@type": "ItemList", "itemListElement": items}, indent=2)
    groups = {}
    for e in live:
        groups.setdefault(e.get("area") or "Elsewhere", []).append(e)
    sections = []
    for area in sorted(groups, key=lambda a: (a == "Elsewhere", a)):
        cards = []
        for e in groups[area]:
            place = place_text(e)
            cards.append(
                f'        <li><a href="{page_name(e)}"><strong>{esc(e["title"])}</strong></a><br />'
                f'{esc(when_text(e))}{(" · " + esc(place)) if place else ""}</li>')
        sections.append(f'      <h2>{esc(area)}</h2>\n      <ul>\n' + "\n".join(cards) + "\n      </ul>")
    if not sections:
        sections = ["      <p>Nothing is listed right now. New events go up here as soon as they are confirmed.</p>"]
    out = head(title, desc, canonical, f"{SITE}/assets/social/og-card-2026-11.png",
               "CLocal: local, on video", ld)
    out += NAV + f"""
  <main class="role-page-main">
    <div class="role-hero">
      <p class="hero-eyebrow">{eyebrow}</p>
      <h1>{h1}</h1>
      <p class="section-lead">Markets, food nights and other local events. Each one has its own page with the time, the place and the flyer.</p>
    </div>

    <div class="guide-prose">
{chr(10).join(sections)}
    </div>

{GET_THE_APP}  </main>
"""
    return out + FOOT


def main():
    now = datetime.now(TZ)
    events = [e for e in fetch_events() if keep(e, now)]
    wanted = {page_name(e) for e in events}
    for e in events:
        (ROOT / page_name(e)).write_text(event_page(e, now), encoding="utf-8")
    (ROOT / "events.html").write_text(hub_page(events, now), encoding="utf-8")
    removed = 0
    for p in ROOT.glob("event-*.html"):
        if p.name not in wanted:
            p.unlink()
            removed += 1
    print(f"events.html + {len(wanted)} event page(s) written, {removed} stale page(s) removed")


if __name__ == "__main__":
    main()
