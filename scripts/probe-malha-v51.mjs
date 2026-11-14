// Probe v51 — prova isomórfica da MALHA pura (malha.ts) no Node:
// o MESMO módulo que o worker de malha corre no browser corre no
// Node sem THREE/DOM (padrão probe-v47/v50). Asserções sobre os
// buffers que o Mundo montaria — antes de a bateria E2E existir.
import { realpathSync } from "node:fs";
const root = realpathSync("/home/z/my-project/bateumz-cb2c44d1");
const { CHUNK, ALTURA, B } = await import(`${root}/src/game/blocos/constants.ts`);
const { Ruido } = await import(`${root}/src/game/blocos/noise.ts`);
const { gerarDadosTerreno, perfilBase } = await import(`${root}/src/game/blocos/geracao.ts`);
const { construirDadosMalha, malhaIgual, somaValores } = await import(`${root}/src/game/blocos/malha.ts`);

let ok = 0, fail = 0;
const t = (nome, cond) => { if (cond) { ok++; console.log("  ✅", nome); } else { fail++; console.log("  ❌", nome); } };

const idx = (x, y, z) => (y * CHUNK + z) * CHUNK + x;
const ruido = new Ruido(20251113);
const perfil = perfilBase(ruido);
const N = (cx, cz) => gerarDadosTerreno(ruido, cx, cz, perfil);
const S = perfil.altura;
const sup = (cx, cz) => {
  const bx = cx * CHUNK, bz = cz * CHUNK;
  return (x, z) => S(x, z); // mesma função pura que o worker usa
};

t("import no Node (zero THREE/DOM): construirDadosMalha é função", typeof construirDadosMalha === "function");

// chunk cheio de pedra no interior → 6 faces exteriores só nas bordas do CUBO,
// mas o chunk é uma coluna 16×80: topo do mundo (y=79) tem faces para cima
const pedra = new Uint8Array(CHUNK * CHUNK * ALTURA).fill(B.PEDRA);
const dmPedra = construirDadosMalha(0, 0, pedra, {}, () => 40);
// sem vizinhos, TODAS as faces de borda aparecem (viz=AR, critério do
// getBloco antigo): topo 256 + fundo 256 + 4 laterais × 16×80
const esperadoFaces = 2 * CHUNK * CHUNK + 4 * CHUNK * ALTURA;
t(`contagem exacta sem vizinhos = ${esperadoFaces} faces × 4 verts`, dmPedra.pos.length / 3 === esperadoFaces * 4);

// com o vizinho xp PEDRA cheia, as faces laterais +x desaparecem
const dmViz = construirDadosMalha(0, 0, pedra, { xp: pedra }, () => 40);
t("vizinho sólido fecha as faces +x: menos vértices", dmViz.pos.length < dmPedra.pos.length);
const diferença = (dmPedra.pos.length - dmViz.pos.length) / 3 / 4;
t(`exactamente CHUNK×ALTURA faces fechadas (${diferença})`, diferença === CHUNK * ALTURA);

// AR total → zero vértices (nada a desenhar)
const ar = new Uint8Array(CHUNK * CHUNK * ALTURA);
const dmAr = construirDadosMalha(5, 5, ar, {}, () => 40);
t("chunk de AR: zero buffers", dmAr.pos.length === 0 && dmAr.ind.length === 0 && dmAr.posA.length === 0);

// água: só topo, separada no grupo A
const agua = new Uint8Array(CHUNK * CHUNK * ALTURA);
for (let y = 30; y <= 34; y++) for (let z = 0; z < CHUNK; z++) for (let x = 0; x < CHUNK; x++) agua[idx(x, y, z)] = B.AGUA;
const dmAgua = construirDadosMalha(2, 2, agua, {}, () => 40);
t("água: só topo (1 face por coluna no grupo A, nada no S)", dmAgua.pos.length === 0 && dmAgua.posA.length / 3 === CHUNK * CHUNK * 4);

// cruz (erva): planos diagonais, 8 verts por planta
const cruz = new Uint8Array(CHUNK * CHUNK * ALTURA);
cruz[idx(8, 40, 8)] = B.ERVA;
const dmCruz = construirDadosMalha(3, 3, cruz, {}, () => 40);
t("erva em cruz: 8 vértices (2 planos × 2 lados × 2 tris completos? — 4 verts × 4)", dmCruz.pos.length / 3 === 16 && dmCruz.ind.length === 24);

// determinismo bit a bit: mesmas entradas → mesma malha
const d1 = N(0, 0);
const a = construirDadosMalha(0, 0, d1, { xp: N(1, 0), zp: N(0, 1) }, S);
const b2 = construirDadosMalha(0, 0, d1, { xp: N(1, 0), zp: N(0, 1) }, S);
t("determinismo bit a bit (mesmas entradas → malhaIgual)", malhaIgual(a, b2));

// vizinhos mudam a malha (fronteira honesta): xp com AR vs xp real
const semVizX = construirDadosMalha(0, 0, d1, {}, S);
const comVizX = construirDadosMalha(0, 0, d1, { xp: N(1, 0) }, S);
t("vizinho muda a malha da fronteira (zero segunda fonte de faces)", !malhaIgual(semVizX, comVizX) && somaValores(comVizX.pos) > 0);

// sumário de sanidade: tipos dos buffers
const chunkRpg = N(0, 0);
const dmR = construirDadosMalha(0, 0, chunkRpg, {}, S);
t("buffers tipados prontos para transfer (Float32 + índice 16/32)",
  dmR.pos instanceof Float32Array && dmR.uv instanceof Float32Array && dmR.cor instanceof Float32Array &&
  (dmR.ind instanceof Uint16Array || dmR.ind instanceof Uint32Array));

console.log(`\nprobe-malha-v51: ${ok} ok · ${fail} falha`);
process.exit(fail ? 1 : 0);
