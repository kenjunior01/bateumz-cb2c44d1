-- ============================================================================
-- ESPORTS CHAMPIONSHIPS SYSTEM
-- Complete tournament platform for external games (Free Fire, CoD, PUBG, etc.)
-- ============================================================================

-- Enums
do $$ begin
  create type public.esport_match_format as enum (
    'solo', 'duo', 'squad', 'custom', '5v5', '3v3', '2v2', '1v1', 'free_for_all', 'battle_royale_solo', 'battle_royale_duo', 'battle_royale_squad'
  );
  create type public.esport_platform as enum (
    'mobile', 'pc', 'console', 'cross_platform', 'any'
  );
  create type public.esport_region_server as enum (
    'global', 'africa', 'europe', 'americas', 'asia', 'mideast', 'oceania'
  );
  create type public.esport_verification as enum (
    'screenshot', 'replay', 'stream', 'admin', 'auto_api', 'honor_system'
  );
  create type public.esport_champ_status as enum (
    'draft', 'published', 'registration_open', 'registration_closed', 'check_in', 'live', 'paused', 'completed', 'cancelled'
  );
  create type public.esport_match_result_status as enum (
    'pending', 'disputed', 'verified', 'rejected', 'admin_override'
  );
  exception when duplicate_object then null;
end $$;

-- External games registry
CREATE TABLE IF NOT EXISTS public.esport_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE NOT NULL,
  icon_url TEXT,
  cover_url TEXT,
  developer TEXT,
  publisher TEXT,
  genre TEXT, -- FPS, Battle Royale, MOBA, Fighting, Sports, Racing, Strategy
  platform esport_platform NOT NULL DEFAULT 'mobile',
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  max_team_size INTEGER DEFAULT 4,
  has_solo BOOLEAN DEFAULT true,
  has_duo BOOLEAN DEFAULT true,
  has_squad BOOLEAN DEFAULT true,
  default_scoring TEXT DEFAULT 'placement', -- placement, kills, placement_and_kills, rounds_won, score
  scoring_description TEXT, -- How scoring works for this game
  verification_methods esport_verification[] DEFAULT '{screenshot}',
  region_servers esport_region_server[] DEFAULT '{global}',
  rules_template TEXT, -- Default rules for tournaments
  meta JSONB DEFAULT '{}', -- Game-specific config (modes, maps, etc.)
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Esport Teams / Clubs
CREATE TABLE IF NOT EXISTS public.esport_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  tag TEXT, -- 3-5 letter clan tag [ABC]
  logo_url TEXT,
  banner_url TEXT,
  description TEXT,
  country TEXT, -- ISO country code
  region TEXT,
  discord_url TEXT,
  social_links JSONB DEFAULT '{}',
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  is_verified BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_tournaments INTEGER DEFAULT 0,
  total_earnings DECIMAL(15,2) DEFAULT 0,
  rating INTEGER DEFAULT 1000, -- ELO-like rating
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team members (roster)
CREATE TABLE IF NOT EXISTS public.esport_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.esport_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'player', -- player, substitute, captain, coach, manager
  game_username TEXT, -- In-game name
  game_uid TEXT, -- In-game UID for verification
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Championship Tournaments
CREATE TABLE IF NOT EXISTS public.esport_championships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES public.regions(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  business_id UUID REFERENCES public.profiles(user_id),
  
  -- Basic Info
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  cover_image_url TEXT,
  logo_url TEXT,
  
  -- Game
  game_id UUID NOT NULL REFERENCES public.esport_games(id),
  match_format esport_match_format NOT NULL,
  platform esport_platform NOT NULL DEFAULT 'mobile',
  
  -- Status
  status esport_champ_status NOT NULL DEFAULT 'draft',
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  
  -- Registration
  max_teams INTEGER DEFAULT 16,
  min_teams INTEGER DEFAULT 2,
  max_players_per_team INTEGER DEFAULT 4,
  registered_teams INTEGER DEFAULT 0,
  registered_players INTEGER DEFAULT 0,
  registration_opens_at TIMESTAMPTZ,
  registration_closes_at TIMESTAMPTZ,
  check_in_opens_at TIMESTAMPTZ,
  check_in_closes_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  
  -- Format
  tournament_format TEXT NOT NULL DEFAULT 'single_elimination', -- single_elim, double_elim, round_robin, swiss, hybrid, custom
  total_rounds INTEGER DEFAULT 3,
  best_of INTEGER DEFAULT 1, -- Best of N matches per round
  games_per_match INTEGER DEFAULT 1, -- Games per match (for BoX)
  points_per_kill INTEGER DEFAULT 0,
  points_per_placement JSONB DEFAULT '{}', -- {"1": 12, "2": 9, "3": 8, ...} for BR scoring
  
  -- Prize
  prize_pool DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'AOA',
  prize_distribution JSONB DEFAULT '[50, 30, 20]', -- % per placement
  prize_description TEXT,
  prize_image_url TEXT,
  sponsorship_banners JSONB DEFAULT '[]', -- [{url, image_url, link, clicks}]
  
  -- Scoring & Rules
  custom_rules TEXT,
  map_pool JSONB DEFAULT '[]', -- Allowed maps [{name, image_url}]
  mode_config JSONB DEFAULT '{}', -- Game mode specific settings
  verification_method esport_verification DEFAULT 'screenshot',
  
  -- Streaming
  stream_url TEXT,
  stream_platform TEXT, -- twitch, youtube, facebook, tiktok
  stream_embed_url TEXT,
  secondary_stream_url TEXT,
  
  -- Bracket
  bracket_json JSONB DEFAULT '{}', -- Cached bracket tree
  
  -- Region/Server
  region_server esport_region_server DEFAULT 'africa',
  
  -- Visual
  primary_color TEXT DEFAULT '#6366f1',
  secondary_color TEXT DEFAULT '#ec4899',
  accent_color TEXT DEFAULT '#f59e0b',
  
  -- Settings
  allow_spectating BOOLEAN DEFAULT true,
  allow_predictions BOOLEAN DEFAULT true,
  allow_trash_talk BOOLEAN DEFAULT true,
  require_team BOOLEAN DEFAULT true,
  auto_bracket BOOLEAN DEFAULT true,
  show_replays BOOLEAN DEFAULT false,
  
  -- Stats
  total_matches INTEGER DEFAULT 0,
  total_viewers INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Championship Teams (registered teams for a championship)
CREATE TABLE IF NOT EXISTS public.esport_champ_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES public.esport_championships(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.esport_teams(id) ON DELETE SET NULL,
  
  -- For solo players without a team
  player_id UUID REFERENCES auth.users(id),
  player_name TEXT,
  player_username TEXT,
  player_avatar TEXT,
  
  -- Registration
  seed INTEGER,
  bracket_position INTEGER,
  is_checked_in BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'registered', -- registered, checked_in, active, eliminated, winner, runner_up, disqualified
  
  -- Stats in this championship
  placement INTEGER, -- Final placement
  total_points INTEGER DEFAULT 0,
  total_kills INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,
  
  -- Earnings
  prize_won DECIMAL(15,2) DEFAULT 0,
  
  registered_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(championship_id, team_id),
  UNIQUE(championship_id, player_id)
);

-- Championship Matches
CREATE TABLE IF NOT EXISTS public.esport_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES public.esport_championships(id) ON DELETE CASCADE,
  
  -- Bracket info
  round_number INTEGER NOT NULL DEFAULT 1,
  match_number INTEGER NOT NULL DEFAULT 1,
  bracket TEXT DEFAULT 'winners', -- winners, losers, grand_final, round_robin, final
  group_letter TEXT, -- For group stages A, B, C...
  
  -- Teams/Players
  team1_id UUID, -- References esport_champ_teams
  team2_id UUID,
  team1_name TEXT,
  team2_name TEXT,
  team1_logo TEXT,
  team2_logo TEXT,
  
  -- For BR games - multiple teams per match (room)
  room_teams JSONB DEFAULT '[]', -- [{team_id, name, logo, placement, kills, points}]
  
  -- Scores
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  
  -- Result
  winner_id UUID,
  loser_id UUID,
  is_draw BOOLEAN DEFAULT false,
  mvp_player_id UUID,
  mvp_player_name TEXT,
  
  -- Match Details
  status esport_champ_status DEFAULT 'draft', -- draft, scheduled, live, completed, cancelled
  result_status esport_match_result_status DEFAULT 'pending',
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Room/Lobby info
  lobby_id TEXT, -- Game lobby/room code
  lobby_password TEXT,
  map_name TEXT,
  mode_name TEXT,
  
  -- Verification
  verification_method esport_verification DEFAULT 'screenshot',
  team1_screenshot_url TEXT,
  team2_screenshot_url TEXT,
  replay_url TEXT,
  stream_clip_url TEXT,
  admin_notes TEXT,
  dispute_reason TEXT,
  disputed_by UUID,
  
  -- Navigation
  next_match_id UUID REFERENCES public.esport_matches(id),
  previous_match1_id UUID,
  previous_match2_id UUID,
  
  -- Viewers
  viewer_count INTEGER DEFAULT 0,
  
  -- Metadata
  meta JSONB DEFAULT '{}', -- Extendable: game-specific data
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Match room results for BR games (per-team placement in a match)
CREATE TABLE IF NOT EXISTS public.esport_match_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.esport_matches(id) ON DELETE CASCADE,
  champ_team_id UUID REFERENCES public.esport_champ_teams(id),
  team_name TEXT,
  placement INTEGER NOT NULL,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  damage_dealt INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Predictions (bet on match outcomes)
CREATE TABLE IF NOT EXISTS public.esport_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.esport_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  predicted_winner_id UUID NOT NULL, -- team or player id
  points_wagered INTEGER DEFAULT 0,
  is_correct BOOLEAN DEFAULT NULL, -- null = not yet resolved
  points_won INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, user_id)
);

-- Championship activity feed
CREATE TABLE IF NOT EXISTS public.esport_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID NOT NULL REFERENCES public.esport_championships(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  match_id UUID REFERENCES public.esport_matches(id),
  type TEXT NOT NULL, -- match_result, registration, check_in, trash_talk, prediction, announcement, mvp, dispute, bracket_update, sponsor
  title TEXT,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MVP votes
CREATE TABLE IF NOT EXISTS public.esport_mvp_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.esport_matches(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id),
  candidate_id UUID NOT NULL, -- player/champ_team id
  candidate_name TEXT,
 created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id, voter_id)
);

-- Anti-cheat reports
CREATE TABLE IF NOT EXISTS public.esport_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id UUID REFERENCES public.esport_championships(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.esport_matches(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  reported_user_id UUID REFERENCES auth.users(id),
  reported_team_id UUID,
  reason TEXT NOT NULL,
  description TEXT,
  evidence_urls JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending', -- pending, reviewing, resolved, dismissed
  resolution TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_esport_games_active ON public.esport_games(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_esport_games_featured ON public.esport_games(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_esport_teams_owner ON public.esport_teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_esport_teams_rating ON public.esport_teams(rating DESC);
CREATE INDEX IF NOT EXISTS idx_esport_team_members_team ON public.esport_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_esport_team_members_user ON public.esport_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_esport_champs_status ON public.esport_championships(status);
CREATE INDEX IF NOT EXISTS idx_esport_champs_game ON public.esport_championships(game_id);
CREATE INDEX IF NOT EXISTS idx_esport_champs_featured ON public.esport_championships(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_esport_champs_public ON public.esport_championships(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_esport_champ_teams_champ ON public.esport_champ_teams(championship_id);
CREATE INDEX IF NOT EXISTS idx_esport_champ_teams_team ON public.esport_champ_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_esport_matches_champ ON public.esport_matches(championship_id);
CREATE INDEX IF NOT EXISTS idx_esport_matches_round ON public.esport_matches(championship_id, round_number);
CREATE INDEX IF NOT EXISTS idx_esport_matches_status ON public.esport_matches(championship_id, status);
CREATE INDEX IF NOT EXISTS idx_esport_predictions_match ON public.esport_predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_esport_activity_champ ON public.esport_activity(championship_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_esport_mvp_match ON public.esport_mvp_votes(match_id);
CREATE INDEX IF NOT EXISTS idx_esport_reports_champ ON public.esport_reports(championship_id);
CREATE INDEX IF NOT EXISTS idx_esport_reports_status ON public.esport_reports(status);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.esport_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esport_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esport_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esport_championships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esport_champ_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esport_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esport_match_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esport_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esport_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esport_mvp_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esport_reports ENABLE ROW LEVEL SECURITY;

-- Public read for all public content
CREATE POLICY "Games: public read" ON public.esport_games FOR SELECT USING (is_active = true);
CREATE POLICY "Champs: public read" ON public.esport_championships FOR SELECT USING (is_public = true OR creator_id = auth.uid());
CREATE POLICY "ChampTeams: public read" ON public.esport_champ_teams FOR SELECT USING (
  championship_id IN (SELECT id FROM public.esport_championships WHERE is_public = true OR creator_id = auth.uid())
);
CREATE POLICY "Matches: public read" ON public.esport_matches FOR SELECT USING (
  championship_id IN (SELECT id FROM public.esport_championships WHERE is_public = true OR creator_id = auth.uid())
);
CREATE POLICY "Placements: public read" ON public.esport_match_placements FOR SELECT USING (
  match_id IN (SELECT id FROM public.esport_matches WHERE
    championship_id IN (SELECT id FROM public.esport_championships WHERE is_public = true OR creator_id = auth.uid())
  )
);
CREATE POLICY "Activity: public read" ON public.esport_activity FOR SELECT USING (
  championship_id IN (SELECT id FROM public.esport_championships WHERE is_public = true OR creator_id = auth.uid())
);
CREATE POLICY "Teams: public read" ON public.esport_teams FOR SELECT USING (is_public = true OR owner_id = auth.uid());
CREATE POLICY "TeamMembers: public read" ON public.esport_team_members FOR SELECT USING (
  team_id IN (SELECT id FROM public.esport_teams WHERE is_public = true OR owner_id = auth.uid())
);
CREATE POLICY "Predictions: own read" ON public.esport_predictions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "MvpVotes: own read" ON public.esport_mvp_votes FOR SELECT USING (voter_id = auth.uid());
CREATE POLICY "Reports: own read" ON public.esport_reports FOR SELECT USING (reporter_id = auth.uid());

-- Creator/owner management
CREATE POLICY "Champs: creator insert" ON public.esport_championships FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Champs: creator update" ON public.esport_championships FOR UPDATE USING (creator_id = auth.uid() OR business_id = auth.uid());
CREATE POLICY "ChampTeams: register" ON public.esport_champ_teams FOR INSERT WITH CHECK (
  championship_id IN (SELECT id FROM public.esport_championships WHERE creator_id = auth.uid() OR is_public = true)
);
CREATE POLICY "ChampTeams: team update" ON public.esport_champ_teams FOR UPDATE USING (
  championship_id IN (SELECT id FROM public.esport_championships WHERE creator_id = auth.uid() OR business_id = auth.uid())
);
CREATE POLICY "Matches: creator manage" ON public.esport_matches FOR ALL USING (
  championship_id IN (SELECT id FROM public.esport_championships WHERE creator_id = auth.uid() OR business_id = auth.uid())
);
CREATE POLICY "Placements: creator manage" ON public.esport_match_placements FOR ALL USING (
  match_id IN (SELECT id FROM public.esport_matches WHERE
    championship_id IN (SELECT id FROM public.esport_championships WHERE creator_id = auth.uid() OR business_id = auth.uid())
  )
);
CREATE POLICY "Predictions: user insert" ON public.esport_predictions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Activity: member insert" ON public.esport_activity FOR INSERT WITH CHECK (
  championship_id IN (SELECT id FROM public.esport_championships WHERE is_public = true OR creator_id = auth.uid())
  OR user_id = auth.uid()
);
CREATE POLICY "MvpVotes: user insert" ON public.esport_mvp_votes FOR INSERT WITH CHECK (voter_id = auth.uid());
CREATE POLICY "Reports: user insert" ON public.esport_reports FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Teams
CREATE POLICY "Teams: create" ON public.esport_teams FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Teams: owner update" ON public.esport_teams FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "TeamMembers: team manage" ON public.esport_team_members FOR ALL USING (
  team_id IN (SELECT id FROM public.esport_teams WHERE owner_id = auth.uid())
  OR user_id = auth.uid()
);

-- ============================================================================
-- SEED DATA: Popular Esport Games
-- ============================================================================
INSERT INTO public.esport_games (name, slug, icon_url, developer, publisher, genre, platform, is_featured, max_team_size, has_solo, has_duo, has_squad, default_scoring, scoring_description, verification_methods, region_servers, sort_order, meta) VALUES
('Free Fire', 'free-fire', NULL, 'Garena', 'Garena', 'Battle Royale', 'mobile', true, 4, true, true, true, 'placement_and_kills', 'Pontuacao por colocacao + kills. 1o=12pts, 2o=9pts, 3o=8pts... cada kill=1pt', '{screenshot,stream}', '{global,africa}', 1, '{"modes":["Battle Royale","Clash Squad"],"maps":["Bermuda","Kalahari","Purgatory","Alpine"],"max_duration":25,"player_count":50}'),
('Call of Duty Mobile', 'codm', NULL, 'Activision', 'Activision', 'FPS', 'mobile', true, 6, true, true, true, 'score', 'Pontuacao por eliminacoes + objetivo. Modos: MP, BR, Ranked', '{screenshot,stream,replay}', '{global,africa}', 2, '{"modes":["Multiplayer","Battle Royale","Ranked"],"maps":["Nuketown","Crash","Hijacked","Standoff"],"max_team_size":6}'),
('PUBG Mobile', 'pubgm', NULL, 'Krafton', 'Krafton', 'Battle Royale', 'mobile', true, 4, true, true, true, 'placement_and_kills', 'Pontuacao por colocacao + kills. Classic BR scoring', '{screenshot,stream}', '{global,africa,asia}', 3, '{"modes":["Classic","Arena","Ranked"],"maps":["Erangel","Miramar","Sanhok","Livik"],"player_count":100}'),
('Valorant', 'valorant', NULL, 'Riot Games', 'Riot Games', 'FPS', 'pc', true, 5, false, false, true, 'rounds_won', 'Best of 25 rounds. Ataque x Defesa. Primeiro a 13 rondas vence.', '{screenshot,stream,replay}', '{global,africa,europe}, 4, '{"modes":["Unrated","Competitive","Spike Rush"],"maps":["Ascent","Bind","Haven","Split","Icebox","Breeze"],"max_team_size":5}'),
('Fortnite', 'fortnite', NULL, 'Epic Games', 'Epic Games', 'Battle Royale', 'cross_platform', true, 4, true, true, true, 'placement_and_kills', 'Victory Royale + eliminacoes. Ponto por colocacao + kills', '{screenshot,stream}', '{global,africa}', 5, '{"modes":["Battle Royale","Zero Build","Creative"],"player_count":100}'),
('CS2', 'cs2', NULL, 'Valve', 'Valve', 'FPS', 'pc', true, 5, false, false, true, 'rounds_won', 'Best of 30 rounds. CT vs T. Primeiro a 16 rondas vence.', '{screenshot,stream,replay}', '{global,africa,europe}', 6, '{"modes":["Competitive","Premier","Casual"],"maps":["Mirage","Inferno","Dust2","Nuke","Overpass","Ancient","Anubis"],"max_team_size":5}'),
('Mobile Legends', 'mobile-legends', NULL, 'Moonton', 'Moonton', 'MOBA', 'mobile', true, 5, false, false, true, 'rounds_won', 'Destruir a base inimiga. Partidas de 15-25 minutos.', '{screenshot,stream}', '{global,africa,asia}', 7, '{"modes":["Classic","Ranked","Brawl","Custom"],"max_team_size":5}'),
('League of Legends: Wild Rift', 'wild-rift', NULL, 'Riot Games', 'Riot Games', 'MOBA', 'mobile', true, 5, false, false, true, 'rounds_won', 'Destruir o nexus. Partidas de 15-20 minutos.', '{screenshot,stream}', '{global,africa}', 8, '{"modes":["Classic","Ranked","ARAM"],"max_team_size":5}'),
('FIFA Mobile', 'fifa-mobile', NULL, 'EA Sports', 'EA Sports', 'Sports', 'mobile', false, 1, true, false, false, 'score', 'Gols marcados. Partidas de 4 minutos.', '{screenshot}', '{global,africa}', 9, '{"modes":["VS Attack","Head to Head","Manager Mode"]}'),
('eFootball', 'efootball', NULL, 'Konami', 'Konami', 'Sports', 'cross_platform', false, 1, true, false, false, 'score', 'Gols marcados. Partidas de 10 minutos.', '{screenshot}', '{global,africa}', 10, '{"modes":["Online Match","eFootball League"]}'),
('Clash Royale', 'clash-royale', NULL, 'Supercell', 'Supercell', 'Strategy', 'mobile', false, 1, true, false, false, 'rounds_won', 'Melhor de 3. Destruir torres. Crown count como desempate.', '{screenshot}', '{global,africa}', 11, '{"modes":["1v1","2v2","Challenge","Tournament"]}'),
('Brawl Stars', 'brawl-stars', NULL, 'Supercell', 'Supercell', 'Action', 'mobile', true, 3, true, true, true, 'score', 'Pontuacao por modo. Gem Grab, Showdown, Brawl Ball, etc.', '{screenshot}', '{global,africa}', 12, '{"modes":["Gem Grab","Showdown","Brawl Ball","Heist","Hot Zone"],"max_team_size":3}'),
('Apex Legends Mobile', 'apex-mobile', NULL, 'EA', 'Respawn', 'Battle Royale', 'mobile', false, 3, true, true, true, 'placement_and_kills', 'Squads de 3. Colocacao + kills.', '{screenshot,stream}', '{global}', 13, '{"modes":["Battle Royale","Ranked"]}'),
('Warzone Mobile', 'warzone-mobile', NULL, 'Activision', 'Activision', 'Battle Royale', 'mobile', true, 4, true, true, true, 'placement_and_kills', 'BR com 100+ jogadores. Colocacao + kills + contratos.', '{screenshot,stream}', '{global,africa}', 14, '{"modes":[("Battle Royale","Resurgence","Plunder"),"player_count":100}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- TRIGGER: Auto-update registered_teams/players count
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_champ_team_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.esport_championships SET
      registered_teams = registered_teams + 1,
      updated_at = now()
    WHERE id = NEW.championship_id AND NEW.team_id IS NOT NULL;
    UPDATE public.esport_championships SET
      registered_players = registered_players + 1,
      updated_at = now()
    WHERE id = NEW.championship_id AND NEW.player_id IS NOT NULL;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.esport_championships SET
      registered_teams = GREATEST(registered_teams - 1, 0),
      updated_at = now()
    WHERE id = OLD.championship_id AND OLD.team_id IS NOT NULL;
    UPDATE public.esport_championships SET
      registered_players = GREATEST(registered_players - 1, 0),
      updated_at = now()
    WHERE id = OLD.championship_id AND OLD.player_id IS NOT NULL;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_champ_team_count ON public.esport_champ_teams;
CREATE TRIGGER trg_champ_team_count
  AFTER INSERT OR DELETE ON public.esport_champ_teams
  FOR EACH ROW EXECUTE FUNCTION public.update_champ_team_count();

-- ============================================================================
-- TRIGGER: Auto-update team stats when championship completes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_team_esport_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'winner' AND NEW.team_id IS NOT NULL THEN
    UPDATE public.esport_teams SET
      total_wins = total_wins + 1,
      total_tournaments = total_tournaments + 1,
      total_earnings = total_earnings + COALESCE(NEW.prize_won, 0),
      rating = LEAST(rating + 50, 3000),
      updated_at = now()
    WHERE id = NEW.team_id;
  ELSIF NEW.status = 'runner_up' AND NEW.team_id IS NOT NULL THEN
    UPDATE public.esport_teams SET
      total_tournaments = total_tournaments + 1,
      total_earnings = total_earnings + COALESCE(NEW.prize_won, 0),
      rating = LEAST(rating + 25, 3000),
      updated_at = now()
    WHERE id = NEW.team_id;
  ELSIF NEW.status = 'disqualified' AND NEW.team_id IS NOT NULL THEN
    UPDATE public.esport_teams SET
      total_losses = total_losses + 1,
      total_tournaments = total_tournaments + 1,
      rating = GREATEST(rating - 30, 0),
      updated_at = now()
    WHERE id = NEW.team_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_team_esport_stats ON public.esport_champ_teams;
CREATE TRIGGER trg_team_esport_stats
  AFTER UPDATE ON public.esport_champ_teams
  FOR EACH ROW EXECUTE FUNCTION public.update_team_esport_stats();
