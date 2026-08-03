# JellyNest

A soft little gallery of Jellycat plush — browse by collection, size, or family, save favourites to a wishlist, and peek at what’s coming soon.

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

The catalogue is built from the official [Jellycat US store](https://us.jellycat.com/) GraphQL API into `data/cards.json`.

```powershell
python scripts/refresh_data.py
```

## Coming Soon tab

Sources of truth:
- **Coming Soon / New Arrivals / Back In Stock:** official Jellycat store collections
- **Nest notes:** Jelly Journal when available, otherwise fresh New Arrivals blurbs

Refresh behavior:
- When she opens **Coming Soon**, the app reloads `data/coming-soon.json` and tries a live journal pull
- GitHub Actions also refreshes the snapshot twice a week (Sun/Wed) — or run locally:

```powershell
python scripts/refresh_coming_soon.py
```

Then commit + push, or trigger the **Refresh Coming Soon** workflow from GitHub Actions.

## Wishlist

Saved plush live in the browser on her phone (`localStorage`), so they stay after she closes the tab. Open the **Wishlist** tab to browse them, or tap the heart on any friend / use **Add to wishlist** in the detail view.

Note: clearing site data, switching browsers, or using a different phone starts a fresh list.

## Credit

Fan project. Jellycat and related marks are trademarks of Jellycat Limited. Not affiliated with Jellycat.
