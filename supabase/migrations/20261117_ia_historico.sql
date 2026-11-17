-- ═══════════════════════════════════════════════════════════════════════
-- REA IA v58 — HISTÓRICO DA IA NO SERVIDOR (sincronização entre dispositivos)
-- O passo anotado desde a v54: o histórico do chat da IA (página /ia e o
-- NPC «Bateu IA» da Cidade Bateu) passa a viver no Supabase e segue o
-- utilizador ENTRE DISPOSITIVOS. A aplicação da migração é feita pelo
-- utilizador (Dashboard → SQL Editor ou supabase db push) — o cliente
-- DETECTA a ausência da tabela (PGRST205) e declara o estado honesto
-- («sincronização pendente da migração») em vez de fingir.
--
-- Honestidade desenhada no esquema:
--   · RLS: cada utilizador vê/escreve/apaga SÓ as próprias linhas;
--   · SEM UPDATE: o histórico é imutável no servidor — o cliente insere
--     no fim e apaga a sessão inteira quando o utilizador pede;
--   · UNIQUE (user_id, chave): a chave da mensagem é determinística e
--     estável (núcleo iaHistorico.ts) — reenviar o mesmo histórico NÃO
--     duplica linhas (push idempotente entre dispositivos);
--   · a persona (system) NUNCA é guardada: é reconstruída a cada envio;
--     guardamos só o personaId de cada pergunta (column persona) para
--     reconstruir a conversa importada noutro dispositivo;
--   · janela deslizante SERVER-SIDE (60 por sessão): a tabela nunca cresce
--     sem limite; o mais antigo sai quando o cap é ultrapassado;
--   · sem «null» mentiroso: raciocinio/tokens/persona são NULL quando não
--     existem — o cliente NUNCA os inventa.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ia_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- "ia" = página /ia (multi-conversa) · "npc" = Bateu IA na Cidade (praça)
  superficie TEXT NOT NULL CHECK (superficie IN ('ia', 'npc')),
  -- /ia: id da conversa (ConversaIa.id) · npc: "praca" (janela única)
  sessao TEXT NOT NULL CHECK (sessao <> '' AND length(sessao) <= 140),
  -- chave determinística (sessao:indice:papel:hash) — idempotente
  chave TEXT NOT NULL CHECK (chave <> '' AND length(chave) <= 140),
  papel TEXT NOT NULL CHECK (papel IN ('utilizador', 'assistente')),
  conteudo TEXT NOT NULL CHECK (length(conteudo) > 0 AND length(conteudo) <= 8000),
  raciocinio TEXT CHECK (raciocinio IS NULL OR length(raciocinio) <= 8000),
  tokens INTEGER CHECK (tokens IS NULL OR (tokens >= 0 AND tokens <= 200000)),
  persona TEXT CHECK (persona IS NULL OR length(persona) <= 60),
  -- ms desde epoch enviado pelo cliente (ordenar quando criada_em empata)
  criada_por_cliente BIGINT CHECK (criada_por_cliente IS NULL OR criada_por_cliente > 0),
  criada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, chave)
);

CREATE INDEX IF NOT EXISTS idx_ia_historico_sessao
  ON public.ia_historico (user_id, superficie, sessao, criada_em);

-- ── RLS: cada utilizador só toca nas próprias linhas ─────────────────────
ALTER TABLE public.ia_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ia_historico_select_own"
  ON public.ia_historico FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ia_historico_insert_own"
  ON public.ia_historico FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ia_historico_delete_own"
  ON public.ia_historico FOR DELETE
  USING (auth.uid() = user_id);

-- (sem UPDATE/sem SELECT público/sem INSERT anónimo: o histórico é
--  imutável e privado — a persona nunca é guardada no servidor)

-- ── Janela deslizante SERVER-SIDE: cap honesto 60 por sessão ─────────────
CREATE OR REPLACE FUNCTION public.ia_historico_janela()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  cap CONSTANT integer := 60;
BEGIN
  DELETE FROM public.ia_historico h
  WHERE h.user_id = NEW.user_id
    AND h.superficie = NEW.superficie
    AND h.sessao = NEW.sessao
    AND h.id NOT IN (
      SELECT i.id FROM public.ia_historico i
      WHERE i.user_id = NEW.user_id
        AND i.superficie = NEW.superficie
        AND i.sessao = NEW.sessao
      ORDER BY i.criada_em DESC, i.id DESC
      LIMIT cap
    );
  RETURN NEW;
END $$;

CREATE TRIGGER ia_historico_janela_guard
  AFTER INSERT ON public.ia_historico
  FOR EACH ROW EXECUTE FUNCTION public.ia_historico_janela();
