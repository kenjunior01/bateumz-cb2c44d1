// ============================================================
// CIDADE BATEU — v1 (2025-11-03)
// O mundo-âncora da plataforma: uma cidade voxel determinística
// onde cada distrito é um portal para uma secção da bateumz.
//
// Foco cultural: Moçambique · Angola · Cabo Verde (aberto ao mundo)
// - Semente FIXA (todos os visitantes vêem a mesma cidade — base
//   para multiplayer futuro e para partilhar coordenadas).
// - Texturas 100% canvas (motor original), zero assets externos.
// - Plateau plano + distritos à volta da Praça do Imbondeiro.
// ============================================================

import { B, CHUNK, ALTURA } from "../blocos/constants";
import { Mundo, type Chunk } from "../blocos/world";
import { GestorMobs } from "../blocos/mobs";
import { Aleatorio } from "../blocos/noise";

/** Semente fixa da cidade — a mesma para todo o mundo, para sempre. */
export const SEED_CIDADE = 20251103;
/** Altura do plateau da cidade (superfície andável = ALTURA_PLATEAU + 1). */
export const ALTURA_PLATEAU = 34;
/** Raio do plateau plano (para além disso o terreno natural regressa). */
export const RAIO_PLATEAU = 58;
/** Raio onde o plateau termina de fundir com o terreno natural. */
export const RAIO_FUSAO = 72;

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

/** Portal mais próximo se estiveres a ≤ `alcance` blocos (null = nenhum). */
export function portalPerto(
  x: number, z: number, alcance = 8,
): { tipo: "distrito" | "casa" | "trofeus"; distrito?: Distrito; dist: number } | null {
  let melhor: { tipo: "distrito" | "casa" | "trofeus"; distrito?: Distrito; dist: number } | null = null;
  const considerar = (tipo: "distrito" | "casa" | "trofeus", bx: number, bz: number, distrito_?: Distrito) => {
    const dist = Math.hypot(x - bx, z - bz);
    if (dist <= alcance && (!melhor || dist < melhor.dist)) melhor = { tipo, distrito: distrito_, dist };
  };
  for (const di of DISTRITOS) {
    const [bx, bz] = posDistrito(di);
    considerar("distrito", bx, bz, di);
  }
  considerar("casa", POS_CASA[0], POS_CASA[1]);
  considerar("trofeus", POS_TROFEUS[0], POS_TROFEUS[1]);
  return melhor;
}

// ── Mundo da cidade ──────────────────────────────────────────
export class MundoCidade extends Mundo {
  constructor() { super(SEED_CIDADE); }

  /** Plateau plano da cidade, fundindo suavemente com o terreno natural. */
  override alturaTerreno(x: number, z: number): number {
    const dist = Math.hypot(x, z);
    if (dist <= RAIO_PLATEAU) return ALTURA_PLATEAU;
    if (dist < RAIO_FUSAO) {
      const natural = super.alturaTerreno(x, z);
      const t = (dist - RAIO_PLATEAU) / (RAIO_FUSAO - RAIO_PLATEAU);
      return Math.max(4, Math.min(ALTURA - 6, Math.round(ALTURA_PLATEAU + (natural - ALTURA_PLATEAU) * t)));
    }
    return super.alturaTerreno(x, z);
  }

  /** Cidade tem sempre clima de planície (sem desertos no centro urbano). */
  override bioma(x: number, z: number): "planicie" | "deserto" | "floresta" | "montanha" {
    if (Math.hypot(x, z) <= RAIO_FUSAO) return "planicie";
    return super.bioma(x, z);
  }

  override gerarChunk(cx: number, cz: number): Chunk {
    const c = super.gerarChunk(cx, cz);
    const bx = cx * CHUNK, bz = cz * CHUNK;
    if (bx > RAIO_FUSAO + 8 || bz > RAIO_FUSAO + 8 || bx + CHUNK < -RAIO_FUSAO - 8 || bz + CHUNK < -RAIO_FUSAO - 8) return c;
    this.carimbarPraca(c);
    this.carimbarCasa(c);
    this.carimbarTrofeus(c);
    for (const di of DISTRITOS) this.carimbarDistrito(c, di);
    return c;
  }

  // util: põe um bloco no chunk (coordenadas do mundo)
  private por(c: Chunk, x: number, y: number, z: number, id: number) {
    if (y < 0 || y >= ALTURA) return;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    if (cx !== c.cx || cz !== c.cz) return;
    const lx = ((x % CHUNK) + CHUNK) % CHUNK, lz = ((z % CHUNK) + CHUNK) % CHUNK;
    c.dados[idx(lx, y, lz)] = id;
  }

  /** Preenche uma coluna a partir da superfície (evita buracos sob estruturas). */
  private coluna(c: Chunk, x: number, yTopo: number, z: number, id: number) {
    for (let y = ALTURA_PLATEAU + 1; y <= yTopo; y++) this.por(c, x, y, z, id);
  }

  // ── Praça do Imbondeiro (coração da cidade) ─────────────────
  private carimbarPraca(c: Chunk) {
    const rnd = new Aleatorio(SEED_CIDADE + 1);
    const R = 8;
    for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
      const d2 = Math.hypot(x, z);
      if (d2 > R + 0.5) continue;
      this.por(c, x, ALTURA_PLATEAU, z, d2 > R - 1 ? B.PEDREGULHO : B.PEDRA);
      if (d2 > R - 1.8 && d2 <= R - 1 && rnd.chance(0.34))
        this.por(c, x, ALTURA_PLATEAU + 1, z, rnd.chance(0.5) ? B.FLOR_AM : B.FLOR_VM);
    }
    // imbondeiro: tronco alto + copa larga e achatada (assinatura da cidade)
    for (let y = ALTURA_PLATEAU + 1; y <= ALTURA_PLATEAU + 6; y++) this.por(c, 0, y, 0, B.TRONCO);
    for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
      const d2 = Math.abs(dx) + Math.abs(dz);
      if (d2 <= 7 && !(dx === 0 && dz === 0)) {
        if (d2 <= 5 || rnd.chance(0.6)) this.por(c, dx, ALTURA_PLATEAU + 7, dz, B.FOLHAS);
        if (d2 <= 3 && rnd.chance(0.7)) this.por(c, dx, ALTURA_PLATEAU + 6, dz, B.FOLHAS);
      }
    }
    // 4 postes de tocha na beira da praça
    for (const [px, pz] of [[0, -R], [0, R], [-R, 0], [R, 0]] as [number, number][]) {
      this.por(c, px, ALTURA_PLATEAU + 1, pz, B.TRONCO);
      this.por(c, px, ALTURA_PLATEAU + 2, pz, B.TOCHA);
    }
    // caminhos da praça até cada distrito (largura 2 + postes de tocha)
    for (const di of DISTRITOS) {
      const passos = R_DIS - R;
      for (let s = 0; s <= passos; s++) {
        const t = (R + s) / R_DIS;
        const x = Math.round(Math.cos(di.ang) * R_DIS * t);
        const z = Math.round(Math.sin(di.ang) * R_DIS * t);
        for (const [ox, oz] of [[0, 0], [1, 0], [0, 1], [1, 1]] as [number, number][])
          this.por(c, x + ox, ALTURA_PLATEAU, z + oz, s % 4 === 0 ? B.PEDREGULHO : B.PEDRA);
        if (s % 9 === 4) {
          const lx = Math.round(x - Math.sin(di.ang) * 2.4), lz = Math.round(z + Math.cos(di.ang) * 2.4);
          this.por(c, lx, ALTURA_PLATEAU + 1, lz, B.TRONCO);
          this.por(c, lx, ALTURA_PLATEAU + 2, lz, B.TOCHA);
        }
      }
    }
  }

  // ── A Casa do Jogador (existe desde o dia 1) ────────────────
  private carimbarCasa(c: Chunk) {
    const [cx0, cz0] = POS_CASA;
    const M = 3; // 7×7
    for (let x = cx0 - M; x <= cx0 + M; x++) for (let z = cz0 - M; z <= cz0 + M; z++) {
      const borda = x === cx0 - M || x === cx0 + M || z === cz0 - M || z === cz0 + M;
      const canto = (x === cx0 - M || x === cx0 + M) && (z === cz0 - M || z === cz0 + M);
      // telhado completo (v33)
      this.por(c, x, ALTURA_PLATEAU + 5, z, B.TABUAS);
      if (borda) {
        this.coluna(c, x, ALTURA_PLATEAU + 4, z, canto ? B.TRONCO : B.TABUAS);
      } else {
        this.por(c, x, ALTURA_PLATEAU, z, B.TABUAS);
      }
    }
    this.por(c, cx0, ALTURA_PLATEAU + 6, cz0, B.FOLHAS);
    // porta virada para a praça + janelas de vidro
    const dx = cx0 < 0 ? -1 : 1, dz = cz0 < 0 ? -1 : 1;
    this.por(c, cx0 + dx * M, ALTURA_PLATEAU + 1, cz0, B.AR);
    this.por(c, cx0 + dx * M, ALTURA_PLATEAU + 2, cz0, B.AR);
    this.por(c, cx0, ALTURA_PLATEAU + 1, cz0 + dz * M, B.AR);
    this.por(c, cx0, ALTURA_PLATEAU + 2, cz0 + dz * M, B.AR);
    this.por(c, cx0 + dx * M, ALTURA_PLATEAU + 3, cz0, B.VIDRO);
    this.por(c, cx0, ALTURA_PLATEAU + 3, cz0 + dz * M, B.VIDRO);
    // interior: cama, baú, mesa, tocha
    this.por(c, cx0 - 1, ALTURA_PLATEAU + 1, cz0 - 1, B.CAMA);
    this.por(c, cx0 + 1, ALTURA_PLATEAU + 1, cz0 - 1, B.BAU);
    this.por(c, cx0 + 1, ALTURA_PLATEAU + 1, cz0 + 1, B.MESA);
    this.por(c, cx0, ALTURA_PLATEAU + 3, cz0, B.TOCHA);
    // pad de entrada
    for (const [ox, oz] of [[dx * (M + 1), 0], [dx * (M + 2), 0], [dx * (M + 1), 1], [dx * (M + 2), 1]] as [number, number][])
      this.por(c, cx0 + ox, ALTURA_PLATEAU, cz0 + oz, B.PEDRA);
  }

  // ── Sala de Troféus (pavilhão aberto) ───────────────────────
  private carimbarTrofeus(c: Chunk) {
    const [cx0, cz0] = POS_TROFEUS;
    for (let x = cx0 - 3; x <= cx0 + 3; x++) for (let z = cz0 - 3; z <= cz0 + 3; z++) {
      const d2 = Math.hypot(x - cx0, z - cz0);
      if (d2 > 3.2) continue;
      this.por(c, x, ALTURA_PLATEAU, z, B.PEDRA);
      if (d2 > 2.2 && (x + z) % 2 === 0) this.coluna(c, x, ALTURA_PLATEAU + 3, z, B.TRONCO);
    }
    for (let x = cx0 - 3; x <= cx0 + 3; x++) for (let z = cz0 - 3; z <= cz0 + 3; z++)
      if (Math.hypot(x - cx0, z - cz0) <= 3.2) this.por(c, x, ALTURA_PLATEAU + 4, z, B.FOLHAS);
    this.por(c, cx0, ALTURA_PLATEAU + 1, cz0, B.BAU); // o "baú dos troféus"
    this.por(c, cx0, ALTURA_PLATEAU + 5, cz0, B.TOCHA);
  }

  // ── Edifício-portal de um distrito ──────────────────────────
  private carimbarDistrito(c: Chunk, di: Distrito) {
    const [bx, bz] = posDistrito(di);
    const M = 4; // 9×9
    const H = 5;
    // limpa árvores naturais sobre a zona do edifício (até y+12)
    for (let x = bx - M - 1; x <= bx + M + 1; x++) for (let z = bz - M - 1; z <= bz + M + 1; z++)
      for (let y = ALTURA_PLATEAU + 6; y <= ALTURA_PLATEAU + 12; y++) this.por(c, x, y, z, B.AR);
    for (let x = bx - M; x <= bx + M; x++) for (let z = bz - M; z <= bz + M; z++) {
      const borda = Math.abs(x - bx) === M || Math.abs(z - bz) === M;
      const canto = Math.abs(x - bx) === M && Math.abs(z - bz) === M;
      if (borda) {
        for (let y = 1; y <= H; y++) this.por(c, x, ALTURA_PLATEAU + y, z, canto ? B.TRONCO : di.bloco);
        if (canto) this.por(c, x, ALTURA_PLATEAU + H + 2, z, B.FOLHAS);
      } else {
        this.por(c, x, ALTURA_PLATEAU, z, B.PEDRA);
      }
      // telhado completo 9×9 (v33: antes era só anel, parecia inacabado)
      this.por(c, x, ALTURA_PLATEAU + H + 1, z, di.bloco);
    }
    // janelas de vidro
    for (let t = -2; t <= 2; t += 2) {
      this.por(c, bx + t, ALTURA_PLATEAU + 3, bz - M, B.VIDRO);
      this.por(c, bx + t, ALTURA_PLATEAU + 3, bz + M, B.VIDRO);
      this.por(c, bx - M, ALTURA_PLATEAU + 3, bz + t, B.VIDRO);
      this.por(c, bx + M, ALTURA_PLATEAU + 3, bz + t, B.VIDRO);
    }
    // porta dupla virada para a praça
    const nx = -Math.cos(di.ang), nz = -Math.sin(di.ang);
    const px2 = Math.round(bx + nx * M), pz2 = Math.round(bz + nz * M);
    this.por(c, px2, ALTURA_PLATEAU + 1, pz2, B.AR);
    this.por(c, px2, ALTURA_PLATEAU + 2, pz2, B.AR);
    this.por(c, px2 + (nz !== 0 ? 1 : 0), ALTURA_PLATEAU + 1, pz2 + (nx !== 0 ? 1 : 0), B.AR);
    this.por(c, px2 + (nz !== 0 ? 1 : 0), ALTURA_PLATEAU + 2, pz2 + (nx !== 0 ? 1 : 0), B.AR);
    // interior: tocha + baú decorativo
    this.por(c, bx, ALTURA_PLATEAU + 4, bz, B.TOCHA);
    this.por(c, bx, ALTURA_PLATEAU + 1, bz, B.BAU);
    // pad frontal + postes de tocha
    for (let s = 1; s <= 3; s++) {
      const fx = Math.round(bx + nx * (M + s)), fz = Math.round(bz + nz * (M + s));
      for (const o of [-1, 0, 1]) {
        const ox = nz !== 0 ? o : 0, oz = nx !== 0 ? o : 0;
        this.por(c, fx + ox, ALTURA_PLATEAU, fz + oz, s === 3 ? B.PEDREGULHO : B.PEDRA);
      }
    }
    for (const o of [-1.8, 1.8]) {
      const fx = Math.round(bx + nx * (M + 3) + (nz !== 0 ? o : 0));
      const fz = Math.round(bz + nz * (M + 3) + (nx !== 0 ? o : 0));
      this.por(c, fx, ALTURA_PLATEAU + 1, fz, B.TRONCO);
      this.por(c, fx, ALTURA_PLATEAU + 2, fz, B.TOCHA);
    }
  }
}

// ── Gestor pacífico da cidade ────────────────────────────────
// Substitui os métodos do gestor herdado: só animais passivos,
// nunca hostis, nunca dano — a cidade é um lugar seguro.
export function pacificarGestor(g: GestorMobs, mundo: Mundo) {
  let cd = 0;
  g.tentarSpawns = (segundos: number, _noite: boolean, px: number, pz: number) => {
    cd -= segundos;
    if (cd > 0) return;
    cd = 3;
    const tentar = (tipo: "porco" | "vaca" | "galinha") => {
      const ang = g.rnd.proximo() * Math.PI * 2;
      const dist = g.rnd.intervalo(18, 28);
      const x = Math.floor(px + Math.cos(ang) * dist) + 0.5;
      const z = Math.floor(pz + Math.sin(ang) * dist) + 0.5;
      for (let y = ALTURA - 1; y > 2; y--) {
        if (mundo.solido(x, y, z) && !mundo.solido(x, y + 1, z) && !mundo.solido(x, y + 2, z)) {
          g.spawnar(tipo, x, y + 1.05, z);
          return;
        }
      }
    };
    if (g.contar("porco") < 4) tentar("porco");
    if (g.contar("vaca") < 3) tentar("vaca");
    if (g.contar("galinha") < 3) tentar("galinha");
  };
  g.atualizar = (dt: number, px: number, py: number, pz: number, _noite: boolean) =>
    GestorMobs.prototype.atualizar.call(g, dt, px, py, pz, false);
}
