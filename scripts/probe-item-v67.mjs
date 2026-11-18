// Sonda: porquê o kart da secção B não apanha caixa? (replica o fluxo mínimo)
import { spawn } from "node:child_process";
import WebSocket from "ws";

const RAIZ = process.cwd();
const PORTA = 8797;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const core = await import(`${RAIZ}/src/game/kart/core.ts`);

const srv = spawn("node", ["server/kart-servidor.mjs"], {
  env: { ...process.env, PORT: String(PORTA), KART_PISTA: "deserto", KART_VOLTAS: "3", KART_ESPERA_S: "4", KART_TEMPO_MAX_S: "90" },
  stdio: ["ignore", "pipe", "pipe"],
});
srv.stdout.on("data", (d) => console.log("[srv]", String(d).trim().slice(0, 140)));
srv.stderr.on("data", (d) => console.log("[srv!]", String(d).trim().slice(0, 200)));
await dormir(800);

const ws = new WebSocket(`ws://localhost:${PORTA}`);
let minhaId = 6;
const snaps = [];
ws.on("message", (d) => {
  const m = JSON.parse(String(d));
  if (m.t === "inicio") minhaId = m.meuId ?? 6;
  if (m.t === "snap") snaps.push(m);
});
await new Promise((r) => ws.on("open", r));
ws.send(JSON.stringify({ t: "ola", nome: "Sonda", kart: "viralata", melhorias: {} }));
await dormir(6000); // lobby + contagem

const pista = core.construirPista(core.pistaPorId("deserto"));
const m = pista.amostras.length;
let ultimoEnvio = 0;
for (let passo = 0; passo < 300; passo++) {
  const s = snaps.at(-1);
  if (s && s.fase === "corrida") {
    const c = s.j.find((x) => x.id === minhaId);
    if (c) {
      const ia = c.ia ?? 0;
      const look = 12 + Math.floor((c.vel ?? 0) * 0.35);
      const alvo = pista.amostras[(ia + look) % m];
      const dif = Math.atan2(alvo.x - c.x, alvo.z - c.z) - (c.ang ?? 0);
      const difN = Math.atan2(Math.sin(dif), Math.cos(dif));
      const ent = { acelerar: true, travar: false, virar: Math.max(-1, Math.min(1, difN * 2.5)), derrapar: false, usarItem: false };
      const agora = Date.now();
      if (agora - ultimoEnvio >= 40) {
        ws.send(JSON.stringify({ t: "ent", a: ent.acelerar ? 1 : 0, t2: 0, v: ent.virar, d: ent.derrapar ? 1 : 0 }));
        ultimoEnvio = agora;
      }
      if (passo % 30 === 0) console.log(`passo ${passo}: fase=${s.fase} x=${Math.round(c.x)} z=${Math.round(c.z)} vel=${(c.vel ?? 0).toFixed(1)} ia=${ia} po=${c.po} it=${c.it ?? "-"}`);
    }
  } else if (s) {
    if (passo % 30 === 0) console.log(`passo ${passo}: fase=${s.fase} (sem conduzir)`);
  }
  await dormir(40);
}
ws.close();
srv.kill("SIGKILL");
process.exit(0);
