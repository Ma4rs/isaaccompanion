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

Canonical data sync and consistency checks:

```bash
npm run sync:data -- "<path-to-platinumgod-export.txt>"
npm run build:fallback
npm run check:data
```

Scripts:

- `scripts/sync-platinumgod-data.mjs`: completes collectibles + trinkets and derives tags.
- `scripts/build-fallback.js`: generates `data/fallback.js` from JSON sources.
- `scripts/check-data.js`: validates counts, duplicates, required fields, icon availability.

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
scripts/
  sync-platinumgod-data.mjs
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
