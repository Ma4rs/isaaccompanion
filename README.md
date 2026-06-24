# Isaac Companion

Vanilla JavaScript completion companion for **The Binding of Isaac: Repentance** with local + cloud progress sync.

## Highlights

- **718 collectibles + 188 trinkets** (canonical IDs from PlatinumGod export), including tags and search metadata.
- **Smart search** with weighted ranking (`name > tags > description`), typo tolerance, and DE/EN logical tag synonyms (e.g. `auge`, `fliege`, `feuer`, `dmg up`, `flight`).
- **Progress tracking** for paths, unlocks, challenges, and completion marks.
- **Supabase integration** for auth + cloud save + Steam sync pipeline.
- **PWA support** with offline cache and runtime caching for large image assets.

## Run

Option 1 (no setup):

- Open `index.html` directly.

Option 2 (local server):

```bash
npx serve .
```

## Data Pipeline

All item/trinket data uses **canonical in-game IDs** (matching the wiki, Steam,
and the RebirthItemTracker icon set). Rebuild everything from source with:

```bash
npm run data          # rebuild:data + icons + build:fallback + check:data
```

Or run the steps individually:

```bash
npm run rebuild:data  # parse data/sources/platinumgod.txt -> items/trinkets JSON
npm run icons         # download missing canonical icons
npm run icons:force   # re-download all icons
npm run build:fallback
npm run check:data
```

Scripts:

- `scripts/rebuild-data.mjs`: parses the Platinum God export (`data/sources/platinumgod.txt`)
  into `data/items.fallback.json` + `data/trinkets.json` with canonical IDs,
  effect descriptions, quality, pool, quotes, and derived tags. Duplicate listings
  (e.g. Birthright normal/Tainted) are merged.
- `scripts/data-utils.mjs`: whole-word tag derivation rules (avoids false positives
  like `fire` matching "tears fired").
- `scripts/download-icons.mjs`: fetches icons from Rchardon's maintained
  RebirthItemTracker fork — items via `collectibles_<id>.png`, trinkets via
  `collectibles_<2000+id>.png` — into `icons/<id>.png` and `icons/trinkets/<id>.png`.
- `scripts/build-fallback.js`: generates `data/fallback.js` from JSON sources.
- `scripts/check-data.js`: validates counts, duplicates, required fields, icon availability.

> Icons are bundled locally (no `icon_url` in the data), so collectible images
> stay correct and work offline. The client loads items from Supabase first, then
> falls back to the bundled canonical JSON.

### Updating the cloud database

The hosted app reads items/trinkets from Supabase first. After changing the data,
reseed Supabase so the live app reflects it (requires `SUPABASE_URL` +
`SUPABASE_SERVICE_KEY`):

```bash
node supabase/seed-standalone.js
```

The seed clears `ic_items`/`ic_trinkets` before inserting, so stale rows from the
previous (non-canonical) ID scheme are removed.

## Supabase

Relevant files:

- `supabase/migrations/20260317000001_initial_schema.sql`
- `supabase/seed-standalone.js`
- `supabase/functions/steam-auth/index.ts`
- `supabase/functions/steam-sync/index.ts`

Environment variables (`.env.example`):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (public by design; RLS enforces data access)
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `STEAM_API_KEY`

## Search and Tags

Item/trinket search includes:

- Weighted ranking across name, tags, and description.
- DE/EN synonym expansion.
- Clickable tag chips on the items page.
- Tag display on item detail pages.

## Structure

```text
index.html
app.js
js/
  router.js
  data.js
  search.js
data/
  fallback.js
  items.fallback.json
  trinkets.json
  paths.json
  unlocks.json
  challenges.json
  transformations.json
  steam-achievement-map.json
  sources/
    platinumgod.txt
scripts/
  rebuild-data.mjs
  data-utils.mjs
  download-icons.mjs
  build-fallback.js
  check-data.js
supabase/
  migrations/
  functions/
  seed-standalone.js
```

## Quality Gates

```bash
npm run lint
npm run test
npm run check:data
```
