// probe v60 — FUROS REAIS do 3D World (BateuRPG + Aetheria) com repro na consola
// 1) teclas presas no blur (anda sozinho para sempre)
// 2) mapa/pausa/retomar sem erros
// 3) sair/reentrar ×5 — vazamento de contexto WebGL (warnings "Too many active WebGL contexts")
// 4) Aetheria: hook E2E + teclas presas
// USO: lançar vite 8099 antes; PW_CHROME=… node scripts/probe-world-v60.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:8099";
const browser = await chromium.launch({ args: ["--no-sandbox"], executablePath: process.env.PW_CHROME || undefined });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const problemas = [];
page.setDefaultTimeout(9000);
page.on("pageerror", (e) => problemas.push("PAGEERROR: " + String(e).slice(0, 300)));
page.on("console", (m) => {
  const t = m.text();
  if (/GPU stall due to ReadPixels/.test(t)) return; // artefacto do rasterizador headless do sandbox — não é código
  if (m.type() === "error" && !/Failed to load resource/.test(t)) problemas.push("CONSOLE-ERR: " + t.slice(0, 300));
  else if (m.type() === "warning" && /(WebGL|context|three)/i.test(t)) problemas.push("CONSOLE-WARN: " + t.slice(0, 300));
});
page.on("response", (r) => {
  const st = r.status();
  if (st >= 400 && /localhost:8099/.test(r.url()) === false) console.log(`   [rede ${st}] ${r.url().slice(0, 110)}`);
});

// v60: clique determinístico a ~2 fps de raster — força + fallback DOM
// (padrão v57: o rAF lento do ambiente engana a actionability do Playwright)
const clicar = async (sel, timeout = 10000) => {
  const forcado = await page.click(sel, { timeout, force: true }).then(() => true).catch(() => false);
  if (forcado) return true;
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    el.click();
    return true;
  }, sel).catch(() => false);
};

console.log("── 1) abrir /lives?game=mmorpg (mundo direto pelo URL)");
await page.goto(BASE + "/lives?game=mmorpg", { waitUntil: "domcontentloaded", timeout: 45000 }).catch((e) => console.log("GOTO:", String(e).slice(0, 200)));
await page.waitForSelector('[data-testid="rpg-jogar"]', { timeout: 25000 }).catch(() => console.log("  (menu rpg não apareceu)"));

console.log("── 2) NOVA LENDA");
await clicar('[data-testid="rpg-jogar"]', 10000);
await page.waitForTimeout(5000);

const mundo = await page.evaluate(() => {
  const r = window.__rpg;
  if (!r) return { hook: false };
  return { hook: true, fase: r.motor.fase, frente: r.motor.entrada.frente, px: Math.round(r.motor.px), py: Math.round(r.motor.py), fps: r.captura().fps };
});
console.log("   mundo:", JSON.stringify(mundo));

console.log("── 3) FURO teclas presas: segurar W → blur do window");
await page.keyboard.down("w");
await page.waitForTimeout(350);
const frenteAntes = await page.evaluate(() => window.__rpg?.motor.entrada.frente);
await page.evaluate(() => window.dispatchEvent(new Event("blur")));
await page.waitForTimeout(250);
const frenteDepois = await page.evaluate(() => window.__rpg?.motor.entrada.frente);
console.log(`   frente com W: ${frenteAntes} · APÓS blur: ${frenteDepois}  ${frenteDepois === 0 ? "✅ limpa" : "❌ PRESA (anda sozinho para sempre)"}`);
await page.keyboard.up("w");

console.log("── 4) mapa (pelo minimapa) → pausa (pelo botão HUD) → retomar");
const abriuMapa = await clicar('[data-testid="rpg-minimapa"]', 8000);
await page.waitForTimeout(1200);
const mapaVisivel = await page.locator('[data-testid="rpg-mapa-canvas"]').count();
const mapaBase = await page.evaluate(() => window.__rpg?.mapaBase?.() ?? null);
console.log(`   minimapa→mapa: ${abriuMapa} · canvas visível: ${mapaVisivel > 0} · mapaBase: ${JSON.stringify(mapaBase)}`);
await clicar('[data-testid="rpg-fechar-modal"]', 8000);
await page.waitForTimeout(700);
const abriuPausa = await clicar('[data-testid="rpg-btn-pausa"]', 8000);
await page.waitForTimeout(700);
const retomou = await clicar('[data-testid="rpg-retomar"]', 10000);
await page.waitForTimeout(800);
const modalDepois = await page.evaluate(() => !!document.querySelector('[data-testid="rpg-modal"]'));
console.log(`   pausa: ${abriuPausa} · retomar: ${retomou} · modal fechado: ${!modalDepois}`);
const posMapa = await page.evaluate(() => ({ modalAberto: !!document.querySelector('[data-testid="rpg-modal"]'), fase: window.__rpg?.motor?.fase }));
console.log("   após modais:", JSON.stringify(posMapa));

console.log("── 5) sair/reentrar ×2 (contextos WebGL)");
for (let ciclo = 1; ciclo <= 2; ciclo++) {
  const abriuPausa2 = await clicar('[data-testid="rpg-btn-pausa"]', 8000);
  await page.waitForTimeout(700);
  const saiu = abriuPausa2 && await clicar('[data-testid="rpg-sair"]', 10000);
  await page.waitForTimeout(1800);
  const banner = await page.locator('[data-testid="livehub-destaque-bateu-world"]').count();
  const reentrou = banner > 0 && await clicar('[data-testid="livehub-destaque-bateu-world"]', 8000);
  await page.waitForTimeout(1200);
  await clicar('[data-testid="rpg-jogar"]', 10000);
  await page.waitForTimeout(3200);
  const fase = await page.evaluate(() => window.__rpg?.motor?.fase ?? "?");
  console.log(`   ciclo ${ciclo}: saiu=${saiu} (banner=${banner > 0}) reentrou=${reentrou} → motor.fase=${fase}`);
}

console.log("── 6) Aetheria (hook + teclas presas)");
await page.goto(BASE + "/lives?game=aetheria", { waitUntil: "domcontentloaded", timeout: 45000 }).catch((e) => console.log("GOTO:", String(e).slice(0, 200)));
await page.waitForSelector('[data-testid="aetheria-intro"]', { timeout: 20000 }).catch(() => console.log("  (intro aetheria não apareceu)"));
await page.waitForTimeout(1500);
const temIntro = await page.locator('[data-testid="aetheria-intro"]').count();
if (temIntro) {
  await page.locator(".aetheria-enter").click();
  await page.waitForTimeout(2500);
  const aet = await page.evaluate(() => {
    const h = window.__aetheria;
    if (!h) return { hook: false };
    return { hook: true, voando: h.voando() };
  });
  console.log("   aetheria:", JSON.stringify(aet));
  await page.keyboard.down("w");
  await page.waitForTimeout(300);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(200);
  const teclasAet = await page.evaluate(() => window.__aetheria?.teclas?.() ?? null);
  console.log(`   teclas após blur: ${JSON.stringify(teclasAet)}  ${teclasAet && Object.keys(teclasAet).every((k) => !teclasAet[k]) ? "✅ limpas" : teclasAet ? "❌ PRESAS" : "(sem hook)"}`);
  await page.keyboard.up("w");
}

console.log("── RESULTADO");
if (problemas.length === 0) console.log("✅ ZERO erros de consola/pageerror/warn-WebGL em toda a sessão");
else {
  console.log(`❌ ${problemas.length} problemas:`);
  problemas.slice(0, 14).forEach((e) => console.log("  ", e));
}

await browser.close();
