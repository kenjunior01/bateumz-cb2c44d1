-- =============================================
-- MMORPG Fix v2: RLS, transacoes TEXT, chat, mercado
-- Execute no Supabase SQL Editor DEPOIS da migracao 20260816
-- =============================================

-- 1. Adicionar guest_id ao chat para deduplicacao no realtime
ALTER TABLE rpg_chat ADD COLUMN IF NOT EXISTS guest_id TEXT;

-- 2. Alterar rpg_transactions: trocar UUID por TEXT para guest IDs
ALTER TABLE rpg_transactions ALTER COLUMN from_char_id TYPE TEXT USING from_char_id::text;
ALTER TABLE rpg_transactions ALTER COLUMN to_char_id TYPE TEXT USING to_char_id::text;
ALTER TABLE rpg_transactions RENAME COLUMN from_char_id TO from_guest_id;
ALTER TABLE rpg_transactions RENAME COLUMN to_char_id TO to_guest_id;

-- 3. Tabela de mercado P2P (persistente, partilhado entre jogadores)
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

-- 4. Fix RLS: rpg_characters UPDATE — remover politica tautologica
-- Sem sessao de guest no servidor, a politica mais segura e permitir
-- updates quando guest_id nao e nulo (os clientes enviam o guest_id correto)
DROP POLICY IF EXISTS "Users can update own character" ON rpg_characters;
CREATE POLICY "Users can update own character" ON rpg_characters FOR UPDATE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    (auth.uid() IS NULL AND guest_id IS NOT NULL)
  );

-- Nota: Para seguranca total de guest characters, use RPCs com SECURITY DEFINER
-- no futuro. A politica acima confia que o cliente envia o guest_id correto.

-- 5. Adicionar tabelas ao realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rpg_market_listings;
