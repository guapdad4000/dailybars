-- Daily Raps canonical Replit PostgreSQL schema.
-- This is application data only: Supabase Auth and managed Supabase Storage remain
-- external services. The API is the only application-data access layer.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login TIMESTAMPTZ,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','premium','admin')),
  subscription_status TEXT NOT NULL DEFAULT 'free' CHECK (subscription_status IN ('free','premium','lifetime')),
  subscription_expires_at TIMESTAMPTZ,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0 CHECK (storage_used_bytes >= 0),
  storage_limit_bytes BIGINT NOT NULL DEFAULT 104857600,
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_activity_date DATE,
  total_bars INTEGER NOT NULL DEFAULT 0 CHECK (total_bars >= 0),
  selected_trophies TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_date);

CREATE TABLE IF NOT EXISTS bars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  audio_url TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bars_user_id ON bars(user_id);
CREATE INDEX IF NOT EXISTS idx_bars_username ON bars(username);
CREATE INDEX IF NOT EXISTS idx_bars_created_at ON bars(created_at DESC);

CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  cover_image TEXT,
  beat_url TEXT,
  video_url TEXT,
  studio TEXT NOT NULL DEFAULT '',
  producer TEXT NOT NULL DEFAULT '',
  other_artists TEXT NOT NULL DEFAULT '',
  "key" TEXT NOT NULL DEFAULT '',
  bpm INTEGER,
  username TEXT NOT NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_username TEXT,
  is_collaborative BOOLEAN NOT NULL DEFAULT false,
  collaborator_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_username ON songs(username);
CREATE INDEX IF NOT EXISTS idx_songs_updated_at ON songs(updated_at DESC);

CREATE TABLE IF NOT EXISTS prompts_feelings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), value TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS prompts_settings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), value TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS prompts_objects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), value TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS prompts_smells (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), value TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS prompts_vocab (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), value TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompts_feelings_value ON prompts_feelings(value);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompts_settings_value ON prompts_settings(value);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompts_objects_value ON prompts_objects(value);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompts_smells_value ON prompts_smells(value);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompts_vocab_value ON prompts_vocab(value);

CREATE TABLE IF NOT EXISTS community_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  prompt_text TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Anonymous',
  likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
  submission_type TEXT NOT NULL DEFAULT 'PROMPT' CHECK (submission_type IN ('PROMPT','VERSE')),
  moderation_status TEXT NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible','reported','hidden','removed')),
  reported_count INTEGER NOT NULL DEFAULT 0 CHECK (reported_count >= 0),
  hidden_at TIMESTAMPTZ,
  hidden_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_community_created_at ON community_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_user_id ON community_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_community_moderation ON community_submissions(moderation_status);

CREATE TABLE IF NOT EXISTS community_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES community_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(submission_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_community_upvotes_submission ON community_upvotes(submission_id);
CREATE INDEX IF NOT EXISTS idx_community_upvotes_user ON community_upvotes(user_id);

CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES community_submissions(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'inappropriate',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed','actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(submission_id, reporter_id)
);
CREATE TABLE IF NOT EXISTS community_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_author TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, blocked_author)
);

CREATE TABLE IF NOT EXISTS scratch_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Session',
  beat_url TEXT,
  beat_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scratch_sessions_user ON scratch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_scratch_sessions_created_at ON scratch_sessions(created_at DESC);

CREATE TABLE IF NOT EXISTS scratch_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES scratch_sessions(id) ON DELETE CASCADE,
  layer_number INTEGER NOT NULL,
  audio_url TEXT NOT NULL,
  waveform_data JSONB NOT NULL DEFAULT '[]',
  volume INTEGER NOT NULL DEFAULT 80 CHECK (volume BETWEEN 0 AND 100),
  pan NUMERIC NOT NULL DEFAULT 0,
  muted BOOLEAN NOT NULL DEFAULT false,
  solo BOOLEAN NOT NULL DEFAULT false,
  duration_seconds NUMERIC NOT NULL DEFAULT 0,
  time_shift NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, layer_number)
);
CREATE INDEX IF NOT EXISTS idx_scratch_layers_session ON scratch_layers(session_id);

CREATE TABLE IF NOT EXISTS beats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_filename TEXT,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'audio/mpeg',
  storage_path TEXT NOT NULL,
  public_url TEXT,
  title TEXT,
  artist TEXT,
  album TEXT,
  bpm INTEGER,
  "key" TEXT,
  time_signature TEXT,
  genre TEXT,
  mood TEXT,
  energy_level INTEGER,
  tags TEXT[],
  duration_seconds NUMERIC,
  detected_bpm NUMERIC,
  detected_bpm_confidence NUMERIC,
  detected_key TEXT,
  detected_key_confidence NUMERIC,
  detected_energy NUMERIC,
  detected_danceability NUMERIC,
  waveform_data JSONB,
  frequency_data JSONB,
  embedded_title TEXT,
  embedded_artist TEXT,
  embedded_album TEXT,
  embedded_year INTEGER,
  embedded_genre TEXT,
  cover_art_url TEXT,
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  analysis_requested_at TIMESTAMPTZ,
  analysis_completed_at TIMESTAMPTZ,
  analysis_error TEXT,
  play_count INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_beats_user_id ON beats(user_id);
CREATE INDEX IF NOT EXISTS idx_beats_song_id ON beats(song_id);

CREATE TABLE IF NOT EXISTS beat_analysis_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id UUID REFERENCES beats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  priority INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS song_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  username TEXT,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('viewer','editor','owner')),
  invite_token TEXT UNIQUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(song_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_song_collaborators_song ON song_collaborators(song_id);
CREATE INDEX IF NOT EXISTS idx_song_collaborators_user ON song_collaborators(user_id);

CREATE TABLE IF NOT EXISTS trophies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'Award',
  description TEXT,
  xp_cost INTEGER NOT NULL DEFAULT 100 CHECK (xp_cost >= 0),
  color TEXT NOT NULL DEFAULT '#FACC15',
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'misc',
  trophy_type TEXT NOT NULL DEFAULT 'store' CHECK (trophy_type IN ('store','achievement')),
  requirement_type TEXT,
  requirement_value INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trophies_type ON trophies(trophy_type);

CREATE TABLE IF NOT EXISTS user_trophies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trophy_id UUID NOT NULL REFERENCES trophies(id) ON DELETE CASCADE,
  earned_via TEXT NOT NULL DEFAULT 'purchase' CHECK (earned_via IN ('purchase','achievement')),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, trophy_id)
);
CREATE INDEX IF NOT EXISTS idx_user_trophies_user ON user_trophies(user_id);

CREATE TABLE IF NOT EXISTS xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount <> 0),
  reason TEXT NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_key)
);
CREATE INDEX IF NOT EXISTS idx_xp_ledger_user_created ON xp_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS revenuecat_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username TEXT,
  app_user_id TEXT UNIQUE,
  entitlement_pro_active BOOLEAN NOT NULL DEFAULT false,
  entitlements JSONB NOT NULL DEFAULT '{}',
  customer_info JSONB,
  environment TEXT,
  last_synced TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS premium_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username TEXT,
  ai_uses INTEGER NOT NULL DEFAULT 0,
  last_ai_use TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Seed only the prompt vocabulary; reruns never duplicate values.
INSERT INTO prompts_feelings(value) VALUES
  ('Confidence'),('Hunger'),('Betrayal'),('Loyalty'),('Paranoia'),('Ambition'),('Grief'),('Revenge'),('Love'),('Regret'),('Pride'),('Jealousy'),('Freedom'),('Loneliness'),('Triumph')
ON CONFLICT DO NOTHING;
INSERT INTO prompts_settings(value) VALUES
  ('Oakland'),('The trap house'),('A private jet'),('Your grandmother''s kitchen'),('A funeral'),('The studio at 3AM'),('A sold-out arena'),('County jail'),('The barbershop'),('A casino floor'),('The corner store'),('A rooftop downtown')
ON CONFLICT DO NOTHING;
INSERT INTO prompts_objects(value) VALUES
  ('A gold chain'),('Your mother''s Bible'),('A loaded pistol'),('A cracked iPhone'),('A stack of hundreds'),('An eviction notice'),('A voicemail you never deleted'),('A burner phone'),('A diamond ring'),('Your first platinum plaque')
ON CONFLICT DO NOTHING;
INSERT INTO prompts_smells(value) VALUES
  ('Burnt rubber'),('Your ex''s perfume'),('Fresh hundreds'),('Gun smoke'),('Mama''s cooking'),('New car leather'),('Rain on hot concrete'),('Champagne'),('Studio session vibes'),('Prison laundry')
ON CONFLICT DO NOTHING;
INSERT INTO prompts_vocab(value) VALUES
  ('Algorithm'),('Currency'),('Elevated'),('Blueprint'),('Frequency'),('Residue'),('Caliber'),('Testament'),('Velocity'),('Perimeter'),('Leverage'),('Threshold'),('Apparatus'),('Parallel'),('Syndicate'),('Dividend'),('Manuscript'),('Catalyst'),('Silhouette'),('Reservoir')
ON CONFLICT DO NOTHING;
