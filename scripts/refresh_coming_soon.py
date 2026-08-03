"""Build data/coming-soon.json from Jellycat Coming Soon / New + Jelly Journal."""
from __future__ import annotations

import html as html_lib
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
JOURNAL_URL = "https://www.jellycat.com/jelly-journal/"
JOURNAL_PROXY = "https://r.jina.ai/http://www.jellycat.com/jelly-journal/"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# Curated horizon collections — treated like "upcoming sets"
HORIZON = [
    {
        "code": "coming-soon",
        "name": "Coming Soon",
        "type": "collection",
        "path": "/collections/coming-soon",
        "blurb": "Brand-new friends waiting in the wings — soft, squishy, and almost ready to hop home.",
    },
    {
        "code": "new",
        "name": "New Arrivals",
        "type": "collection",
        "path": "/new",
        "blurb": "The latest plush to land in the nest — fresh from the Jellycat studio.",
    },
    {
        "code": "back-in-stock",
        "name": "Back In Stock",
        "type": "collection",
        "path": "/collections/back-in-stock",
        "blurb": "Old favourites returning for another cuddle. Grab them while the shelf is full.",
    },
]


def fetch(url: str, data: bytes | None = None, headers: dict | None = None) -> bytes:
    h = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/json,*/*",
        "Accept-Language": "en-US,en;q=0.9",
        **(headers or {}),
    }
    req = urllib.request.Request(url, data=data, headers=h, method="POST" if data else "GET")
    with urllib.request.urlopen(req, timeout=90) as resp:
        return resp.read()


def fetch_text(url: str) -> str:
    return fetch(url).decode("utf-8", errors="ignore")


def get_storefront_token() -> str:
    html = fetch_text(SHOP_ALL)
    m = re.search(
        r"(eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)",
        html,
    )
    if not m:
        raise RuntimeError("Could not find storefront API token")
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
    raise RuntimeError(f"GraphQL failed: {last_err}")


def clean(text: str) -> str:
    text = html_lib.unescape(text or "")
    return re.sub(r"\s+", " ", text).strip()


def find_category_id(tree: list[dict], path: str) -> int | None:
    target = path.rstrip("/").lower()

    def walk(nodes: list[dict]) -> int | None:
        for n in nodes:
            p = (n.get("path") or "").rstrip("/").lower()
            if p == target:
                return n.get("entityId")
            kids = n.get("children") or []
            found = walk(kids)
            if found:
                return found
        return None

    return walk(tree)


def slim_from_node(node: dict, set_code: str, set_name: str) -> dict | None:
    img = node.get("defaultImage") or {}
    thumb = img.get("url") or img.get("urlOriginal")
    full = img.get("urlOriginal") or thumb
    if not thumb:
        return None
    name = (node.get("name") or "").strip()
    path = node.get("path") or ""
    cats = [e["node"]["name"] for e in ((node.get("categories") or {}).get("edges") or []) if e.get("node")]
    story = cats[0] if cats else set_name
    return {
        "id": node.get("entityId"),
        "fullName": name,
        "name": name,
        "version": "Coming soon" if set_code == "coming-soon" else "New",
        "rarity": "Preview" if set_code == "coming-soon" else "New",
        "setCode": set_code,
        "setName": set_name,
        "story": story,
        "type": "Soft Toy",
        "color": "",
        "sku": node.get("sku") or "",
        "thumb": thumb,
        "full": full,
        "url": f"{STORE_URL}{path}" if path.startswith("/") else path,
        "blurb": (node.get("plainTextDescription") or "")[:240],
    }


CATEGORY_PRODUCTS = """
query ($id: Int!) {
  site {
    category(entityId: $id) {
      entityId
      name
      path
      description
      products(first: 50) {
        edges {
          node {
            entityId
            name
            path
            sku
            plainTextDescription
            defaultImage { url(width: 500) urlOriginal }
            categories { edges { node { name path } } }
          }
        }
      }
    }
  }
}
"""


def enrich_horizon(token: str, tree: list[dict]) -> tuple[list[dict], list[dict]]:
    upcoming: list[dict] = []
    reveals: list[dict] = []
    for entry in HORIZON:
        cat_id = find_category_id(tree, entry["path"])
        item = {
            "code": entry["code"],
            "name": entry["name"],
            "type": entry["type"],
            "blurb": entry["blurb"],
            "productUrl": f"{STORE_URL}{entry['path']}",
            "releaseDate": None,
            "revealedCount": 0,
            "gallery": [],
            "heroImage": None,
        }
        if not cat_id:
            print(f"  missing category for {entry['path']}")
            upcoming.append(item)
            continue
        payload = gql(token, CATEGORY_PRODUCTS, {"id": cat_id})
        cat = payload["data"]["site"]["category"]
        products = []
        for edge in (cat.get("products") or {}).get("edges") or []:
            slim = slim_from_node(edge["node"], entry["code"], entry["name"])
            if slim:
                products.append(slim)
        item["revealedCount"] = len(products)
        if cat.get("description"):
            desc = clean(re.sub(r"<[^>]+>", " ", cat["description"]))
            if len(desc) > 40:
                item["blurb"] = desc[:420]
        if products:
            item["heroImage"] = products[0]["full"] or products[0]["thumb"]
            item["gallery"] = [p["full"] or p["thumb"] for p in products[:6]]
        print(f"  {entry['name']}: {len(products)} products")
        upcoming.append(item)
        if entry["code"] in {"coming-soon", "new"}:
            reveals.extend(products)
        time.sleep(0.1)
    # de-dupe reveals by id, prefer coming-soon first
    seen: set = set()
    unique = []
    for r in reveals:
        if r["id"] in seen:
            continue
        seen.add(r["id"])
        unique.append(r)
    return upcoming, unique


def parse_journal_markdown(md: str) -> list[dict]:
    items: list[dict] = []
    seen: set[str] = set()
    # jina often emits links like [Title](url) near dates
    link_re = re.compile(
        r"\[([^\]]{8,120})\]\((https?://(?:www\.)?jellycat\.com/jelly-journal/[^)\s]+)\)",
        re.I,
    )
    for m in link_re.finditer(md):
        title = clean(m.group(1))
        url = m.group(2).split("?")[0]
        if title.lower() in seen:
            continue
        if re.match(r"^(jelly journal|read more|home|shop|new)$", title, re.I):
            continue
        seen.add(title.lower())
        # look backwards for an image and date
        window = md[max(0, m.start() - 500) : m.start()]
        img = re.search(r"!\[[^\]]*\]\((https?://[^)\s]+)\)", window)
        date = ""
        dm = re.search(
            r"((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})",
            window + md[m.start() : m.end() + 200],
        )
        if dm:
            date = dm.group(1)
        summary = ""
        after = md[m.end() : m.end() + 400]
        for line in after.splitlines():
            line = clean(line)
            if len(line) > 50 and not line.startswith("#") and "http" not in line:
                summary = line[:280]
                break
        items.append(
            {
                "title": title,
                "date": date,
                "category": "Jelly Journal",
                "summary": summary,
                "url": url,
                "image": img.group(1) if img else None,
            }
        )
        if len(items) >= 14:
            break
    return items


def parse_journal_html(raw: str) -> list[dict]:
    items: list[dict] = []
    seen: set[str] = set()
    # article cards
    for m in re.finditer(
        r'<a[^>]+href="(https?://(?:www\.)?jellycat\.com/jelly-journal/[^"]+|/?jelly-journal/[^"]+)"[^>]*>\s*'
        r'(?:<[^>]+>\s*)*(?:<img[^>]+src="([^"]+)"[^>]*>)?[\s\S]{0,400}?'
        r"(?:<h[1-3][^>]*>|<div[^>]*class=\"[^\"]*title[^\"]*\"[^>]*>)([^<]{8,120})",
        raw,
        re.I,
    ):
        href = m.group(1)
        if href.startswith("/"):
            href = "https://www.jellycat.com" + href
        title = clean(m.group(3))
        key = title.lower()
        if key in seen:
            continue
        seen.add(key)
        items.append(
            {
                "title": title,
                "date": "",
                "category": "Jelly Journal",
                "summary": "",
                "url": href,
                "image": m.group(2),
            }
        )
        if len(items) >= 14:
            break
    return items


def news_from_reveals(reveals: list[dict]) -> list[dict]:
    """Fallback headlines built from newly spotted plush when the Journal is JS-only."""
    items: list[dict] = []
    for r in reveals[:12]:
        items.append(
            {
                "title": r.get("fullName") or r.get("name") or "New friend",
                "date": "",
                "category": "New Arrivals",
                "summary": (r.get("blurb") or "A soft new face has hopped into the nest.").strip()[:280],
                "url": r.get("url") or f"{STORE_URL}/new",
                "image": r.get("thumb") or r.get("full"),
            }
        )
    return items


def fetch_news(reveals: list[dict]) -> list[dict]:
    # Prefer jina markdown (CORS-friendly mirror also used live in the app)
    try:
        print("Fetching Jelly Journal via reader…")
        md = fetch_text(JOURNAL_PROXY)
        items = parse_journal_markdown(md)
        if items:
            print(f"  journal markdown items: {len(items)}")
            return items
    except Exception as exc:  # noqa: BLE001
        print(f"  journal proxy failed: {exc}")

    try:
        print("Fetching Jelly Journal HTML…")
        html = fetch_text(JOURNAL_URL)
        items = parse_journal_html(html)
        if items:
            print(f"  journal html items: {len(items)}")
            return items
        print("  journal html had no article cards")
    except Exception as exc:  # noqa: BLE001
        print(f"  journal html failed: {exc}")

    fallback = news_from_reveals(reveals)
    print(f"  using new-arrivals fallback news: {len(fallback)}")
    return fallback


def main() -> None:
    DATA.mkdir(exist_ok=True)
    print("Fetching storefront token…")
    token = get_storefront_token()

    print("Loading category tree…")
    tree_payload = gql(
        token,
        """
        {
          site {
            categoryTree {
              entityId name path productCount
              children {
                entityId name path productCount
                children { entityId name path productCount }
              }
            }
          }
        }
        """,
    )
    tree = tree_payload["data"]["site"]["categoryTree"]

    print("Enriching horizon collections…")
    upcoming, reveals = enrich_horizon(token, tree)
    news = fetch_news(reveals)
    leaks = load_curated_leaks()
    print(f"Curated leak groups: {len(leaks)}")

    out = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sources": {
            "catalogue": STORE_URL,
            "news": JOURNAL_URL,
            "leaks": "Curated fan spoilers in data/leaks-curated.json (unofficial)",
        },
        "upcomingSets": upcoming,
        "reveals": reveals,
        "news": news,
        "leaks": leaks,
    }
    path = DATA / "coming-soon.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {path} ({path.stat().st_size:,} bytes)")


def load_curated_leaks() -> list[dict]:
    curated_path = DATA / "leaks-curated.json"
    if not curated_path.exists():
        return []
    raw = json.loads(curated_path.read_text(encoding="utf-8"))
    groups: list[dict] = []
    for group in raw:
        items = []
        for item in group.get("items") or []:
            items.append(
                {
                    "id": item.get("id"),
                    "fullName": item.get("fullName") or item.get("name"),
                    "name": item.get("name") or item.get("fullName"),
                    "version": "Unofficial leak",
                    "rarity": "Leak",
                    "status": "Leak",
                    "availability": "Leak",
                    "theme": group.get("title") or "Leak",
                    "catalogue": group.get("catalogue") or "Main Catalogue",
                    "year": group.get("year") or "",
                    "setCode": group.get("id") or "leak",
                    "setName": group.get("title") or "Leaks",
                    "story": group.get("title") or "Leak",
                    "type": "Leak",
                    "color": group.get("year") or "",
                    "size": "One size",
                    "sku": "",
                    "thumb": item.get("thumb") or "",
                    "full": item.get("full") or item.get("thumb") or "",
                    "url": item.get("url") or "",
                    "ukUrl": "",
                    "blurb": item.get("blurb") or group.get("blurb") or "",
                    "sourceNote": group.get("sourceNote") or "Unofficial fan spoiler",
                }
            )
        groups.append(
            {
                "id": group.get("id"),
                "title": group.get("title"),
                "catalogue": group.get("catalogue"),
                "year": group.get("year"),
                "blurb": group.get("blurb"),
                "sourceNote": group.get("sourceNote"),
                "items": items,
            }
        )
    return groups


if __name__ == "__main__":
    main()
