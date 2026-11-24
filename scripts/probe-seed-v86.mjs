// probe 3: verificar seed esport no browser
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const EXE = process.env.PW_CHROME;
const BASE = "http://localhost:8099";
mkdirSync("shots-v86", { recursive: true });

const MEMORIA = new Map();
globalThis.localStorage = {
  getItem: (k) => (MEMORIA.has(k) ? MEMORIA.get(k) : null),
  setItem: (k, v) => MEMORIA.set(k, String(v)),
  removeItem: (k) => MEMORIA.delete(k),
  clear: () => MEMORIA.clear(),
};
const es = await import(new URL("../src/lib/esport.ts", import.meta.url).href);
const AGORA = Date.now();
const baseT = { jogo: "kart", formato: "campeonato", tamanho: 8, premioPontos: 500, pista: "praia", voltas: 4, janelaDias: 7, organizadorEmpresa: false, empresaNome: "", empresaSector: "" };
const rJ = es.criarTorneio({ ...baseT, nome: "Copa das Lendas de Sexta" }, AGORA);
console.log("criado:", rJ.t?.id ?? rJ.motivo);
es.inscreverTorneio(rJ.t.id, "Eu", AGORA + 1);
es.iniciarTorneio(rJ.t.id, AGORA + 2);
const rivais = es.RIVAIS_IA;
const campoRace = (minhaPos) => {
  const nomes = ["eu", ...rivais];
  return nomes.map((id, i) => ({
    id,
    nome: id === "eu" ? "Eu" : rivais[i - 1],
    posicao: id === "eu" ? minhaPos : (i < minhaPos ? i + 1 : i),
  }));
};
console.log("partida1:", JSON.stringify(es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(1), vitoria: true, posicao: 1, total: 12, campo: campoRace(1) }, AGORA + 3)));
console.log("partida2:", JSON.stringify(es.partidaParaTorneios({ jogoId: "kart", pontos: es.pontosPorPosicao(3), vitoria: false, posicao: 3, total: 12, campo: campoRace(3) }, AGORA + 4)));
const rE = es.criarTorneio({ ...baseT, nome: "Torneio TropiCola Grand Prix", organizadorEmpresa: true, empresaNome: "TropiCola MZ", empresaSector: "Bebidas" }, AGORA + 5);
console.log("empresa:", rE.t?.id ?? rE.motivo);
const rL = es.criarLiga({ nome: "Liga de Xadrez do Bairro", jogo: "chess", premioPontos: 300, janelaDias: 14, organizadorEmpresa: false, empresaNome: "", empresaSector: "" }, AGORA + 6);
console.log("liga:", rL.l?.id ?? rL.motivo);
es.inscreverLiga(rL.l.id, "Eu", AGORA + 7);
es.partidaParaLigas({ jogoId: "chess", pontos: 25, vitoria: true }, AGORA + 8);
es.partidaParaLigas({ jogoId: "chess", pontos: 25, vitoria: true }, AGORA + 9);
const ESTADO = MEMORIA.get("bateu_esport_v1");
console.log("store len:", ESTADO?.length, "| parse:", (() => { try { const p = JSON.parse(ESTADO); return `torneios=${p.torneios.length} ligas=${p.ligas.length}`; } catch (e) { return `ERRO ${e.message}`; } })());

const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "pt-PT" });
await ctx.addInitScript((estado) => {
  localStorage.setItem("bateu_esport_v1", estado);
}, ESTADO);
const pg = await ctx.newPage();
await pg.goto(`${BASE}/tournaments`, { waitUntil: "domcontentloaded" });
await pg.waitForTimeout(2500);
const info = await pg.evaluate(() => {
  const raw = localStorage.getItem("bateu_esport_v1");
  const p = raw ? JSON.parse(raw) : null;
  const local = Array.from(document.querySelectorAll('[data-testid="torneios-local-section"]'));
  return {
    storeNoBrowser: p ? `torneios=${p.torneios.length} ligas=${p.ligas.length}` : "AUSENTE",
    secoesLocal: local.length,
    h1: document.querySelector("h1")?.innerText,
    bodyTexto: document.body.innerText.slice(0, 400).replace(/\s+/g, " "),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
