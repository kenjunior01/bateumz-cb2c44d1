// ═══════════════════════════════════════════════════════════════════════
// v58 — HISTÓRICO DA IA NO SERVIDOR — NÚCLEO ISOMÓRFICO (browser E Node)
// O passo anotado desde a v54: o histórico do chat da IA (página /ia e o
// NPC «Bateu IA» da Praça) passa a viver no Supabase e segue o utilizador
// ENTRE DISPOSITIVOS. Este módulo é PURO (zero supabase, zero DOM): as
// regras do que pode ser guardado, as chaves idempotentes, o merge entre
// dispositivos e os caps — tudo provado no Node pelo test-ia-v58.mjs.
//
// Modelo de sincronização (honesto, declarado):
//   · o SERVIDOR é a fonte de verdade do histórico sincronizado; o
//     localStorage é cache e fila do dispositivo;
//   · cada mensagem recebe uma CHAVE determinística
//     `sessao:indice:papel:hash(conteudo)` — dois dispositivos que
//     carimbam a mesma conversa derivam as MESMAS chaves → o merge por
//     chave elimina duplicados (o push é idempotente: UNIQUE(user_id,chave));
//     mensagens novas (v58+) são carimbadas no momento em que nascem e a
//     chave fica guardada — nunca é recalculada depois;
//   · mensagens SEM chave (histórico pré-v58) são carimbadas UMA vez e a
//     marca é persistida;
//   · timestamps sintéticos (baseEm + índice) servem SÓ para ordenar o
//     merge — nunca são mostrados como horário real;
//   · o que não pode ser validado é DESCARTADO com contagem honesta —
//     a sincronização nunca morre por uma linha podre;
//   · a persona (system) NUNCA é sincronizada: é reconstruída a cada
//     envio; só o personaId (para as perguntas) viaja na linha.
// ═══════════════════════════════════════════════════════════════════════

// ── Tipos ────────────────────────────────────────────────────────────────

/** "ia" = página /ia (multi-conversa) · "npc" = Bateu IA na Praça (janela única). */
export type SuperficieIa = "ia" | "npc";
export type PapelHistorico = "utilizador" | "assistente";

export interface MsgHistoricoIa {
  chave: string;
  papel: PapelHistorico;
  conteudo: string;
  raciocinio?: string;
  tokens?: number | null;
  /** ms desde epoch (sintético para pré-v58: baseEm + índice — SÓ ordena). */
  criadoEm: number;
}

/** Linha do Supabase (snake_case) — a forma do fio ia_historico. */
export interface LinhaHistoricoIa {
  user_id: string;
  superficie: SuperficieIa;
  sessao: string;
  chave: string;
  papel: PapelHistorico;
  conteudo: string;
  raciocinio: string | null;
  tokens: number | null;
  persona: string | null;
  criada_por_cliente: number | null;
  criada_em: string; // ISO 8601
}

export interface SessaoHistoricoIa {
  sessao: string;
  mensagens: MsgHistoricoIa[];
  persona: string | null; // personaId da 1.ª pergunta com persona (ou null)
}

export const LIMITES_HISTORICO = {
  CONTEUDO_CAP: 8000,
  RACIOCINIO_CAP: 8000,
  MENSAGENS_SESSAO_CAP: 60, // igual à janela deslizante do trigger SQL
  SESSOES_CAP: 20,          // igual ao CONVERSAS_CAP da /ia
  SESSAO_CAP: 140,
  CHAVE_CAP: 140,
  PERSONA_CAP: 60,
  TOKENS_CAP: 200000,
  LINHAS_POR_CARGA: 2000,
} as const;

export const SESSAO_NPC = "praca"; // janela única do NPC na Praça do Imbondeiro

export class ErroHistoricoIa extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroHistoricoIa";
  }
}

// ── Chave determinística (idempotência do push) ──────────────────────────

/** FNV-1a 32 bit → 8 hex (isomórfico, sem dependências). */
export function hashFnv1a(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * A chave NUNCA inclui tempo real: dois dispositivos que carimbam a mesma
 * conversa (mesma sessão, mesma ordem, mesmo conteúdo) derivam a MESMA
 * chave → o merge deduplica e o push é idempotente no servidor.
 */
export function chaveDe(sessao: string, indice: number | string, papel: PapelHistorico, conteudo: string): string {
  return `${sessao}:${indice}:${papel}:${hashFnv1a(conteudo)}`;
}

// ── Validação (o que pode entrar no histórico sincronizado) ──────────────

export function validarMensagemHistorico(m: unknown, indice: number, sessao: string): MsgHistoricoIa {
  const bruto = m as any;
  if (!bruto || typeof bruto !== "object") throw new ErroHistoricoIa("mensagem tem de ser um objecto");

  // aceita tanto a forma do núcleo (papel/conteudo) como a do fio (role/content)
  const papel: PapelHistorico | undefined =
    bruto.papel ?? (bruto.role === "user" ? "utilizador" : bruto.role === "assistant" ? "assistente" : undefined);
  if (papel !== "utilizador" && papel !== "assistente") throw new ErroHistoricoIa(`papel inválido: ${String(papel)}`);

  const conteudoBruto = typeof bruto.conteudo === "string" ? bruto.conteudo : typeof bruto.content === "string" ? bruto.content : "";
  if (!conteudoBruto || !conteudoBruto.trim()) throw new ErroHistoricoIa("conteúdo vazio");
  const conteudo = conteudoBruto.slice(0, LIMITES_HISTORICO.CONTEUDO_CAP);

  const raciocinioBruto = typeof bruto.raciocinio === "string" ? bruto.raciocinio : "";
  const raciocinio = raciocinioBruto ? raciocinioBruto.slice(0, LIMITES_HISTORICO.RACIOCINIO_CAP) : undefined;

  let tokens: number | null = null;
  if (bruto.tokens != null) {
    const n = Number(bruto.tokens);
    if (Number.isFinite(n) && n >= 0 && n <= LIMITES_HISTORICO.TOKENS_CAP) tokens = Math.floor(n);
    // tokens inválidos ficam NULL — nunca inventados
  }

  const criadoEmBruto = Number(bruto.criadoEm);
  if (!Number.isFinite(criadoEmBruto) || criadoEmBruto < 0) throw new ErroHistoricoIa("criadoEm inválido");
  const criadoEm = Math.floor(criadoEmBruto);

  let chave = typeof bruto.chave === "string" && bruto.chave
    ? bruto.chave
    // sem chave: a determinística usa o criadoEm (único por evento de
    // mensagem — duas perguntas IGUAIS em momentos diferentes têm chaves
    // diferentes e nenhuma se perde no merge); o índice é o fallback
    : chaveDe(sessao, Number.isFinite(criadoEmBruto) && criadoEmBruto >= 0 ? Math.floor(criadoEmBruto) : indice, papel, conteudo);
  if (!chave || chave.length > LIMITES_HISTORICO.CHAVE_CAP) throw new ErroHistoricoIa("chave inválida");

  return { chave, papel, conteudo, raciocinio, tokens, criadoEm };
}

export interface CarimboResultado {
  mensagens: MsgHistoricoIa[];
  descartadas: number; // honesto: quantas linhas podres saíram
}

/**
 * Carimba (uma vez!) mensagens soltas: as que já têm chave mantêm-na; as
 * que não têm recebem a chave determinística; as pré-v58 (sem criadoEm)
 * recebem um timestamp sintético baseEm + índice (SÓ ordena o merge —
 * nunca é mostrado como hora real). NÃO muta os objectos de entrada.
 */
export function carimbarMensagens(
  entrada: unknown,
  sessao: string,
  baseEm: number,
): CarimboResultado {
  if (!Array.isArray(entrada)) return { mensagens: [], descartadas: 0 };
  const mensagens: MsgHistoricoIa[] = [];
  let descartadas = 0;
  entrada.forEach((m, i) => {
    try {
      const bruto = { ...((m as any) ?? {}) };
      const cru = Number(bruto.criadoEm);
      if (!Number.isFinite(cru) || cru < 0) bruto.criadoEm = baseEm + i; // pré-v58
      mensagens.push(validarMensagemHistorico(bruto, i, sessao));
    } catch {
      descartadas++; // linha podre sai COM contagem honesta — o merge não morre
    }
  });
  return { mensagens, descartadas };
}

// ── Merge entre dispositivos (dedupe por chave; servidor é a verdade) ────

export interface MergeResultado {
  mensagens: MsgHistoricoIa[];
  deServidor: number; // quantas entraram só porque o servidor as tinha
  duplicadas: number;
}

export function mesclarMensagens(
  local: MsgHistoricoIa[],
  servidor: MsgHistoricoIa[],
  cap: number = LIMITES_HISTORICO.MENSAGENS_SESSAO_CAP,
): MergeResultado {
  const porChave = new Map<string, MsgHistoricoIa>();
  let duplicadas = 0;
  for (const m of servidor) {
    if (porChave.has(m.chave)) { duplicadas++; continue; }
    porChave.set(m.chave, m); // o SERVIDOR ganha em caso de conflito de chave
  }
  for (const m of local) {
    if (porChave.has(m.chave)) { duplicadas++; continue; }
    porChave.set(m.chave, m); // o local só entra com chave NOVA
  }
  const chavesLocais = new Set(local.map((m) => m.chave));
  const deServidor = servidor.filter((m) => !chavesLocais.has(m.chave)).length;
  const ordenadas = Array.from(porChave.values()).sort(
    (a, b) => a.criadoEm - b.criadoEm || (a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0),
  );
  const mensagens = ordenadas.slice(-cap); // fica com as MAIS RECENTES
  return { mensagens, deServidor, duplicadas };
}

// ── Linhas ↔ mensagens (a forma do fio do Supabase) ──────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Linha do servidor → mensagem validada; linha podre → NULL (descartada). */
export function linhaParaMensagem(linha: unknown): MsgHistoricoIa | null {
  const l = linha as any;
  if (!l || typeof l !== "object") return null;
  if (typeof l.user_id !== "string" || !UUID_RE.test(l.user_id)) return null;
  if (l.superficie !== "ia" && l.superficie !== "npc") return null;
  if (typeof l.sessao !== "string" || !l.sessao || l.sessao.length > LIMITES_HISTORICO.SESSAO_CAP) return null;
  if (typeof l.chave !== "string" || !l.chave || l.chave.length > LIMITES_HISTORICO.CHAVE_CAP) return null;
  if (l.papel !== "utilizador" && l.papel !== "assistente") return null;
  if (typeof l.conteudo !== "string" || !l.conteudo.trim() || l.conteudo.length > LIMITES_HISTORICO.CONTEUDO_CAP) return null;
  let criadoEm = Number(l.criada_por_cliente);
  if (!Number.isFinite(criadoEm) || criadoEm <= 0) {
    const iso = typeof l.criada_em === "string" ? Date.parse(l.criada_em) : NaN;
    if (!Number.isFinite(iso)) return null;
    criadoEm = iso;
  }
  const raciocinio = typeof l.raciocinio === "string" && l.raciocinio ? l.raciocinio.slice(0, LIMITES_HISTORICO.RACIOCINIO_CAP) : undefined;
  let tokens: number | null = null;
  if (l.tokens != null) {
    const n = Number(l.tokens);
    if (Number.isFinite(n) && n >= 0 && n <= LIMITES_HISTORICO.TOKENS_CAP) tokens = Math.floor(n);
  }
  return {
    chave: l.chave,
    papel: l.papel,
    conteudo: l.conteudo,
    raciocinio,
    tokens,
    criadoEm: Math.floor(criadoEm),
  };
}

/** Mensagem validada → linha para o upsert (user_id confiado à sessão auth). */
export function mensagemParaLinha(
  m: MsgHistoricoIa,
  userId: string,
  superficie: SuperficieIa,
  sessao: string,
  persona: string | null = null,
): LinhaHistoricoIa {
  if (!UUID_RE.test(userId)) throw new ErroHistoricoIa("user_id tem de ser um UUID");
  if (superficie !== "ia" && superficie !== "npc") throw new ErroHistoricoIa(`superfície inválida: ${String(superficie)}`);
  if (!sessao || sessao.length > LIMITES_HISTORICO.SESSAO_CAP) throw new ErroHistoricoIa("sessão inválida");
  return {
    user_id: userId,
    superficie,
    sessao,
    chave: m.chave,
    papel: m.papel,
    conteudo: m.conteudo.slice(0, LIMITES_HISTORICO.CONTEUDO_CAP),
    raciocinio: m.raciocinio ? m.raciocinio.slice(0, LIMITES_HISTORICO.RACIOCINIO_CAP) : null,
    tokens: m.tokens ?? null,
    persona: persona ? String(persona).slice(0, LIMITES_HISTORICO.PERSONA_CAP) : null,
    criada_por_cliente: Math.floor(m.criadoEm),
    criada_em: new Date(Math.floor(m.criadoEm)).toISOString(),
  };
}

// ── Sessões (agrupar linhas do servidor; cap de sessões importadas) ──────

export interface AgrupacaoResultado {
  sessoes: SessaoHistoricoIa[];
  descartadas: number;
}

export function agruparPorSessao(linhas: unknown): AgrupacaoResultado {
  if (!Array.isArray(linhas)) return { sessoes: [], descartadas: 0 };
  const mapa = new Map<string, { mensagens: MsgHistoricoIa[]; persona: string | null }>();
  let descartadas = 0;
  for (const linha of linhas) {
    const m = linhaParaMensagem(linha);
    if (!m) { descartadas++; continue; }
    const l = linha as any;
    const balde = mapa.get(l.sessao) ?? { mensagens: [], persona: null };
    balde.mensagens.push(m);
    if (!balde.persona && m.papel === "utilizador" && typeof l.persona === "string" && l.persona) {
      balde.persona = l.persona.slice(0, LIMITES_HISTORICO.PERSONA_CAP);
    }
    mapa.set(l.sessao, balde);
  }
  const sessoes: SessaoHistoricoIa[] = Array.from(mapa.entries())
    .map(([sessao, balde]) => ({
      sessao,
      persona: balde.persona,
      mensagens: balde.mensagens.sort((a, b) => a.criadoEm - b.criadoEm || (a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0)),
    }))
    .sort((a, b) => ultimoCriadoEm(b) - ultimoCriadoEm(a));
  return { sessoes, descartadas };
}

function ultimoCriadoEm(s: SessaoHistoricoIa): number {
  return s.mensagens.length ? s.mensagens[s.mensagens.length - 1].criadoEm : 0;
}

/** Mantém as N sessões mais recentes (por última mensagem). */
export function capSessoes(sessoes: SessaoHistoricoIa[], cap: number = LIMITES_HISTORICO.SESSOES_CAP): SessaoHistoricoIa[] {
  return sessoes.slice(0, Math.max(0, cap));
}

// ═══════════════════════════════════════════════════════════════════════
// v58 — CLIENTE DO HISTÓRICO NO SERVIDOR (Supabase PostgREST + RLS/JWT)
// Puxa/empurra/apaga o histórico do chat (/ia e o NPC da Cidade) na tabela
// `ia_historico` com RLS (JWT do utilizador — supabase.auth). Todo o
// ESTADO é HONESTO e DISTINTO:
//   · "convidado"  — sem sessão: o servidor NUNCA é tocado (zero pedidos);
//   · "migracao"   — a tabela ainda não existe no projecto (PGRST205): a
//     migração supabase/migrations/20261117_ia_historico.sql está no repo,
//     mas ainda não foi aplicada — o UI declara e o chat segue local;
//   · "ok"         — correu de verdade (com contagens reais);
//   · "erro"       — o motivo real, com o código HTTP quando existe.
// A injecção (cliente + obterSessao) existe para o teste Node provar o
// fio (on_conflict=user_id,chave, Prefer ignore-duplicates, filtros) contra
// um PostgREST mockado — por isso este bloco vive no MESMO módulo puro.
// ═══════════════════════════════════════════════════════════════════════
export type ModoSincIa = "convidado" | "migracao" | "ok" | "erro";

/** Estado do UI: os modos do gestor + os dois estados só-visual. */
export type EstadoSincUI = ModoSincIa | "aSincronizar" | "sincronizado";

export interface SessaoUtilizador {
  id: string; // UUID do auth.users
}

export interface ResultadoCargaIa {
  modo: ModoSincIa;
  sessoes: SessaoHistoricoIa[];
  descartadas: number;
  motivo?: string;
}

export interface ResultadoEscritaIa {
  modo: ModoSincIa;
  enviadas: number;
  apagadas?: number;
  motivo?: string;
}

/** A mínima forma de supabase-js que o gestor usa (injetável nos testes). */
export interface ClientePostgrestLike {
  from(tabela: string): {
    select(colunas?: string): {
      eq(coluna: string, valor: string): {
        order(coluna: string, opcoes: { ascending: boolean }): {
          limit(n: number): Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
        };
      };
    };
    upsert(linhas: unknown[], opcoes: { onConflict: string; ignoreDuplicates: boolean }): Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
    delete(): {
      eq(coluna: string, valor: string): {
        eq(coluna2: string, valor2: string): Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
        neq(coluna2: string, valor2: string): Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
      };
    };
  };
}

export type ObterSessao = () => Promise<SessaoUtilizador | null>;

/** O cliente REAL do app (supabase-js + auth) carregado POR PREGUIÇA:
 *  este módulo corre também no NODE (o teste prova o fio contra um
 *  PostgREST mockado com cliente injetado) — o import estático do
 *  supabase (import.meta.env no topo) quebraria o Node. */
type SessaoAuthIa = { session: { user?: { id: string } } | null };
type ClienteAplicacao = ClientePostgrestLike & {
  auth: { getSession(): Promise<{ data: SessaoAuthIa | null }> };
};

const clienteAplicacao = async (): Promise<ClienteAplicacao> => {
  const m = await import("@/integrations/supabase/client");
  return m.supabase as unknown as ClienteAplicacao;
};

/** Sessão REAL do utilizador (JWT do supabase.auth — RLS no servidor). */
export const sessaoSupabase: ObterSessao = async () => {
  try {
    const cli = await clienteAplicacao();
    const { data } = await cli.auth.getSession();
    const u = data.session?.user;
    return u?.id ? { id: u.id } : null;
  } catch {
    return null; // sem sessão legível = convidado (honesto)
  }
};

const TABELA = "ia_historico";

const motivoDe = (e: { code?: string; message: string } | null): { modo: "migracao" | "erro"; motivo?: string } => {
  const msg = String(e?.message ?? "").slice(0, 200);
  if (e?.code === "PGRST205" || /could not find the table/i.test(msg) || /does not exist/i.test(msg)) {
    return { modo: "migracao" };
  }
  return { modo: "erro", motivo: msg || "erro desconhecido do servidor" };
};

export interface GestorHistoricoIa {
  obterSessao: ObterSessao;
  carregar(superficie: SuperficieIa): Promise<ResultadoCargaIa>;
  empurrar(
    superficie: SuperficieIa,
    sessao: string,
    mensagens: MsgHistoricoIa[],
    persona: string | null,
  ): Promise<ResultadoEscritaIa>;
  apagarSessao(superficie: SuperficieIa, sessao: string): Promise<ResultadoEscritaIa>;
  apagarTudo(superficie: SuperficieIa): Promise<ResultadoEscritaIa>;
}

export function criarGestorHistoricoIa(
  clienteInjetado?: ClientePostgrestLike,
  obterSessao: ObterSessao = sessaoSupabase,
): GestorHistoricoIa {
  // o cliente só se resolve quando é mesmo usado (lazy — Node nunca carrega
  // o supabase real; os testes injetam o mock)
  const cli = async (): Promise<ClientePostgrestLike> =>
    clienteInjetado ?? (await clienteAplicacao()) as unknown as ClientePostgrestLike;
  return {
    obterSessao,

    async carregar(superficie) {
      const sessao = await obterSessao();
      if (!sessao) return { modo: "convidado", sessoes: [], descartadas: 0 };
      try {
        const { data, error } = await (await cli())
          .from(TABELA)
          .select("*")
          .eq("superficie", superficie)
          .order("criada_em", { ascending: true })
          .limit(LIMITES_HISTORICO.LINHAS_POR_CARGA);
        if (error) {
          const m = motivoDe(error);
          return m.modo === "migracao"
            ? { modo: "migracao", sessoes: [], descartadas: 0 }
            : { modo: "erro", sessoes: [], descartadas: 0, motivo: m.motivo };
        }
        const agrupado = agruparPorSessao(data);
        return {
          modo: "ok",
          sessoes: agrupado.sessoes,
          descartadas: agrupado.descartadas,
        };
      } catch (e: any) {
        return { modo: "erro", sessoes: [], descartadas: 0, motivo: String(e?.message ?? e).slice(0, 200) };
      }
    },

    async empurrar(superficie, sessao, mensagens, persona) {
      const sessaoUser = await obterSessao();
      if (!sessaoUser) return { modo: "convidado", enviadas: 0 };
      if (!mensagens.length) return { modo: "ok", enviadas: 0 };
      try {
        const linhas = mensagens.map((m) => mensagemParaLinha(m, sessaoUser.id, superficie, sessao, m.papel === "utilizador" ? persona : null));
        // upsert idempotente: reenviar a MESMA chave não duplica (UNIQUE user_id+chave)
        const { error } = await (await cli())
          .from(TABELA)
          .upsert(linhas, { onConflict: "user_id,chave", ignoreDuplicates: true });
        if (error) {
          const m = motivoDe(error);
          return m.modo === "migracao" ? { modo: "migracao", enviadas: 0 } : { modo: "erro", enviadas: 0, motivo: m.motivo };
        }
        return { modo: "ok", enviadas: linhas.length };
      } catch (e: any) {
        return { modo: "erro", enviadas: 0, motivo: String(e?.message ?? e).slice(0, 200) };
      }
    },

    async apagarSessao(superficie, sessao) {
      const sessaoUser = await obterSessao();
      if (!sessaoUser) return { modo: "convidado", enviadas: 0 };
      try {
        // RLS garante o user_id — o cliente filtra superfície+sessão
        const { error } = await (await cli()).from(TABELA).delete().eq("superficie", superficie).eq("sessao", sessao);
        if (error) {
          const m = motivoDe(error);
          return m.modo === "migracao" ? { modo: "migracao", enviadas: 0 } : { modo: "erro", enviadas: 0, motivo: m.motivo };
        }
        return { modo: "ok", enviadas: 0 };
      } catch (e: any) {
        return { modo: "erro", enviadas: 0, motivo: String(e?.message ?? e).slice(0, 200) };
      }
    },

    async apagarTudo(superficie) {
      const sessaoUser = await obterSessao();
      if (!sessaoUser) return { modo: "convidado", enviadas: 0 };
      try {
        // O PostgREST exige pelo menos um filtro no DELETE: sessao <> "" é
        // sempre verdade (CHECK da tabela) → apaga TODA a superfície do
        // utilizador (o RLS garante que são só as linhas dele).
        const { error } = await (await cli()).from(TABELA).delete().eq("superficie", superficie).neq("sessao", "");
        if (error) {
          const m = motivoDe(error);
          return m.modo === "migracao" ? { modo: "migracao", enviadas: 0 } : { modo: "erro", enviadas: 0, motivo: m.motivo };
        }
        return { modo: "ok", enviadas: 0 };
      } catch (e: any) {
        return { modo: "erro", enviadas: 0, motivo: String(e?.message ?? e).slice(0, 200) };
      }
    },
  };
}
