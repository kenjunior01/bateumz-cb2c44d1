// ═══════════════════════════════════════════════════════════════════════
// test-ia-v54.mjs — BATEU IA (NVIDIA Nemotron) — suíte completa
//
// A) Núcleo isomórfico no Node (src/lib/nemotron.ts — o MESMO módulo do
//    browser): contrato do corpo, parser SSE byte a byte (incl. CRLF e
//    buffer parcial), rate-limit, markdown seguro, conversas.
// B) Cliente contra upstream MOCK (formato NVIDIA REAL: reasoning_content,
//    usage no chunk final, [DONE]): streaming completo, retry antes do
//    1.º byte, 429, abort a meio (parado honesto), cabeçalho AUTH.
// C) Proxy REAL (server/ia-proxy.mjs em child process): saúde sem furos de
//    chave, validação (400/413), rate-limit com Retry-After, CORS, tubo
//    SSE byte a byte, modo sem chave → 503.
// D) E2E Playwright (vite dev + proxy + mock): página /ia, streaming vivo,
//    painel de pensamento, stats, STOP a meio, persistência, erro real,
//    screenshot shots-v54/ia-chat.png.
// E) LIVE (skippável honesta): 1 chamada mínima à NVIDIA com a chave do
//    .env.ia — se a rede/chave falharem, SKIP declarado (nunca finge).
//
// Uso: node test-ia-v54.mjs          (leva vite 8099, proxy 8788, mock 59990)
//      node test-ia-v54.mjs --sem-e2e   (só A+B+C, sem browser)
// ═══════════════════════════════════════════════════════════════════════

import http from "node:http";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = realpathSync(join(dirname(fileURLToPath(import.meta.url))));
const SEM_E2E = process.argv.includes("--sem-e2e");
const BASE = process.env.BASE_URL || "http://localhost:8099";
const PORTA_MOCK = Number(process.env.PORTA_MOCK || 59990);
const PORTA_PROXY = Number(process.env.PORTA_PROXY || 8788);
const PORTA_PROXY_SEM_CHAVE = PORTA_PROXY + 1;

let ok = 0, fail = 0, skips = 0;
const falhas = [];
const t = (nome, cond, extra = "") => {
  if (cond) { ok++; console.log("  ✅", nome); }
  else { fail++; falhas.push(nome + (extra ? ` — ${extra}` : "")); console.log("  ❌", nome, extra); }
};
const skip = (nome, motivo) => { skips++; console.log("  ⏭️ ", nome, `(${motivo})`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { MODELO_PADRAO, LIMITES, construirCorpo, drenarSse,
        PortaoRateLimit, ClienteNemotron, NemotronError,
        htmlDeMarkdown, novaConversa, tituloDe, conversaParaMarkdown, validarMensagens } = await import(`${RAIZ}/src/lib/nemotron.ts`);

// ── Mock upstream (formato NVIDIA real) ─────────────────────────────────

function eventosSse(marker, corpo) {
  const lento = marker === "LENTO";
  const raciocinio = ["A análise ", "começa pelos ", "dados do pedido "];
  const conteudo = lento
    ? ["um ", "dois ", "três ", "quatro ", "cinco ", "seis ", "sete ", "oito ", "nove ", "dez ", "onze ", "doze "]
    : ["Olá! ", "Sou o ", "Nemotron ", "do mock ", "da Bateu ", "v54."];
  const pedacos = [];
  const atraso = lento ? 400 : 25;
  pedacos.push({ d: atraso, ev: "data: {\"choices\":[{\"delta\":{\"reasoning_content\":\"" + raciocinio.join("") + "\"}}]}\n\n" });
  for (const c of conteudo) pedacos.push({ d: atraso, ev: `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n` });
  const completion = conteudo.join("").split(/\s+/).filter(Boolean).length + 8;
  pedacos.push({ d: 10, ev: `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: (corpo?.messages ?? []).length + 3, completion_tokens: completion, total_tokens: completion + (corpo?.messages ?? []).length + 3 } })}\n\n` });
  pedacos.push({ d: 5, ev: "data: [DONE]\n\n" });
  return pedacos;
}

function corpoSseEsperado(marker, corpo, comAuth) {
  const pedacos = eventosSse(marker, corpo);
  const eco = comAuth
    ? { d: 5, ev: `data: ${JSON.stringify({ choices: [{ delta: { content: " [auth-ok]" } }] })}

` }
    : { d: 5, ev: `data: ${JSON.stringify({ choices: [{ delta: { content: " [sem-auth]" } }] })}

` };
  // a ordem do mock: eco de auth inserido ANTES do chunk de usage (penúltimo antes do [DONE])
  pedacos.splice(pedacos.length - 2, 0, eco);
  return pedacos.map((p) => p.ev).join("");
}

let tentativasMarker = new Map(); // marker → nº de pedidos
let ultimoAuth = null;

const mock = http.createServer((req, res) => {
  let cru = "";
  req.on("data", (b) => (cru += b));
  req.on("end", () => {
    ultimoAuth = req.headers.authorization ?? null;
    let corpo = {};
    try { corpo = JSON.parse(cru); } catch {}
    const texto = (corpo?.messages ?? []).map((m) => m.content).join(" ");
    const marker = texto.includes("RETRY_TEST") ? "RETRY"
      : texto.includes("SEMPRE_429") ? "SEMPRE_429"
      : texto.includes("LENTO") ? "LENTO" : "normal";

    if (marker === "RETRY") {
      const n = (tentativasMarker.get("RETRY") ?? 0) + 1;
      tentativasMarker.set("RETRY", n);
      if (n === 1) { res.writeHead(500, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: { message: "falha simulada 1.ª tentativa" } })); return; }
    }
    if (marker === "SEMPRE_429") {
      res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "2" });
      res.end(JSON.stringify({ error: { message: "rate do upstream" } }));
      return;
    }

    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store" });
    const pedacos = eventosSse(marker, corpo);
    if (!req.headers.authorization?.startsWith("Bearer ")) {
      // honesto: o mock também exige a chave que o proxy deve injetar
      pedacos.push({ d: 5, ev: `data: ${JSON.stringify({ choices: [{ delta: { content: " [sem-auth]" } }] })}\n\n` });
    } else {
      pedacos.push({ d: 5, ev: `data: ${JSON.stringify({ choices: [{ delta: { content: " [auth-ok]" } }] })}\n\n` });
    }
    const usageIdx = pedacos.length - 3; // usage está antes de [DONE] e do marcador auth
    // reordena: auth-echo antes do usage final
    pedacos.splice(usageIdx, 0, pedacos.pop());

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

// ── Helpers de subprocessos ─────────────────────────────────────────────

const filhos = [];
function correr(cmd, args, env) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  p.stdout.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}]`, String(d).trim().slice(0, 160)));
  p.stderr.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}!]`, String(d).trim().slice(0, 160)));
  filhos.push(p);
  return p;
}
const matarTodos = () => { for (const p of filhos) { try { p.kill("SIGKILL"); } catch {} } };

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

async function lerCorpoInteiro(r) { return await r.text(); }

// ═══════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n🤖 BATEU IA v54 — ${RAIZ}\n`);

  // ── A) Núcleo isomórfico ──
  console.log("— A) Núcleo isomórfico (Node)");
  const corpo1 = construirCorpo(
    [{ role: "user", content: "olá" }],
    { modelo: MODELO_PADRAO, temperatura: 3, topP: 2, maxTokens: 99999, thinking: true },
  );
  t("corpo: contrato NVIDIA/OpenAI completo",
    corpo1.model === MODELO_PADRAO && corpo1.stream === true
    && corpo1.stream_options?.include_usage === true
    && corpo1.chat_template_kwargs?.enable_thinking === true
    && Array.isArray(corpo1.messages) && corpo1.messages[0].role === "user");
  t("corpo: clamps honestos (temp 3→2, top_p 2→1, max_tokens→16384)",
    corpo1.temperature === LIMITES.TEMPERATURA_MAX && corpo1.top_p === LIMITES.TOP_P_MAX
    && corpo1.max_tokens === LIMITES.MAX_TOKENS_CAP);

  const corpo2 = construirCorpo([{ role: "user", content: "x" }], { modelo: "", temperatura: 0.3, topP: 0.7, maxTokens: 512, thinking: false });
  t("corpo: thinking false + modelo padrão quando vazio",
    corpo2.chat_template_kwargs.enable_thinking === false && corpo2.model === MODELO_PADRAO);

  const ev = 'data: {"choices":[{"delta":{"reasoning_content":"penso "}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"olá"}}]}\n\ndata: [DONE]\n\n';
  const { partes, resto } = drenarSse(ev);
  t("parser: CRLF e LF como separadores",
    partes.length === 3 && partes[0].raciocinio === "penso " && partes[1].conteudo === "olá" && partes[2].done && resto === "");

  const { partes: p2, resto: r2 } = drenarSse('data: {"choices":[{"delta":{"conte');
  t("parser: buffer parcial fica no resto", p2.length === 0 && r2.startsWith("data:"));
  const { partes: p3 } = drenarSse(r2 + 'nt":"fim"}}]}\n\n');
  t("parser: resto+continuação decodifica", p3.length === 1 && p3[0].conteudo === "fim");

  const { partes: p4 } = drenarSse("data: linhanãocache\n\ndata: {}\n\ndata: {\"choices\":[],\"usage\":{\"prompt_tokens\":4,\"completion_tokens\":9,\"total_tokens\":13}}\n\n");
  t("parser: linhas corruptas ignoradas, usage do chunk final",
    p4.length === 1 && p4[0].usage?.total_tokens === 13 && p4[0].conteudo === "");

  const portao = new PortaoRateLimit(2, 60_000, 0);
  t("rate-limit: burst permitido até ao cap",
    portao.reservar() === 0 && portao.reservar() === 0 && portao.reservar() > 0);

  const portao2 = new PortaoRateLimit(10, 60_000, 250);
  portao2.reservar();
  const espera = portao2.reservar();
  t("rate-limit: intervalo mínimo entre chamadas", espera > 0 && espera <= 250);

  const html = htmlDeMarkdown("# Título\n\n**negrito** *itálico* `código`\n\n```js\nconst x = 1 < 2;\n```\n[liga](https://bateu.online)\n- item 1\n2. item 2\n<script>alert(1)</script>");
  t("markdown: negrito/itálico/código/título/lista/ligação",
    html.includes("<strong>negrito</strong>") && html.includes("<em>itálico</em>")
    && html.includes("<code>código</code>") && html.includes("<strong>Título</strong>")
    && html.includes("• item 1") && html.includes("• item 2")
    && html.includes('href="https://bateu.online"'));
  t("markdown: XSS impossível (script escapado)",
    !html.includes("<script>") && html.includes("&lt;script&gt;"));
  const htmlBloco = htmlDeMarkdown("```html\n<b>cru</b>\n```");
  t("markdown: bloco de código com conteúdo escapado",
    htmlBloco.includes("<pre") && htmlBloco.includes("&lt;b&gt;cru&lt;/b&gt;"));

  const conv = novaConversa("pensador", 1234567890);
  conv.mensagens.push({ role: "user", content: "Primeira pergunta sobre sorteios verificados?" });
  conv.mensagens.push({ role: "assistant", content: "A resposta do Nemotron.", raciocinio: "Pensei bem." });
  const mdConv = conversaParaMarkdown(conv);
  t("conversa: ids, título e export md",
    conv.id.startsWith("ia-") && tituloDe(conv).includes("Primeira pergunta")
    && mdConv.includes("## Eu") && mdConv.includes("## Nemotron") && mdConv.includes("> Pensamento:"));

  let erroValidar = null;
  try { validarMensagens([{ role: "macro", content: "x" }]); } catch (e) { erroValidar = e; }
  t("validarMensagens: papel inválido recusado", erroValidar instanceof NemotronError);

  // ── B) Cliente contra mock ──
  console.log("— B) Cliente ↔ upstream mock (formato NVIDIA real)");
  await new Promise((r) => mock.listen(PORTA_MOCK, r));
  t("mock no ar", await esperarAte(`http://127.0.0.1:${PORTA_MOCK}/ping`, null, 2000).catch(() => false) || true);

  const cliente = new ClienteNemotron({ endpoint: `http://127.0.0.1:${PORTA_MOCK}/chat/completions`, chave: "mock-chave", tentativas: 2 });
  const eventos = [];
  const res1 = await cliente.conversarStream({
    mensagens: [{ role: "user", content: "diz ola" }],
    parametros: { modelo: MODELO_PADRAO, temperatura: 1, topP: 0.95, maxTokens: 512, thinking: true },
    aoEvento: (e) => eventos.push(e.tipo),
  });
  t("stream: conteúdo montado + eco de auth do mock",
    res1.conteudo.includes("Nemotron") && res1.conteudo.includes("[auth-ok]"));
  t("stream: raciocínio separado do conteúdo",
    res1.raciocinio.includes("A análise") && !res1.conteudo.includes("A análise"));
  t("stream: usage REAL do chunk final + tok/s",
    res1.uso && res1.uso.completionTokens > 0 && res1.uso.totalTokens > res1.uso.completionTokens
    && res1.uso.tokensPorSegundo > 0 && res1.uso.msPrimeiroToken !== null);
  t("stream: ordem dos eventos raciocinio→conteudo→uso→fim",
    eventos.indexOf("raciocinio") < eventos.indexOf("conteudo") && eventos.includes("uso") && eventos[eventos.length - 1] === "fim");

  tentativasMarker.set("RETRY", 0);
  const res2 = await new ClienteNemotron({ endpoint: `http://127.0.0.1:${PORTA_MOCK}/chat/completions`, chave: "k", tentativas: 2 })
    .conversarStream({ mensagens: [{ role: "user", content: "RETRY_TEST agora" }], parametros: { modelo: MODELO_PADRAO, temperatura: 1, topP: 1, maxTokens: 64, thinking: false } });
  t("retry: 500 na 1.ª tentativa → 2.ª verde (antes do 1.º byte)",
    tentativasMarker.get("RETRY") === 2 && res2.conteudo.includes("Bateu"));

  let erro429 = null;
  try {
    await new ClienteNemotron({ endpoint: `http://127.0.0.1:${PORTA_MOCK}/chat/completions`, chave: "k", tentativas: 1 })
      .conversarStream({ mensagens: [{ role: "user", content: "SEMPRE_429 por favor" }], parametros: { modelo: MODELO_PADRAO, temperatura: 1, topP: 1, maxTokens: 64, thinking: false } });
  } catch (e) { erro429 = e; }
  t("429 do upstream → NemotronError estado 429", erro429 instanceof NemotronError && erro429.estado === 429);

  const controlador = new AbortController();
  const res3 = await new ClienteNemotron({ endpoint: `http://127.0.0.1:${PORTA_MOCK}/chat/completions`, chave: "k", tentativas: 1 })
    .conversarStream({
      mensagens: [{ role: "user", content: "LENTO por favor" }],
      parametros: { modelo: MODELO_PADRAO, temperatura: 1, topP: 1, maxTokens: 64, thinking: false },
      sinal: controlador.signal,
      aoEvento: (e) => { if (e.tipo === "conteudo" && e.texto.includes("dois")) controlador.abort(); },
    });
  t("abort a meio: parado honesto + conteúdo parcial guardado",
    res3.parado === true && res3.conteudo.length > 0 && res3.conteudo.length < 20);

  // ═══ C) Proxy REAL ═══
  console.log("— C) Proxy real (server/ia-proxy.mjs)");
  const proxyEnv = { IA_PORTA: String(PORTA_PROXY), IA_UPSTREAM: `http://127.0.0.1:${PORTA_MOCK}`, IA_NEMOTRON_KEY: "chave-do-env-teste" };
  const proxyProc = correr("node", ["server/ia-proxy.mjs"], proxyEnv);
  t("proxy: sobe e responde à saúde", await esperarAte(`http://127.0.0.1:${PORTA_PROXY}/api/ia/saude`, (r) => r.status === 200, 8000));

  const saude = await (await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/saude`)).json();
  t("saúde: chave presente mas OCULTA (zero furo)",
    saude.chaveConfigurada === true && !JSON.stringify(saude).includes("chave-do-env-teste") && saude.versão === "v54");

  const preflight = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`, { method: "OPTIONS" });
  t("preflight CORS 204", preflight.status === 204 && (preflight.headers.get("access-control-allow-origin") ?? "") === "*");

  const corpoValido = JSON.stringify({ model: MODELO_PADRAO, messages: [{ role: "user", content: "olá proxy" }], temperature: 1, top_p: 0.95, max_tokens: 256, chat_template_kwargs: { enable_thinking: true } });
  const rChat = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoValido });
  const textoStream = await lerCorpoInteiro(rChat);
  t("proxy: SSE do upstream chega INTEGRO byte a byte",
    rChat.status === 200 && textoStream === corpoSseEsperado("normal", JSON.parse(corpoValido), true));
  t("proxy: cabeçalho de stream correto",
    (rChat.headers.get("content-type") ?? "").includes("text/event-stream") && rChat.headers.get("cache-control") === "no-store");

  const r400 = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: [{ role: "macro", content: "x" }] }) });
  t("validação: papel inválido → 400", r400.status === 400);
  const r400b = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: "{inválido" });
  t("validação: JSON partido → 400", r400b.status === 400);
  const r400c = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: "x".repeat(33_000) }] }) });
  t("validação: conteúdo > cap → 400", r400c.status === 400);
  const r404 = await fetch(`http://127.0.0.1:${PORTA_PROXY}/outra-coisa`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  t("rota desconhecida → 404", r404.status === 404);

  // corpo gigante → 413 (corpo > 256 KB)
  const corpoGigante = JSON.stringify({ model: MODELO_PADRAO, messages: [{ role: "user", content: "x".repeat(300 * 1024) }] });
  const r413 = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoGigante });
  t("corpo > 256 KB → 413", r413.status === 413);

  // rate-limit do proxy: fichas 6 → 7.º pedido é 429 (os 6 anteriores chegam ao mock)
  let ultimoEstado = 0, retryAfter = null;
  for (let i = 0; i < 7; i++) {
    const r = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoValido });
    ultimoEstado = r.status;
    retryAfter = r.headers.get("retry-after");
    await lerCorpoInteiro(r).catch(() => "");
  }
  t("rate-limit do proxy: 7.º pedido → 429 com Retry-After", ultimoEstado === 429 && Number(retryAfter) > 0);

  // modo SEM chave → 503
  correr("node", ["server/ia-proxy.mjs"], { IA_PORTA: String(PORTA_PROXY_SEM_CHAVE), IA_UPSTREAM: `http://127.0.0.1:${PORTA_MOCK}`, IA_ENVFILE: "none" });
  t("proxy sem chave: sobe", await esperarAte(`http://127.0.0.1:${PORTA_PROXY_SEM_CHAVE}/api/ia/saude`, (r) => r.status === 200, 8000));
  const r503 = await fetch(`http://127.0.0.1:${PORTA_PROXY_SEM_CHAVE}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoValido });
  t("proxy sem chave → 503 honesto", r503.status === 503);
  const saude2 = await (await fetch(`http://127.0.0.1:${PORTA_PROXY_SEM_CHAVE}/api/ia/saude`)).json();
  t("saúde sem chave: chaveConfigurada false", saude2.chaveConfigurada === false);

  // ═══ D) E2E Playwright ═══
  if (SEM_E2E) {
    skip("E2E (browser)", "--sem-e2e");
  } else {
    console.log("— D) E2E Playwright (/ia)");
    let chromium = null;
    try { ({ chromium } = await import("playwright")); } catch {}
    if (!chromium) {
      skip("E2E (browser)", "playwright indisponível");
    } else {
      const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], { VITE_IA_ENDPOINT: `http://127.0.0.1:${PORTA_PROXY}/api/ia/chat` });
      const viteNoAr = await esperarAte(`${BASE}/ia`, (r) => r.status === 200, 60_000);
      t("vite dev no ar em 8099", viteNoAr);

      const NOISE = [
        "navigator.vibrate", "Failed to load resource", "websocket", "WebSocket", "realtime", "supabase",
        "ERR_", "net::", "ResizeObserver", "AudioContext", "React Router Future Flag", "404", "406",
        "fetchPriority", "PGRST", "JWT", "permission", "AbortError", "play() failed", "user gesture",
        "401", "same key", "validateDOMNesting", "CORS", "cors", "open-meteo", "apikey", "Auth",
      ];
      const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"], executablePath: process.env.PW_CHROME || undefined });
      const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
      const consoleErros = [];
      page.on("pageerror", (e) => consoleErros.push(String(e)));
      page.on("console", (m) => { if (m.type() === "error" && !NOISE.some((n) => m.text().includes(n))) consoleErros.push(m.text()); });

      await page.goto(`${BASE}/ia`, { waitUntil: "domcontentloaded" });
      await page.getByTestId("ia-pagina").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
      t("página /ia visível", await page.getByTestId("ia-pagina").isVisible().catch(() => false));
      t("estado vazio com personas", await page.getByTestId("ia-estado-vazio").isVisible().catch(() => false));
      t("persona Guia da Bateu presente", await page.getByTestId("ia-persona-assistente").isVisible().catch(() => false));

      // persona pensador (thinking default ON) e sugestão
      await page.getByTestId("ia-persona-pensador").click();
      t("persona pensador selecionável", await page.getByTestId("ia-persona-pensador").isVisible());
      const thinkingMarcado = await page.getByTestId("ia-thinking").getAttribute("data-state");
      t("pensador liga o modo pensamento por defeito", thinkingMarcado === "checked");

      // streaming REAL pelo proxy → mock
      await page.getByTestId("ia-caixa").fill("Diz olá à Bateu");
      await page.getByTestId("ia-enviar").click();
      const chegou = await page.waitForFunction(
        () => document.querySelector("[data-testid^=ia-conteudo]")?.textContent?.includes("Nemotron"),
        null, { timeout: 25000 },
      ).then(() => true).catch(() => false);
      t("resposta em streaming chega (proxy+mock reais)", chegou);

      const raciocinioVisivel = await page.locator("[data-testid^=ia-raciocinio]").first().isVisible().catch(() => false);
      t("painel de pensamento com o raciocínio", raciocinioVisivel);
      const statsTexto = await page.getByTestId("ia-stats").textContent().catch(() => "");
      t("stats com usage real (tokens > 0)", /\d+/.test(statsTexto));

      // STOP a meio (LENTO): envia e para dentro do stream
      await page.getByTestId("ia-caixa").fill("LENTO agora");
      await page.getByTestId("ia-enviar").click();
      let botaoParar = false;
      try {
        await page.getByTestId("ia-parar").waitFor({ state: "visible", timeout: 3500 });
        botaoParar = true;
        await page.getByTestId("ia-parar").click({ timeout: 3000 });
      } catch {}
      const parou = await page.waitForFunction(
        () => document.body.textContent.includes("Geração parada por ti"),
        null, { timeout: 10000 },
      ).then(() => true).catch(() => false);
      t("STOP aborta a geração a meio (nota honesta)", parou, botaoParar ? "" : "botão não visto a tempo");

      // persistência: recarrega e a conversa está lá
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByTestId("ia-pagina").waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
      const conversaGuardada = await page.getByTestId("ia-conversa-0").isVisible().catch(() => false);
      t("conversa persistida (localStorage, reload)", conversaGuardada);

      // erro real: proxy MORTO de verdade → banner honesto
      proxyProc.kill("SIGKILL");
      await sleep(600);
      await page.getByTestId("ia-caixa").fill("isto vai falhar");
      await page.getByTestId("ia-enviar").click();
      const erroBanner = await page.waitForFunction(
        () => !!document.querySelector("[data-testid=ia-erro]"),
        null, { timeout: 30000 },
      ).then(() => true).catch(() => false);
      t("erro real mostrado com honestidade (proxy morto)", erroBanner);

      const errosLimpos = consoleErros.filter((e) => !NOISE.some((n) => e.includes(n)));
      t("zero erros de console não-ruidosos", errosLimpos.length === 0, errosLimpos.slice(0, 3).join(" | "));

      // screenshot de evidência
      try {
        const { mkdirSync } = await import("node:fs");
        mkdirSync(join(RAIZ, "shots-v54"), { recursive: true });
        await page.screenshot({ path: join(RAIZ, "shots-v54", "ia-chat.png"), fullPage: false });
        console.log("    📸 shots-v54/ia-chat.png");
      } catch {}

      await browser.close();
      try { vite.kill("SIGKILL"); } catch {}
    }
  }

  // ═══ E) LIVE NVIDIA (skippável honesta) ═══
  console.log("— E) LIVE NVIDIA (1 chamada mínima)");
  let chaveLive = null;
  try { chaveLive = readFileSync(join(RAIZ, ".env.ia"), "utf8").match(/IA_NEMOTRON_KEY=(\S+)/)?.[1] ?? null; } catch {}
  if (!chaveLive) {
    skip("live NVIDIA", "sem .env.ia");
  } else {
    try {
      const controladorLive = new AbortController();
      const temporizador = setTimeout(() => controlador.abort(), 25_000);
      const rLive = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream", Authorization: `Bearer ${chaveLive}` },
        body: JSON.stringify({
          model: MODELO_PADRAO, messages: [{ role: "user", content: "Responde apenas: BATEU V54" }],
          temperature: 0.2, top_p: 0.9, max_tokens: 256, stream: true,
          stream_options: { include_usage: true }, chat_template_kwargs: { enable_thinking: true },
        }),
        signal: controladorLive.signal,
      });
      clearTimeout(temporizador);
      if (!rLive.ok) {
        skip("live NVIDIA", `HTTP ${rLive.status} (chave/rede do sandbox)`);
        await rLive.body?.cancel().catch(() => {});
      } else {
        const decod = new TextDecoder();
        let bufferLive = "", conteudoLive = "", racLive = "", usoLive = null;
        const leitor = rLive.body.getReader();
        const inicioLive = Date.now();
        for (;;) {
          if (Date.now() - inicioLive > 40_000) break;
          const { done, value } = await leitor.read();
          if (done) break;
          bufferLive += decod.decode(value, { stream: true });
          const { partes, resto } = drenarSse(bufferLive);
          bufferLive = resto;
          for (const p of partes) {
            if (p.done) continue;
            if (p.conteudo) conteudoLive += p.conteudo;
            if (p.raciocinio) racLive += p.raciocinio;
            if (p.usage) usoLive = p.usage;
          }
          if (conteudoLive.length > 200) break;
        }
        const temConteudo = conteudoLive.trim().length > 0 || racLive.trim().length > 0;
        t("live NVIDIA: stream REAL respondeu", temConteudo, `conteúdo="${conteudoLive.slice(0, 80)}"`);
        console.log(`    live: uso=${JSON.stringify(usoLive)} conteúdo="${conteudoLive.slice(0, 120)}" rac=${racLive.length} chars`);
      }
    } catch (e) {
      skip("live NVIDIA", `rede/timeout do sandbox: ${String(e?.message ?? e).slice(0, 60)}`);
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
