"""Refresh data/cards.json from the Jellycat US BigCommerce GraphQL API.

Includes every plush (live, coming soon, and retired) with:
  theme · catalogue release · release year · status

Also merges store / experience exclusives from:
  - data/exclusives-fetched.json (official jellycat.com experience pages)
  - data/exclusives-curated.json (hand overrides + pages the site under-lists)

Run scripts/refresh_exclusives.py before a full refresh to refresh the fetched feed.
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
UK_STORE_URL = "https://jellycat.com"
GQL_URL = f"{STORE_URL}/graphql"
UK_GQL_URL = f"{UK_STORE_URL}/graphql"
SHOP_ALL = f"{STORE_URL}/shop-all/"
UK_SHOP_ALL = f"{UK_STORE_URL}/shop-all/"
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


def get_storefront_token(shop_all_url: str = SHOP_ALL) -> str:
    html = fetch(shop_all_url).decode("utf-8", errors="ignore")
    m = re.search(
        r"(eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)",
        html,
    )
    if not m:
        raise RuntimeError(f"Could not find BigCommerce storefront API token on {shop_all_url}")
    return m.group(1)


def gql(
    token: str,
    query: str,
    variables: dict | None = None,
    *,
    gql_url: str = GQL_URL,
    origin: str = STORE_URL,
) -> dict:
    body = json.dumps({"query": query, "variables": variables or {}}).encode("utf-8")
    last_err: Exception | None = None
    for attempt in range(4):
        try:
            raw = fetch(
                gql_url,
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}",
                    "Origin": origin,
                    "Referer": f"{origin}/",
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


def normalize_availability(raw: str) -> str:
    key = (raw or "").replace("_", " ").strip().lower()
    if key == "available":
        return "Available"
    if key in {"preorder", "pre-order", "pre order"}:
        return "Preorder"
    if key == "unavailable":
        return "Unavailable"
    return (raw or "").replace("_", " ").title()


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-") or "other"


UK_PATH_QUERY = """
query ($cursor: String) {
  site {
    products(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          sku
          path
        }
      }
    }
  }
}
"""


def fetch_uk_paths(token: str) -> dict[str, str]:
    """Map SKU -> UK product path from jellycat.com (GBP store)."""
    mapping: dict[str, str] = {}
    cursor = None
    page = 0
    while True:
        page += 1
        payload = gql(
            token,
            UK_PATH_QUERY,
            {"cursor": cursor},
            gql_url=UK_GQL_URL,
            origin=UK_STORE_URL,
        )
        conn = payload["data"]["site"]["products"]
        for edge in conn["edges"]:
            node = edge["node"]
            sku = (node.get("sku") or "").strip()
            path = node.get("path") or ""
            if sku and path.startswith("/"):
                mapping[sku] = path
        print(f"  UK page {page}: {len(mapping)} sku paths")
        info = conn["pageInfo"]
        if not info.get("hasNextPage"):
            break
        cursor = info.get("endCursor")
        time.sleep(0.12)
    return mapping


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


def is_cuddly_plush(card: dict) -> bool:
    """Keep soft toys; drop bag charms, handbags/backpacks/totes, and pin badges."""
    ptype = (card.get("type") or "").casefold()
    name = (card.get("fullName") or card.get("name") or "").casefold()
    theme = (card.get("theme") or "").casefold()
    tokens = {part.strip() for part in ptype.split(",") if part.strip()}

    if "bag charm" in tokens or "bag charm" in name or theme == "bag charms":
        return False
    if "bag" in tokens:
        return False
    if "pin badge" in name or "enamel pin" in name:
        return False
    if "display" in tokens and re.search(r"\bpin\b|\bbadge\b", name):
        return False
    if "tote bag" in name or "handbag" in name:
        return False
    # Real bags named backpack; keep Soft Toy "Backpack Panda" characters
    if re.search(r"\bbackpack\b", name) and "soft toy" not in tokens:
        return False
    return True


def filter_cuddly_plush(cards: list[dict], *, label: str = "catalogue") -> list[dict]:
    kept = [c for c in cards if is_cuddly_plush(c)]
    dropped = len(cards) - len(kept)
    if dropped:
        print(f"  filtered non-cuddly accessories from {label}: {dropped}")
    return kept


def normalize_product(node: dict, uk_paths: dict[str, str] | None = None) -> dict | None:
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
    sku = (node.get("sku") or "").strip()
    uk_path = (uk_paths or {}).get(sku) or ""
    uk_url = f"{UK_STORE_URL}{uk_path}" if uk_path.startswith("/") else ""

    avail = normalize_availability(((node.get("availabilityV2") or {}).get("status")) or "")
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
        "sku": sku,
        "thumb": thumb,
        "full": full,
        "url": url,
        "ukUrl": uk_url,
        "price": price,
        "blurb": blurb,
        "availability": avail,
        "categories": [c.get("name") for c in cats if c.get("name")],
    }


def fetch_all_products(token: str, uk_paths: dict[str, str]) -> list[dict]:
    items: list[dict] = []
    cursor = None
    page = 0
    while True:
        page += 1
        payload = gql(token, PRODUCT_QUERY, {"cursor": cursor})
        conn = payload["data"]["site"]["products"]
        for edge in conn["edges"]:
            item = normalize_product(edge["node"], uk_paths)
            if item and is_cuddly_plush(item):
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


def normalize_exclusive(item: dict) -> dict | None:
    """Map a curated/fetched store-exclusive row into a gallery card."""
    full_name = (item.get("fullName") or item.get("name") or "").replace("\u200b", "").strip()
    if not full_name:
        return None
    name = (item.get("name") or full_name).replace("\u200b", "").strip()
    eid = item.get("id") or f"exclusive-{slug(full_name)}"
    theme = (item.get("theme") or "Characters").strip()
    catalogue = (item.get("catalogue") or "Exclusives").strip()
    if catalogue == "Store Exclusive":
        catalogue = "Exclusives"
    year = str(item.get("year") or "Unknown").strip() or "Unknown"
    status = (item.get("status") or "Live").strip()
    if status not in STATUS_ORDER:
        status = "Live"
    size = item.get("size") or "One size"
    thumb = item.get("thumb") or ""
    full = item.get("full") or thumb
    sku = (item.get("sku") or "").strip()
    theme_code = slug(theme)
    cats = item.get("categories") or ["Exclusives"]
    cats = ["Exclusives" if c == "Store Exclusive" else c for c in cats]
    return {
        "id": eid,
        "fullName": full_name,
        "name": name,
        "version": item.get("version") or "Exclusive",
        "theme": theme,
        "catalogue": catalogue,
        "year": year,
        "status": status,
        "rarity": status,
        "setCode": theme_code,
        "setName": theme,
        "story": catalogue,
        "type": item.get("type") or "Soft Toy",
        "color": year,
        "size": size,
        "subBrand": item.get("subBrand") or "",
        "animalGroup": item.get("animalGroup") or "",
        "animalType": item.get("animalType") or "",
        "seasonality": item.get("seasonality") or "",
        "releaseDate": item.get("releaseDate") or "",
        "sku": sku,
        "thumb": thumb,
        "full": full,
        "url": item.get("url") or "",
        "ukUrl": item.get("ukUrl") or "",
        "price": item.get("price"),
        "blurb": (item.get("blurb") or "")[:280],
        "availability": item.get("availability") or "Store Exclusive",
        "categories": cats,
    }


def exclusive_name_key(text: str) -> str:
    s = (text or "").replace("\u200b", "").replace("’", "'").casefold()
    s = re.sub(r"^jellycat\s+", "", s)
    s = re.sub(r"^amuseables?\s+", "", s)
    s = s.replace("&", "and").replace(".", " ")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


# Experience pages sometimes shorten a name that already exists online.
ONLINE_NAME_ALIASES = {
    "pizza": {"slice of pizza"},
}


def load_exclusive_rows(path: Path) -> list[dict]:
    if not path.exists():
        return []
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        raw = raw.get("cards") or raw.get("items") or []
    if not isinstance(raw, list):
        raise SystemExit(f"Expected a JSON array (or {{cards: []}}) in {path}")
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        card = normalize_exclusive(item)
        if card:
            out.append(card)
    return out


def load_curated_exclusives() -> list[dict]:
    return load_exclusive_rows(DATA / "exclusives-curated.json")


def load_fetched_exclusives() -> list[dict]:
    return load_exclusive_rows(DATA / "exclusives-fetched.json")


def merge_exclusive_sources(fetched: list[dict], curated: list[dict]) -> list[dict]:
    """Combine scraped experience exclusives with hand curation.

    Curated wins on conflicting fields for the same normalised name, but we keep
    a scraped image when curation lacks one.
    """
    by_key: dict[str, dict] = {}
    for card in fetched:
        key = exclusive_name_key(card.get("fullName") or "")
        if key:
            by_key[key] = card
    for card in curated:
        key = exclusive_name_key(card.get("fullName") or "")
        if not key:
            continue
        prev = by_key.get(key)
        if not prev:
            by_key[key] = card
            continue
        merged = {**prev, **{k: v for k, v in card.items() if v not in (None, "", [])}}
        if prev.get("thumb") and not merged.get("thumb"):
            merged["thumb"] = prev["thumb"]
            merged["full"] = prev.get("full") or prev["thumb"]
        if str(card.get("id", "")).startswith("exclusive-"):
            merged["id"] = card["id"]
        by_key[key] = merged
    return list(by_key.values())


def website_name_keys(cards: list[dict]) -> set[str]:
    keys: set[str] = set()
    for c in cards:
        if str(c.get("id", "")).startswith("exclusive-"):
            continue
        if c.get("catalogue") in {"Exclusives", "Store Exclusive"}:
            continue
        for field in ("fullName", "name"):
            key = exclusive_name_key(c.get(field) or "")
            if key:
                keys.add(key)
    return keys


def is_already_online(card: dict, online_keys: set[str]) -> bool:
    key = exclusive_name_key(card.get("fullName") or "")
    if not key:
        return False
    variants = {
        key,
        exclusive_name_key("Amuseables " + (card.get("fullName") or "")),
        exclusive_name_key(re.sub(r"(?i)^amuseables?\s+", "", card.get("fullName") or "")),
    }
    variants |= ONLINE_NAME_ALIASES.get(key, set())
    return any(v and v in online_keys for v in variants)


def merge_exclusives(cards: list[dict]) -> list[dict]:
    """Append fetched + curated exclusives that are not already on the website."""
    fetched = load_fetched_exclusives()
    curated = load_curated_exclusives()
    exclusives = merge_exclusive_sources(fetched, curated)
    exclusives = filter_cuddly_plush(exclusives, label="exclusives")
    print(
        f"Store exclusives loaded: {len(fetched)} fetched + {len(curated)} curated "
        f"-> {len(exclusives)} cuddly unique"
    )
    if not exclusives:
        return cards

    online_keys = website_name_keys(cards)
    existing_ids = {str(c.get("id")) for c in cards}
    existing_skus = {(c.get("sku") or "").strip() for c in cards if (c.get("sku") or "").strip()}
    existing_names = {exclusive_name_key(c.get("fullName") or "") for c in cards}

    added = 0
    skipped_online = 0
    for ex in exclusives:
        eid = str(ex["id"])
        sku = (ex.get("sku") or "").strip()
        name_key = exclusive_name_key(ex.get("fullName") or "")
        if eid in existing_ids:
            continue
        if sku and sku in existing_skus:
            print(f"  skip exclusive (SKU already online): {ex['fullName']} ({sku})")
            skipped_online += 1
            continue
        if is_already_online(ex, online_keys):
            print(f"  skip exclusive (already online): {ex['fullName']}")
            skipped_online += 1
            continue
        if name_key and name_key in existing_names:
            continue
        cards.append(ex)
        added += 1
        existing_ids.add(eid)
        if sku:
            existing_skus.add(sku)
        if name_key:
            existing_names.add(name_key)

    print(f"Store exclusives added: {added} (skipped online: {skipped_online})")
    return cards


def card_sort_key(c: dict):
    st = STATUS_ORDER.index(c["status"]) if c["status"] in STATUS_ORDER else 99
    year = c["year"] if str(c.get("year", "")).isdigit() else "0000"
    return (st, c.get("theme") or "", -int(year) if year.isdigit() else 0, c.get("name") or "", str(c.get("id")))


def build_catalog(cards: list[dict], *, generated: str | None = None) -> dict:
    cards = list(cards)
    cards.sort(key=card_sort_key)

    themes = sorted({c["theme"] for c in cards if c.get("theme")})
    catalogues = sorted({c["catalogue"] for c in cards if c.get("catalogue")})
    years = sorted({c["year"] for c in cards if c.get("year")}, reverse=True)
    # Keep Unknown at end
    if "Unknown" in years:
        years = [y for y in years if y != "Unknown"] + ["Unknown"]
    statuses = [s for s in STATUS_ORDER if any(c.get("status") == s for c in cards)]
    sizes = [s for s in SIZE_ORDER if any(c.get("size") == s for c in cards)]
    sets = [{"code": slug(t), "name": t, "number": None, "type": "theme"} for t in themes]

    return {
        "generated": generated or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": STORE_URL,
        "ukSource": UK_STORE_URL,
        "exclusivesSource": "jellycat.com/events-experiences + data/exclusives-curated.json",
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


def write_catalog(out: dict) -> Path:
    path = DATA / "cards.json"
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    cards = out["cards"]
    statuses = out["statuses"]
    with_uk = sum(1 for c in cards if c.get("ukUrl"))
    linkable = sum(
        1 for c in cards if c.get("ukUrl") and c.get("availability") in {"Available", "Preorder"}
    )
    exclusives = sum(1 for c in cards if c.get("catalogue") in {"Exclusives", "Store Exclusive"})
    print(f"Wrote {path} ({path.stat().st_size:,} bytes, {out['count']} plush)")
    print(f"  statuses: { {s: sum(1 for c in cards if c['status']==s) for s in statuses} }")
    print(f"  exclusives catalogue: {exclusives}")
    print(f"  ukUrl coverage: {with_uk}/{len(cards)}, buyable links: {linkable}")
    print(f"  themes: {len(out['themes'])}, catalogues: {len(out['catalogues'])}, years: {out['years'][:8]}…")
    return path


def merge_exclusives_only() -> None:
    """Re-merge exclusives into the existing cards.json (no live GraphQL scrape)."""
    DATA.mkdir(exist_ok=True)
    path = DATA / "cards.json"
    if not path.exists():
        raise SystemExit(f"Missing {path}; run a full refresh first.")
    data = json.loads(path.read_text(encoding="utf-8"))
    # Drop previous exclusives so fetch/curated edits apply cleanly
    website_cards = [
        c
        for c in data.get("cards") or []
        if not str(c.get("id", "")).startswith("exclusive-")
        and c.get("catalogue") not in {"Exclusives", "Store Exclusive"}
    ]
    website_cards = filter_cuddly_plush(website_cards, label="website catalogue")
    cards = merge_exclusives(website_cards)
    out = build_catalog(cards, generated=data.get("generated"))
    write_catalog(out)


def main() -> None:
    DATA.mkdir(exist_ok=True)
    print("Fetching UK storefront token + SKU paths…")
    uk_token = get_storefront_token(UK_SHOP_ALL)
    uk_paths = fetch_uk_paths(uk_token)
    print(f"UK paths: {len(uk_paths)}")

    print("Fetching US storefront token…")
    token = get_storefront_token()
    print("Paging through full GraphQL catalogue (live + coming soon + retired)…")
    cards = fetch_all_products(token, uk_paths)
    cards = merge_exclusives(cards)
    out = build_catalog(cards)
    write_catalog(out)


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] in {"--merge-exclusives", "--exclusives-only"}:
        merge_exclusives_only()
    else:
        main()