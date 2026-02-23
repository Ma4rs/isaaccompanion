## [Play it live](https://ma4rs.github.io/isaaccompanion/)
# Isaac Companion

A **vanilla JavaScript** web app and **100% completion guide** for **The Binding of Isaac: Repentance** — browse all 577 items, follow path guides, unlock all 34 characters, track all 45 challenges, and reference all 14 transformations. No build step or framework required.

## Run the app

**Option 1 — Open in browser**
Double-click `index.html` or open it from your browser (File > Open). Uses hash routing (`#/`, `#/items`, etc.) so it works from `file://`.

**Option 2 — Local server (recommended for items API)**
Serve the folder with any static server:

```bash
npx serve .
# or: python -m http.server 8000
```

Items will load from the API when possible, with a fallback to local data.

## Project structure

```
index.html              Nav + global search + main content area
styles.css              All styles (dark + neon theme, skeletons, responsive)
app.js                  Router, state, API, views, event delegation, global search
data/
  fallback.js           Inline fallback data (loaded as script for file:// support)
  items.fallback.json   577 unique items (full Repentance coverage)
  paths.json            12 step-by-step path guides
  unlocks.json          34 character unlock guides with completion mark rewards
  challenges.json       All 45 challenges with rewards and difficulty
  transformations.json  14 transformations with contributing items
```

## Features

- **Dashboard** — Home page shows live progress across paths, unlocks, and challenges with an overall completion percentage.
- **Items** — All 577 Repentance items with search, filter by pool/quality, detail view with icons. Shows which transformations each item contributes to. Tries the isaac-fastapi API first, falls back to local JSON.
- **Paths** — Step-by-step checklists for Beast, Mega Satan, Mother, Hush, Delirium, and more. Progress persisted in localStorage.
- **Unlocks** — Guides for unlocking all 34 characters (17 base + 17 tainted). Each character page shows completion mark rewards (what you earn by beating each boss with that character).
- **Challenges** — All 45 challenges with character, goal, restrictions, difficulty rating, and unlock rewards. Track completion.
- **Transformations** — All 14 transformations with contributing items, required count, and cross-links to item pages.
- **Global search** — Search bar in the nav that searches across all sections. Press `/` to focus.
- **Accessibility** — `aria-label`, `role`, `focus-visible` outlines, screen-reader-friendly detail pages.
- **Responsive** — Adapts to mobile and small screens.

Design: dark, Isaac-inspired theme with neon accents and subtle animations.
