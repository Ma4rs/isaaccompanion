-- =============================================================
-- Isaac Companion: Initial Schema (all tables prefixed ic_)
-- =============================================================

-- Game data tables (read-only, public access)

CREATE TABLE ic_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  quality INTEGER,
  pool TEXT,
  quote TEXT,
  tags JSONB DEFAULT '[]',
  type TEXT,
  synergies JSONB DEFAULT '[]'
);

CREATE TABLE ic_trinkets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  quality INTEGER
);

CREATE TABLE ic_paths (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE ic_path_steps (
  id SERIAL PRIMARY KEY,
  path_id TEXT NOT NULL REFERENCES ic_paths(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(path_id, step_id)
);

CREATE TABLE ic_unlocks (
  id TEXT PRIMARY KEY,
  character_name TEXT NOT NULL,
  target_unlock TEXT NOT NULL
);

CREATE TABLE ic_unlock_steps (
  id SERIAL PRIMARY KEY,
  unlock_id TEXT NOT NULL REFERENCES ic_unlocks(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(unlock_id, step_id)
);

CREATE TABLE ic_unlock_rewards (
  id SERIAL PRIMARY KEY,
  unlock_id TEXT NOT NULL REFERENCES ic_unlocks(id) ON DELETE CASCADE,
  boss TEXT NOT NULL,
  unlock TEXT NOT NULL
);

CREATE TABLE ic_challenges (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  character TEXT,
  goal TEXT,
  unlock TEXT,
  restrictions JSONB DEFAULT '[]',
  difficulty TEXT
);

CREATE TABLE ic_transformations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  requires INTEGER NOT NULL DEFAULT 3
);

CREATE TABLE ic_transformation_items (
  id SERIAL PRIMARY KEY,
  transformation_id TEXT NOT NULL REFERENCES ic_transformations(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL
);

-- Indexes for game data
CREATE INDEX idx_ic_items_pool ON ic_items(pool);
CREATE INDEX idx_ic_items_quality ON ic_items(quality);
CREATE INDEX idx_ic_path_steps_path ON ic_path_steps(path_id);
CREATE INDEX idx_ic_unlock_steps_unlock ON ic_unlock_steps(unlock_id);
CREATE INDEX idx_ic_unlock_rewards_unlock ON ic_unlock_rewards(unlock_id);
CREATE INDEX idx_ic_transformation_items_tid ON ic_transformation_items(transformation_id);
CREATE INDEX idx_ic_challenges_difficulty ON ic_challenges(difficulty);

-- =============================================================
-- User data tables (RLS protected)
-- =============================================================

CREATE TABLE ic_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  steam_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ic_user_path_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_id TEXT NOT NULL,
  completed_steps JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, path_id)
);

CREATE TABLE ic_user_unlock_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unlock_id TEXT NOT NULL,
  completed_steps JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, unlock_id)
);

CREATE TABLE ic_user_challenge_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);

CREATE TABLE ic_user_completion_marks (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL,
  completed_bosses JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, character_id)
);

CREATE INDEX idx_ic_user_path_progress_user ON ic_user_path_progress(user_id);
CREATE INDEX idx_ic_user_unlock_progress_user ON ic_user_unlock_progress(user_id);
CREATE INDEX idx_ic_user_challenge_progress_user ON ic_user_challenge_progress(user_id);
CREATE INDEX idx_ic_user_completion_marks_user ON ic_user_completion_marks(user_id);

-- =============================================================
-- Row Level Security
-- =============================================================

ALTER TABLE ic_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_trinkets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_path_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_unlock_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_unlock_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_transformation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_user_path_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_user_unlock_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ic_user_completion_marks ENABLE ROW LEVEL SECURITY;

-- Game data: everyone can read
CREATE POLICY "ic_public_read" ON ic_items FOR SELECT USING (true);
CREATE POLICY "ic_public_read" ON ic_trinkets FOR SELECT USING (true);
CREATE POLICY "ic_public_read" ON ic_paths FOR SELECT USING (true);
CREATE POLICY "ic_public_read" ON ic_path_steps FOR SELECT USING (true);
CREATE POLICY "ic_public_read" ON ic_unlocks FOR SELECT USING (true);
CREATE POLICY "ic_public_read" ON ic_unlock_steps FOR SELECT USING (true);
CREATE POLICY "ic_public_read" ON ic_unlock_rewards FOR SELECT USING (true);
CREATE POLICY "ic_public_read" ON ic_challenges FOR SELECT USING (true);
CREATE POLICY "ic_public_read" ON ic_transformations FOR SELECT USING (true);
CREATE POLICY "ic_public_read" ON ic_transformation_items FOR SELECT USING (true);

-- Profiles: users can read and manage their own
CREATE POLICY "ic_own_select" ON ic_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "ic_own_insert" ON ic_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "ic_own_update" ON ic_profiles FOR UPDATE USING (auth.uid() = id);

-- User progress: users can manage their own data
CREATE POLICY "ic_own_select" ON ic_user_path_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ic_own_insert" ON ic_user_path_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ic_own_update" ON ic_user_path_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ic_own_delete" ON ic_user_path_progress FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "ic_own_select" ON ic_user_unlock_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ic_own_insert" ON ic_user_unlock_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ic_own_update" ON ic_user_unlock_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ic_own_delete" ON ic_user_unlock_progress FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "ic_own_select" ON ic_user_challenge_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ic_own_insert" ON ic_user_challenge_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ic_own_update" ON ic_user_challenge_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ic_own_delete" ON ic_user_challenge_progress FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "ic_own_select" ON ic_user_completion_marks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ic_own_insert" ON ic_user_completion_marks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ic_own_update" ON ic_user_completion_marks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ic_own_delete" ON ic_user_completion_marks FOR DELETE USING (auth.uid() = user_id);

-- =============================================================
-- Auto-create profile on user signup
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_ic_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.ic_profiles (id, display_name, steam_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'steam_id'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_ic_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_ic_new_user();

-- =============================================================
-- Steam achievement mapping table
-- =============================================================

CREATE TABLE ic_steam_achievement_map (
  id SERIAL PRIMARY KEY,
  steam_achievement_name TEXT NOT NULL UNIQUE,
  target_type TEXT NOT NULL CHECK (target_type IN ('challenge', 'mark')),
  target_id TEXT NOT NULL,
  target_value TEXT
);

ALTER TABLE ic_steam_achievement_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ic_public_read" ON ic_steam_achievement_map FOR SELECT USING (true);
