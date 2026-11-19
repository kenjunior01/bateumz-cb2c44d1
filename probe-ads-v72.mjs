import { spawn, spawnSync } from "node:child_process";
const RAIZ = process.cwd();
const BASE = "http://localhost:8099";
const filhos = [];
function correr(cmd, args) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: process.env, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stderr.on("data", () => {});
  filhos.push(p);
  return p;
}
const matarTodos = () => { for (const p of filhos) { try { process.kill(-p.pid, "SIGKILL"); } catch {} try { p.kill("SIGKILL"); } catch {} } };
function limparZumbis() { try { spawnSync("pkill", ["-f", "vite --port 8099 --strictPort"], { stdio: "ignore" }); } catch {} }
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
async function esperarAte(url, ms = 90000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) { try { const r = await fetch(url); if (r.status < 500) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); }
  return false;
}

limparZumbis();
const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"]);
await esperarAte(`${BASE}/`);
const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const pg = await ctx.newPage();
pg.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 200)));
const agora = Date.now();
const anuncioHub = {
  id: "an-mz-hub1-aaa", pais: "MZ", tipo: "faixa",
  titulo: "Festival de Jogos em Maputo", texto: "Prémios em moedas todos os dias — joga no hub!",
  ctaEtiqueta: "Ver", ctaUrl: "/lives?game=kart",
  gradiente: "from-orange-500 via-red-500 to-rose-600",
  estado: "ativo", iniciaEm: agora - 1000, terminaEm: 0,
  criadoPor: "Gestor MZ", criadoEm: agora, impressoes: 0, cliques: 0,
};
await pg.addInitScript(([pais, semente]) => {
  localStorage.setItem("bateu_country", pais);
  localStorage.setItem("bateu_regional_v72", semente);
}, ["MZ", JSON.stringify({
  identidades: { MZ: { pais: "MZ", corPrimaria: "#0ea55e", corSecundaria: "#eab308", corAcento: "#ef4444", nomeTema: "Bateu Moçambique", iniciaisLogo: "BM", slogan: "s", atualizadoEm: agora }, AO: null, BR: null, PT: null },
  anuncios: [anuncioHub],
})]);

await pg.goto(`${BASE}/lives`, { waitUntil: "domcontentloaded", timeout: 90000 });
const apareceu = await pg.waitForSelector('[data-testid="faixa-anuncios"]', { timeout: 45000 }).then(() => true).catch(() => false);
console.log("FAIXA APARECEU:", apareceu);
await dormir(1500);
console.log("STORE APOS VER:", await pg.evaluate(() => localStorage.getItem("bateu_regional_v72")?.slice(0, 500)));
await pg.locator('[data-testid="anuncio-ativo"]').click();
await dormir(2500);
console.log("URL APOS CLIQUE:", pg.url());
console.log("STORE APOS CLIQUE:", await pg.evaluate(() => {
  const e = JSON.parse(localStorage.getItem("bateu_regional_v72"));
  return JSON.stringify({ n: e.anuncios?.length, cliques: e.anuncios?.[0]?.cliques, imp: e.anuncios?.[0]?.impressoes });
}));
await browser.close();
matarTodos();
setTimeout(() => process.exit(0), 200);
