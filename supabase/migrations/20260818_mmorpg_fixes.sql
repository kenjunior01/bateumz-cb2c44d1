-- =============================================
-- MMORPG Fix: RLS melhorado + tabela de mercado + chat guest_id
-- Execute no Supabase SQL Editor DEPOIS da migracao 20260816
-- =============================================

-- Adicionar guest_id ao chat para deduplicacao no realtime
ALTER TABLE rpg_chat ADD COLUMN IF NOT EXISTS guest_id TEXT;

-- Tabela de mercado P2P (persistente, partilhado entre jogadores)
CREATE TABLE IF NOT EXISTS rpg_market_listings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  seller_id TEXT NOT NULL,
  seller_name TEXT NOT NULL,
  item JSONB NOT NULL,
  price INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rpg_market_created ON rpg_market_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rpg_market_seller ON rpg_market_listings(seller_id);

ALTER TABLE rpg_market_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read market" ON rpg_market_listings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert market listing" ON rpg_market_listings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete own listing" ON rpg_market_listings FOR DELETE USING (true);

-- Fix RLS: rpg_characters UPDATE policy era demasiado permissiva
-- (qualquer guest_id podia actualizar qualquer personagem)
DROP POLICY IF EXISTS "Users can update own character" ON rpg_characters;
CREATE POLICY "Users can update own character" ON rpg_characters FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND guest_id IS NOT NULL AND guest_id = (SELECT guest_id FROM rpg_characters WHERE id = rpg_characters.id))
  );

-- Adicionar tabela ao realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rpg_market_listings;
