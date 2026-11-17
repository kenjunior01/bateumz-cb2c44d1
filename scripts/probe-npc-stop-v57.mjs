// probe-npc-stop-v57.mjs — repro do clique no STOP durante o fluxo lento
// (o teste E2E apanhou "not stable"/"not enabled" no botão — isto despeja
// o estado REAL do DOM no momento do clique)
import http from "node:http";
import { spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = realpathSync(join(dirname(fileURLToPath(import.meta.url)), ".."));
const PORTA_MOCK = 59994, PORTA_PROXY = 8791;

let ultimoCorpoChat = null;
const mock = http.createServer((req, res) => {
  let cru = "";
  req.on("data", (b) => (cru += b));
  req.on("end", () => {
    let corpo = {};
    try { corpo = JSON.parse(cru); } catch {}
    ultimoCorpoChat = corpo;
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    const pedacos = [{ d: 15, ev: `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: "x" } }] })}\n\n` }];
    const ultimaUser = [...(corpo?.messages ?? [])].reverse().find((m) => m.role === "user");
    const lento = typeof ultimaUser?.content === "string" && ultimaUser.content.includes("LENTAMENTE");
    if (lento) for (let i = 0; i < 12; i++) pedacos.push({ d: 300, ev: `data: ${JSON.stringify({ choices: [{ delta: { content: `pedaço ${i} ` } }] })}\n\n` });
    pedacos.push({ d: 10, ev: `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 30, completion_tokens: 8, total_tokens: 38 } })}\n\n` });
    pedacos.push({ d: 5, ev: "data: [DONE]\n\n" });
    let i = 0;
    const passo = () => {
      if (i >= pedacos.length) { res.end(); return; }
      const p = pedacos[i++];
      if (!res.destroyed) setTimeout(() => { if (!res.destroyed) { res.write(p.ev); passo(); } }, p.d);
    };
    passo();
  });
});

const filhos = [];
const correr = (cmd, args, env) => {
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => console.log(`    [${cmd}]`, String(d).trim().slice(0, 120)));
  p.stderr.on("data", (d) => console.log(`    [${cmd}!]`, String(d).trim().slice(0, 120)));
  filhos.push(p);
  return p;
};

async function esperarAte(url, ms = 30000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    try { const r = await fetch(url); if (r.status === 200) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

const main = async () => {
  await new Promise((r) => mock.listen(PORTA_MOCK, r));
  const proxy = correr("node", ["server/ia-proxy.mjs"], { IA_PORTA: String(PORTA_PROXY), IA_UPSTREAM: `http://127.0.0.1:${PORTA_MOCK}`, IA_NEMOTRON_KEY: "k", IA_FICHAS_CAPACIDADE: "100" });
  filhos.push(proxy);
  const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], { VITE_IA_ENDPOINT: `http://127.0.0.1:${PORTA_PROXY}/api/ia/chat` });
  filhos.push(vite);
  console.log("a esperar vite…", await esperarAte("http://localhost:8099/cidade", 90000));

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  page.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 200)));
  await page.route(/geocoding-api\.open-meteo\.com/, (route) => route.fulfill({ json: { results: [{ name: "Maputo", country: "Moçambique", latitude: -25.97, longitude: 32.58 }] } }));
  await page.route(/^https:\/\/api\.open-meteo\.com\//, (route) => route.fulfill({ json: { current: { temperature_2m: 26.4, weather_code: 61, wind_speed_10m: 12 } } }));

  await page.goto("http://localhost:8099/cidade", { waitUntil: "domcontentloaded" });
  await page.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 20000 });
  await page.getByTestId("cd-entrar").click();
  await page.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 20000 });
  await sleep(1200);
  await page.evaluate(() => window.__cidade.npcAbrir());
  await page.getByTestId("cd-npc-painel").waitFor({ state: "visible", timeout: 5000 });
  console.log("painel aberto");

  await page.getByTestId("cd-npc-caixa").fill("Fala LENTAMENTE");
  await page.getByTestId("cd-npc-enviar").click();
  await page.waitForFunction(() => (document.querySelector("[data-testid=cd-npc-conteudo-fluxo]")?.textContent ?? "").length > 0, null, { timeout: 15000 });
  console.log("fluxo vivo — a sondar o botão PARAR ×8 (600ms de intervalo)");
  page.on("console", (m) => { if (m.type() === "error") console.log("  CONSOLE-ERRO:", m.text().slice(0, 160)); });
  for (let i = 0; i < 8; i++) {
    const s = await page.evaluate(() => {
      const b = document.querySelector("[data-testid=cd-npc-parar]");
      const erro = document.querySelector("[data-testid=cd-npc-erro]");
      const fluxo = document.querySelector("[data-testid=cd-npc-conteudo-fluxo]");
      const msgs = document.querySelectorAll("[data-testid^=cd-npc-conteudo-]").length;
      if (!b) return { existe: false, erro: erro?.textContent?.slice(0, 120) ?? null, fluxoLen: fluxo?.textContent?.length ?? -1, msgs, ultima: document.querySelector("[data-testid=cd-npc-mensagens]")?.textContent?.slice(-180) ?? "" };
      const r1 = b.getBoundingClientRect();
      return { existe: true, disabled: b.disabled, box: [Math.round(r1.x), Math.round(r1.y), Math.round(r1.width), Math.round(r1.height)], fluxoLen: fluxo?.textContent?.length ?? -1, msgs };
    });
    console.log(`[${i}]`, JSON.stringify(s));
    await sleep(600);
  }
  await browser.close();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
main().finally(() => {
  for (const p of filhos) { try { process.kill(-p.pid, "SIGKILL"); } catch {} try { p.kill("SIGKILL"); } catch {} }
  try { mock.close(); } catch {}
  process.exit(0);
});
