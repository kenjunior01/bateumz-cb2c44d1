-- ============================================================
-- BATEU v14 — ECOSSISTEMA EM HARMONIA
-- Monetização unificada: comissões reais da plataforma,
-- ganhos de criadores/empresas, torneios vivos com inscrição,
-- concursos com taxa cobrável e sorteios por pontos.
-- ============================================================

-- ------------------------------------------------------------
-- 1) FIX wallet_transactions: aceitar todos os tipos do ecossistema
--    ('bonus', 'world_points_exchange', etc. falhavam no CHECK antigo)
-- ------------------------------------------------------------
DO $$
DECLARE
  v_con text;
BEGIN
  SELECT conname INTO v_con
    FROM pg_constraint
   WHERE conrelid = 'public.wallet_transactions'::regclass
     AND contype = 'c'
     AND pg_get_constraintdef(oid) LIKE '%type IN%'
   LIMIT 1;

  IF v_con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.wallet_transactions DROP CONSTRAINT %I', v_con);
  END IF;
END $$;

ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check CHECK (
  type IN (
    'deposit','withdrawal','purchase','refund','winning',
    'bet_placed','bet_won','bet_refunded','battle_wager','battle_winnings',
    'daily_bonus','achievement_reward','admin_credit','admin_debit',
    'raffle_prize','game_prize',
    -- ecossistema v14
    'bonus','world_points_exchange','creator_payout','commission_charge',
    'contest_entry','tournament_entry','sale_income',
    'challenge_stake','challenge_winnings'
  )
);

-- ------------------------------------------------------------
-- 2) GANHOS DE CRIADORES — cada venda/evento gera um registo
--    gross → (− comissão da plataforma) → net do criador
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'raffle','contest','tournament','marketplace','sale','challenge','esports','other'
  )),
  source_id UUID,
  title TEXT,
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MZN',
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('pending','available','paid','cancelled')),
  paid_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ce_user ON public.creator_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_ce_source ON public.creator_earnings(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_ce_created ON public.creator_earnings(created_at);

ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_earnings' AND policyname = 'creator_earnings_owner_read') THEN
    CREATE POLICY creator_earnings_owner_read ON public.creator_earnings
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_earnings' AND policyname = 'creator_earnings_admin_read') THEN
    CREATE POLICY creator_earnings_admin_read ON public.creator_earnings
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'creator_earnings' AND policyname = 'creator_earnings_admin_update') THEN
    CREATE POLICY creator_earnings_admin_update ON public.creator_earnings
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'admin')
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3) CONFIGURAÇÃO DAS COMISSÕES (o admin pode afinar em platform_settings)
-- ------------------------------------------------------------
INSERT INTO public.platform_settings (key, value)
VALUES (
  'commissions',
  '{
    "raffle": 5,
    "contest": 5,
    "tournament": 5,
    "marketplace": 10,
    "sale": 10,
    "challenge": 5,
    "esports": 5,
    "currency": "MZN"
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- ------------------------------------------------------------
-- 4) TORNEIOS VIVOS — tabelas que faltavam + inscrição funcional
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed','cancelled')),
  prize_description TEXT,
  prize_value NUMERIC(12,2),
  currency TEXT DEFAULT 'MZN',
  max_participants INTEGER,
  rules TEXT,
  entry_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  game_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','withdrawn','disqualified')),
  fee_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.tournament_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  total_points INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tp_tournament ON public.tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_ts_tournament ON public.tournament_standings(tournament_id, total_points DESC);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_standings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tournaments' AND policyname = 'tournaments_public_read') THEN
    CREATE POLICY tournaments_public_read ON public.tournaments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tournaments' AND policyname = 'tournaments_owner_write') THEN
    CREATE POLICY tournaments_owner_write ON public.tournaments
      FOR ALL USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tournament_participants' AND policyname = 'tp_public_read') THEN
    CREATE POLICY tp_public_read ON public.tournament_participants FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tournament_standings' AND policyname = 'ts_public_read') THEN
    CREATE POLICY ts_public_read ON public.tournament_standings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tournament_standings' AND policyname = 'ts_owner_write') THEN
    CREATE POLICY ts_owner_write ON public.tournament_standings
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Pontos de classificação (usado pelos resultados de jogos/lives)
CREATE OR REPLACE FUNCTION public.add_tournament_points(
  p_tournament_id uuid,
  p_user_id uuid,
  p_points integer,
  p_wins integer DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tournament_standings
    (tournament_id, user_id, total_points, games_played, wins, updated_at)
  VALUES
    (p_tournament_id, p_user_id, p_points, 1, p_wins, now())
  ON CONFLICT (tournament_id, user_id) DO UPDATE SET
    total_points = public.tournament_standings.total_points + EXCLUDED.total_points,
    games_played = public.tournament_standings.games_played + 1,
    wins = public.tournament_standings.wins + EXCLUDED.wins,
    updated_at = now();
END;
$$;

-- INSCRIÇÃO EM TORNEIO (grátis ou com taxa da carteira → ganho do organizador)
CREATE OR REPLACE FUNCTION public.join_tournament(p_tournament_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_t record;
  v_count integer;
  v_fee numeric;
  v_wallet uuid;
  v_pct numeric;
  v_fee_amt numeric;
  v_net numeric;
BEGIN
  SELECT auth.uid() INTO v_user;
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_t FROM public.tournaments WHERE id = p_tournament_id;
  IF v_t.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF v_t.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_active');
  END IF;
  IF v_t.end_date < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_ended');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tournament_participants
     WHERE tournament_id = p_tournament_id AND user_id = v_user
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_joined');
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.tournament_participants
   WHERE tournament_id = p_tournament_id AND status = 'active';
  IF v_t.max_participants IS NOT NULL AND v_count >= v_t.max_participants THEN
    RETURN jsonb_build_object('ok', false, 'error', 'full');
  END IF;

  v_fee := COALESCE(v_t.entry_fee, 0);

  IF v_fee > 0 THEN
    -- paga com o saldo da carteira (dinheiro real)
    SELECT id INTO v_wallet FROM public.wallets WHERE user_id = v_user LIMIT 1;
    IF v_wallet IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'no_wallet');
    END IF;

    UPDATE public.wallets
       SET balance = balance - v_fee, updated_at = now()
     WHERE id = v_wallet AND balance >= v_fee AND is_frozen = false;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance');
    END IF;

    INSERT INTO public.wallet_transactions
      (wallet_id, user_id, type, amount, direction, balance_after, status,
       reference_type, reference_id, description)
    VALUES
      (v_wallet, v_user, 'tournament_entry', v_fee, 'debit',
       (SELECT balance FROM public.wallets WHERE id = v_wallet),
       'completed', 'tournament', p_tournament_id,
       'Inscrição no torneio: ' || v_t.name);

    -- comissão da plataforma (5% por omissão) e ganho do organizador
    v_pct := COALESCE(
      (SELECT (value->>'tournament')::numeric FROM public.platform_settings WHERE key = 'commissions'),
      5
    );
    v_fee_amt := ROUND(v_fee * v_pct / 100.0, 2);
    v_net := v_fee - v_fee_amt;

    INSERT INTO public.creator_earnings
      (user_id, source_type, source_id, title, gross_amount, platform_fee,
       net_amount, currency, commission_percent, status)
    VALUES
      (v_t.business_id, 'tournament', p_tournament_id, v_t.name,
       v_fee, v_fee_amt, v_net, COALESCE(v_t.currency, 'MZN'), v_pct, 'available');
  END IF;

  INSERT INTO public.tournament_participants (tournament_id, user_id, fee_paid)
  VALUES (p_tournament_id, v_user, v_fee)
  ON CONFLICT (tournament_id, user_id) DO NOTHING;

  INSERT INTO public.tournament_standings (tournament_id, user_id, total_points, games_played, wins)
  VALUES (p_tournament_id, v_user, 0, 0, 0)
  ON CONFLICT (tournament_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'fee_paid', v_fee);
END;
$$;

-- ------------------------------------------------------------
-- 5) CONCURSOS — cobrar taxa de inscrição com o saldo da carteira
-- ------------------------------------------------------------
ALTER TABLE public.contests ADD COLUMN IF NOT EXISTS entry_fee NUMERIC(12,2) NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.contest_entries_paid (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contest_id, user_id)
);

ALTER TABLE public.contest_entries_paid ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contest_entries_paid' AND policyname = 'cep_owner_read') THEN
    CREATE POLICY cep_owner_read ON public.contest_entries_paid
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.pay_contest_entry(p_contest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_c record;
  v_wallet uuid;
  v_pct numeric;
  v_fee_amt numeric;
  v_net numeric;
BEGIN
  SELECT auth.uid() INTO v_user;
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_c FROM public.contests WHERE id = p_contest_id;
  IF v_c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF COALESCE(v_c.entry_fee, 0) <= 0 THEN
    RETURN jsonb_build_object('ok', true, 'amount', 0, 'free', true);
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contest_entries_paid
     WHERE contest_id = p_contest_id AND user_id = v_user
  ) THEN
    RETURN jsonb_build_object('ok', true, 'amount', 0, 'already_paid', true);
  END IF;

  SELECT id INTO v_wallet FROM public.wallets WHERE user_id = v_user LIMIT 1;
  IF v_wallet IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_wallet');
  END IF;

  UPDATE public.wallets
     SET balance = balance - v_c.entry_fee, updated_at = now()
   WHERE id = v_wallet AND balance >= v_c.entry_fee AND is_frozen = false;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance');
  END IF;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, type, amount, direction, balance_after, status,
     reference_type, reference_id, description)
  VALUES
    (v_wallet, v_user, 'contest_entry', v_c.entry_fee, 'debit',
     (SELECT balance FROM public.wallets WHERE id = v_wallet),
     'completed', 'contest', p_contest_id,
     'Taxa de inscrição no concurso: ' || v_c.title);

  INSERT INTO public.contest_entries_paid (contest_id, user_id, amount)
  VALUES (p_contest_id, v_user, v_c.entry_fee);

  v_pct := COALESCE(
    (SELECT (value->>'contest')::numeric FROM public.platform_settings WHERE key = 'commissions'),
    5
  );
  v_fee_amt := ROUND(v_c.entry_fee * v_pct / 100.0, 2);
  v_net := v_c.entry_fee - v_fee_amt;

  INSERT INTO public.creator_earnings
    (user_id, source_type, source_id, title, gross_amount, platform_fee,
     net_amount, currency, commission_percent, status)
  VALUES
    (v_c.created_by, 'contest', p_contest_id, v_c.title,
     v_c.entry_fee, v_fee_amt, v_net, 'MZN', v_pct, 'available');

  RETURN jsonb_build_object('ok', true, 'amount', v_c.entry_fee);
END;
$$;

-- ------------------------------------------------------------
-- 6) SORTEIOS POR PONTOS — comprar bilhetes com Pontos da Sorte
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.buy_points_raffle_tickets(
  p_raffle_id uuid,
  p_count integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_r record;
  v_balance integer;
  v_cost integer;
  v_taken integer[];
  v_nums integer[] := '{}';
  v_i integer;
  v_n integer;
BEGIN
  SELECT auth.uid() INTO v_user;
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_count IS NULL OR p_count < 1 OR p_count > 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_count');
  END IF;

  SELECT * INTO v_r FROM public.raffles WHERE id = p_raffle_id;
  IF v_r.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  IF v_r.raffle_type <> 'points' OR COALESCE(v_r.points_cost, 0) <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_points_raffle');
  END IF;
  IF v_r.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_active');
  END IF;

  v_cost := v_r.points_cost * p_count;

  SELECT COALESCE(SUM(points), 0) INTO v_balance
    FROM public.luck_points WHERE user_id = v_user;
  IF v_balance < v_cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_points',
      'balance', v_balance, 'cost', v_cost);
  END IF;

  -- bilhetes já vendidos
  SELECT COALESCE(array_agg(ticket_number), '{}') INTO v_taken
    FROM public.participants WHERE raffle_id = p_raffle_id;

  -- comprar automaticamente os primeiros números livres
  v_i := 0;
  v_n := 1;
  WHILE v_i < p_count AND v_n <= v_r.total_tickets LOOP
    IF NOT (v_n = ANY(v_taken)) THEN
      v_nums := array_append(v_nums, v_n);
      v_i := v_i + 1;
    END IF;
    v_n := v_n + 1;
  END LOOP;

  IF array_length(v_nums, 1) < p_count THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sold_out');
  END IF;

  INSERT INTO public.participants (raffle_id, user_id, ticket_number, payment_status)
  SELECT p_raffle_id, v_user, n, 'paid' FROM unnest(v_nums) AS n;

  -- débito dos pontos (entrada negativa na conta de pontos)
  INSERT INTO public.luck_points (user_id, points, action, description)
  VALUES (v_user, -v_cost, 'raffle_points_entry',
          'Bilhetes de sorteio por pontos: ' || v_r.title);

  UPDATE public.raffles
     SET sold_tickets = COALESCE(sold_tickets, 0) + p_count
   WHERE id = p_raffle_id;

  RETURN jsonb_build_object('ok', true, 'tickets', v_nums, 'cost', v_cost);
END;
$$;

-- ------------------------------------------------------------
-- 7) PULSO DO ECOSSISTEMA — métricas agregadas públicas (home harmoniosa)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.ecosystem_pulse AS
SELECT
  (SELECT COUNT(*) FROM public.raffles WHERE status = 'active')                          AS active_raffles,
  (SELECT COUNT(*) FROM public.contests WHERE status = 'active')                        AS active_contests,
  (SELECT COUNT(*) FROM public.tournaments WHERE status = 'active')                     AS active_tournaments,
  (SELECT COALESCE(SUM(prize_value), 0) FROM public.raffles WHERE status = 'active')    AS prize_pool,
  (SELECT COUNT(*) FROM public.profiles)                                                AS members,
  (SELECT COUNT(DISTINCT b) FROM (
     SELECT business_user_id AS b FROM public.raffles WHERE business_user_id IS NOT NULL
     UNION
     SELECT created_by AS b FROM public.contests WHERE created_by IS NOT NULL
     UNION
     SELECT business_id AS b FROM public.tournaments WHERE business_id IS NOT NULL
   ) emp)                                                                                AS businesses,
  (SELECT COALESCE(SUM(net_amount), 0) FROM public.creator_earnings
     WHERE status <> 'cancelled')                                                       AS creators_net,
  (SELECT COALESCE(SUM(platform_fee), 0) FROM public.creator_earnings
     WHERE status <> 'cancelled')                                                       AS platform_commissions,
  (SELECT COUNT(*) FROM public.creator_earnings WHERE status <> 'cancelled')            AS earnings_records;
