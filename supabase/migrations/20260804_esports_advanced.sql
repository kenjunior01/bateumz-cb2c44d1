-- =============================================================
-- MIGRATION: Advanced eSports Features
-- Date: 2026-08-04
-- Description: Seasons, Betting, Anti-Cheat, Reputation,
--              Transfers, Sponsors, Achievements, Stream Overlay
-- =============================================================

-- Custom Enums
DO $$ BEGIN
    CREATE TYPE season_status AS ENUM ('upcoming','active','paused','completed','cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE bet_status AS ENUM ('open','settled','refunded','cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_category AS ENUM ('cheating','griefing','smurfing','boosting','disconnection','bug_exploit','toxicity','match_fixing','other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE evidence_type AS ENUM ('screenshot','video','replay','stream_clip','log','admin_note');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transfer_status AS ENUM ('requested','accepted','rejected','cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sponsor_status AS ENUM ('pending','active','completed','cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE achievement_type AS ENUM ('seasonal','lifetime','tournament','streak','social','special');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE punishment_type AS ENUM ('warning','temporary_ban','permanent_ban','points_deduction','match_forfeit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE prediction_market_type AS ENUM ('match_winner','tournament_winner','mvp','first_blood','map_winner','special');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- TABLE: esport_seasons (League/Season System)
-- ============================================================
CREATE TABLE IF NOT EXISTS esport_seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    game_id UUID REFERENCES esport_games(id),
    region_id UUID,
    creator_id UUID REFERENCES auth.users(id),
    business_id UUID,
    
    -- Season Config
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status season_status DEFAULT 'upcoming',
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    
    -- Format
    total_rounds INTEGER DEFAULT 10,
    matches_per_round INTEGER DEFAULT 1,
    points_win INTEGER DEFAULT 3,
    points_draw INTEGER DEFAULT 1,
    points_loss INTEGER DEFAULT 0,
    bonus_points_per_kill DECIMAL(5,2) DEFAULT 0.5,
    
    -- Teams
    max_teams INTEGER DEFAULT 16,
    registered_teams INTEGER DEFAULT 0,
    
    -- Prize
    prize_pool DECIMAL(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'AOA',
    prize_distribution JSONB DEFAULT '[50, 30, 20]',
    prize_description TEXT,
    
    -- Visual
    cover_image_url TEXT,
    primary_color TEXT DEFAULT '#8B5CF6',
    secondary_color TEXT DEFAULT '#EC4899',
    
    -- Meta
    total_matches INTEGER DEFAULT 0,
    total_viewers INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: esport_season_teams (Teams in a Season)
-- ============================================================
CREATE TABLE IF NOT EXISTS esport_season_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES esport_seasons(id) ON DELETE CASCADE,
    team_id UUID REFERENCES esport_teams(id),
    team_name TEXT,
    team_logo TEXT,
    
    -- Standings
    matches_played INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    matches_drawn INTEGER DEFAULT 0,
    matches_lost INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    total_kills INTEGER DEFAULT 0,
    total_deaths INTEGER DEFAULT 0,
    total_damage DECIMAL(12,2) DEFAULT 0,
    
    -- Streaks
    win_streak INTEGER DEFAULT 0,
    loss_streak INTEGER DEFAULT 0,
    best_win_streak INTEGER DEFAULT 0,
    
    -- Season result
    final_placement INTEGER,
    prize_won DECIMAL(15,2) DEFAULT 0,
    
    registered_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(season_id, team_id)
);

-- ============================================================
-- TABLE: esport_season_matches (Matches within a Season)
-- ============================================================
CREATE TABLE IF NOT EXISTS esport_season_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES esport_seasons(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    
    team1_id UUID REFERENCES esport_teams(id),
    team2_id UUID REFERENCES esport_teams(id),
    team1_name TEXT,
    team2_name TEXT,
    team1_logo TEXT,
    team2_logo TEXT,
    team1_score INTEGER DEFAULT 0,
    team2_score INTEGER DEFAULT 0,
    team1_kills INTEGER DEFAULT 0,
    team2_kills INTEGER DEFAULT 0,
    
    winner_id UUID REFERENCES esport_teams(id),
    is_draw BOOLEAN DEFAULT false,
    
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','live','completed','postponed','cancelled')),
    
    lobby_id TEXT,
    lobby_password TEXT,
    map_name TEXT,
    mode_name TEXT,
    
    viewer_count INTEGER DEFAULT 0,
    mvp_user_id UUID,
    mvp_name TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(season_id, round_number, match_number)
);

-- ============================================================
-- TABLE: esport_bets (Betting System with Virtual Currency)
-- ============================================================
CREATE TABLE IF NOT EXISTS esport_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    match_id UUID REFERENCES esport_matches(id),
    championship_id UUID REFERENCES esport_championships(id),
    season_match_id UUID REFERENCES esport_season_matches(id),
    
    bet_type prediction_market_type DEFAULT 'match_winner',
    predicted_outcome JSONB NOT NULL, -- {winner_id: "uuid"} or {mvp_user_id: "uuid"} etc.
    predicted_label TEXT, -- Human-readable: "Team Alpha"
    
    odds DECIMAL(8,3) DEFAULT 1.0,
    amount_wagered INTEGER NOT NULL DEFAULT 0, -- virtual coins
    potential_payout INTEGER NOT NULL DEFAULT 0,
    
    status bet_status DEFAULT 'open',
    is_correct BOOLEAN,
    amount_won INTEGER DEFAULT 0,
    settled_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: user_wallets (Virtual Currency Wallets)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 1000, -- Start with 1000 coins
    total_earned INTEGER DEFAULT 0,
    total_wagered INTEGER DEFAULT 0,
    total_won INTEGER DEFAULT 0,
    total_lost INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: wallet_transactions (Wallet History)
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    wallet_id UUID NOT NULL REFERENCES user_wallets(id),
    
    type TEXT NOT NULL CHECK (type IN ('bet_placed','bet_won','bet_refunded','daily_bonus','achievement_reward','season_reward','admin_adjustment','transfer_fee_earned','sponsorship_earned')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    reference_id UUID, -- link to bet, achievement, etc.
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: esport_evidence (Anti-Cheat Evidence Chain)
-- ============================================================
CREATE TABLE IF NOT EXISTS esport_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES esport_reports(id) ON DELETE SET NULL,
    championship_id UUID REFERENCES esport_championships(id),
    match_id UUID REFERENCES esport_matches(id),
    
    submitted_by UUID REFERENCES auth.users(id),
    target_user_id UUID REFERENCES auth.users(id),
    
    evidence_type evidence_type NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}', -- file hash, timestamp, device info
    
    chain_index INTEGER DEFAULT 0, -- Evidence order in chain
    parent_evidence_id UUID REFERENCES esport_evidence(id),
    
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: esport_punishments (Anti-Cheat Actions)
-- ============================================================
CREATE TABLE IF NOT EXISTS esport_punishments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    team_id UUID REFERENCES esport_teams(id),
    championship_id UUID REFERENCES esport_championships(id),
    
    punishment_type punishment_type NOT NULL,
    reason TEXT NOT NULL,
    evidence_ids UUID[] DEFAULT '{}',
    
    duration_days INTEGER, -- NULL = permanent
    starts_at TIMESTAMPTZ DEFAULT now(),
    ends_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    points_deducted INTEGER DEFAULT 0,
    matches_forfeited INTEGER DEFAULT 0,
    
    issued_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: user_reputation (Reputation/Karma System)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    karma_points INTEGER DEFAULT 100, -- Start at 100
    reputation_score DECIMAL(6,2) DEFAULT 5.0, -- 1.0 - 10.0
    
    -- Counters
    total_matches INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_reports_filed INTEGER DEFAULT 0,
    total_reports_against INTEGER DEFAULT 0,
    reports_confirmed INTEGER DEFAULT 0,
    reports_dismissed INTEGER DEFAULT 0,
    
    -- Behavior
    no_show_count INTEGER DEFAULT 0,
    disconnection_count INTEGER DEFAULT 0,
    sportsmanship_votes INTEGER DEFAULT 0,
    sportsmanship_total INTEGER DEFAULT 0, -- sum of votes (1-5)
    
    -- Title based on karma
    reputation_title TEXT DEFAULT 'Novato',
    
    -- Badges earned
    earned_badges JSONB DEFAULT '[]', -- array of badge IDs
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: sportsmanship_ratings (Post-Match Sportsmanship)
-- ============================================================
CREATE TABLE IF NOT EXISTS sportsmanship_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES esport_matches(id),
    season_match_id UUID REFERENCES esport_season_matches(id),
    rater_user_id UUID NOT NULL REFERENCES auth.users(id),
    rated_user_id UUID NOT NULL REFERENCES auth.users(id),
    
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    tags JSONB DEFAULT '[]', -- ["friendly", "toxic", "communicative", etc.]
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(match_id, rater_user_id, rated_user_id)
);

-- ============================================================
-- TABLE: esport_transfers (Player Transfer Marketplace)
-- ============================================================
CREATE TABLE IF NOT EXISTS esport_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_user_id UUID NOT NULL REFERENCES auth.users(id),
    from_team_id UUID REFERENCES esport_teams(id),
    to_team_id UUID REFERENCES esport_teams(id),
    
    status transfer_status DEFAULT 'requested',
    
    -- Transfer details
    transfer_fee INTEGER DEFAULT 0, -- virtual coins
    contract_details JSONB DEFAULT '{}', -- duration, conditions
    
    requested_by UUID REFERENCES auth.users(id),
    responded_by UUID REFERENCES auth.users(id),
    
    message TEXT, -- Transfer request message
    response_message TEXT,
    
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: esport_sponsors (Sponsorship Management)
-- ============================================================
CREATE TABLE IF NOT EXISTS esport_sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    championship_id UUID REFERENCES esport_championships(id) ON DELETE CASCADE,
    season_id UUID REFERENCES esport_seasons(id) ON DELETE CASCADE,
    
    company_name TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    contact_email TEXT,
    
    sponsorship_type TEXT DEFAULT 'prize' CHECK (sponsorship_type IN ('prize','product','media','equipment','venue','other')),
    value DECIMAL(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'AOA',
    
    status sponsor_status DEFAULT 'pending',
    contract_details JSONB DEFAULT '{}',
    
    banner_url TEXT,
    overlay_url TEXT,
    social_mention BOOLEAN DEFAULT true,
    logo_placement TEXT DEFAULT 'banner' CHECK (logo_placement IN ('banner','overlay','stream','website','all')),
    
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: esport_achievements (Achievement Definitions)
-- ============================================================
CREATE TABLE IF NOT EXISTS esport_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    icon_emoji TEXT,
    
    category achievement_type NOT NULL,
    
    -- Requirements (JSONB for flexible conditions)
    requirement JSONB NOT NULL, -- {type: "wins", count: 100, game_id: "uuid"}
    reward_coins INTEGER DEFAULT 0,
    reward_badge TEXT, -- badge identifier
    reward_xp INTEGER DEFAULT 0,
    
    rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common','uncommon','rare','epic','legendary','mythic')),
    is_hidden BOOLEAN DEFAULT false, -- Hidden until unlocked
    is_active BOOLEAN DEFAULT true,
    
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: user_achievements (Unlocked Achievements)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES esport_achievements(id),
    
    progress INTEGER DEFAULT 0, -- Current progress toward requirement
    target INTEGER NOT NULL DEFAULT 1, -- Target from requirement
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    
    notified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(user_id, achievement_id)
);

-- ============================================================
-- TABLE: esport_prediction_markets (Advanced Prediction Markets)
-- ============================================================
CREATE TABLE IF NOT EXISTS esport_prediction_markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    championship_id UUID REFERENCES esport_championships(id),
    match_id UUID REFERENCES esport_matches(id),
    season_match_id UUID REFERENCES esport_season_matches(id),
    
    market_type prediction_market_type NOT NULL,
    question TEXT NOT NULL, -- "Quem vai ganhar?"
    
    options JSONB NOT NULL, -- [{id: "opt1", label: "Team A", odds: 1.5, total_wagered: 100}]
    
    status bet_status DEFAULT 'open',
    winning_option_id TEXT,
    
    total_pool INTEGER DEFAULT 0,
    total_bettors INTEGER DEFAULT 0,
    
    closes_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: esport_highlight_clips (Auto/Manual Highlight System)
-- ============================================================
CREATE TABLE IF NOT EXISTS esport_highlight_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES esport_matches(id),
    season_match_id UUID REFERENCES esport_season_matches(id),
    championship_id UUID REFERENCES esport_championships(id),
    
    clip_url TEXT NOT NULL,
    thumbnail_url TEXT,
    title TEXT,
    description TEXT,
    
    submitted_by UUID REFERENCES auth.users(id),
    player_user_id UUID REFERENCES auth.users(id),
    player_name TEXT,
    team_name TEXT,
    
    clip_type TEXT DEFAULT 'manual' CHECK (clip_type IN ('manual','auto','community')),
    
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: esport_stream_overlays (Stream Overlay Configs)
-- ============================================================
CREATE TABLE IF NOT EXISTS esport_stream_overlays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    championship_id UUID REFERENCES esport_championships(id),
    season_id UUID REFERENCES esport_seasons(id),
    
    name TEXT NOT NULL,
    
    -- Overlay content
    show_scores BOOLEAN DEFAULT true,
    show_teams BOOLEAN DEFAULT true,
    show_sponsors BOOLEAN DEFAULT true,
    show_bracket BOOLEAN DEFAULT false,
    show_mvp BOOLEAN DEFAULT true,
    show_social BOOLEAN DEFAULT false,
    show_chat BOOLEAN DEFAULT false,
    
    -- Visual config
    bg_color TEXT DEFAULT '#000000',
    bg_opacity DECIMAL(3,2) DEFAULT 0.8,
    text_color TEXT DEFAULT '#FFFFFF',
    accent_color TEXT DEFAULT '#8B5CF6',
    font_family TEXT DEFAULT 'Inter',
    position TEXT DEFAULT 'bottom' CHECK (position IN ('top','bottom','left','right','custom')),
    
    -- Widget URL for OBS
    widget_url TEXT,
    is_active BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABLE: esport_match_chat (In-Match Chat / Trash Talk)
-- ============================================================
CREATE TABLE IF NOT EXISTS esport_match_chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES esport_matches(id),
    season_match_id UUID REFERENCES esport_season_matches(id),
    championship_id UUID REFERENCES esport_championships(id),
    
    user_id UUID NOT NULL REFERENCES auth.users(id),
    username TEXT NOT NULL,
    user_avatar TEXT,
    team_id UUID,
    team_name TEXT,
    
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'chat' CHECK (message_type IN ('chat','trash_talk','system','highlight','reaction')),
    
    is_pinned BOOLEAN DEFAULT false,
    likes INTEGER DEFAULT 0,
    reports INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_seasons_status ON esport_seasons(status);
CREATE INDEX IF NOT EXISTS idx_seasons_game ON esport_seasons(game_id);
CREATE INDEX IF NOT EXISTS idx_seasons_creator ON esport_seasons(creator_id);
CREATE INDEX IF NOT EXISTS idx_seasons_featured ON esport_seasons(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_season_teams_season ON esport_season_teams(season_id);
CREATE INDEX IF NOT EXISTS idx_season_teams_points ON esport_season_teams(season_id, points DESC);
CREATE INDEX IF NOT EXISTS idx_season_matches_season ON esport_season_matches(season_id);
CREATE INDEX IF NOT EXISTS idx_season_matches_round ON esport_season_matches(season_id, round_number);
CREATE INDEX IF NOT EXISTS idx_season_matches_status ON esport_season_matches(status);
CREATE INDEX IF NOT EXISTS idx_bets_user ON esport_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_match ON esport_bets(match_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON esport_bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_championship ON esport_bets(championship_id);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_evidence_report ON esport_evidence(report_id);
CREATE INDEX IF NOT EXISTS idx_evidence_match ON esport_evidence(match_id);
CREATE INDEX IF NOT EXISTS idx_evidence_target ON esport_evidence(target_user_id);
CREATE INDEX IF NOT EXISTS idx_punishments_user ON esport_punishments(user_id);
CREATE INDEX IF NOT EXISTS idx_punishments_active ON esport_punishments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_reputation_user ON user_reputation(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_karma ON user_reputation(karma_points DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_player ON esport_transfers(player_user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON esport_transfers(status);
CREATE INDEX IF NOT EXISTS idx_sponsors_championship ON esport_sponsors(championship_id);
CREATE INDEX IF NOT EXISTS idx_sponsors_season ON esport_sponsors(season_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON esport_achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON esport_achievements(rarity);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed ON user_achievements(user_id, is_completed) WHERE is_completed = true;
CREATE INDEX IF NOT EXISTS idx_prediction_markets_match ON esport_prediction_markets(match_id);
CREATE INDEX IF NOT EXISTS idx_prediction_markets_status ON esport_prediction_markets(status);
CREATE INDEX IF NOT EXISTS idx_clips_match ON esport_highlight_clips(match_id);
CREATE INDEX IF NOT EXISTS idx_clips_featured ON esport_highlight_clips(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_stream_overlays_champ ON esport_stream_overlays(championship_id);
CREATE INDEX IF NOT EXISTS idx_match_chat_match ON esport_match_chat(match_id);
CREATE INDEX IF NOT EXISTS idx_match_chat_championship ON esport_match_chat(championship_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE esport_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE esport_season_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE esport_season_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE esport_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE esport_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE esport_punishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE sportsmanship_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE esport_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE esport_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE esport_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE esport_prediction_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE esport_highlight_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE esport_stream_overlays ENABLE ROW LEVEL SECURITY;
ALTER TABLE esport_match_chat ENABLE ROW LEVEL SECURITY;

-- Public read for seasons
CREATE POLICY "Seasons are publicly readable" ON esport_seasons FOR SELECT USING (is_published = true OR creator_id = auth.uid());
CREATE POLICY "Authenticated users can create seasons" ON esport_seasons FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update seasons" ON esport_seasons FOR UPDATE USING (creator_id = auth.uid());
CREATE POLICY "Creators can delete seasons" ON esport_seasons FOR DELETE USING (creator_id = auth.uid());

-- Season teams
CREATE POLICY "Season teams are publicly readable" ON esport_season_teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage season teams" ON esport_season_teams FOR ALL USING (auth.uid() IS NOT NULL);

-- Season matches
CREATE POLICY "Season matches are publicly readable" ON esport_season_matches FOR SELECT USING (true);
CREATE POLICY "Organizers can manage season matches" ON esport_season_matches FOR ALL USING (auth.uid() IS NOT NULL);

-- Bets - user can only see/manage their own
CREATE POLICY "Users see own bets" ON esport_bets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users create own bets" ON esport_bets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own bets" ON esport_bets FOR UPDATE USING (user_id = auth.uid());

-- Wallets - user can only see own
CREATE POLICY "Users see own wallet" ON user_wallets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System manages wallets" ON user_wallets FOR ALL USING (auth.uid() IS NOT NULL);

-- Wallet transactions
CREATE POLICY "Users see own transactions" ON wallet_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System manages transactions" ON wallet_transactions FOR ALL USING (auth.uid() IS NOT NULL);

-- Evidence
CREATE POLICY "Evidence readable by involved parties" ON esport_evidence FOR SELECT USING (submitted_by = auth.uid() OR target_user_id = auth.uid() OR verified_by = auth.uid());
CREATE POLICY "Users can submit evidence" ON esport_evidence FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins verify evidence" ON esport_evidence FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Punishments
CREATE POLICY "Punishments publicly readable" ON esport_punishments FOR SELECT USING (true);
CREATE POLICY "Admins manage punishments" ON esport_punishments FOR ALL USING (auth.uid() IS NOT NULL);

-- Reputation
CREATE POLICY "Reputation publicly readable" ON user_reputation FOR SELECT USING (true);
CREATE POLICY "System manages reputation" ON user_reputation FOR ALL USING (auth.uid() IS NOT NULL);

-- Sportsmanship
CREATE POLICY "Sportsmanship ratings readable" ON sportsmanship_ratings FOR SELECT USING (true);
CREATE POLICY "Users rate sportsmanship" ON sportsmanship_ratings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Transfers
CREATE POLICY "Users see own transfers" ON esport_transfers FOR SELECT USING (player_user_id = auth.uid() OR requested_by = auth.uid());
CREATE POLICY "Users create transfers" ON esport_transfers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Transfer parties respond" ON esport_transfers FOR UPDATE USING (player_user_id = auth.uid() OR requested_by = auth.uid());

-- Sponsors
CREATE POLICY "Sponsors publicly readable" ON esport_sponsors FOR SELECT USING (true);
CREATE POLICY "Organizers manage sponsors" ON esport_sponsors FOR ALL USING (auth.uid() IS NOT NULL);

-- Achievements
CREATE POLICY "Achievements publicly readable" ON esport_achievements FOR SELECT USING (true);
CREATE POLICY "System manages achievements" ON esport_achievements FOR ALL USING (auth.uid() IS NOT NULL);

-- User achievements
CREATE POLICY "Users see own achievements" ON user_achievements FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System manages user achievements" ON user_achievements FOR ALL USING (auth.uid() IS NOT NULL);

-- Prediction markets
CREATE POLICY "Prediction markets publicly readable" ON esport_prediction_markets FOR SELECT USING (true);
CREATE POLICY "Organizers manage prediction markets" ON esport_prediction_markets FOR ALL USING (auth.uid() IS NOT NULL);

-- Clips
CREATE POLICY "Clips publicly readable" ON esport_highlight_clips FOR SELECT USING (true);
CREATE POLICY "Users create clips" ON esport_highlight_clips FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users update own clips" ON esport_highlight_clips FOR UPDATE USING (submitted_by = auth.uid());

-- Stream overlays
CREATE POLICY "Overlays readable by organizers" ON esport_stream_overlays FOR SELECT USING (true);
CREATE POLICY "Organizers manage overlays" ON esport_stream_overlays FOR ALL USING (auth.uid() IS NOT NULL);

-- Match chat
CREATE POLICY "Match chat publicly readable" ON esport_match_chat FOR SELECT USING (true);
CREATE POLICY "Users post chat" ON esport_match_chat FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users delete own chat" ON esport_match_chat FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update season registered_teams count
CREATE OR REPLACE FUNCTION increment_season_teams()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE esport_seasons SET registered_teams = registered_teams + 1, updated_at = now() WHERE id = NEW.season_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_season_teams()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE esport_seasons SET registered_teams = GREATEST(0, registered_teams - 1), updated_at = now() WHERE id = OLD.season_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_season_teams_inc AFTER INSERT ON esport_season_teams FOR EACH ROW EXECUTE FUNCTION increment_season_teams();
CREATE TRIGGER tr_season_teams_dec AFTER DELETE ON esport_season_teams FOR EACH ROW EXECUTE FUNCTION decrement_season_teams();

-- Auto-update wallet timestamp
CREATE OR REPLACE FUNCTION update_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_wallet_timestamp BEFORE UPDATE ON user_wallets FOR EACH ROW EXECUTE FUNCTION update_wallet_timestamp();

-- Auto-update reputation title based on karma
CREATE OR REPLACE FUNCTION update_reputation_title()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.karma_points >= 500 THEN NEW.reputation_title = 'Lenda';
    ELSIF NEW.karma_points >= 400 THEN NEW.reputation_title = 'Mestre';
    ELSIF NEW.karma_points >= 300 THEN NEW.reputation_title = 'Veterano';
    ELSIF NEW.karma_points >= 200 THEN NEW.reputation_title = 'Experiente';
    ELSIF NEW.karma_points >= 100 THEN NEW.reputation_title = 'Jogador Confiavel';
    ELSIF NEW.karma_points >= 50 THEN NEW.reputation_title = 'Novato Promissor';
    ELSIF NEW.karma_points < 0 THEN NEW.reputation_title = 'Jogador Suspeito';
    ELSE NEW.reputation_title = 'Novato';
    END IF;
    
    -- Calculate reputation score (1-10 scale)
    NEW.reputation_score = LEAST(10.0, GREATEST(1.0, 5.0 + (NEW.karma_points - 100) * 0.02));
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_reputation_title BEFORE UPDATE ON user_reputation FOR EACH ROW EXECUTE FUNCTION update_reputation_title();

-- Auto-increment season total_matches
CREATE OR REPLACE FUNCTION increment_season_matches()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE esport_seasons SET total_matches = total_matches + 1, updated_at = now() WHERE id = NEW.season_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_season_matches_inc AFTER INSERT ON esport_season_matches FOR EACH ROW EXECUTE FUNCTION increment_season_matches();

-- ============================================================
-- SEED: Default Achievements
-- ============================================================
INSERT INTO esport_achievements (name, slug, description, icon_emoji, category, requirement, reward_coins, rarity, sort_order) VALUES
-- Tournament achievements
('Primeira Vitoria', 'primeira-vitoria', 'Ganha o teu primeiro campeonato', '🏆', 'tournament', '{"type": "championship_wins", "count": 1}', 500, 'common', 1),
('Campeao Invicto', 'campeao-invicto', 'Ganha um campeonato sem perder nenhum jogo', '💎', 'tournament', '{"type": "championship_wins_undefeated", "count": 1}', 2000, 'legendary', 2),
('Dominador', 'dominador', 'Ganha 10 campeonatos', '👑', 'tournament', '{"type": "championship_wins", "count": 10}', 5000, 'mythic', 3),
('Finalista Consistente', 'finalista-consistente', 'Chega a final em 5 campeonatos diferentes', '🥈', 'tournament', '{"type": "finalist_count", "count": 5}', 1500, 'epic', 4),

-- Streak achievements
('Vitoria Consecutiva', 'vitoria-consecutiva-3', 'Ganha 3 jogos seguidos', '🔥', 'streak', '{"type": "win_streak", "count": 3}', 300, 'common', 10),
('Arrasa Consecutivo', 'arrasa-consecutivo-7', 'Ganha 7 jogos seguidos', '🔥', 'streak', '{"type": "win_streak", "count": 7}', 1000, 'rare', 11),
('Inabalavel', 'inabalavel-15', 'Ganha 15 jogos seguidos', '⚡', 'streak', '{"type": "win_streak", "count": 15}', 3000, 'legendary', 12),

-- Season achievements
('Campeao da Temporada', 'campeao-temporada', 'Vence uma temporada completa', '🏅', 'seasonal', '{"type": "season_wins", "count": 1}', 1000, 'rare', 20),
('Artilheiro', 'artilheiro', 'Faz 100 kills numa so temporada', '🎯', 'seasonal', '{"type": "season_kills", "count": 100}', 1500, 'epic', 21),

-- Social achievements
('Apostador Aventureiro', 'apostador-aventureiro', 'Faz 50 apostas', '🎰', 'social', '{"type": "total_bets", "count": 50}', 500, 'common', 30),
('Previsor de Ouro', 'previsor-ouro', 'Acerta 10 apostas seguidas', '🧠', 'social', '{"type": "correct_bet_streak", "count": 10}', 2000, 'legendary', 31),
('Esportista Exemplar', 'esportista-exemplar', 'Recebe 20 avaliacoes de esportividade 5 estrelas', '🌟', 'social', '{"type": "sportsmanship_5star", "count": 20}', 1500, 'epic', 32),
('MVP Favorito', 'mvp-favorito', 'E eleito MVP 25 vezes', '⭐', 'social', '{"type": "mvp_count", "count": 25}', 2000, 'legendary', 33),

-- Lifetime achievements
('Veterano de Elite', 'veterano-elite', 'Joga 500 partidas', '🎖', 'lifetime', '{"type": "total_matches", "count": 500}', 3000, 'epic', 40),
('Mil Kills', 'mil-kills', 'Alcanca 1000 kills totais', '💀', 'lifetime', '{"type": "total_kills", "count": 1000}', 2000, 'rare', 41),
('Lenda Viva', 'lenda-viva', 'Alcanca 2000+ de karma', '🌟', 'lifetime', '{"type": "karma_points", "count": 2000}', 5000, 'mythic', 42),

-- Special achievements
('Pioneiro', 'pioneiro', 'Sera dos primeiros 1000 utilizadores da plataforma', '🚀', 'special', '{"type": "early_adopter", "count": 1}', 1000, 'rare', 50),
('Criador de Lendas', 'criador-de-lendas', 'Organiza 10 campeonatos com 16+ equipas', '🏗', 'special', '{"type": "organized_tournaments", "count": 10, "min_teams": 16}', 3000, 'legendary', 51)
ON CONFLICT (slug) DO NOTHING;
