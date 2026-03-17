# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down:
   - **Project URL** (e.g. `https://xyz.supabase.co`)
   - **Anon (public) key** (from Settings > API)
   - **Service role key** (from Settings > API - keep this secret!)

## 2. Configure the Frontend

Open `supabase.js` and replace the placeholder values:

```javascript
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...YOUR_ANON_KEY';
```

Or set them as global variables before the script loads:

```html
<script>
  window.ISAAC_SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
  window.ISAAC_SUPABASE_ANON_KEY = 'eyJ...YOUR_ANON_KEY';
</script>
```

## 3. Run the Database Migration

Option A - **Supabase Dashboard**:
1. Go to SQL Editor in your Supabase dashboard
2. Paste the contents of `supabase/migrations/20260317000001_initial_schema.sql`
3. Run the query

Option B - **Supabase CLI**:
```bash
npx supabase db push
```

## 4. Seed the Database

```bash
npm install @supabase/supabase-js

SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
SUPABASE_SERVICE_KEY=your-service-role-key \
node supabase/seed.js
```

## 5. Configure Auth

### Email (Magic Link)
1. In Supabase Dashboard > Authentication > Providers
2. Email provider is enabled by default
3. Configure the Site URL under Authentication > URL Configuration:
   - Site URL: `https://your-app-domain.com` (or `http://localhost:8080` for dev)
   - Redirect URLs: add your app URL

### Steam Login
1. Get a Steam Web API Key from [steamcommunity.com/dev](https://steamcommunity.com/dev)
2. Set these environment variables for the Edge Functions:
   - `STEAM_API_KEY` = your Steam API key

## 6. Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets
supabase secrets set STEAM_API_KEY=your-steam-api-key

# Deploy functions
supabase functions deploy steam-auth
supabase functions deploy steam-sync
```

## 7. Populate Steam Achievement Mappings (Optional)

To enable automatic achievement sync, add entries to the `steam_achievement_map` table.
Each entry maps a Steam achievement API name to an in-app progress target.

Example SQL:

```sql
INSERT INTO steam_achievement_map (steam_achievement_name, target_type, target_id, target_value)
VALUES
  ('Challenge_1', 'challenge', 'challenge-1', NULL),
  ('Challenge_2', 'challenge', 'challenge-2', NULL),
  ('Isaac_Kills_Moms_Heart', 'mark', 'isaac', 'Mom''s Heart'),
  ('Isaac_Kills_Isaac', 'mark', 'isaac', 'Isaac');
-- Add more mappings as needed
```

You can find the Steam achievement API names via:
```
https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?appid=250900&key=YOUR_KEY
```

## Architecture Overview

```
Frontend (PWA)
  ├── supabase.js     → Supabase client, data fetch, progress CRUD
  ├── auth-ui.js      → Login/logout UI, Steam button, migration prompt
  └── app.js          → Main app (tries Supabase → API → JSON fallback)

Supabase
  ├── PostgreSQL      → Game data + user progress (RLS protected)
  ├── Auth            → Email magic link + Steam (via Edge Function)
  └── Edge Functions
      ├── steam-auth  → Steam OpenID 2.0 login relay
      └── steam-sync  → Fetch & map Steam achievements to app progress
```
