// Reproduz o fluxo convidado com telemetria detalhada
import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on("pageerror", (e) => logs.push("PAGEERROR: " + String(e).slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error") logs.push("CONSOLE: " + m.text().slice(0, 250)); });

await page.goto("http://localhost:8099/lives?game=mmorpg", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.locator('[data-testid="bateu-create"]').waitFor({ state: "visible", timeout: 35000 }).catch(() => {});
console.log("PASSO 1 — create visível:", await page.locator('[data-testid="bateu-create"]').isVisible().catch(() => false));

const inp = page.locator('input[placeholder="Nome do teu herói"]');
await inp.waitFor({ state: "visible", timeout: 30000 }).catch(() => {});
await inp.scrollIntoViewIfNeeded().catch(() => {});
await inp.fill("TesteHero");
console.log("URL antes do clique:", page.url());
const btn = page.locator('button:has-text("ENTRAR NO MUNDO")').first();
console.log("botões ENTRAR encontrados:", await page.locator('button:has-text("ENTRAR NO MUNDO")').count());
await btn.click({ timeout: 8000 }).catch((e) => console.log("ERRO CLIQUE:", String(e).slice(0, 200)));

await page.waitForTimeout(8000);
console.log("URL pós-clique (+8s):", page.url());
console.log("canvas count:", await page.locator('[data-testid="bateu-world"] canvas').count());
console.log("create ainda visível:", await page.locator('[data-testid="bateu-create"]').isVisible().catch(() => false));
console.log("guest chip:", await page.locator('[data-testid="bw-guest-chip"]').count());
await page.screenshot({ path: "shots/guest-flow-8s.png" });

await page.waitForTimeout(35000);
console.log("URL pós-clique (+43s):", page.url());
console.log("canvas count (+43s):", await page.locator('[data-testid="bateu-world"] canvas').count());
const errs = [...new Set(logs)].slice(0, 15);
console.log("ERROS:", errs.length ? errs.join("\n") : "(nenhum)");
await page.screenshot({ path: "shots/guest-flow-43s.png" });
await browser.close();
