// ═══════════════════════════════════════════════════════════════════════
// v54 — IA NEMOTRON (NVIDIA) — NÚCLEO PURO ISOMÓRFICO
//
// O cliente REAL da IA da plataforma: api.integrate.nvidia.com (compatível
// com OpenAI), modelo nvidia/nemotron-3-ultra-550b-a55b — o MESMO módulo
// corre no browser (página /ia) e no Node (test-ia-v54.mjs, padrão
// isomórfico v46–v53: zero DOM, zero THREE, zero imports).
//
// Fonte do contrato de streaming: o snippet oficial do utilizador (v54):
//   · stream=true com chunks `choices[0].delta.content` e
//     `choices[0].delta.reasoning_content` (modo THINKING — o modelo
//     razoa em separado: enable_thinking via chat_template_kwargs);
//   · chunks SEM choices existem (o próprio snippet salta-os) — é onde
//     vem o `usage` final (stream_options.include_usage).
//
// v55 — helpers partilhados (sleep/extrairMensagem/finalizarUso) EXPORTADOS
//       para os núcleos irmãos nemotron-visao.ts e nemotron-vetores.ts
//       (fonte única — os irmãos nunca duplicam regras do contrato).
//
// Principais (o honesto do REA): erros reais nunca silenciados, retry SÓ
// antes do 1.º byte (nada de duplicar respostas a meio do stream),
// rate-limit do cliente declarado, usage NULL quando o upstream não envia
// (nunca inventado), AbortSignal propagado até ao upstream.
// ═══════════════════════════════════════════════════════════════════════

export const MODELO_PADRAO = "nvidia/nemotron-3-ultra-550b-a55b";

// Catálogo honesto: o modelo do snippet é o VERIFICADO; os outros são
// apenas_aliases aceites pelo endpoint NVIDIA (o cliente envia o que o
// utilizador escolher — o erro real do upstream aparece se não existir).
export const MODELOS_CONHECIDOS = [
  { id: "nvidia/nemotron-3-ultra-550b-a55b", rotulo: "Nemotron 3 Ultra 550B-A55B", verificado: true },
] as const;

export const LIMITES = {
  MAX_TOKENS_CAP: 16384,
  TEMPERATURA_MAX: 2,
  TOP_P_MAX: 1,
  MENSAGENS_CAP: 40,
  CONTEUDO_CARACTERES_CAP: 32_000,
  CHAMADAS_POR_JANELA: 20,
  JANELA_MS: 60_000,
  INTERVALO_MINIMO_MS: 250,
  TENTATIVAS_PADRAO: 2,
  TEMPO_LIGACAO_MS: 20_000,
} as const;

export class NemotronError extends Error {
  estado?: number;
  constructor(mensagem: string, estado?: number) {
    super(mensagem);
    this.name = "NemotronError";
    this.estado = estado;
  }
}

export class NemotronRateLimitError extends NemotronError {
  esperarMs: number;
  constructor(esperarMs: number) {
    super(`Rate limit do cliente: espera ${esperarMs} ms`, 429);
    this.name = "NemotronRateLimitError";
    this.esperarMs = esperarMs;
  }
}

// ── Tipos ────────────────────────────────────────────────────────────────

export type Papel = "system" | "user" | "assistant";

export interface MsgIa {
  role: Papel;
  content: string;
  raciocinio?: string; // reasoning_content acumulado do assistente (memória do pensamento)
}

export interface ParametrosIa {
  modelo: string;
  temperatura: number;
  topP: number;
  maxTokens: number;
  thinking: boolean;
}

export interface UsoIa {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  msPrimeiroToken: number | null;
  msTotal: number;
  tokensPorSegundo: number | null;
}

export type EventoStreamIa =
  | { tipo: "raciocinio"; texto: string }
  | { tipo: "conteudo"; texto: string }
  | { tipo: "uso"; uso: UsoIa }
  | { tipo: "fim" };

export interface ResultadoIa {
  conteudo: string;
  raciocinio: string;
  uso: UsoIa | null;
  parado: boolean; // abortado a meio (botão STOP) — honesto
}

// ── Corpo do pedido (contrato NVIDIA/OpenAI) ────────────────────────────

export interface CorpoChat {
  model: string;
  messages: { role: Papel; content: string }[];
  temperature: number;
  top_p: number;
  max_tokens: number;
  stream: true;
  stream_options: { include_usage: true };
  chat_template_kwargs: { enable_thinking: boolean };
}

export function construirCorpo(
  mensagens: MsgIa[],
  p: ParametrosIa,
): CorpoChat {
  const lista = mensagens.slice(0, LIMITES.MENSAGENS_CAP).map((m) => ({
    role: m.role,
    content: String(m.content).slice(0, LIMITES.CONTEUDO_CARACTERES_CAP),
  }));
  return {
    model: p.modelo || MODELO_PADRAO,
    messages: lista,
    temperature: clampNum(p.temperatura, 0, LIMITES.TEMPERATURA_MAX, 1),
    top_p: clampNum(p.topP, 0, LIMITES.TOP_P_MAX, 0.95),
    max_tokens: Math.round(clampNum(p.maxTokens, 1, LIMITES.MAX_TOKENS_CAP, 1024)),
    stream: true,
    stream_options: { include_usage: true },
    chat_template_kwargs: { enable_thinking: !!p.thinking },
  };
}

function clampNum(v: number, min: number, max: number, padrao: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, n));
}

// ── Parser SSE puro (testável byte a byte no Node) ──────────────────────

export interface ParteSse {
  raciocinio: string;
  conteudo: string;
  done: boolean;
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
}

/** Consome um buffer acumulado e devolve as partes decodificadas + o resto.
 *  Suporta `\n\n` e `\r\n\r\n` como separadores de evento (honesto: CRLF existe). */
export function drenarSse(buffer: string): { partes: ParteSse[]; resto: string } {
  const partes: ParteSse[] = [];
  let resto = buffer;
  for (;;) {
    const idxNorm = resto.indexOf("\n\n");
    const idxCrlf = resto.indexOf("\r\n\r\n");
    let fim = -1;
    let consumo = 2;
    if (idxNorm !== -1 && (idxCrlf === -1 || idxNorm < idxCrlf)) { fim = idxNorm; consumo = 2; }
    else if (idxCrlf !== -1) { fim = idxCrlf; consumo = 4; }
    if (fim === -1) break;
    const evento = resto.slice(0, fim);
    resto = resto.slice(fim + consumo);
    const parte = analisarEventoSse(evento);
    if (parte) partes.push(parte);
  }
  return { partes, resto };
}

/** Analisa UM evento SSE (bloco entre linhas vazias). */
export function analisarEventoSse(evento: string): ParteSse | null {
  let done = false;
  const payloads: string[] = [];
  for (const linhaBruta of evento.split(/\r?\n/)) {
    const linha = linhaBruta.trim();
    if (!linha || linha.startsWith(":")) continue; // comentário SSE
    if (linha.startsWith("event:")) continue;
    if (linha.startsWith("data:")) {
      const dados = linha.slice(5).trim();
      if (dados === "[DONE]") { done = true; continue; }
      payloads.push(dados);
    }
  }
  if (!payloads.length && !done) return null;
  const parte: ParteSse = { raciocinio: "", conteudo: "", done, usage: null };
  for (const dados of payloads) {
    let obj: any = null;
    try { obj = JSON.parse(dados); } catch { continue; } // linha corrupta: ignorada (honesto no log do chamador)
    if (!obj || typeof obj !== "object") continue;
    if (obj.usage && typeof obj.usage === "object") {
      parte.usage = {
        prompt_tokens: numOuNulo(obj.usage.prompt_tokens),
        completion_tokens: numOuNulo(obj.usage.completion_tokens),
        total_tokens: numOuNulo(obj.usage.total_tokens),
      };
    }
    const delta = obj.choices?.[0]?.delta;
    if (delta) {
      if (typeof delta.reasoning_content === "string") parte.raciocinio += delta.reasoning_content;
      if (typeof delta.content === "string") parte.conteudo += delta.content;
    }
  }
  if (!parte.raciocinio && !parte.conteudo && !parte.usage && !parte.done) return null;
  return parte;
}

function numOuNulo(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ── Rate limit do cliente (janela deslizante, declarada) ────────────────

export class PortaoRateLimit {
  private marcações: number[] = [];
  private maxPorJanela: number;
  private janelaMs: number;
  private intervaloMinimoMs: number;
  constructor(
    maxPorJanela: number = LIMITES.CHAMADAS_POR_JANELA,
    janelaMs: number = LIMITES.JANELA_MS,
    intervaloMinimoMs: number = LIMITES.INTERVALO_MINIMO_MS,
  ) {
    this.maxPorJanela = maxPorJanela;
    this.janelaMs = janelaMs;
    this.intervaloMinimoMs = intervaloMinimoMs;
  }

  /** Devolve ms a esperar (0 = passa) e reserva o lugar. */
  reservar(agora: number = Date.now()): number {
    this.marcações = this.marcações.filter((m) => agora - m < this.janelaMs);
    const ultima = this.marcações[this.marcações.length - 1];
    if (ultima !== undefined) {
      const esperaIntervalo = this.intervaloMinimoMs - (agora - ultima);
      if (esperaIntervalo > 0) return esperaIntervalo;
    }
    if (this.marcações.length >= this.maxPorJanela) {
      const maisAntiga = this.marcações[0];
      return Math.max(1, this.janelaMs - (agora - maisAntiga));
    }
    this.marcações.push(agora);
    return 0;
  }

  get ocupacao(): number {
    const agora = Date.now();
    this.marcações = this.marcações.filter((m) => agora - m < this.janelaMs);
    return this.marcações.length;
  }
}

// ── Cliente ─────────────────────────────────────────────────────────────

export interface OpcoesCliente {
  endpoint: string;
  /** Chave DIRECTA (só dev/direct-mode — em produção o proxy/edge function
   *  injeta a chave; o browser NUNCA a conhece). */
  chave?: string;
  tentativas?: number;
  portao?: PortaoRateLimit;
  /** Cabeçalhos extra (ex.: Authorization do Supabase para a edge function). */
  cabecalhos?: Record<string, string>;
}

export interface OpcoesStream {
  mensagens: MsgIa[];
  parametros: ParametrosIa;
  aoEvento?: (e: EventoStreamIa) => void;
  sinal?: AbortSignal;
}

export interface UsageUpstream {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
}

export class ClienteNemotron {
  readonly portao: PortaoRateLimit;
  private tentativas: number;
  private opcoes: OpcoesCliente;

  constructor(opcoes: OpcoesCliente) {
    this.opcoes = opcoes;
    this.portao = opcoes.portao ?? new PortaoRateLimit();
    this.tentativas = Math.max(1, opcoes.tentativas ?? LIMITES.TENTATIVAS_PADRAO);
  }

  /** Uma conversação completa em streaming. Retry SÓ antes do 1.º byte. */
  async conversarStream({ mensagens, parametros, aoEvento, sinal }: OpcoesStream): Promise<ResultadoIa> {
    const corpo = construirCorpo(mensagens, parametros);
    const espera = this.portao.reservar();
    if (espera > 0) throw new NemotronRateLimitError(espera);

    const controlador = new AbortController();
    const aoAbortarExterno = () => controlador.abort();
    if (sinal) {
      if (sinal.aborted) controlador.abort();
      else sinal.addEventListener("abort", aoAbortarExterno, { once: true });
    }

    const inicio = Date.now();
    let msPrimeiroToken: number | null = null;
    let conteudo = "";
    let raciocinio = "";
    let usageFinal: UsageUpstream | null = null;
    let parado = false;

    try {
      const resposta = await this.enviarComRetry(corpo, controlador.signal);

      if (!resposta.ok || !resposta.body) {
        const texto = await resposta.text().catch(() => "");
        throw new NemotronError(
          `O upstream recusou (HTTP ${resposta.status})${extrairMensagem(texto)}`,
          resposta.status,
        );
      }

      const leitor = resposta.body.getReader();
      const decodificador = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await leitor.read();
        if (done) break;
        buffer += decodificador.decode(value, { stream: true });
        const { partes, resto } = drenarSse(buffer);
        buffer = resto;
        for (const parte of partes) {
          if (parte.done) continue;
          if (parte.raciocinio) {
            raciocinio += parte.raciocinio;
            if (msPrimeiroToken === null) msPrimeiroToken = Date.now() - inicio;
            aoEvento?.({ tipo: "raciocinio", texto: parte.raciocinio });
          }
          if (parte.conteudo) {
            conteudo += parte.conteudo;
            if (msPrimeiroToken === null) msPrimeiroToken = Date.now() - inicio;
            aoEvento?.({ tipo: "conteudo", texto: parte.conteudo });
          }
          if (parte.usage) {
            usageFinal = parte.usage;
            const uso = finalizarUso(usageFinal, msPrimeiroToken, Date.now() - inicio, conteudo);
            aoEvento?.({ tipo: "uso", uso });
          }
        }
        if (controlador.signal.aborted) { parado = true; try { await leitor.cancel(); } catch {} break; }
      }
      if (controlador.signal.aborted) parado = true;
    } catch (err: any) {
      if (controlador.signal.aborted || err?.name === "AbortError") {
        parado = true;
      } else {
        throw err instanceof NemotronError ? err : new NemotronError(String(err?.message ?? err));
      }
    } finally {
      if (sinal) sinal.removeEventListener("abort", aoAbortarExterno);
    }

    const msTotal = Date.now() - inicio;
    const uso = finalizarUso(usageFinal, msPrimeiroToken, msTotal, conteudo);
    aoEvento?.({ tipo: "fim" });
    return { conteudo, raciocinio, uso, parado };
  }

  private async enviarComRetry(corpo: CorpoChat, sinal: AbortSignal): Promise<Response> {
    let ultimoErro: unknown = null;
    for (let tentativa = 1; tentativa <= this.tentativas; tentativa++) {
      try {
        const cabecalhos: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...this.opcoes.cabecalhos,
        };
        if (this.opcoes.chave) cabecalhos["Authorization"] = `Bearer ${this.opcoes.chave}`;
        const resposta = await fetch(this.opcoes.endpoint, {
          method: "POST",
          headers: cabecalhos,
          body: JSON.stringify(corpo),
          signal: sinal,
        });
        // 429/5xx ANTES do corpo → retry com backoff (o 1.º byte ainda não chegou)
        if ((resposta.status === 429 || resposta.status >= 500) && tentativa < this.tentativas) {
          await resposta.body?.cancel().catch(() => {});
          ultimoErro = new NemotronError(`HTTP ${resposta.status}`, resposta.status);
          await sleep(Math.min(8000, 500 * 2 ** (tentativa - 1)), sinal);
          continue;
        }
        return resposta;
      } catch (err: any) {
        if (sinal.aborted || err?.name === "AbortError") throw err;
        ultimoErro = err;
        if (tentativa < this.tentativas) await sleep(Math.min(8000, 500 * 2 ** (tentativa - 1)), sinal);
      }
    }
    throw ultimoErro instanceof NemotronError
      ? ultimoErro
      : new NemotronError(String((ultimoErro as any)?.message ?? ultimoErro));
  }
}

export function extrairMensagem(texto: string): string {
  if (!texto) return "";
  try {
    const obj = JSON.parse(texto);
    const m = obj?.error?.message ?? obj?.detail ?? obj?.message;
    if (typeof m === "string" && m) return ` — ${m.slice(0, 300)}`;
  } catch {}
  return "";
}

export function finalizarUso(
  usage: { prompt_tokens?: number | null; completion_tokens?: number | null; total_tokens?: number | null } | null,
  msPrimeiroToken: number | null,
  msTotal: number,
  conteudo: string,
): UsoIa {
  let tokensPorSegundo: number | null = null;
  if (usage?.completion_tokens != null && msTotal > 0) {
    tokensPorSegundo = Math.round((usage.completion_tokens / (msTotal / 1000)) * 10) / 10;
  }
  void conteudo;
  return {
    promptTokens: usage?.prompt_tokens ?? null,
    completionTokens: usage?.completion_tokens ?? null,
    totalTokens: usage?.total_tokens ?? null,
    msPrimeiroToken,
    msTotal,
    tokensPorSegundo,
  };
}

export function sleep(ms: number, sinal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    if (sinal) {
      const aoAbortar = () => { clearTimeout(t); reject(new DOMException("abortado", "AbortError")); };
      if (sinal.aborted) aoAbortar();
      else sinal.addEventListener("abort", aoAbortar, { once: true });
    }
  });
}

// ── Conversas (dados puros — a persistência é do chamador) ──────────────

export interface ConversaIa {
  id: string;
  titulo: string;
  criadaEm: number;
  actualizadaEm: number;
  personaId: string;
  mensagens: MsgIa[];
}

export function novaConversa(personaId: string, agora: number = Date.now()): ConversaIa {
  return {
    id: `ia-${agora.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    titulo: "",
    criadaEm: agora,
    actualizadaEm: agora,
    personaId,
    mensagens: [],
  };
}

export function tituloDe(conversa: ConversaIa): string {
  if (conversa.titulo) return conversa.titulo;
  const primeira = conversa.mensagens.find((m) => m.role === "user");
  if (primeira) return primeira.content.slice(0, 60) || "…";
  return "—";
}

export function conversaParaMarkdown(conversa: ConversaIa): string {
  const linhas: string[] = [
    `# ${tituloDe(conversa)}`,
    "",
    `- Persona: ${conversa.personaId}`,
    `- Criada: ${new Date(conversa.criadaEm).toISOString()}`,
    `- Mensagens: ${conversa.mensagens.length}`,
    "",
  ];
  for (const m of conversa.mensagens) {
    linhas.push(`## ${m.role === "user" ? "Eu" : m.role === "assistant" ? "Nemotron" : "Sistema"}`);
    if (m.raciocinio) linhas.push("", "> Pensamento:", ...m.raciocinio.split("\n").map((l) => `> ${l}`));
    linhas.push("", m.content || "_(vazio)_", "");
  }
  return linhas.join("\n");
}

export function validarMensagens(mensagens: unknown): MsgIa[] {
  if (!Array.isArray(mensagens)) throw new NemotronError("mensagens tem de ser um array");
  if (mensagens.length > LIMITES.MENSAGENS_CAP) throw new NemotronError(`máximo ${LIMITES.MENSAGENS_CAP} mensagens`);
  return mensagens.map((m: any) => {
    const role = m?.role;
    if (role !== "system" && role !== "user" && role !== "assistant") {
      throw new NemotronError(`papel inválido: ${String(role)}`);
    }
    const content = m?.content;
    if (typeof content !== "string" || !content.length) throw new NemotronError("content vazio");
    if (content.length > LIMITES.CONTEUDO_CARACTERES_CAP) {
      throw new NemotronError(`content excede ${LIMITES.CONTEUDO_CARACTERES_CAP} caracteres`);
    }
    return { role, content };
  });
}

// ── Markdown mínimo e SEGURO (string puro, testável no Node) ────────────
// 1. ESCAPA sempre primeiro (nenhum HTML do modelo entra cru);
// 2. transforma só as marcações seguras: **negrito**, *itálico*, `código`,
//    blocos ```…```, títulos, listas e ligações [x](https://…).
// O resultado alimenta dangerouslySetInnerHTML (já sem nada executável).

export function htmlDeMarkdown(texto: string): string {
  if (!texto) return "";
  const esc = texto
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const blocos: string[] = [];
  const comBlocos = esc.replace(/```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g, (_m, lang, codigo) => {
    blocos.push(`<pre data-ia-codigo${lang ? ` data-lang="${lang}"` : ""}><code>${codigo.replace(/\n$/, "")}</code></pre>`);
    return `\u0000B${blocos.length - 1}\u0000`;
  });

  const linhas = comBlocos.split("\n").map((linha) => {
    const titulo = linha.match(/^(#{1,4})\s+(.*)$/);
    if (titulo) return `<strong>${decorarInline(titulo[2])}</strong>`;
    const lista = linha.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (lista) return `• ${decorarInline(lista[1])}`;
    if (!linha.trim()) return "";
    return decorarInline(linha);
  });

  return linhas.join("<br/>").replace(/\u0000B(\d+)\u0000/g, (_m, i) => blocos[Number(i)] ?? "");
}

function decorarInline(s: string): string {
  let out = s;
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline">$1</a>');
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,;:!?])/g, "$1<em>$2</em>");
  out = out.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  return out;
}
