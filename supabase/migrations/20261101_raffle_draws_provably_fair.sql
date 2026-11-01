-- ═══════════════════════════════════════════════════════════════════════
-- REA SORTEIOS — Sorteios Provably Fair de classe mundial (commit-reveal)
-- Padrão: SHA-256(server_seed) publicado ANTES do sorteio (compromisso),
-- vencedor = HMAC-SHA256(server_seed, "client_seed:nonce") mod N,
-- server_seed revelado DEPOIS → qualquer participante verifica no browser.
-- Referências: protocolo provably-fair (commit-and-reveal, FIPS 180-4).
-- ═══════════════════════════════════════════════════════════════════════

-- 1) Compromisso público (o server_seed NUNCA fica aqui antes do reveal)
CREATE TABLE IF NOT EXISTS public.raffle_draw_commits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  server_seed_hash TEXT NOT NULL,
  client_seed TEXT NOT NULL,
  nonce INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'committed' CHECK (status IN ('committed', 'revealed')),
  committed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revealed_at TIMESTAMPTZ,
  UNIQUE (raffle_id, nonce)
);

-- 2) Resultado completo (server_seed revelado + vencedor + fórmula)
CREATE TABLE IF NOT EXISTS public.raffle_draw_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commit_id UUID NOT NULL REFERENCES public.raffle_draw_commits(id) ON DELETE CASCADE,
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  server_seed TEXT NOT NULL,
  winner_participant_id UUID,
  winner_ticket INTEGER,
  winner_user_id UUID,
  participants_count INTEGER NOT NULL DEFAULT 0,
  draw_index INTEGER NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'hmac_sha256_commit_reveal',
  formula TEXT NOT NULL,
  revealed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: leitura pública (transparência total), escrita só service_role
ALTER TABLE public.raffle_draw_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_draw_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view draw commits"
  ON public.raffle_draw_commits FOR SELECT USING (true);
CREATE POLICY "Anyone can view draw results"
  ON public.raffle_draw_results FOR SELECT USING (true);

-- Sementes em claro durante a fase de compromisso — NUNCA legíveis publicamente
CREATE TABLE IF NOT EXISTS public.raffle_draw_seeds (
  commit_hash TEXT PRIMARY KEY,
  server_seed TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.raffle_draw_seeds ENABLE ROW LEVEL SECURITY;
-- Sem policies de SELECT/INSERT: apenas service_role acede.

CREATE INDEX IF NOT EXISTS idx_draw_commits_raffle ON public.raffle_draw_commits(raffle_id);
CREATE INDEX IF NOT EXISTS idx_draw_results_raffle ON public.raffle_draw_results(raffle_id);

-- 3) Check-in de torneios (padrão Battlefy: só quem faz check-in entra no bracket)
ALTER TABLE public.tournament_participants
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Check-in server-side: janela abre 60 min antes do início e fecha no fim
CREATE OR REPLACE FUNCTION public.check_in_tournament(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_tournament public.tournaments%ROWTYPE;
  v_part public.tournament_participants%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF v_tournament.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_active');
  END IF;
  SELECT * INTO v_part FROM public.tournament_participants
    WHERE tournament_id = p_tournament_id AND user_id = v_user;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_joined');
  END IF;
  IF v_part.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_checked_in');
  END IF;
  IF v_tournament.start_date IS NULL OR now() < v_tournament.start_date - INTERVAL '60 minutes' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'window_not_open');
  END IF;
  IF v_tournament.end_date IS NOT NULL AND now() > v_tournament.end_date THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_ended');
  END IF;
  UPDATE public.tournament_participants
    SET checked_in_at = now()
    WHERE tournament_id = p_tournament_id AND user_id = v_user;
  RETURN jsonb_build_object('ok', true, 'checked_in_at', now());
END;
$$;

-- Estado do check-in do utilizador autenticado
CREATE OR REPLACE FUNCTION public.tournament_checkin_status(p_tournament_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checked TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('checked_in', false);
  END IF;
  SELECT checked_in_at INTO v_checked FROM public.tournament_participants
    WHERE tournament_id = p_tournament_id AND user_id = auth.uid();
  RETURN jsonb_build_object('checked_in', v_checked IS NOT NULL, 'checked_in_at', v_checked);
END;
$$;
