// ============================================================
// BATEUCRAFT — DADOS DE MALHA DE CHUNK (v51)
// Extraída de Mundo.construirMalha para poder correr IGUAL no
// main thread e no Web Worker de malha (padrão do Veloren: a
// malhagem corre nas meshing threads — só os buffers prontos
// chegam ao render thread, docs/REA-veloren-v35.md §world).
// ZERO THREE, ZERO DOM: fábricas de vértices + AO por vértice.
// O main thread recebe typed arrays prontos e SÓ cria as
// BufferGeometry (o upload à GPU — a parte barata).
// Algoritmo EXACTAMENTE o mesmo que vivia em world.ts: faces
// visíveis, AO por vértice, cruz das plantas, água só topo,
// escurecer pela profundidade — zero segunda fonte de verdade.
// ============================================================

import { B, BLOCOS, CHUNK, ALTURA } from "./constants.ts";
import { TILE, COLS_ATLAS, LINHAS_ATLAS } from "./textures.ts";

const idx = (x: number, y: number, z: number) => (y * CHUNK + z) * CHUNK + x;

/** Vizinhos dos 4 lados (dados crus; undefined = chunk não carregado →
 *  tratado como AR, EXACTAMENTE como o getBloco antigo fazia). */
export type VizinhosMalha = {
  xn?: Uint8Array; xp?: Uint8Array; zn?: Uint8Array; zp?: Uint8Array;
};

/** Buffers prontos de um chunk — sólidos ("s") e água ("a").
 *  ind é Uint16Array quando o máximo de índice cabe em 16 bits (o MESMO
 *  critério que o THREE.setIndex(array) usava) e Uint32Array caso contrário. */
export type DadosMalha = {
  pos: Float32Array; nor: Float32Array; uv: Float32Array; cor: Float32Array;
  ind: Uint16Array | Uint32Array;
  posA: Float32Array; norA: Float32Array; uvA: Float32Array; corA: Float32Array;
  indA: Uint16Array | Uint32Array;
};

/** UV do tile do atlas — as MESMAS contas do Mundo.UVs antigo. */
function uvPorTile(t: number) {
  const w = COLS_ATLAS, h = LINHAS_ATLAS;
  const col = t % w, lin = Math.floor(t / w);
  const u0 = col / w, v1 = 1 - lin / h, u1 = (col + 1) / w, v0 = 1 - (lin + 1) / h;
  return { u0, v0, u1, v1 };
}

const FACES: { dir: [number, number, number]; verts: [number, number, number][]; sombra: number; escolher: "topo" | "baixo" | "lado" }[] = [
  { dir: [0, 1, 0], verts: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], sombra: 1.0, escolher: "topo" },
  { dir: [0, -1, 0], verts: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], sombra: 0.5, escolher: "baixo" },
  { dir: [1, 0, 0], verts: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], sombra: 0.8, escolher: "lado" },
  { dir: [-1, 0, 0], verts: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], sombra: 0.8, escolher: "lado" },
  { dir: [0, 0, 1], verts: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], sombra: 0.65, escolher: "lado" },
  { dir: [0, 0, -1], verts: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], sombra: 0.65, escolher: "lado" },
];

const escolherIndice = (nums: number[]): Uint16Array | Uint32Array => {
  let max = 0;
  for (let i = 0; i < nums.length; i++) if (nums[i] > max) max = nums[i];
  return max <= 65535 ? new Uint16Array(nums) : new Uint32Array(nums);
};

/** Constrói os buffers de malha de um chunk — o trabalho pesado que
 *  vivia no main thread, agora isomórfico (browser E Node).
 *  `superficie` é a altura BASE do terreno (a mesma função pura do
 *  perfil do mundo — worker e main thread usam fórmulas iguais). */
export function construirDadosMalha(
  cx: number, cz: number,
  dados: Uint8Array,
  viz: VizinhosMalha,
  superficie: (x: number, z: number) => number,
): DadosMalha {
  const baseX = cx * CHUNK, baseZ = cz * CHUNK;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], cor: number[] = [], ind: number[] = [];
  const posA: number[] = [], norA: number[] = [], uvA: number[] = [], corA: number[] = [], indA: number[] = [];

  // ── resolução de blocos LOCAL (chunk + 4 vizinhos; resto = AR) ──
  // EXACTAMENTE as mesmas respostas do getBloco antigo para os
  // vizinhos que a malhagem consulta (±1 bloco além do chunk).
  const blocoEm = (lx: number, y: number, lz: number): number => {
    if (y < 0 || y >= ALTURA) return B.AR;
    if (lx < 0) { const d = viz.xn; return d ? d[idx(CHUNK - 1, y, lz)] : B.AR; }
    if (lx >= CHUNK) { const d = viz.xp; return d ? d[idx(0, y, lz)] : B.AR; }
    if (lz < 0) { const d = viz.zn; return d ? d[idx(lx, y, CHUNK - 1)] : B.AR; }
    if (lz >= CHUNK) { const d = viz.zp; return d ? d[idx(lx, y, 0)] : B.AR; }
    return dados[idx(lx, y, lz)];
  };
  // o solido antigo fazia Math.floor às entradas (AO passa .5)
  const solidoEm = (x: number, y: number, z: number): boolean => {
    const d = BLOCOS[blocoEm(Math.floor(x), Math.floor(y), Math.floor(z))];
    return !!d && d.solido;
  };

  const face = (
    x: number, y: number, z: number, dir: [number, number, number],
    verts: [number, number, number][], tile: number, sombra: number, alvo: "s" | "a",
  ) => {
    const { u0, v0, u1, v1 } = uvPorTile(tile);
    const P = alvo === "s" ? pos : posA, N = alvo === "s" ? nor : norA,
      U = alvo === "s" ? uv : uvA, C = alvo === "s" ? cor : corA, I2 = alvo === "s" ? ind : indA;
    const ini = P.length / 3;
    const [dx, dy, dz] = dir;
    // AO por vértice: amostra vizinhos diagonais
    const aov = verts.map(([vx, vy, vz]) => {
      let oc = 0;
      const ex = dx !== 0 ? 0 : 1, ey = dy !== 0 ? 0 : 1, ez = dz !== 0 ? 0 : 1;
      const bx = x + dx, by = y + dy, bz = z + dz;
      if (ex) { if (solidoEm(bx, by + (vy ? -0.5 : 0.5), bz)) oc++; if (solidoEm(bx, by, bz + (vz ? -0.5 : 0.5))) oc++; }
      if (ey) { if (solidoEm(bx + (vx ? -0.5 : 0.5), by, bz)) oc++; if (solidoEm(bx, by, bz + (vz ? -0.5 : 0.5))) oc++; }
      if (ez) { if (solidoEm(bx + (vx ? -0.5 : 0.5), by, bz)) oc++; if (solidoEm(bx, by + (vy ? -0.5 : 0.5), bz)) oc++; }
      return 1 - oc * 0.16;
    });
    for (let i = 0; i < 4; i++) {
      const [vx, vy, vz] = verts[i];
      P.push(x + vx, y + vy, z + vz);
      N.push(dx, dy, dz);
      C.push(sombra * aov[i], sombra * aov[i], sombra * aov[i]);
    }
    const m = 0.001;
    if (dir[1] === 1) U.push(u0 + m, v0 + m, u1 - m, v0 + m, u1 - m, v1 - m, u0 + m, v1 - m);
    else if (dir[1] === -1) U.push(u0 + m, v1 - m, u1 - m, v1 - m, u1 - m, v0 + m, u0 + m, v0 + m);
    else if (dir[0] === 1) U.push(u1 - m, v1 - m, u0 + m, v1 - m, u0 + m, v0 + m, u1 - m, v0 + m);
    else if (dir[0] === -1) U.push(u0 + m, v1 - m, u1 - m, v1 - m, u1 - m, v0 + m, u0 + m, v0 + m);
    else if (dir[2] === 1) U.push(u0 + m, v1 - m, u1 - m, v1 - m, u1 - m, v0 + m, u0 + m, v0 + m);
    else U.push(u1 - m, v1 - m, u0 + m, v1 - m, u0 + m, v0 + m, u1 - m, v0 + m);
    I2.push(ini, ini + 1, ini + 2, ini, ini + 2, ini + 3);
  };

  // blocos em CRUZ (erva, flores): 2 planos diagonais × 2 lados, sem AO (v29)
  const emitirCruz = (x: number, y: number, z: number, tile: number, luz: number) => {
    const { u0, v0, u1, v1 } = uvPorTile(tile);
    // RECOLHA de ½ texel: sem ela, o filtro vizinho mais próximo sangra
    // o tile contíguo do atlas nas bordas → contornos escuros em cada erva/flor
    const m = 0.5 / (COLS_ATLAS * TILE);
    const mv = 0.5 / (LINHAS_ATLAS * TILE);
    const uA = u0 + m, uB = u1 - m, vA = v0 + mv, vB = v1 - mv;
    const planos: [[number, number], [number, number]][] = [
      [[0.09, 0.09], [0.91, 0.91]],
      [[0.91, 0.09], [0.09, 0.91]],
    ];
    for (const [[ax, az], [bx, bz]] of planos) {
      for (const inv of [false, true]) { // 2ª passagem com winding invertido = visível dos dois lados
        const ini = pos.length / 3;
        const vs = inv
          ? [[bx, 0, bz], [ax, 0, az], [ax, 1, az], [bx, 1, bz]]
          : [[ax, 0, az], [bx, 0, bz], [bx, 1, bz], [ax, 1, az]];
        for (const [vx, vy, vz] of vs) { pos.push(x + vx, y + vy, z + vz); nor.push(0, 1, 0); cor.push(luz, luz, luz); }
        uv.push(uA, vA, uB, vA, uB, vB, uA, vB);
        ind.push(ini, ini + 1, ini + 2, ini, ini + 2, ini + 3);
      }
    }
  };

  for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
    const wx = baseX + lx, wz = baseZ + lz;
    const superficieCol = superficie(wx, wz);
    for (let y = 0; y < ALTURA; y++) {
      const id = dados[idx(lx, y, lz)];
      if (id === B.AR) continue;
      const def = BLOCOS[id];
      if (!def) continue;
      // cruz: 2 planos diagonais com alfa (erva/flores) — nunca oclui vizinhos
      if (def.cruz) {
        const profC = Math.max(0, Math.min(1, (superficieCol - 3 - y) / 9));
        emitirCruz(wx, y, wz, def.tiles[0], 1 - profC * 0.72);
        continue;
      }
      const aguada = !!def.liquido;
      for (const f of FACES) {
        const nx = wx + f.dir[0], ny = y + f.dir[1], nz = wz + f.dir[2];
        const vizId = blocoEm(nx - baseX, ny, nz - baseZ);
        const defViz = BLOCOS[vizId];
        const mostrar = vizId === B.AR || (defViz && defViz.transparente && !def.transparente) ||
          (def.transparente && vizId === B.AGUA && id !== B.AGUA);
        if (!mostrar) continue;
        if (aguada && f.dir[1] !== 1) continue; // água: só topo
        const tile = f.escolher === "topo" ? def.tiles[0] : f.escolher === "baixo" ? def.tiles[1] : def.tiles[2];
        // escurecer pela profundidade (cavernas escuras)
        const prof = Math.max(0, Math.min(1, (superficieCol - 3 - y) / 9));
        const luz = aguada ? 1 : (1 - prof * 0.72);
        face(wx, y, wz, f.dir, f.verts as [number, number, number][], tile, f.sombra * luz, aguada ? "a" : "s");
      }
    }
  }

  return {
    pos: new Float32Array(pos), nor: new Float32Array(nor),
    uv: new Float32Array(uv), cor: new Float32Array(cor),
    ind: escolherIndice(ind),
    posA: new Float32Array(posA), norA: new Float32Array(norA),
    uvA: new Float32Array(uvA), corA: new Float32Array(corA),
    indA: escolherIndice(indA),
  };
}

/** Soma dos valores (float64 na ordem) — prova de identidade entre o
 *  caminho do worker de malha e o caminho sync (E2E v51). */
export function somaValores(a: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s;
}

/** Verificação de igualdade bit a bit de dois DadosMalha. */
export function malhaIgual(a: DadosMalha, b: DadosMalha): boolean {
  const pares: [ArrayLike<number>, ArrayLike<number>][] = [
    [a.pos, b.pos], [a.nor, b.nor], [a.uv, b.uv], [a.cor, b.cor], [a.ind, b.ind],
    [a.posA, b.posA], [a.norA, b.norA], [a.uvA, b.uvA], [a.corA, b.corA], [a.indA, b.indA],
  ];
  for (const [x, y] of pares) {
    if (x.length !== y.length) return false;
    if (somaValores(x) !== somaValores(y)) return false;
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  }
  return true;
}
