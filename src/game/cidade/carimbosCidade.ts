// ============================================================
// CIDADE BATEU — CARIMBOS PUROS (v52 — N4)
// Os carimbos da cidade (Praça do Imbondeiro, quiosque, casa,
// sala de troféus, 10 edifícios-portal dos distritos) saíram da
// classe MundoCidade para módulo ZERO-THREE/ZERO-DOM — o padrão
// v46/v47/v49/v50/v51 (extensão .ts explícita, corre no Node).
//
// PORQUÊ (a cirurgia anotada desde a v47): o servidor de presença
// partilhada re-simulava só o TERRENO (alturaCidade) — paredes de
// EDIFÍCIOS eram invisíveis ao servidor («Honesto (o que fica)»
// da v47: «anotado para N4 com voxels do chunk no servidor»).
// Com os carimbos num módulo puro, o SERVIDOR constrói o mesmo
// campo de voxels que o cliente pisa: mesma geração
// (gerarDadosTerreno + perfilCidade, provada byte a byte na v46)
// + os MESMOS carimbos daqui → andar atráves de uma parede no
// multiplayer é recusado com o motivo honesto «parede».
//
// DETERMINISMO: os corpos dos carimbos são EXACTAMENTE os que
// viviam em MundoCidade (mesmos loops, mesmos raios, o mesmo
// Aleatorio(SEED_CIDADE + 1) por chamada — os loops percorrem
// intervalos fixos do mundo, por isso a sequência do PRNG é a
// mesma em qualquer chunk, como antes).
// ============================================================

import { B, CHUNK, ALTURA } from "../blocos/constants.ts";
import { Aleatorio } from "../blocos/noise.ts";
import { SEED_CIDADE, ALTURA_PLATEAU } from "./core.ts";
import { RAIO_FUSAO } from "./terrenoCidade.ts";

const idx = (x: number, y: number, z: number) => (y * CHUNK + z) * CHUNK + x;

// ── Distritos (portais para a plataforma) ────────────────────
export interface Distrito {
  id: string;
  nome: string;
  rota: string;        // rota real da plataforma (verificada em App.tsx)
  cor: string;         // cor de acento (HUD / rótulos)
  bloco: number;       // bloco das paredes
  ang: number;         // ângulo em torno da praça (rad)
}

const R_DIS = 27; // raio dos distritos

const distrito = (id: string, nome: string, rota: string, cor: string, bloco: number, graus: number): Distrito =>
  ({ id, nome, rota, cor, bloco, ang: (graus * Math.PI) / 180 });

/** Os 10 distritos — rotas verificadas contra App.tsx (zero rotas inventadas). */
export const DISTRITOS: Distrito[] = [
  distrito("sorteios", "Casa da Sorte", "/marketplace", "#f59e0b", B.TABUAS, 0),
  distrito("leiloes", "Galeria do Martelo", "/leiloes", "#a78bfa", B.PEDREGULHO, 36),
  distrito("desporto", "Estádio Imbondeiro", "/desporto", "#22c55e", B.PEDRA, 72),
  distrito("esports", "Arena Digital", "/esports", "#22d3ee", B.PEDRA, 108),
  distrito("jogos", "Fliperama Central", "/jogos", "#f472b6", B.TABUAS, 144),
  distrito("lives", "Palco da Praça", "/lives", "#fb7185", B.TABUAS, 180),
  distrito("negocios", "Feira Central", "/negocios", "#fb923c", B.AREIA, 216),
  distrito("comunidade", "Praça do Povo", "/community", "#f87171", B.PEDREGULHO, 252),
  distrito("gratis", "Portão dos Jogos Grátis", "/jogos-gratis", "#34d399", B.TABUAS, 288),
  distrito("concursos", "Sala dos Concursos", "/concursos", "#facc15", B.AREIA, 324),
];

export const posDistrito = (di: Distrito): [number, number] =>
  [Math.round(Math.cos(di.ang) * R_DIS), Math.round(Math.sin(di.ang) * R_DIS)];

/** A casa do jogador — entre a Casa da Sorte e a Galeria. */
export const POS_CASA: [number, number] = [Math.round(Math.cos(0.314) * 14), Math.round(Math.sin(0.314) * 14)];
/** Sala de Troféus — pavilhão aberto a sul da praça. */
export const POS_TROFEUS: [number, number] = [0, 12];
/** Quiosque da Praça (v34) — rádio da cidade + quiz, a NE do imbondeiro. */
export const POS_QUIOSQUE: [number, number] = [5, -5];

// ── O alvo de um carimbo (a única coisa que um carimbo precisa) ──
export interface AlvoCarimbo {
  cx: number; cz: number;                                  // chunk que recebe (para o guarda de limites)
  por(x: number, y: number, z: number, id: number): void;  // coordenadas do MUNDO
  coluna(x: number, yTopo: number, z: number, id: number): void;
}

/** Adaptador para dados de chunk crus (Uint8Array) — o caminho do SERVIDOR
 *  e das probes Node. Mesma matemática do adaptador do MundoCidade (por
 *  filtra membros do chunk, coluna preenche de ALTURA_PLATEAU+1 a yTopo). */
export function alvoParaDados(dados: Uint8Array, cx: number, cz: number): AlvoCarimbo {
  return {
    cx, cz,
    por(x, y, z, id) {
      if (y < 0 || y >= ALTURA) return;
      const ccx = Math.floor(x / CHUNK), ccz = Math.floor(z / CHUNK);
      if (ccx !== cx || ccz !== cz) return;
      const lx = ((x % CHUNK) + CHUNK) % CHUNK, lz = ((z % CHUNK) + CHUNK) % CHUNK;
      dados[idx(lx, y, lz)] = id;
    },
    coluna(x, yTopo, z, id) {
      for (let y = ALTURA_PLATEAU + 1; y <= yTopo; y++) this.por(x, y, z, id);
    },
  };
}

/** O GUARDA de limites dos carimbos — o mesmo teste que vivia no posGerar
 *  da MundoCidade: chunks fora da fusão (+8 de folga) não recebem carimbos.
 *  Função exportada para o servidor e as probes poderem consultá-lo sem
 *  duplicar a condição. */
export function chunkTemCarimbos(cx: number, cz: number): boolean {
  const bx = cx * CHUNK, bz = cz * CHUNK;
  return !(bx > RAIO_FUSAO + 8 || bz > RAIO_FUSAO + 8 || bx + CHUNK < -RAIO_FUSAO - 8 || bz + CHUNK < -RAIO_FUSAO - 8);
}

/** Carimba a cidade inteira num alvo — a MESMA sequência que a MundoCidade
 *  aplicava no posGerar (praca → quiosque → casa → troféus → distritos). */
export function carimbarCidade(a: AlvoCarimbo): void {
  if (!chunkTemCarimbos(a.cx, a.cz)) return;
  carimbarPraca(a);
  carimbarQuiosque(a);
  carimbarCasa(a);
  carimbarTrofeus(a);
  for (const di of DISTRITOS) carimbarDistrito(a, di);
}

// ── Praça do Imbondeiro (coração da cidade) ─────────────────
function carimbarPraca(a: AlvoCarimbo) {
  const rnd = new Aleatorio(SEED_CIDADE + 1);
  const R = 8;
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    const d2 = Math.hypot(x, z);
    if (d2 > R + 0.5) continue;
    a.por(x, ALTURA_PLATEAU, z, d2 > R - 1 ? B.PEDREGULHO : B.PEDRA);
    if (d2 > R - 1.8 && d2 <= R - 1 && rnd.chance(0.34))
      a.por(x, ALTURA_PLATEAU + 1, z, rnd.chance(0.5) ? B.FLOR_AM : B.FLOR_VM);
  }
  // imbondeiro: tronco alto + copa larga e achatada (assinatura da cidade)
  for (let y = ALTURA_PLATEAU + 1; y <= ALTURA_PLATEAU + 6; y++) a.por(0, y, 0, B.TRONCO);
  for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
    const d2 = Math.abs(dx) + Math.abs(dz);
    if (d2 <= 7 && !(dx === 0 && dz === 0)) {
      if (d2 <= 5 || rnd.chance(0.6)) a.por(dx, ALTURA_PLATEAU + 7, dz, B.FOLHAS);
      if (d2 <= 3 && rnd.chance(0.7)) a.por(dx, ALTURA_PLATEAU + 6, dz, B.FOLHAS);
    }
  }
  // 4 postes de tocha na beira da praça
  for (const [px, pz] of [[0, -R], [0, R], [-R, 0], [R, 0]] as [number, number][]) {
    a.por(px, ALTURA_PLATEAU + 1, pz, B.TRONCO);
    a.por(px, ALTURA_PLATEAU + 2, pz, B.TOCHA);
  }
  // caminhos da praça até cada distrito (largura 2 + postes de tocha)
  for (const di of DISTRITOS) {
    const passos = R_DIS - R;
    for (let s = 0; s <= passos; s++) {
      const t = (R + s) / R_DIS;
      const x = Math.round(Math.cos(di.ang) * R_DIS * t);
      const z = Math.round(Math.sin(di.ang) * R_DIS * t);
      for (const [ox, oz] of [[0, 0], [1, 0], [0, 1], [1, 1]] as [number, number][])
        a.por(x + ox, ALTURA_PLATEAU, z + oz, s % 4 === 0 ? B.PEDREGULHO : B.PEDRA);
      if (s % 9 === 4) {
        const lx = Math.round(x - Math.sin(di.ang) * 2.4), lz = Math.round(z + Math.cos(di.ang) * 2.4);
        a.por(lx, ALTURA_PLATEAU + 1, lz, B.TRONCO);
        a.por(lx, ALTURA_PLATEAU + 2, lz, B.TOCHA);
      }
    }
  }
}

// ── Quiosque da Praça (v34: rádio da cidade + quiz) ──────────
function carimbarQuiosque(a: AlvoCarimbo) {
  const [qx, qz] = POS_QUIOSQUE;
  for (let x = qx - 1; x <= qx + 1; x++) for (let z = qz - 1; z <= qz + 1; z++) {
    a.por(x, ALTURA_PLATEAU, z, B.TABUAS);       // pavimento
    a.por(x, ALTURA_PLATEAU + 4, z, B.FOLHAS);   // telhado de folha
  }
  for (const [px, pz] of [[qx - 1, qz - 1], [qx + 1, qz - 1], [qx - 1, qz + 1], [qx + 1, qz + 1]] as [number, number][])
    a.coluna(px, ALTURA_PLATEAU + 3, pz, B.TRONCO); // postes
  a.por(qx, ALTURA_PLATEAU + 1, qz, B.MESA);       // balcão do quiosque
  a.por(qx, ALTURA_PLATEAU + 5, qz, B.TOCHA);      // tocha no topo
}

// ── A Casa do Jogador (existe desde o dia 1) ─────────────────
function carimbarCasa(a: AlvoCarimbo) {
  const [cx0, cz0] = POS_CASA;
  const M = 3; // 7×7
  for (let x = cx0 - M; x <= cx0 + M; x++) for (let z = cz0 - M; z <= cz0 + M; z++) {
    const borda = x === cx0 - M || x === cx0 + M || z === cz0 - M || z === cz0 + M;
    const canto = (x === cx0 - M || x === cx0 + M) && (z === cz0 - M || z === cz0 + M);
    // telhado completo (v33)
    a.por(x, ALTURA_PLATEAU + 5, z, B.TABUAS);
    if (borda) {
      a.coluna(x, ALTURA_PLATEAU + 4, z, canto ? B.TRONCO : B.TABUAS);
    } else {
      a.por(x, ALTURA_PLATEAU, z, B.TABUAS);
    }
  }
  a.por(cx0, ALTURA_PLATEAU + 6, cz0, B.FOLHAS);
  // porta virada para a praça + janelas de vidro
  const dx = cx0 < 0 ? -1 : 1, dz = cz0 < 0 ? -1 : 1;
  a.por(cx0 + dx * M, ALTURA_PLATEAU + 1, cz0, B.AR);
  a.por(cx0 + dx * M, ALTURA_PLATEAU + 2, cz0, B.AR);
  a.por(cx0, ALTURA_PLATEAU + 1, cz0 + dz * M, B.AR);
  a.por(cx0, ALTURA_PLATEAU + 2, cz0 + dz * M, B.AR);
  a.por(cx0 + dx * M, ALTURA_PLATEAU + 3, cz0, B.VIDRO);
  a.por(cx0, ALTURA_PLATEAU + 3, cz0 + dz * M, B.VIDRO);
  // interior: cama, baú, mesa, tocha
  a.por(cx0 - 1, ALTURA_PLATEAU + 1, cz0 - 1, B.CAMA);
  a.por(cx0 + 1, ALTURA_PLATEAU + 1, cz0 - 1, B.BAU);
  a.por(cx0 + 1, ALTURA_PLATEAU + 1, cz0 + 1, B.MESA);
  a.por(cx0, ALTURA_PLATEAU + 3, cz0, B.TOCHA);
  // pad de entrada
  for (const [ox, oz] of [[dx * (M + 1), 0], [dx * (M + 2), 0], [dx * (M + 1), 1], [dx * (M + 2), 1]] as [number, number][])
    a.por(cx0 + ox, ALTURA_PLATEAU, cz0 + oz, B.PEDRA);
}

// ── Sala de Troféus (pavilhão aberto) ────────────────────────
function carimbarTrofeus(a: AlvoCarimbo) {
  const [cx0, cz0] = POS_TROFEUS;
  for (let x = cx0 - 3; x <= cx0 + 3; x++) for (let z = cz0 - 3; z <= cz0 + 3; z++) {
    const d2 = Math.hypot(x - cx0, z - cz0);
    if (d2 > 3.2) continue;
    a.por(x, ALTURA_PLATEAU, z, B.PEDRA);
    if (d2 > 2.2 && (x + z) % 2 === 0) a.coluna(x, ALTURA_PLATEAU + 3, z, B.TRONCO);
  }
  for (let x = cx0 - 3; x <= cx0 + 3; x++) for (let z = cz0 - 3; z <= cz0 + 3; z++)
    if (Math.hypot(x - cx0, z - cz0) <= 3.2) a.por(x, ALTURA_PLATEAU + 4, z, B.FOLHAS);
  a.por(cx0, ALTURA_PLATEAU + 1, cz0, B.BAU); // o "baú dos troféus"
  a.por(cx0, ALTURA_PLATEAU + 5, cz0, B.TOCHA);
}

// ── Edifício-portal de um distrito ───────────────────────────
function carimbarDistrito(a: AlvoCarimbo, di: Distrito) {
  const [bx, bz] = posDistrito(di);
  const M = 4; // 9×9
  const H = 5;
  // limpa árvores naturais sobre a zona do edifício (até y+12)
  for (let x = bx - M - 1; x <= bx + M + 1; x++) for (let z = bz - M - 1; z <= bz + M + 1; z++)
    for (let y = ALTURA_PLATEAU + 6; y <= ALTURA_PLATEAU + 12; y++) a.por(x, y, z, B.AR);
  for (let x = bx - M; x <= bx + M; x++) for (let z = bz - M; z <= bz + M; z++) {
    const borda = Math.abs(x - bx) === M || Math.abs(z - bz) === M;
    const canto = Math.abs(x - bx) === M && Math.abs(z - bz) === M;
    if (borda) {
      for (let y = 1; y <= H; y++) a.por(x, ALTURA_PLATEAU + y, z, canto ? B.TRONCO : di.bloco);
      if (canto) a.por(x, ALTURA_PLATEAU + H + 2, z, B.FOLHAS);
    } else {
      a.por(x, ALTURA_PLATEAU, z, B.PEDRA);
    }
    // telhado completo 9×9 (v33: antes era só anel, parecia inacabado)
    a.por(x, ALTURA_PLATEAU + H + 1, z, di.bloco);
  }
  // janelas de vidro
  for (let t = -2; t <= 2; t += 2) {
    a.por(bx + t, ALTURA_PLATEAU + 3, bz - M, B.VIDRO);
    a.por(bx + t, ALTURA_PLATEAU + 3, bz + M, B.VIDRO);
    a.por(bx - M, ALTURA_PLATEAU + 3, bz + t, B.VIDRO);
    a.por(bx + M, ALTURA_PLATEAU + 3, bz + t, B.VIDRO);
  }
  // porta dupla virada para a praça
  const nx = -Math.cos(di.ang), nz = -Math.sin(di.ang);
  const px2 = Math.round(bx + nx * M), pz2 = Math.round(bz + nz * M);
  a.por(px2, ALTURA_PLATEAU + 1, pz2, B.AR);
  a.por(px2, ALTURA_PLATEAU + 2, pz2, B.AR);
  a.por(px2 + (nz !== 0 ? 1 : 0), ALTURA_PLATEAU + 1, pz2 + (nx !== 0 ? 1 : 0), B.AR);
  a.por(px2 + (nz !== 0 ? 1 : 0), ALTURA_PLATEAU + 2, pz2 + (nx !== 0 ? 1 : 0), B.AR);
  // interior: tocha + baú decorativo
  a.por(bx, ALTURA_PLATEAU + 4, bz, B.TOCHA);
  a.por(bx, ALTURA_PLATEAU + 1, bz, B.BAU);
  // pad frontal + postes de tocha
  for (let s = 1; s <= 3; s++) {
    const fx = Math.round(bx + nx * (M + s)), fz = Math.round(bz + nz * (M + s));
    for (const o of [-1, 0, 1]) {
      const ox = nz !== 0 ? o : 0, oz = nx !== 0 ? o : 0;
      a.por(fx + ox, ALTURA_PLATEAU, fz + oz, s === 3 ? B.PEDREGULHO : B.PEDRA);
    }
  }
  for (const o of [-1.8, 1.8]) {
    const fx = Math.round(bx + nx * (M + 3) + (nz !== 0 ? o : 0));
    const fz = Math.round(bz + nz * (M + 3) + (nx !== 0 ? o : 0));
    a.por(fx, ALTURA_PLATEAU + 1, fz, B.TRONCO);
    a.por(fx, ALTURA_PLATEAU + 2, fz, B.TOCHA);
  }
}
