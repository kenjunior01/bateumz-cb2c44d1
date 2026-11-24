// shots-v86 — capturas do «E-SPORT VIVO» (dados REAIS criados pelo núcleo esport.ts)
// Padrão v84/v85: nada de números inventados — o torneio/liga/classificação
// existem NO APARELHO porque o núcleo os criou (o mesmo caminho que a UI usa).
// Uso: PW_CHROME=… node scripts/shots-v86.mjs  (vite no 8099)
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const EXE = process.env.PW_CHROME;
const BASE = "http://localhost:8099";
mkdirSync("shots-v86", { recursive: true });

// ── shim de localStorage (o núcleo é Node-safe mas a store é a mesma do browser) ──
const MEMORIA = new Map();
globalThis.localStorage = {
  getItem: (k) => (MEMORIA.has(k) ? MEMORIA.get(k) : null),
  setItem: (k, v) => MEMORIA.set(k, String(v)),
  removeItem: (k) => MEMORIA.delete(k),
  clear: () => MEMORIA.clear(),
};

const es = await import(new URL("../src/lib/esport.ts", import.meta.url).href);
const AGORA = Date.now();

// ── 1. TORNEIO campeonato do JOGADOR (kart) + partidas REAIS do circuito ──
const baseT = { jogo: "kart", formato: "campeonato", tamanho: 8, premioPontos: 500, pista: "praia", voltas: 4, janelaDias: 7, organizadorEmpresa: false, empresaNome: "", empresaSector: "" };
const rJ = es.criarTorneio({ ...baseT, nome: "Copa das Lendas de Sexta" }, AGORA);
if (!rJ.t) { console.error("FALHA criar torneio jogador:", rJ.motivo); process.exit(1); }
es.inscreverTorneio(rJ.t.id, "Eu", AGORA + 1);
es.iniciarTorneio(rJ.t.id, AGORA + 2);

// partidas REAIS do kart: campo completo F1 — permutação honesta 1-12
// (posições ÚNICAS, como o jogo real produz; eu na posição da corrida)
const rivais = es.RIVAIS_IA; // 11 nomes do circuito
const campoRace = (minhaPos) => {
  const resto = Array.from({ length: 12 }, (_, k) => k + 1).filter((p) => p !== minhaPos);
  return ["eu", ...rivais].map((id, i) => ({
    id,
    nome: id === "eu" ? "Eu" : rivais[i - 1],
    posicao: id === "eu" ? minhaPos : resto[i - 1],
  }));
};
// corrida 1: Eu 1.º (25 pts F1) · corrida 2: Eu 3.º (15 pts F1) → 40 no total
es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(1), vitoria: true, posicao: 1, total: 12, campo: campoRace(1) }, AGORA + 3);
es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(3), vitoria: false, posicao: 3, total: 12, campo: campoRace(3) }, AGORA + 4);

// ── 2. TORNEIO da EMPRESA (marca própria, em inscrição) ──
const rE = es.criarTorneio({ ...baseT, nome: "Torneio TropiCola Grand Prix", organizadorEmpresa: true, empresaNome: "TropiCola MZ", empresaSector: "Bebidas" }, AGORA + 5);
if (!rE.t) { console.error("FALHA criar torneio empresa:", rE.motivo); process.exit(1); }

// ── 3. LIGA de XADREZ do jogador + partidas REAIS (teto 25/partida declarado) ──
const rL = es.criarLiga({ nome: "Liga de Xadrez do Bairro", jogo: "chess", premioPontos: 300, janelaDias: 14, organizadorEmpresa: false, empresaNome: "", empresaSector: "" }, AGORA + 6);
if (!rL.l) { console.error("FALHA criar liga:", rL.motivo); process.exit(1); }
es.inscreverLiga(rL.l.id, "Eu", AGORA + 7);
es.partidaParaLigas({ jogoId: "chess", pontos: 25, vitoria: true }, AGORA + 8);
es.partidaParaLigas({ jogoId: "chess", pontos: 25, vitoria: true }, AGORA + 9);

const ESTADO = MEMORIA.get("bateu_esport_v1"); // a shim já guarda string — stringify duplo recusava no lerEsport (furo do probe)
const euTorneio = rJ.t.id;
const euLiga = rL.l.id;
console.log(`núcleo semeou: torneio ${euTorneio} · liga ${euLiga}`);

// ── browser: capturas ────────────────────────────────────────
const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "pt-PT" });
await ctx.addInitScript((estado) => {
  localStorage.setItem("bateu_esport_v1", estado);
}, ESTADO);
const pg = await ctx.newPage();

async function capturar(url, espera, nome) {
  await pg.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  await pg.waitForSelector(espera, { timeout: 45_000 });
  await pg.waitForTimeout(1200); // settle i18n/imagem
  await pg.screenshot({ path: `shots-v86/${nome}.png` });
  console.log(`✓ ${nome} ← ${url}`);
}

await capturar("/tournaments", '[data-testid="torneios-local-section"]', "v86-torneios-lista");
await capturar(`/tournaments/${euTorneio}`, '[data-testid="torneio-local-nome"]', "v86-torneio-detalhe");
await capturar("/tournaments/criar", '[data-testid="torneio-form-nome"]', "v86-criar-form");
await capturar("/ligas", '[data-testid="ligas-local-section"]', "v86-ligas-lista");
await capturar(`/ligas/${euLiga}`, '[data-testid="liga-local-nome"]', "v86-liga-detalhe");
await capturar("/lives?game=kart&kart-leve=1", '[data-testid="kart-forma"]', "v86-kart-forma");

await browser.close();
console.log("shots-v86 OK");
