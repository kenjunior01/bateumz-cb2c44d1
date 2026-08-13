-- =============================================================
-- P2P CHALLENGE SYSTEM - Tabelas para Duelos Entre Usuarios
-- Moeda virtual com escrow — sem dinheiro real
-- =============================================================

-- Tabela principal de desafios P2P
CREATE TABLE IF NOT EXISTS p2p_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo e estado
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('duel', 'group', 'friend_league')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting_opponent', 'active', 'scoring', 'completed', 'cancelled', 'expired')),
  
  -- Criador do desafio
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_display_name TEXT NOT NULL,
  creator_avatar_url TEXT,
  creator_prediction TEXT,
  creator_score INTEGER NOT NULL DEFAULT 0,
  
  -- Oponente (para duelos 1v1)
  opponent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opponent_display_name TEXT,
  opponent_avatar_url TEXT,
  opponent_prediction TEXT,
  opponent_score INTEGER NOT NULL DEFAULT 0,
  
  -- Participantes (para desafios de grupo, JSONB array)
  participants JSONB DEFAULT '[]'::jsonb,
  max_participants INTEGER DEFAULT 8,
  
  -- Referencia ao jogo/evento
  match_id UUID,
  season_match_id UUID,
  championship_id UUID,
  championship_name TEXT,
  match_label TEXT,
  market_type TEXT NOT NULL DEFAULT 'match_winner',
  
  -- Aposta e premio
  wager_amount INTEGER NOT NULL CHECK (wager_amount > 0),
  prize_pool INTEGER NOT NULL DEFAULT 0,
  platform_fee INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  winner_display_name TEXT,
  
  -- Formato e rodadas
  format TEXT NOT NULL DEFAULT 'single_match' CHECK (format IN ('single_match', 'best_of_3', 'best_of_5', 'best_of_7')),
  total_rounds INTEGER NOT NULL DEFAULT 1,
  current_round INTEGER NOT NULL DEFAULT 0,
  
  -- Timing
  expires_at TIMESTAMPTZ NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Social
  is_public BOOLEAN NOT NULL DEFAULT true,
  spectator_count INTEGER NOT NULL DEFAULT 0,
  chat_enabled BOOLEAN NOT NULL DEFAULT true,
  trash_talk TEXT,
  
  -- Metadata
  invite_code TEXT UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indice para buscar desafios abertos (duelos)
CREATE INDEX IF NOT EXISTS idx_p2p_open_duels ON p2p_challenges (challenge_type, status, is_public)
  WHERE status = 'waiting_opponent' AND challenge_type = 'duel';

-- Indice para buscar desafios de grupo abertos
CREATE INDEX IF NOT EXISTS idx_p2p_open_groups ON p2p_challenges (challenge_type, status, is_public)
  WHERE status = 'active' AND challenge_type = 'group';

-- Indice para buscar por criador
CREATE INDEX IF NOT EXISTS idx_p2p_creator ON p2p_challenges (creator_id, created_at DESC);

-- Indice para buscar por oponente
CREATE INDEX IF NOT EXISTS idx_p2p_opponent ON p2p_challenges (opponent_id, created_at DESC);

-- Indice para invite code (lookup rapido)
CREATE UNIQUE INDEX IF NOT EXISTS idx_p2p_invite_code ON p2p_challenges (invite_code)
  WHERE invite_code IS NOT NULL;

-- Indice para expiracao (cron job)
CREATE INDEX IF NOT EXISTS idx_p2p_expires ON p2p_challenges (expires_at)
  WHERE status IN ('waiting_opponent', 'pending');

-- Indice para ranking (desafios completados)
CREATE INDEX IF NOT EXISTS idx_p2p_completed ON p2p_challenges (status, prize_pool DESC)
  WHERE status = 'completed';

-- =============================================================
-- Tabela de mensagens/chat dos desafios P2P
-- =============================================================

CREATE TABLE IF NOT EXISTS p2p_challenge_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES p2p_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  user_avatar TEXT,
  message TEXT NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 500),
  message_type TEXT NOT NULL DEFAULT 'chat' CHECK (message_type IN ('trash_talk', 'chat', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indice para mensagens por desafio
CREATE INDEX IF NOT EXISTS idx_p2p_messages_challenge ON p2p_challenge_messages (challenge_id, created_at ASC);

-- Indice para mensagens por utilizador
CREATE INDEX IF NOT EXISTS idx_p2p_messages_user ON p2p_challenge_messages (user_id, created_at DESC);

-- =============================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================

ALTER TABLE p2p_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_challenge_messages ENABLE ROW LEVEL SECURITY;

-- Politicas p2p_challenges
-- Qualquer utilizador autenticado pode ler desafios publicos
CREATE POLICY "Public challenges are readable by authenticated users"
  ON p2p_challenges FOR SELECT
  USING (is_public = true OR creator_id = auth.uid() OR opponent_id = auth.uid());

-- Criador pode inserir
CREATE POLICY "Users can create challenges"
  ON p2p_challenges FOR INSERT
  WITH CHECK (creator_id = auth.uid());

-- Criador e oponente podem atualizar
CREATE POLICY "Creator and opponent can update challenges"
  ON p2p_challenges FOR UPDATE
  USING (creator_id = auth.uid() OR opponent_id = auth.uid());

-- Mensagens: participantes do desafio podem ler
CREATE POLICY "Challenge participants can read messages"
  ON p2p_challenge_messages FOR SELECT
  USING (
    challenge_id IN (
      SELECT id FROM p2p_challenges 
      WHERE creator_id = auth.uid() OR opponent_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM p2p_challenges c 
      WHERE c.id = p2p_challenge_messages.challenge_id
      AND c.participants @> jsonb_build_object('user_id', auth.uid()::text)
    )
  );

-- Participantes podem enviar mensagens
CREATE POLICY "Users can send messages in their challenges"
  ON p2p_challenge_messages FOR INSERT
  WITH CHECK (
    challenge_id IN (
      SELECT id FROM p2p_challenges 
      WHERE creator_id = auth.uid() OR opponent_id = auth.uid()
    )
  );

-- =============================================================
-- FUNCTION: Auto-update updated_at timestamp
-- =============================================================

CREATE OR REPLACE FUNCTION update_p2p_challenge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_p2p_challenges_updated_at ON p2p_challenges;
CREATE TRIGGER trg_p2p_challenges_updated_at
  BEFORE UPDATE ON p2p_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_p2p_challenge_updated_at();

-- =============================================================
-- FUNCTION: Increment spectator count
-- =============================================================

CREATE OR REPLACE FUNCTION increment_p2p_spectators()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.spectator_count IS DISTINCT FROM OLD.spectator_count THEN
    RETURN NEW;
  END IF;
  NEW.spectator_count = COALESCE(OLD.spectator_count, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
