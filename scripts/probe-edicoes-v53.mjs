// ============================================================
// PROBE v53 — PARTILHA VISUAL DAS EDIÇÕES (o mundo editável partilhado)
// Padrão das probes (v47/v50/v51/v52): Node puro, sem browser, contra o
// SERVIDOR REAL (child process na porta efémera) + a regra partilhada
// validaEdit (constants.ts) provada directamente.
//
// O que fecha o N5 (o passo anotado na v52 — «a partilha visual é o
// passo seguinte»): a v52 aplicava as edições à VERDADE da colisão mas
// não as DIFUNDIA — o que o jogador A partiu, o B não VIA. Aqui prova-se:
//   · a difusão 10 Hz (B recebe a edição de A; A não recebe a própria —
//     zero eco, o autor já tem a edição no seu mundo);
//   · a gestão de interesse NAS EDIÇÕES (edit fora do RAIO_INTERESSE não
//     chega ao receptor distante);
//   · o LOTE de sincronização no bemvindo (quem chega recebe o mundo
//     editado — as edições dentro do raio do spawn, nada além dele);
//   · o LOTE no CRUZAMENTO de região (quem entra numa célula nova recebe
//     as edições antigas à sua volta — o buraco fora do raio do spawn);
//   · edições malformadas são strikes → kique (a regra v52 intacta);
//   · os contadores REAIS nos stats (editsDifundidos / editsSincronizados).
// Uso: node scripts/probe-edicoes-v53.mjs
// ============================================================
import WebSocket from "ws";
import { spawn } from "node:child_process";
import { validaEdit } from "../src/game/blocos/constants.ts";
import { livreCampo, yEmCampo } from "../test-rotas-cidade.mjs";
import { SEED_CIDADE } from "../src/game/cidade/core.ts";

let passed = 0, failed = 0;
const fails = [];
const ok = (name, cond, extra = "") => {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; fails.push(name); console.log(`  ❌ ${name} ${extra}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── cliente ws de prova (colhe tudo, espera por predicados) ──
class Cliente {
  constructor(url, nome) {
    this.nome = nome;
    this.msgs = [];
    this.fechado = false;
    this.ws = new WebSocket(url);
    this.ws.on("message", (raw) => this.msgs.push(JSON.parse(String(raw))));
    this.ws.on("close", () => { this.fechado = true; });
    this.aberto = new Promise((resolve) => this.ws.on("open", () => {
      this.ws.send(JSON.stringify({ t: "ola", nome }));
      resolve();
    }));
  }
  send(obj) { try { this.ws.send(JSON.stringify(obj)); } catch { /* fechado */ } }
  async esperar(predicado, timeoutMs = 3000) {
    const fim = Date.now() + timeoutMs;
    let i = 0;
    while (Date.now() < fim) {
      for (; i < this.msgs.length; i++) if (predicado(this.msgs[i])) return this.msgs[i];
      await sleep(25);
    }
    return null;
  }
  fechar() { try { this.ws.close(); } catch { /* ignore */ } }
}
const edicoesCom = (m, x, y, z, id) => m?.t === "edicoes" && Array.isArray(m.lista)
  && m.lista.some((e) => e.x === x && e.y === y && e.z === z && e.id === id);

async function main() {
  console.log(`\n📡 PROBE EDIÇÕES v53 — partilha visual (semente ${SEED_CIDADE})\n`);

  // ═══ A. A REGRA PARTILHADA (uma só fonte — constants.ts) ═══
  console.log("— A. validaEdit: a MESMA regra nas três pontas");
  ok("aceita quebra (id 0)", validaEdit(0, 35, 3, 0) === true);
  ok("aceita colocação de bloco real", validaEdit(5, 35, 3, 9) === true);
  ok("recusa y negativo", validaEdit(0, -1, 0, 0) === false);
  ok("recusa y >= ALTURA", validaEdit(0, 80, 0, 0) === false);
  ok("recusa id desconhecido", validaEdit(0, 35, 0, 999) === false);
  ok("recusa id negativo", validaEdit(0, 35, 0, -5) === false);
  ok("recusa não-inteiro", validaEdit(1.5, 35, 0, 0) === false);
  ok("recusa |x| >= EDIT_ALCANCE", validaEdit(100_000, 35, 0, 0) === false);

  // ═══ B. O SERVIDOR REAL (child process) ═══
  const PORT = 8793 + (process.pid % 100);
  const raiz = new URL("..", import.meta.url).pathname;
  const srv = spawn(process.execPath, ["server/cidade-servidor.mjs"], {
    cwd: raiz, env: { ...process.env, PORT: String(PORT) }, stdio: ["ignore", "pipe", "pipe"],
  });
  let saida = "";
  srv.stdout.on("data", (d) => { saida += String(d); });
  srv.stderr.on("data", (d) => { saida += String(d); });
  const noAr = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("servidor não arrancou: " + saida.slice(-400))), 15000);
    srv.stdout.on("data", (d) => { if (String(d).includes("no ar")) { clearTimeout(t); resolve(); } });
  });
  await noAr;
  const URL_MP = `ws://localhost:${PORT}`;

  try {
    console.log("— B. difusão 10 Hz: B VÊ o que A partiu (e o autor não recebe eco)");
    const A = new Cliente(URL_MP, "Ana-MZ");
    const B = new Cliente(URL_MP, "Bruno-AO");
    await Promise.all([A.aberto, B.aberto]);
    await A.esperar((m) => m.t === "bemvindo");
    await B.esperar((m) => m.t === "bemvindo");
    ok("A e B ligados (bemvindo de ambos)", true);

    A.send({ t: "edit", x: 5, y: 35, z: 3, id: 0 }); // A parte um voxel
    const emB = await B.esperar((m) => edicoesCom(m, 5, 35, 3, 0));
    ok("B recebeu a DIFUSÃO da edição de A", !!emB, JSON.stringify(emB));
    await sleep(400); // > 2 ticks de difusão — o eco (se existisse) já teria chegado
    ok("o AUTOR não recebe a própria edição (zero eco)", !A.msgs.some((m) => edicoesCom(m, 5, 35, 3, 0)));
    ok("a difusão é a msg `edicoes` nomeada (padrão das msgs do Veloren)", !!emB && emB.t === "edicoes" && Array.isArray(emB.lista));

    B.send({ t: "edit", x: 7, y: 36, z: 4, id: 9 }); // B coloca um bloco
    const emA = await A.esperar((m) => edicoesCom(m, 7, 36, 4, 9));
    ok("A recebeu a colocação do B", !!emA);
    await sleep(300);
    ok("B também não recebe eco da sua", !B.msgs.some((m) => edicoesCom(m, 7, 36, 4, 9)));

    console.log("— C. gestão de interesse NAS EDIÇÕES (fora do raio não chega)");
    const nEdicoesB = B.msgs.filter((m) => m.t === "edicoes").length;
    A.send({ t: "edit", x: 200, y: 40, z: 0, id: 9 }); // ~199 blocos do B
    await sleep(600); // > 5 ticks de difusão
    ok("a edit distante (x=200) NÃO chega ao B (raio 40)", B.msgs.filter((m) => m.t === "edicoes").length === nEdicoesB, `antes=${nEdicoesB} agora=${B.msgs.filter((m) => m.t === "edicoes").length}`);

    console.log("— D. edições malformadas são strikes → kique (regra v52 intacta)");
    const M = new Cliente(URL_MP, "Malfaiteur");
    await M.aberto;
    await M.esperar((m) => m.t === "bemvindo");
    for (let i = 0; i < 5; i++) M.send({ t: "edit", x: 1, y: -1, z: 1, id: 0 }); // y inválido ×5
    await sleep(400);
    ok("5 edições malformadas → kique (ws fechado)", M.fechado === true);

    console.log("— E. quem CHEGA recebe o mundo editado (lote no bemvindo)");
    const C = new Cliente(URL_MP, "Chegante-C");
    await C.aberto;
    const loteC = await C.esperar((m) => m.t === "edicoes" && m.sinc === true);
    ok("C recebe um LOTE de sincronização (sinc) após o bemvindo", !!loteC, JSON.stringify(loteC));
    ok("o lote traz o voxel que A partiu (5,35,3)", edicoesCom(loteC, 5, 35, 3, 0));
    ok("o lote traz o bloco que B colocou (7,36,4)", edicoesCom(loteC, 7, 36, 4, 9));
    ok("o lote NÃO traz a edit fora do raio (200,40,0)", !edicoesCom(loteC, 200, 40, 0, 9));
    ok("o lote NÃO traz a edit oeste fora do raio do spawn", !edicoesCom(loteC, -40, 36, 6, 9));
    C.fechar();

    console.log("— F. o CRUZAMENTO de região traz as edições antigas do novo sítio");
    // A edita LONGE do spawn (41,5 blocos — fora do raio do spawn E fora do
    // raio do B) mas DENTRO do raio da posição a oeste onde D vai chegar.
    // z escolhido pelo CAMPO REAL (livreCampo — a caixa do corpo cabe no passo).
    let zw = null;
    for (let z = 2.5; z <= 12.5; z += 1) {
      if (livreCampo(0.5, z, -0.5, z)) { zw = z; break; }
    }
    ok("passo oeste legal no campo real (célula 0,0 → −1,0)", zw !== null, "zw=" + zw);
    if (zw !== null) {
      const yW = Math.round(yEmCampo(-0.5, zw) * 100) / 100;
      const yZ = Math.round(zw); // o y da edit é inteiro — o z fica na mesma célula de D
      A.send({ t: "edit", x: -40, y: 36, z: yZ, id: 9 }); // 40,5 blocos do spawn — fora do raio
      await sleep(300);
      ok("a edit oeste NÃO foi difundida a B (fora do raio do spawn)", !B.msgs.some((m) => edicoesCom(m, -40, 36, yZ, 9)));

      const D = new Cliente(URL_MP, "Andarilho-D");
      await D.aberto;
      await D.esperar((m) => m.t === "bemvindo");
      const loteD0 = D.msgs.find((m) => m.t === "edicoes" && m.sinc === true);
      ok("bemvindo do D NÃO traz a edit oeste (40,5 > raio 40)", !edicoesCom(loteD0, -40, 36, yZ, 9));
      D.send({ t: "pos", x: -0.5, z: zw, ry: 0, y: yW, voando: false }); // cruza para a célula −1,0
      const loteD = await D.esperar((m) => edicoesCom(m, -40, 36, yZ, 9), 3000);
      ok("D CRUZOU a célula e recebeu o LOTE com a edit antiga", !!loteD, JSON.stringify(loteD));
      ok("o lote do cruzamento vem marcado sinc=true", !!loteD && loteD.sinc === true);
      D.fechar();
    }

    console.log("— G. os contadores REAIS nos stats");
    const obs = new Cliente(URL_MP, "Observador");
    await obs.aberto;
    await obs.esperar((m) => m.t === "bemvindo");
    obs.send({ t: "stats", n: 1 });
    const stats = await obs.esperar((m) => m.t === "stats");
    ok("stats com editsDifundidos/editsSincronizados", !!stats && typeof stats.editsDifundidos === "number" && typeof stats.editsSincronizados === "number", JSON.stringify(stats));
    ok("difusões contadas (≥2: edit1→B + edit2→A)", (stats?.editsDifundidos ?? 0) >= 2, `dif=${stats?.editsDifundidos}`);
    ok("sincronizações contadas (≥3: lote do C ×2 + lote do cruzamento do D)", (stats?.editsSincronizados ?? 0) >= 3, `sinc=${stats?.editsSincronizados}`);
    ok("overlay cresceu com as edições aceites (≥4)", (stats?.overlay ?? 0) >= 4, `overlay=${stats?.overlay}`);
    ok("editsAceites ≥ 4", (stats?.editsAceites ?? 0) >= 4, `aceites=${stats?.editsAceites}`);
    obs.fechar();

    A.fechar(); B.fechar();
  } finally {
    srv.kill("SIGINT");
    await sleep(300);
    try { srv.kill("SIGKILL"); } catch { /* já morreu */ }
  }

  console.log(`\n📊 RESULTADO: ${passed} passaram · ${failed} falharam`);
  if (fails.length) console.log("Falhas: " + fails.join(" · "));
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error("FALHA FATAL:", e); process.exit(1); });
