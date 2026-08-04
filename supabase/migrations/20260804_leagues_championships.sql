-- ============================================================================
-- LEAGUES & CHAMPIONSHIPS SYSTEM
-- Complete league creation, bracket management, RPG championships, Battle Royale
-- ============================================================================

-- League types
do $$ begin
  create type public.league_format as enum (
    'round_robin',      -- All play all
    'single_elimination', -- Bracket knockout
    'double_elimination', -- Double bracket
    'swiss',            -- Swiss pairing system
    'battle_royale',    -- Last standing wins
    'rpg_championship'  -- RPG-style bracket with classes
  );
  create type public.league_status as enum ('draft', 'registration', 'active', 'paused', 'completed');
  create type public.match_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled', 'bye');
  create type public.game_category as enum ('strategy', 'arcade', 'puzzle', 'reflex', 'quiz', 'luck', 'social', 'words', 'cards', 'rpg', 'battle_royale', 'typing', 'action');
  exception when duplicate_object then null;
end $$;

-- Main leagues table
CREATE TABLE IF NOT EXISTS public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  business_id UUID REFERENCES public.profiles(user_id),
  
  -- Basic info
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  cover_image_url TEXT,
  logo_url TEXT,
  
  -- League config
  format league_format NOT NULL DEFAULT 'single_elimination',
  status league_status NOT NULL DEFAULT 'draft',
  game_type TEXT NOT NULL, -- game id from ALL_GAMES
  game_category game_category NOT NULL DEFAULT 'strategy',
  
  -- Registration
  max_participants INTEGER DEFAULT 16,
  min_participants INTEGER DEFAULT 2,
  current_participants INTEGER DEFAULT 0,
  registration_opens_at TIMESTAMPTZ,
  registration_closes_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  
  -- Match config
  wins_needed INTEGER DEFAULT 1, -- Best of N (1 = single match, 3 = best of 3)
  points_per_win INTEGER DEFAULT 3,
  points_per_draw INTEGER DEFAULT 1,
  points_per_loss INTEGER DEFAULT 0,
  
  -- Prize config
  prize_pool DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'AOA',
  prize_distribution JSONB DEFAULT '[50, 30, 20]', -- % for 1st, 2nd, 3rd
  prize_description TEXT,
  
  -- RPG specific
  rpg_config JSONB DEFAULT '{}', -- {classes_enabled, max_level, banned_abilities}
  battle_royale_config JSONB DEFAULT '{}', -- {map_size, shrink_speed, max_bots, weapon_types}
  
  -- Visual
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#ec4899',
  accent_color TEXT DEFAULT '#f59e0b',
  
  -- Visibility
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  
  -- Settings
  allow_spectating BOOLEAN DEFAULT true,
  auto_start BOOLEAN DEFAULT false,
  tiebreaker TEXT DEFAULT 'points', -- points, head_to_head, score_diff
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- League participants
CREATE TABLE IF NOT EXISTS public.league_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  display_name TEXT,
  avatar_url TEXT,
  team_name TEXT,
  
  -- Stats
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  score_for INTEGER DEFAULT 0, -- Total score scored
  score_against INTEGER DEFAULT 0, -- Total score against
  
  -- RPG stats
  rpg_class TEXT, -- guerreiro, mago, arqueiro, ladino
  rpg_level INTEGER DEFAULT 1,
  rpg_xp INTEGER DEFAULT 0,
  rpg_kills INTEGER DEFAULT 0,
  rpg_deaths INTEGER DEFAULT 0,
  
  -- Battle Royale stats
  br_wins INTEGER DEFAULT 0,
  br_avg_placement DECIMAL(5,2) DEFAULT 0,
  br_total_kills INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'registered', -- registered, active, eliminated, winner, runner_up
  seed INTEGER, -- Tournament seed for bracket placement
  bracket_position INTEGER, -- Position in bracket
  
  joined_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(league_id, user_id)
);

-- League matches (brackets / rounds)
CREATE TABLE IF NOT EXISTS public.league_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  
  -- Round/bracket info
  round_number INTEGER NOT NULL DEFAULT 1,
  match_number INTEGER NOT NULL DEFAULT 1,
  bracket TEXT DEFAULT 'winners', -- winners, losers, grand_final
  
  -- Players
  player1_id UUID REFERENCES auth.users(id),
  player2_id UUID REFERENCES auth.users(id),
  player1_display TEXT,
  player2_display TEXT,
  
  -- Scores
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  
  -- Result
  winner_id UUID REFERENCES auth.users(id),
  loser_id UUID REFERENCES auth.users(id),
  is_draw BOOLEAN DEFAULT false,
  
  -- Status
  status match_status NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Game session link
  game_session_id UUID, -- Link to game_sessions table
  live_code TEXT,
  
  -- Next match (for bracket progression)
  next_match_id UUID REFERENCES public.league_matches(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- Replay data, chat logs, etc.
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- League chat / activity feed
CREATE TABLE IF NOT EXISTS public.league_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  type TEXT NOT NULL, -- match_result, join, trash_talk, announcement, system
  title TEXT,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- League invitations
CREATE TABLE IF NOT EXISTS public.league_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id),
  invitee_id UUID REFERENCES auth.users(id),
  
  email TEXT, -- For non-registered users
  code TEXT UNIQUE, -- Invite code for sharing
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'pending', -- pending, accepted, expired, revoked
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_leagues_status ON public.leagues(status);
CREATE INDEX IF NOT EXISTS idx_leagues_creator ON public.leagues(creator_id);
CREATE INDEX IF NOT EXISTS idx_leagues_game_type ON public.leagues(game_type);
CREATE INDEX IF NOT EXISTS idx_leagues_public ON public.leagues(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_leagues_featured ON public.leagues(is_featured) WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_league_participants_league ON public.league_participants(league_id);
CREATE INDEX IF NOT EXISTS idx_league_participants_user ON public.league_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_league_participants_status ON public.league_participants(league_id, status);

CREATE INDEX IF NOT EXISTS idx_league_matches_league ON public.league_matches(league_id);
CREATE INDEX IF NOT EXISTS idx_league_matches_round ON public.league_matches(league_id, round_number);
CREATE INDEX IF NOT EXISTS idx_league_matches_players ON public.league_matches(league_id, player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_league_matches_status ON public.league_matches(league_id, status);
CREATE INDEX IF NOT EXISTS idx_league_matches_next ON public.league_matches(next_match_id);

CREATE INDEX IF NOT EXISTS idx_league_activity_league ON public.league_activity(league_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_league_invitations_code ON public.league_invitations(code);
CREATE INDEX IF NOT EXISTS idx_league_invitations_league ON public.league_invitations(league_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_invitations ENABLE ROW LEVEL SECURITY;

-- Leagues: anyone can read public leagues, only creator/business can modify
CREATE POLICY "Leagues: public read" ON public.leagues FOR SELECT USING (is_public = true OR creator_id = auth.uid() OR business_id = auth.uid());
CREATE POLICY "Leagues: creator insert" ON public.leagues FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Leagues: creator update" ON public.leagues FOR UPDATE USING (creator_id = auth.uid() OR business_id = auth.uid());
CREATE POLICY "Leagues: creator delete" ON public.leagues FOR DELETE USING (creator_id = auth.uid());

-- Participants: anyone in league can read, users can join, only creator can modify
CREATE POLICY "Participants: league read" ON public.league_participants FOR SELECT USING (
  league_id IN (SELECT id FROM public.leagues WHERE is_public = true OR creator_id = auth.uid())
  OR user_id = auth.uid()
);
CREATE POLICY "Participants: user join" ON public.league_participants FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Participants: self update" ON public.league_participants FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Participants: creator update" ON public.league_participants FOR UPDATE USING (
  league_id IN (SELECT id FROM public.leagues WHERE creator_id = auth.uid() OR business_id = auth.uid())
);
CREATE POLICY "Participants: self delete" ON public.league_participants FOR DELETE USING (user_id = auth.uid());

-- Matches: visible to league participants
CREATE POLICY "Matches: league read" ON public.league_matches FOR SELECT USING (
  league_id IN (SELECT id FROM public.leagues WHERE is_public = true OR creator_id = auth.uid())
);
CREATE POLICY "Matches: creator manage" ON public.league_matches FOR INSERT WITH CHECK (
  league_id IN (SELECT id FROM public.leagues WHERE creator_id = auth.uid() OR business_id = auth.uid())
);
CREATE POLICY "Matches: creator update" ON public.league_matches FOR UPDATE USING (
  league_id IN (SELECT id FROM public.leagues WHERE creator_id = auth.uid() OR business_id = auth.uid())
);

-- Activity: visible to league members
CREATE POLICY "Activity: league read" ON public.league_activity FOR SELECT USING (
  league_id IN (SELECT id FROM public.leagues WHERE is_public = true OR creator_id = auth.uid())
);
CREATE POLICY "Activity: member insert" ON public.league_activity FOR INSERT WITH CHECK (
  league_id IN (SELECT id FROM public.leagues WHERE is_public = true OR creator_id = auth.uid())
  OR user_id = auth.uid()
);

-- Invitations: creator can manage, invitee can read
CREATE POLICY "Invitations: read own" ON public.league_invitations FOR SELECT USING (
  inviter_id = auth.uid() OR invitee_id = auth.uid()
);
CREATE POLICY "Invitations: creator manage" ON public.league_invitations FOR ALL USING (inviter_id = auth.uid());

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate slug from league name
CREATE OR REPLACE FUNCTION public.generate_league_slug(name TEXT)
RETURNS TEXT AS $$
  SELECT LOWER(REGEXP_REPLACE(
    COALESCE(name, 'liga') || '-' || TO_CHAR(now(), 'YYYYMMDD-HH24MISS'),
    '[^a-z0-9]+', '-', 'gi'
  ));
$$ LANGUAGE sql IMMUTABLE;

-- Auto-increment participant count
CREATE OR REPLACE FUNCTION public.increment_league_participants()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.leagues SET current_participants = current_participants + 1, updated_at = now() WHERE id = NEW.league_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.decrement_league_participants()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.leagues SET current_participants = GREATEST(current_participants - 1, 0), updated_at = now() WHERE id = OLD.league_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inc_participants ON public.league_participants;
DROP TRIGGER IF EXISTS trg_dec_participants ON public.league_participants;
CREATE TRIGGER trg_inc_participants AFTER INSERT ON public.league_participants FOR EACH ROW EXECUTE FUNCTION public.increment_league_participants();
CREATE TRIGGER trg_dec_participants AFTER DELETE ON public.league_participants FOR EACH ROW EXECUTE FUNCTION public.decrement_league_participants();

-- Update participant stats after match completes
CREATE OR REPLACE FUNCTION public.update_participant_stats()
RETURNS TRIGGER AS $$
DECLARE
  p1_rec RECORD;
  p2_rec RECORD;
BEGIN
  IF NEW.status != 'completed' THEN RETURN NEW; END IF;

  -- Update player 1 stats
  IF NEW.player1_id IS NOT NULL THEN
    SELECT * INTO p1_rec FROM public.league_participants WHERE league_id = NEW.league_id AND user_id = NEW.player1_id;
    IF p1_rec.id IS NOT NULL THEN
      UPDATE public.league_participants SET
        score_for = score_for + COALESCE(NEW.player1_score, 0),
        score_against = score_against + COALESCE(NEW.player2_score, 0),
        wins = wins + CASE WHEN NEW.winner_id = NEW.player1_id THEN 1 ELSE 0 END,
        losses = losses + CASE WHEN NEW.winner_id != NEW.player1_id AND NOT NEW.is_draw THEN 1 ELSE 0 END,
        draws = draws + CASE WHEN NEW.is_draw THEN 1 ELSE 0 END,
        points = points + CASE
          WHEN NEW.winner_id = NEW.player1_id THEN (SELECT points_per_win FROM public.leagues WHERE id = NEW.league_id)
          WHEN NEW.is_draw THEN (SELECT points_per_draw FROM public.leagues WHERE id = NEW.league_id)
          ELSE (SELECT points_per_loss FROM public.leagues WHERE id = NEW.league_id)
        END,
        rpg_kills = rpg_kills + COALESCE((NEW.metadata->>'p1_kills')::int, 0),
        rpg_deaths = rpg_deaths + COALESCE((NEW.metadata->>'p1_deaths')::int, 0),
        br_total_kills = br_total_kills + COALESCE((NEW.metadata->>'p1_kills')::int, 0)
      WHERE id = p1_rec.id;
    END IF;
  END IF;

  -- Update player 2 stats
  IF NEW.player2_id IS NOT NULL THEN
    SELECT * INTO p2_rec FROM public.league_participants WHERE league_id = NEW.league_id AND user_id = NEW.player2_id;
    IF p2_rec.id IS NOT NULL THEN
      UPDATE public.league_participants SET
        score_for = score_for + COALESCE(NEW.player2_score, 0),
        score_against = score_against + COALESCE(NEW.player1_score, 0),
        wins = wins + CASE WHEN NEW.winner_id = NEW.player2_id THEN 1 ELSE 0 END,
        losses = losses + CASE WHEN NEW.winner_id != NEW.player2_id AND NOT NEW.is_draw THEN 1 ELSE 0 END,
        draws = draws + CASE WHEN NEW.is_draw THEN 1 ELSE 0 END,
        points = points + CASE
          WHEN NEW.winner_id = NEW.player2_id THEN (SELECT points_per_win FROM public.leagues WHERE id = NEW.league_id)
          WHEN NEW.is_draw THEN (SELECT points_per_draw FROM public.leagues WHERE id = NEW.league_id)
          ELSE (SELECT points_per_loss FROM public.leagues WHERE id = NEW.league_id)
        END,
        rpg_kills = rpg_kills + COALESCE((NEW.metadata->>'p2_kills')::int, 0),
        rpg_deaths = rpg_deaths + COALESCE((NEW.metadata->>'p2_deaths')::int, 0),
        br_total_kills = br_total_kills + COALESCE((NEW.metadata->>'p2_kills')::int, 0)
      WHERE id = p2_rec.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_match_stats ON public.league_matches;
CREATE TRIGGER trg_update_match_stats AFTER UPDATE ON public.league_matches FOR EACH ROW EXECUTE FUNCTION public.update_participant_stats();
