"""Refresh data/cards.json from the Jellycat US BigCommerce GraphQL API.

Includes every plush (live, coming soon, and retired) with:
  theme · catalogue release · release year · status
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
STORE_URL = "https://us.jellycat.com"
GQL_URL = f"{STORE_URL}/graphql"
SHOP_ALL = f"{STORE_URL}/shop-all/"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

SIZE_PATTERNS = [
    ("Really Big", re.compile(r"\bReally Big\b", re.I)),
    ("Gigantic", re.compile(r"\bGigantic\b", re.I)),
    ("Huge", re.compile(r"\bHuge\b", re.I)),
    ("Large", re.compile(r"\bLarge\b", re.I)),
    ("Medium", re.compile(r"\bMedium\b", re.I)),
    ("Small", re.compile(r"\bSmall\b", re.I)),
    ("Tiny", re.compile(r"\bTiny\b", re.I)),
    ("Little", re.compile(r"\bLittle\b", re.I)),
]

SIZE_ORDER = [
    "Tiny",
    "Little",
    "Small",
    "Medium",
    "Large",
    "Huge",
    "Really Big",
    "Gigantic",
    "One size",
]

STATUS_ORDER = ["Coming Soon", "Live", "Retired"]

SEASON_TO_CATALOGUE = {
    "Christmas": "Christmas Catalogue",
    "Easter": "Easter Catalogue",
    "Valentine": "Valentine's Catalogue",
    "Halloween": "Halloween Catalogue",
    "Chinese New Year": "Chinese New Year",
    "25 Years": "25th Anniversary",
}

META_KEYS = [
    "release_date",
    "seasonality",
    "product_status",
    "Sub_Brand",
    "animal_group",
    "animal_type",
    "product_group",
    "product_style",
    "generic_colour",
    "short_description",
]


def fetch(url: str, data: bytes | None = None, headers: dict | None = None) -> bytes:
    h = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/json",
        "Accept-Language": "en-US,en;q=0.9",
        **(headers or {}),
    }
    req = urllib.request.Request(url, data=data, headers=h, method="POST" if data else "GET")
    with urllib.request.urlopen(req, timeout=90) as resp:
        return resp.read()


def get_storefront_token() -> str:
    html = fetch(SHOP_ALL).decode("utf-8", errors="ignore")
    m = re.search(
        r"(eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)",
        html,
    )
    if not m:
        raise RuntimeError("Could not find BigCommerce storefront API token on shop-all page")
    return m.group(1)


def gql(token: str, query: str, variables: dict | None = None) -> dict:
    body = json.dumps({"query": query, "variables": variables or {}}).encode("utf-8")
    last_err: Exception | None = None
    for attempt in range(4):
        try:
            raw = fetch(
                GQL_URL,
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                    "Origin": STORE_URL,
                    "Referer": f"{STORE_URL}/",
                },
            )
            payload = json.loads(raw.decode("utf-8"))
            if payload.get("errors"):
                raise RuntimeError(payload["errors"])
            return payload
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, RuntimeError) as exc:
            last_err = exc
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"GraphQL failed after retries: {last_err}")


def parse_meta_value(raw: str) -> str:
    if not raw:
        return ""
    try:
        obj = json.loads(raw)
        if isinstance(obj, dict) and "data" in obj:
            val = obj["data"]
            return "" if val is None else str(val).strip()
        return str(obj).strip()
    except Exception:  # noqa: BLE001
        return str(raw).strip()


def parse_size(name: str) -> str:
    for label, pat in SIZE_PATTERNS:
        if pat.search(name):
            return label
    return "One size"


def strip_size(name: str) -> str:
    cleaned = name
    for _, pat in SIZE_PATTERNS:
        cleaned = pat.sub("", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    cleaned = re.sub(r"\s+([–—-])\s*$", "", cleaned)
    return cleaned.strip(" -–—\u200b") or name


def primary_theme(product_style: str, sub_brand: str, animal_group: str) -> str:
    style = (product_style or "").strip()
    if style:
        # Prefer the lead style when comma-separated ("Halloween, Ooky")
        return style.split(",")[0].strip() or style
    if sub_brand and sub_brand not in {"Marketing Materials"}:
        return sub_brand
    if animal_group:
        return animal_group
    return "Other"


def catalogue_of(seasonality: str) -> str:
    season = (seasonality or "").strip()
    if not season:
        return "Main Catalogue"
    return SEASON_TO_CATALOGUE.get(season, f"{season} Catalogue")


def year_of(release_date: str, created_utc: str | None = None) -> str:
    for raw in (release_date, created_utc or ""):
        m = re.match(r"^(\d{4})", raw or "")
        if m:
            return m.group(1)
    return "Unknown"


def normalize_status(raw: str, category_paths: list[str]) -> str:
    status = (raw or "").strip()
    if status in STATUS_ORDER:
        return status
    paths = " ".join(category_paths).lower()
    if "coming-soon" in paths:
        return "Coming Soon"
    if "/retired" in paths or paths.endswith("/retired"):
        return "Retired"
    if status:
        # Unknown store values — keep readable
        return status.title()
    return "Live"


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-") or "other"


PRODUCT_QUERY = """
query ($cursor: String) {
  site {
    products(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          entityId
          name
          path
          sku
          plainTextDescription
          createdAt { utc }
          defaultImage { url(width: 500) urlOriginal }
          images(first: 1) { edges { node { url(width: 500) urlOriginal } } }
          categories { edges { node { entityId name path } } }
          prices { price { value currencyCode } }
          availabilityV2 { status }
          metafields(namespace: "jellycat", first: 40) {
            edges { node { key value } }
          }
        }
      }
    }
  }
}
"""


def normalize_product(node: dict) -> dict | None:
    img = node.get("defaultImage") or {}
    thumb = img.get("url") or img.get("urlOriginal")
    full = img.get("urlOriginal") or thumb
    if not thumb:
        edges = ((node.get("images") or {}).get("edges")) or []
        if edges:
            n0 = edges[0].get("node") or {}
            thumb = n0.get("url") or n0.get("urlOriginal")
            full = n0.get("urlOriginal") or thumb
    if not thumb:
        return None

    name = (node.get("name") or "").replace("\u200b", "").strip()
    if not name:
        return None

    mf = {
        m["node"]["key"]: parse_meta_value(m["node"].get("value") or "")
        for m in ((node.get("metafields") or {}).get("edges") or [])
        if m.get("node")
    }

    cats = [e["node"] for e in ((node.get("categories") or {}).get("edges") or []) if e.get("node")]
    paths = [(c.get("path") or "") for c in cats]

    size = parse_size(name)
    base = strip_size(name)
    theme = primary_theme(mf.get("product_style", ""), mf.get("Sub_Brand", ""), mf.get("animal_group", ""))
    catalogue = catalogue_of(mf.get("seasonality", ""))
    created = ((node.get("createdAt") or {}).get("utc")) or ""
    year = year_of(mf.get("release_date", ""), created)
    status = normalize_status(mf.get("product_status", ""), paths)

    path = node.get("path") or ""
    url = f"{STORE_URL}{path}" if path.startswith("/") else path
    avail = ((node.get("availabilityV2") or {}).get("status")) or ""
    price = None
    try:
        price = (((node.get("prices") or {}).get("price") or {}).get("value"))
    except Exception:  # noqa: BLE001
        price = None

    blurb = (mf.get("short_description") or node.get("plainTextDescription") or "")[:280]
    theme_code = slug(theme)

    return {
        "id": node.get("entityId"),
        "fullName": name,
        "name": base,
        "version": size if size != "One size" else "",
        # Filter dimensions
        "theme": theme,
        "catalogue": catalogue,
        "year": year,
        "status": status,
        # Back-compat aliases used by the gallery UI
        "rarity": status,
        "setCode": theme_code,
        "setName": theme,
        "story": catalogue,
        "type": mf.get("product_group") or "Soft Toy",
        "color": year,
        "size": size,
        "subBrand": mf.get("Sub_Brand") or "",
        "animalGroup": mf.get("animal_group") or "",
        "animalType": mf.get("animal_type") or "",
        "seasonality": mf.get("seasonality") or "",
        "releaseDate": mf.get("release_date") or "",
        "sku": node.get("sku") or "",
        "thumb": thumb,
        "full": full,
        "url": url,
        "price": price,
        "blurb": blurb,
        "availability": avail.replace("_", " ").title() if avail else "",
        "categories": [c.get("name") for c in cats if c.get("name")],
    }


def fetch_all_products(token: str) -> list[dict]:
    items: list[dict] = []
    cursor = None
    page = 0
    while True:
        page += 1
        payload = gql(token, PRODUCT_QUERY, {"cursor": cursor})
        conn = payload["data"]["site"]["products"]
        for edge in conn["edges"]:
            item = normalize_product(edge["node"])
            if item:
                items.append(item)
        print(f"  page {page}: kept {len(items)} so far")
        info = conn["pageInfo"]
        if not info.get("hasNextPage"):
            break
        cursor = info.get("endCursor")
        time.sleep(0.12)

    seen: set[int] = set()
    unique: list[dict] = []
    for it in items:
        i = it["id"]
        if i in seen:
            continue
        seen.add(i)
        unique.append(it)
    return unique


def main() -> None:
    DATA.mkdir(exist_ok=True)
    print("Fetching storefront token…")
    token = get_storefront_token()
    print("Paging through full GraphQL catalogue (live + coming soon + retired)…")
    cards = fetch_all_products(token)

    def sort_key(c: dict):
        st = STATUS_ORDER.index(c["status"]) if c["status"] in STATUS_ORDER else 99
        year = c["year"] if c["year"].isdigit() else "0000"
        return (st, c["theme"], -int(year) if year.isdigit() else 0, c["name"], c["id"])

    cards.sort(key=sort_key)

    themes = sorted({c["theme"] for c in cards if c["theme"]})
    catalogues = sorted({c["catalogue"] for c in cards if c["catalogue"]})
    years = sorted({c["year"] for c in cards if c["year"]}, reverse=True)
    # Keep Unknown at end
    if "Unknown" in years:
        years = [y for y in years if y != "Unknown"] + ["Unknown"]
    statuses = [s for s in STATUS_ORDER if any(c["status"] == s for c in cards)]
    sizes = [s for s in SIZE_ORDER if any(c.get("size") == s for c in cards)]

    # Alias lists for the existing filter plumbing
    sets = [{"code": slug(t), "name": t, "number": None, "type": "theme"} for t in themes]

    out = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": STORE_URL,
        "count": len(cards),
        "themes": themes,
        "catalogues": catalogues,
        "years": years,
        "statuses": statuses,
        "sizes": sizes,
        "sets": sets,
        "rarities": statuses,
        "stories": catalogues,
        "cards": cards,
    }

    path = DATA / "cards.json"
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {path} ({path.stat().st_size:,} bytes, {out['count']} plush)")
    print(f"  statuses: { {s: sum(1 for c in cards if c['status']==s) for s in statuses} }")
    print(f"  themes: {len(themes)}, catalogues: {len(catalogues)}, years: {years[:8]}…")


if __name__ == "__main__":
    main()
