-- ============================================================
-- v15 — MENSALIDADE + STORIES FUNCIONAIS + ATIVIDADE AO VIVO
-- Modelo de negócio: EMPRESAS pagam uma mensalidade para usar a
-- plataforma profissionalmente; TODAS as outras pessoas usam grátis
-- para os seus fins (0% de comissão em tudo).
-- ============================================================

-- ------------------------------------------------------------
-- 1) COMISSÕES → 0% — o sustento da plataforma é a mensalidade
-- ------------------------------------------------------------
INSERT INTO public.platform_settings (key, value)
VALUES (
  'commissions',
  '{"raffle":0,"contest":0,"tournament":0,"marketplace":0,"sale":0,"challenge":0,"esports":0,"currency":"MZN"}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- ------------------------------------------------------------
-- 2) CATÁLOGO DE PLANOS (mensalidade) — ajustável pelo admin
-- ------------------------------------------------------------
INSERT INTO public.platform_settings (key, value)
VALUES (
  'plans',
  '{
    "free":      { "name": "Grátis",     "price": 0,    "tagline": "Para pessoas usarem a plataforma para os seus fins", "features": ["Jogos e RPG 3D", "Stories, feed e lives", "Participar em sorteios e concursos", "Criar eventos gratuitos", "Carteira e pontos"] },
    "business":  { "name": "Empresarial", "price": 1500, "tagline": "Para empresas venderem e promoverem todos os dias", "features": ["Tudo do Grátis", "Sorteios, concursos e campeonatos ilimitados", "Loja + prestações + alienação com a sua marca", "Stories comerciais com ofertas relâmpago", "Em destaque na home e no diretório", "Selo de empresa verificada"] },
    "corporate": { "name": "Corporativa", "price": 4500, "tagline": "Para marcas que querem o palco inteiro", "features": ["Tudo do Empresarial", "Mega destaque na home (herói)", "Campanhas com rodas e jogos da marca", "White-label no perfil da empresa", "Suporte prioritário dedicado", "Relatórios de desempenho"] }
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- ------------------------------------------------------------
-- 3) ASSINATURAS DE EMPRESA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL DEFAULT 'free' CHECK (plan_key IN ('free','business','corporate')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','past_due','canceled')),
  price_mnt NUMERIC(12,2) NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '3650 days',
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_subscriptions_select"
  ON public.company_subscriptions FOR SELECT
  TO authenticated
  USING (company_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "company_subscriptions_insert_own"
  ON public.company_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (company_id = auth.uid());

CREATE POLICY "company_subscriptions_update_own"
  ON public.company_subscriptions FOR UPDATE
  TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

GRANT SELECT ON public.company_subscriptions TO authenticated;

-- ------------------------------------------------------------
-- 4) PAGAMENTOS DE MENSALIDADE (histórico)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_key TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MZN',
  method TEXT NOT NULL DEFAULT 'wallet',
  period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_payments_select"
  ON public.subscription_payments FOR SELECT
  TO authenticated
  USING (company_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.subscription_payments TO authenticated;

-- 'subscription_payment' entra na lista de tipos da carteira
DO $$
DECLARE v_con text;
BEGIN
  SELECT conname INTO v_con FROM pg_constraint
   WHERE conrelid = 'public.wallet_transactions'::regclass
     AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%type IN%'
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
    'bonus','world_points_exchange','creator_payout','commission_charge',
    'contest_entry','tournament_entry','sale_income',
    'challenge_stake','challenge_winnings',
    'subscription_payment'
  )
);

-- ------------------------------------------------------------
-- 5) RPC subscribe_company — paga a mensalidade com o saldo da
--    carteira e estende o período em 30 dias (idempotente)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.subscribe_company(p_plan_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_cfg JSONB;
  v_price NUMERIC;
  v_balance NUMERIC;
  v_period_end TIMESTAMPTZ;
  v_from TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sessão necessária');
  END IF;
  IF p_plan_key NOT IN ('free','business','corporate') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Plano inválido');
  END IF;

  SELECT value INTO v_cfg FROM public.platform_settings WHERE key = 'plans';
  v_price := COALESCE((v_cfg -> p_plan_key ->> 'price')::numeric,
                      CASE p_plan_key WHEN 'business' THEN 1500 WHEN 'corporate' THEN 4500 ELSE 0 END);

  IF p_plan_key = 'free' THEN
    INSERT INTO public.company_subscriptions (company_id, plan_key, status, price_mnt, current_period_end)
    VALUES (v_user, 'free', 'active', 0, NOW() + INTERVAL '3650 days')
    ON CONFLICT (company_id) DO UPDATE
      SET plan_key = 'free', status = 'active', price_mnt = 0,
          canceled_at = NULL, updated_at = NOW();
    RETURN jsonb_build_object('ok', true, 'plan', 'free', 'price', 0);
  END IF;

  -- saldo suficiente? (bloqueio atómico)
  SELECT balance INTO v_balance FROM public.wallets WHERE user_id = v_user FOR UPDATE;
  IF v_balance IS NULL OR v_balance < v_price THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Saldo insuficiente na carteira', 'price', v_price);
  END IF;

  PERFORM public.wallet_process_transaction(
    v_user, 'subscription_payment', v_price, 'debit', 'subscription', NULL,
    'Mensalidade Bateu — plano ' || p_plan_key
  );

  -- se a assinatura ainda está viva, o novo período conta a partir do fim atual
  SELECT current_period_end INTO v_from
    FROM public.company_subscriptions
   WHERE company_id = v_user AND status = 'active' AND current_period_end > NOW();

  v_period_end := COALESCE(v_from, NOW()) + INTERVAL '30 days';

  INSERT INTO public.company_subscriptions (company_id, plan_key, status, price_mnt, started_at, current_period_end)
  VALUES (v_user, p_plan_key, 'active', v_price, NOW(), v_period_end)
  ON CONFLICT (company_id) DO UPDATE
    SET plan_key = EXCLUDED.plan_key,
        status = 'active',
        price_mnt = EXCLUDED.price_mnt,
        current_period_end = EXCLUDED.current_period_end,
        canceled_at = NULL,
        updated_at = NOW();

  INSERT INTO public.subscription_payments (company_id, plan_key, amount, method, period_start, period_end)
  VALUES (v_user, p_plan_key, v_price, 'wallet', COALESCE(v_from, NOW()), v_period_end);

  RETURN jsonb_build_object('ok', true, 'plan', p_plan_key, 'price', v_price, 'period_end', v_period_end);
END $$;

GRANT EXECUTE ON FUNCTION public.subscribe_company(TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 6) VENCEDORES PÚBLICOS (stories + feed) — contorna o RLS de
--    participants sem expor dados sensíveis
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_winners(p_limit INT DEFAULT 5)
RETURNS TABLE(
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  prize_title TEXT,
  raffle_slug TEXT,
  won_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pa.id,
    COALESCE(pp.display_name, 'Vencedor') AS display_name,
    pp.avatar_url,
    COALESCE(NULLIF(r.prize_title, ''), r.title, 'Prémio incrível') AS prize_title,
    r.slug AS raffle_slug,
    pa.created_at AS won_at
  FROM public.participants pa
  JOIN public.raffles r ON r.id = pa.raffle_id
  LEFT JOIN public.profiles_public pp ON pp.user_id = pa.user_id
  WHERE pa.status = 'winner'
  ORDER BY pa.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 5), 1), 20);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_winners(INT) TO anon, authenticated;

-- ------------------------------------------------------------
-- 7) ATIVIDADE RECENTE DA PLATAFORMA — feed vivo da home
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.platform_recent_activity AS
SELECT 'raffle'::text AS type,
       r.title AS title,
       COALESCE(NULLIF(r.prize_title, ''), 'Novo sorteio disponível') AS detail,
       '/raffle/' || COALESCE(r.slug, r.id::text) AS href,
       r.created_at AS created_at
FROM public.raffles r
WHERE r.status = 'active' AND r.created_at > NOW() - INTERVAL '7 days'
UNION ALL
SELECT 'winner',
       COALESCE(pp.display_name, 'Alguém') || ' venceu',
       COALESCE(NULLIF(r.prize_title, ''), r.title, 'Prémio incrível'),
       '/historico',
       pa.created_at
FROM public.participants pa
JOIN public.raffles r ON r.id = pa.raffle_id
LEFT JOIN public.profiles_public pp ON pp.user_id = pa.user_id
WHERE pa.status = 'winner' AND pa.created_at > NOW() - INTERVAL '7 days'
UNION ALL
SELECT 'contest',
       c.title,
       'Concurso aberto a participações',
       '/concursos/' || c.id::text,
       c.created_at
FROM public.contests c
WHERE c.status = 'active' AND c.created_at > NOW() - INTERVAL '7 days'
UNION ALL
SELECT 'tournament',
       t.name,
       'Campeonato com prémios aberto',
       '/tournaments/' || t.id::text,
       t.created_at
FROM public.tournaments t
WHERE t.status = 'active' AND t.created_at > NOW() - INTERVAL '7 days'
UNION ALL
SELECT 'business',
       COALESCE(NULLIF(p.company_name, ''), p.display_name, 'Uma empresa'),
       'Entrou no ecossistema de negócios',
       '/empresas',
       COALESCE(p.created_at, NOW())
FROM public.profiles p
WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'business')
  AND p.created_at > NOW() - INTERVAL '30 days'
LIMIT 40;

GRANT SELECT ON public.platform_recent_activity TO anon, authenticated;

-- ------------------------------------------------------------
-- 8) PULSO DO ECOSSISTEMA — agora também com mensalidades
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
  (SELECT COUNT(*) FROM public.creator_earnings WHERE status <> 'cancelled')            AS earnings_records,
  (SELECT COUNT(*) FROM public.company_subscriptions
     WHERE status = 'active' AND plan_key <> 'free' AND current_period_end > NOW())      AS business_subscribers,
  (SELECT COALESCE(SUM(price_mnt), 0) FROM public.company_subscriptions
     WHERE status = 'active' AND plan_key <> 'free' AND current_period_end > NOW())      AS monthly_revenue;

GRANT SELECT ON public.ecosystem_pulse TO anon, authenticated;

-- ------------------------------------------------------------
-- 9) STORIES — UPDATE policy (Destaques) + vídeos publicáveis
-- ------------------------------------------------------------
CREATE POLICY "Users can update own stories"
  ON public.user_stories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_stories DROP CONSTRAINT IF EXISTS user_stories_content_or_image;
ALTER TABLE public.user_stories ADD CONSTRAINT user_stories_content_or_image CHECK (
  (content IS NOT NULL AND length(trim(content)) > 0)
  OR image_url IS NOT NULL
  OR video_url IS NOT NULL
);
