// Smoke v36 — servidor de presença: A entra, B entra, A move, B recebe estado com A
import WebSocket from "ws";

const URL = process.env.MP_URL || "ws://localhost:8765";
const falhas = [];
const ok = (n, c) => { console.log((c ? "  ✅ " : "  ❌ ") + n); if (!c) falhas.push(n); };
const abrir = (nome) => new Promise((res, rej) => {
  const ws = new WebSocket(URL);
  const msgs = [];
  ws.on("open", () => ws.send(JSON.stringify({ t: "ola", nome })));
  ws.on("message", (r) => msgs.push(JSON.parse(String(r))));
  ws.on("error", rej);
  const pronto = setInterval(() => {
    const b = msgs.find((m) => m.t === "bemvindo");
    if (b) { clearInterval(pronto); res({ ws, msgs, id: b.id }); }
  }, 20);
  setTimeout(() => { clearInterval(pronto); rej(new Error("sem bemvindo em 3s")); }, 3000);
});
const espera = (ws, t, ms = 4000) => new Promise((res, rej) => {
  const i = setInterval(() => {
    const m = ws.msgs.filter((m) => m.t === t);
    if (m.length) { clearInterval(i); res(m); }
  }, 20);
  setTimeout(() => { clearInterval(i); rej(new Error("sem " + t)); }, ms);
});

const A = await abrir("Teste-A"); console.log("A id =", A.id);
const B = await abrir("Teste-B"); console.log("B id =", B.id);
ok("B vê A no bemvindo", B.msgs.some((m) => m.t === "bemvindo" && m.jogadores.some((j) => j.id === A.id)));
ok("A recebeu 'entrou' do B", A.msgs.some((m) => m.t === "entrou" && m.id === B.id));

// A move 10 blocos em passos (respeitando clamp de velocidade)
for (let i = 1; i <= 10; i++) {
  A.ws.send(JSON.stringify({ t: "pos", x: i * 1.0, z: 0, ry: 0 }));
  await new Promise((r) => setTimeout(r, 120));
}
const estados = await espera(B, "estado", 4000);
const aVisto = estados.at(-1).jogadores.find((j) => j.id === A.id);
ok("B recebe 'estado' com A a mover", !!aVisto && Math.abs(aVisto.x - 10) < 6);
console.log("   B vê A em x =", aVisto?.x);

// anti-teleport: A salta 100 blocos → servidor deve clampar
A.ws.send(JSON.stringify({ t: "pos", x: 110, z: 0, ry: 0 }));
await new Promise((r) => setTimeout(r, 400));
const e2 = B.msgs.filter((m) => m.t === "estado").at(-1).jogadores.find((j) => j.id === A.id);
ok("anti-teleport: x clamped (< 25)", !!e2 && e2.x < 25);
console.log("   x após salto =", e2?.x);

B.ws.close(); A.ws.close();
await new Promise((r) => setTimeout(r, 200));
console.log(falhas.length ? `\n❌ FALHOU: ${falhas.join(" · ")}` : "\n✅ SMOKE MP OK");
process.exit(falhas.length ? 1 : 0);
