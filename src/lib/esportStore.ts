// ============================================================
// E-SPORT BATEU (v86) — STORE DO APARELHO → CONTA (v91)
// ────────────────────────────────────────────────────────────
// O núcleo (esport.ts) continua PURO e dono das regras; o núcleo da
// sincronização (esportConta.ts) é PURO e provado no Node. Esta camada
// liga os dois à rede e à sessão — PADRÃO DA CASA v84
// (progressaoStore/progressaoConta): mesmas funções do núcleo, ZERO
// lógica própria.
//
// v91 — «E-SPORT SEGUE A CONTA»: ao iniciar sessão, os torneios/ligas
// de convidado do aparelho são ABSORVIDOS pela conta (união por id do
// núcleo esportConta.ts), o cache passa para a chave POR CONTA
// (`bateu_esport_v1:u:<userId>`) e o estado sincroniza com o servidor
// (pull → merge → push). Estados honestos declarados no UI:
// convidado (ZERO pedidos) · aSincronizar · sincronizado · migração
// pendente (PGRST205) · erro com o motivo real. Nada é apagado sem ter
// sido somado; o ficheiro de convidado é limpo DEPOIS de absorvido.
// Cada gravação do núcleo (criar/inscrever/iniciar/claim/partida) agenda
// um push com DEDUPE por impressão + debounce — o mesmo prémio nunca é
// pago duas vezes porque `premioReclamado` vence no merge e viaja.
// ============================================================
import { useSyncExternalStore } from "react";
import { CHAVE_ESPORT, definirChaveEsportAtiva, definirAoGuardarEsport, type EstadoEsport } from "./esport";
import {
  CODIGO_MIGRACAO_PENDENTE, chaveCacheContaEsport, absorverConvidadoEsport,
  deveEnviarEsport, estadoParaLinhaEsport, hidratarEstadoEsport, impressaoEstadoEsport,
  linhaParaEstadoEsport,
} from "./esportConta";
import { supabase } from "@/integrations/supabase/client";

// A mínima forma de supabase-js que o gestor usa (padrão ClientePostgrestLike
// da v58/v84 — a tabela esport_conta ainda não está nos types gerados e o
// cast por chamada mantém os gates tsc limpos sem tocar o cliente real).
interface ClienteEsportLike {
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
const cliente = () => supabase as unknown as ClienteEsportLike;

const TABELA = "esport_conta";

function lerChave(chave: string): EstadoEsport {
  try {
    const cru = localStorage.getItem(chave);
    if (cru) return hidratarEstadoEsport(JSON.parse(cru));
  } catch { /* podre → vazio honesto */ }
  return { torneios: [], ligas: [], ts: 0 };
}

function gravarChave(chave: string, e: EstadoEsport): void {
  try { localStorage.setItem(chave, JSON.stringify(e)); } catch { /* aparelho cheio → só memória */ }
  // anuncia para TODAS as superfícies do e-sport (listas/detalhes re-leem
  // FRESCO da chave ativa — padrão `bateu:progressao` da v89)
  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new CustomEvent("bateu:esport")); } catch { /* ambiente sem eventos */ }
  }
}

// ── GESTOR DA CONTA (singleton do módulo — dedupe entre instâncias) ─────
export type EstadoSincEsport = "convidado" | "aSincronizar" | "sincronizado" | "migracao" | "erro";
export interface InfoSincEsport { sinc: EstadoSincEsport; motivo: string; em: number }

let infoSinc: InfoSincEsport = { sinc: "convidado", motivo: "", em: 0 };
const ouvintesSinc = new Set<() => void>();
let usuarioAtivo: string | null = null;     // userId vinculado nesta página ("" nunca)
let vinculoEmCurso: Promise<void> | null = null;
let ultimaImpressaoEnviada: string | null = null;
let temporizadorEnvio: ReturnType<typeof setTimeout> | null = null;

function definirSinc(sinc: EstadoSincEsport, motivo = ""): void {
  infoSinc = { sinc, motivo: motivo.slice(0, 120), em: Date.now() };
  for (const fn of ouvintesSinc) fn();
}

function chaveAtiva(): string {
  return usuarioAtivo ? chaveCacheContaEsport(usuarioAtivo) : CHAVE_ESPORT;
}

const DEBOUNCE_ENVIO_MS = 1200;

function enviarAgora(estado: EstadoEsport, userId: string): Promise<void> {
  const linha = estadoParaLinhaEsport(estado, userId, usuarioAtivo ?? userId);
  if (!linha) return Promise.resolve();
  return (async () => {
    const { error } = await cliente().from(TABELA).upsert(linha, { onConflict: "user_id" });
    if (error) {
      if (error.code === CODIGO_MIGRACAO_PENDENTE) definirSinc("migracao", error.message);
      else definirSinc("erro", error.message || error.code || "upsert");
      return;
    }
    ultimaImpressaoEnviada = impressaoEstadoEsport(estado);
    definirSinc("sincronizado");
  })();
}

/** Só dispara rede quando algo SINCRONIZÁVEL mudou (impressão do núcleo). */
function agendarEnvio(estado: EstadoEsport): void {
  if (!usuarioAtivo) return;
  const userId = usuarioAtivo;
  if (!deveEnviarEsport(ultimaImpressaoEnviada, estado)) return;
  if (temporizadorEnvio) clearTimeout(temporizadorEnvio);
  temporizadorEnvio = setTimeout(() => {
    temporizadorEnvio = null;
    void enviarAgora(estado, userId);
  }, DEBOUNCE_ENVIO_MS);
}

// INSTALAÇÃO ÚNICA (padrão iaContexto v82): o núcleo esport passa a escrever
// na chave ATIVA e a avisar a store a cada gravação — antes de qualquer
// página renderizar (este módulo é importado estaticamente pelo App).
definirChaveEsportAtiva(chaveAtiva());
definirAoGuardarEsport((e) => agendarEnvio(e));

/** Vínculo CONVIDADO → CONTA: absorção (união por id) + pull → merge → push. */
function vincular(userId: string): Promise<void> {
  if (usuarioAtivo === userId) return vinculoEmCurso ?? Promise.resolve();
  usuarioAtivo = userId;
  definirChaveEsportAtiva(chaveAtiva()); // a escrita do núcleo passa para a conta
  definirSinc("aSincronizar");
  vinculoEmCurso = (async () => {
    // 1) ABSORÇÃO: cache da conta ← união com o estado de convidado do aparelho
    const convidado = lerChave(CHAVE_ESPORT);
    const conta = lerChave(chaveCacheContaEsport(userId));
    const unido = absorverConvidadoEsport(conta, convidado);
    gravarChave(chaveCacheContaEsport(userId), unido);
    // limpar o ficheiro de convidado DEPOIS de absorvido (nada é apagado sem
    // ter sido somado — padrão v84)
    if (convidado.torneios.length > 0 || convidado.ligas.length > 0) {
      try { localStorage.removeItem(CHAVE_ESPORT); } catch { /* sem storage → fica para a próxima */ }
    }
    definirChaveEsportAtiva(chaveAtiva());
    // 2) PULL: o estado da conta no servidor entra na UNIÃO
    let estadoFinal = unido;
    const { data, error } = await cliente().from(TABELA).select("*").eq("user_id", userId).maybeSingle();
    if (error) {
      if (error.code === CODIGO_MIGRACAO_PENDENTE) { definirSinc("migracao", error.message); return; }
      definirSinc("erro", error.message || error.code || "select");
      return; // sem servidor → o aparelho é a fonte (declarado no UI)
    }
    const estadoServidor = linhaParaEstadoEsport(data, userId);
    if (estadoServidor && (estadoServidor.torneios.length > 0 || estadoServidor.ligas.length > 0)) {
      estadoFinal = absorverConvidadoEsport(unido, estadoServidor);
      gravarChave(chaveCacheContaEsport(userId), estadoFinal);
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
  definirChaveEsportAtiva(null); // o núcleo volta para a chave de convidado
  definirSinc("convidado");
}

function trocarUsuario(userId: string | null): Promise<void> {
  if (!userId) { if (usuarioAtivo) desligar(); return Promise.resolve(); }
  return vincular(userId);
}

/** Estado de sincronização observável (padrão iaContexto v82). */
export function useEsportSinc(): InfoSincEsport {
  return useSyncExternalStore(
    (fn) => { ouvintesSinc.add(fn); return () => ouvintesSinc.delete(fn); },
    () => infoSinc,
    () => infoSinc,
  );
}

/** Leitura FRESCA do estado na chave ativa (para superfícies fora do React). */
export function lerEsportAtivo(): EstadoEsport {
  return lerChave(chaveAtiva());
}

export { trocarUsuario as trocarUsuarioEsport };
export type { EstadoEsport };
