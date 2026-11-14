// ============================================================
// BATEUCRAFT — GERAÇÃO PURA DE DADOS DE CHUNK (v46)
// Extraída de Mundo.gerarChunk para poder correr IGUAL no main
// thread e no Web Worker (padrão do Veloren: a geração de chunk
// é paralelizável — docs/REA-veloren-v35.md §world).
// ZERO THREE, ZERO DOM: só ruído determinístico + constantes.
// O PERFIL de terreno (base/cidade/rpg) é passado como par de
// funções puras — as MESMAS que as classes Mundo usam por
// delegação → zero segunda fonte de verdade.
// ============================================================

import { B, CHUNK, ALTURA, NIVEL_MAR } from "./constants.ts";
import { Ruido } from "./noise.ts";

export const idx = (x: number, y: number, z: number) => (y * CHUNK + z) * CHUNK + x;

export type PerfilTerreno = {
  altura: (x: number, z: number) => number;
  bioma: (x: number, z: number) => "planicie" | "deserto" | "floresta" | "montanha";
};

/** Colunas de terreno de um chunk — EXACTAMENTE o mesmo algoritmo que
 *  vivia em Mundo.gerarChunk (cavernas, minérios, árvores por coluna,
 *  decorações v29), agora parametrizado pelo perfil do mundo.
 *  Sem edições do jogador: essas são aplicadas a seguir no main thread
 *  (dono honesto do estado). */
export function gerarDadosTerreno(ruido: Ruido, cx: number, cz: number, perfil: PerfilTerreno): Uint8Array {
  const dados = new Uint8Array(CHUNK * CHUNK * ALTURA);
  for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
    const x = cx * CHUNK + lx, z = cz * CHUNK + lz;
    const h = perfil.altura(x, z);
    const bioma = perfil.bioma(x, z);
    for (let y = 0; y < ALTURA; y++) {
      let id: number = B.AR;
      if (y === 0 || (y === 1 && ruido.n3(x, y, z) < 0.5)) id = B.ROCHA_MAE;
      else if (y < h - 3) {
        id = B.PEDRA;
        // cavernas 3D
        if (y > 3 && y < h - 4) {
          const c = ruido.n3(x * 0.075, y * 0.1, z * 0.075);
          if (c > 0.74) id = B.AR;
        }
        // minérios por profundidade (raros — progressão difícil)
        if (id === B.PEDRA) {
          const r = ruido.n3(x * 0.9 + 40, y * 0.9 + 40, z * 0.9 + 40);
          if (y < 48 && r > 0.988) id = B.CARVAO_M;
          else if (y < 32 && r < 0.012) id = B.FERRO_M;
          else if (y < 20 && r > 0.985) id = B.OURO_M;
          else if (y < 14 && r < 0.007) id = B.DIAMANTE_M;
        }
      } else if (y < h) id = bioma === "deserto" ? B.AREIA : B.TERRA;
      else if (y === h) id = bioma === "deserto" ? B.AREIA : (h < NIVEL_MAR + 1 ? B.AREIA : B.RELVA);
      else if (y <= NIVEL_MAR) id = B.AGUA;
      dados[idx(lx, y, lz)] = id;
    }
    // árvore (só em terra firme acima do mar) — hash POR COLUNA: o mesmo
    // (x,z) dá sempre árvores iguais, seja qual for a ordem dos chunks (v29)
    if (h > NIVEL_MAR + 1 && dados[idx(lx, h, lz)] === B.RELVA) {
      const pArvore = bioma === "floresta" ? 0.05 : bioma === "planicie" ? 0.016 : 0;
      if (ruido.hashCol(x, z, 11) < pArvore && lx > 1 && lx < CHUNK - 2 && lz > 1 && lz < CHUNK - 2) {
        const alt = 4 + Math.floor(ruido.hashCol(x, z, 29) * 3);
        for (let t = 1; t <= alt; t++) dados[idx(lx, h + t, lz)] = B.TRONCO;
        for (let dy = alt - 2; dy <= alt + 1; dy++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
          const dist = Math.abs(dx) + Math.abs(dz) + Math.abs(dy - alt + 0.5) * 1.4;
          if (dist <= 3.4 && !(dx === 0 && dz === 0 && dy < alt)) {
            const px2 = lx + dx, py = h + dy + 1, pz2 = lz + dz;
            if (px2 >= 0 && px2 < CHUNK && pz2 >= 0 && pz2 < CHUNK && py < ALTURA && dados[idx(px2, py, pz2)] === B.AR)
              dados[idx(px2, py, pz2)] = B.FOLHAS;
          }
        }
      }
    }
    // ── decorações do chão (v29): erva, flores, cactos — hash por coluna ──
    const topo = dados[idx(lx, h, lz)];
    if (h > NIVEL_MAR + 1 && h + 1 < ALTURA && dados[idx(lx, h + 1, lz)] === B.AR) {
      const d1 = ruido.hashCol(x, z, 53);
      if (bioma === "deserto" && topo === B.AREIA) {
        if (d1 < 0.014) {
          const altC = 1 + Math.floor(ruido.hashCol(x, z, 71) * 3);
          for (let t = 1; t <= altC && h + t < ALTURA; t++) dados[idx(lx, h + t, lz)] = B.CACTO;
        }
      } else if (topo === B.RELVA) {
        if (d1 < (bioma === "planicie" ? 0.07 : 0.055)) dados[idx(lx, h + 1, lz)] = B.ERVA;
        else if (d1 < (bioma === "planicie" ? 0.079 : 0.067)) dados[idx(lx, h + 1, lz)] = B.FLOR_AM;
        else if (d1 < (bioma === "planicie" ? 0.088 : 0.079)) dados[idx(lx, h + 1, lz)] = B.FLOR_VM;
      }
    }
  }
  return dados;
}

// ── Perfil BASE (planície/deserto/floresta/montanha natural) ──
export function alturaTerrenoBase(ruido: Ruido, x: number, z: number): number {
  const base = ruido.fbm2(x * 0.012, z * 0.012, 4);
  const montanha = ruido.fbm2(x * 0.004 + 500, z * 0.004 + 500, 3);
  const detalhe = ruido.n2(x * 0.06, z * 0.06);
  let h = 28 + base * 22 + Math.max(0, montanha - 0.55) * 70 + detalhe * 3;
  return Math.max(4, Math.min(ALTURA - 6, Math.floor(h)));
}

export function biomaBase(ruido: Ruido, x: number, z: number): "planicie" | "deserto" | "floresta" | "montanha" {
  const t = ruido.fbm2(x * 0.005 + 900, z * 0.005 + 900, 3);
  if (alturaTerrenoBase(ruido, x, z) > 52) return "montanha";
  if (t < 0.36) return "deserto";
  if (t > 0.62) return "floresta";
  return "planicie";
}

export function perfilBase(ruido: Ruido): PerfilTerreno {
  return {
    altura: (x, z) => alturaTerrenoBase(ruido, x, z),
    bioma: (x, z) => biomaBase(ruido, x, z),
  };
}

/** Edições do jogador aplicadas a dados de chunk recém-gerado —
 *  o mesmo filtro que vivia no fim de Mundo.gerarChunk. */
export function aplicarEditsChunk(dados: Uint8Array, edits: Map<string, number>, cx: number, cz: number) {
  for (const [k, v] of edits) {
    const [ex, ey, ez] = k.split(",").map(Number);
    if (Math.floor(ex / CHUNK) === cx && Math.floor(ez / CHUNK) === cz)
      dados[idx(((ex % CHUNK) + CHUNK) % CHUNK, ey, ((ez % CHUNK) + CHUNK) % CHUNK)] = v;
  }
}

/** Soma simples dos bytes — prova de identidade byte a byte entre o
 *  caminho do worker e o caminho sync (E2E v46). */
export function somaBytes(dados: Uint8Array): number {
  let s = 0;
  for (let i = 0; i < dados.length; i++) s += dados[i];
  return s;
}
