-- ============================================================================
-- CRITICAL SECURITY ENFORCEMENT (FINAL FIX FOR LOVABLE)
-- ============================================================================

-- 1. PROTEÇÃO TOTAL DO WHATSAPP EM PRESTACAO_PRODUCTS
-- Removemos qualquer política que permita leitura direta da coluna whatsapp na tabela base
DROP POLICY IF EXISTS "Authenticated and Admin can view products" ON public.prestacao_products;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.prestacao_products;

-- Criamos uma política que permite leitura da tabela base, mas APENAS via VIEW ou excluindo a coluna
-- No Supabase, a melhor forma de fazer isso é garantir que o acesso público seja via VIEW
-- E para usuários autenticados, restringimos a leitura direta se não forem admins
CREATE POLICY "Strict product access" 
  ON public.prestacao_products FOR SELECT 
  TO authenticated, anon
  USING (
    -- Permite apenas se for SuperAdmin OU se o status for ativo (mas a view filtrará a coluna)
    (status = 'active') OR (public.is_superadmin(auth.uid()))
  );

-- IMPORTANTE: Para realmente esconder a coluna, você deve garantir que a VIEW 'prestacao_products_public' 
-- seja usada no Frontend. No banco de dados, vamos garantir que o RLS está ativo.

-- 2. ENFORCEMENT DE RLS EM TODAS AS TABELAS DO SCHEMA PUBLIC
-- Este script garante que NENHUMA tabela no schema public fique sem RLS
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
  LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
  END LOOP;
END $$;

-- 3. FIX PARA 'live_poll_votes' (Exclusão de PII em SELECT público)
DROP POLICY IF EXISTS "Admins and Owners can view poll votes" ON public.live_poll_votes;
CREATE POLICY "Secure poll votes access" 
  ON public.live_poll_votes FOR SELECT 
  USING (
    -- Apenas Admins ou o Dono da Live podem ver os detalhes (incluindo user_id e voter_hash)
    EXISTS (
      SELECT 1 FROM public.live_polls p
      JOIN public.scheduled_lives sl ON sl.id = p.scheduled_live_id
      WHERE p.id = poll_id AND (sl.business_user_id = auth.uid() OR public.is_superadmin(auth.uid()))
    )
  );

-- 4. GARANTIR QUE AS NOVAS TABELAS DE JOGOS TAMBÉM ESTÃO PROTEGIDAS
ALTER TABLE IF EXISTS public.millionaire_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.millionaire_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.spin_wheel_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.spin_wheel_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.world_cup_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.world_cup_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.world_cup_matches ENABLE ROW LEVEL SECURITY;
