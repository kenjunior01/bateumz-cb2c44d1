-- World Cup 2026 Tables and Engagement System
-- This migration adds support for World Cup predictions, Fantasy Football, and engagement points

-- 1. World Cup Teams
CREATE TABLE IF NOT EXISTS public.world_cup_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL UNIQUE,
  team_name text NOT NULL,
  flag_emoji text,
  group_letter text,
  coach_name text,
  star_players text[], -- Array of star player names
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.world_cup_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view world cup teams" ON public.world_cup_teams FOR SELECT USING (true);
CREATE POLICY "Superadmins manage teams" ON public.world_cup_teams FOR ALL TO authenticated 
  USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

-- 2. World Cup Matches
CREATE TABLE IF NOT EXISTS public.world_cup_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date timestamptz NOT NULL,
  team_a_id uuid NOT NULL REFERENCES public.world_cup_teams(id) ON DELETE CASCADE,
  team_b_id uuid NOT NULL REFERENCES public.world_cup_teams(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('group', 'round16', 'quarterfinal', 'semifinal', 'final')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  team_a_goals integer,
  team_b_goals integer,
  team_a_penalties integer,
  team_b_penalties integer,
  winner_team_id uuid REFERENCES public.world_cup_teams(id) ON DELETE SET NULL,
  stadium text,
  city text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.world_cup_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view matches" ON public.world_cup_matches FOR SELECT USING (true);
CREATE POLICY "Superadmins manage matches" ON public.world_cup_matches FOR ALL TO authenticated 
  USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

CREATE INDEX idx_world_cup_matches_date ON public.world_cup_matches(match_date);
CREATE INDEX idx_world_cup_matches_status ON public.world_cup_matches(status);

-- 3. World Cup Predictions (Bolão)
CREATE TABLE IF NOT EXISTS public.world_cup_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.world_cup_matches(id) ON DELETE CASCADE,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  predicted_team_a_goals integer NOT NULL,
  predicted_team_b_goals integer NOT NULL,
  predicted_winner_id uuid REFERENCES public.world_cup_teams(id) ON DELETE SET NULL,
  points integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id, region_id)
);

ALTER TABLE public.world_cup_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own predictions" ON public.world_cup_predictions FOR SELECT 
  USING (auth.uid() = user_id OR public.is_superadmin(auth.uid()));
CREATE POLICY "Users can insert predictions" ON public.world_cup_predictions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions" ON public.world_cup_predictions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE INDEX idx_predictions_user_match ON public.world_cup_predictions(user_id, match_id);
CREATE INDEX idx_predictions_region ON public.world_cup_predictions(region_id);

-- 4. Fantasy Football Teams
CREATE TABLE IF NOT EXISTS public.fantasy_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  description text,
  league_type text NOT NULL DEFAULT 'public' CHECK (league_type IN ('public', 'private')),
  points integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fantasy_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own fantasy teams" ON public.fantasy_teams FOR SELECT 
  USING (auth.uid() = user_id OR league_type = 'public' OR public.is_superadmin(auth.uid()));
CREATE POLICY "Users can insert fantasy teams" ON public.fantasy_teams FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own teams" ON public.fantasy_teams FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE INDEX idx_fantasy_teams_user_region ON public.fantasy_teams(user_id, region_id);

-- 5. Fantasy Team Players (squad)
CREATE TABLE IF NOT EXISTS public.fantasy_team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fantasy_team_id uuid NOT NULL REFERENCES public.fantasy_teams(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  player_position text NOT NULL CHECK (player_position IN ('goalkeeper', 'defender', 'midfielder', 'forward')),
  world_cup_team_id uuid NOT NULL REFERENCES public.world_cup_teams(id) ON DELETE CASCADE,
  points integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fantasy_team_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own team players" ON public.fantasy_team_players FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM public.fantasy_teams ft WHERE ft.id = fantasy_team_players.fantasy_team_id AND ft.user_id = auth.uid())
    OR public.is_superadmin(auth.uid())
  );

-- 6. World Cup News & Articles
CREATE TABLE IF NOT EXISTS public.world_cup_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  summary text,
  image_url text,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id uuid REFERENCES public.regions(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('news', 'analysis', 'player_profile', 'team_profile', 'match_preview', 'match_review')),
  published boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.world_cup_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published news" ON public.world_cup_news FOR SELECT 
  USING (published = true OR public.is_superadmin(auth.uid()));
CREATE POLICY "Admins can manage news" ON public.world_cup_news FOR ALL TO authenticated 
  USING (public.can_admin_country(auth.uid(), COALESCE((SELECT country_code FROM public.regions WHERE id = region_id), 'US')))
  WITH CHECK (public.can_admin_country(auth.uid(), COALESCE((SELECT country_code FROM public.regions WHERE id = region_id), 'US')));

CREATE INDEX idx_world_cup_news_published ON public.world_cup_news(published);
CREATE INDEX idx_world_cup_news_region ON public.world_cup_news(region_id);

-- 7. Engagement Points System
CREATE TABLE IF NOT EXISTS public.engagement_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  total_lifetime_points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, region_id)
);

ALTER TABLE public.engagement_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own points" ON public.engagement_points FOR SELECT 
  USING (auth.uid() = user_id OR public.is_superadmin(auth.uid()));
CREATE POLICY "System can update points" ON public.engagement_points FOR ALL TO service_role USING (true);

CREATE INDEX idx_engagement_points_user_region ON public.engagement_points(user_id, region_id);
CREATE INDEX idx_engagement_points_lifetime ON public.engagement_points(total_lifetime_points DESC);

-- 8. Engagement Points Log (audit trail)
CREATE TABLE IF NOT EXISTS public.engagement_points_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  points_change integer NOT NULL,
  reason text NOT NULL CHECK (reason IN (
    'raffle_participation', 'prediction_made', 'prediction_correct', 
    'friend_invite', 'social_share', 'contest_entry', 'daily_login', 'achievement'
  )),
  related_id uuid, -- ID of raffle, prediction, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.engagement_points_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own log" ON public.engagement_points_log FOR SELECT 
  USING (auth.uid() = user_id OR public.is_superadmin(auth.uid()));
CREATE POLICY "System can insert log" ON public.engagement_points_log FOR INSERT TO service_role WITH CHECK (true);

CREATE INDEX idx_points_log_user_region ON public.engagement_points_log(user_id, region_id);
CREATE INDEX idx_points_log_reason ON public.engagement_points_log(reason);

-- 9. Regional Prediction Leagues
CREATE TABLE IF NOT EXISTS public.prediction_leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  league_type text NOT NULL DEFAULT 'public' CHECK (league_type IN ('public', 'private', 'invite_only')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_participants integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prediction_leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public leagues" ON public.prediction_leagues FOR SELECT 
  USING (league_type = 'public' OR public.is_superadmin(auth.uid()));
CREATE POLICY "Admins can manage leagues" ON public.prediction_leagues FOR ALL TO authenticated 
  USING (public.can_admin_country(auth.uid(), (SELECT country_code FROM public.regions WHERE id = region_id)))
  WITH CHECK (public.can_admin_country(auth.uid(), (SELECT country_code FROM public.regions WHERE id = region_id)));

CREATE INDEX idx_prediction_leagues_region ON public.prediction_leagues(region_id);

-- 10. League Participants
CREATE TABLE IF NOT EXISTS public.league_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.prediction_leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer DEFAULT 0,
  rank integer,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id)
);

ALTER TABLE public.league_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view league participants" ON public.league_participants FOR SELECT USING (true);
CREATE POLICY "Users can join leagues" ON public.league_participants FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_league_participants_league_rank ON public.league_participants(league_id, rank);

-- 11. Discussion Forums (regional topics)
CREATE TABLE IF NOT EXISTS public.forum_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('general', 'match_discussion', 'player_analysis', 'team_strategy', 'off_topic')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pinned boolean DEFAULT false,
  locked boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view topics" ON public.forum_topics FOR SELECT USING (true);
CREATE POLICY "Users can create topics" ON public.forum_topics FOR INSERT 
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admins can manage topics" ON public.forum_topics FOR ALL TO authenticated 
  USING (public.can_admin_country(auth.uid(), (SELECT country_code FROM public.regions WHERE id = region_id)))
  WITH CHECK (public.can_admin_country(auth.uid(), (SELECT country_code FROM public.regions WHERE id = region_id)));

CREATE INDEX idx_forum_topics_region_category ON public.forum_topics(region_id, category);

-- 12. Forum Posts
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  likes integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view posts" ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON public.forum_posts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.forum_posts FOR UPDATE 
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete posts" ON public.forum_posts FOR DELETE TO authenticated 
  USING (
    public.is_superadmin(auth.uid())
    OR public.can_admin_country(auth.uid(), (SELECT country_code FROM public.regions WHERE id = (SELECT region_id FROM public.forum_topics WHERE id = topic_id)))
  );

CREATE INDEX idx_forum_posts_topic ON public.forum_posts(topic_id);
CREATE INDEX idx_forum_posts_user ON public.forum_posts(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_world_cup_teams_updated_at BEFORE UPDATE ON public.world_cup_teams 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_world_cup_matches_updated_at BEFORE UPDATE ON public.world_cup_matches 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_world_cup_predictions_updated_at BEFORE UPDATE ON public.world_cup_predictions 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fantasy_teams_updated_at BEFORE UPDATE ON public.fantasy_teams 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_world_cup_news_updated_at BEFORE UPDATE ON public.world_cup_news 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_engagement_points_updated_at BEFORE UPDATE ON public.engagement_points 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_prediction_leagues_updated_at BEFORE UPDATE ON public.prediction_leagues 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_forum_topics_updated_at BEFORE UPDATE ON public.forum_topics 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_forum_posts_updated_at BEFORE UPDATE ON public.forum_posts 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT ON public.world_cup_teams TO anon;
GRANT SELECT ON public.world_cup_matches TO anon;
GRANT SELECT ON public.world_cup_news TO anon;
GRANT SELECT ON public.prediction_leagues TO anon;
GRANT SELECT ON public.league_participants TO anon;
GRANT SELECT ON public.forum_topics TO anon;
GRANT SELECT ON public.forum_posts TO anon;

GRANT ALL ON public.world_cup_predictions TO authenticated;
GRANT ALL ON public.fantasy_teams TO authenticated;
GRANT ALL ON public.fantasy_team_players TO authenticated;
GRANT ALL ON public.engagement_points TO authenticated;
GRANT ALL ON public.engagement_points_log TO authenticated;
