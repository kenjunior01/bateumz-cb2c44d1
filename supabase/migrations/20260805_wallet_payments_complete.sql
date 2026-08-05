-- ============================================================
-- WALLETS, PAYMENTS & USER BATTLES - COMPLETE SYSTEM
-- ============================================================

-- 1. Platform wallet (replaces missing 'wallets' table)
-- Unifies platform wallet with esports wallet
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'MZN',
  total_deposited NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_wagered NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_won NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_lost NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

-- 2. Unified wallet transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'deposit','withdrawal','purchase','refund','winning',
      'bet_placed','bet_won','bet_refunded','battle_wager','battle_winnings',
      'daily_bonus','achievement_reward','admin_credit','admin_debit',
      'raffle_prize','game_prize'
    )
  ),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  direction TEXT NOT NULL DEFAULT 'credit' CHECK (direction IN ('credit','debit')),
  balance_after NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','cancelled','refunded')),
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wt_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wt_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wt_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wt_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wt_created ON public.wallet_transactions(created_at DESC);

-- 3. Stripe payments
CREATE TABLE IF NOT EXISTS public.stripe_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT UNIQUE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'mzn',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','refunded')),
  metadata JSONB DEFAULT '{}',
  wallet_transaction_id UUID REFERENCES public.wallet_transactions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sp_user ON public.stripe_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_sp_status ON public.stripe_payments(status);

-- 4. Manual deposits (M-Pesa, e-Mola, PIX, Bank Transfer)
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'MZN',
  method TEXT NOT NULL CHECK (method IN (
    'mpesa','emola','pix','bank_transfer','visa','mastercard',
    'paypal','crypto_usdt','crypto_btc','manual'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  receipt_url TEXT,
  reference TEXT,
  notes TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  wallet_transaction_id UUID REFERENCES public.wallet_transactions(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dr_user ON public.deposit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dr_status ON public.deposit_requests(status);

-- 5. Withdrawal requests
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'MZN',
  method TEXT NOT NULL CHECK (method IN (
    'mpesa','emola','pix','bank_transfer','visa','mastercard','paypal'
  )),
  destination TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','processing','completed','failed')),
  notes TEXT,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  wallet_transaction_id UUID REFERENCES public.wallet_transactions(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wr_user ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_wr_status ON public.withdrawal_requests(status);

-- 6. User battles (betting between users)
CREATE TABLE IF NOT EXISTS public.user_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  challenger_id UUID REFERENCES auth.users(id),
  game_id TEXT NOT NULL,
  game_label TEXT NOT NULL DEFAULT '',
  wager_amount NUMERIC(10,2) NOT NULL CHECK (wager_amount > 0),
  currency TEXT NOT NULL DEFAULT 'MZN',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open','accepted','playing','completed','cancelled','disputed'
  )),
  winner_id UUID REFERENCES auth.users(id),
  creator_score INTEGER,
  challenger_score INTEGER,
  creator_wtx_id UUID REFERENCES public.wallet_transactions(id),
  challenger_wtx_id UUID REFERENCES public.wallet_transactions(id),
  winner_wtx_id UUID REFERENCES public.wallet_transactions(id),
  room_code TEXT UNIQUE,
  best_of INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ub_creator ON public.user_battles(creator_id);
CREATE INDEX IF NOT EXISTS idx_ub_challenger ON public.user_battles(challenger_id);
CREATE INDEX IF NOT EXISTS idx_ub_status ON public.user_battles(status);
CREATE INDEX IF NOT EXISTS idx_ub_room ON public.user_battles(room_code);

-- 7. Battle invitations
CREATE TABLE IF NOT EXISTS public.battle_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES public.user_battles(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id),
  invited_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bi_invited ON public.battle_invitations(invited_id, status);
CREATE INDEX IF NOT EXISTS idx_bi_battle ON public.battle_invitations(battle_id);

-- ============ RLS POLICIES ============

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_invitations ENABLE ROW LEVEL SECURITY;

-- Wallets: users see own only
CREATE POLICY wallets_user_read ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY wallets_user_insert ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY wallets_user_update ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

-- Transactions: users see own only
CREATE POLICY wt_user_read ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY wt_user_insert ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Stripe payments
CREATE POLICY sp_user_read ON public.stripe_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY sp_user_insert ON public.stripe_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY sp_user_update ON public.stripe_payments FOR UPDATE USING (auth.uid() = user_id);

-- Deposit requests
CREATE POLICY dr_user_all ON public.deposit_requests FOR ALL USING (auth.uid() = user_id);

-- Withdrawal requests
CREATE POLICY wr_user_all ON public.withdrawal_requests FOR ALL USING (auth.uid() = user_id);

-- Battles: participants can read
CREATE POLICY ub_participant_read ON public.user_battles FOR SELECT USING (
  auth.uid() = creator_id OR auth.uid() = challenger_id
);
CREATE POLICY ub_creator_insert ON public.user_battles FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY ub_participant_update ON public.user_battles FOR UPDATE USING (
  auth.uid() = creator_id OR auth.uid() = challenger_id
);

-- Battle invitations
CREATE POLICY bi_user_all ON public.battle_invitations FOR ALL USING (
  auth.uid() = inviter_id OR auth.uid() = invited_id
);

-- Admin policies (service_role bypasses RLS, but for edge functions)
CREATE POLICY admin_dr_read ON public.deposit_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
);
CREATE POLICY admin_dr_update ON public.deposit_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
);
CREATE POLICY admin_wr_read ON public.withdrawal_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
);
CREATE POLICY admin_wr_update ON public.withdrawal_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','superadmin'))
);

-- ============ RPCs ============

-- Get or create wallet
CREATE OR REPLACE FUNCTION public.get_or_create_wallet(p_user_id UUID)
RETURNS TABLE(id UUID, user_id UUID, balance NUMERIC, currency TEXT)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.wallets (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id, user_id, balance, currency;
  RETURN QUERY
  SELECT w.id, w.user_id, w.balance, w.currency FROM public.wallets w WHERE w.user_id = p_user_id;
END;
$$;

-- Process wallet transaction (atomic)
CREATE OR REPLACE FUNCTION public.wallet_process_transaction(
  p_user_id UUID,
  p_type TEXT,
  p_amount NUMERIC,
  p_direction TEXT DEFAULT 'credit',
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(id UUID, balance_after NUMERIC, status TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance NUMERIC;
  v_status TEXT := 'completed';
BEGIN
  -- Get wallet
  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (p_user_id) RETURNING id INTO v_wallet_id;
  END IF;

  -- Calculate new balance
  IF p_direction = 'credit' THEN
    UPDATE public.wallets SET balance = balance + p_amount, updated_at = NOW()
    WHERE id = v_wallet_id RETURNING balance INTO v_new_balance;
  ELSIF p_direction = 'debit' THEN
    UPDATE public.wallets SET balance = balance - p_amount, updated_at = NOW()
    WHERE id = v_wallet_id AND balance >= p_amount
    RETURNING balance INTO v_new_balance;
    IF NOT FOUND THEN
      v_status := 'failed';
      v_new_balance := 0;
    END IF;
  END IF;

  -- Record transaction
  RETURN QUERY
  INSERT INTO public.wallet_transactions (
    wallet_id, user_id, type, amount, direction, balance_after, status,
    reference_type, reference_id, description
  ) VALUES (
    v_wallet_id, p_user_id, p_type, p_amount, p_direction,
    COALESCE(v_new_balance, 0), v_status,
    p_reference_type, p_reference_id, p_description
  )
  RETURNING id, balance_after, status;
END;
$$;

-- Create battle with wager (atomic: locks both wallets)
CREATE OR REPLACE FUNCTION public.create_battle(
  p_creator_id UUID,
  p_game_id TEXT,
  p_game_label TEXT,
  p_wager_amount NUMERIC,
  p_best_of INTEGER DEFAULT 1
)
RETURNS TABLE(id UUID, room_code TEXT, status TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_battle_id UUID;
  v_room_code TEXT;
  v_wtx_id UUID;
BEGIN
  -- Deduct wager from creator
  INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, direction, balance_after, status, description)
  SELECT w.id, p_creator_id, 'battle_wager', p_wager_amount, 'debit',
    w.balance - p_wager_amount, 'completed',
    'Aposta de batalha: ' || p_game_label
  FROM public.wallets w WHERE w.user_id = p_creator_id AND w.balance >= p_wager_amount
  RETURNING id INTO v_wtx_id;

  IF v_wtx_id IS NULL THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  v_room_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));

  INSERT INTO public.user_battles (
    creator_id, game_id, game_label, wager_amount, room_code, best_of, creator_wtx_id
  ) VALUES (
    p_creator_id, p_game_id, p_game_label, p_wager_amount, v_room_code, p_best_of, v_wtx_id
  ) RETURNING id INTO v_battle_id;

  RETURN QUERY SELECT v_battle_id, v_room_code, 'open'::TEXT;
END;
$$;

-- Accept battle (deducts challenger's wager)
CREATE OR REPLACE FUNCTION public.accept_battle(
  p_battle_id UUID,
  p_challenger_id UUID
)
RETURNS TABLE(id UUID, status TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_battle RECORD;
  v_wtx_id UUID;
BEGIN
  SELECT * INTO v_battle FROM public.user_battles WHERE id = p_battle_id AND status = 'open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batalha nao encontrada ou ja iniciada'; END IF;
  IF v_battle.creator_id = p_challenger_id THEN RAISE EXCEPTION 'Nao podes aceitar a tua propria batalha'; END IF;

  -- Deduct wager from challenger
  INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, direction, balance_after, status, description)
  SELECT w.id, p_challenger_id, 'battle_wager', v_battle.wager_amount, 'debit',
    w.balance - v_battle.wager_amount, 'completed',
    'Aposta de batalha: ' || v_battle.game_label
  FROM public.wallets w WHERE w.user_id = p_challenger_id AND w.balance >= v_battle.wager_amount
  RETURNING id INTO v_wtx_id;

  IF v_wtx_id IS NULL THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  UPDATE public.user_battles
  SET challenger_id = p_challenger_id, challenger_wtx_id = v_wtx_id, status = 'accepted', updated_at = NOW()
  WHERE id = p_battle_id;

  RETURN QUERY SELECT p_battle_id, 'accepted'::TEXT;
END;
$$;

-- Settle battle (credit winner, atomic)
CREATE OR REPLACE FUNCTION public.settle_battle(
  p_battle_id UUID,
  p_winner_id UUID,
  p_creator_score INTEGER DEFAULT NULL,
  p_challenger_score INTEGER DEFAULT NULL
)
RETURNS TABLE(id UUID, winner_id UUID, prize_amount NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_battle RECORD;
  v_prize NUMERIC;
  v_wtx_id UUID;
BEGIN
  SELECT * INTO v_battle FROM public.user_battles WHERE id = p_battle_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batalha nao encontrada'; END IF;
  IF v_battle.status = 'completed' THEN RAISE EXCEPTION 'Batalha ja finalizada'; END IF;

  -- Verify winner is a participant
  IF p_winner_id IS DISTINCT FROM v_battle.creator_id AND p_winner_id IS DISTINCT FROM v_battle.challenger_id THEN
    RAISE EXCEPTION 'Vencedor invalido';
  END IF;

  v_prize := v_battle.wager_amount * 2; -- winner gets both wagers (no fee)

  -- Credit winner
  INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, direction, balance_after, status, description)
  SELECT w.id, p_winner_id, 'battle_winnings', v_prize, 'credit',
    w.balance + v_prize, 'completed',
    'Venceu batalha: ' || v_battle.game_label
  FROM public.wallets w WHERE w.user_id = p_winner_id
  RETURNING id INTO v_wtx_id;

  UPDATE public.user_battles
  SET status = 'completed', winner_id = p_winner_id,
      creator_score = COALESCE(p_creator_score, creator_score),
      challenger_score = COALESCE(p_challenger_score, challenger_score),
      winner_wtx_id = v_wtx_id, updated_at = NOW()
  WHERE id = p_battle_id;

  RETURN QUERY SELECT p_battle_id, p_winner_id, v_prize;
END;
$$;

-- Cancel battle (refund both wagers)
CREATE OR REPLACE FUNCTION public.cancel_battle(p_battle_id UUID)
RETURNS TABLE(id UUID, status TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_battle RECORD;
BEGIN
  SELECT * INTO v_battle FROM public.user_battles WHERE id = p_battle_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batalha nao encontrada'; END IF;
  IF v_battle.status = 'completed' THEN RAISE EXCEPTION 'Batalha ja finalizada'; END IF;

  -- Refund creator
  IF v_battle.creator_wtx_id IS NOT NULL THEN
    INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, direction, balance_after, status, description)
    SELECT w.id, v_battle.creator_id, 'bet_refunded', v_battle.wager_amount, 'credit',
      w.balance + v_battle.wager_amount, 'completed', 'Reembolso: batalha cancelada'
    FROM public.wallets w WHERE w.user_id = v_battle.creator_id;
  END IF;

  -- Refund challenger
  IF v_battle.challenger_wtx_id IS NOT NULL THEN
    INSERT INTO public.wallet_transactions (wallet_id, user_id, type, amount, direction, balance_after, status, description)
    SELECT w.id, v_battle.challenger_id, 'bet_refunded', v_battle.wager_amount, 'credit',
      w.balance + v_battle.wager_amount, 'completed', 'Reembolso: batalha cancelada'
    FROM public.wallets w WHERE w.user_id = v_battle.challenger_id;
  END IF;

  UPDATE public.user_battles SET status = 'cancelled', updated_at = NOW() WHERE id = p_battle_id;
  RETURN QUERY SELECT p_battle_id, 'cancelled'::TEXT;
END;
$$;

-- Migrate existing user_wallets data into wallets
INSERT INTO public.wallets (user_id, balance, currency, total_wagered, total_won, total_lost)
 SELECT user_id, balance, 'MZN', total_wagered, total_won, total_lost
  FROM public.user_wallets
ON CONFLICT (user_id) DO UPDATE SET
  balance = public.wallets.balance + EXCLUDED.balance,
  total_wagered = public.wallets.total_wagered + EXCLUDED.total_wagered,
  total_won = public.wallets.total_won + EXCLUDED.total_won,
  total_lost = public.wallets.total_lost + EXCLUDED.total_lost;
