// ═══════════════════════════════════════════════════════════════════════
// v55 — IA NEMOTRON VETORES (EMBEDDINGS MULTIMODAIS) — NÚCLEO PURO
//
// A MEMÓRIA semântica da plataforma: nvidia/nemotron-3.5-embed-8b pelo
// endpoint /embeddings (compatível OpenAI) — o contrato é o snippet
// oficial do utilizador (v55):
//   input: [`<texto> data:image/png;base64,<b64>`]  ← texto + imagem na
//          MESMA string, separados por UM espaço
//   model: "nvidia/nemotron-3.5-embed-8b" · encoding_format: "float"
//   modality: ["text_image"] · input_type: "passage" · truncate: "END"
//   resposta: data[i].embedding (floats) + usage
//
// O snippet também define o caminho da imagem: descarrega (https://) e
// base64a ANTES de enviar — este núcleo faz o MESMO (imagemParaDataUrl,
// isomórfico: fetch+btoa no browser E no Node).
//
// Por cima dos vetores: cosseno puro + LojaVetores (cap honesto, busca
// top-k por pontuação) — a persistência é do chamador (padrão v54 das
// conversas). Tudo testável no Node, zero DOM.
// ═══════════════════════════════════════════════════════════════════════

import {
  LIMITES, NemotronError, NemotronRateLimitError, PortaoRateLimit, extrairMensagem, sleep,
} from "./nemotron.ts";
import { LIMITES_VISAO } from "./nemotron-visao.ts";

export const MODELO_EMBED_PADRAO = "nvidia/nemotron-3.5-embed-8b";

export const LIMITES_VETORES = {
  ENTRADAS_CAP: 8,             // entradas por pedido (o snippet usa 1 — lote honesto)
  TEXTO_CAP: 8_000,            // caracteres do texto por entrada
  IMAGEM_URL_CAP: LIMITES_VISAO.IMAGEM_URL_CAP, // mesmo cap de imagem da visão
  IMAGEM_BYTES_CAP: 8 * 1024 * 1024, // 8 MB binários após descarregar
  DIMENSAO_MAX: 16_384,        // dimensão máxima aceite (o real chega na resposta)
  LOJA_CAP: 500,               // itens na loja (o mais velho sai primeiro)
  PERSISTENCIA_CAP: 30,        // itens em localStorage na UI (vetores a 6 casas)
  CASAS_ARREDONDAMENTO: 6,     // precisão da persistência (cosseno imune a 1e-6)
} as const;

export type TipoEntradaVetor = "texto" | "imagem" | "texto_imagem";
export type TipoConsulta = "passage" | "query";
export type TipoTruncagem = "NONE" | "END" | "START";

export interface EntradaVetor {
  texto: string;
  /** https://… (é descarregado e base64ado, como no snippet) ou data:image/…;base64,…. */
  imagem?: string;
}

// ── Composição do input (o CORAÇÃO do contrato do snippet) ──────────────

/** `${texto} data:image/png;base64,<b64>` — texto e imagem na MESMA string.
 *  Sem imagem: só o texto. É EXACTAMENTE o formato do snippet oficial. */
export function comporEntradaVetor(entrada: EntradaVetor): string {
  const texto = String(entrada?.texto ?? "").trim();
  const imagem = String(entrada?.imagem ?? "").trim();
  if (!texto && !imagem) throw new NemotronError("entrada vazia — texto e/ou imagem");
  if (texto.length > LIMITES_VETORES.TEXTO_CAP) {
    throw new NemotronError(`texto excede ${LIMITES_VETORES.TEXTO_CAP} caracteres`);
  }
  if (!imagem) return texto;
  if (imagem.length > LIMITES_VETORES.IMAGEM_URL_CAP) {
    throw new NemotronError(`imagem excede ${LIMITES_VETORES.IMAGEM_URL_CAP} caracteres`);
  }
  if (!/^https?:\/\/[^\s"'<>\\]+$/i.test(imagem) &&
      !/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/i.test(imagem)) {
    throw new NemotronError("imagem tem de ser https://… ou data:image/…;base64,…");
  }
  return texto ? `${texto} ${imagem}` : imagem;
}

/** O caminho do snippet: https → descarrega → base64; data URL → passa como vem. */
export async function imagemParaDataUrl(fonte: string, sinal?: AbortSignal): Promise<string> {
  const f = String(fonte ?? "").trim();
  if (!f) throw new NemotronError("imagem em falta");
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(f)) {
    if (f.length > LIMITES_VETORES.IMAGEM_URL_CAP) {
      throw new NemotronError(`imagem excede ${LIMITES_VETORES.IMAGEM_URL_CAP} caracteres`);
    }
    return f;
  }
  if (!/^https?:\/\//i.test(f)) throw new NemotronError("imagem tem de ser https://… ou data:image/…;base64,…");
  let resposta: Response;
  try {
    resposta = await fetch(f, { signal: sinal });
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
    throw new NemotronError(`imagem inacessível — ${String(err?.message ?? err).slice(0, 200)}`);
  }
  if (!resposta.ok) {
    await resposta.body?.cancel().catch(() => {});
    throw new NemotronError(`imagem inacessível (HTTP ${resposta.status})`);
  }
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  if (bytes.length > LIMITES_VETORES.IMAGEM_BYTES_CAP) {
    throw new NemotronError(`imagem excede ${LIMITES_VETORES.IMAGEM_BYTES_CAP} bytes após descarregar`);
  }
  const mime = (resposta.headers.get("content-type") || "image/png").split(";")[0].trim();
  const tipo = /^image\/(png|jpeg|jpg|webp|gif)$/.test(mime) ? mime : "image/png";
  return `data:${tipo};base64,${bytesParaBase64(bytes)}`;
}

function bytesParaBase64(bytes: Uint8Array): string {
  let bin = "";
  const BLOCO = 0x8000;
  for (let i = 0; i < bytes.length; i += BLOCO) {
    bin += String.fromCharCode(...bytes.subarray(i, i + BLOCO));
  }
  return btoa(bin);
}

// ── Corpo do pedido (contrato OpenAI + extra_body do snippet achatado) ──

export interface CorpoVetores {
  model: string;
  input: string[];
  encoding_format: "float";
  modality: ["text_image"];
  input_type: TipoConsulta;
  truncate: TipoTruncagem;
}

export interface OpcoesVetores {
  modelo?: string;
  inputType?: TipoConsulta;   // passage = indexar; query = procurar (padrão NVIDIA)
  truncate?: TipoTruncagem;
}

export function construirCorpoVetores(entradas: EntradaVetor[], opcoes: OpcoesVetores = {}): CorpoVetores {
  if (!Array.isArray(entradas) || !entradas.length) throw new NemotronError("input tem de ser um array não-vazio");
  if (entradas.length > LIMITES_VETORES.ENTRADAS_CAP) {
    throw new NemotronError(`máximo ${LIMITES_VETORES.ENTRADAS_CAP} entradas por pedido`);
  }
  const inputType: TipoConsulta = opcoes.inputType === "query" ? "query" : "passage";
  const truncate: TipoTruncagem =
    opcoes.truncate === "NONE" || opcoes.truncate === "START" ? opcoes.truncate : "END"; // o EXACTO do snippet
  return {
    model: opcoes.modelo || MODELO_EMBED_PADRAO,
    input: entradas.map(comporEntradaVetor),
    encoding_format: "float",            // o EXACTO do snippet
    modality: ["text_image"],            // o EXACTO do snippet
    input_type: inputType,
    truncate,
  };
}

// ── Resposta (data[i].embedding + usage) ────────────────────────────────

export interface UsoVetores {
  promptTokens: number | null;
  totalTokens: number | null;
}

export interface RespostaVetores {
  vetores: number[][];
  uso: UsoVetores | null;
  dimensao: number;
}

/** Valida data[i].embedding: floats finitos, MESMA dimensão em todas. */
export function validarRespostaVetores(json: unknown): RespostaVetores {
  const obj = json as any;
  const data = obj?.data;
  if (!Array.isArray(data) || !data.length) {
    throw new NemotronError("resposta sem data[].embedding — formato desconhecido");
  }
  const vetores: number[][] = [];
  let dimensao = 0;
  for (let i = 0; i < data.length; i++) {
    const emb = data[i]?.embedding;
    if (!Array.isArray(emb) || !emb.length) {
      throw new NemotronError(`data[${i}].embedding ausente ou vazio`);
    }
    if (!dimensao) dimensao = emb.length;
    if (emb.length !== dimensao) {
      throw new NemotronError(`embeddings com dimensões desiguais (${dimensao} vs ${emb.length} em data[${i}])`);
    }
    if (emb.length > LIMITES_VETORES.DIMENSAO_MAX) {
      throw new NemotronError(`dimensão ${emb.length} excede o cap ${LIMITES_VETORES.DIMENSAO_MAX}`);
    }
    const vetor = emb.map((x: unknown) => {
      const n = Number(x);
      if (!Number.isFinite(n)) throw new NemotronError(`data[${i}].embedding tem valor não-finito`);
      return n;
    });
    vetores.push(vetor);
  }
  const uso = obj?.usage && typeof obj.usage === "object" ? obj.usage : null;
  return {
    vetores,
    dimensao,
    uso: uso ? { promptTokens: numOuNula(uso.prompt_tokens), totalTokens: numOuNula(uso.total_tokens) } : null,
  };
}

function numOuNula(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// ── Cosseno puro (a pontuação da busca semântica) ───────────────────────

export function cosseno(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) {
    throw new NemotronError("vetores vazios");
  }
  if (a.length !== b.length) throw new NemotronError(`dimensões desiguais (${a.length} vs ${b.length})`);
  let produto = 0, normaA = 0, normaB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new NemotronError("vetor com valor não-finito");
    produto += x * y; normaA += x * x; normaB += y * y;
  }
  if (normaA === 0 || normaB === 0) return 0; // convenção declarada: vetor nulo → 0
  return produto / (Math.sqrt(normaA) * Math.sqrt(normaB));
}

export function arredondarVetor(vetor: number[], casas: number = LIMITES_VETORES.CASAS_ARREDONDAMENTO): number[] {
  const f = 10 ** casas;
  return vetor.map((x) => Math.round(x * f) / f);
}

// ── Loja de vetores (dados puros; persistência é do chamador) ───────────

export interface ItemVetor {
  id: string;
  rotulo: string;
  texto: string;
  tipo: TipoEntradaVetor;
  vetor: number[];
  criadoEm: number;
}

export interface ResultadoBusca {
  item: ItemVetor;
  pontuacao: number;
}

export class LojaVetores {
  private itens: ItemVetor[] = [];
  private cap: number;

  constructor(cap: number = LIMITES_VETORES.LOJA_CAP) {
    this.cap = Math.max(1, Math.round(cap));
  }

  /** Insere ou substitui por id; quando o cap é atingido o MAIS VELHO sai. */
  adicionar(item: { id?: string; rotulo: string; texto: string; tipo: TipoEntradaVetor; vetor: number[] }): ItemVetor {
    if (!Array.isArray(item.vetor) || !item.vetor.length) throw new NemotronError("vetor vazio");
    const agora = Date.now();
    const completo: ItemVetor = {
      id: item.id || `vet-${agora.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      rotulo: String(item.rotulo || "").slice(0, 120) || "—",
      texto: String(item.texto || "").slice(0, 4_000),
      tipo: item.tipo,
      vetor: [...item.vetor],
      criadoEm: agora,
    };
    const idx = this.itens.findIndex((i) => i.id === completo.id);
    if (idx >= 0) this.itens[idx] = completo;
    else {
      this.itens.push(completo);
      if (this.itens.length > this.cap) this.itens.shift(); // o mais velho sai primeiro
    }
    return completo;
  }

  remover(id: string): boolean {
    const antes = this.itens.length;
    this.itens = this.itens.filter((i) => i.id !== id);
    return this.itens.length < antes;
  }

  limpar(): void { this.itens = []; }

  get tamanho(): number { return this.itens.length; }

  listar(): ItemVetor[] { return [...this.itens]; }

  estatisticas(): { itens: number; dimensao: number | null } {
    return { itens: this.itens.length, dimensao: this.itens[0]?.vetor.length ?? null };
  }

  /** Busca top-k por cosseno — ordena DESC, corta no limiar (default: tudo). */
  buscarVetor(vetor: number[], opcoes: { k?: number; limiar?: number } = {}): ResultadoBusca[] {
    const k = Math.max(1, Math.round(opcoes.k ?? 5));
    const limiar = Number.isFinite(opcoes.limiar) ? (opcoes.limiar as number) : -1;
    const pontuadas = this.itens
      .map((item) => ({ item, pontuacao: cosseno(vetor, item.vetor) }))
      .filter((r) => r.pontuacao >= limiar)
      .sort((x, y) => y.pontuacao - x.pontuacao);
    return pontuadas.slice(0, k);
  }
}

// ── Cliente ─────────────────────────────────────────────────────────────

export interface OpcoesClienteVetores {
  endpoint: string;
  /** Chave DIRECTA — só dev/direct-mode; produção injeta no proxy/edge. */
  chave?: string;
  tentativas?: number;
  portao?: PortaoRateLimit;
  cabecalhos?: Record<string, string>;
}

export class ClienteNemotronVetores {
  readonly portao: PortaoRateLimit;
  private tentativas: number;
  private opcoes: OpcoesClienteVetores;

  constructor(opcoes: OpcoesClienteVetores) {
    this.opcoes = opcoes;
    // INTERVALO MÍNIMO 0 — DECISÃO DECLARADA: indexar/eliminar em lote é o
    // caso legítimo dos embeddings (chamadas rápidas e curtas); o cap de
    // 20/min da janela mantém-se e o proxy/edge continuam a limitar por baixo.
    this.portao = opcoes.portao ?? new PortaoRateLimit(LIMITES.CHAMADAS_POR_JANELA, LIMITES.JANELA_MS, 0);
    this.tentativas = Math.max(1, opcoes.tentativas ?? LIMITES.TENTATIVAS_PADRAO);
  }

  /** Um pedido /embeddings completo: devolve os vetores na ORDEM do input. */
  async vetorizar(
    entradas: EntradaVetor[],
    opcoes: OpcoesVetores & { sinal?: AbortSignal } = {},
  ): Promise<RespostaVetores> {
    const corpo = construirCorpoVetores(entradas, opcoes);
    const espera = this.portao.reservar();
    if (espera > 0) throw new NemotronRateLimitError(espera);

    const controlador = new AbortController();
    const sinal = opcoes.sinal;
    const aoAbortarExterno = () => controlador.abort();
    if (sinal) {
      if (sinal.aborted) controlador.abort();
      else sinal.addEventListener("abort", aoAbortarExterno, { once: true });
    }

    try {
      const resposta = await this.enviarComRetry(corpo, controlador.signal);
      if (!resposta.ok) {
        const texto = await resposta.text().catch(() => "");
        throw new NemotronError(`O upstream recusou (HTTP ${resposta.status})${extrairMensagem(texto)}`, resposta.status);
      }
      let json: unknown;
      try { json = await resposta.json(); } catch {
        throw new NemotronError("upstream devolveu algo que não é JSON");
      }
      return validarRespostaVetores(json);
    } finally {
      if (sinal) sinal.removeEventListener("abort", aoAbortarExterno);
    }
  }

  private async enviarComRetry(corpo: CorpoVetores, sinal: AbortSignal): Promise<Response> {
    let ultimoErro: unknown = null;
    for (let tentativa = 1; tentativa <= this.tentativas; tentativa++) {
      try {
        const cabecalhos: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...this.opcoes.cabecalhos,
        };
        if (this.opcoes.chave) cabecalhos["Authorization"] = `Bearer ${this.opcoes.chave}`;
        const resposta = await fetch(this.opcoes.endpoint, {
          method: "POST",
          headers: cabecalhos,
          body: JSON.stringify(corpo),
          signal: sinal,
        });
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
