// ═══════════════════════════════════════════════════════════════════════
// test-ia-v82.mjs — «A IA SUGERE, NUNCA DECIDE» + CONTEXTO — suíte completa
//
// A) Núcleos isomórficos no Node (os MESMOS módulos do browser):
//    · src/lib/iaContexto.ts — loja de contexto (publicar/substituir,
//      saneamento com CAPs, limpar por dona, TTL, prompt, perguntas/tipo);
//    · src/lib/iaSugestoes.ts — veredicto de moderação (JSON ou nada),
//      factos/fingerprint do comentador, sugestão de jogo validada contra
//      o catálogo, os 3 prompts com as proibições do briefing.
// B) E2E Playwright (vite 8099 externo):
//    · contexto real /jogo/kart → /ia (chip + banner + perguntas ctx, X limpa);
//    · /ia fresco SEM chip (regressão honesta);
//    · /desporto — card do comentador honesto + chamada SÓ no clique (mock
//      SSE interceptado); sem partidas → hint honesta;
//    · /jogos — «A IA sugere» chamada SÓ no clique; sugestão VALIDADA no
//      catálogo; nome inventado → erro honesto, zero sugestão;
//    · /admin/moderacao — visitante honesto (redirect, sem painel).
//
// Uso: PW_CHROME=<chromium> node test-ia-v82.mjs   (vite dev 8099)
// ═══════════════════════════════════════════════════════════════════════

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = realpathSync(join(dirname(fileURLToPath(import.meta.url))));
const BASE = process.env.BASE_URL || "http://localhost:8099";

let ok = 0, fail = 0;
const falhas = [];
const t = (nome, cond, extra = "") => {
  if (cond) { ok++; console.log("  ✅", nome); }
  else { fail++; falhas.push(nome + (extra ? ` — ${extra}` : "")); console.log("  ❌", nome, extra); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── A) Núcleos isomórficos ───────────────────────────────────────────────

const {
  publicarContextoIa, lerContextoIa, limparContextoIa, limparContextoIaTotal,
  subscreverContextoIa, contextoValido, contextoParaPrompt, questoesDeContexto,
  QUESTOES_POR_TIPO, TTL_CONTEXTO_MS, FACTOS_CAP, resetContextoIaTeste,
} = await import(`${RAIZ}/src/lib/iaContexto.ts`);

const {
  PROMPT_MODERADOR, analisarVeredictoIA,
  factosDesporto, fingerprintEventos, lerCacheComent, guardarCacheComent, CACHE_COMENT_CHAVE,
  PROMPT_COMENTADOR, PROMPT_SUGESTAO_JOGO, analisarSugestaoJogoIA,
} = await import(`${RAIZ}/src/lib/iaSugestoes.ts`);

async function nucleos() {
  console.log("\n■ A) Núcleos isomórficos (Node)");

  resetContextoIaTeste();
  t("contexto inicial vazio (Node sem sessionStorage)", lerContextoIa() === null);

  const ouvinte = { n: 0 };
  const desligar = subscreverContextoIa(() => { ouvinte.n++; });
  const ctx1 = publicarContextoIa({
    tipo: "jogo", id: "kart", titulo: "BATEU KART: Circuito das Lendas", rota: "/jogo/kart",
    factos: ["Categoria: Corridas", "Duração ~6 min"],
  });
  t("publicar guarda + notifica ouvinte", ouvinte.n === 1);
  t("ler devolve a MESMA referência entre chamadas", lerContextoIa() === ctx1 && ctx1?.titulo.includes("KART"));

  publicarContextoIa({ tipo: "desporto", id: "epl#8", titulo: "Premier League — jornada 8", rota: "/desporto", factos: ["Competição: Premier League"] });
  t("publicar SUBSTITUI o slot (um sítio de cada vez)", lerContextoIa()?.titulo.includes("Premier League"));

  // saneamento: CAPs + rejeição de vazio
  const factos15 = Array.from({ length: 15 }, (_, i) => `facto ${i}`);
  publicarContextoIa({ tipo: "jogo", id: "x", titulo: "cap", rota: "/x", factos: factos15 });
  t(`factos cortados ao CAP (${FACTOS_CAP})`, lerContextoIa()?.factos.length === FACTOS_CAP);
  const longo = "a".repeat(500);
  publicarContextoIa({ tipo: "jogo", id: "x", titulo: "cap", rota: "/x", factos: [longo] });
  t("facto cortado a 200 caracteres", (lerContextoIa()?.factos[0]?.length ?? 0) === 200);
  const antes = lerContextoIa();
  publicarContextoIa({ tipo: "jogo", id: "x", titulo: "", rota: "/x", factos: ["qualquer"] });
  publicarContextoIa({ tipo: "jogo", id: "x", titulo: "sem factos", rota: "/x", factos: [] });
  t("publicação SEM título/sem factos é recusada (honesto)", lerContextoIa() === antes);

  // limpar por dona / total
  publicarContextoIa({ tipo: "sorteio", id: "r1", titulo: "Sorteio X", rota: "/raffle/sorteio-x", factos: ["Prémio: bicicleta"] });
  limparContextoIa("/leiloes/9");
  t("limparContextoIa com rota ERRADA não limpa", lerContextoIa()?.titulo === "Sorteio X");
  limparContextoIa("/raffle/sorteio-x");
  t("limparContextoIa com rota da dona limpa", lerContextoIa() === null);
  publicarContextoIa({ tipo: "leilao", id: "l1", titulo: "Leilão Y", rota: "/leiloes/1", factos: ["Lance: 100 MT"] });
  limparContextoIaTotal();
  t("limparContextoIaTotal limpa sempre", lerContextoIa() === null);

  // TTL + prompt
  const antigo = { tipo: "jogo", id: "g", titulo: "Jogo V", rota: "/jogo/g", factos: ["f"], geradoEm: Date.now() - TTL_CONTEXTO_MS - 1000 };
  t("contexto expirado é inválido (TTL)", contextoValido(antigo) === false && contextoParaPrompt(antigo) === "");
  publicarContextoIa({ tipo: "jogo", id: "kart", titulo: "BATEU KART", rota: "/jogo/kart", factos: ["Categoria: Corridas"] });
  const prompt = contextoParaPrompt(lerContextoIa());
  t("prompt contém rota + título + factos", prompt.includes("/jogo/kart") && prompt.includes("BATEU KART") && prompt.includes("Categoria: Corridas"));
  t("prompt manda NUNCA inventar", prompt.includes("NUNCA inventes factos fora desta lista"));
  t("prompt vazio sem contexto", contextoParaPrompt(null) === "");

  // perguntas por tipo
  const tipos = Object.keys(QUESTOES_POR_TIPO);
  t("5 tipos com 3 perguntas cada", tipos.length === 5 && tipos.every((k) => QUESTOES_POR_TIPO[k].length === 3 && QUESTOES_POR_TIPO[k].every((q) => q.startsWith("ia.ctx.q."))));
  t("questoesDeContexto devolve as 3 do tipo", questoesDeContexto(lerContextoIa()).length === 3 && questoesDeContexto(lerContextoIa())[0].startsWith("ia.ctx.q.jogo."));
  desligar();
  const nAntes = ouvinte.n;
  publicarContextoIa({ tipo: "jogo", id: "y", titulo: "Novo", rota: "/y", factos: ["f"] });
  t("ouvinte desligado não recebe mais notificações", ouvinte.n === nAntes);
  resetContextoIaTeste();

  // ── veredicto de moderação ──
  const vOk = analisarVeredictoIA('{"classificacao":"suspeito","motivo":"Pede pagamento fora da plataforma","acao_sugerida":"escalar"}');
  t("veredicto válido completo", vOk?.classificacao === "suspeito" && vOk.acaoSugerida === "escalar" && vOk.motivo.includes("fora da plataforma"));
  t("veredicto com fence ```json", analisarVeredictoIA('```json\n{"classificacao":"ok","motivo":"conversa normal","acao_sugerida":"manter"}\n```')?.classificacao === "ok");
  t("veredicto com texto à volta do JSON", analisarVeredictoIA('Claro! Aqui está: {"classificacao":"dubio","motivo":"off-topic","acao_sugerida":"avisar"} — obrigado.')?.classificacao === "dubio");
  t("classificacao inválida → null", analisarVeredictoIA('{"classificacao":"lixo","motivo":"x","acao_sugerida":"manter"}') === null);
  t("JSON partido → null", analisarVeredictoIA('{"classificacao": "ok", "motivo":') === null);
  t("vazio → null", analisarVeredictoIA("") === null);
  t("sem acao_sugerida → default por classificacao", analisarVeredictoIA('{"classificacao":"ok","motivo":"ok"}')?.acaoSugerida === "manter" && analisarVeredictoIA('{"classificacao":"suspeito","motivo":"golpe"}')?.acaoSugerida === "avisar");
  t("motivo truncado a 240", (analisarVeredictoIA(JSON.stringify({ classificacao: "ok", motivo: "m".repeat(500), acao_sugerida: "manter" }))?.motivo.length ?? 0) <= 240);
  t("prompt do moderador diz «nunca decidis»", PROMPT_MODERADOR.includes("nunca decidis") && PROMPT_MODERADOR.includes("acao_sugerida"));

  // ── factos de desporto + fingerprint + cache ──
  const linhas = factosDesporto(
    "Premier League", 8,
    [
      { casa: "Arsenal", fora: "Chelsea", estado: "NS", kickoff: "Sáb 18:30" },
      { casa: "Liverpool", fora: "Everton", estado: "FT", placar: "2-1" },
    ],
    [{ pos: 1, equipa: "Arsenal", pts: 22 }],
  );
  t("factos: liga + jornada + partida NS + placar FT + top5",
    linhas.some((l) => l.includes("Premier League") && l.includes("jornada 8")) &&
    linhas.some((l) => l.includes("Arsenal vs Chelsea") && l.includes("NS")) &&
    linhas.some((l) => l.includes("2-1") && l.includes("FT")) &&
    linhas.some((l) => l.includes("1. Arsenal 22pts")));
  t("factos: sem eventos mantém só a linha da competição", factosDesporto("Liga X", 3, [], []).length === 1);
  const muitos = factosDesporto("L", 1, Array.from({ length: 20 }, (_, i) => ({ casa: `A${i}`, fora: `B${i}`, estado: "NS" })), [], 10);
  t("factos respeitam o máximo", muitos.length <= 12);
  t("fingerprint muda com placar", fingerprintEventos([{ casa: "A", fora: "B", estado: "FT", placar: "1-0" }]) !== fingerprintEventos([{ casa: "A", fora: "B", estado: "FT", placar: "2-0" }]));
  t("fingerprint de lista vazia é string vazia", fingerprintEventos([]) === "");
  t("cache sem DOM (Node) → {} / false", Object.keys(lerCacheComent()).length === 0 && guardarCacheComent({}) === false);
  t("chave de cache declarada", CACHE_COMENT_CHAVE === "bateu.desporto.coment.v82");
  t("prompt do comentador proíbe aposta + manda jogo responsável", PROMPT_COMENTADOR.includes("NUNCA aconselhas aposta") && PROMPT_COMENTADOR.includes("jogo responsável"));

  // ── sugestão de jogo validada ──
  const catalogo = ["Tetris", "Bounce", "Batalha de Cobras"];
  const s1 = analisarSugestaoJogoIA('{"jogo":"Tetris","razao":"Clássico curto para agora"}', catalogo);
  t("sugestão válida → rótulo real do catálogo", s1.length === 1 && s1[0].jogo === "Tetris" && s1[0].razao.includes("Clássico"));
  t("nome inventado → [] (nunca link morto)", analisarSugestaoJogoIA('{"jogo":"Jogo Inexistente 3000","razao":"x"}', catalogo).length === 0);
  t("sem razão → []", analisarSugestaoJogoIA('{"jogo":"Tetris","razao":""}', catalogo).length === 0);
  const s2 = analisarSugestaoJogoIA('{"sugestoes":[{"jogo":"Tetris","razao":"r1"},{"jogo":"Bounce","razao":"r2"},{"jogo":"Batalha de Cobras","razao":"r3"}]}', catalogo);
  t("array de 3 → máx. 2", s2.length === 2);
  const s3 = analisarSugestaoJogoIA('{"sugestoes":[{"jogo":"Tetris","razao":"r1"},{"jogo":"Tetris","razao":"r2"}]}', catalogo);
  t("duplicado → 1", s3.length === 1);
  t("JSON partido → []", analisarSugestaoJogoIA('{"jogo":', catalogo).length === 0);
  t("prompt da sugestão exige rótulo EXACTO do catálogo", PROMPT_SUGESTAO_JOGO.includes("rótulo EXACTO") && PROMPT_SUGESTAO_JOGO.includes("Nunca inventes jogos fora do catálogo"));
}

// ── B) E2E ───────────────────────────────────────────────────────────────

const NOISE = [
  "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket",
  "realtime", "supabase", "ERR_", "net::", "ResizeObserver", "AudioContext",
  "React Router Future Flag", "404", "406", "fetchPriority", "PGRST", "JWT",
  "permission", "AbortError", "play() failed", "user gesture", "401", "403",
  "same key", "validateDOMNesting", "CORS", "cors", "open-meteo", "thesportsdb",
  "THREE", "WebGL", "R3F", "drei", "third_party", "favicon",
];

function sseDe(conteudo) {
  const pedacos = [];
  const parte = Math.ceil(conteudo.length / 3) || 1;
  for (let i = 0; i < 3; i++) {
    const p = conteudo.slice(i * parte, (i + 1) * parte);
    if (!p) continue;
    pedacos.push(`data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`);
  }
  pedacos.push(`data: ${JSON.stringify({ choices: [{ delta: {} }], usage: { prompt_tokens: 60, completion_tokens: 45, total_tokens: 105 } })}\n\n`);
  pedacos.push("data: [DONE]\n\n");
  return pedacos.join("");
}

async function e2e() {
  console.log("\n■ B) E2E (vite 8099)");
  let chromium;
  try { ({ chromium } = await import("playwright")); } catch { console.log("  ⏭️  playwright indisponível"); return; }
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });

  const filtrar = (page) => page.on("console", (m) => {
    const s = m.text?.() ?? "";
    if (m.type() === "error" && !NOISE.some((n) => s.includes(n))) console.log("  [console]", s.slice(0, 140));
  });

  // ── T1: contexto real /jogo/kart → /ia ──
  console.log("— T1 · /jogo/kart → /ia: chip + banner + perguntas ctx");
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    filtrar(page);
    await page.goto(`${BASE}/jogo/kart`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("[data-testid='detalhe-hero']", { timeout: 15000 });
    await page.goto(`${BASE}/ia`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("[data-testid='ia-contexto-chip']", { timeout: 12000 });
    const chip = (await page.locator("[data-testid='ia-contexto-chip']").textContent()) || "";
    t("chip de contexto visível com o jogo REAL", chip.includes("Contexto:") && chip.includes("BATEU KART"));
    t("banner no estado vazio", await page.locator("[data-testid='ia-contexto-banner']").count() === 1);
    t("link «abrir página» aponta à rota de origem", ((await page.locator("[data-testid='ia-contexto-abrir']").getAttribute("href")) || "").includes("/jogo/kart"));
    for (let n = 1; n <= 3; n++) {
      const q = (await page.locator(`[data-testid='ia-sugestao-ctx-${n}']`).textContent()) || "";
      t(`pergunta ctx ${n} presente (${q.trim().slice(0, 34)}…)`, q.trim().length > 5);
    }
    t("sem perguntas de persona no lugar das ctx", !(await page.locator("[data-testid='ia-sugestao-1']").count()));
    await page.screenshot({ path: "shots-v82/ia-contexto-chip.png", fullPage: false }).catch(() => {});
    await page.locator("[data-testid='ia-contexto-limpar']").click();
    await sleep(400);
    t("X do chip limpa o contexto", !(await page.locator("[data-testid='ia-contexto-chip']").count()));
    t("sem chip: perguntas de persona voltam", await page.locator("[data-testid='ia-sugestao-1']").count() === 1);
    t("personas continuam 4 (regressão v81)", await page.locator("[data-testid='ia-persona-assistente']").count() === 1 && await page.locator("[data-testid='ia-persona-suporte']").count() === 1);
    await ctx.close();
  } catch (e) {
    t("T1 completo", false, String(e?.message ?? e).slice(0, 120));
  }

  // ── T2: /ia fresco sem contexto ──
  console.log("— T2 · /ia fresco: SEM chip (regressão)");
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    filtrar(page);
    await page.goto(`${BASE}/ia`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("[data-testid='ia-estado-vazio']", { timeout: 15000 });
    t("sem chip sem contexto", !(await page.locator("[data-testid='ia-contexto-chip']").count()));
    t("sem banner sem contexto", !(await page.locator("[data-testid='ia-contexto-banner']").count()));
    t("perguntas de persona normais", await page.locator("[data-testid='ia-sugestao-1']").count() === 1 && !(await page.locator("[data-testid='ia-sugestao-ctx-1']").count()));
    await ctx.close();
  } catch (e) {
    t("T2 completo", false, String(e?.message ?? e).slice(0, 120));
  }

  // ── T3: /desporto — comentador honesto + chamada SÓ no clique ──
  console.log("— T3 · /desporto: comentador IA (mock SSE)");
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    filtrar(page);
    let chamadas = 0;
    let resposta = "";
    await page.route("**/functions/v1/nemotron-chat", async (route) => {
      chamadas++;
      await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: sseDe(resposta) });
    });
    await page.goto(`${BASE}/desporto`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("[data-testid='desporto-ia-card']", { timeout: 15000 });
    t("card do comentador presente", true);
    t("rótulo honesto «não é conselho de aposta»", ((await page.locator("[data-testid='desporto-ia-card']").textContent()) || "").includes("não é conselho de aposta"));
    await sleep(6000); // espaço para a fonte externa (TheSportsDB) responder ou falhar honestamente
    const partidas = await page.locator("[data-testid^='match-']").count();
    const botao = page.locator("[data-testid='desporto-ia-gerar']");
    t("botão gerar presente", (await botao.count()) === 1);
    t("ZERO chamadas à IA antes do clique (só no clique)", chamadas === 0);
    if (partidas > 0) {
      resposta = "Jornada quente: o Arsenal recebe o Chelsea com a classificação a pedir pontos, e o clássico promete derrapar. Sem dados suficientes para mais — joga com responsabilidade.";
      await botao.click();
      await page.waitForSelector("[data-testid='desporto-ia-texto']", { timeout: 15000 });
      const texto = (await page.locator("[data-testid='desporto-ia-texto']").textContent()) || "";
      t("comentário da IA renderizado (streaming mock)", texto.includes("Jornada quente") && texto.includes("joga com responsabilidade"));
      t("exatamente 1 chamada após o clique", chamadas === 1);
      const botao2 = (await page.locator("[data-testid='desporto-ia-gerar']").textContent()) || "";
      t("botão passa a «Regenerar»", botao2.includes("Regenerar"));
      await page.screenshot({ path: "shots-v82/desporto-ia-card.png", fullPage: false }).catch(() => {});
    } else {
      t("sem partidas: botão desativado + hint honesta", await botao.isDisabled() && ((await page.locator("[data-testid='desporto-ia-card']").textContent()) || "").includes("nada para comentar"));
    }
    await ctx.close();
  } catch (e) {
    t("T3 completo", false, String(e?.message ?? e).slice(0, 120));
  }

  // ── T4: /jogos — sugestão VALIDADA (nome real, ≠ jogo do dia) ──
  console.log("— T4 · /jogos: «A IA sugere um jogo» (mock com jogo real)");
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    filtrar(page);
    let chamadas = 0;
    let escolhido = ["Tetris", "tetris"];
    const CANDIDATOS = [["Tetris", "tetris"], ["Bounce", "bounce"], ["Pong VS", "pongvs"], ["Flappy Bird", "flappybird"]];
    await page.route("**/functions/v1/nemotron-chat", async (route) => {
      chamadas++;
      // o pedido REAL lista o jogo do dia — o mock escolhe um jogo do
      // catálogo que NÃO seja esse (o núcleo filtra-o de propósito)
      let doDia = "";
      try {
        const corpo = route.request().postDataJSON();
        const user = corpo?.messages?.find((m) => m.role === "user")?.content ?? "";
        doDia = (user.split("\n").find((l) => l.startsWith("- Jogo do dia:")) ?? "").replace("- Jogo do dia:", "").trim();
      } catch {}
      escolhido = CANDIDATOS.find(([label]) => !doDia.includes(label)) ?? CANDIDATOS[0];
      const corpoResposta = JSON.stringify({ jogo: escolhido[0], razao: "Clássico curto e fiel ao catálogo — pausa perfeita." });
      await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: sseDe(corpoResposta) });
    });
    await page.goto(`${BASE}/jogos`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("[data-testid='jogos-ia-sugestao']", { timeout: 15000 });
    t("card «A IA sugere um jogo» presente", true);
    t("rótulo honesto (sugestão, não decisão)", ((await page.locator("[data-testid='jogos-ia-sugestao']").textContent()) || "").includes("sugestão, não decisão"));
    await sleep(1200);
    t("ZERO chamadas à IA ao carregar a página (só no clique)", chamadas === 0);
    await page.locator("[data-testid='jogos-ia-botao']").click();
    await page.waitForSelector(`[data-testid='jogos-ia-item-${escolhido[1]}']`, { timeout: 15000 });
    t("sugestão renderizada com jogo real do catálogo", true);
    const link = page.locator(`[data-testid='jogos-ia-item-${escolhido[1]}']`);
    t(`item aponta a /jogo/${escolhido[1]} (catálogo real)`, ((await link.getAttribute("href")) || "").includes(`/jogo/${escolhido[1]}`));
    t("razão visível", ((await link.textContent()) || "").includes("Clássico curto"));
    t("exatamente 1 chamada após o clique", chamadas === 1);
    await page.screenshot({ path: "shots-v82/jogos-ia-sugestao.png", fullPage: false }).catch(() => {});
    await ctx.close();
  } catch (e) {
    t("T4 completo", false, String(e?.message ?? e).slice(0, 120));
  }

  // ── T5: /jogos — nome inventado → erro honesto, zero sugestão ──
  console.log("— T5 · /jogos: nome inventado → honesto");
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    filtrar(page);
    await page.route("**/functions/v1/nemotron-chat", async (route) => {
      await route.fulfill({ status: 200, headers: { "Content-Type": "text/event-stream" }, body: sseDe('{"jogo":"Super Ultra Game 9000","razao":"inventado"}') });
    });
    await page.goto(`${BASE}/jogos`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("[data-testid='jogos-ia-botao']", { timeout: 15000 });
    await page.locator("[data-testid='jogos-ia-botao']").click();
    await page.waitForSelector("[data-testid='jogos-ia-erro']", { timeout: 15000 });
    const erro = (await page.locator("[data-testid='jogos-ia-erro']").textContent()) || "";
    t("erro honesto: «fora do catálogo real»", erro.includes("fora do catálogo real"));
    t("nenhuma sugestão renderizada", !(await page.locator("[data-testid='jogos-ia-lista']").count()));
    await ctx.close();
  } catch (e) {
    t("T5 completo", false, String(e?.message ?? e).slice(0, 120));
  }

  // ── T6: /admin/moderacao — visitante honesto ──
  console.log("— T6 · /admin/moderacao sem sessão: redirect honesto");
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    filtrar(page);
    await page.goto(`${BASE}/admin/moderacao`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await sleep(3500);
    const url = page.url();
    t("visitante não vê o painel", !(await page.locator("[data-testid='admin-moderacao']").count()));
    t(`redirect honesto (${url.replace(BASE, "")})`, url.includes("/login") || url.includes("/profile") || url.includes("/dashboard"));
    await ctx.close();
  } catch (e) {
    t("T6 completo", false, String(e?.message ?? e).slice(0, 120));
  }

  await browser.close();
}

try {
  await nucleos();
  await e2e();
} catch (e) {
  fail++;
  falhas.push(`fatal: ${String(e?.stack ?? e).slice(0, 300)}`);
  console.error(e);
}

console.log(`\n══ v82 — ${ok} verdes · ${fail} falhados ══`);
if (fail) {
  console.log("Falhas:");
  for (const f of falhas) console.log("  ·", f);
  process.exit(1);
}
process.exit(0);
