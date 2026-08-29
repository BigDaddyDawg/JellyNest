"""Fetch Jellycat stockists from Storemapper and write data/stockists.json."""
from __future__ import annotations

import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "stockists.json"
STOREMAPPER_URL = (
    "https://storemapper-herokuapp-com.global.ssl.fastly.net"
    "/api/users/24327-cWT5Qha1eoZrNi47/stores.js"
)
USER_AGENT = (
    "Mozilla/5.0 (compatible; JellyNest/1.0; +https://github.com/bigdaddydawg/JellyNest)"
)


def fetch_stores() -> list[dict]:
    req = urllib.request.Request(
        STOREMAPPER_URL,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
    stores = payload.get("stores")
    if not isinstance(stores, list):
        raise RuntimeError("Unexpected Storemapper payload")
    return stores


def normalize(stores: list[dict]) -> list[dict]:
    out: list[dict] = []
    for store in stores:
        lat = store.get("latitude")
        lng = store.get("longitude")
        name = (store.get("name") or "").strip()
        if not name or not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
            continue
        out.append(
            {
                "id": store.get("id"),
                "name": name,
                "address": (store.get("address") or "").strip(),
                "phone": (store.get("phone") or "").strip(),
                "url": (store.get("url") or "").strip(),
                "lat": lat,
                "lng": lng,
            }
        )
    out.sort(key=lambda s: (s["name"].lower(), s.get("id") or 0))
    return out


def main() -> None:
    raw = fetch_stores()
    stores = normalize(raw)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "jellycat-storemapper",
        "count": len(stores),
        "stores": stores,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(stores)} stockists to {OUT}")


if __name__ == "__main__":
    main()
