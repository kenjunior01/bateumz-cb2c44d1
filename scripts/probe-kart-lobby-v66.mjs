// probe: por que o lobby do kart não aparece no browser?
import { spawn } from "node:child_process";

const RAIZ = "/home/z/my-project/bateumz-cb2c44d1";
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const filhos = [];
function correr(cmd, args, env = {}) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => console.log(`[${cmd}]`, String(d).trim().slice(0, 200)));
  p.stderr.on("data", (d) => console.log(`[${cmd}!]`, String(d).trim().slice(0, 300)));
  filhos.push(p);
  return p;
}
const matar = () => { for (const p of filhos) { try { process.kill(-p.pid, "SIGKILL"); } catch {} try { p.kill("SIGKILL"); } catch {} } };
process.on("exit", matar);

async function esperarWS(url, ms = 20000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    const okw = await new Promise((resolve) => {
      try {
        const w = new WebSocket(url);
        const to = setTimeout(() => { try { w.close(); } catch {} resolve(false); }, 1500);
        w.onopen = () => { clearTimeout(to); w.close(); resolve(true); };
        w.onerror = () => { clearTimeout(to); resolve(false); };
      } catch { resolve(false); }
    });
    if (okw) return true;
    await dormir(400);
  }
  return false;
}

const PORTA = 8799;
correr("npx", ["vite", "--port", "8099", "--strictPort"], {});
correr("node", ["server/kart-servidor.mjs"], { PORT: String(PORTA), KART_ESPERA_S: "14", KART_TEMPO_MAX_S: "300", KART_PISTA: "praia", KART_VOLTAS: "3" });

const fim = Date.now() + 60000;
while (Date.now() < fim) {
  try { const r = await fetch("http://localhost:8099/"); if (r.status < 500) break; } catch {}
  await dormir(300);
}
console.log("vite ok;", await esperarWS(`ws://localhost:${PORTA}`) ? "ws ok" : "ws FALHOU");

const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
const ctx = await browser.newContext({ viewport: { width: 960, height: 640 } });
const pg = await ctx.newPage();
pg.on("console", (m) => console.log(`[console:${m.type()}]`, m.text().slice(0, 220)));
pg.on("pageerror", (e) => console.log("[PAGEERROR]", String(e).slice(0, 300)));
pg.on("websocket", (ws) => {
  console.log("[ws] aberto:", ws.url());
  ws.on("close", () => console.log("[ws] fechado:", ws.url()));
});

await pg.goto("http://localhost:8099/lives?game=kart&kart-leve=1&mp=ws://localhost:8799", { waitUntil: "domcontentloaded", timeout: 90000 });
await pg.waitForSelector('[data-testid="kart-menu"]', { timeout: 60000 });
await dormir(1000);
console.log("painel visível:", await pg.locator('[data-testid="kart-online-painel"]').isVisible());
console.log("botão texto:", await pg.locator('[data-testid="kart-entrar-online"]').innerText());
await pg.locator('[data-testid="kart-entrar-online"]').click();
for (let i = 0; i < 6; i++) {
  await dormir(2000);
  const painel = await pg.locator('[data-testid="kart-online-painel"]').innerText().catch(() => "(sem painel)");
  const noMenu = await pg.locator('[data-testid="kart-menu"]').isVisible().catch(() => false);
  const noJogo = await pg.locator('[data-testid="kart-jogo"]').isVisible().catch(() => false);
  console.log(`t+${(i + 1) * 2}s menu=${noMenu} jogo=${noJogo} painel="${painel.replace(/\n/g, " | ").slice(0, 220)}"`);
}
await pg.screenshot({ path: "shots-v66/debug-probe.png" }).catch(() => {});
await browser.close();
matar();
process.exit(0);
