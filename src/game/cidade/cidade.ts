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

import { CHUNK, ALTURA } from "../blocos/constants";
import { Mundo, type Chunk } from "../blocos/world";
import { GestorMobs } from "../blocos/mobs";
import { SEED_CIDADE, ALTURA_PLATEAU, SPAWN_PRACA } from "./core";
import { alturaCidade, biomaCidade, RAIO_PLATEAU, RAIO_FUSAO } from "./terrenoCidade";
// v52 — N4: os carimbos (praça/quiosque/casa/troféus/distritos) e os dados
// dos distritos vivem no módulo PURO carimbosCidade.ts — o servidor de
// presença partilhada carimba os MESMOS voxels no Node (padrão v46/v47).
import { carimbarCidade, type AlvoCarimbo } from "./carimbosCidade.ts";

// v37 — fonte única passou a ser core.ts (padrão `common` do Veloren:
// cliente e servidor partilham as mesmas constantes); re-exportado aqui
// para todos os imports existentes continuarem a funcionar.
export { SEED_CIDADE, ALTURA_PLATEAU, SPAWN_PRACA };
// v46 — raios do plateau vivem em terrenoCidade.ts (puro, partilhado com
// o worker); re-exportados para os imports existentes.
export { RAIO_PLATEAU, RAIO_FUSAO };
// v52 — os distritos e as posições das estruturas mudaram para o módulo
// puro (o servidor e as probes Node importam-nos sem arrastar THREE);
// re-exportados para os imports existentes (marcos.ts, missoes.ts, UI).
import { DISTRITOS, posDistrito, POS_CASA, POS_TROFEUS, POS_QUIOSQUE, type Distrito } from "./carimbosCidade.ts";
export {
  DISTRITOS, posDistrito, POS_CASA, POS_TROFEUS, POS_QUIOSQUE,
} from "./carimbosCidade.ts";
export type { Distrito } from "./carimbosCidade.ts";

/** Portal mais próximo se estiveres a ≤ `alcance` blocos (null = nenhum). */
export function portalPerto(
  x: number, z: number, alcance = 8,
): { tipo: "distrito" | "casa" | "trofeus" | "quiosque"; distrito?: Distrito; dist: number } | null {
  let melhor: { tipo: "distrito" | "casa" | "trofeus" | "quiosque"; distrito?: Distrito; dist: number } | null = null;
  const considerar = (tipo: "distrito" | "casa" | "trofeus" | "quiosque", bx: number, bz: number, distrito_?: Distrito) => {
    const dist = Math.hypot(x - bx, z - bz);
    if (dist <= alcance && (!melhor || dist < melhor.dist)) melhor = { tipo, distrito: distrito_, dist };
  };
  for (const di of DISTRITOS) {
    const [bx, bz] = posDistrito(di);
    considerar("distrito", bx, bz, di);
  }
  considerar("casa", POS_CASA[0], POS_CASA[1]);
  considerar("trofeus", POS_TROFEUS[0], POS_TROFEUS[1]);
  considerar("quiosque", POS_QUIOSQUE[0], POS_QUIOSQUE[1]);
  return melhor;
}

// ── Mundo da cidade ──────────────────────────────────────────
export class MundoCidade extends Mundo {
  constructor() {
    super(SEED_CIDADE);
    this.perfilId = "cidade"; // v46: o worker usa as MESMAS fórmulas puras
  }

  /** Plateau plano da cidade, fundindo suavemente com o terreno natural —
   *  v46: delega na função pura (partilhada com o worker). */
  override alturaTerreno(x: number, z: number): number {
    return alturaCidade(this.ruido, x, z);
  }

  /** Cidade tem sempre clima de planície (sem desertos no centro urbano). */
  override bioma(x: number, z: number): "planicie" | "deserto" | "floresta" | "montanha" {
    return biomaCidade(this.ruido, x, z);
  }

  /** v52 — N4: os carimbos da cidade correm no módulo PURO
   *  (carimbosCidade.ts) sobre um alvo que escreve neste chunk — o MESMO
   *  caminho que o servidor usa para construir o campo de voxels da
   *  re-simulação (fonte única; a v46 provou o padrão byte a byte para o
   *  terreno, a v52 estende a prova aos carimbos). */
  protected override posGerar(c: Chunk): void {
    super.posGerar(c);
    const alvo: AlvoCarimbo = {
      cx: c.cx, cz: c.cz,
      por: (x, y, z, id) => this.por(c, x, y, z, id),
      coluna: (x, yTopo, z, id) => this.coluna(c, x, yTopo, z, id),
    };
    carimbarCidade(alvo);
  }

  // util: põe um bloco no chunk (coordenadas do mundo) — o MESMO código que
  // vivia aqui antes da extração v52 (mesmo guarda de y, mesmo filtro de
  // chunk, mesmo idx); os carimbos do módulo puro usam o alvoParaDados com
  // a MESMA matemática (prova de identidade no probe/E2E).
  private por(c: Chunk, x: number, y: number, z: number, id: number) {
    if (y < 0 || y >= ALTURA) return;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    if (cx !== c.cx || cz !== c.cz) return;
    const lx = ((x % CHUNK) + CHUNK) % CHUNK, lz = ((z % CHUNK) + CHUNK) % CHUNK;
    c.dados[(y * CHUNK + lz) * CHUNK + lx] = id;
  }

  /** Preenche uma coluna a partir da superfície (evita buracos sob estruturas). */
  private coluna(c: Chunk, x: number, yTopo: number, z: number, id: number) {
    for (let y = ALTURA_PLATEAU + 1; y <= yTopo; y++) this.por(c, x, y, z, id);
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
