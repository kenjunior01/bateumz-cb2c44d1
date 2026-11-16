// ═══════════════════════════════════════════════════════════════════════
// v55 — IA NEMOTRON VISÃO — NÚCLEO PURO ISOMÓRFICO
//
// O OLHO da plataforma: nvidia/nemotron-3-nano-omni-30b-a3b-reasoning
// pelo MESMO endpoint /chat/completions (compatível OpenAI) mas com
// content parts multimodais — o contrato é o snippet oficial do
// utilizador (v55):
//   messages: [{ role: "user", content: [
//     { type: "text",      text: "What is in this image?" },
//     { type: "image_url", image_url: { url: … } } ] }]
//   max_tokens: 65536 · reasoning_budget: 16384
//   temperature: 0.6 · top_p: 0.95 · stream: false|true
//
// Duas formas de resposta, as DUAS suportadas (honesto):
//   · stream=false → JSON com choices[0].message.content +
//     message.reasoning_content + usage;
//   · stream=true  → SSE com delta.content/delta.reasoning_content —
//     o MESMO parser byte a byte do núcleo do chat (v54, fonte única).
//
// Onde corre: browser (aba «Ver» da /ia) e Node (test-ia-v55.mjs) —
// zero DOM, zero imports de DOM/THREE; a chave NUNCA vive aqui (o browser
// fala com a edge function/proxy que injeta a Autorização).
// ═══════════════════════════════════════════════════════════════════════

import {
  LIMITES, NemotronError, NemotronRateLimitError, PortaoRateLimit,
  drenarSse, extrairMensagem, finalizarUso, sleep,
  type UsoIa,
} from "./nemotron.ts";

export const MODELO_VISAO_PADRAO = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

// Catálogo honesto: o modelo do snippet é o VERIFICADO; um alias aceito
// pelo catálogo omni entra como declarado-não-verificado (o erro real do
// upstream aparece se não existir — nunca inventamos verificação).
export const MODELOS_VISAO_CONHECIDOS = [
  { id: MODELO_VISAO_PADRAO, rotulo: "Nemotron 3 Nano Omni 30B-A3B · visão", verificado: true },
] as const;

export const LIMITES_VISAO = {
  MAX_TOKENS_CAP: 65_536,        // o snippet pede 65536 — cap na EXACTA
  ORCAMENTO_RACIOCINIO_CAP: 16_384, // reasoning_budget do snippet — cap na EXACTA
  TEMPERATURA_MAX: 2,
  TOP_P_MAX: 1,
  PERGUNTA_CAP: 4_000,           // caracteres da pergunta (curta e útil)
  IMAGEM_URL_CAP: 12_000_000,    // https URL ou data URL base64 (~8,9 MB binário)
  PARTES_CAP: 4,                 // content parts por mensagem (texto + imagem)
} as const;

export interface ParametrosVisao {
  modelo: string;
  temperatura: number;
  topP: number;
  maxTokens: number;
  /** reasoning_budget do snippet — 0 = omitido do corpo (honesto). */
  orcamentoRaciocinio: number;
  stream: boolean;
}

export const PARAMETROS_VISAO_PADRAO: ParametrosVisao = {
  modelo: MODELO_VISAO_PADRAO,
  temperatura: 0.6,   // o EXACTO do snippet
  topP: 0.95,         // o EXACTO do snippet
  maxTokens: 2048,
  orcamentoRaciocinio: 16_384, // o EXACTO do snippet
  stream: true,
};

// ── Imagem: validação honesta (sem surpresas) ───────────────────────────

export interface ImagemValida {
  tipo: "https" | "dados";
  /** Só para data URLs: bytes binários aproximados (base64 → 3/4). */
  bytesAprox: number | null;
}

/** Aceita https://… , http://… , ou data:image/(png|jpeg|jpg|webp|gif);base64,… .
 *  TUDO o resto é recusado com o motivo real (file:, javascript:, texto solto…). */
export function validarImagemFonte(fonte: string): ImagemValida {
  const f = String(fonte ?? "").trim();
  if (!f) throw new NemotronError("imagem em falta");
  if (f.length > LIMITES_VISAO.IMAGEM_URL_CAP) {
    throw new NemotronError(`imagem excede ${LIMITES_VISAO.IMAGEM_URL_CAP} caracteres`);
  }
  if (/^https?:\/\/[^\s"'<>\\]+$/i.test(f)) return { tipo: "https", bytesAprox: null };
  const dados = f.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (dados) {
    const base64 = dados[2].replace(/\s+/g, "");
    return { tipo: "dados", bytesAprox: Math.floor((base64.length * 3) / 4) };
  }
  if (/^data:/i.test(f)) {
    throw new NemotronError("data URL tem de ser data:image/(png|jpeg|jpg|webp|gif);base64,…");
  }
  throw new NemotronError("imagem tem de ser https://… ou data:image/…;base64,…");
}

// ── Corpo do pedido (contrato EXACTO do snippet) ────────────────────────

export type ParteVisao =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface CorpoVisao {
  model: string;
  messages: { role: "user"; content: ParteVisao[] }[];
  temperature: number;
  top_p: number;
  max_tokens: number;
  reasoning_budget?: number;
  stream: boolean;
  stream_options?: { include_usage: true };
}

export function construirCorpoVisao(
  pergunta: string,
  imagemFonte: string,
  p: ParametrosVisao,
): CorpoVisao {
  const texto = String(pergunta ?? "").trim().slice(0, LIMITES_VISAO.PERGUNTA_CAP);
  if (!texto) throw new NemotronError("pergunta vazia — diz o que queres saber da imagem");
  validarImagemFonte(imagemFonte);

  const corpo: CorpoVisao = {
    model: p.modelo || MODELO_VISAO_PADRAO,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: texto },
          { type: "image_url", image_url: { url: String(imagemFonte).trim() } },
        ],
      },
    ],
    temperature: clampNum(p.temperatura, 0, LIMITES_VISAO.TEMPERATURA_MAX, PARAMETROS_VISAO_PADRAO.temperatura),
    top_p: clampNum(p.topP, 0, LIMITES_VISAO.TOP_P_MAX, PARAMETROS_VISAO_PADRAO.topP),
    max_tokens: Math.round(clampNum(p.maxTokens, 1, LIMITES_VISAO.MAX_TOKENS_CAP, PARAMETROS_VISAO_PADRAO.maxTokens)),
    stream: !!p.stream,
  };
  const orcamento = Math.round(clampNum(p.orcamentoRaciocinio, 0, LIMITES_VISAO.ORCAMENTO_RACIOCINIO_CAP, 0));
  if (orcamento > 0) corpo.reasoning_budget = orcamento;
  if (corpo.stream) corpo.stream_options = { include_usage: true };
  return corpo;
}

function clampNum(v: number, min: number, max: number, padrao: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, n));
}

// ── Resposta não-streaming (stream=false do snippet) ────────────────────

export interface RespostaVisao {
  conteudo: string;
  raciocinio: string;
  uso: { prompt_tokens: number | null; completion_tokens: number | null; total_tokens: number | null } | null;
}

/** Extrai choices[0].message.{content,reasoning_content} + usage —
 *  o que falta fica NULL/vazio (nunca inventado). */
export function analisarRespostaVisao(json: unknown): RespostaVisao {
  const obj = json as any;
  const msg = obj?.choices?.[0]?.message;
  if (!msg) throw new NemotronError("resposta sem choices[0].message — formato desconhecido");
  const uso = obj?.usage && typeof obj.usage === "object" ? obj.usage : null;
  return {
    conteudo: typeof msg.content === "string" ? msg.content : "",
    raciocinio: typeof msg.reasoning_content === "string" ? msg.reasoning_content : "",
    uso: uso
      ? {
          prompt_tokens: numOuNula(uso.prompt_tokens),
          completion_tokens: numOuNula(uso.completion_tokens),
          total_tokens: numOuNula(uso.total_tokens),
        }
      : null,
  };
}

function numOuNula(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ── Cliente ─────────────────────────────────────────────────────────────

export interface OpcoesClienteVisao {
  endpoint: string;
  /** Chave DIRECTA — só dev/direct-mode; produção injeta no proxy/edge. */
  chave?: string;
  tentativas?: number;
  portao?: PortaoRateLimit;
  cabecalhos?: Record<string, string>;
}

export type EventoStreamVisao =
  | { tipo: "raciocinio"; texto: string }
  | { tipo: "conteudo"; texto: string }
  | { tipo: "uso"; uso: UsoIa }
  | { tipo: "fim" };

export interface ResultadoVisao {
  conteudo: string;
  raciocinio: string;
  uso: UsoIa | null;
  parado: boolean;
}

export class ClienteNemotronVisao {
  readonly portao: PortaoRateLimit;
  private tentativas: number;
  private opcoes: OpcoesClienteVisao;

  constructor(opcoes: OpcoesClienteVisao) {
    this.opcoes = opcoes;
    this.portao = opcoes.portao ?? new PortaoRateLimit(
      LIMITES.CHAMADAS_POR_JANELA, LIMITES.JANELA_MS, LIMITES.INTERVALO_MINIMO_MS,
    );
    this.tentativas = Math.max(1, opcoes.tentativas ?? LIMITES.TENTATIVAS_PADRAO);
  }

  /** Modo stream=false do snippet: UMA resposta JSON completa. */
  async analisar(pergunta: string, imagem: string, p: ParametrosVisao, sinal?: AbortSignal): Promise<ResultadoVisao> {
    const corpo = construirCorpoVisao(pergunta, imagem, { ...p, stream: false });
    const espera = this.portao.reservar();
    if (espera > 0) throw new NemotronRateLimitError(espera);

    const inicio = Date.now();
    const resposta = await this.enviarComRetry(corpo, sinal, "application/json");
    if (!resposta.ok) {
      const texto = await resposta.text().catch(() => "");
      throw new NemotronError(`O upstream recusou (HTTP ${resposta.status})${extrairMensagem(texto)}`, resposta.status);
    }
    let json: unknown;
    try { json = await resposta.json(); } catch {
      throw new NemotronError("upstream devolveu algo que não é JSON (stream=false)");
    }
    const r = analisarRespostaVisao(json);
    const msTotal = Date.now() - inicio;
    return {
      conteudo: r.conteudo,
      raciocinio: r.raciocinio,
      uso: r.uso
        ? finalizarUso(r.uso, null, msTotal, r.conteudo)
        : { promptTokens: null, completionTokens: null, totalTokens: null, msPrimeiroToken: null, msTotal, tokensPorSegundo: null },
      parado: false,
    };
  }

  /** Modo stream=true: token a token, reasoning separado — o MESMO parser SSE
   *  do chat v54 (drenarSse/analisarEventoSse — fonte única). */
  async analisarStream(
    pergunta: string,
    imagem: string,
    p: ParametrosVisao,
    opts: { aoEvento?: (e: EventoStreamVisao) => void; sinal?: AbortSignal } = {},
  ): Promise<ResultadoVisao> {
    const corpo = construirCorpoVisao(pergunta, imagem, { ...p, stream: true });
    const espera = this.portao.reservar();
    if (espera > 0) throw new NemotronRateLimitError(espera);

    const controlador = new AbortController();
    const aoAbortarExterno = () => controlador.abort();
    const sinal = opts.sinal;
    if (sinal) {
      if (sinal.aborted) controlador.abort();
      else sinal.addEventListener("abort", aoAbortarExterno, { once: true });
    }

    const inicio = Date.now();
    let msPrimeiroToken: number | null = null;
    let conteudo = "";
    let raciocinio = "";
    let usageFinal: { prompt_tokens?: number | null; completion_tokens?: number | null; total_tokens?: number | null } | null = null;
    let parado = false;

    try {
      const resposta = await this.enviarComRetry(corpo, controlador.signal, "text/event-stream");
      if (!resposta.ok || !resposta.body) {
        const texto = await resposta.text().catch(() => "");
        throw new NemotronError(`O upstream recusou (HTTP ${resposta.status})${extrairMensagem(texto)}`, resposta.status);
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
            opts.aoEvento?.({ tipo: "raciocinio", texto: parte.raciocinio });
          }
          if (parte.conteudo) {
            conteudo += parte.conteudo;
            if (msPrimeiroToken === null) msPrimeiroToken = Date.now() - inicio;
            opts.aoEvento?.({ tipo: "conteudo", texto: parte.conteudo });
          }
          if (parte.usage) {
            usageFinal = parte.usage;
            opts.aoEvento?.({ tipo: "uso", uso: finalizarUso(usageFinal, msPrimeiroToken, Date.now() - inicio, conteudo) });
          }
        }
        if (controlador.signal.aborted) { parado = true; try { await leitor.cancel(); } catch {} break; }
      }
      if (controlador.signal.aborted) parado = true;
    } catch (err: any) {
      if (controlador.signal.aborted || err?.name === "AbortError") parado = true;
      else throw err instanceof NemotronError ? err : new NemotronError(String(err?.message ?? err));
    } finally {
      if (sinal) sinal.removeEventListener("abort", aoAbortarExterno);
    }

    const msTotal = Date.now() - inicio;
    const uso = finalizarUso(usageFinal, msPrimeiroToken, msTotal, conteudo);
    opts.aoEvento?.({ tipo: "fim" });
    return { conteudo, raciocinio, uso, parado };
  }

  private async enviarComRetry(corpo: CorpoVisao, sinal: AbortSignal | undefined, accept: string): Promise<Response> {
    let ultimoErro: unknown = null;
    for (let tentativa = 1; tentativa <= this.tentativas; tentativa++) {
      try {
        const cabecalhos: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: accept,
          ...this.opcoes.cabecalhos,
        };
        if (this.opcoes.chave) cabecalhos["Authorization"] = `Bearer ${this.opcoes.chave}`;
        const resposta = await fetch(this.opcoes.endpoint, {
          method: "POST",
          headers: cabecalhos,
          body: JSON.stringify(corpo),
          signal: sinal,
        });
        // retry SÓ antes do 1.º byte (429/5xx) — nunca duplica respostas a meio
        if ((resposta.status === 429 || resposta.status >= 500) && tentativa < this.tentativas) {
          await resposta.body?.cancel().catch(() => {});
          ultimoErro = new NemotronError(`HTTP ${resposta.status}`, resposta.status);
          await sleep(Math.min(8000, 500 * 2 ** (tentativa - 1)), sinal);
          continue;
        }
        return resposta;
      } catch (err: any) {
        if (sinal?.aborted || err?.name === "AbortError") throw err;
        ultimoErro = err;
        if (tentativa < this.tentativas) await sleep(Math.min(8000, 500 * 2 ** (tentativa - 1)), sinal);
      }
    }
    throw ultimoErro instanceof NemotronError
      ? ultimoErro
      : new NemotronError(String((ultimoErro as any)?.message ?? ultimoErro));
  }
}
