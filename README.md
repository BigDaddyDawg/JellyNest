# JellyNest

A soft little gallery of Jellycat plush — browse by theme, catalogue, year, or status; track what she owns and wants; and peek at what’s coming soon.

## Live site

After Pages is enabled: `https://bigdaddydawg.github.io/JellyNest/`

## Local

Open `index.html` via a local static server (needed so `data/cards.json` can load):

```powershell
python -m http.server 8080
```

Then visit http://localhost:8080

## Install on phone (PWA)

Open the live site in Safari/Chrome, then **Add to Home Screen**. It installs as a standalone app with offline caching via the service worker.

## Data

The catalogue is built from the official [Jellycat US store](https://us.jellycat.com/) GraphQL API into `data/cards.json` — **every** plush currently on the store, including retired and coming soon.

Each friend is tagged with:
- **Theme** — product style / range (Bashful Bunny, Amuseables Food & Drink, …)
- **Catalogue** — Main, Christmas, Easter, Halloween, etc.
- **Year** — from the official release date
- **Status** — Coming Soon, Live, or Retired

**Available** and **Pre-order** stock labels in the detail view link through to the matching product on the UK store ([jellycat.com](https://jellycat.com/)).

## Leaks

Unofficial spoilers (for example Christmas 2026) live under **Coming Soon → Leaks & whispers**. They’re curated in `data/leaks-curated.json` and merged into `coming-soon.json` on refresh — edit that file to add or correct spoilers.

```powershell
python scripts/refresh_data.py
```

## Coming Soon tab

Sources of truth:
- **Coming Soon / New Arrivals / Back In Stock:** official Jellycat store collections
- **Nest notes:** Jelly Journal when available, otherwise fresh New Arrivals blurbs

Refresh behavior:
- When she opens **Coming Soon**, the app reloads `data/coming-soon.json` and tries a live journal pull
- GitHub Actions also refreshes the snapshot twice a week (Sun/Wed), plus a **full catalogue refresh every Monday** — or run locally:

```powershell
python scripts/refresh_coming_soon.py
```

Then commit + push, or trigger the **Refresh Coming Soon** workflow from GitHub Actions.

## Wishlist & Owned

Both lists sync to the **Family Vault** (shared Supabase hub) across family phones, with a local cache for offline use.

- **Owned** — tap the check on any friend (or **Mark as owned** in the detail view). Marking something owned also clears it from the wishlist.
- **Wishlist** — tap the heart on any friend (or **Add to wishlist** in the detail view).

## Credit

Fan project. Jellycat and related marks are trademarks of Jellycat Limited. Not affiliated with Jellycat.
