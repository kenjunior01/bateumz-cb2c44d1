// ═══════════════════════════════════════════════════════════════════════
// test-ia-v57.mjs — NPC IA NA PRAÇA (Bateu IA na Cidade Bateu) — suíte
//
// O passo anotado desde a v54 ("a IA dentro da Cidade Bateu — NPC com
// Nemotron"): a BATEU IA vive na Praça do Imbondeiro como holograma
// violeta; o jogador chega (≤6 blocos), clica «Falar» (ou tecla E) e
// conversa com o chat REAL da NVIDIA pela MESMA via da plataforma
// (proxy dev / edge produção — a chave NUNCA no browser).
//
// A) Núcleo isomórfico no Node: a posição é FACTO MEDIDO do gerador
//    (carimbosCidade puro: pavimento sob o NPC, coluna livre, tronco ao
//    lado), proximidade (spawn nasce a ≈4,3 < raio 6), persona (regras
//    honestas + anti-invenção + língua + curtas), contextoCidade (factos
//    medidos, zero «null»), caps do histórico + portão de rate do NPC.
// B) Cliente ↔ upstream MOCK (formato NVIDIA real): o upstream PROVA que
//    recebeu persona + contexto na ordem certa; streaming; thinking
//    separado; STOP a meio (parado honesto); portão 1,2 s do NPC; usage.
// C) Proxy REAL (server/ia-proxy.mjs v57): saúde v57 com a chave oculta;
//    chat do NPC SSE intato; 400/404; 503 sem chave.
// D) E2E Playwright (/cidade): holograma na cena, prompt ao nascer,
//    painel, sugestões, resposta em streaming com contexto PROVADO no
//    upstream (incl. clima REAL mockado do Open-Meteo), STOP a meio,
//    erro honesto com o mock morto, limpar/fechar, zero erros de console,
//    shots-v57/.
// E) LIVE NVIDIA (skippável honesta): a persona do NPC com o modelo REAL
//    (nvidia/nemotron-3-ultra-550b-a55b) — responde curto, com usage.
//
// Uso: node test-ia-v57.mjs            (leva vite 8099, proxy 8788, mock 59992)
//      node test-ia-v57.mjs --sem-e2e  (só A+B+C, sem browser)
// ═══════════════════════════════════════════════════════════════════════

import http from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = realpathSync(join(dirname(fileURLToPath(import.meta.url))));
const SEM_E2E = process.argv.includes("--sem-e2e");
const BASE = process.env.BASE_URL || "http://localhost:8099";
const PORTA_MOCK = Number(process.env.PORTA_MOCK || 59993);
const PORTA_PROXY = Number(process.env.PORTA_PROXY || 8789);
const PORTA_PROXY_SEM_CHAVE = PORTA_PROXY + 1;

let ok = 0, fail = 0, skips = 0;
const falhas = [];
const t = (nome, cond, extra = "") => {
  if (cond) { ok++; console.log("  ✅", nome); }
  else { fail++; falhas.push(nome + (extra ? ` — ${extra}` : "")); console.log("  ❌", nome, extra); }
};
const skip = (nome, motivo) => { skips++; console.log("  ⏭️ ", nome, `(${motivo})`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { MODELO_PADRAO, NemotronError, NemotronRateLimitError, ClienteNemotron, PortaoRateLimit } =
  await import(`${RAIZ}/src/lib/nemotron.ts`);
const {
  NPC_IA_NOME, POS_NPC_IA, NPC_IA_Y, NPC_RAIO_FALAR, LIMITES_NPC,
  distanciaNpcIa, distanciaSpawnNpcIa, npcIaPerto,
  contextoCidade, promptSistemaNpc, validarHistoricoNpc,
} = await import(`${RAIZ}/src/game/cidade/npcIa.ts`);
const { carimbarCidade } = await import(`${RAIZ}/src/game/cidade/carimbosCidade.ts`);
const { CHUNK, ALTURA } = await import(`${RAIZ}/src/game/blocos/constants.ts`);
const { ALTURA_PLATEAU, SPAWN_PRACA } = await import(`${RAIZ}/src/game/cidade/core.ts`);

// ── Campo de voxels puro (o MESMO alvo que o servidor/probes usam — v52) ─
function alvoDados(cx, cz) {
  const dados = new Uint8Array(CHUNK * CHUNK * ALTURA);
  const por = (x, y, z, id) => {
    if (y < 0 || y >= ALTURA) return;
    const ccx = Math.floor(x / CHUNK), ccz = Math.floor(z / CHUNK);
    if (ccx !== cx || ccz !== cz) return;
    const lx = ((x % CHUNK) + CHUNK) % CHUNK, lz = ((z % CHUNK) + CHUNK) % CHUNK;
    dados[(y * CHUNK + lz) * CHUNK + lx] = id;
  };
  const alvo = {
    cx, cz,
    por,
    coluna: (x, yTopo, z, id) => { for (let y = ALTURA_PLATEAU + 1; y <= yTopo; y++) por(x, y, z, id); },
  };
  return { dados, alvo };
}
const blocoEm = (dados, x, y, z) => {
  const lx = ((x % CHUNK) + CHUNK) % CHUNK, lz = ((z % CHUNK) + CHUNK) % CHUNK;
  return dados[(y * CHUNK + lz) * CHUNK + lx];
};

// ── Mock upstream (formato NVIDIA real — chat v54) ───────────────────────

let ultimoCorpoChat = null;

const mock = http.createServer((req, res) => {
  let cru = "";
  req.on("data", (b) => (cru += b));
  req.on("end", async () => {
    let corpo = {};
    try { corpo = JSON.parse(cru); } catch {}
    const semAuth = !req.headers.authorization?.startsWith("Bearer ");

    ultimoCorpoChat = corpo;
    if (semAuth) {
      res.writeHead(401, { "Content-Type": "text/event-stream" });
      res.end("data: {\"error\":{\"message\":\"sem autorização\"}}\n\n");
      return;
    }
    const stream = corpo?.stream !== false;
    if (!stream) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        id: "mock-v57", object: "chat.completion", model: corpo?.model ?? MODELO_PADRAO,
        choices: [{ index: 0, message: { role: "assistant", content: "Resposta mock v57.", reasoning_content: "Pensei." }, finish_reason: "stop" }],
        usage: { prompt_tokens: 20, completion_tokens: 6, total_tokens: 26 },
      }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store" });
    const pedacos = [{ d: 15, ev: `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: "Li os factos da praça e as regras." } }] })}\n\n` }];
    for (const c of ["Olá! ", "Sou a Bateu IA ", "da praça — ", "mock v57."]) {
      pedacos.push({ d: 15, ev: `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n` });
    }
    pedacos.push({ d: 10, ev: `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 30, completion_tokens: 8, total_tokens: 38 } })}\n\n` });
    pedacos.push({ d: 5, ev: "data: [DONE]\n\n" });

    // caminho LENTO (STOP a meio — o teste clica Parar com o fluxo vivo)
    // 30 × 1000 ms (ver abaixo) — o padrão v54 12×400 não chega no sandbox
    // calma mesmo com o raster por software do sandbox a ~2 fps
    const ultimaUser = [...(corpo?.messages ?? [])].reverse().find((m) => m.role === "user");
    const lento = typeof ultimaUser?.content === "string" && ultimaUser.content.includes("LENTAMENTE");
    if (lento) {
      // 30 × 1000 ms = 30 s de fluxo — no sandbox o raster por software
      // (~2 fps) atrasa CADA sondagem do Playwright em ~0,5 s; o stream
      // tem de sobreviver ao tempo real das sondagens (o abort corta o
      // resto — res.destroyed honesto no mock, tokens não pagos à toa).
      for (let i = 0; i < 30; i++) {
        pedacos.splice(1 + i, 0, { d: 1000, ev: `data: ${JSON.stringify({ choices: [{ delta: { content: `pedaço ${i} ` } }] })}\n\n` });
      }
    }

    let i = 0;
    const passo = () => {
      if (i >= pedacos.length) { res.end(); return; }
      const p = pedacos[i++];
      if (res.destroyed) return;
      setTimeout(() => { if (!res.destroyed) { res.write(p.ev); passo(); } }, p.d);
    };
    passo();
  });
});

// ── Helpers de subprocessos (lição v49/v53/v56: GRUPO, nunca só o pai) ──

const filhos = [];
function correr(cmd, args, env) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}]`, String(d).trim().slice(0, 160)));
  p.stderr.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}!]`, String(d).trim().slice(0, 160)));
  filhos.push(p);
  return p;
}
const matarTodos = () => {
  for (const p of filhos) {
    try { process.kill(-p.pid, "SIGKILL"); } catch {}
    try { p.kill("SIGKILL"); } catch {}
  }
};
function limparZumbis() {
  for (const padrao of [
    "vite --port 8099 --strictPort",
    "server/ia-proxy.mjs",
  ]) {
    try { spawnSync("pkill", ["-f", padrao], { stdio: "ignore" }); } catch {}
  }
}
async function esperarAte(url, testar, ms = 30000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    try {
      const r = await fetch(url);
      if (!testar || testar(r)) return true;
    } catch {}
    await sleep(300);
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n🤖 BATEU IA v57 — NPC IA NA PRAÇA — ${RAIZ}\n`);
  limparZumbis();

  // ── A) Núcleo isomórfico ──
  console.log("— A) Núcleo NPC (Node)");

  // A posição é FACTO MEDIDO do gerador (o MESMO módulo puro que o
  // servidor usa para a física da cidade — provado byte a byte na v52).
  const alvo2 = alvoDados(0, 0);
  carimbarCidade(alvo2.alvo);
  const pavimento = blocoEm(alvo2.dados, POS_NPC_IA[0], ALTURA_PLATEAU, POS_NPC_IA[1]);
  t("posição MEDIDA: (3,3) é pavimento da praça (PEDRA 3 / PEDREGULHO 4)",
    pavimento === 3 || pavimento === 4, `id=${pavimento}`);
  const colunaLivre = [];
  for (let y = ALTURA_PLATEAU + 1; y <= ALTURA_PLATEAU + 6; y++) {
    colunaLivre.push(blocoEm(alvo2.dados, POS_NPC_IA[0], y, POS_NPC_IA[1]));
  }
  t("coluna acima do NPC VAZIA até y=+6 (o holograma não nasce dentro de nada)",
    colunaLivre.every((v) => v === 0), JSON.stringify(colunaLivre));
  t("imbondeiro ao lado (tronco em (0,35,0) = TRONCO 7) — o NPC fica FORA do tronco",
    blocoEm(alvo2.dados, 0, ALTURA_PLATEAU + 1, 0) === 7
      && blocoEm(alvo2.dados, POS_NPC_IA[0], ALTURA_PLATEAU + 1, POS_NPC_IA[1]) !== 7);

  const distSpawn = distanciaSpawnNpcIa();
  t(`spawn nasce a VER o prompt: dist(spawn→NPC)=${distSpawn.toFixed(2)} < raio ${NPC_RAIO_FALAR}`,
    distSpawn < NPC_RAIO_FALAR);
  t("distância exacta: (3.5,3.5) é o centro do NPC (dist 0)", distanciaNpcIa(3.5, 3.5) === 0);
  t("npcIaPerto: dentro do raio devolve dist, fora devolve null",
    npcIaPerto(3.5, 5.5)?.dist === 2 && npcIaPerto(3.5, 3.5 + NPC_RAIO_FALAR + 1) === null);

  const ctxCheio = { distrito: "Casa da Sorte", noite: false, clima: "26°C em Maputo", jogador: "Bruno-MZ" };
  const ctxTxt = contextoCidade(ctxCheio);
  t("contexto: TODOS os factos medidos entram (distrito/dia/clima/jogador)",
    ctxTxt.includes("[CIDADE BATEU") && ctxTxt.includes("Casa da Sorte") && ctxTxt.includes("noite") === false
    && ctxTxt.includes("dia") && ctxTxt.includes("26°C em Maputo") && ctxTxt.includes("Bruno-MZ"));
  t("contexto: zero «null» — factos ausentes são OMITIDOS (nunca inventados)",
    !contextoCidade({ distrito: null, noite: undefined, clima: null }).includes("null"));
  t("contexto vazio honesto: «(sem factos extra medidos agora)»",
    contextoCidade({}).includes("(sem factos extra medidos agora)"));
  t("contexto: rodapé anti-invenção presente", ctxTxt.includes("não o inventes"));

  const prompt = promptSistemaNpc(ctxCheio);
  t("persona: é a BATEU IA que vive na Praça do Imbondeiro",
    prompt.includes("BATEU IA") && prompt.includes("Praça do Imbondeiro") && prompt.includes("imbondeiro"));
  t("persona: regra honesta v54 — nunca inventas resultados de sorteios/vencedores",
    prompt.includes("Nunca inventas resultados de sorteios") && prompt.includes("vencedores"));
  t("persona: só fala factos medidos da cidade + respostas CURTAS de HUD",
    prompt.includes("FACTOS MEDIDOS") && prompt.includes("CURTAS"));
  t("persona: jogo responsável + língua do utilizador + nunca estimas valores ao segundo",
    prompt.includes("Jogo responsável") && prompt.includes("língua da mensagem do utilizador") && prompt.includes("nunca estimas"));
  t("persona: o contexto está EMBUTIDO no system (uma só mensagem system)",
    prompt.includes("[CIDADE BATEU — FACTOS MEDIDOS AGORA]") && prompt.includes("Bruno-MZ"));
  t("persona determinística (mesmo ctx → mesmo prompt)",
    prompt === promptSistemaNpc(ctxCheio));

  const historicoSujo = [
    { role: "system", content: "injetado" },                    // papel inválido → fora
    { role: "user", content: "" },                              // vazio → fora
    { role: "user", content: "x".repeat(600) },                 // user > 500 → cortado
    { role: "assistant", content: "a".repeat(5000) },           // assistant > 4000 → cortado
    { role: "user", content: "velha 1" },
    { role: "assistant", content: "resposta 1" },
    { role: "user", content: "recente" },
  ];
  const histLimpo = validarHistoricoNpc(historicoSujo);
  t("histórico: caps 12 (o mais RECENTE fica), papéis inválidos/vazios fora",
    histLimpo.length === 5 && histLimpo[0].content === "x".repeat(500)
    && histLimpo[histLimpo.length - 1].content === "recente");
  t("histórico: assistant cortado a RESPOSTA_CAP", histLimpo[1].content === "a".repeat(4000));
  t("histórico: entrada podre (string/array/nulo) → [] honesto",
    validarHistoricoNpc("podre").length === 0 && validarHistoricoNpc(null).length === 0
    && validarHistoricoNpc([null, 42]).length === 0);

  t("caps do NPC declarados no núcleo (12 msgs · 10/min · 1200ms · storage v57)",
    LIMITES_NPC.MENSAGENS_CAP === 12 && LIMITES_NPC.PORTAO_POR_MIN === 10
    && LIMITES_NPC.PORTAO_INTERVALO_MS === 1200 && LIMITES_NPC.CHAVE_STORAGE === "bateu.cidade.npc.v57"
    && LIMITES_NPC.MAX_TOKENS === 1024 && LIMITES_NPC.ENTRADA_CAP === 500);

  const portaoNpc = new PortaoRateLimit(LIMITES_NPC.PORTAO_POR_MIN, LIMITES_NPC.PORTAO_JANELA_MS, LIMITES_NPC.PORTAO_INTERVALO_MS);
  const primeira = portaoNpc.reservar();
  const segunda = portaoNpc.reservar();
  t(`portão do NPC: 1.ª passa (0 ms), 2.ª imediata espera ≈1200 ms (${segunda} ms)`,
    primeira === 0 && segunda >= 1000 && segunda <= 1300);

  // ── B) Cliente ↔ mock: o upstream PROVA a persona + contexto ──
  console.log("— B) Cliente ↔ upstream mock (formato NVIDIA real)");
  await new Promise((r) => mock.listen(PORTA_MOCK, r));

  const portaoRapido = new PortaoRateLimit(20, 60_000, 0); // intervalo 0 para não travar a suíte
  const clienteNpc = new ClienteNemotron({ endpoint: `http://127.0.0.1:${PORTA_MOCK}/chat/completions`, chave: "mock-chave", tentativas: 1, portao: portaoRapido });
  const ctxTeste = { distrito: "Praça do Imbondeiro", noite: false, clima: "26°C em Maputo" };

  const rNpc = await clienteNpc.conversarStream({
    mensagens: [
      { role: "system", content: promptSistemaNpc(ctxTeste) },
      { role: "system", content: contextoCidade(ctxTeste) },
      { role: "user", content: "O que és?" },
    ],
    parametros: { modelo: MODELO_PADRAO, temperatura: 0.7, topP: 0.95, maxTokens: LIMITES_NPC.MAX_TOKENS, thinking: true },
  });
  t("NPC: resposta flui (mock v57)", rNpc.conteudo.includes("mock v57"), rNpc.conteudo.slice(0, 60));
  t("NPC: raciocínio separado do conteúdo (thinking)", rNpc.raciocinio.includes("regras") && rNpc.raciocinio !== rNpc.conteudo);
  t("NPC: usage REAL do upstream (8 completion)", rNpc.uso?.completionTokens === 8 && rNpc.uso?.totalTokens === 38);
  t("upstream PROVA a ordem: system persona → system contexto → user",
    Array.isArray(ultimoCorpoChat?.messages) && ultimoCorpoChat.messages.length === 3
    && ultimoCorpoChat.messages[0].content.includes("BATEU IA")
    && ultimoCorpoChat.messages[1].content.includes("[CIDADE BATEU")
    && ultimoCorpoChat.messages[1].content.includes("26°C em Maputo")
    && ultimoCorpoChat.messages[2].content === "O que és?");
  t("upstream PROVA os caps do NPC no corpo (max_tokens 1024, thinking on)",
    ultimoCorpoChat.max_tokens === LIMITES_NPC.MAX_TOKENS
    && ultimoCorpoChat.chat_template_kwargs?.enable_thinking === true);

  // STOP a meio (caminho LENTO do mock) — parado honesto com parcial
  const controladorStop = new AbortController();
  const rLenta = clienteNpc.conversarStream({
    mensagens: [{ role: "user", content: "Fala LENTAMENTE sobre a praça" }],
    parametros: { modelo: MODELO_PADRAO, temperatura: 0.7, topP: 0.95, maxTokens: 256, thinking: false },
    sinal: controladorStop.signal,
  });
  await sleep(2400); // 2 pedaços ≈ 2,0 s (o lento agora é 30×1000 ms — há conteúdo parcial vivo)
  controladorStop.abort();
  const fimLenta = await rLenta;
  t("STOP a meio: parado=true com conteúdo PARCIAL guardado (nunca descartado)",
    fimLenta.parado === true && fimLenta.conteudo.length > 0, `parcial=${fimLenta.conteudo.length} chars`);

  // portão REAL do NPC (1200 ms): a 2.ª chamada imediata é recusada
  const clientePortao = new ClienteNemotron({
    endpoint: `http://127.0.0.1:${PORTA_MOCK}/chat/completions`, chave: "mock-chave", tentativas: 1,
    portao: new PortaoRateLimit(LIMITES_NPC.PORTAO_POR_MIN, LIMITES_NPC.PORTAO_JANELA_MS, LIMITES_NPC.PORTAO_INTERVALO_MS),
  });
  await clientePortao.conversarStream({
    mensagens: [{ role: "user", content: "1.ª" }],
    parametros: { modelo: MODELO_PADRAO, temperatura: 0.7, topP: 0.95, maxTokens: 64, thinking: false },
  });
  let erroRate = null;
  try {
    await clientePortao.conversarStream({
      mensagens: [{ role: "user", content: "2.ª imediata" }],
      parametros: { modelo: MODELO_PADRAO, temperatura: 0.7, topP: 0.95, maxTokens: 64, thinking: false },
    });
  } catch (e) { erroRate = e; }
  t("portão 1,2 s do NPC: 2.ª chamada imediata → NemotronRateLimitError com ms reais",
    erroRate instanceof NemotronRateLimitError && erroRate.esperarMs > 500, `esperar=${erroRate?.esperarMs}`);

  // ── C) Proxy REAL ──
  console.log("— C) Proxy real (server/ia-proxy.mjs v57)");
  const proxyEnv = {
    IA_PORTA: String(PORTA_PROXY), IA_UPSTREAM: `http://127.0.0.1:${PORTA_MOCK}`,
    IA_NEMOTRON_KEY: "chave-do-env-teste", IA_FICHAS_CAPACIDADE: "100",
  };
  correr("node", ["server/ia-proxy.mjs"], proxyEnv);
  t("proxy: sobe e responde à saúde", await esperarAte(`http://127.0.0.1:${PORTA_PROXY}/api/ia/saude`, (r) => r.status === 200, 8000));
  const saude = await (await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/saude`)).json();
  t("saúde: v57 com as TRÊS rotas e chave OCULTA (zero furo)",
    saude.chaveConfigurada === true && !JSON.stringify(saude).includes("chave-do-env-teste")
    && saude.versão === "v57"
    && JSON.stringify(saude.rotas ?? []).includes("/api/ia/chat")
    && JSON.stringify(saude.rotas ?? []).includes("/api/ia/visao")
    && JSON.stringify(saude.rotas ?? []).includes("/api/ia/vetores"));

  const corpoNpc = JSON.stringify({
    model: MODELO_PADRAO,
    messages: [
      { role: "system", content: promptSistemaNpc(ctxTeste) },
      { role: "system", content: contextoCidade(ctxTeste) },
      { role: "user", content: "Onde estou?" },
    ],
    temperature: 0.7, max_tokens: LIMITES_NPC.MAX_TOKENS,
    chat_template_kwargs: { enable_thinking: false },
  });
  const rChatProxy = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoNpc });
  const textoChatProxy = await rChatProxy.text();
  t("proxy: chat do NPC → SSE intato (auth injetada, [DONE], corpo igual)",
    rChatProxy.status === 200 && (rChatProxy.headers.get("content-type") ?? "").includes("text/event-stream")
    && textoChatProxy.includes("mock v57") && textoChatProxy.trimEnd().endsWith("[DONE]")
    && ultimoCorpoChat?.messages?.[0]?.content?.includes("BATEU IA"));

  const r400 = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: MODELO_PADRAO, messages: [] }) });
  t("proxy: chat sem mensagens → 400", r400.status === 400);
  const r404 = await fetch(`http://127.0.0.1:${PORTA_PROXY}/outra-rota`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  t("proxy: rota desconhecida → 404", r404.status === 404);

  correr("node", ["server/ia-proxy.mjs"], { IA_PORTA: String(PORTA_PROXY_SEM_CHAVE), IA_UPSTREAM: `http://127.0.0.1:${PORTA_MOCK}`, IA_ENVFILE: "none" });
  t("proxy sem chave: sobe", await esperarAte(`http://127.0.0.1:${PORTA_PROXY_SEM_CHAVE}/api/ia/saude`, (r) => r.status === 200, 8000));
  const r503 = await fetch(`http://127.0.0.1:${PORTA_PROXY_SEM_CHAVE}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoNpc });
  t("proxy sem chave → 503 honesto", r503.status === 503);

  // ═══ D) E2E Playwright ═══
  let mockMorto = false;
  if (SEM_E2E) {
    skip("E2E (browser)", "--sem-e2e");
  } else {
    console.log("— D) E2E Playwright (/cidade com o NPC)");
    let chromium = null;
    try { ({ chromium } = await import("playwright")); } catch {}
    if (!chromium) {
      skip("E2E (browser)", "playwright indisponível");
    } else {
      const viteEnv = {
        VITE_IA_ENDPOINT: `http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`,
        VITE_IA_ENDPOINT_VETORES: `http://127.0.0.1:${PORTA_PROXY}/api/ia/vetores`,
      };
      const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], viteEnv);
      const viteNoAr = await esperarAte(`${BASE}/cidade`, (r) => r.status === 200, 60_000);
      t("vite dev no ar em 8099", viteNoAr);

      const NOISE = [
        "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase",
        "ERR_", "net::", "ResizeObserver", "AudioContext", "React Router Future Flag", "404", "406",
        "fetchPriority", "PGRST", "JWT", "permission", "AbortError", "play() failed", "user gesture",
        "401", "same key", "validateDOMNesting", "CORS", "cors", "open-meteo", "apikey", "Auth",
        "Failed to fetch", "TypeError", "NetworkError", "pointer", "three", "THREE", "WebGL",
      ];
      const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
      const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
      const consoleErros = [];
      page.on("pageerror", (e) => consoleErros.push(String(e)));
      page.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) consoleErros.push(m.text()); });

      // clima REAL mockado (determinístico) — entra no contexto do NPC
      await page.route(/geocoding-api\.open-meteo\.com/, (route) =>
        route.fulfill({ json: { results: [{ name: "Maputo", country: "Moçambique", admin1: "Maputo Cidade", latitude: -25.97, longitude: 32.58 }] } }));
      await page.route(/^https:\/\/api\.open-meteo\.com\//, (route) =>
        route.fulfill({ json: { current: { temperature_2m: 26.4, weather_code: 61, wind_speed_10m: 12 } } }));

      await page.goto(`${BASE}/cidade`, { waitUntil: "domcontentloaded" });
      await page.getByTestId("cd-inicio").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
      t("ecrã de início da cidade visível", await page.getByTestId("cd-inicio").isVisible().catch(() => false));

      // clima REAL mockado TEM de estar carregado antes de entrar — o
      // contexto do NPC (factos medidos) leva-o para o system do upstream
      await page.waitForFunction(
        () => { const el = document.querySelector("[data-testid=cd-clima-inicio]"); return el && /26[.,]4/.test(el.textContent ?? ""); },
        null, { timeout: 12000 },
      ).catch(() => {});

      await page.getByTestId("cd-entrar").click();
      await page.waitForFunction(() => window.__cidade?.fase() === "jogando", null, { timeout: 20000 }).catch(() => {});
      t("fase jogando", await page.evaluate(() => window.__cidade?.fase() === "jogando"));

      // o holograma entrou NA CENA (grupo THREE gerido pela página)
      const npcInfo = await page.evaluate(() => window.__cidade?.npcIa?.());
      t("NPC IA: holograma NA CENA", !!npcInfo?.noCena, JSON.stringify(npcInfo));
      t("NPC IA: o spawn nasce DENTRO do raio de fala (dist < 6)",
        npcInfo?.dentro === true && npcInfo?.dist != null && npcInfo.dist < NPC_RAIO_FALAR, `dist=${npcInfo?.dist}`);

      await page.evaluate(() => window.__cidade.pump(30));
      await sleep(900); // rótulos/proximidade a ~8 Hz
      const promptVisivel = await page.getByTestId("cd-npc-prompt").isVisible().catch(() => false);
      t("prompt «Falar com a Bateu IA» visível ao nascer", promptVisivel);

      await page.getByTestId("cd-npc-prompt").click();
      await page.getByTestId("cd-npc-painel").waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      t("painel do NPC abre", await page.getByTestId("cd-npc-painel").isVisible().catch(() => false));
      t("saudação local honesta (não é IA a fingir)", await page.getByTestId("cd-npc-ola").isVisible().catch(() => false));
      const sugestoesN = await page.locator("[data-testid^=cd-npc-sugestao-]").count().catch(() => 0);
      t("4 sugestões prontas", sugestoesN === 4, `n=${sugestoesN}`);

      await page.getByTestId("cd-npc-caixa").fill("Diz olá");
      await page.getByTestId("cd-npc-enviar").click();
      const respostaChegou = await page.waitForFunction(
        () => {
          const el = document.querySelector("[data-testid=cd-npc-conteudo-1]") ?? document.querySelector("[data-testid=cd-npc-conteudo-fluxo]");
          return el?.textContent?.includes("mock v57");
        },
        null, { timeout: 25000 },
      ).then(() => true).catch(() => false);
      t("NPC: resposta em streaming chega (mock v57)", respostaChegou);
      t("upstream PROVA persona + contexto (clima REAL 26°C do Open-Meteo mockado incluído)",
        Array.isArray(ultimoCorpoChat?.messages) && ultimoCorpoChat.messages.length === 3
        && String(ultimoCorpoChat.messages[0]?.content ?? "").includes("BATEU IA")
        && String(ultimoCorpoChat.messages[1]?.content ?? "").includes("26°C em Maputo")
        && String(ultimoCorpoChat.messages[1]?.content ?? "").includes("Open-Meteo")
        && String(ultimoCorpoChat.messages[2]?.content ?? "").includes("Diz olá"),
        JSON.stringify([
          String(ultimoCorpoChat?.messages?.[1]?.content ?? "").split("\n").filter((l) => l.includes("Clima") || l.includes("Estrutura") || l.includes("Hora")),
          ultimoCorpoChat?.messages?.length,
        ]));

      // STOP a meio (caminho LENTO)
      await page.getByTestId("cd-npc-caixa").fill("Fala LENTAMENTE");
      await page.getByTestId("cd-npc-enviar").click();
      const fluxoVivo = await page.waitForFunction(
        () => (document.querySelector("[data-testid=cd-npc-conteudo-fluxo]")?.textContent ?? "").length > 0,
        null, { timeout: 15000 },
      ).then(() => true).catch(() => false);
      t("fluxo lento vivo (1.º pedaço chegou)", fluxoVivo);
      // FURO do SANDBOX (lição v53/v54): o raster por software corre a ~2 fps
      // e o rAF do Playwright nunca vê 2 frames seguidos com a mesma caixa →
      // o clique "normal" falha por «not stable». O v54 usou clique com
      // timeout curto; aqui o clique é FORÇADO (a HONESTIDADE fica na
      // asserção seguinte: a nota «Parado por ti» só aparece com o abort
      // REAL propagado ao upstream — sem abort não há nota).
      let clicouParar = false;
      try {
        await page.getByTestId("cd-npc-parar").waitFor({ state: "visible", timeout: 5000 });
        await page.getByTestId("cd-npc-parar").click({ timeout: 2500, force: true });
        clicouParar = true;
      } catch {
        // FURO do SANDBOX (lição v53): com o raster a ~2 fps o pipeline de
        // input do Playwright pode perder a janela — o clique vai por DOM
        // (o handler onClick REAL corre; a asserção da nota é a prova).
        try {
          await page.evaluate(() => document.querySelector("[data-testid=cd-npc-parar]")?.click());
          clicouParar = true;
        } catch (e2) {
          console.log("    [parar]", String(e2).split("\n")[0].slice(0, 130));
        }
      }
      const parou = await page.waitForFunction(
        () => {
          const msgs = document.querySelectorAll("[data-testid^=cd-npc-conteudo-]");
          const ultima = msgs[msgs.length - 1];
          return ultima?.textContent?.includes("Parado por ti");
        },
        null, { timeout: 12000 },
      ).then(() => true).catch(() => false);
      t("STOP a meio: nota honesta «Parado por ti» guardada", parou, clicouParar ? "" : "botão não visto a tempo");

      try {
        mkdirSync(join(RAIZ, "shots-v57"), { recursive: true });
        await page.screenshot({ path: join(RAIZ, "shots-v57", "npc-praca.png"), fullPage: false });
        console.log("    📸 shots-v57/npc-praca.png");
      } catch {}

      // erro HONESTO: matar o mock upstream → o proxy responde 502 real
      await new Promise((r) => mock.close(r));
      try { mock.closeAllConnections?.(); } catch {}
      mockMorto = true;
      await page.getByTestId("cd-npc-caixa").fill("Outra pergunta");
      await page.getByTestId("cd-npc-enviar").click();
      const erroVisivel = await page.waitForFunction(
        () => !!document.querySelector("[data-testid=cd-npc-erro]"),
        null, { timeout: 20000 },
      ).then(() => true).catch(() => false);
      const erroTexto = await page.getByTestId("cd-npc-erro").textContent().catch(() => "");
      t("erro HONESTO com o upstream morto (banner com o motivo real)", erroVisivel, `"${erroTexto.slice(0, 80)}"`);

      // limpar + fechar
      await page.getByTestId("cd-npc-limpar").click();
      const voltouOla = await page.waitForFunction(
        () => !!document.querySelector("[data-testid=cd-npc-ola]"),
        null, { timeout: 5000 },
      ).then(() => true).catch(() => false);
      t("limpar conversa volta à saudação honesta", voltouOla);
      await page.getByTestId("cd-npc-fechar").click();
      await sleep(250);
      const painelFechou = await page.evaluate(() => !window.__cidade?.npcIa?.().painelAberto);
      t("fechar painel (X) fecha a sério", painelFechou);

      const errosLimpos = consoleErros.filter((e) => !NOISE.some((n) => e.includes(n)));
      t("zero erros de console não-ruidosos", errosLimpos.length === 0, errosLimpos.slice(0, 3).join(" | "));

      await browser.close();
      try { vite.kill("SIGKILL"); } catch {}
    }
  }

  // ═══ E) LIVE NVIDIA (skippável honesta) ═══
  console.log("— E) LIVE NVIDIA (persona do NPC com o modelo REAL)");
  let chaveLive = null;
  try { chaveLive = readFileSync(join(RAIZ, ".env.ia"), "utf8").match(/IA_NEMOTRON_KEY=(\S+)/)?.[1] ?? null; } catch {}
  if (!chaveLive) {
    skip("live NVIDIA", "sem .env.ia");
  } else {
    try {
      const clienteLive = new ClienteNemotron({
        endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
        chave: chaveLive,
        tentativas: 1,
        portao: new PortaoRateLimit(20, 60_000, 0),
      });
      const rLive = await clienteLive.conversarStream({
        mensagens: [
          { role: "system", content: promptSistemaNpc({ noite: false, clima: "26°C em Maputo" }) },
          { role: "user", content: "Diz olá numa frase curta e diz-me um facto sobre esta praça." },
        ],
        parametros: { modelo: MODELO_PADRAO, temperatura: 0.7, topP: 0.95, maxTokens: LIMITES_NPC.MAX_TOKENS, thinking: false },
      });
      if (!rLive.conteudo && !rLive.uso) {
        skip("live NPC (persona real)", "upstream sem conteúdo — rede/chave do sandbox");
      } else {
        t("live NPC: a BATEU IA REAL respondeu (curto, na persona)",
          rLive.conteudo.trim().length > 0 && rLive.conteudo.length < 1500, rLive.conteudo.slice(0, 120));
        t("live NPC: usage REAL do upstream", rLive.uso?.totalTokens != null && rLive.uso.totalTokens > 0,
          JSON.stringify(rLive.uso ? { p: rLive.uso.promptTokens, c: rLive.uso.completionTokens, t: rLive.uso.totalTokens } : null));
        console.log(`    live NPC: ${rLive.conteudo.slice(0, 140).replace(/\n/g, " ")}`);
      }
    } catch (e) {
      skip("live NPC (persona real)", `rede/timeout do sandbox: ${String(e?.message ?? e).slice(0, 80)}`);
    }
  }

  // ── Fecho ──
  console.log(`\n${"═".repeat(58)}`);
  console.log(`  VERDES: ${ok}  ·  FALHAS: ${fail}  ·  SKIPS: ${skips}`);
  if (fail) { console.log("  FALHAS:"); for (const f of falhas) console.log("   ·", f); }
  console.log(`${"═".repeat(58)}\n`);
}

main()
  .catch((e) => { console.error("CRASH:", e); fail++; })
  .finally(() => {
    matarTodos();
    try { mock.close(); } catch {}
    process.exit(fail ? 1 : 0);
  });
