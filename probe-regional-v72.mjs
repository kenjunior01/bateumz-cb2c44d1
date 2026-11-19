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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const pg = await ctx.newPage();
pg.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 300)));
pg.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 220)); });
pg.on("requestfailed", (r) => { if (r.url().includes("supabase")) console.log("REQFAIL:", r.url().slice(0, 120), r.failure()?.errorText); });

const TOKEN = {
  access_token: "falso.acesso.teste", refresh_token: "falso.refresh", token_type: "bearer",
  expires_in: 86400, expires_at: Date.now() + 86400_000,
  user: { id: "cofundador-mz-1", aud: "authenticated", role: "authenticated", email: "gestor.mz@bateu.local", app_metadata: { provider: "email" }, user_metadata: { display_name: "Gestor MZ" }, created_at: new Date().toISOString() },
};
await pg.route("**/rest/v1/**", async (route) => {
  const url = route.request().url();
  console.log("REST HIT:", url.slice(0, 130));
  const corpo = url.includes("user_roles") ? JSON.stringify([{ role: "regional_manager" }]) : "[]";
  await route.fulfill({ status: 200, contentType: "application/json", body: corpo });
});
await pg.route("**/auth/v1/**", async (route) => {
  console.log("AUTH HIT:", route.request().url().slice(0, 100));
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(TOKEN) });
});
await pg.addInitScript((t) => {
  localStorage.setItem("sb-ngxrdpplyghlugoowjqj-auth-token", JSON.stringify(t));
  localStorage.setItem("bateu_country", "MZ");
}, TOKEN);

await pg.goto(`${BASE}/regional-panel`, { waitUntil: "domcontentloaded", timeout: 90000 });
await dormir(8000);
console.log("URL:", pg.url());
const corpo = await pg.evaluate(() => document.body.innerText.slice(0, 400));
console.log("CORPO:", JSON.stringify(corpo.slice(0, 350)));
const tab = await pg.locator('[data-testid="anuncios-tab"]').count();
console.log("TAB ANÚNCIOS:", tab);
await browser.close();
matarTodos();
setTimeout(() => process.exit(0), 200);
