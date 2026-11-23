// ═══════════════════════════════════════════════════════════════════════
// v82 — IA QUE SUGERE, NUNCA DECIDE — núcleos puros das três sugestões
// (briefing passo 11: moderação · comentador de desporto · recomendação
// de jogos, todos com NVIDIA Nemotron e TODOS «sugestão — decide tu»).
//
// Regra de produto a ferro e fogo: a IA NUNCA executa. A moderação
// devolve um veredicto QUE O MODERADOR confirma a cada remoção; o
// comentador só comenta (nunca aconselha aposta); a recomendação nomeia
// jogos que EXISTEM no catálogo (validado — nomes inventados caem fora).
//
// Isomórfico: zero DOM, zero React — testável no Node (padrão v46–v59).
// ═══════════════════════════════════════════════════════════════════════

// ── 1) MODERAÇÃO — veredicto SUGERIDO ───────────────────────────────────

export type ClassificacaoIA = "ok" | "dubio" | "suspeito";
export type AcaoSugeridaIA = "manter" | "avisar" | "remover" | "escalar";

export interface VeredictoIA {
  classificacao: ClassificacaoIA;
  motivo: string;
  acaoSugerida: AcaoSugeridaIA;
}

const CLASSIF_VALIDAS: ClassificacaoIA[] = ["ok", "dubio", "suspeito"];
const ACOR_VALIDAS: AcaoSugeridaIA[] = ["manter", "avisar", "remover", "escalar"];

export const PROMPT_MODERADOR =
  "És o assistente de TRIAGEM da moderação da comunidade da Bateu (plataforma de jogos, sorteios " +
  "verificados, desporto e mercado de Moçambique). Analisas UMA mensagem e devolves EXACTAMENTE um " +
  'JSON, sem texto à volta: {"classificacao":"ok|dubio|suspeito","motivo":"…(≤140 chars, concreto)",' +
  '"acao_sugerida":"manter|avisar|remover|escalar"}. ' +
  "Escalas para «suspeito» APENAS com evidência no texto: golpe/phishing (pedir pagamento fora da " +
  "plataforma, números de carteira estranhos, «envia primeiro»), fraude ou impersonação da Bateu, " +
  "discurso de ódio, assédio, conteúdo adulto, venda de substâncias. «Dubio» = ambíguo ou ruidoso " +
  "(spam leve, off-topic agressivo, caps excessivos). «Ok» = conversa normal. Se não tiveres " +
  "evidência, classificas «ok» ou «dubio» — o moderador DECIDE sempre; tu nunca decidis.";

/** Analisa a resposta do modelo e devolve o veredicto — ou null (honesto:
 *  resposta sem JSON válido nunca vira veredicto inventado). Tolerante a
 *  texto à volta do JSON e a fence ```json. */
export function analisarVeredictoIA(texto: string): VeredictoIA | null {
  if (!texto) return null;
  const limpo = texto.replace(/```(?:json)?/gi, " ");
  const ini = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (ini === -1 || fim <= ini) return null;
  let obj: any = null;
  try {
    obj = JSON.parse(limpo.slice(ini, fim + 1));
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const classificacao = String(obj.classificacao ?? "").toLowerCase().trim() as ClassificacaoIA;
  const acao = String(obj.acao_sugerida ?? obj.acao ?? "").toLowerCase().trim() as AcaoSugeridaIA;
  const motivo = String(obj.motivo ?? "").trim().slice(0, 240);
  if (!CLASSIF_VALIDAS.includes(classificacao)) return null;
  return {
    classificacao,
    motivo,
    acaoSugerida: ACOR_VALIDAS.includes(acao) ? acao : (classificacao === "ok" ? "manter" : "avisar"),
  };
}

// ── 2) COMENTADOR DE DESPORTO — factos REAIS → prompt ───────────────────

export const PROMPT_COMENTADOR =
  "És o COMENTADOR DA IA da Bateu. Recebes factos REAIS (partidas e top-5 da classificação da " +
  "fonte oficial) e escreves um comentário curto da jornada (máx. ~130 palavras), com energia de " +
  "narrador e EM PORTUGUÊS. Regras absolutas: usa SÓ os factos dados — se faltar informação, dizes " +
  "«sem dados» em vez de inventar; NUNCA aconselhas aposta, NUNCA dizes «aposta em X» nem " +
  "«escolhe Y», NUNCA prometes resultado; se o jogo já tem placar, comentas o resultado como facto. " +
  "Termina com UMA linha de jogo responsável.";

/** Factos da jornada — SÓ dados reais da fonte (DesportoHub passa os objectos
 *  da TheSportsDB). Sem eventos, devolve lista vazia (o UI desactiva o botão). */
export interface FactoDesporto {
  casa: string;
  fora: string;
  estado: string; // "NS" | "LIVE" | "HT" | "FT"
  placar?: string;
  kickoff?: string;
}

export function factosDesporto(
  liga: string,
  jornada: number | null,
  factos: FactoDesporto[],
  top5: { pos: number; equipa: string; pts: number }[],
  max = 10,
): string[] {
  const linhas: string[] = [];
  if (liga) linhas.push(`Competição: ${liga}${jornada != null ? ` · jornada ${jornada}` : ""}`);
  for (const f of factos.slice(0, max)) {
    const placar = f.placar ? ` — ${f.placar}` : "";
    const quando = f.kickoff ? ` (${f.kickoff})` : "";
    linhas.push(`Partida: ${f.casa} vs ${f.fora} — estado ${f.estado}${placar}${quando}`);
  }
  if (top5.length) {
    linhas.push(`Top 5 da classificação: ${top5.map((s) => `${s.pos}. ${s.equipa} ${s.pts}pts`).join("; ")}`);
  }
  return linhas.slice(0, 12);
}

/** Impressão digital do conteúdo real (cache do comentário por jornada —
 *  nova jornada/novo placar = nova chave; nunca comentário velho a fingir
 *  que é actual). */
export function fingerprintEventos(factos: FactoDesporto[]): string {
  return factos
    .map((f) => `${f.casa}|${f.fora}|${f.estado}|${f.placar ?? ""}`)
    .join("#");
}

export const CACHE_COMENT_CHAVE = "bateu.desporto.coment.v82";
export const CACHE_COMENT_TTL_MS = 3 * 60 * 60_000; // 3h — «gerado às» visível

export interface CacheComent {
  fp: string;
  texto: string;
  geradoEm: number;
}

export function lerCacheComent(agora: number = Date.now()): Record<string, CacheComent> {
  try {
    const cru = typeof localStorage !== "undefined" ? localStorage.getItem(CACHE_COMENT_CHAVE) : null;
    if (!cru) return {};
    const obj = JSON.parse(cru);
    if (!obj || typeof obj !== "object") return {};
    const fora: Record<string, CacheComent> = {};
    for (const [k, v] of Object.entries(obj)) {
      const c = v as CacheComent;
      if (c && typeof c.fp === "string" && typeof c.texto === "string" && Number.isFinite(c.geradoEm) && agora - c.geradoEm <= CACHE_COMENT_TTL_MS) {
        fora[k] = c;
      }
    }
    return fora;
  } catch {
    return {};
  }
}

export function guardarCacheComent(mapa: Record<string, CacheComent>): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    const entradas = Object.entries(mapa).slice(-12); // cap honesto
    localStorage.setItem(CACHE_COMENT_CHAVE, JSON.stringify(Object.fromEntries(entradas)));
    return true;
  } catch {
    return false;
  }
}

// ── 3) RECOMENDAÇÃO DE JOGOS — só nomes que EXISTEM no catálogo ──────────

export const PROMPT_SUGESTAO_JOGO =
  "És o recomendador da IA da Bateu. Recebes um catálogo REAL de jogos (rótulo exacto entre " +
  "aspas, categoria, dificuldade, minutos, pontos máximos) e factos do utilizador (jogo do dia, " +
  "mais jogados da semana, jogos que abriu recentemente). Escolhes UMA sugestão diferente do jogo " +
  "do dia e devolves EXACTAMENTE um JSON, sem texto à volta: " +
  '{"jogo":"<rótulo EXACTO do catálogo>","razao":"…(≤160 chars, em português, porquê ESTE jogo para ESTE momento)"}. ' +
  "Nunca inventes jogos fora do catálogo; nunca prometas pontos ou prémios; não repitas os jogos " +
  "mais jogados como sugestão (o utilizador já os conhece).";

export interface SugestaoJogoIA {
  jogo: string;
  razao: string;
}

/** Extrai a sugestão do JSON do modelo e VALIDA o rótulo contra o catálogo
 *  real — nome inventado ou fora do catálogo devolve [] (nunca link morto). */
export function analisarSugestaoJogoIA(texto: string, rotulosCatalogo: string[]): SugestaoJogoIA[] {
  const rotulos = rotulosCatalogo.map((r) => r.toLowerCase().trim());
  if (!texto || rotulos.length === 0) return [];
  const limpo = texto.replace(/```(?:json)?/gi, " ");
  const ini = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (ini === -1 || fim <= ini) return [];
  let obj: any = null;
  try {
    obj = JSON.parse(limpo.slice(ini, fim + 1));
  } catch {
    return [];
  }
  let cru: any[] | null = null;
  if (Array.isArray(obj)) cru = obj;
  else if (Array.isArray(obj?.sugestoes)) cru = obj.sugestoes;
  else if (obj?.sugestao && typeof obj.sugestao === "object") cru = [obj.sugestao];
  else if (typeof obj?.jogo === "string") cru = [obj];
  if (!cru) return [];
  const vistas = new Set<string>();
  const saida: SugestaoJogoIA[] = [];
  for (const item of cru) {
    const jogo = String(item?.jogo ?? item?.nome ?? "").trim();
    const razao = String(item?.razao ?? item?.motivo ?? "").trim().slice(0, 200);
    const idx = rotulos.indexOf(jogo.toLowerCase());
    if (idx === -1 || !razao) continue; // validação dura: só catálogo real
    const rotuloReal = rotulosCatalogo[idx];
    if (vistas.has(rotuloReal.toLowerCase())) continue;
    vistas.add(rotuloReal.toLowerCase());
    saida.push({ jogo: rotuloReal, razao });
    if (saida.length >= 2) break;
  }
  return saida;
}
