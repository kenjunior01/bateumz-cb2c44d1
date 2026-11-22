// ═══════════════════════════════════════════════════════════════
// LUDO — IA (v75, 2.ª vaga «IA de elite»)
// ────────────────────────────────────────────────────────────────
// O Ludo era só hot-seat (passar o telemóvel) — NÃO tinha adversário
// de máquina nenhum. A v75 traz o modo «vs IA» com uma política de
// VERDADE (não é ficha aleatória):
//
//   1. TERMINAR (+1000) — ficha que chega ao fim (58) ganha o jogo
//      célula a célula;
//   2. CAPTURAR (+500) — aterrar na casa de um adversário (fora de
//      casa segura) manda-o para a base;
//   3. FUGIR DO PERIGO (+250) — sair de casa ameaçada por ficha
//      inimiga a 1..6 passos atrás na pista;
//   4. CASA SEGURA / COLUNA FINAL (+120) — estrela ou entrada na
//      coluna, onde ninguém apanha;
//   5. TIRAR DA BASE (+90) — dado 6 põe ficha nova em jogo;
//   6. PROGRESSO — quanto mais avança, melhor (empate por semente).
//
// Regras ISOMÓRFICAS com o componente (mesma canMove: base -1 só
// sai com 6, coluna 52..57, fim 58, entrada por HE[jogador]).
// Determinística: RNG com semente (mulberry32) nos testes; no
// ecrã passa-se Math.random (honesto por partida).
// PURA: sem DOM, sem localStorage — browser e node comem o mesmo.
// ═══════════════════════════════════════════════════════════════

export type Pos = number; // -1 base · 0..51 pista · 52..57 coluna · 58 fim

export const SO = [0, 13, 26, 39]; // saída de cada jogador
export const HE = [51, 12, 25, 38]; // última casa da pista antes da coluna
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

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

export function trackIdx(jogador: number, passos: number): number {
  return (SO[jogador] + passos) % 52;
}

/** MESMA regra do canMove do componente (v60) — isolada para testes. */
export function destinoValido(pos: Pos, jogador: number, dado: number): Pos | null {
  if (pos === 58) return null;
  if (pos === -1) return dado === 6 ? 0 : null;
  const np = pos + dado;
  if (pos >= 52) return np <= 58 ? np : null;
  if (pos <= HE[jogador] && pos + dado > HE[jogador]) {
    const hp = 52 + (pos + dado - HE[jogador] - 1);
    return hp <= 58 ? hp : null;
  }
  if (np > 51) return null;
  return np;
}

/** A ficha está numa casa que um inimigo pode apanhar (1..6 atrás)? */
export function ameacado(pos: Pos, jogador: number, pecas: Pos[][]): boolean {
  if (pos < 0 || pos > 51) return false; // base e coluna não se apanham
  const minha = trackIdx(jogador, pos);
  if (SAFE.has(minha)) return false;
  for (let p = 0; p < 4; p++) {
    if (p === jogador) continue;
    for (const op of pecas[p]) {
      if (op < 0 || op > 51) continue;
      const alvo = trackIdx(p, op);
      const passoAte = (minha - alvo + 52) % 52;
      if (passoAte >= 1 && passoAte <= 6) return true;
    }
  }
  return false;
}

/** Aterrar em `alvo` apanha alguma ficha inimiga? (fora de casa segura) */
export function capturaEm(alvo: Pos, jogador: number, pecas: Pos[][]): boolean {
  if (alvo < 0 || alvo > 51) return false;
  const casa = trackIdx(jogador, alvo);
  if (SAFE.has(casa)) return false;
  for (let p = 0; p < 4; p++) {
    if (p === jogador) continue;
    for (const op of pecas[p]) {
      if (op >= 0 && op <= 51 && trackIdx(p, op) === casa) return true;
    }
  }
  return false;
}

const P_FIM = 1000;
const P_CAPTURA = 500;
const P_FUGIR = 250;
const P_SEGURA = 120;
const P_BASE = 90;

/** Pontos da jogada «de → para» (ótica do jogador). */
export function pontuarJogada(pecas: Pos[][], jogador: number, de: Pos, para: Pos): number {
  let pontos = para; // progresso puro 0..58
  if (para === 58) pontos += P_FIM;
  if (capturaEm(para, jogador, pecas)) pontos += P_CAPTURA;
  if (ameacado(de, jogador, pecas) && !capturaEm(para, jogador, pecas)) pontos += P_FUGIR;
  if (para >= 52) pontos += P_SEGURA;
  else if (para >= 0 && SAFE.has(trackIdx(jogador, para))) pontos += P_SEGURA;
  if (de === -1) pontos += P_BASE;
  return pontos;
}

/**
 * Ficha a mover (-1 = sem lance). Desempate com rng() — o jogo fica
 * menos robótico e os testes semeiam a semente.
 */
export function escolherPecaIA(pecas: Pos[][], jogador: number, dado: number, rng: Rng): number {
  let melhor = -1;
  let melhorPonto = -Infinity;
  for (let i = 0; i < 4; i++) {
    const para = destinoValido(pecas[jogador][i], jogador, dado);
    if (para === null) continue;
    const pontos = pontuarJogada(pecas, jogador, pecas[jogador][i], para) + rng() * 4;
    if (pontos > melhorPonto) {
      melhorPonto = pontos;
      melhor = i;
    }
  }
  return melhor;
}
