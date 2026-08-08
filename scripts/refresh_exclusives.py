"""Fetch store / experience exclusives from official Jellycat experience pages.

Second catalogue source (alongside the BigCommerce GraphQL shop):
  Fish & Chips · London / Selfridges
  Diner · New York (FAO Schwarz)
  Patisserie · Paris (Galeries Lafayette)
  Café · Shanghai & Beijing
  General Stores · Selfridges Birmingham & Manchester

Writes data/exclusives-fetched.json for scripts/refresh_data.py to merge.
Hand overrides and pages the site under-lists live in data/exclusives-curated.json.
"""
from __future__ import annotations

import html as html_lib
import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT_PATH = DATA / "exclusives-fetched.json"
STORE_URL = "https://jellycat.com"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# Official experience pages listed from jellycat.com/events-experiences/
EXPERIENCES = [
    {
        "id": "fish-chips-london",
        "label": "Fish & Chips · London / Selfridges",
        "version": "Fish & Chips Experience",
        "location": "Selfridges London",
        "year": "2024",
        "theme": "Amuseables Food & Drink",
        "url": f"{STORE_URL}/jellycat-fish-chips-experience-london/",
    },
    {
        "id": "diner-new-york",
        "label": "Diner · New York",
        "version": "Diner Experience",
        "location": "FAO Schwarz, New York",
        "year": "2023",
        "theme": "Amuseables Food & Drink",
        "url": f"{STORE_URL}/jellycat-diner-experience-new-york/",
    },
    {
        "id": "patisserie-paris",
        "label": "Patisserie · Paris",
        "version": "Patisserie Experience",
        "location": "Galeries Lafayette / FAO Schwarz Paris",
        "year": "2024",
        "theme": "Amuseables Food & Drink",
        "url": f"{STORE_URL}/jellycat-patisserie-experience-paris/",
    },
    {
        "id": "cafe-shanghai",
        "label": "Café · Shanghai & Beijing",
        "version": "Café Experience",
        "location": "Shanghai & Beijing",
        "year": "2024",
        "theme": "Amuseables Food & Drink",
        "url": f"{STORE_URL}/jellycat-cafe-experience-shanghai/",
    },
    {
        "id": "general-store-selfridges",
        "label": "General Stores · Selfridges",
        "version": "Selfridges General Store",
        "location": "Selfridges Birmingham & Manchester",
        "year": "2025",
        "theme": "Amuseables Food & Drink",
        "url": f"{STORE_URL}/jellycat-general-store-in-birmingham-manchester/",
    },
]

ALT_NOISE = re.compile(
    r"Click to Visit|Jellycat logo|Jellycat Jack|Purrks|Spring & Summer|"
    r"cave with flashlight|Temporary Closure|activation|straws, napkins|"
    r"Jellycat Diner|Jellycat Patisserie|Jellycat Cafe|Jellycat Fish|"
    r"Jellycat General|selfridges birmingham|store birmingham|"
    r"store manchester|manchester trafford|Beijing [Cc]afe|Shanghai [Cc]afe|"
    r"SH cafe|Jellycat SH|Category$",
    re.I,
)

GROUP_PHOTO = re.compile(
    r"\band\b.+\b(dancing|posing|together)\b|"
    r"\bBashful Bunny and\b|"
    r"\bPeanut dancing\b|"
    r"\band Chip Seagul",
    re.I,
)

PRODUCT_NAME = re.compile(
    r"(?<![A-Za-z])("
    r"Amuseables?\s+[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÇ][\w'.-]*(?:\s+(?:[&]|and|[A-ZÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÇ0-9][\w'.-]*)){0,5}"
    r"|Lily Fish"
    r"|Cosy Chips"
    r"|Dot\s*(?:&|and)\s*Peg(?:gy)?\s+Mushy\s+Peas"
    r"|Charlie Chip"
    r"|Clemont Lemon"
    r"|Vinny Vinegar"
    r"|Salty Steve"
    r"|Onnie Pickled Onion"
    r"|Michelle Mussel"
    r"|Leicester Pigeon"
    r"|Strutton Pigeon"
    r"|Bubbeca Milkshake"
    r"|Oatus Bear"
    r"|Crember Cheesecake"
    r"|Leola Bear with Strawberr(?:y|ies)\s+Cake"
    r"|Bartholomew Bear(?:\s+with)?\s+(?:a\s+)?Magnolia\s+Cupcake"
    r"|Thistlepop Blossom Luxe Bunny"
    r"|Sip\s*(?:&|and)\s*Slurp Teacups"
    r")(?![A-Za-z])",
    re.U,
)

NAME_JUNK = re.compile(
    r"\b(View All|Enter Your|Accessories|Birthday Gifts|Personalised|Objects|Plants|"
    r"Sports|Gifts|Bags|Explore|Discover|Shop|Menu|Soft Toys)\b|"
    r"Amuseables\s+Amuseables|"
    r"Amuseables\s+(?:Food|Objects|Plants|Sports)\b",
    re.I,
)

MAX_NAME_LEN = 72

# Experience pages sometimes use a short label for an already-online product.
ONLINE_NAME_ALIASES = {
    "pizza": {"slice of pizza", "amuseables slice of pizza"},
    "amuseables pizza": {"slice of pizza", "amuseables slice of pizza"},
}



class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript"}:
            self._skip += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript"} and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if self._skip:
            return
        t = data.strip()
        if t:
            self.parts.append(t)


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-GB,en;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", "replace")


def slug(text: str) -> str:
    s = text.casefold()
    s = s.replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "exclusive"


def norm_name(text: str) -> str:
    s = html_lib.unescape(text or "")
    s = s.replace("\u200b", "").replace("’", "'").replace("´", "'")
    s = s.casefold()
    s = re.sub(r"^jellycat\s+", "", s)
    s = re.sub(r"^amuseables?\s+", "", s)
    s = s.replace("&", "and").replace(".", " ")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def clean_display_name(text: str) -> str:
    s = html_lib.unescape(text or "")
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"^Jellycat\s+", "", s, flags=re.I)
    s = s.replace("Cheescake", "Cheesecake")
    s = re.sub(r"\bSeagul\b", "Seagull", s, flags=re.I)
    s = s.replace("Dot & Peg Mushy Peas", "Dot and Peggy Mushy Peas")
    s = s.replace("Dot and Peg Mushy Peas", "Dot and Peggy Mushy Peas")
    # Prefer full Amuseables names for food cast
    if re.match(
        r"^(Cosy Chips|Charlie Chip|Clemont Lemon|Vinny Vinegar|Salty Steve|"
        r"Onnie Pickled Onion|Michelle Mussel|Fish Pie|Jesse Can of Pop|"
        r"Sausage|Crember Cheesecake|Nibbles Chip Cookie)$",
        s,
        re.I,
    ):
        s = f"Amuseables {s}"
    if s.lower().startswith("amuseable ") and not s.lower().startswith("amuseables "):
        s = "Amuseables " + s[10:]
    return s.strip()


def short_name(full_name: str) -> str:
    s = re.sub(r"^Amuseables\s+", "", full_name, flags=re.I).strip()
    return s or full_name


def infer_theme(full_name: str, default: str) -> str:
    n = full_name.casefold()
    if "bag charm" in n:
        return "Bag Charms"
    if "bunny" in n or "bashful" in n:
        return "Bashful Bunny"
    if "bartholomew" in n or "leola" in n or "oatus" in n:
        return "Bartholomew Bear & Friends" if "bartholomew" in n or "leola" in n else "Bears"
    if "pigeon" in n or "seagull" in n:
        return "Characters"
    if n.startswith("amuseables") or any(
        k in n
        for k in (
            "fish",
            "chips",
            "mushy",
            "lemon",
            "vinegar",
            "sausage",
            "pie",
            "pop",
            "pancake",
            "waffle",
            "burger",
            "pizza",
            "cookie",
            "milkshake",
            "latte",
            "teapot",
            "teacup",
            "cake",
            "macaron",
            "brioche",
            "tarte",
            "pickle",
        )
    ):
        return "Amuseables Food & Drink"
    return default


def extract_img_alts(raw: str) -> list[tuple[str, str]]:
    tags = re.findall(r"<img\b[^>]*>", raw, re.I)
    out: list[tuple[str, str]] = []
    for tag in tags:
        alt_m = re.search(r'\balt="([^"]*)"', tag, re.I)
        src_m = re.search(r'\bsrc="([^"]+)"', tag, re.I)
        if not alt_m or not src_m:
            continue
        alt = html_lib.unescape(alt_m.group(1))
        alt = re.sub(r"\s+", " ", alt).strip()
        src = html_lib.unescape(src_m.group(1)).strip()
        if alt and src:
            out.append((alt, src))
    return out


def extract_text(raw: str) -> str:
    parser = TextExtractor()
    try:
        parser.feed(raw)
    except Exception:  # noqa: BLE001
        pass
    return " ".join(parser.parts)


def split_compound_alt(alt: str) -> list[str]:
    """Turn lifestyle captions into zero or more product names."""
    alt = re.sub(r"\s+", " ", alt).strip()
    if not alt or ALT_NOISE.search(alt):
        return []
    if GROUP_PHOTO.search(alt):
        # Keep the known exclusive when we can isolate it
        if re.search(r"Bubbeca Milkshake", alt, re.I):
            return ["Bubbeca Milkshake"]
        if re.search(r"Oatus Bear", alt, re.I):
            return ["Oatus Bear"]
        if re.search(r"Crember", alt, re.I):
            return ["Amuseables Crember Cheesecake"]
        return []
    # "Bubbeca Milkshake and Peanut dancing"
    m = re.match(r"^(.+?)\s+and\s+.+$", alt, re.I)
    if m and not re.search(r"\band\b.*\band\b", alt, re.I):
        left = m.group(1).strip()
        if PRODUCT_NAME.search(left) or re.search(
            r"Milkshake|Cookie|Cheesecake|Pigeon|Bear|Bunny|Fish|Chips|Teacup|Latte",
            left,
            re.I,
        ):
            return [left]
    return [alt]


def is_plausible_name(name: str) -> bool:
    if not name or len(name) < 4 or len(name) > MAX_NAME_LEN:
        return False
    if NAME_JUNK.search(name):
        return False
    # Reject glued multi-product captions that escaped splitting
    if len(re.findall(r"\bAmuseables?\b", name, re.I)) > 1:
        return False
    # "Amuseables Sausage Michelle Mussel Onnie..." style concatenations
    if re.search(
        r"\b(?:Sausage|Chips|Fish|Cookie|Cheesecake|Milkshake)\s+[A-Z][a-z]+\s+[A-Z]",
        name,
    ):
        return False
    if name.count(" ") > 8:
        return False
    return True


def names_from_page(raw: str) -> list[tuple[str, str]]:
    """Return (display_name, thumb_url) pairs; thumb may be empty.

    Image alts are the primary signal (clean product labels + CDN art).
    Body-text matches only fill gaps when they look like a single product name.
    """
    found: dict[str, tuple[str, str]] = {}

    for alt, src in extract_img_alts(raw):
        for piece in split_compound_alt(alt):
            name = clean_display_name(piece)
            if not is_plausible_name(name):
                continue
            if not PRODUCT_NAME.search(name) and not re.search(
                r"Amuseables|Fish|Chips|Mushy|Chip|Lemon|Vinegar|Steve|Onion|Mussel|"
                r"Pigeon|Seagull|Milkshake|Cookie|Cheesecake|Pancake|Waffle|Burger|"
                r"Pizza|Latte|Teapot|Teacup|Cake|Macaron|Brioche|Bear",
                name,
                re.I,
            ):
                continue
            key = norm_name(name)
            if not key:
                continue
            prev = found.get(key)
            if not prev or (src and not prev[1]):
                found[key] = (name, src)

    text = extract_text(raw)
    for match in PRODUCT_NAME.finditer(text):
        name = clean_display_name(match.group(1))
        if not is_plausible_name(name):
            continue
        key = norm_name(name)
        if not key or key in found:
            continue
        found[key] = (name, "")

    return list(found.values())


def card_from_hit(exp: dict, full_name: str, thumb: str) -> dict:
    theme = infer_theme(full_name, exp["theme"])
    eid = f"exclusive-{exp['id']}-{slug(full_name)}"
    return {
        "id": eid,
        "fullName": full_name,
        "name": short_name(full_name),
        "theme": theme,
        "catalogue": "Exclusives",
        "year": exp["year"],
        "status": "Live",
        "subBrand": "Amuseables" if theme.startswith("Amuseables") else "",
        "version": exp["version"],
        "type": "Bag Charm" if "bag charm" in full_name.casefold() else "Soft Toy",
        "availability": "Store Exclusive",
        "url": exp["url"],
        "thumb": thumb,
        "full": thumb,
        "blurb": (
            f"{full_name} from the Jellycat {exp['version']} "
            f"({exp['location']}) — store / experience exclusive, not sold on jellycat.com."
        )[:280],
        "categories": ["Exclusives", exp["label"]],
        "source": "jellycat-experience-page",
        "experienceId": exp["id"],
        "experienceLabel": exp["label"],
    }


def load_online_names() -> set[str]:
    path = DATA / "cards.json"
    if not path.exists():
        return set()
    cards = json.loads(path.read_text(encoding="utf-8")).get("cards") or []
    names: set[str] = set()
    for c in cards:
        if str(c.get("id", "")).startswith("exclusive-"):
            continue
        if c.get("catalogue") in {"Exclusives", "Store Exclusive"}:
            continue
        for field in ("fullName", "name"):
            n = norm_name(c.get(field) or "")
            if n:
                names.add(n)
    return names


def is_online(full_name: str, online: set[str]) -> bool:
    key = norm_name(full_name)
    if not key:
        return False
    variants = {
        key,
        norm_name("Amuseables " + full_name),
        norm_name(re.sub(r"(?i)^amuseables?\s+", "", full_name)),
    }
    variants |= ONLINE_NAME_ALIASES.get(key, set())
    return any(v and v in online for v in variants)


def fetch_experience(exp: dict, online: set[str]) -> list[dict]:
    print(f"  {exp['label']}")
    try:
        raw = fetch(exp["url"])
    except urllib.error.HTTPError as e:
        print(f"    HTTP {e.code} — skip")
        return []
    except Exception as e:  # noqa: BLE001
        print(f"    error: {e}")
        return []

    hits = names_from_page(raw)
    cards: list[dict] = []
    skipped_online = 0
    for full_name, thumb in hits:
        if is_online(full_name, online):
            skipped_online += 1
            continue
        card = card_from_hit(exp, full_name, thumb)
        if "bag charm" in full_name.casefold() or (card.get("theme") or "").casefold() == "bag charms":
            continue
        if (card.get("type") or "").casefold() in {"bag charm", "bag"}:
            continue
        cards.append(card)
    print(f"    candidates {len(hits)}, online skips {skipped_online}, kept {len(cards)}")
    time.sleep(0.2)
    return cards


def dedupe(cards: list[dict]) -> list[dict]:
    by_name: dict[str, dict] = {}
    for card in cards:
        key = norm_name(card["fullName"])
        prev = by_name.get(key)
        if not prev:
            by_name[key] = card
            continue
        if card.get("thumb") and not prev.get("thumb"):
            by_name[key] = card

    # Drop truncated names that are strict prefixes of a better row
    # e.g. "Amuseables Jesse Can" vs "Amuseables Jesse Can of Pop"
    keys = list(by_name.keys())
    drop: set[str] = set()
    for a in keys:
        for b in keys:
            if a != b and b.startswith(a + " ") and len(a) >= 8:
                if by_name[a].get("thumb") and not by_name[b].get("thumb"):
                    by_name[b]["thumb"] = by_name[a]["thumb"]
                    by_name[b]["full"] = by_name[a].get("full") or by_name[a]["thumb"]
                drop.add(a)
    for key in drop:
        by_name.pop(key, None)
    return list(by_name.values())


def main() -> None:
    DATA.mkdir(exist_ok=True)
    online = load_online_names()
    print(f"Website catalogue names for skip checks: {len(online)}")
    print("Fetching official Jellycat experience pages…")

    cards: list[dict] = []
    for exp in EXPERIENCES:
        cards.extend(fetch_experience(exp, online))

    cards = dedupe(cards)
    cards.sort(key=lambda c: (c.get("experienceLabel") or "", c.get("fullName") or ""))

    out = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": f"{STORE_URL}/events-experiences/",
        "experiences": [
            {"id": e["id"], "label": e["label"], "url": e["url"]} for e in EXPERIENCES
        ],
        "count": len(cards),
        "cards": cards,
    }
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({out['count']} exclusives)")
    for c in cards:
        img = "img" if c.get("thumb") else "no-img"
        print(f"  [{img}] {c['fullName']} · {c.get('experienceLabel')}")


if __name__ == "__main__":
    main()
