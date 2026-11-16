// ═══════════════════════════════════════════════════════════════════════
// v56 — IA NEMOTRON RAG — A IA LÊ A PLATAFORMA — NÚCLEO PURO
//
// v54 deu a FALA (chat), v55 deu o OLHO (visão) e a MEMÓRIA (vetores
// multimodais). A v56 ENCHE a memória com os dados REAIS da plataforma
// (sorteios ativos, concursos ativos, blog publicado) e liga-a ao CHAT:
// pergunta → vetor query (input_type "query", o EXACTO do snippet v55) →
// busca por cosseno na LojaVetores → as melhores passagens entram como
// CONTEXTO no system do chat → o modelo responde apoiado no que é REAL,
// com fontes citadas — e com a regra honesta: se o contexto não responder,
// DIZ (nunca inventa sorteios, vencedores, preços ou licenças).
//
// Padrão isomórfico v46–v55: este módulo corre no browser (página /ia) E
// no Node (test-ia-v56.mjs) — zero DOM, zero THREE, zero imports de React.
// Tudo determinístico: divisão de passagens, montagem do contexto e
// deduplicação por documento são funções puras testáveis byte a byte.
//
// Regras honestas declaradas:
//   · o contexto CITA as fontes ([1], [2]…) com a pontuação cosseno REAL
//     (nunca ajustada, nunca escondida);
//   · passagens do MESMO documento não se repetem no contexto (a melhor
//     de cada doc fica — diversidade de fontes);
//   · cap de caracteres do contexto — passagens a mais são CORTADAS, não
//     esmagadas (o texto truncado mantém-se legível);
//   · sem fontes acima do limiar → contexto NULL — o chat segue SEM
//     contexto (o chamador declara, nunca finge que "leu" a plataforma).
// ═══════════════════════════════════════════════════════════════════════

import { NemotronError } from "./nemotron.ts";
import { cosseno, LojaVetores, type ResultadoBusca } from "./nemotron-vetores.ts";

export const LIMITES_RAG = {
  PASSAGEM_CAP: 600,        // caracteres por passagem (chunking honesto)
  ROTULO_CONTEXTO_CAP: 120, // rótulo do doc no contexto
  CONTEXTO_CAP: 3200,       // caracteres da parte das FONTES (cabeçalho + regras são fixos)
  TOP_K: 3,                 // fontes máximas no contexto
  LIMIAR: 0.15,             // cosseno mínimo para uma fonte entrar
  DOCS_CAP: 200,            // documentos no índice RAG
  PASSAGENS_CAP: 400,       // passagens totais na loja RAG (mais velha sai)
} as const;

export type TipoDocPlataforma = "sorteio" | "concurso" | "blog" | "manual";

export interface DocPlataforma {
  id: string;
  tipo: TipoDocPlataforma;
  rotulo: string;
  texto: string;
  /** Caminho interno da plataforma (ex.: /raffle/x) — citado no contexto. */
  url?: string;
}

export interface PassagemRag {
  id: string;               // `${doc.id}#p${i}` — determinístico
  docId: string;
  tipo: TipoDocPlataforma;
  rotulo: string;
  texto: string;
  url?: string;
}

export interface ResultadoBuscaRag {
  passagem: PassagemRag;
  pontuacao: number;
}

// ── Divisão de passagens (chunking determinístico, sem quebrar a meio) ──

/** Divide `texto` em passagens de ≤ cap caracteres: primeiro por parágrafos
 *  (linhas vazias), depois por frases; só corta a meio como ÚLTIMO recurso
 *  (declared). Determinístico: a mesma entrada dá sempre o mesmo output. */
export function dividirEmPassagens(texto: string, cap: number = LIMITES_RAG.PASSAGEM_CAP): string[] {
  const limpo = String(texto ?? "").trim();
  if (!limpo) throw new NemotronError("texto vazio — nada para dividir");
  const limite = Math.max(80, Math.round(cap));
  if (limpo.length <= limite) return [limpo];

  const saida: string[] = [];
  const paragrafos = limpo.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  for (const paragrafo of paragrafos) {
    if (paragrafo.length <= limite) {
      juntar(saida, paragrafo, limite);
      continue;
    }
    // Parágrafo longo: acumula FRASES inteiras (não quebra a meio da frase).
    const frases = paragrafo.match(/[^.!?…]+(?:[.!?…]+|$|\n)/g) ?? [paragrafo];
    let atual = "";
    for (const fraseBruta of frases) {
      const frase = fraseBruta.trim();
      if (!frase) continue;
      if (frase.length > limite) {
        // Frase MONSTRUOSA (sem pontuação): corte duro declarado, a meio.
        if (atual) { saida.push(atual); atual = ""; }
        for (let i = 0; i < frase.length; i += limite) saida.push(frase.slice(i, i + limite));
        continue;
      }
      if ((atual + (atual ? " " : "") + frase).length <= limite) {
        atual = atual ? `${atual} ${frase}` : frase;
      } else {
        if (atual) saida.push(atual);
        atual = frase;
      }
    }
    if (atual) saida.push(atual);
  }
  return saida.length ? saida : [limpo.slice(0, limite)];
}

/** Junta `pedaco` ao último bloco se couberem juntos (≤ cap) — evita
 *  passagens minúsculas desnecessárias. */
function juntar(saida: string[], pedaco: string, cap: number): void {
  const ultimo = saida[saida.length - 1];
  if (ultimo && (ultimo + "\n\n" + pedaco).length <= cap) {
    saida[saida.length - 1] = `${ultimo}\n\n${pedaco}`;
  } else {
    saida.push(pedaco);
  }
}

// ── Doc → passagens (com rótulo no texto para o embedding achar sentido) ──

/** Transforma um doc da plataforma em passagens: `«rótulo» — pedaço`.
 *  IDs determinísticos (`${doc.id}#p${i}`) — reindexar substitui sem duplicar. */
export function docParaPassagens(
  doc: DocPlataforma,
  cap: number = LIMITES_RAG.PASSAGEM_CAP,
): PassagemRag[] {
  const rotulo = String(doc?.rotulo ?? "").trim().slice(0, LIMITES_RAG.ROTULO_CONTEXTO_CAP) || "—";
  if (!doc || !String(doc.texto ?? "").trim()) throw new NemotronError(`doc sem texto (${doc?.id ?? "?"})`);
  const pedacos = dividirEmPassagens(doc.texto, cap);
  return pedacos.map((pedaco, i) => ({
    id: `${doc.id}#p${i}`,
    docId: doc.id,
    tipo: doc.tipo,
    rotulo: pedacos.length > 1 ? `${rotulo} (${i + 1}/${pedacos.length})` : rotulo,
    texto: `${rotulo} — ${pedaco}`,
    url: doc.url,
  }));
}

// ── Montagem do CONTEXTO (o bloco que entra no system do chat) ──────────

/** Constrói o bloco de contexto determinístico a partir dos resultados da
 *  busca (podem chegar por qualquer ordem — aqui ordenam por cosseno DESC).
 *  Deduplica por docId (a MELHOR passagem de cada doc). Sem fontes acima
 *  do limiar → null (o chamador segue sem contexto, declarado). */
export function montarContextoRag(
  resultados: ResultadoBuscaRag[],
  opcoes: { k?: number; limiar?: number; cap?: number } = {},
): string | null {
  const k = Math.max(1, Math.round(opcoes.k ?? LIMITES_RAG.TOP_K));
  const limiar = Number.isFinite(opcoes.limiar) ? (opcoes.limiar as number) : LIMITES_RAG.LIMIAR;
  const cap = Math.max(400, Math.round(opcoes.cap ?? LIMITES_RAG.CONTEXTO_CAP));

  const validas = (resultados ?? [])
    .filter((r) => r && r.passagem && Number.isFinite(r.pontuacao) && r.pontuacao >= limiar)
    .sort((a, b) => b.pontuacao - a.pontuacao);

  // Deduplica por documento — a melhor passagem de cada doc (fontes diversas).
  const vistos = new Set<string>();
  const escolhidas: ResultadoBuscaRag[] = [];
  for (const r of validas) {
    if (vistos.has(r.passagem.docId)) continue;
    vistos.add(r.passagem.docId);
    escolhidas.push(r);
    if (escolhidas.length >= k) break;
  }
  if (!escolhidas.length) return null;

  const linhas: string[] = [];
  let total = 0;
  for (let i = 0; i < escolhidas.length; i++) {
    const r = escolhidas[i];
    const fonte = r.passagem.url ? ` | fonte: ${r.passagem.url}` : "";
    const linha = `[${i + 1}] (${r.passagem.tipo} · ${(r.pontuacao * 100).toFixed(1)}%) ${r.passagem.rotulo} — ${r.passagem.texto}${fonte}`;
    const linhaFinal = linha.slice(0, cap);
    if (total + linhaFinal.length > cap && linhas.length) break; // cap honesto: corta fontes, não esmaga
    linhas.push(linhaFinal);
    total += linhaFinal.length;
  }

  return (
    "[CONTEXTO REAL DA PLATAFORMA BATEU — busca semântica (cosseno) sobre o índice desta conversa]\n" +
    `${linhas.join("\n")}\n` +
    "REGRAS DO CONTEXTO: para factos da plataforma (sorteios, concursos, blog, preços, prémios, datas) " +
    "usa APENAS estas fontes e cita-as na resposta na forma [1] [2]. " +
    "Se o contexto não responder à pergunta, diz honestamente que não encontrou no índice e responde " +
    "pelo teu conhecimento geral SEM inventar dados da plataforma. Nunca inventes resultados de sorteios, " +
    "vencedores, probabilidades, preços ou licenças. Os valores entre parênteses são a pontuação cosseno " +
    "REAL da fonte — quanto mais baixa, menos relevante; não os cites como factos."
  );
}

// ── LojaRag — passagens + vetores, com cap honesto ──────────────────────

export class LojaRag {
  private itens = new Map<string, { passagem: PassagemRag; vetor: number[] }>();
  private capPassagens: number;
  private capDocs: number;

  constructor(capPassagens: number = LIMITES_RAG.PASSAGENS_CAP, capDocs: number = LIMITES_RAG.DOCS_CAP) {
    this.capPassagens = Math.max(1, Math.round(capPassagens));
    this.capDocs = Math.max(1, Math.round(capDocs));
  }

  get tamanho(): number { return this.itens.size; }

  /** Nº de DOCUMENTOS distintos no índice. */
  get documentos(): number { return new Set([...this.itens.values()].map((i) => i.passagem.docId)).size; }

  /** Insere/substitui por id; ao exceder o cap, a passagem MAIS VELHA sai. */
  adicionar(passagem: PassagemRag, vetor: number[]): void {
    if (!Array.isArray(vetor) || !vetor.length || !vetor.every(Number.isFinite)) {
      throw new NemotronError("vetor da passagem vazio ou não-finito");
    }
    if (this.documentos >= this.capDocs && !this.itens.has(passagem.id)) {
      const docJaLa = [...this.itens.values()].some((i) => i.passagem.docId === passagem.docId);
      if (!docJaLa) throw new NemotronError(`índice cheio (${this.capDocs} documentos)`);
    }
    if (this.itens.has(passagem.id)) {
      this.itens.set(passagem.id, { passagem, vetor: [...vetor] });
      return;
    }
    // Cap de passagens: a mais velha sai primeiro (ordem de inserção do Map).
    while (this.itens.size >= this.capPassagens) {
      const maisVelha = this.itens.keys().next().value;
      if (maisVelha === undefined) break;
      this.itens.delete(maisVelha);
    }
    this.itens.set(passagem.id, { passagem, vetor: [...vetor] });
  }

  /** Substitui TODAS as passagens de um doc (reindexação sem duplicados). */
  substituirDoc(passagens: PassagemRag[], vetores: number[][]): void {
    if (passagens.length !== vetores.length) {
      throw new NemotronError("passagens e vetores em números desiguais");
    }
    for (const p of passagens) this.removerDoc(p.docId);
    for (let i = 0; i < passagens.length; i++) this.adicionar(passagens[i], vetores[i]);
  }

  removerDoc(docId: string): number {
    let removidos = 0;
    for (const [id, item] of this.itens) {
      if (item.passagem.docId === docId) { this.itens.delete(id); removidos++; }
    }
    return removidos;
  }

  removerTipo(tipo: TipoDocPlataforma): number {
    let removidos = 0;
    for (const [id, item] of this.itens) {
      if (item.passagem.tipo === tipo) { this.itens.delete(id); removidos++; }
    }
    return removidos;
  }

  limpar(): void { this.itens.clear(); }

  /** Busca top-k por cosseno REAL (reusa a pontuação do núcleo v55). */
  buscar(vetor: number[], opcoes: { k?: number; limiar?: number } = {}): ResultadoBuscaRag[] {
    return [...this.itens.values()]
      .map(({ passagem, vetor: v }) => ({ passagem, pontuacao: cosseno(vetor, v) }))
      .filter((r) => r.pontuacao >= (Number.isFinite(opcoes.limiar) ? (opcoes.limiar as number) : -1))
      .sort((a, b) => b.pontuacao - a.pontuacao)
      .slice(0, Math.max(1, Math.round(opcoes.k ?? 10)));
  }

  estatisticas(): { passagens: number; documentos: number; porTipo: Record<string, number> } {
    const porTipo: Record<string, number> = {};
    for (const { passagem } of this.itens.values()) {
      porTipo[passagem.tipo] = (porTipo[passagem.tipo] ?? 0) + 1;
    }
    return { passagens: this.tamanho, documentos: this.documentos, porTipo };
  }

  listar(): PassagemRag[] { return [...this.itens.values()].map((i) => i.passagem); }
}

// ── Ponte honesta com a LojaVetores v55 (itens manuais entram no RAG) ───

/** Converte resultados da LojaVetores (busca pessoal v55) em resultados RAG —
 *  usado quando o utilizador indexa itens manuais e quer que o chat os leia. */
export function itemVetorParaDoc(item: { id: string; rotulo: string; texto: string }): DocPlataforma {
  return {
    id: `manual-${item.id}`,
    tipo: "manual",
    rotulo: item.rotulo,
    texto: item.texto || item.rotulo,
  };
}

/** Adaptador: resultados no formato ResultadoBusca (LojaVetores) → RAG. */
export function buscaVetoresParaRag(res: ResultadoBusca[], tipos?: string[]): ResultadoBuscaRag[] {
  return res.map((r) => ({
    passagem: {
      id: r.item.id,
      docId: r.item.id,
      tipo: (tipos?.[0] as TipoDocPlataforma) ?? "manual",
      rotulo: r.item.rotulo,
      texto: r.item.texto || r.item.rotulo,
    },
    pontuacao: r.pontuacao,
  }));
}

// Reexporta o essencial para o UI/testes usarem UMA fonte (padrão v55).
export { LojaVetores, cosseno };
