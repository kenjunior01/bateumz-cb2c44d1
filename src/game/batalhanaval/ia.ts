// ═══════════════════════════════════════════════════════════════
// BATALHA NAVAL — IA (v75, 2.ª vaga «IA de elite»)
// ────────────────────────────────────────────────────────────────
// A v42 tinha o «difícil» a meio caminho: mapa de densidade mas
// SEM modo-alvo a valer (o +10 nos vizinhos continuava a gastar
// tiros em volta de navios JÁ AFUNDADOS) e SEM paridade honesta.
// A v75 passa a:
//
//   • MODO-ALVO de verdade: só as células «hit» de navios AINDA
//     VIVOS guiam os tiros; afundado é público (regra real do jogo)
//     e deixa de atrair tiros. Um hit isolado abre os 4 eixos;
//     dois hits em linha FIXAM o eixo e a IA continua a linha até
//     ao fim, respeitando os tamanhos que ainda faltam afundar.
//   • MAPA DE PROBABILIDADE completo na caça: cada colocação
//     possível de CADA navio restante conta uma vez (sem sobrepor
//     navios), com paridade (r+c)%2 no «médio» para não repetir
//     padrão que deixa escadas de 2 escapar.
//   • Determinística: RNG com semente (mulberry32) — o teste
//     semeia e espera o MESMO tiro. Sem semente, o componente
//     semeia com Date.now() (honesto por partida).
//
// PURA: sem DOM, sem localStorage — corre no browser e no node.
// ═══════════════════════════════════════════════════════════════

export type DificuldadeNaval = "facil" | "medio" | "dificil";

/** O que o ATACANTE vê do inimigo (nunca «ship» — só tiros). */
export type TabuleiroTiro = ("empty" | "hit" | "miss")[][];
/** O tabuleiro REAL do inimigo (componente é dono; afundado é público). */
export type TabuleiroNavio = ("empty" | "ship" | "hit")[][];

export type Rng = () => number;

export function mulberry32(semente: number): Rng {
  let a = semente >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAM = 8;

// ── Frota: afundados + restantes (a partir do tabuleiro REAL) ───
export interface FrotaDados {
  afundados: boolean[][];      // células hit que pertencem a navios AFUNDADOS
  restantes: number[];         // tamanhos ainda por afundar (ex.: [5,3,2])
}

/** Componentes ligados (4-conexidade) das células {ship,hit}. */
function componentes(tab: TabuleiroNavio): [number, number][][] {
  const vistos = new Set<string>();
  const comps: [number, number][][] = [];
  for (let r = 0; r < TAM; r++) {
    for (let c = 0; c < TAM; c++) {
      if (tab[r][c] === "empty" || vistos.has(`${r},${c}`)) continue;
      const comp: [number, number][] = [];
      const pilha: [number, number][] = [[r, c]];
      vistos.add(`${r},${c}`);
      while (pilha.length) {
        const [cr, cc] = pilha.pop()!;
        comp.push([cr, cc]);
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          const nr = cr + dr, nc = cc + dc;
          if (nr >= 0 && nr < TAM && nc >= 0 && nc < TAM && tab[nr][nc] !== "empty" && !vistos.has(`${nr},${nc}`)) {
            vistos.add(`${nr},${nc}`);
            pilha.push([nr, nc]);
          }
        }
      }
      comps.push(comp);
    }
  }
  return comps;
}

export function dadosDaFrota(tab: TabuleiroNavio, tamanhosBase: number[]): FrotaDados {
  const afundados = Array.from({ length: TAM }, () => Array(TAM).fill(false));
  const restantes = [...tamanhosBase];
  for (const comp of componentes(tab)) {
    const afundou = comp.every(([r, c]) => tab[r][c] === "hit");
    if (!afundou) continue;
    for (const [r, c] of comp) afundados[r][c] = true;
    // consome UM tamanho da lista igual ao do componente (navios que
    // se tocaram fundem componentes — consome o maior que caiba)
    const tam = comp.length;
    let idx = restantes.findIndex((s) => s === tam);
    if (idx < 0) {
      let melhor = -1;
      for (let i = 0; i < restantes.length; i++) if (restantes[i] < tam && (melhor < 0 || restantes[i] > restantes[melhor])) melhor = i;
      idx = melhor;
    }
    if (idx >= 0) restantes.splice(idx, 1);
  }
  return { afundados, restantes };
}

// ── Células hit AINDA VIVAS ─────────────────────────────────────
function hitsVivos(ataque: TabuleiroTiro, afundados: boolean[][]): [number, number][] {
  const vivos: [number, number][] = [];
  for (let r = 0; r < TAM; r++)
    for (let c = 0; c < TAM; c++)
      if (ataque[r][c] === "hit" && !afundados[r][c]) vivos.push([r, c]);
  return vivos;
}

const cabe = (r: number, c: number) => r >= 0 && r < TAM && c >= 0 && c < TAM;

/** Colocações válidas de um navio de tamanho s (células empty OU hit-vivo). */
function colocacoes(ataque: TabuleiroTiro, afundados: boolean[][], vivos: Set<string>, s: number): [number, number][][] {
  const out: [number, number][][] = [];
  const cabeTudo = (celulas: [number, number][]) => {
    for (const [r, c] of celulas) {
      if (!cabe(r, c)) return false;
      const t = ataque[r][c];
      if (t === "miss") return false;
      if (t === "hit" && !vivos.has(`${r},${c}`)) return false; // hit de navio afundado não reaproveita
    }
    return true;
  };
  for (let r = 0; r < TAM; r++) {
    for (let c = 0; c + s <= TAM; c++) {
      const cel: [number, number][] = [];
      for (let i = 0; i < s; i++) cel.push([r, c + i]);
      if (cabeTudo(cel)) out.push(cel);
    }
  }
  for (let c = 0; c < TAM; c++) {
    for (let r = 0; r + s <= TAM; r++) {
      const cel: [number, number][] = [];
      for (let i = 0; i < s; i++) cel.push([r + i, c]);
      if (cabeTudo(cel)) out.push(cel);
    }
  }
  return out;
}

/**
 * Mapa de probabilidade. `soComHits` (modo-alvo) só conta colocações
 * que cobrem PELO MENOS um hit vivo — é isto que AFFUNDA em vez de
 * passear. Devolve o mapa e o melhor conjunto (empates juntos).
 */
export function mapaProbabilidade(
  ataque: TabuleiroTiro,
  afundados: boolean[][],
  restantes: number[],
  soComHits: boolean,
): number[][] {
  const prob: number[][] = Array.from({ length: TAM }, () => Array(TAM).fill(0));
  const listaVivos = hitsVivos(ataque, afundados);
  const vivos = new Set(listaVivos.map(([r, c]) => `${r},${c}`));
  if (restantes.length === 0) return prob;
  for (const s of restantes) {
    for (const cel of colocacoes(ataque, afundados, vivos, s)) {
      if (soComHits && !cel.some(([r, c]) => vivos.has(`${r},${c}`))) continue;
      for (const [r, c] of cel) if (ataque[r][c] === "empty") prob[r][c] += 1;
    }
  }
  // navio restante maior que o tabuleiro permite (frota fundida) —
  // garante pelo menos as células junto aos hits vivos
  if (soComHits && vivos.size > 0) {
    let algum = false;
    for (let r = 0; r < TAM; r++) for (let c = 0; c < TAM; c++) if (prob[r][c] > 0) algum = true;
    if (!algum) {
      for (const [hr, hc] of listaVivos) {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          const nr = hr + dr, nc = hc + dc;
          if (cabe(nr, nc) && ataque[nr][nc] === "empty") prob[nr][nc] += 1;
        }
      }
    }
  }
  return prob;
}

function escolherDoMapa(prob: number[][], rng: Rng): [number, number] {
  let max = 0;
  const melhores: [number, number][] = [];
  for (let r = 0; r < TAM; r++)
    for (let c = 0; c < TAM; c++)
      if (prob[r][c] > max) { max = prob[r][c]; melhores.length = 0; melhores.push([r, c]); }
      else if (prob[r][c] === max && max > 0) melhores.push([r, c]);
  return melhores[Math.floor(rng() * melhores.length)];
}

function tiroAleatorio(ataque: TabuleiroTiro, rng: Rng): [number, number] {
  const vazias: [number, number][] = [];
  for (let r = 0; r < TAM; r++)
    for (let c = 0; c < TAM; c++)
      if (ataque[r][c] === "empty") vazias.push([r, c]);
  return vazias[Math.floor(rng() * vazias.length)];
}

export interface EntradaIA {
  ataque: TabuleiroTiro;
  afundados: boolean[][];
  restantes: number[];
  rng: Rng;
}

/** O tiro da IA — MESMO papel do bloco de dificuldades que o componente tinha. */
export function escolherTiro(e: EntradaIA, dificuldade: DificuldadeNaval): [number, number] {
  const { ataque, afundados, restantes, rng } = e;
  const vazias = (() => {
    let n = 0;
    for (let r = 0; r < TAM; r++) for (let c = 0; c < TAM; c++) if (ataque[r][c] === "empty") n++;
    return n;
  })();
  if (vazias === 0) return [-1, -1];

  if (dificuldade === "facil") return tiroAleatorio(ataque, rng);

  const vivos = hitsVivos(ataque, afundados);

  // MODO-ALVO: hits vivos mandam — afundar vale mais que caçar
  if (vivos.length > 0) {
    const prob = mapaProbabilidade(ataque, afundados, restantes, true);
    const melhor = escolherDoMapa(prob, rng);
    if (melhor) return melhor;
  }

  // CAÇA
  if (dificuldade === "medio") {
    // paridade honesta: com navios ≥2, alternar (r+c)%2 cobre tudo
    const prob = mapaProbabilidade(ataque, afundados, restantes, false);
    const paridade = prob.map((row, r) => row.map((v, c) => ((r + c) % 2 === 0 ? v : 0)));
    const temParidade = paridade.some((row) => row.some((v) => v > 0));
    const melhor = escolherDoMapa(temParidade ? paridade : prob, rng);
    if (melhor) return melhor;
    return tiroAleatorio(ataque, rng);
  }

  // difícil: densidade completa (cada colocação de cada navio conta)
  const prob = mapaProbabilidade(ataque, afundados, restantes, false);
  const melhor = escolherDoMapa(prob, rng);
  return melhor ?? tiroAleatorio(ataque, rng);
}
