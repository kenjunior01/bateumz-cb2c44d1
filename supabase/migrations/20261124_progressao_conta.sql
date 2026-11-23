-- ═══════════════════════════════════════════════════════════════════════
-- REA v84 — «O PROGRESSO SEGUE A CONTA» (binding jogadorId + servidor)
-- A fatia anotada desde a v83: o progresso do jogador (pontos, missões
-- do dia, total de missões concluídas) passa a seguir a CONTA entre
-- dispositivos. O aparelho continua a ser a fonte imediata (jogável sem
-- rede); o servidor é a fonte de verdade da progressão sincronizada.
-- A aplicação é feita pelo utilizador (Dashboard → SQL Editor ou
-- supabase db push) — o cliente DETECTA a ausência da tabela (PGRST205)
-- e declara o estado honesto («migração pendente») em vez de fingir.
--
-- Honestidade desenhada no esquema:
--   · UMA linha por conta (PRIMARY KEY user_id) — o cliente faz UPSERT
--     do estado completo; o merge entre aparelhos é MÁXIMO no núcleo
--     puro (src/lib/progressaoConta.ts): pontos NUNCA descem, NUNCA
--     dupla-contam (documentado: jogadas paralelas em dois aparelhos
--     contam o maior, nunca a soma);
--   · jogador_id é o BINDING: o id do jogador do aparelho que enviou
--     o estado (trace do vínculo convidado → conta; o servidor não
--     confia nele para nada além do registo);
--   · RLS: cada utilizador lê/escreve/apaga SÓ a própria linha;
--   · caps NO SERVIDOR (mesmos do núcleo): pontos ≤ 2 000 000,
--     missões ≤ 12, total de missões ≤ 100 000 — uma linha podre do
--     cliente NUNCA entra;
--   · as 4 CARTEIRAS continuam SEPARADAS por regra do produto: esta
--     tabela NÃO tem bilhetes, prémios nem saldo — só a progressão de
--     PONTOS (bilhetes/prémios/saldo vivem nas suas camadas próprias).
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.progressao_conta (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- binding: id do jogador do aparelho que enviou (≤60, vazio proibido)
  jogador_id TEXT CHECK (jogador_id IS NULL OR (jogador_id <> '' AND length(jogador_id) <= 60)),
  pontos INTEGER NOT NULL DEFAULT 0 CHECK (pontos >= 0 AND pontos <= 2000000),
  missoes_concluidas_total INTEGER NOT NULL DEFAULT 0 CHECK (missoes_concluidas_total >= 0 AND missoes_concluidas_total <= 100000),
  -- missões do dia correntes (array de objectos; validação fina no cliente)
  missoes JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(missoes) = 'array' AND jsonb_array_length(missoes) <= 12),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS: a progressão é privada e editável SÓ pelo dono ────────────────
ALTER TABLE public.progressao_conta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progressao_conta_select_own"
  ON public.progressao_conta FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "progressao_conta_insert_own"
  ON public.progressao_conta FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "progressao_conta_update_own"
  ON public.progressao_conta FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "progressao_conta_delete_own"
  ON public.progressao_conta FOR DELETE
  USING (auth.uid() = user_id);

-- (sem SELECT/INSERT público: convidado NUNCA toca nesta tabela —
--  o núcleo da casa prova o perímetro; o aparelho guarda o seu estado)
