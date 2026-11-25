// probe-ciclo-v89 — repro do CICLO do test-retencacao-v78 com dump de estado
import { spawn } from "node:child_process";
const BASE = "http://localhost:8099";
let vite = null;
async function levantarVite() {
  try { const r = await fetch(BASE, { signal: AbortSignal.timeout(1500) }); if (r.ok) return; } catch {}
  vite = spawn("npx", ["vite", "--port", "8099", "--strictPort"], { cwd: process.cwd(), stdio: "ignore", detached: true });
  for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 500)); try { const r = await fetch(BASE, { signal: AbortSignal.timeout(1200) }); if (r.ok) return; } catch {} }
  throw new Error("vite não subiu");
}
(async () => {
  await levantarVite();
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const pg = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const erros = [];
  pg.on("pageerror", (e) => erros.push(String(e)));
  await pg.goto(BASE + "/lives", { waitUntil: "domcontentloaded" });
  await pg.waitForTimeout(6000);

  const dump = async (tag) => {
    const st = await pg.evaluate(() => localStorage.getItem("bateu_progressao_v78"));
    console.log(`--- ${tag} ---`);
    const e = JSON.parse(st || "{}");
    console.log("pontos:", e.pontos, "| jogosHoje:", JSON.stringify(e.jogosHoje));
    for (const m of e.missoes || []) console.log("  missão:", m.modelo, m.progresso + "/" + m.alvo, "reclamada:", m.reclamada, "id:", m.id?.slice(0, 20));
    const card = await pg.locator('[data-testid="progressao-missao-joga-kart"]').innerText().catch(() => "(AUSENTE)");
    console.log("  cartão joga-kart:", JSON.stringify(card.replace(/\n/g, " | ")));
  };

  await dump("ANTES da partida");
  await pg.evaluate(() => window.dispatchEvent(new CustomEvent("bateu:partida", { detail: { jogoId: "kart", vitoria: true, pontos: 120 } })));
  await pg.waitForTimeout(800);
  await dump("DEPOIS da partida");
  // segunda partida (como o teste original faz? verificar)
  await pg.evaluate(() => window.dispatchEvent(new CustomEvent("bateu:partida", { detail: { jogoId: "kart", vitoria: true, pontos: 120 } })));
  await pg.waitForTimeout(800);
  await dump("DEPOIS da 2.ª partida");
  console.log("pageerrors:", erros.length, erros.slice(0, 2));
  await browser.close();
  if (vite) try { process.kill(-vite.pid, "SIGTERM"); } catch {}
  process.exit(0);
})().catch((e) => { console.error(e); if (vite) try { process.kill(-vite.pid, "SIGTERM"); } catch {} process.exit(1); });
