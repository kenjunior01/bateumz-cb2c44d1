
-- Create a table to store verified game winners with photos
CREATE TABLE IF NOT EXISTS game_winners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id uuid,
  game_type text NOT NULL,
  user_id uuid REFERENCES profiles(id),
  winner_name text NOT NULL,
  prize text NOT NULL,
  prize_description text,
  photo_url text,
  winner_photo_url text,
  region_id uuid REFERENCES regions(id),
  created_by uuid REFERENCES profiles(id),
  is_verified boolean DEFAULT false,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Enable row level security
ALTER TABLE game_winners ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view public verified winners"
  ON game_winners FOR SELECT
  USING (is_public AND is_verified);

CREATE POLICY "Admins/superadmins can manage all game winners"
  ON game_winners FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('admin', 'superadmin')
  ));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_winners_game_id ON game_winners(game_id);
CREATE INDEX IF NOT EXISTS idx_game_winners_region ON game_winners(region_id);
CREATE INDEX IF NOT EXISTS idx_game_winners_verified ON game_winners(is_verified);
