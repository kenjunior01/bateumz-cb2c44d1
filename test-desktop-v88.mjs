// test-desktop-v88 — «DESIGN DESKTOP»: o desktop deixa de ter defeitos visuais
// O que a suíte PROVA (com o browser a ver, não com confiança no código):
//   A. ZERO OVERFLOW: /, /jogos, /lives, /tournaments, /desporto e /profile
//      a 1280px têm scrollWidth === clientWidth — o furo de 360px do /lives
//      (coluna 1fr crescendo com o min-content dos jogos) e o de 1px do
//      /jogos (glow -inset-px do CardTilt) ficam PROVADOS mortos.
//   B. JOGO RESPONSÁVEL LEGÍVEL: no rodapé claro da homepage os 4 cartões do
//      RG têm título na cor do TEMA (não branco sobre branco) e o «Resumo de
//      Actividade» mostra números REAIS do aparelho (0/0 num aparelho novo —
//      NUNCA o mock 47min/820 que mentia «Dados calculados neste dispositivo»).
//   C. ROLLUP CLARO: a secção «Sorteios & Concursos» da homepage é tonal=claro
//      (fundo transparente — fim da caixa preta gigante) e o título usa a cor
//      do tema; o RollUp ESCURO mantém-se igual para os outros consumidores.
//   D. TOPO DO /tournaments: o h1 «Torneios» nasce ABAIXO da navbar fixa
//      (top ≥ fundo da navbar) — não nasce mais cortado.
//   E. DOBRA PREMIUM: ambiente decorativo presente (home88-ambiente) e o h1
//      da dobra renderiza a 48px no lg (lg:text-5xl) a 1280px.
//   F. SANIDADE MÓVEL 390px: / e /lives continuam sem overflow (o furo v87
//      não regressa) + i18n EN sem chaves cruas no rodapé.
//   G. ZERO pageerror em todas as rotas.
// Requisito: vite dev em :8099 (padrão das suítes) · PW_CHROME.
import { spawn } from "node:child_process";
import fs from "node:fs";
import { chromium } from "playwright";

const EXE = process.env.PW_CHROME;
const BASE = "http://localhost:8099";
const RAIZ = process.cwd();
fs.mkdirSync("shots-v88", { recursive: true });

let vite = null;
async function levantarVite() {
  try {
    const r = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
    if (r.ok) { console.log("vite já em :8099"); return; }
  } catch { /* não está a correr */ }
  vite = spawn("npx", ["vite", "--port", "8099", "--strictPort"], {
    cwd: RAIZ, stdio: "ignore", detached: true,
  });
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const r = await fetch(BASE, { signal: AbortSignal.timeout(1200) });
      if (r.ok) return;
    } catch { /* ainda a subir */ }
  }
  throw new Error("vite não subiu em :8099");
}

let verdes = 0, falhas = 0;
const ok = (nome, cond, extra) => { if (cond) { verdes++; console.log("  ✓", nome); } else { falhas++; console.log("  ✗", nome, extra || ""); } };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const RUIDO = [
  "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase",
  "permission", "AbortError", "play() failed", "user gesture", "JWT", "PGRST",
  "fetchPriority", "third-party cookie", "storage", "TheSportsDB", "throttled",
];
const erroReal = (msg) => !RUIDO.some((r) => msg.toLowerCase().includes(r.toLowerCase()));

await levantarVite();
const browser = await chromium.launch({ executablePath: EXE, headless: true });

async function novaPagina(tema = "light") {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: tema });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on("pageerror", (e) => erros.push(String(e)));
  pg.on("console", (m) => { if (m.type() === "error" && erroReal(m.text())) erros.push(m.text()); });
  return { ctx, pg, erros };
}

// ═══════════════ A · ZERO OVERFLOW a 1280 ═══════════════
console.log("\nA · ZERO OVERFLOW (1280px) — / · /jogos · /lives · /tournaments · /desporto · /profile");
{
  const { ctx, pg, erros } = await novaPagina();
  const rotas = [["/", "home"], ["/jogos", "jogos"], ["/lives", "lives"], ["/tournaments", "torneios"], ["/desporto", "desporto"], ["/profile", "perfil"]];
  for (const [rota, nome] of rotas) {
    await pg.goto(`${BASE}${rota}`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    await dormir(1500);
    const m = await pg.evaluate(() => ({
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    }));
    ok(`${nome}: sem overflow (sw=${m.sw} cw=${m.cw})`, m.sw <= m.cw, `transbordou ${m.sw - m.cw}px`);
    await pg.screenshot({ path: `shots-v88/v88-${nome}-1280.png`, fullPage: false });
  }
  ok("zero pageerror nas 6 rotas", erros.length === 0, erros.slice(0, 3).join(" | "));
  await ctx.close();
}

// ═══════════════ B · RG LEGÍVEL + HONESTO ═══════════════
console.log("\nB · JOGO RESPONSÁVEL legível no rodapé claro + números reais");
{
  const { ctx, pg, erros } = await novaPagina("light");
  await pg.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await dormir(1500);
  const rg = await pg.evaluate(() => {
    const card = document.querySelector('[data-testid="rg-tempo-card"]');
    if (!card) return { achou: false };
    const titulo = card.querySelector("h3, [class*='CardTitle'], [data-slot='card-title']");
    const el = titulo || card;
    const cor = getComputedStyle(el).color;
    const rgb = cor.match(/\d+/g)?.map(Number) || [255, 255, 255];
    const claro = rgb[0] > 200 && rgb[1] > 200 && rgb[2] > 200; // branco = invisível
    const activ = document.querySelector('[data-testid="rg-actividade-partidas"]');
    const jogos = document.querySelector('[data-testid="rg-actividade-jogos"]');
    return {
      achou: true, branco: claro, cor,
      partidas: activ?.textContent?.trim() ?? null,
      jogosDistintos: jogos?.textContent?.trim() ?? null,
      nota: document.body.textContent.includes("Dados reais deste aparelho"),
      mock47: document.body.textContent.includes("47 min") && document.body.textContent.includes("Moedas esta semana"),
    };
  });
  ok("rg-tempo-card existe no rodapé", rg.achou === true);
  ok("título do RG NÃO é branco (tema claro)", rg.achou && rg.branco === false, rg.cor);
  ok("Resumo de Actividade mostra números REAIS (partidas do aparelho)", rg.partidas !== null && /^\d+$/.test(rg.partidas), String(rg.partidas));
  ok("jogos distintos também real", rg.jogosDistintos !== null && /^\d+$/.test(rg.jogosDistintos), String(rg.jogosDistintos));
  ok("nota honesta «Dados reais deste aparelho»", rg.nota === true);
  ok("mock 47min/820 eliminado", rg.mock47 === false);
  const rodape = await pg.$("footer");
  if (rodape) { await rodape.scrollIntoViewIfNeeded(); await dormir(800); await rodape.screenshot({ path: "shots-v88/v88-rodape-rg.png" }); }
  ok("zero pageerror (RG)", erros.length === 0, erros.slice(0, 3).join(" | "));
  await ctx.close();
}

// ═══════════════ C · ROLLUP CLARO na homepage ═══════════════
console.log("\nC · Sorteios & Concursos em ROLLUP CLARO (fim da caixa preta)");
{
  const { ctx, pg, erros } = await novaPagina("light");
  await pg.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await dormir(1500);
  const roll = await pg.evaluate(() => {
    const sec = document.querySelector('[data-testid="rollup-claro"]');
    if (!sec) return { achou: false };
    const bg = getComputedStyle(sec).backgroundColor;
    const bgImg = getComputedStyle(sec).backgroundImage;
    const h2 = sec.querySelector("h2");
    const cor = h2 ? getComputedStyle(h2).color : "";
    return { achou: true, bg, semGradienteEscuro: !bgImg.includes("#050508"), corH2: cor };
  });
  ok("rollup-claro presente na homepage", roll.achou === true);
  ok("fundo transparente (sem caixa preta)", roll.achou && roll.bg === "rgba(0, 0, 0, 0)", roll.bg);
  ok("sem gradiente escuro #050508", roll.achou && roll.semGradienteEscuro);
  ok("título na cor do tema", roll.achou && roll.corH2 && !/^rgb\(2[45]\d,/.test(roll.corH2), roll.corH2);
  const sort = await pg.$('[aria-label="Sorteios disponíveis"]');
  if (sort) { await sort.scrollIntoViewIfNeeded(); await dormir(900); await sort.screenshot({ path: "shots-v88/v88-sorteios-claro.png" }); }
  ok("zero pageerror (rollup)", erros.length === 0, erros.slice(0, 3).join(" | "));
  await ctx.close();
}

// ═══════════════ D · TOPO DO /tournaments ═══════════════
console.log("\nD · «Torneios» nasce ABAIXO da navbar fixa");
{
  const { ctx, pg, erros } = await novaPagina("light");
  await pg.goto(`${BASE}/tournaments`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await dormir(1500);
  const topo = await pg.evaluate(() => {
    const h1 = [...document.querySelectorAll("h1")].find((h) => (h.textContent || "").includes("Torneios"));
    const nav = document.querySelector("header, nav");
    const navFundo = nav ? nav.getBoundingClientRect().bottom : 0;
    return { h1Top: h1 ? h1.getBoundingClientRect().top : -1, navFundo };
  });
  ok("h1 «Torneios» visível", topo.h1Top > 0);
  ok(`h1 abaixo da navbar (top=${Math.round(topo.h1Top)} ≥ nav=${Math.round(topo.navFundo)})`, topo.h1Top >= topo.navFundo - 2);
  ok("zero pageerror (tournaments)", erros.length === 0, erros.slice(0, 3).join(" | "));
  await ctx.close();
}

// ═══════════════ E · DOBRA PREMIUM ═══════════════
console.log("\nE · Dobra premium: ambiente + h1 a 48px no lg");
{
  const { ctx, pg, erros } = await novaPagina("light");
  await pg.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await dormir(1500);
  const dobra = await pg.evaluate(() => {
    const amb = document.querySelector('[data-testid="home88-ambiente"]');
    const h1 = document.querySelector('[data-testid="home79-frase"]');
    const dobraEl = document.querySelector('[data-testid="home85-dobra"]');
    return {
      ambiente: !!amb && amb.getBoundingClientRect().height > 0,
      fontSize: h1 ? parseFloat(getComputedStyle(h1).fontSize) : 0,
      duasCols: dobraEl ? getComputedStyle(dobraEl).gridTemplateColumns.split(" ").length : 0,
    };
  });
  ok("ambiente decorativo visível no desktop", dobra.ambiente === true);
  ok(`h1 renderiza 48px (lg:text-5xl) — ${dobra.fontSize}px`, dobra.fontSize === 48, String(dobra.fontSize));
  ok("dobra mantém as 2 colunas (v85 intacto)", dobra.duasCols === 2, String(dobra.duasCols));
  await pg.screenshot({ path: "shots-v88/v88-dobra-1280.png" });
  ok("zero pageerror (dobra)", erros.length === 0, erros.slice(0, 3).join(" | "));
  await ctx.close();
}

// ═══════════════ F · SANIDADE MÓVEL + i18n EN ═══════════════
console.log("\nF · Móvel 390px sem regressão + i18n EN no rodapé");
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on("pageerror", (e) => erros.push(String(e)));
  for (const rota of ["/", "/lives"]) {
    await pg.goto(`${BASE}${rota}`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    await dormir(1500);
    const m = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(`390px ${rota}: sem overflow (sw=${m.sw})`, m.sw <= m.cw, `+${m.sw - m.cw}px`);
  }
  ok("zero pageerror (390px)", erros.length === 0, erros.slice(0, 3).join(" | "));
  await ctx.close();

  // i18n EN: rodapé da homepage não pode mostrar chaves cruas
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "en-US" });
  const pg2 = await ctx2.newPage();
  await pg2.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await pg2.evaluate(() => { try { localStorage.setItem("bateu-lang", "en"); } catch {} });
  await pg2.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await dormir(2000);
  const cru = await pg2.evaluate(() => {
    const txt = document.querySelector("footer")?.textContent || "";
    return /(rg\.actividade|home79\.)[a-zA-Z.]/.test(txt);
  });
  ok("rodapé EN sem chaves cruas", cru === false);
  await ctx2.close();
}

await browser.close();
console.log(`\n══════════ test-desktop-v88: ${verdes} verdes · ${falhas} falhas ══════════`);
process.exit(falhas > 0 ? 1 : 0);
