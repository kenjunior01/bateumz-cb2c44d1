// ============================================================
// CARGA — CIDADE BATEU v47: 50 bots no mundo partilhado
// (docs/REA-veloren-n3-v37.md §7.3: «50 bots de carga e métricas
// de CPU antes de abrir o mundo» — o E2E v37 valida 8+2 humanos).
//
// HONESTO: as métricas vêm dos contadores do PRÓPRIO servidor
// (msg `stats` → process.cpuUsage()/memoryUsage/uptime). Os bots
// ANDAM dentro das regras: saem do spawn e caminham 0,8 bloco por
// 100 ms (8 b/s < MAX_VEL 12) até alvos no plateau plano — o mesmo
// regime do jogador legal. Nada é simulado no lado do teste.
//
// Uso: node test-mp-carga.mjs (servidor v47 na 8765)
// ============================================================
import WebSocket from "ws";

const MP_URL = process.env.MP_URL || "ws://localhost:8765";
const N_BOTS = Number(process.env.BOTS || 50);
const DURACAO_S = Number(process.env.SEGUNDOS || 22);
const SPAWN = [0.5, 6.5];

let passed = 0, failed = 0;
const fails = [];
const ok = (name, cond, extra = "") => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name} ${extra}`); }
};

const bots = [];
let bemVindos = 0, desligadosAposBemvindo = 0, correcoesBots = 0;

function criarBot(i) {
  // alvo no plateau plano (r ≤ 17 do spawn → superfície 34, sem subidas)
  const alvo = [8 + (i % 6) * 2, -6 + Math.floor(i / 6) * 2];
  return new Promise((resolve) => {
    const ws = new WebSocket(MP_URL);
    let ligado = false;
    let x = SPAWN[0], z = SPAWN[1];
    let ang = (i / N_BOTS) * Math.PI * 2;
    ws.on("open", () => ws.send(JSON.stringify({ t: "ola", nome: `Carga-${i}` })));
    ws.on("message", (raw) => {
      const m = JSON.parse(String(raw));
      if (m.t === "bemvindo") {
        bemVindos++; ligado = true; resolve();
        ws.statsTimer = setInterval(() => {
          if (ws.readyState !== 1) return;
          const d = Math.hypot(alvo[0] - x, alvo[1] - z);
          let nx, nz;
          if (d > 0.8) { // fase 1: caminhar honestamente até ao alvo
            nx = Math.round((x + ((alvo[0] - x) / d) * 0.8) * 100) / 100;
            nz = Math.round((z + ((alvo[1] - z) / d) * 0.8) * 100) / 100;
          } else {        // fase 2: círculo pequeno (8 b/s)
            ang += 0.06;
            nx = Math.round((alvo[0] + Math.cos(ang) * 0.8) * 100) / 100;
            nz = Math.round((alvo[1] + Math.sin(ang) * 0.8) * 100) / 100;
          }
          x = nx; z = nz;
          ws.send(JSON.stringify({ t: "pos", x: nx, z: nz, ry: ang }));
        }, 100);
      } else if (m.t === "corrigido") {
        correcoesBots++;
      }
    });
    ws.on("close", () => { if (ligado) desligadosAposBemvindo++; });
    ws.on("error", () => { /* o close contabiliza */ });
    bots.push(ws);
    setTimeout(() => resolve(), 9000); // timeout honesto de ligação
  });
}

async function main() {
  console.log(`\n🚚 CARGA CIDADE v47 — ${N_BOTS} bots · ${DURACAO_S}s · servidor ${MP_URL}\n`);
  const t0 = Date.now();
  for (let g = 0; g < N_BOTS; g += 10) { // vagas de 10
    await Promise.all(Array.from({ length: Math.min(10, N_BOTS - g) }, (_, k) => criarBot(g + k)));
    await new Promise((r) => setTimeout(r, 120));
  }
  ok("todos os bots aceites (bemvindo)", bemVindos === N_BOTS, `bemvindos=${bemVindos}/${N_BOTS}`);

  // observador: pede STATS REAIS a cada 5 s (é a única fonte de métricas)
  const amostras = await new Promise((resolve) => {
    const s = [];
    const obs = new WebSocket(MP_URL);
    obs.on("open", () => obs.send(JSON.stringify({ t: "ola", nome: "Observador" })));
    obs.on("message", (raw) => {
      const m = JSON.parse(String(raw));
      if (m.t === "stats") s.push(m);
    });
    obs.on("open2", () => { /* nunca */ });
    let n = 0;
    const arranca = setTimeout(() => {
      const iv = setInterval(() => {
        n++;
        if (obs.readyState === 1) obs.send(JSON.stringify({ t: "stats", n }));
        if (n >= Math.ceil(DURACAO_S / 5)) { clearInterval(iv); setTimeout(() => { try { obs.close(); } catch { /* ignore */ } resolve(s); }, 800); }
      }, 5000);
    }, 3000);
    setTimeout(() => resolve(s), (DURACAO_S + 12) * 1000); // rede de segurança
    void arranca;
  });

  if (amostras.length >= 2) {
    const a = amostras[0], b = amostras[amostras.length - 1];
    const dCpu = (b.cpuUserMs + b.cpuSysMs) - (a.cpuUserMs + a.cpuSysMs);
    const dWall = Math.max(1, b.uptimeS - a.uptimeS);
    const cpuPct = (dCpu / 1000 / dWall) * 100;
    const dur = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n📊 métricas REAIS do servidor (duração do teste ${dur}s):`);
    console.log(`   jogadores: ${b.jogadores}/${b.cap} · tick ${b.tick} · uptime ${b.uptimeS}s`);
    console.log(`   CPU ${(dCpu / 1000).toFixed(2)}s em ${dWall}s de parede → ${cpuPct.toFixed(1)}%`);
    console.log(`   RSS ${b.rssMb} MB · correções ${b.correcoes} · entradas ${b.entradas}`);
    ok(`jogadores reais = ${N_BOTS} bots + observador`, b.jogadores >= N_BOTS + 1, `n=${b.jogadores}`);
    ok(`CPU < 80% (${cpuPct.toFixed(1)}% medido)`, cpuPct < 80, `${cpuPct.toFixed(1)}%`);
    ok("RSS < 600 MB", b.rssMb > 0 && b.rssMb < 600, `${b.rssMb} MB`);
    ok("servidor continuou a dar tick", b.tick > a.tick, `${a.tick}→${b.tick}`);
    ok("bots legais: ZERO correções do servidor", correcoesBots === 0, `corr=${correcoesBots}`);
    ok("nenhum bot desligado durante a carga", desligadosAposBemvindo === 0, `desligados=${desligadosAposBemvindo}`);
  } else {
    ok("amostras de stats suficientes", false, `n=${amostras.length}`);
  }

  for (const ws of bots) { clearInterval(ws.statsTimer); try { ws.close(); } catch { /* ignore */ } }
  console.log(`\n📊 RESULTADO: ${passed} passaram · ${failed} falharam`);
  if (fails.length) console.log("Falhas: " + fails.join(" · "));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("FALHA FATAL:", e); process.exit(1); });
