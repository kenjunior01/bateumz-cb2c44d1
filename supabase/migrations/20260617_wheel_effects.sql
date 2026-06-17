-- Add effect_type column to spin_wheel_segments
ALTER TABLE spin_wheel_segments ADD COLUMN IF NOT EXISTS effect_type text;

-- Add default_effect column to spin_wheel_games
ALTER TABLE spin_wheel_games ADD COLUMN IF NOT EXISTS default_effect text DEFAULT 'confetti';

-- Create a table for saving wheel customizations
CREATE TABLE IF NOT EXISTS spin_wheel_customizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    wheel_id uuid REFERENCES spin_wheel_games(id) ON DELETE CASCADE,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    config jsonb NOT NULL,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE spin_wheel_customizations ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their own customizations"
    ON spin_wheel_customizations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create customizations"
    ON spin_wheel_customizations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customizations"
    ON spin_wheel_customizations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customizations"
    ON spin_wheel_customizations FOR DELETE
    USING (auth.uid() = user_id);
