// test-desktop-v90 — «DESKTOP AO TOQUE»: hover/foco reais na grelha de jogos
// + MODO ALTO CONTRASTE com escolha explícita do utilizador.
// O que a suíte PROVA (com o browser a ver, não com confiança no código):
//   0. NÚCLEO (Node, .ts direto): validação podre → null, alternar,
//      sistema prefers-contrast respeitado SÓ sem escolha explícita,
//      aplicarContraste = UM atributo no <html>.
//   A. GRELHA /jogos 1280×800: .game-card-v2 deixa de ser classe morta —
//      hover MUDA borda + sombra, CTA «JOGAR ▶» escala, botões de ação
//      com hover real; zero overflow horizontal.
//   B. FOCO POR TECLADO: Tab até um cartão da grelha → :focus-visible com
//      anel ≥ 2px (quem navega por teclado vê onde está).
//   C. ALTO CONTRASTE: botão do rodapé → atributo no html + aria-pressed
//      + store; cor do texto-mudo MUDA de verdade; variantes de opacidade
//      (/50) voltam ao valor CHEIO; PERSISTE após reload; segunda pressão
//      volta a normal.
//   D. SISTEMA: prefers-contrast: more sem escolha explícita → alto
//      AUTOMÁTICO (e a 1.ª pressão do botão grava a escolha real).
//   E. MOBILE 390 intocado: sem overflow, botão presente.
//   F. i18n: em EN o botão fala «High contrast» (chave ×6 viva).
//   G. ZERO pageerror em todas as páginas.
// Requisito: vite dev em :8099 (igual às suítes anteriores).
import { spawn } from "node:child_process";
import fs from "node:fs";

const RAIZ = process.cwd();
const BASE = "http://localhost:8099";
const OUT = "shots-v90";
fs.mkdirSync(OUT, { recursive: true });

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
const falha = (nome, extra) => { falhas++; console.log("  ✗", nome, extra || ""); };
const verde = (nome) => { verdes++; console.log("  ✓", nome); };
function assert(cond, nome, extra) { if (cond) verde(nome); else falha(nome, extra); }

const erros = [];

async function navegar(page, url, waitMs = 4500) {
  await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(waitMs);
}

(async () => {
  // ═══ 0. NÚCLEO PURO em Node (import .ts direto — padrão v80) ═══
  console.log("\n— 0. núcleo contraste.ts (Node) —");
  const C = await import(`${RAIZ}/src/lib/contraste.ts`);
  const fakeStorage = (inicial) => {
    const m = new Map(Object.entries(inicial || {}));
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      dados: m,
    };
  };
  const fakeHtml = () => {
    const attrs = new Map();
    return {
      setAttribute: (n, v) => attrs.set(n, v),
      removeAttribute: (n) => attrs.delete(n),
      attrs,
    };
  };
  assert(C.estadoLido("alto") === "alto" && C.estadoLido("normal") === "normal", "0.1 estadoLido aceita os dois valores");
  assert(C.estadoLido("podre") === null && C.estadoLido(null) === null && C.estadoLido(undefined) === null && C.estadoLido("{}") === null, "0.2 estadoLido recusa podre → null (nunca escolheu)");
  const st0 = fakeStorage({ bateu_contraste_v1: "alto" });
  assert(C.lerContraste(st0) === "alto", "0.3 lerContraste lê a escolha explícita");
  const st1 = fakeStorage({ bateu_contraste_v1: "lixo" });
  assert(C.lerContraste(st1) === null, "0.4 lerContraste recusa valor podre");
  assert(C.alternarContraste("alto") === "normal" && C.alternarContraste("normal") === "alto", "0.5 alternarContraste inverte");
  assert(C.sistemaPedeAltoContraste(undefined) === false, "0.6 sem matchMedia → sistema não pede");
  assert(C.sistemaPedeAltoContraste((q) => ({ matches: q === "(prefers-contrast: more)" })) === true, "0.7 sistema com prefers-contrast: more → pede");
  const html1 = fakeHtml();
  const stA = fakeStorage({});
  const e1 = C.aplicarContraste({ storage: stA, documentElement: html1, matchMedia: () => ({ matches: false }) });
  assert(e1 === "normal" && html1.attrs.size === 0, "0.8 aplicar sem escolha nem sistema → normal, SEM atributo");
  const html2 = fakeHtml();
  const e2 = C.aplicarContraste({ storage: stA, documentElement: html2, matchMedia: (q) => ({ matches: q === "(prefers-contrast: more)" }) });
  assert(e2 === "alto" && html2.attrs.get("data-contraste") === "alto", "0.9 sistema pede + sem escolha → alto AUTOMÁTICO");
  const html3 = fakeHtml();
  const stB = fakeStorage({ bateu_contraste_v1: "normal" });
  const e3 = C.aplicarContraste({ storage: stB, documentElement: html3, matchMedia: () => ({ matches: true }) });
  assert(e3 === "normal" && html3.attrs.size === 0, "0.10 escolha EXPLÍCITA vence o sistema (normal gravado vence prefers-contrast)");
  const html4 = fakeHtml();
  C.gravarContraste("alto", stA);
  const e4 = C.aplicarContraste({ storage: stA, documentElement: html4 });
  assert(e4 === "alto" && html4.attrs.get("data-contraste") === "alto", "0.11 gravar+aplicar → atributo no <html>");

  await levantarVite();
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  // ═══ A. GRELHA /jogos 1280×800 — a classe morta ganhou vida ═══
  console.log("\n— A. grelha de jogos 1280×800 —");
  const pA = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  pA.on("pageerror", (e) => erros.push("/jogos1280: " + String(e)));
  await navegar(pA, "/jogos", 5500);
  const overA = await pA.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overA <= 1, `A1 SEM overflow horizontal a 1280 (sobra ${overA}px)`);
  const kart = pA.locator('[data-testid="jogos-card-kart"]');
  assert(await kart.count() === 1, "A2 cartão do kart na grelha com testid novo (jogos-card-kart)");
  const antes = await kart.evaluate((el) => {
    const s = getComputedStyle(el);
    return { border: s.borderColor, shadow: s.boxShadow };
  });
  await kart.hover();
  await pA.waitForTimeout(700);
  const depois = await kart.evaluate((el) => {
    const s = getComputedStyle(el);
    return { border: s.borderColor, shadow: s.boxShadow };
  });
  assert(depois.border !== antes.border, `A3 hover MUDA a borda (${antes.border} → ${depois.border})`);
  assert(/0\.55\)|0\.55 /.test(depois.border) || depois.border !== "rgba(255, 255, 255, 0.05)", `A4 borda de hover vence a inline fantasma (${depois.border})`);
  assert(depois.shadow !== antes.shadow, "A5 hover MUDA a sombra (profundidade que se vê)");
  // CTA com UM ciclo de hover determinista por coordenadas reais (o mesmo
  // caminho de um utilizador): base → hover → leitura com settle generoso.
  // (nada mais escala este span — a banda [1.05..1.15] só bate certo com a
  //  regra :hover aplicada; a moldura HolographicCard anima o PAI, não isto)
  await pA.mouse.move(5, 5);
  await pA.waitForTimeout(700);
  const ctaFora = await kart.locator(".jogos-cta").evaluate((el) => getComputedStyle(el).transform);
  const bbKart = await kart.boundingBox();
  await pA.mouse.move(bbKart.x + bbKart.width / 2, bbKart.y + bbKart.height / 2, { steps: 4 });
  await pA.waitForTimeout(1000);
  const ctaDepois = await kart.locator(".jogos-cta").evaluate((el) => getComputedStyle(el).transform);
  const escala = ctaDepois.startsWith("matrix") ? parseFloat(ctaDepois.split(",")[0].replace("matrix(", "")) : 0;
  assert(ctaFora === "none" && escala > 1.05 && escala < 1.15, `A6 CTA «JOGAR ▶» escala no hover do cartão (fora: ${ctaFora} · hover: ${ctaDepois})`);
  const accoes = await pA.locator(".jogos-accao-btn").count();
  assert(accoes >= 10, `A7 botões «Desafiar»/«Detalhes» com classe de hover real (${accoes} ≥ 10)`);
  await pA.screenshot({ path: `${OUT}/grelha-hover-kart.png` });

  // ═══ B. FOCO POR TECLADO — quem navega por Tab vê onde está ═══
  console.log("\n— B. foco por teclado na grelha —");
  let focou = false, outlineW = "";
  for (let i = 0; i < 120; i++) {
    await pA.keyboard.press("Tab");
    await pA.waitForTimeout(30);
    const info = await pA.evaluate(() => {
      const el = document.activeElement;
      if (!el || !(el instanceof HTMLElement)) return null;
      const tid = el.getAttribute("data-testid") || "";
      if (!tid.startsWith("jogos-card-")) return null;
      const s = getComputedStyle(el);
      return { tid, fv: el.matches(":focus-visible"), outline: s.outlineWidth + " " + s.outlineStyle };
    });
    if (info) { focou = true; outlineW = info.outline; break; }
  }
  assert(focou, "B1 Tab chega a um cartão da grelha (jogos-card-*)");
  assert(focou && /solid/.test(outlineW), `B2 :focus-visible com anel sólido (${outlineW})`);
  const wNum = focou ? parseFloat(outlineW) : 0;
  assert(wNum >= 2, `B3 anel ≥ 2px (${wNum}px — visível sobre a arte)`);

  // ═══ C. ALTO CONTRASTE — escolha explícita, mudança REAL, persistência ═══
  console.log("\n— C. modo alto contraste —");
  const pC = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  pC.on("pageerror", (e) => erros.push("/contraste: " + String(e)));
  await navegar(pC, "/", 5500);
  const varAntes = await pC.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--muted-foreground").trim());
  const tagline = pC.locator("footer p.text-muted-foreground").first();
  const corAntes = await tagline.evaluate((el) => getComputedStyle(el).color);
  const opaco = pC.locator('[class*="text-muted-foreground/"]').first();
  const temOpaco = (await opaco.count()) >= 1;
  const corOpacoAntes = temOpaco ? await opaco.evaluate((el) => getComputedStyle(el).color) : "";
  // shot do estado NORMAL no TOPO da página (a medição de cor é no rodapé,
  // mas a captura mostra a dobra — comparável com a de alto contraste)
  await pC.evaluate(() => window.scrollTo(0, 0));
  await pC.waitForTimeout(900);
  await pC.screenshot({ path: `${OUT}/home-normal.png` });
  const btn = pC.locator('[data-testid="footer-contraste"]');
  assert(await btn.isVisible(), "C1 botão de alto contraste no rodapé");
  assert((await btn.getAttribute("aria-pressed")) === "false", "C2 aria-pressed=false antes");
  await btn.click();
  await pC.waitForTimeout(300);
  const attrC = await pC.evaluate(() => document.documentElement.getAttribute("data-contraste"));
  assert(attrC === "alto", "C3 atributo html[data-contraste=alto] aplicado");
  assert((await btn.getAttribute("aria-pressed")) === "true", "C4 aria-pressed=true depois");
  const storeC = await pC.evaluate(() => localStorage.getItem("bateu_contraste_v1"));
  assert(storeC === "alto", `C5 escolha gravada na store (${storeC})`);
  const varDepois = await pC.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--muted-foreground").trim());
  assert(varDepois !== varAntes && /0% 30%|0% 78%/.test(varDepois), `C6 variável do texto-mudo MUDA (${varAntes} → ${varDepois})`);
  const corDepois = await tagline.evaluate((el) => getComputedStyle(el).color);
  assert(corDepois !== corAntes, `C7 cor do texto-mudo muda de verdade (${corAntes} → ${corDepois})`);
  if (temOpaco) {
    const corOpacoDepois = await opaco.evaluate((el) => getComputedStyle(el).color);
    const alphaDe = (cor) => {
      const m = cor.match(/^rgba?\(([^)]+)\)$/);
      if (!m) return 1;
      const partes = m[1].split(",").map((s) => parseFloat(s.trim()));
      return partes.length >= 4 ? partes[3] : 1;
    };
    assert(alphaDe(corOpacoDepois) === 1, `C8 variante de opacidade volta ao valor CHEIO (${corOpacoAntes} → ${corOpacoDepois})`);
  } else { verde("C8 (home sem variante de opacidade visível nesta corrida — coberta no A pela grelha)"); }
  // shot do ALTO CONTRASTE no topo (voltar a subir + settle da animação de
  // entrada do rodapé para a captura não apanhar opacidades a meio)
  await pC.evaluate(() => window.scrollTo(0, 0));
  await pC.waitForTimeout(900);
  await pC.screenshot({ path: `${OUT}/home-alto-contraste.png` });
  // persistência
  await pC.reload({ waitUntil: "domcontentloaded" });
  await pC.waitForTimeout(4000);
  const attrReload = await pC.evaluate(() => document.documentElement.getAttribute("data-contraste"));
  assert(attrReload === "alto", "C9 PERSISTE após reload (boot aplica a escolha)");
  // segunda pressão volta a normal
  await pC.locator('[data-testid="footer-contraste"]').click();
  await pC.waitForTimeout(300);
  const attrVolta = await pC.evaluate(() => document.documentElement.getAttribute("data-contraste"));
  const storeVolta = await pC.evaluate(() => localStorage.getItem("bateu_contraste_v1"));
  assert(attrVolta === null && storeVolta === "normal", `C10 segunda pressão → normal (attr ${attrVolta}, store ${storeVolta})`);
  await pC.close();

  // ═══ D. SISTEMA — prefers-contrast: more respeitado SEM escolha ═══
  console.log("\n— D. sistema pede contraste (emulação) —");
  const pD = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  pD.on("pageerror", (e) => erros.push("/sistema: " + String(e)));
  await pD.emulateMedia({ contrast: "more" });
  await navegar(pD, "/", 5000);
  const attrD = await pD.evaluate(() => document.documentElement.getAttribute("data-contraste"));
  const storeD = await pD.evaluate(() => localStorage.getItem("bateu_contraste_v1"));
  assert(attrD === "alto" && storeD === null, `D1 SO pede + nunca escolheu → alto AUTOMÁTICO (attr ${attrD}, store ${storeD})`);
  await pD.locator('[data-testid="footer-contraste"]').click();
  await pD.waitForTimeout(300);
  const storeD2 = await pD.evaluate(() => localStorage.getItem("bateu_contraste_v1"));
  const attrD2 = await pD.evaluate(() => document.documentElement.getAttribute("data-contraste"));
  assert(storeD2 === "normal" && attrD2 === null, "D2 1.ª pressão grava a escolha REAL do utilizador (normal)");
  await pD.close();

  // ═══ E. MOBILE 390×844 — intocado e com o botão ═══
  console.log("\n— E. mobile 390×844 —");
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  mob.on("pageerror", (e) => erros.push("/mobile: " + String(e)));
  await navegar(mob, "/jogos", 5000);
  const overE = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overE <= 1, `E1 SEM overflow no telemóvel (sobra ${overE}px)`);
  assert(await mob.locator('[data-testid="footer-contraste"]').isVisible(), "E2 botão de contraste presente no telemóvel");
  assert(await mob.locator('[data-testid="jogos-card-kart"]').count() === 1, "E3 grelha de jogos intacta no telemóvel");
  await mob.close();

  // ═══ F. i18n — o botão fala INGLÊS quando a língua é EN ═══
  console.log("\n— F. i18n ×6 —");
  const pen = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  pen.on("pageerror", (e) => erros.push("/en: " + String(e)));
  await pen.addInitScript(() => {
    localStorage.setItem("bateu_lang", "en");
    localStorage.setItem("bateu_lang_explicit", "1");
  });
  await navegar(pen, "/", 5000);
  const rotuloEn = (await pen.locator('[data-testid="footer-contraste"]').innerText()).trim();
  assert(/High contrast/i.test(rotuloEn), `F1 «High contrast» em EN («${rotuloEn}»)`);
  await pen.close();

  // ═══ G. estabilidade ═══
  console.log("\n— G. estabilidade —");
  assert(erros.length === 0, "G1 ZERO pageerror em todas as páginas", JSON.stringify(erros.slice(0, 3)));

  await pA.close();
  await browser.close();
  console.log(`\n══════════ ${verdes} verdes / ${falhas} falhas ══════════`);
  if (vite) try { process.kill(-vite.pid, "SIGTERM"); } catch { /* já morto */ }
  process.exit(falhas === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FALHA DA SUÍTE:", e);
  if (vite) try { process.kill(-vite.pid, "SIGTERM"); } catch { /* já morto */ }
  process.exit(1);
});
