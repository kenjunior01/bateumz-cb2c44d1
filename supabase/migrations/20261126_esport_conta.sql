-- ═══════════════════════════════════════════════════════════════════════
-- REA v91 — «E-SPORT SEGUE A CONTA» (torneios/ligas no servidor)
-- A fatia anotada desde a v86/v87: os torneios e ligas de E-SPORT que o
-- jogador cria/inscreve/termina no aparelho passam a seguir a CONTA entre
-- dispositivos. O aparelho continua a ser a fonte imediata (jogável sem
-- rede); o servidor guarda UMA linha por conta com o estado completo.
-- A aplicação é feita pelo utilizador (Dashboard → SQL Editor ou
-- supabase db push) — o cliente DETECTA a ausência da tabela (PGRST205)
-- e declara o estado honesto («migração pendente») em vez de fingir.
--
-- Honestidade desenhada no esquema:
--   · UMA linha por conta (PRIMARY KEY user_id) — o cliente faz UPSERT do
--     estado completo; o merge entre aparelhos é UNIÃO POR ID no núcleo
--     puro (src/lib/esportConta.ts): torneios de aparelhos diferentes
--     coexistem; o MESMO id vence o estado MAIS AVANÇADO (prémio
--     reclamado → estado → mais histórico → ts) e NUNCA mistura
--     participantes (declarado: mostra o mais avançado dos dois, nunca
--     soma o progresso de dois aparelhos no mesmo torneio);
--   · jogador_id é o BINDING: o id da conta que enviou o estado (trace do
--     vínculo convidado → conta; o servidor não confia nele para nada
--     além do registo);
--   · RLS: cada utilizador lê/escreve/apaga SÓ a própria linha;
--   · caps NO SERVIDOR (mesmos do núcleo): ≤ 12 torneios, ≤ 8 ligas —
--     os MESMOS tetos do aparelho (TETO_TORNEIOS/TETO_LIGAS do núcleo
--     v86); uma linha podre do cliente NUNCA entra;
--   · validação FINA dos objectos fica NO CLIENTE (hidratarTorneioEsport/
--     hidratarLigaEsport do núcleo v91: id/nome/jogo/estado/premio ≤ 5000/
--     rivais IA sempre etiquetados); o servidor valida só a FORMA
--     (arrays com os tetos do produto);
--   · as 4 CARTEIRAS continuam SEPARADAS por regra do produto: esta
--     tabela NÃO tem bilhetes, prémios nem saldo — os PRÉMIOS de e-sport
--     são Pontos Bateu pagos pela store da progressão (como na v86).
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.esport_conta (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- binding: id da conta que enviou o estado (≤60, vazio proibido)
  jogador_id TEXT NOT NULL CHECK (jogador_id <> '' AND length(jogador_id) <= 60),
  -- torneios do aparelho (≤12 — o MESMO teto do núcleo v86); validação fina
  -- dos objectos no cliente (hidratarTorneioEsport)
  torneios JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(torneios) = 'array' AND jsonb_array_length(torneios) <= 12),
  -- ligas do aparelho (≤8 — o MESMO teto do núcleo v86); validação fina no
  -- cliente (hidratarLigaEsport)
  ligas JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(ligas) = 'array' AND jsonb_array_length(ligas) <= 8),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS: o e-sport é privado e editável SÓ pelo dono ────────────────────
ALTER TABLE public.esport_conta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "esport_conta_select_own"
  ON public.esport_conta FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "esport_conta_insert_own"
  ON public.esport_conta FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "esport_conta_update_own"
  ON public.esport_conta FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "esport_conta_delete_own"
  ON public.esport_conta FOR DELETE
  USING (auth.uid() = user_id);

-- (sem SELECT/INSERT público: convidado NUNCA toca nesta tabela —
--  o núcleo da casa prova o perímetro; o aparelho guarda o seu estado)
