// ============================================================
// ROTAS LEGAIS DA CIDADE — módulo PARTILHADO dos E2E (v52 — N4)
// O campo de voxels puro (o MESMO que o servidor re-simula:
// gerarDadosTerreno + carimbarCidade) + o A* na grelha de 1 bloco
// com passos conscientes do corpo (a caixa do motor), do salto real
// (a msg intermédia no ar + o pouso) e das bordas de descida.
// Os caminhos dos testes têm de ser LEGAIS sob a re-simulação N4 —
// as linhas retas atravessam paredes de edifícios, troncos de
// árvores e cruzamentos íngremes do anel de fusão (medido na v52).
// ============================================================
import { Ruido } from "./src/game/blocos/noise.ts";
import { gerarDadosTerreno } from "./src/game/blocos/geracao.ts";
import { solidoId, CHUNK, ALTURA } from "./src/game/blocos/constants.ts";
import { perfilCidade, alturaCidade } from "./src/game/cidade/terrenoCidade.ts";
import { carimbarCidade, alvoParaDados, chunkTemCarimbos } from "./src/game/cidade/carimbosCidade.ts";
import { SEED_CIDADE, caminhoLivre, caixaColide } from "./src/game/cidade/core.ts";

const ruidoCampo = new Ruido(SEED_CIDADE);
const perfilCampo = perfilCidade(ruidoCampo);
const cacheCampo = new Map();
function dadosCampo(cx, cz) {
  const k = `${cx},${cz}`;
  if (!cacheCampo.has(k)) {
    const d = gerarDadosTerreno(ruidoCampo, cx, cz, perfilCampo);
    if (chunkTemCarimbos(cx, cz)) carimbarCidade(alvoParaDados(d, cx, cz));
    cacheCampo.set(k, d);
  }
  return cacheCampo.get(k);
}
export const solidoCampo = (x, y, z) => {
  x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
  if (y < 0 || y >= ALTURA) return false;
  const d = dadosCampo(Math.floor(x / CHUNK), Math.floor(z / CHUNK));
  return solidoId(d[(y * CHUNK + (((z % CHUNK) + CHUNK) % CHUNK)) * CHUNK + (((x % CHUNK) + CHUNK) % CHUNK)]);
};
export const alturaCampo = (x, z) => alturaCidade(ruidoCampo, x, z);
export const yEmCampo = (x, z) => Math.round(alturaCampo(x, z) * 100) / 100 + 1.02;
export const livreCampo = (ax, az, bx, bz) => caminhoLivre(solidoCampo, ax, yEmCampo(ax, az), az, bx, yEmCampo(bx, bz), bz);
export { SEED_CIDADE, CHUNK, ALTURA, caminhoLivre, caixaColide };

// Um passo da grelha é válido quando a caixa do corpo passa OU é um degrau
// que o salto real do motor cruza (a msg intermédia no ar + o pouso) OU uma
// borda de descida (o passo horizontal primeiro, a queda depois).
function passoValidoAstar(ax, az, bx, bz) {
  const yA = yEmCampo(ax, az), yB = yEmCampo(bx, bz);
  const dy = yB - yA;
  if (dy > 2.0 || dy < -20) return false; // o salto sobe ≤ GANHO_SALTO+graça; quedas fundas não são um passo
  if (caminhoLivre(solidoCampo, ax, yA, az, bx, yB, bz)) return true;
  if (dy > 0.4) {
    const mx = Math.round((ax + (bx - ax) * 0.5) * 100) / 100, mz = Math.round((az + (bz - az) * 0.5) * 100) / 100;
    const my = Math.round((yA + 1.1) * 100) / 100;
    if (!caminhoLivre(solidoCampo, ax, yA, az, mx, my, mz)) return false;
    return caminhoLivre(solidoCampo, mx, my, mz, bx, yB, bz);
  }
  if (dy < -0.4) {
    if (!caminhoLivre(solidoCampo, ax, yA, az, bx, yA, bz)) return false;
    return caminhoLivre(solidoCampo, bx, yA, bz, bx, yB, bz);
  }
  return false;
}

/** A* na grelha de 1 bloco (células centradas em x+0.5, z+0.5, 8 direções). */
export function rotaAstar(sx, sz, gx, gz) {
  const centro = (v) => Math.floor(v) + 0.5;
  const inicio = [centro(sx), centro(sz)], alvo = [centro(gx), centro(gz)];
  const chave = (x, z) => `${x}|${z}`;
  const h = (x, z) => Math.hypot(alvo[0] - x, alvo[1] - z);
  const aberto = new Map();
  const fechado = new Set(); const veio = new Map(); const custo = new Map();
  const k0 = chave(inicio[0], inicio[1]);
  custo.set(k0, 0); aberto.set(k0, { x: inicio[0], z: inicio[1], f: h(inicio[0], inicio[1]) });
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  const minX = Math.min(inicio[0], alvo[0]) - 22, maxX = Math.max(inicio[0], alvo[0]) + 22;
  const minZ = Math.min(inicio[1], alvo[1]) - 22, maxZ = Math.max(inicio[1], alvo[1]) + 22;
  let fim = null;
  while (aberto.size) {
    let melhorK = null, melhorF = Infinity;
    for (const [k, no] of aberto) if (no.f < melhorF) { melhorF = no.f; melhorK = k; }
    const atual = aberto.get(melhorK); aberto.delete(melhorK);
    fechado.add(melhorK);
    if (atual.x === alvo[0] && atual.z === alvo[1]) { fim = melhorK; break; }
    const gAtual = custo.get(melhorK);
    for (const [dx, dz, custoPasso] of DIRS) {
      const nx = atual.x + dx, nz = atual.z + dz;
      if (nx < minX || nx > maxX || nz < minZ || nz > maxZ) continue;
      const nk = chave(nx, nz);
      if (fechado.has(nk)) continue;
      if (!passoValidoAstar(atual.x, atual.z, nx, nz)) continue;
      const g = gAtual + custoPasso;
      if (custo.has(nk) && custo.get(nk) <= g) continue;
      custo.set(nk, g); veio.set(nk, melhorK);
      aberto.set(nk, { x: nx, z: nz, f: g + h(nx, nz) });
    }
  }
  if (!fim) return [[sx, sz], [gx, gz]]; // sem caminho: a rota direta (o teste falha com dados visíveis)
  const pts = [];
  let k = fim;
  while (k) { const [x, z] = k.split("|").map(Number); pts.unshift([x, z]); k = veio.get(k) ?? null; }
  return pts;
}
