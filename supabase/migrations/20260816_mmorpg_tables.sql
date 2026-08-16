-- =============================================
-- MMORPG Persistente - Tabelas para bateu.online
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- Tabela de personagens dos jogadores
CREATE TABLE IF NOT EXISTS rpg_characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_id TEXT UNIQUE,
  name TEXT NOT NULL,
  class_id INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  gold INT NOT NULL DEFAULT 100,
  hp INT NOT NULL DEFAULT 100,
  max_hp INT NOT NULL DEFAULT 100,
  mp INT NOT NULL DEFAULT 30,
  max_mp INT NOT NULL DEFAULT 30,
  atk INT NOT NULL DEFAULT 10,
  def INT NOT NULL DEFAULT 5,
  spd INT NOT NULL DEFAULT 8,
  equipment JSONB NOT NULL DEFAULT '[null, null, null]'::jsonb,
  inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_stars INT NOT NULL DEFAULT 0,
  total_kills INT NOT NULL DEFAULT 0,
  total_deaths INT NOT NULL DEFAULT 0,
  total_duels_won INT NOT NULL DEFAULT 0,
  total_duels_lost INT NOT NULL DEFAULT 0,
  total_earned INT NOT NULL DEFAULT 0,
  current_zone INT NOT NULL DEFAULT 0,
  last_online TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_online BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de duelos PVP
CREATE TABLE IF NOT EXISTS rpg_duels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID NOT NULL,
  challenger_name TEXT NOT NULL,
  challenger_class INT NOT NULL,
  challenger_level INT NOT NULL,
  defender_id UUID NOT NULL,
  defender_name TEXT NOT NULL,
  defender_class INT NOT NULL,
  defender_level INT NOT NULL,
  stake INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'in_progress', 'completed')),
  winner_id UUID,
  battle_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Tabela de transacoes P2P (transferencias, apostas, mercado)
CREATE TABLE IF NOT EXISTS rpg_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_char_id UUID NOT NULL,
  from_name TEXT NOT NULL,
  to_char_id UUID NOT NULL,
  to_name TEXT NOT NULL,
  amount INT NOT NULL,
  type TEXT NOT NULL DEFAULT 'transfer' CHECK (type IN ('transfer', 'duel_bet', 'marketplace', 'reward')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de chat do mundo
CREATE TABLE IF NOT EXISTS rpg_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  char_id UUID NOT NULL,
  char_name TEXT NOT NULL,
  class_id INT NOT NULL,
  message TEXT NOT NULL,
  zone INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de mundo/boss
CREATE TABLE IF NOT EXISTS rpg_world_boss (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  boss_name TEXT NOT NULL,
  boss_emoji TEXT NOT NULL,
  boss_hp INT NOT NULL,
  boss_max_hp INT NOT NULL,
  zone INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  damage_by JSONB NOT NULL DEFAULT '{}'::jsonb,
  rewards_pool INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  defeated_at TIMESTAMPTZ
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_rpg_characters_user_id ON rpg_characters(user_id);
CREATE INDEX IF NOT EXISTS idx_rpg_characters_guest_id ON rpg_characters(guest_id);
CREATE INDEX IF NOT EXISTS idx_rpg_characters_online ON rpg_characters(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_rpg_characters_gold ON rpg_characters(gold DESC);
CREATE INDEX IF NOT EXISTS idx_rpg_characters_level ON rpg_characters(level DESC);
CREATE INDEX IF NOT EXISTS idx_rpg_duels_challenger ON rpg_duels(challenger_id);
CREATE INDEX IF NOT EXISTS idx_rpg_duels_defender ON rpg_duels(defender_id);
CREATE INDEX IF NOT EXISTS idx_rpg_duels_status ON rpg_duels(status);
CREATE INDEX IF NOT EXISTS idx_rpg_transactions_from ON rpg_transactions(from_char_id);
CREATE INDEX IF NOT EXISTS idx_rpg_transactions_to ON rpg_transactions(to_char_id);
CREATE INDEX IF NOT EXISTS idx_rpg_chat_created ON rpg_chat(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rpg_chat_zone ON rpg_chat(zone);

-- RLS: Qualquer pessoa logada pode ler, so o dono pode escrever seu personagem
ALTER TABLE rpg_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpg_duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpg_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpg_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpg_world_boss ENABLE ROW LEVEL SECURITY;

-- Policies para rpg_characters
CREATE POLICY "Anyone can read characters" ON rpg_characters FOR SELECT USING (true);
CREATE POLICY "Users can insert own character" ON rpg_characters FOR INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (guest_id IS NOT NULL)
);
CREATE POLICY "Users can update own character" ON rpg_characters FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR (guest_id IS NOT NULL)
);

-- Policies para rpg_duels
CREATE POLICY "Anyone can read duels" ON rpg_duels FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert duels" ON rpg_duels FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can update duels" ON rpg_duels FOR UPDATE USING (true);

-- Policies para rpg_transactions
CREATE POLICY "Anyone can read transactions" ON rpg_transactions FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert transactions" ON rpg_transactions FOR INSERT WITH CHECK (true);

-- Policies para rpg_chat
CREATE POLICY "Anyone can read chat" ON rpg_chat FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert chat" ON rpg_chat FOR INSERT WITH CHECK (true);

-- Policies para rpg_world_boss
CREATE POLICY "Anyone can read world boss" ON rpg_world_boss FOR SELECT USING (true);
CREATE POLICY "Authenticated can update world boss" ON rpg_world_boss FOR UPDATE USING (true);
CREATE POLICY "Authenticated can insert world boss" ON rpg_world_boss FOR INSERT WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rpg_characters;
ALTER PUBLICATION supabase_realtime ADD TABLE rpg_duels;
ALTER PUBLICATION supabase_realtime ADD TABLE rpg_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE rpg_world_boss;
