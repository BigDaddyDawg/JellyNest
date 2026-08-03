"""Refresh data/cards.json from the Jellycat US BigCommerce GraphQL API."""
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

# Prefer these as the "collection / set" for filters.
SET_PRIORITY = [
    ("bartholomew", "Bartholomew Bear & Friends", "bartholomew"),
    ("bashful", "Bashfuls", "bashful"),
    ("amuseables", "Amuseables", "amuseables"),
    ("bags-bag-charms", "Accessories", "accessories"),
    ("/books", "Books", "books"),
    ("personalised", "Personalized", "personalized"),
    ("personalized", "Personalized", "personalized"),
    ("/baby", "Baby", "baby"),
    ("animals/", "Animals", "animals"),
    ("/animals", "Animals", "animals"),
]

META_CATEGORY_NAMES = {
    "explore all",
    "shop all",
    "new",
    "collections",
    "gifts",
    "retired",
    "best sellers",
    "back in stock",
    "coming soon",
    "all soft toys",
    "early access",
    "spring & summer",
    "autumn & winter",
}

STORY_PATH_HINTS = [
    ("/animals/bunnies", "Bunnies"),
    ("/animals/bears", "Bears"),
    ("/animals/dogs-puppies", "Dogs & Puppies"),
    ("/animals/cats-kittens", "Cats & Kittens"),
    ("/animals/ocean", "Ocean"),
    ("/animals/woodland-animals", "Woodland Animals"),
    ("/animals/farmyard", "Farmyard"),
    ("/animals/jungle-safari", "Jungle & Safari"),
    ("/animals/dragons-dinosaurs", "Dragons & Dinosaurs"),
    ("/animals/mythical-creatures", "Mythical Creatures"),
    ("/animals/arctic-antarctic", "Arctic & Antarctic"),
    ("/animals/amphibians-reptiles", "Amphibians & Reptiles"),
    ("/animals/birds", "Birds"),
    ("/animals/bugs-insects", "Bugs & Insects"),
    ("/amuseables/amuseables-food-drink", "Food & Drink"),
    ("/amuseables/amuseables-objects", "Objects"),
    ("/amuseables/amuseables-plants-woodland", "Plants & Woodland"),
    ("/amuseables/amuseables-sports", "Sports"),
    ("/bags-bag-charms/bag-charms", "Bag Charms"),
    ("/bags-bag-charms/bags", "Bags & Purses"),
    ("/baby/", "Baby"),
    ("/books", "Books"),
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
    return cleaned.strip(" -–—") or name


def pick_set(categories: list[dict]) -> tuple[str, str]:
    paths = [(c.get("path") or "").lower() for c in categories]
    joined = " ".join(paths)
    for needle, label, code in SET_PRIORITY:
        if any(needle in p for p in paths) or needle in joined:
            return code, label
    # fall back to first non-meta category
    for c in categories:
        n = (c.get("name") or "").strip()
        p = (c.get("path") or "").lower()
        if not n or n.lower() in META_CATEGORY_NAMES:
            continue
        if p.startswith("/collections/") or p.startswith("/gift-ideas/"):
            continue
        code = re.sub(r"[^a-z0-9]+", "-", n.lower()).strip("-") or "other"
        return code, n
    return "other", "Other"


def pick_story(categories: list[dict], set_name: str, set_code: str) -> str:
    paths = [(c.get("path") or "").lower() for c in categories]
    names = " ".join((c.get("name") or "").lower() for c in categories)
    if set_code == "bartholomew" or "bartholomew" in names or any("bartholomew" in p for p in paths):
        return "Bartholomew"
    if set_code == "bashful" or any("bashful" in p for p in paths):
        # Prefer animal family when available, else Bashfuls
        for needle, label in STORY_PATH_HINTS:
            if needle.startswith("/animals/") and any(needle in p for p in paths):
                return label
        return "Bashfuls"
    for needle, label in STORY_PATH_HINTS:
        if any(needle in p for p in paths):
            return label
    if set_name == "Amuseables":
        return "Amuseables"
    return set_name or "Jellycat"


def pick_type(categories: list[dict], set_code: str) -> str:
    paths = " ".join((c.get("path") or "").lower() for c in categories)
    if "bag-charm" in paths or "/bags" in paths:
        return "Accessory"
    if "/books" in paths or "soft-books" in paths:
        return "Book"
    if "/baby" in paths and "soft-toys" not in paths:
        return "Baby"
    if set_code == "accessories":
        return "Accessory"
    if set_code == "books":
        return "Book"
    if set_code == "baby":
        return "Baby"
    return "Soft Toy"


def normalize_product(node: dict) -> dict | None:
    img = node.get("defaultImage") or {}
    thumb = img.get("url") or img.get("urlOriginal")
    full = img.get("urlOriginal") or thumb
    if not thumb:
        # try first gallery image
        edges = ((node.get("images") or {}).get("edges")) or []
        if edges:
            n0 = edges[0].get("node") or {}
            thumb = n0.get("url") or n0.get("urlOriginal")
            full = n0.get("urlOriginal") or thumb
    if not thumb:
        return None

    cats = [e["node"] for e in ((node.get("categories") or {}).get("edges") or []) if e.get("node")]
    # Skip items that only live under Retired (still include if also in active cats)
    paths = [(c.get("path") or "").lower() for c in cats]
    if paths and all(p.startswith("/retired") or p == "/retired" for p in paths):
        return None

    name = (node.get("name") or "").strip()
    if not name:
        return None

    size = parse_size(name)
    base = strip_size(name)
    set_code, set_name = pick_set(cats)
    story = pick_story(cats, set_name, set_code)
    ptype = pick_type(cats, set_code)
    path = node.get("path") or ""
    url = f"{STORE_URL}{path}" if path.startswith("/") else path

    avail = ((node.get("availabilityV2") or {}).get("status")) or ""
    price = None
    try:
        price = (((node.get("prices") or {}).get("price") or {}).get("value"))
    except Exception:  # noqa: BLE001
        price = None

    return {
        "id": node.get("entityId"),
        "fullName": name,
        "name": base,
        "version": size if size != "One size" else "",
        "rarity": size,
        "setCode": set_code,
        "setName": set_name,
        "story": story,
        "type": ptype,
        "color": avail.replace("_", " ").title() if avail else "",
        "sku": node.get("sku") or "",
        "thumb": thumb,
        "full": full,
        "url": url,
        "price": price,
        "blurb": (node.get("plainTextDescription") or "")[:280],
        "categories": [c.get("name") for c in cats if c.get("name")],
    }


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
          defaultImage { url(width: 500) urlOriginal }
          images(first: 1) { edges { node { url(width: 500) urlOriginal } } }
          categories { edges { node { entityId name path } } }
          prices { price { value currencyCode } }
          availabilityV2 { status }
        }
      }
    }
  }
}
"""


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
        time.sleep(0.15)
    # de-dupe by id
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
    print("Paging through GraphQL catalogue…")
    cards = fetch_all_products(token)
    cards.sort(key=lambda c: (c["setName"], c["name"], SIZE_ORDER.index(c["rarity"]) if c["rarity"] in SIZE_ORDER else 99, c["id"]))

    sets_map: dict[str, dict] = {}
    for c in cards:
        sets_map.setdefault(
            c["setCode"],
            {"code": c["setCode"], "name": c["setName"], "number": None, "type": "collection"},
        )

    out = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": STORE_URL,
        "count": len(cards),
        "sets": sorted(sets_map.values(), key=lambda s: s["name"]),
        "rarities": [s for s in SIZE_ORDER if any(c["rarity"] == s for c in cards)],
        "stories": sorted({c["story"] for c in cards if c["story"]}),
        "cards": cards,
    }

    path = DATA / "cards.json"
    path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {path} ({path.stat().st_size:,} bytes, {out['count']} plush)")


if __name__ == "__main__":
    main()
