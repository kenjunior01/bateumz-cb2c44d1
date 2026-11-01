-- ═══════════════════════════════════════════════════════════════════════
-- REA DESPORTO v24 — Palpites desportivos reais (parimutuel honesto)
-- Padrão: pool comunitário (tote/parimutuel) — quem acerta divide o prémio
-- proporcionalmente à aposta; liquidação SERVER-SIDE contra resultados
-- reais (TheSportsDB). Nunca Math.random; nunca liquidação no cliente.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sport_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  league_id TEXT NOT NULL,
  league_name TEXT NOT NULL,
  event_name TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_badge TEXT,
  away_badge TEXT,
  kickoff_at TIMESTAMPTZ NOT NULL,
  round INTEGER NOT NULL DEFAULT 0,
  season TEXT NOT NULL DEFAULT '',
  pick TEXT NOT NULL CHECK (pick IN ('home', 'draw', 'away')),
  stake NUMERIC NOT NULL CHECK (stake >= 5 AND stake <= 200),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'void')),
  payout NUMERIC NOT NULL DEFAULT 0,
  pool_total NUMERIC,
  pool_winners INTEGER,
  settled_result TEXT,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_sport_predictions_event ON public.sport_predictions (event_id);
CREATE INDEX IF NOT EXISTS idx_sport_predictions_user ON public.sport_predictions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sport_predictions_open ON public.sport_predictions (status, kickoff_at)
  WHERE status = 'open';

-- RLS: cada utilizador vê e cria apenas os próprios palpites
ALTER TABLE public.sport_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sport predictions"
  ON public.sport_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own sport predictions"
  ON public.sport_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- (sem UPDATE/DELETE no cliente: liquidação é exclusivamente service_role)

-- Guarda honesta: NADA de palpites depois do apito inicial (server-side)
CREATE OR REPLACE FUNCTION public.sport_prediction_kickoff_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.kickoff_at <= now() THEN
    RAISE EXCEPTION 'Palpites fechados: a partida ja comecou';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sport_prediction_kickoff ON public.sport_predictions;
CREATE TRIGGER trg_sport_prediction_kickoff
  BEFORE INSERT ON public.sport_predictions
  FOR EACH ROW EXECUTE FUNCTION public.sport_prediction_kickoff_guard();

-- Estatisticas públicas do pool (agregados apenas — sem dados de utilizadores)
-- A view corre com privilegios do dono: o anon vê os totais, nunca as linhas.
DROP VIEW IF EXISTS public.sport_prediction_stats;
CREATE VIEW public.sport_prediction_stats AS
SELECT
  event_id,
  max(league_name) AS league_name,
  max(event_name) AS event_name,
  max(kickoff_at) AS kickoff_at,
  count(*) FILTER (WHERE pick = 'home')::int AS picks_home,
  count(*) FILTER (WHERE pick = 'draw')::int AS picks_draw,
  count(*) FILTER (WHERE pick = 'away')::int AS picks_away,
  coalesce(sum(stake) FILTER (WHERE pick = 'home'), 0)::numeric AS pool_home,
  coalesce(sum(stake) FILTER (WHERE pick = 'draw'), 0)::numeric AS pool_draw,
  coalesce(sum(stake) FILTER (WHERE pick = 'away'), 0)::numeric AS pool_away,
  coalesce(sum(stake), 0)::numeric AS pool_total,
  count(*)::int AS picks_total
FROM public.sport_predictions
GROUP BY event_id;

GRANT SELECT ON public.sport_prediction_stats TO anon, authenticated;
