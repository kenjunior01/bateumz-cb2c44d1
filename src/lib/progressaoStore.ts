// ============================================================
// PROGRESSÃO BATEU (v78) — STORE DO APARELHO (wrapper fino)
// ────────────────────────────────────────────────────────────
// O núcleo (progressao.ts) é PURO; esta camada só lê/escreve o
// localStorage do aparelho e reage à autenticação. PADRÃO DA CASA
// (regionalBranding v72 → regionalCore v73): mesmas funções do
// núcleo, ZERO lógica própria.
// Honestidade do CONVIDADO: o progresso vive SÓ no aparelho
// (`bateu_progressao_v78`) e o painel declara-o.
//
// v84 — «O PROGRESSO SEGUE A CONTA»: ao iniciar sessão, o estado de
// convidado do aparelho é ABSORVIDO pela conta (merge por MÁXIMO do
// núcleo progressaoConta.ts — nunca dupla-conta), o cache passa para a
// chave POR CONTA (`…:u:<userId>`) e o estado sincroniza com o servidor
// (pull → merge → push). Estados honestos declarados no UI:
// convidado (ZERO pedidos) · aSincronizar · sincronizado · migração
// pendente (PGRST205) · erro com o motivo real. Nada é apagado sem ter
// sido somado; o ficheiro de convidado é limpo DEPOIS de absorvido.
// ============================================================
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  EstadoProgressao, estadoPadrao, hidratarProgressao, gerarMissoesDoDia,
  registarEvento, registrarPontosDeJogo, clamarMissao, avisoExpiracao,
  nivelDe, EventoProgressao, JogoCatalogo, Recomendacao, CarteirasVisao, Missao,
} from "./progressao";
import {
  absorverConvidado, chaveCacheConta, CODIGO_MIGRACAO_PENDENTE,
  deveEnviar, estadoParaLinha, impressaoEstado, linhaParaEstado,
} from "./progressaoConta";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const CHAVE = "bateu_progressao_v78"; // convidado (compatibilidade v78)

/** A mínima forma de supabase-js que o gestor usa (padrão ClientePostgrestLike
 *  da v58 — a tabela progressao_conta ainda não está nos types gerados e o
 *  cast mantém o módulo testável sem tocar o cliente real). */
interface ClienteProgressaoLike {
  from(tabela: string): {
    select(colunas?: string): {
      eq(coluna: string, valor: string): {
        maybeSingle(): Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
      };
    };
    upsert(linha: unknown, opcoes: { onConflict: string }): Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
  };
}
// o cast é resolvido POR CHAMADA (lazy — nunca no import do módulo)
const cliente = () => supabase as unknown as ClienteProgressaoLike;

function ler(chave: string, jogadorIdAgora = ""): EstadoProgressao {
  try {
    const cru = localStorage.getItem(chave);
    return hidratarProgressao(cru ? JSON.parse(cru) : null, jogadorIdAgora);
  } catch { return estadoPadrao(jogadorIdAgora); }
}
function gravar(chave: string, e: EstadoProgressao): void {
  try { localStorage.setItem(chave, JSON.stringify(e)); } catch { /* aparelho cheio → só memória */ }
  // v89 DESKTOP: anuncia o estado novo para TODAS as superfícies vivas (painel
  // compacto no hero) — quem ouve re-lê FRESCO da chave ativa, assim nenhum
  // receptor escreve nem confia num snapshot possivelmente velho.
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new CustomEvent("bateu:progressao")); } catch { /* ambiente sem eventos */ }
  }
}

// ── GESTOR DA CONTA (singleton do módulo — dedupe entre instâncias) ─────
export type EstadoSinc = "convidado" | "aSincronizar" | "sincronizado" | "migracao" | "erro";
export interface InfoSinc { sinc: EstadoSinc; motivo: string; em: number }

let infoSinc: InfoSinc = { sinc: "convidado", motivo: "", em: 0 };
const ouvintesSinc = new Set<() => void>();
// contexto = chave ativa + estado lido — trocam JUNTOS (uma notificação,
// um re-render, zero corridas entre a absorção e a re-leitura)
const ouvintesContexto = new Set<() => void>();
let usuarioAtivo: string | null = null;     // userId vinculado nesta página ("" nunca)
let vinculoEmCurso: Promise<void> | null = null;
let ultimaImpressaoEnviada: string | null = null;
let temporizadorEnvio: ReturnType<typeof setTimeout> | null = null;

function definirSinc(sinc: EstadoSinc, motivo = ""): void {
  infoSinc = { sinc, motivo: motivo.slice(0, 120), em: Date.now() };
  for (const fn of ouvintesSinc) fn();
}
function notificarContexto(): void { for (const fn of ouvintesContexto) fn(); }

function chaveAtiva(): string {
  return usuarioAtivo ? chaveCacheConta(usuarioAtivo) : CHAVE;
}

const DEBOUNCE_ENVIO_MS = 1200;

function enviarAgora(estado: EstadoProgressao, userId: string): Promise<void> {
  const linha = estadoParaLinha(estado, userId);
  if (!linha) return Promise.resolve();
  return (async () => {
    const { error } = await cliente()
      .from("progressao_conta")
      .upsert(linha, { onConflict: "user_id" });
    if (error) {
      if (error.code === CODIGO_MIGRACAO_PENDENTE) definirSinc("migracao", error.message);
      else definirSinc("erro", error.message || error.code || "upsert");
      return;
    }
    ultimaImpressaoEnviada = impressaoEstado(estado);
    definirSinc("sincronizado");
  })();
}

function agendarEnvio(estado: EstadoProgressao): void {
  if (!usuarioAtivo) return;
  const userId = usuarioAtivo;
  if (!deveEnviar(ultimaImpressaoEnviada, estado)) return; // só contadores do dia mudaram → zero pedidos
  if (temporizadorEnvio) clearTimeout(temporizadorEnvio);
  temporizadorEnvio = setTimeout(() => {
    temporizadorEnvio = null;
    void enviarAgora(estado, userId);
  }, DEBOUNCE_ENVIO_MS);
}

/** Vínculo CONVIDADO → CONTA: absorção (máximo) + pull → merge → push. */
function vincular(userId: string): Promise<void> {
  if (usuarioAtivo === userId) return vinculoEmCurso ?? Promise.resolve();
  usuarioAtivo = userId;
  notificarContexto(); // a store passa a ler/escrever a chave POR CONTA
  definirSinc("aSincronizar");
  vinculoEmCurso = (async () => {
    // 1) ABSORÇÃO: cache da conta ← merge por máximo com o estado de convidado
    const agora = Date.now();
    const convidado = ler(CHAVE);
    const conta = ler(chaveCacheConta(userId), userId);
    const unido = absorverConvidado(conta, convidado, userId, agora);
    gravar(chaveCacheConta(userId), unido);
    // limpar o ficheiro de convidado DEPOIS de absorvido (nada é apagado sem ter sido somado)
    if (convidado.pontos > 0 || convidado.missoes.length > 0 || convidado.missoesConcluidasTotal > 0) {
      try { localStorage.removeItem(CHAVE); } catch { /* sem storage → fica para a próxima */ }
    }
    notificarContexto(); // o estado absorvido chega ao UI (mesmo que a chave já fosse a da conta)
    // 2) PULL: o estado da conta no servidor entra no merge (máximo)
    let estadoFinal = unido;
    const { data, error } = await cliente()
      .from("progressao_conta")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      if (error.code === CODIGO_MIGRACAO_PENDENTE) { definirSinc("migracao", error.message); return; }
      definirSinc("erro", error.message || error.code || "select");
      return; // sem servidor → o aparelho é a fonte (declarado no UI)
    }
    const estadoServidor = linhaParaEstado(data, userId);
    if (estadoServidor) {
      estadoFinal = absorverConvidado(unido, estadoServidor, userId, Date.now());
      gravar(chaveCacheConta(userId), estadoFinal);
      notificarContexto(); // o merge com o servidor chega ao UI
    }
    // 3) PUSH: o resultado unido volta para o servidor (a conta fica igual em todo o lado)
    await enviarAgora(estadoFinal, userId);
  })().finally(() => { vinculoEmCurso = null; });
  return vinculoEmCurso;
}

function desligar(): void {
  if (temporizadorEnvio) { clearTimeout(temporizadorEnvio); temporizadorEnvio = null; }
  usuarioAtivo = null;
  ultimaImpressaoEnviada = null;
  vinculoEmCurso = null;
  definirSinc("convidado");
  notificarContexto(); // a store volta para a chave de convidado
}

function trocarUsuario(userId: string | null): Promise<void> {
  if (!userId) { if (usuarioAtivo) desligar(); return Promise.resolve(); }
  return vincular(userId);
}

/** Estado de sincronização observável (padrão iaContexto v82). */
export function useProgressaoSinc(): InfoSinc {
  return useSyncExternalStore(
    (fn) => { ouvintesSinc.add(fn); return () => ouvintesSinc.delete(fn); },
    () => infoSinc,
    () => infoSinc,
  );
}

/** Hook do aparelho: estado + ações (todas passam PELO NÚCLEO). */
export function useProgressao(agoraMs: number) {
  const { user, loading } = useAuth();
  const userId = user?.id ?? null;

  // a chave ativa (convidado ↔ conta) muda com o vínculo — a store re-lê
  const [chave, setChave] = useState(() => chaveAtiva());
  const [estado, setEstado] = useState<EstadoProgressao>(() => ler(chave));

  // contexto (chave + estado) trocam JUNTOS quando o vínculo muda ou o
  // gestor grava um merge novo (absorção/pull) — zero corridas
  useEffect(() => {
    const fn = () => {
      const k = chaveAtiva();
      setChave(k);
      setEstado(ler(k, usuarioAtivo ?? ""));
    };
    ouvintesContexto.add(fn);
    return () => { ouvintesContexto.delete(fn); };
  }, []);

  // v89: qualquer gravar() noutra superfície anuncia por `bateu:progressao` —
  // TODAS as instâncias ficam a ver o MESMO estado (re-leitura FRESCA da
  // chave ativa — nada de confiar em snapshots nem duplicar escritas).
  useEffect(() => {
    const onSync = () => {
      const k = chaveAtiva();
      setChave(k);
      setEstado(ler(k, usuarioAtivo ?? ""));
    };
    window.addEventListener("bateu:progressao", onSync);
    return () => window.removeEventListener("bateu:progressao", onSync);
  }, []);

  // v84: vincula/desliga quando a conta muda (a carga de auth resolve sozinha)
  useEffect(() => {
    if (loading) return; // auth ainda a resolver → nada (ZERO pedidos ao suspense)
    void trocarUsuario(userId);
  }, [userId, loading]);

  const guardar = useCallback((e: EstadoProgressao) => {
    setEstado(e);
    // v84 FURO do commit do vínculo fechado: o chave do closure pode estar
    // STALE (o vínculo corre SÍNCRONO no mesmo commit que monta o efeito-tick)
    // — a escrita usa a chave ATIVA no MOMENTO da chamada (o singleton é a
    // fonte de verdade de «para onde se escreve agora»).
    gravar(chaveAtiva(), e);
    agendarEnvio(e); // só dispara rede quando algo SINCRONIZÁVEL mudou (impressão)
  }, []);

  /** Leitura FRESCA do contexto ativo — mata todas as janelas de staleness
   *  (vínculo a meio de um commit, StrictMode, re-render pendente). */
  const lerFresco = useCallback(() => ler(chaveAtiva(), usuarioAtivo ?? ""), []);

  // as missões do dia re-agendam sozinhas a cada tick (determinístico) —
  // sempre sobre o estado FRESCO (o snapshot do render pode ser pré-vínculo)
  useEffect(() => {
    const atual = lerFresco();
    const e = gerarMissoesDoDia(atual, agoraMs);
    if (e !== atual) guardar(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agoraMs]);

  const jogar = useCallback((jogoId: string) => {
    guardar(registarEvento(lerFresco(), { t: "jogo", jogoId }, agoraMs));
  }, [agoraMs, guardar, lerFresco]);

  const vencer = useCallback((jogoId: string) => {
    guardar(registarEvento(lerFresco(), { t: "vitoria", jogoId }, agoraMs));
  }, [agoraMs, guardar, lerFresco]);

  const pontosDeJogo = useCallback((jogoId: string, pontos: number, teto: number) => {
    const r = registrarPontosDeJogo(lerFresco(), jogoId, pontos, teto, agoraMs);
    guardar(r.estado);
    return r;
  }, [agoraMs, guardar, lerFresco]);

  const reclamar = useCallback((missaoId: string) => {
    const r = clamarMissao(lerFresco(), missaoId, agoraMs);
    guardar(r.estado);
    return r;
  }, [agoraMs, guardar, lerFresco]);

  /** UMA partida do jogador → UMA transição de estado atómica:
   *  jogo (+ vitória) → progresso das missões, pontos com o TETO do jogo.
   *  Os jogos chamam isto no fim da partida (o kart no payout). */
  const registrarPartida = useCallback((jogoId: string, opts: { vitoria?: boolean; pontos?: number; teto?: number }) => {
    let e = registarEvento(lerFresco(), { t: "jogo", jogoId }, agoraMs);
    if (opts.vitoria) e = registarEvento(e, { t: "vitoria", jogoId }, agoraMs);
    if (typeof opts.pontos === "number" && (opts.teto ?? 0) > 0) {
      e = registrarPontosDeJogo(e, jogoId, opts.pontos, opts.teto!, agoraMs).estado;
    }
    guardar(e);
  }, [agoraMs, guardar, lerFresco]);

  return { estado, nivel: nivelDe(estado.pontos), jogar, vencer, pontosDeJogo, reclamar, registrarPartida, avisoExpiracao };
}
export type { EstadoProgressao, Missao, JogoCatalogo, Recomendacao, CarteirasVisao, EventoProgressao };
