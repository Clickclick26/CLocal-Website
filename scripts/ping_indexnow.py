#!/usr/bin/env python3
"""Ping IndexNow with every URL in sitemap.xml. Free. No social posting."""

from __future__ import annotations

import json
import ssl
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def main() -> None:
    key = (ROOT / ".indexnow-key").read_text().strip()
    tree = ET.parse(ROOT / "sitemap.xml")
    urls = [el.text for el in tree.getroot().findall("s:url/s:loc", NS) if el.text]
    body = json.dumps(
        {
            "host": "clocal.co.uk",
            "key": key,
            "keyLocation": f"https://clocal.co.uk/{key}.txt",
            "urlList": urls,
        }
    ).encode()
    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=20, context=ctx) as res:
            print("IndexNow", res.status, len(urls), "urls")
    except Exception as exc:
        print("IndexNow ping failed (will retry on next run):", exc)


if __name__ == "__main__":
    main()
