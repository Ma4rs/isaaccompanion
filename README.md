# Isaac Companion

A **vanilla JavaScript** web app and **100% completion guide** for **The Binding of Isaac: Repentance**. No build step or framework required. Installable as a PWA.

## Features

- **600 Items** — Full item database with icons, search, sort (name/quality), filter by pool/quality. Detailed descriptions with stat values and pickup quotes for 336+ items. Notable synergies listed on key items.
- **90 Trinkets** — Searchable trinket reference with quality ratings.
- **12 Paths** — Step-by-step boss path guides with checklist tracking, boss portraits, and progress bars.
- **34 Unlocks** — All characters (17 base + 17 tainted) with unlock steps, portraits, and 408 completion mark rewards.
- **45 Challenges** — Difficulty ratings, accurate descriptions, restrictions, and completion tracking.
- **14 Transformations** — Contributing items with cross-links to item pages.
- **Quick Reference** — Dice rooms (1-6), sacrifice room rewards, donation machine unlocks, crawl spaces.
- **Dashboard** — Live progress tracking across paths, unlocks, and challenges.
- **Global Search** — Search across all sections with highlighted results. Press `/` to focus.
- **Export/Import** — Save and restore your checklist progress as a JSON file.
- **PWA** — Installable on phones, works offline via service worker.
- **Keyboard Shortcuts** — `Escape` to go back, `/` to search.
- **Mobile Friendly** — Hamburger menu, responsive grids, touch-friendly.
- **Isaac Theme** — Parchment/basement aesthetic with warm browns and golden accents.

## Run the app

**Option 1 — Open in browser**
Double-click `index.html`. Uses hash routing (`#/`) so it works from `file://`.

**Option 2 — Local server**
```bash
npx serve .
```

## Project structure

```
index.html              Entry point, nav, global search
app.js                  All application logic (~600 lines)
styles.css              Isaac parchment theme
manifest.json           PWA manifest
sw.js                   Service worker for offline caching
data/
  fallback.js           Inline data for file:// support
  items.fallback.json   600 items with descriptions and synergies
  trinkets.json         90 trinkets
  paths.json            12 path guides
  unlocks.json          34 character unlocks with 408 rewards
  challenges.json       45 challenges
  transformations.json  14 transformations
icons/                  484 local item icon PNGs
portraits/
  characters/           33 character portraits
  bosses/               9 boss portraits
```

Design: dark basement parchment theme with golden accents, pixel font headings, and Isaac-inspired warm color palette.
