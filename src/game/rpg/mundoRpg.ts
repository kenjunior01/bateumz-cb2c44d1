// ============================================================
// BATEU RPG: LENDAS — MUNDO (v41)
// Padrão do Veloren: o crate `world` gera terreno determinístico
// independente do cliente (docs/REA-veloren-v35.md §world). Aqui
// extendemos o motor voxel partilhado (src/game/blocos/world.ts —
// o mesmo motor da CIDADE BATEU) com um mundo selvagem: 6 regiões,
// 8 POIs com baús de tesouro e geografia fixa (SEED_RPG — todos os
// jogadores vêem o mesmo mundo, base para o servidor N3 futuro).
// Estruturas carimbadas por chunk — MESMO padrão do MundoCidade.
// ============================================================

import { B, CHUNK, ALTURA, NIVEL_MAR } from "../blocos/constants";
import { Mundo, type Chunk } from "../blocos/world";
import { Aleatorio } from "../blocos/noise";
import { SEED_RPG, ALTURA_ALDEIA, REGIOES, POIS } from "./core";

const idx = (x: number, y: number, z: number) => (y * CHUNK + z) * CHUNK + x;

/** Alturas fixas dos padins dos POIs (o terreno funde para estas alturas). */
const PAD_POI: Record<string, number> = {
  aldeia: ALTURA_ALDEIA,     // 32 — planície da aldeia (é o próprio centro)
  torre: ALTURA_ALDEIA,      // dentro da planície plana
  cacadores: 34,
  ruinas: 32,
  cova: 32,
  baoba: 32,
  porto: 31,                 // praia (NIVEL_MAR=30 → areia a h<31)
  forja: 33,
};

/** Alvos de altura por região + ruído próprio (terreno com sabor). */
const ALVO_REGIAO: Record<string, { base: number; ruga: number }> = {
  aldeia:   { base: 32, ruga: 1.2 },
  planalto: { base: 36, ruga: 2.5 },
  miombo:   { base: 33, ruga: 2.2 },
  costa:    { base: 31, ruga: 1.8 },   // z>72 desce ao mar
  serra:    { base: 42, ruga: 7 },
  cinzas:   { base: 35, ruga: 3 },
};

export class MundoRPG extends Mundo {
  constructor() { super(SEED_RPG); }

  /** Peso (0..1) da influência de uma região em (x, z). */
  private pesoRegiao(x: number, z: number): { regiao: string; w: number } {
    let melhor = "", melhorW = 0;
    for (const r of REGIOES) {
      const d = Math.hypot(x - r.cx, z - r.cz);
      const w = Math.max(0, Math.min(1, (r.raio * 1.25 - d) / (r.raio * 0.7)));
      if (w > melhorW) { melhorW = w; melhor = r.id; }
    }
    return { regiao: melhor, w: melhorW };
  }

  /** Terreno do RPG: regiões com sabor, padins planos nos POIs. */
  override alturaTerreno(x: number, z: number): number {
    const natural = super.alturaTerreno(x, z);
    const { regiao, w } = this.pesoRegiao(x, z);
    let h = natural;
    if (w > 0) {
      const alvo = ALVO_REGIAO[regiao] ?? { base: 30, ruga: 2 };
      let alvoH = alvo.base + this.ruido.n2(x * 0.02, z * 0.02) * alvo.ruga;
      // costa: a sul (z>72) o mar — terrain below sea level
      if (regiao === "costa" && z > 72) alvoH = 27 + this.ruido.n2(x * 0.02, z * 0.02) * 1.6;
      // serra: picos com o mesmo ruído de montanha do motor base
      if (regiao === "serra") alvoH += Math.max(0, this.ruido.fbm2(x * 0.006 + 500, z * 0.006 + 500, 3) - 0.45) * 26;
      h = natural * (1 - w) + alvoH * w;
    }
    // padins planos dos POIs (o terreno funde para a altura fixa)
    for (const p of POIS) {
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < 14) {
        const pw = Math.max(0, Math.min(1, (10 - d) / 5));
        const padY = PAD_POI[p.id] ?? ALTURA_ALDEIA;
        h = h * (1 - pw) + padY * pw;
      }
    }
    return Math.max(4, Math.min(ALTURA - 6, Math.floor(h)));
  }

  /** Biomas por região: miombo = floresta densa, serra = montanha. */
  override bioma(x: number, z: number): "planicie" | "deserto" | "floresta" | "montanha" {
    const { regiao, w } = this.pesoRegiao(x, z);
    if (w > 0.45) {
      if (regiao === "miombo") return "floresta";
      if (regiao === "serra") return "montanha";
      return "planicie";
    }
    return super.bioma(x, z);
  }

  override gerarChunk(cx: number, cz: number): Chunk {
    const c = super.gerarChunk(cx, cz);
    const bx = cx * CHUNK, bz = cz * CHUNK;
    // Terra de Cinzas: superfície vulcânica (pedra/ardósia + brasas de carvão)
    if (bx < 120 && bz < 90 && bx > 40 && bz > 10) this.revestirCinzas(c);
    // estruturas dos POIs cujo footprint toca este chunk
    for (const p of POIS) {
      const y = PAD_POI[p.id] ?? ALTURA_ALDEIA;
      if (bx + CHUNK < p.x - 13 || bx > p.x + 13 || bz + CHUNK < p.z - 13 || bz > p.z + 13) continue;
      this.carimbarPoi(c, p.id, p.x, p.z, y);
    }
    return c;
  }

  /** Superfície vulcânica: onde era relva, fica pedra/ardósia + carvão incandescente. */
  private revestirCinzas(c: Chunk) {
    const bx = c.cx * CHUNK, bz = c.cz * CHUNK;
    for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
      const x = bx + lx, z = bz + lz;
      const { regiao, w } = this.pesoRegiao(x, z);
      if (regiao !== "cinzas" || w < 0.55) continue;
      // achar a superfície da coluna
      let topo = -1;
      for (let y = ALTURA - 1; y > 0; y--) {
        const id = c.dados[idx(lx, y, lz)];
        if (id === B.RELVA || id === B.ERVA || id === B.FLOR_AM || id === B.FLOR_VM) { topo = y; break; }
        if (id !== B.AR && id !== B.FOLHAS && id !== B.TRONCO && y < 70) { topo = y; break; }
      }
      if (topo <= 0) continue;
      for (let y = topo; y <= topo + 1 && y < ALTURA; y++) {
        const id = c.dados[idx(lx, y, lz)];
        if (id === B.RELVA) c.dados[idx(lx, y, lz)] = this.ruido.hashCol(x, z, 91) < 0.45 ? B.PEDRA : B.PEDREGULHO;
        else if (id === B.ERVA || id === B.FLOR_AM || id === B.FLOR_VM) c.dados[idx(lx, y, lz)] = B.AR;
      }
      if (this.ruido.hashCol(x, z, 97) < 0.02 && c.dados[idx(lx, topo, lz)] === B.PEDRA)
        c.dados[idx(lx, topo + 1, lz)] = B.CARVAO_M; // brasas
    }
  }

  // ── helpers de carimbo (mesmo padrão do MundoCidade) ─────────
  private por(c: Chunk, x: number, y: number, z: number, id: number) {
    if (y < 0 || y >= ALTURA) return;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    if (cx !== c.cx || cz !== c.cz) return;
    const lx = ((x % CHUNK) + CHUNK) % CHUNK, lz = ((z % CHUNK) + CHUNK) % CHUNK;
    c.dados[idx(lx, y, lz)] = id;
  }

  private limpar(c: Chunk, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++)
      this.por(c, x, y, z, B.AR);
  }

  private caixa(c: Chunk, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++)
      this.por(c, x, y, z, id);
  }

  private carimbarPoi(c: Chunk, id: string, px: number, pz: number, y: number) {
    const rnd = new Aleatorio(SEED_RPG + (id.length * 131 + id.charCodeAt(0)));
    switch (id) {
      case "aldeia": this.carimbarAldeia(c, y, rnd); break;
      case "torre": this.carimbarTorre(c, y); break;
      case "cacadores": this.carimbarAcampamento(c, px, pz, y, rnd); break;
      case "ruinas": this.carimbarRuinas(c, y, rnd); break;
      case "cova": this.carimbarCova(c, y); break;
      case "baoba": this.carimbarBaoba(c, y); break;
      case "porto": this.carimbarPorto(c, y); break;
      case "forja": this.carimbarForja(c, y); break;
    }
  }

  // ── Aldeia Inicial: 2 casas, fogueira, imbondeiro, baú ───────
  private carimbarAldeia(c: Chunk, y: number, rnd: Aleatorio) {
    this.limpar(c, -12, y + 1, -8, 12, y + 14, 12);
    // casa dos caçadores (x −7..−3, z 6..10)
    const casa = (x0: number, z0: number, portaZ: number) => {
      this.caixa(c, x0, y + 1, z0, x0 + 4, y + 3, z0 + 4, B.TABUAS);
      this.limpar(c, x0 + 1, y + 1, z0 + 1, x0 + 3, y + 3, z0 + 3); // interior
      this.caixa(c, x0, y + 4, z0, x0 + 4, y + 4, z0 + 4, B.TABUAS); // teto
      this.limpar(c, x0 + 2, y + 1, portaZ, x0 + 2, y + 2, portaZ);  // porta
      this.por(c, x0, y + 2, z0 + 2, B.VIDRO); this.por(c, x0 + 4, y + 2, z0 + 2, B.VIDRO);
      this.por(c, x0 + 2, y + 3, z0 + 2, B.TOCHA);
    };
    casa(-7, 6, 6);
    casa(6, -4, 0);
    // fogueira central
    this.por(c, 1, y + 1, 3, B.PEDREGULHO); this.por(c, 1, y + 2, 3, B.TOCHA);
    this.por(c, 0, y + 1, 2, B.PEDREGULHO); this.por(c, 2, y + 1, 4, B.PEDREGULHO);
    // imbondeiro — a assinatura da plataforma (como na Praça da CIDADE BATEU)
    for (let t = 1; t <= 7; t++) this.por(c, -2, y + t, -4, B.TRONCO);
    for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
      const d2 = Math.abs(dx) + Math.abs(dz);
      if (d2 <= 5 && !(dx === 0 && dz === 0) && rnd.chance(0.85))
        this.por(c, -2 + dx, y + 6 + Math.floor(d2 / 2.5), -4 + dz, B.FOLHAS);
    }
    // baú do tesouro + postes de tocha
    this.por(c, 4, y + 1, 5, B.BAU);
    this.por(c, 10, y + 1, 8, B.TOCHA);
    this.por(c, -10, y + 1, -2, B.TOCHA);
  }

  // ── Torre do Vigia: 5×5 de tábuas, escada, baú no topo ───────
  private carimbarTorre(c: Chunk, y: number) {
    this.limpar(c, 11, y + 1, -20, 17, y + 12, -12);
    // paredes y+1..y+9
    for (let h = 1; h <= 9; h++) {
      for (let x = 12; x <= 16; x++) { this.por(c, x, y + h, -18, B.TABUAS); this.por(c, x, y + h, -14, B.TABUAS); }
      for (let z = -18; z <= -14; z++) { this.por(c, 12, y + h, z, B.TABUAS); this.por(c, 16, y + h, z, B.TABUAS); }
    }
    this.limpar(c, 14, y + 1, -14, 14, y + 2, -14);   // porta
    this.caixa(c, 12, y + 9, -18, 16, y + 9, -14, B.TABUAS); // piso do topo
    for (let h = 1; h <= 8; h++) this.por(c, 13, y + h, -15, B.ESCADA); // escada encostada à parede
    this.por(c, 14, y + 10, -16, B.BAU);
    this.por(c, 12, y + 10, -18, B.TOCHA);
    this.por(c, 16, y + 10, -14, B.TOCHA);
  }

  // ── Acampamento dos Caçadores: 2 tendas + espeto + baú ──────
  private carimbarAcampamento(c: Chunk, px: number, pz: number, y: number, rnd: Aleatorio) {
    this.limpar(c, px - 6, y + 1, pz - 6, px + 6, y + 8, pz + 6);
    const tenda = (x: number, z: number) => {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++)
        this.por(c, x + dx, y + 1, z + dz, B.TABUAS);
      this.limpar(c, x - 1, y + 1, z, x + 1, y + 1, z);      // aberta na frente
      this.por(c, x, y + 2, z, B.TABUAS);
    };
    tenda(px - 3, pz + 2);
    tenda(px + 3, pz - 2);
    this.por(c, px + 1, y + 1, pz + 2, B.PEDREGULHO);       // espeto/fogueira
    this.por(c, px + 1, y + 2, pz + 2, B.TOCHA);
    this.por(c, px, y + 1, pz, B.BAU);
    if (rnd.chance(0.9)) this.por(c, px - 5, y + 1, pz - 3, B.TRONCO); // banco de tronco
  }

  // ── Ruínas de Kivulivuli: muros partidos, 2 baús ────────────
  private carimbarRuinas(c: Chunk, y: number, rnd: Aleatorio) {
    this.limpar(c, 52, y + 1, -50, 66, y + 8, -34);
    const x0 = 54, x1 = 62, z0 = -46, z1 = -38;
    for (let x = x0; x <= x1; x++) {
      const h = 1 + Math.floor(rnd.proximo() * 3);
      if (!rnd.chance(0.15)) for (let t = 1; t <= h; t++) this.por(c, x, y + t, z0, B.PEDREGULHO);
      const h2 = 1 + Math.floor(rnd.proximo() * 3);
      if (!rnd.chance(0.15)) for (let t = 1; t <= h2; t++) this.por(c, x, y + t, z1, B.PEDREGULHO);
    }
    for (let z = z0; z <= z1; z++) {
      const h = 1 + Math.floor(rnd.proximo() * 3);
      if (!rnd.chance(0.15)) for (let t = 1; t <= h; t++) this.por(c, x0, y + t, z, B.PEDREGULHO);
      const h2 = 1 + Math.floor(rnd.proximo() * 3);
      if (!rnd.chance(0.15)) for (let t = 1; t <= h2; t++) this.por(c, x1, y + t, z, B.PEDREGULHO);
    }
    // pilares de canto (o que sobrou da torre de vigia do reino)
    for (const [cx2, cz2] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]] as const)
      for (let t = 1; t <= 4; t++) this.por(c, cx2, y + t, cz2, B.PEDREGULHO);
    // entulho no chão
    for (let x = x0 + 1; x < x1; x++) for (let z = z0 + 1; z < z1; z++)
      if (rnd.chance(0.08)) this.por(c, x, y + 1, z, B.PEDREGULHO);
    this.por(c, x0, y + 1, z0 + 2, B.BAU);      // baú junto ao pilar
    this.por(c, x1, y + 1, z1 - 2, B.BAU);
  }

  // ── Cova dos Morcegos: vala descendente + câmara com baú ────
  private carimbarCova(c: Chunk, y: number) {
    // câmara 7×7 (x 67..73, z −33..−27), teto natural, chão y=27
    this.limpar(c, 67, 28, -33, 73, 31, -27);
    this.caixa(c, 67, 27, -33, 73, 27, -27, B.PEDRA);
    // vala desce em degraus transitáveis a pé (1 bloco de cada vez)
    for (let i = 0; i < 5; i++) {
      const z = -26 - i;
      const fundo = y - i;                    // y=32 → 28
      this.limpar(c, 69, fundo, z, 71, y + 1, z);
      this.caixa(c, 69, fundo - 1, z, 71, fundo - 1, z, B.PEDRA); // piso do degrau
    }
    this.por(c, 70, 28, -31, B.BAU);
    // escura de propósito: o herói traz tochas (ambiente RPG)
  }

  // ── Baobá Ancião: tronco monumental + baú ───────────────────
  private carimbarBaoba(c: Chunk, y: number) {
    this.limpar(c, -44, y + 1, 30, -32, y + 12, 40);
    for (let t = 1; t <= 8; t++) {
      this.por(c, -38, y + t, 34, B.TRONCO);
      this.por(c, -37, y + t, 34, B.TRONCO); // tronco grosso 2×1
    }
    for (let dy = 0; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
      const dist = Math.abs(dx) + Math.abs(dz) + dy * 1.3;
      if (dist <= 4.5 && !(dx === 0 && dz === 0)) this.por(c, -38 + dx, y + 8 + dy, 34 + dz, B.FOLHAS);
    }
    this.por(c, -36, y + 1, 34, B.BAU);
    this.por(c, -41, y + 1, 37, B.ERVA);
  }

  // ── Porto dos Ventos: cais de tábuas sobre o mar + baú ──────
  private carimbarPorto(c: Chunk, y: number) {
    this.limpar(c, 7, y + 1, 64, 13, y + 8, 75);
    for (let z = 66; z <= 74; z++) {
      for (let x = 8; x <= 12; x++) this.por(c, x, y, z, B.TABUAS);       // piso do cais
      // pilares até ao fundo
      for (const px of [8, 12]) {
        for (let yy = y - 1; yy >= y - 8; yy--) {
          if (yy < 2) break;
          this.por(c, px, yy, z, B.TRONCO);
        }
      }
    }
    this.por(c, 10, y + 1, 68, B.BAU);
    // mastro com bandeira de folhas
    for (let t = 1; t <= 6; t++) this.por(c, 10, y + t, 74, B.TRONCO);
    this.por(c, 10, y + 7, 74, B.FOLHAS);
    this.por(c, 11, y + 7, 74, B.FOLHAS);
  }

  // ── Forja Perdida: fornalhas + mesa + muros partidos + baú ──
  private carimbarForja(c: Chunk, y: number) {
    this.limpar(c, 78, y + 1, 48, 86, y + 6, 56);
    // pavimento de pedregulho
    this.caixa(c, 80, y, 50, 84, y, 54, B.PEDREGULHO);
    // muros partidos
    for (let x = 80; x <= 84; x++) if (x !== 82) for (let t = 1; t <= 2; t++) this.por(c, x, y + t, 50, B.PEDREGULHO);
    for (let z = 51; z <= 54; z++) if (z !== 52) for (let t = 1; t <= 2; t++) this.por(c, 80, y + t, z, B.PEDREGULHO);
    this.por(c, 81, y + 1, 51, B.FORNALHA);
    this.por(c, 83, y + 1, 51, B.FORNALHA);
    this.por(c, 80, y + 1, 53, B.MESA);
    this.por(c, 82, y + 1, 52, B.BAU);
    this.por(c, 84, y + 1, 54, B.TOCHA);
  }
}
