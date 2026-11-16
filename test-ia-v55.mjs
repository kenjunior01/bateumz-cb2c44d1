// ═══════════════════════════════════════════════════════════════════════
// test-ia-v55.mjs — BATEU IA VISÃO + VETORES — suíte completa
//
// Os DOIS snippets novos do utilizador são o CONTRATO:
//   · VISÃO  (nemotron-3-nano-omni): /chat/completions com content parts
//     [text, image_url], reasoning_budget 16384, temperature 0.6, top_p
//     0.95, max_tokens 65536 — stream SSE e JSON (as duas formas).
//   · VETORES (nemotron-3.5-embed-8b): /embeddings com input `texto +
//     data URL` na MESMA string, encoding_format float, modality
//     ["text_image"], input_type passage|query, truncate END.
//
// A) Núcleo isomórfico no Node (os MESMOS módulos do browser): contrato
//    dos corpos, validação de imagens, composição do input do snippet,
//    cosseno, LojaVetores, arredondamento de persistência.
// B) Clientes contra upstream MOCK (formato NVIDIA REAL): visão SSE +
//    visão JSON + embeddings, retry antes do 1.º byte, 429, abort a meio,
//    401 sem chave, imagem https → data URL (o caminho do snippet).
// C) Proxy REAL (server/ia-proxy.mjs em child process): saúde v55 com as
//    rotas, SSE/JSON intatos, cap de corpo 8 MB com imagem base64 GRANDE,
//    validações 400, 503 sem chave nas 3 rotas, rate-limit 429.
// D) E2E Playwright: abas Conversar/Ver/Buscar, visão em streaming vivo,
//    erro honesto com URL ilegal, busca semântica com vectores do mock,
//    similaridade, screenshots shots-v55/.
// E) LIVE (skippável honesta): 1 visão + 1 embeddings reais com a chave
//    do .env.ia — se a rede/chave falharem, SKIP declarado (nunca finge).
//
// Uso: node test-ia-v55.mjs            (leva vite 8099, proxies 8788/8789/8790, mock 59991)
//      node test-ia-v55.mjs --sem-e2e  (só A+B+C, sem browser)
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
const PORTA_MOCK = Number(process.env.PORTA_MOCK || 59991);
const PORTA_PROXY = Number(process.env.PORTA_PROXY || 8788);        // fichas altas (100)
const PORTA_PROXY_SEM_CHAVE = PORTA_PROXY + 1;                       // sem chave
const PORTA_PROXY_RATE = PORTA_PROXY + 2;                            // fichas padrão (6)

let ok = 0, fail = 0, skips = 0;
const falhas = [];
const t = (nome, cond, extra = "") => {
  if (cond) { ok++; console.log("  ✅", nome); }
  else { fail++; falhas.push(nome + (extra ? ` — ${extra}` : "")); console.log("  ❌", nome, extra); }
};
const skip = (nome, motivo) => { skips++; console.log("  ⏭️ ", nome, `(${motivo})`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { LIMITES, NemotronError, NemotronRateLimitError, PortaoRateLimit, drenarSse } =
  await import(`${RAIZ}/src/lib/nemotron.ts`);
const {
  MODELO_VISAO_PADRAO, LIMITES_VISAO, PARAMETROS_VISAO_PADRAO,
  construirCorpoVisao, validarImagemFonte, analisarRespostaVisao, ClienteNemotronVisao,
} = await import(`${RAIZ}/src/lib/nemotron-visao.ts`);
const {
  MODELO_EMBED_PADRAO, LIMITES_VETORES,
  comporEntradaVetor, construirCorpoVetores, validarRespostaVetores,
  cosseno, arredondarVetor, imagemParaDataUrl, LojaVetores, ClienteNemotronVetores,
} = await import(`${RAIZ}/src/lib/nemotron-vetores.ts`);

// ── Vetores determinísticos do mock (iguais para cliente e browser) ─────
const DIM = 8;
function vetorDe(texto) {
  const dims = new Array(DIM).fill(0);
  for (const ch of String(texto).toLowerCase()) {
    const c = ch.codePointAt(0);
    dims[c % DIM] += ((c * 31) % 97) / 97;
  }
  const norma = Math.sqrt(dims.reduce((s, x) => s + x * x, 0));
  if (norma === 0) { dims[0] = 1; return dims; }
  return dims.map((x) => x / norma);
}

// ── Mock upstream (formato NVIDIA real: chat multimodal + embeddings) ───

let ultimoCorpoEmbed = null;
let tentativasVisao = new Map(); // marker → nº de pedidos
let tentativasEmbed = new Map();

const P1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const mock = http.createServer((req, res) => {
  // imagem de teste para o caminho https→base64 do snippet
  if (req.method === "GET" && req.url === "/img.png") {
    res.writeHead(200, { "Content-Type": "image/png", "Content-Length": P1PX.length });
    res.end(P1PX);
    return;
  }
  if (req.method === "GET" && req.url === "/img.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>não sou imagem</h1>");
    return;
  }
  if (req.method === "GET" && req.url === "/img-404") {
    res.writeHead(404); res.end(); return;
  }

  let cru = "";
  req.on("data", (b) => (cru += b));
  req.on("end", async () => {
    let corpo = {};
    try { corpo = JSON.parse(cru); } catch {}
    const semAuth = !req.headers.authorization?.startsWith("Bearer ");

    // ── /embeddings ──
    if (req.url.endsWith("/embeddings")) {
      const chaveInput = (corpo?.input ?? []).join(" ");
      ultimoCorpoEmbed = corpo;
      const tentou = (tentativasEmbed.get("RETRY") ?? 0) + 1;
      if (chaveInput.includes("RETRY_EMBED")) {
        tentativasEmbed.set("RETRY", tentou);
        if (tentou === 1) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "falha simulada 1.ª tentativa embed" } }));
          return;
        }
      }
      if (chaveInput.includes("SEMPRE_429")) {
        res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "2" });
        res.end(JSON.stringify({ error: { message: "rate do upstream" } }));
        return;
      }
      if (chaveInput.includes("ERRO_EMBED")) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "entrada rejeitada" } }));
        return;
      }
      if (semAuth) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "sem autorização" } }));
        return;
      }
      const input = Array.isArray(corpo?.input) ? corpo.input : [];
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({
        object: "list",
        model: corpo?.model ?? MODELO_EMBED_PADRAO,
        data: input.map((s, i) => ({ object: "embedding", index: i, embedding: vetorDe(String(s).replace(/^.*data:image[^ ]*$/, "imagem")) })),
        usage: { prompt_tokens: 12 * input.length, total_tokens: 12 * input.length },
      }));
      return;
    }

    // ── /chat/completions (chat v54 + visão v55) ──
    const texto = (corpo?.messages ?? [])
      .map((m) => (Array.isArray(m?.content) ? m.content.map((p) => p?.text ?? "").join(" ") : m?.content ?? ""))
      .join(" ");
    const marker = texto.includes("RETRY_VISAO") ? "RETRY"
      : texto.includes("SEMPRE_429") ? "SEMPRE_429"
      : texto.includes("LENTO") ? "LENTO" : "normal";
    const stream = corpo?.stream !== false;

    if (marker === "RETRY") {
      const n = (tentativasVisao.get("RETRY") ?? 0) + 1;
      tentativasVisao.set("RETRY", n);
      if (n === 1) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "falha simulada 1.ª tentativa visão" } }));
        return;
      }
    }
    if (marker === "SEMPRE_429") {
      res.writeHead(429, { "Content-Type": "application/json", "Retry-After": "2" });
      res.end(JSON.stringify({ error: { message: "rate do upstream" } }));
      return;
    }
    if (semAuth) {
      res.writeHead(401, { "Content-Type": corpo.stream === false ? "application/json" : "text/event-stream" });
      if (!stream) { res.end(JSON.stringify({ error: { message: "sem autorização" } })); }
      else { res.end("data: {\"error\":{\"message\":\"sem autorização\"}}\n\n"); }
      return;
    }

    const raciocinio = "Analisei os contornos, as cores e o contexto da imagem.";
    const pedacosConteudo = marker === "LENTO"
      ? ["um ", "dois ", "três ", "quatro ", "cinco ", "seis ", "sete ", "oito ", "nove ", "dez "]
      : ["Vê-se ", "uma ", "capulana ", "colorida ", "do mock v55."];
    const atraso = marker === "LENTO" ? 300 : 20;

    if (!stream) {
      // stream=false → JSON completo (a forma do snippet do olho)
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({
        id: "mock-visao", object: "chat.completion", model: corpo?.model ?? MODELO_VISAO_PADRAO,
        choices: [{ index: 0, message: { role: "assistant", content: pedacosConteudo.join(""), reasoning_content: raciocinio }, finish_reason: "stop" }],
        usage: { prompt_tokens: 26, completion_tokens: pedacosConteudo.join("").split(/\s+/).filter(Boolean).length + 6, total_tokens: 32 },
      }));
      return;
    }

    // stream=true → SSE com reasoning_content + usage final + [DONE]
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store" });
    const pedacos = [{ d: atraso, ev: `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: raciocinio } }] })}\n\n` }];
    for (const c of pedacosConteudo) pedacos.push({ d: atraso, ev: `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n` });
    const completion = pedacosConteudo.join("").split(/\s+/).filter(Boolean).length + 8;
    pedacos.push({ d: 10, ev: `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 26, completion_tokens: completion, total_tokens: completion + 26 } })}\n\n` });
    pedacos.push({ d: 5, ev: "data: [DONE]\n\n" });

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
  // FURO REAL (lição v49/v53 EXTENDIDA, apanhada na regressão v55 da sessão
  // v56): matar o «npx» não mata o NETO («sh -c vite» → «node vite») — o
  // vite ZUMBI ficava no 8099 a servir código/env velhos. Spawn DETACHED +
  // matar TODO O GRUPO (a suíte v56 aplica o MESMO fix nas suas três).
  const p = spawn(cmd, args, { cwd: RAIZ, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"], detached: true });
  p.stdout.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}]`, String(d).trim().slice(0, 160)));
  p.stderr.on("data", (d) => process.env.VERBORRAGIA && console.log(`    [${cmd}!]`, String(d).trim().slice(0, 160)));
  filhos.push(p);
  return p;
}
const matarTodos = () => {
  for (const p of filhos) {
    try { process.kill(-p.pid, "SIGKILL"); } catch {}          // grupo inteiro (netos incluídos)
    try { p.kill("SIGKILL"); } catch {}
  }
};

// Pre-voo (mesma lição): nenhum servidor STALE nas portas desta suíte.
function limparZumbis() {
  for (const padrao of ["vite --port 8099 --strictPort", "server/ia-proxy.mjs"]) {
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
  console.log(`\n👁️  BATEU IA v55 — VISÃO + VETORES — ${RAIZ}\n`);
  limparZumbis();

  // ── A) Núcleo isomórfico ──
  console.log("— A) Núcleo isomórfico (Node)");
  const IMG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const IMG_DATA = `data:image/png;base64,${IMG_B64}`;

  const corpoV = construirCorpoVisao("O que há nesta imagem?", IMG_DATA, { ...PARAMETROS_VISAO_PADRAO });
  t("visão: contrato do snippet — content parts [text, image_url] nessa ordem",
    corpoV.model === MODELO_VISAO_PADRAO
    && corpoV.messages[0].role === "user"
    && corpoV.messages[0].content[0].type === "text" && corpoV.messages[0].content[0].text === "O que há nesta imagem?"
    && corpoV.messages[0].content[1].type === "image_url" && corpoV.messages[0].content[1].image_url.url === IMG_DATA);
  t("visão: defaults do snippet (temp 0.6 · top_p 0.95 · budget 16384 · stream true)",
    corpoV.temperature === 0.6 && corpoV.top_p === 0.95
    && corpoV.reasoning_budget === 16384 && corpoV.stream === true && corpoV.stream_options?.include_usage === true);

  const corpoV2 = construirCorpoVisao("x", IMG_DATA, { modelo: "", temperatura: 3, topP: 2, maxTokens: 999_999, orcamentoRaciocinio: 999_999, stream: true });
  t("visão: clamps honestos (65536 · 16384 · temp 2 · top_p 1)",
    corpoV2.max_tokens === LIMITES_VISAO.MAX_TOKENS_CAP && corpoV2.reasoning_budget === LIMITES_VISAO.ORCAMENTO_RACIOCINIO_CAP
    && corpoV2.temperature === LIMITES_VISAO.TEMPERATURA_MAX && corpoV2.top_p === LIMITES_VISAO.TOP_P_MAX);

  const corpoV3 = construirCorpoVisao("x", "https://exemplo.mz/imagem.png", { ...PARAMETROS_VISAO_PADRAO, orcamentoRaciocinio: 0, stream: false });
  t("visão: budget 0 é OMITIDO e stream false não leva stream_options",
    corpoV3.reasoning_budget === undefined && corpoV3.stream === false && corpoV3.stream_options === undefined
    && corpoV3.messages[0].content[1].image_url.url === "https://exemplo.mz/imagem.png");

  t("visão: imagem https válida", validarImagemFonte("https://assets.ngc.nvidia.com/example.jpg").tipo === "https");
  const imgDados = validarImagemFonte(IMG_DATA);
  t("visão: data URL válida com bytes aproximados reais", imgDados.tipo === "dados" && imgDados.bytesAprox === Math.floor((IMG_B64.length * 3) / 4));
  let erroImg = null;
  for (const ruim of ["file:///etc/passwd", "javascript:alert(1)", "data:text/html;base64,xx", ""]) {
    try { validarImagemFonte(ruim); } catch (e) { erroImg = e; }
    if (!(erroImg instanceof NemotronError)) break;
  }
  t("visão: file:/javascript:/data-não-imagem/vazio todos recusados com motivo", erroImg instanceof NemotronError);

  let erroJson = null;
  try { analisarRespostaVisao({}); } catch (e) { erroJson = e; }
  t("visão: resposta sem message → erro honesto", erroJson instanceof NemotronError);
  const respostaV = analisarRespostaVisao({ choices: [{ message: { content: "Uma capulana.", reasoning_content: "Pensei." } }], usage: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 } });
  t("visão: JSON do snippet → conteudo + raciocinio + usage",
    respostaV.conteudo === "Uma capulana." && respostaV.raciocinio === "Pensei."
    && respostaV.uso?.total_tokens === 13);
  const respostaV2 = analisarRespostaVisao({ choices: [{ message: { content: "só conteúdo" } }] });
  t("visão: sem reasoning/usage → vazio/NULL (nunca inventado)", respostaV2.raciocinio === "" && respostaV2.uso === null);

  const entradaComposta = comporEntradaVetor({ texto: "AI enables robots to perceive", imagem: IMG_DATA });
  t("vetores: composição EXACTA do snippet — texto + data URL na MESMA string com UM espaço",
    entradaComposta === `AI enables robots to perceive ${IMG_DATA}`);
  t("vetores: sem imagem → só o texto", comporEntradaVetor({ texto: "só texto" }) === "só texto");
  let erroEntrada = null;
  try { comporEntradaVetor({ texto: "  ", imagem: " " }); } catch (e) { erroEntrada = e; }
  t("vetores: entrada vazia → erro", erroEntrada instanceof NemotronError);

  const corpoE = construirCorpoVetores([{ texto: "a" }, { texto: "b", imagem: IMG_DATA }]);
  t("vetores: contrato do snippet — encoding float · modality [text_image] · input_type passage · truncate END",
    corpoE.encoding_format === "float" && JSON.stringify(corpoE.modality) === '["text_image"]'
    && corpoE.input_type === "passage" && corpoE.truncate === "END"
    && corpoE.input.length === 2 && corpoE.model === MODELO_EMBED_PADRAO);
  const corpoE2 = construirCorpoVetores([{ texto: "q" }], { inputType: "query", truncate: "START" });
  t("vetores: input_type query + truncate START aceites", corpoE2.input_type === "query" && corpoE2.truncate === "START");
  let erroLote = null;
  try { construirCorpoVetores(new Array(LIMITES_VETORES.ENTRADAS_CAP + 1).fill({ texto: "x" })); } catch (e) { erroLote = e; }
  t("vetores: lote acima do cap → erro", erroLote instanceof NemotronError);

  t("cosseno: paralelos = 1", cosseno([1, 0], [2, 0]) === 1);
  t("cosseno: ortogonais = 0", cosseno([1, 0], [0, 1]) === 0);
  t("cosseno: [1,2]·[2,1] = 0.8", Math.abs(cosseno([1, 2], [2, 1]) - 0.8) < 1e-12);
  t("cosseno: vetor nulo → 0 (convenção declarada)", cosseno([0, 0], [1, 0]) === 0);
  let erroDim = null;
  try { cosseno([1], [1, 2]); } catch (e) { erroDim = e; }
  t("cosseno: dims desiguais → erro", erroDim instanceof NemotronError);

  t("persistência: arredondarVetor a 6 casas", arredondarVetor([0.123456789])[0] === 0.123457);

  const loja = new LojaVetores(3);
  loja.adicionar({ id: "a", rotulo: "Banana", texto: "banana", tipo: "texto", vetor: vetorDe("banana") });
  loja.adicionar({ id: "b", rotulo: "Hotel", texto: "hotel", tipo: "texto", vetor: vetorDe("hotel") });
  loja.adicionar({ id: "c", rotulo: "Capulana", texto: "capulana", tipo: "texto", vetor: vetorDe("capulana") });
  const busca1 = loja.buscarVetor(vetorDe("banana"), { k: 3 });
  t("loja: busca ordena por cosseno DESC", busca1[0].item.rotulo === "Banana" && busca1[0].pontuacao >= busca1[1].pontuacao);
  const busca2 = loja.buscarVetor(vetorDe("banana"), { k: 2 });
  t("loja: k corta os resultados", busca2.length === 2);
  const busca3 = loja.buscarVetor(vetorDe("banana"), { limiar: 0.9 });
  t("loja: limiar filtra", busca3.every((r) => r.pontuacao >= 0.9));
  loja.adicionar({ id: "d", rotulo: "Novo", texto: "novo", tipo: "texto", vetor: vetorDe("novo") });
  t("loja: cap 3 — o mais velho sai primeiro", loja.tamanho === 3 && !loja.listar().some((i) => i.id === "a"));
  t("loja: remover + estatísticas com dimensão real", loja.remover("d") && loja.estatisticas().dimensao === DIM);

  // ── B) Clientes contra mock ──
  console.log("— B) Clientes ↔ upstream mock (formato NVIDIA real)");
  await new Promise((r) => mock.listen(PORTA_MOCK, r));

  const portaoTeste = new PortaoRateLimit(20, 60_000, 0); // intervalo 0 nos testes — o cap 20/min mantém-se
  const clienteVisao = new ClienteNemotronVisao({ endpoint: `http://127.0.0.1:${PORTA_MOCK}/chat/completions`, chave: "mock-chave", tentativas: 2, portao: portaoTeste });
  const eventosV = [];
  const rVisao = await clienteVisao.analisarStream("O que vês?", IMG_DATA, { ...PARAMETROS_VISAO_PADRAO, maxTokens: 256 }, {
    aoEvento: (e) => eventosV.push(e.tipo),
  });
  t("visão stream: conteúdo montado + raciocínio separado",
    rVisao.conteudo.includes("capulana") && rVisao.raciocinio.includes("contornos")
    && !rVisao.conteudo.includes("contornos"));
  t("visão stream: usage REAL + tok/s + ordem de eventos",
    rVisao.uso?.completionTokens > 0 && rVisao.uso?.tokensPorSegundo > 0
    && eventosV.indexOf("raciocinio") < eventosV.indexOf("conteudo") && eventosV[eventosV.length - 1] === "fim");

  const rVisaoJson = await clienteVisao.analisar("Descreve", IMG_DATA, { ...PARAMETROS_VISAO_PADRAO, stream: false });
  t("visão JSON (stream=false do snippet): message.content + reasoning_content + usage",
    rVisaoJson.conteudo.includes("capulana") && rVisaoJson.raciocinio.includes("Analisei") && rVisaoJson.uso?.totalTokens > 0);

  tentativasVisao.set("RETRY", 0);
  const rRetryVisao = await new ClienteNemotronVisao({ endpoint: `http://127.0.0.1:${PORTA_MOCK}/chat/completions`, chave: "k", tentativas: 2, portao: portaoTeste })
    .analisarStream("RETRY_VISAO agora", IMG_DATA, { ...PARAMETROS_VISAO_PADRAO, maxTokens: 64, orcamentoRaciocinio: 0 });
  t("visão retry: 500 na 1.ª tentativa → 2.ª verde (antes do 1.º byte)",
    tentativasVisao.get("RETRY") === 2 && rRetryVisao.conteudo.includes("Vê-se"));

  let erro429V = null;
  try {
    await new ClienteNemotronVisao({ endpoint: `http://127.0.0.1:${PORTA_MOCK}/chat/completions`, chave: "k", tentativas: 1, portao: portaoTeste })
      .analisarStream("SEMPRE_429 por favor", IMG_DATA, { ...PARAMETROS_VISAO_PADRAO, maxTokens: 64, orcamentoRaciocinio: 0 });
  } catch (e) { erro429V = e; }
  t("visão: 429 do upstream → NemotronError estado 429", erro429V instanceof NemotronError && erro429V.estado === 429);

  let erroAuthV = null;
  try {
    await new ClienteNemotronVisao({ endpoint: `http://127.0.0.1:${PORTA_MOCK}/chat/completions`, tentativas: 1, portao: portaoTeste })
      .analisarStream("sem chave", IMG_DATA, { ...PARAMETROS_VISAO_PADRAO, maxTokens: 64, orcamentoRaciocinio: 0 });
  } catch (e) { erroAuthV = e; }
  t("visão: 401 sem autorização → erro honesto", erroAuthV instanceof NemotronError && erroAuthV.estado === 401);

  const controladorAbort = new AbortController();
  const rAbortada = await clienteVisao.analisarStream("LENTO por favor", IMG_DATA, { ...PARAMETROS_VISAO_PADRAO, maxTokens: 64, orcamentoRaciocinio: 0 }, {
    sinal: controladorAbort.signal,
    aoEvento: (e) => { if (e.tipo === "conteudo" && e.texto.includes("dois")) controladorAbort.abort(); },
  });
  t("visão: abort a meio → parado honesto + conteúdo parcial", rAbortada.parado === true && rAbortada.conteudo.length > 0 && rAbortada.conteudo.length < 40);

  // imagem https → data URL (o caminho EXACTO do snippet: descarrega e base64a)
  const dataUrlMock = await imagemParaDataUrl(`http://127.0.0.1:${PORTA_MOCK}/img.png`);
  t("vetores: imagem https → data URL base64 com o MIME real", dataUrlMock.startsWith("data:image/png;base64,"));
  let erroImg404 = null;
  try { await imagemParaDataUrl(`http://127.0.0.1:${PORTA_MOCK}/img-404`); } catch (e) { erroImg404 = e; }
  t("vetores: imagem 404 → erro honesto", erroImg404 instanceof NemotronError && erroImg404.message.includes("404"));

  const clienteVet = new ClienteNemotronVetores({ endpoint: `http://127.0.0.1:${PORTA_MOCK}/embeddings`, chave: "mock-chave", tentativas: 2, portao: portaoTeste });
  const rVet = await clienteVet.vetorizar([{ texto: "banana madura" }, { texto: "hotel", imagem: IMG_DATA }], { inputType: "passage" });
  t("vetores: 2 embeddings na ordem do input + dimensão real",
    rVet.vetores.length === 2 && rVet.dimensao === DIM && rVet.vetores[0].every(Number.isFinite));
  t("vetores: usage real do upstream", rVet.uso?.totalTokens === 24);
  t("vetores: o input chegou ao upstream COMPOSTO (texto + data URL na mesma string)",
    ultimoCorpoEmbed?.input?.[1] === `hotel ${IMG_DATA}` && ultimoCorpoEmbed.modality?.[0] === "text_image" && ultimoCorpoEmbed.truncate === "END");

  tentativasEmbed.set("RETRY", 0);
  const rRetryVet = await new ClienteNemotronVetores({ endpoint: `http://127.0.0.1:${PORTA_MOCK}/embeddings`, chave: "k", tentativas: 2 })
    .vetorizar([{ texto: "RETRY_EMBED agora" }]);
  t("vetores retry: 500 na 1.ª → 2.ª verde", tentativasEmbed.get("RETRY") === 2 && rRetryVet.dimensao === DIM);

  let erro429E = null;
  try {
    await new ClienteNemotronVetores({ endpoint: `http://127.0.0.1:${PORTA_MOCK}/embeddings`, chave: "k", tentativas: 1 })
      .vetorizar([{ texto: "SEMPRE_429 embed" }]);
  } catch (e) { erro429E = e; }
  t("vetores: 429 → NemotronError estado 429", erro429E instanceof NemotronError && erro429E.estado === 429);

  let erroDims = null;
  try { validarRespostaVetores({ data: [{ embedding: [1, 0] }, { embedding: [1] }] }); } catch (e) { erroDims = e; }
  t("vetores: dims desiguais na resposta → erro honesto", erroDims instanceof NemotronError);
  let erroNan = null;
  try { validarRespostaVetores({ data: [{ embedding: [1, "x"] }] }); } catch (e) { erroNan = e; }
  t("vetores: valor não-finito → erro honesto", erroNan instanceof NemotronError);

  // ── C) Proxy REAL ──
  console.log("— C) Proxy real (server/ia-proxy.mjs)");
  const proxyEnv = {
    IA_PORTA: String(PORTA_PROXY), IA_UPSTREAM: `http://127.0.0.1:${PORTA_MOCK}`,
    IA_NEMOTRON_KEY: "chave-do-env-teste", IA_FICHAS_CAPACIDADE: "100",
  };
  const proxyProc = correr("node", ["server/ia-proxy.mjs"], proxyEnv);
  t("proxy: sobe e responde à saúde", await esperarAte(`http://127.0.0.1:${PORTA_PROXY}/api/ia/saude`, (r) => r.status === 200, 8000));

  const saude = await (await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/saude`)).json();
  t("saúde: v55 com as TRÊS rotas e chave OCULTA (zero furo)",
    saude.chaveConfigurada === true && !JSON.stringify(saude).includes("chave-do-env-teste")
    && /^v5[5-9]$/.test(String(saude.versão)) // v56+ não quebra esta suíte (padrão v54→v55)
    && JSON.stringify(saude.rotas ?? []).includes("/api/ia/chat")
    && JSON.stringify(saude.rotas ?? []).includes("/api/ia/visao")
    && JSON.stringify(saude.rotas ?? []).includes("/api/ia/vetores"));

  const corpoChat = JSON.stringify({ model: "nvidia/nemotron-3-ultra-550b-a55b", messages: [{ role: "user", content: "olá" }], temperature: 1, max_tokens: 64, chat_template_kwargs: { enable_thinking: true } });
  const rChat = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoChat });
  const textoChat = await rChat.text();
  t("proxy: rota do CHAT v54 intacta (SSE intato com auth injetada)",
    rChat.status === 200 && textoChat.includes("reasoning_content") && textoChat.includes("[DONE]"));

  const corpoVisao = JSON.stringify(construirCorpoVisao("O que vês?", IMG_DATA, { ...PARAMETROS_VISAO_PADRAO, maxTokens: 256 }));
  const rVisaoProxy = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/visao`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoVisao });
  const textoVisao = await rVisaoProxy.text();
  t("proxy: visão stream=true → SSE intato (reasoning + [DONE])",
    rVisaoProxy.status === 200 && (rVisaoProxy.headers.get("content-type") ?? "").includes("text/event-stream")
    && textoVisao.includes("reasoning_content") && textoVisao.includes("capulana") && textoVisao.trimEnd().endsWith("[DONE]"));

  const corpoVisaoJson = JSON.stringify(construirCorpoVisao("Descreve", IMG_DATA, { ...PARAMETROS_VISAO_PADRAO, stream: false, maxTokens: 256 }));
  const rVisaoJsonProxy = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/visao`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoVisaoJson });
  const jsonVisaoProxy = await rVisaoJsonProxy.json();
  t("proxy: visão stream=false → JSON intato (message.content)",
    rVisaoJsonProxy.status === 200 && (rVisaoJsonProxy.headers.get("content-type") ?? "").includes("application/json")
    && jsonVisaoProxy?.choices?.[0]?.message?.content?.includes("capulana"));

  // imagem base64 GRANDE (~400 KB) → passa o cap de 8 MB (o de 256 KB era do chat)
  const b64Grande = IMG_B64.repeat(1000).slice(0, 300_000);
  const corpoImagemGrande = JSON.stringify(construirCorpoVisao("Muitos píxeis", `data:image/png;base64,${b64Grande}`, { ...PARAMETROS_VISAO_PADRAO, maxTokens: 64, orcamentoRaciocinio: 0 }));
  const rGrande = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/visao`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoImagemGrande });
  await rGrande.text();
  t("proxy: imagem base64 ~300 KB passa no cap de 8 MB", rGrande.status === 200);
  const b64Gigante = "A".repeat(9 * 1024 * 1024);
  const corpoGigante = JSON.stringify({
    model: MODELO_VISAO_PADRAO,
    messages: [{ role: "user", content: [{ type: "text", text: "x" }, { type: "image_url", image_url: { url: `data:image/png;base64,${b64Gigante}` } }] }],
  });
  const r413 = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/visao`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoGigante });
  t("proxy: corpo > 8 MB → 413", r413.status === 413);

  const corpoVisaoVazio = JSON.stringify({ model: MODELO_VISAO_PADRAO, messages: [{ role: "user", content: [{ type: "text", text: "" }, { type: "image_url", image_url: { url: IMG_DATA } }] }] });
  const r400Visao = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/visao`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoVisaoVazio });
  t("proxy visão: pergunta vazia → 400", r400Visao.status === 400);
  const corpoVisaoFile = JSON.stringify({ model: MODELO_VISAO_PADRAO, messages: [{ role: "user", content: [{ type: "text", text: "x" }, { type: "image_url", image_url: { url: "file:///etc/passwd" } }] }] });
  const r400VisaoB = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/visao`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoVisaoFile });
  t("proxy visão: imagem file:// → 400", r400VisaoB.status === 400);
  const corpoVisaoBudget = JSON.stringify(construirCorpoVisao("x", IMG_DATA, { ...PARAMETROS_VISAO_PADRAO, orcamentoRaciocinio: 0, maxTokens: 64 }) ) ;
  const comBudget = JSON.parse(corpoVisaoBudget); comBudget.reasoning_budget = 999_999;
  const r400VisaoC = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/visao`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(comBudget) });
  t("proxy visão: reasoning_budget acima do cap do snippet → 400", r400VisaoC.status === 400);

  const corpoVetores = JSON.stringify(construirCorpoVetores([{ texto: "banana" }, { texto: "capulana" }]));
  const rVetores = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/vetores`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoVetores });
  const jsonVetores = await rVetores.json();
  t("proxy: vetores → JSON intato com data[] na ordem",
    rVetores.status === 200 && jsonVetores?.data?.length === 2 && jsonVetores.data[0].embedding.length === DIM);
  const r400Vet = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/vetores`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: MODELO_EMBED_PADRAO, input: ["x"], input_type: "híbrido" }) });
  t("proxy vetores: input_type inválido → 400", r400Vet.status === 400);
  const r400VetB = await fetch(`http://127.0.0.1:${PORTA_PROXY}/api/ia/vetores`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: MODELO_EMBED_PADRAO, input: new Array(9).fill("x") }) });
  t("proxy vetores: 9 entradas → 400", r400VetB.status === 400);
  const r404 = await fetch(`http://127.0.0.1:${PORTA_PROXY}/outra-coisa`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  t("proxy: rota desconhecida → 404", r404.status === 404);

  // modo SEM chave → 503 nas TRÊS rotas
  correr("node", ["server/ia-proxy.mjs"], { IA_PORTA: String(PORTA_PROXY_SEM_CHAVE), IA_UPSTREAM: `http://127.0.0.1:${PORTA_MOCK}`, IA_ENVFILE: "none" });
  t("proxy sem chave: sobe", await esperarAte(`http://127.0.0.1:${PORTA_PROXY_SEM_CHAVE}/api/ia/saude`, (r) => r.status === 200, 8000));
  const r503a = await fetch(`http://127.0.0.1:${PORTA_PROXY_SEM_CHAVE}/api/ia/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoChat });
  const r503b = await fetch(`http://127.0.0.1:${PORTA_PROXY_SEM_CHAVE}/api/ia/visao`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoVisao });
  const r503c = await fetch(`http://127.0.0.1:${PORTA_PROXY_SEM_CHAVE}/api/ia/vetores`, { method: "POST", headers: { "content-type": "application/json" }, body: corpoVetores });
  t("proxy sem chave → 503 honesto nas 3 rotas", r503a.status === 503 && r503b.status === 503 && r503c.status === 503);

  // rate-limit: fichas padrão (6) → 7.º POST é 429
  correr("node", ["server/ia-proxy.mjs"], { IA_PORTA: String(PORTA_PROXY_RATE), IA_UPSTREAM: `http://127.0.0.1:${PORTA_MOCK}`, IA_NEMOTRON_KEY: "k" });
  t("proxy rate: sobe", await esperarAte(`http://127.0.0.1:${PORTA_PROXY_RATE}/api/ia/saude`, (r) => r.status === 200, 8000));
  let ultimoEstado = 0, retryAfter = null;
  for (let i = 0; i < 7; i++) {
    const r = await fetch(`http://127.0.0.1:${PORTA_PROXY_RATE}/api/ia/vetores`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: MODELO_EMBED_PADRAO, input: [`x${i}`] }) });
    ultimoEstado = r.status;
    retryAfter = r.headers.get("retry-after");
    await r.text().catch(() => "");
  }
  t("rate-limit do proxy: 7.º pedido → 429 com Retry-After", ultimoEstado === 429 && Number(retryAfter) > 0);

  // ═══ D) E2E Playwright ═══
  if (SEM_E2E) {
    skip("E2E (browser)", "--sem-e2e");
  } else {
    console.log("— D) E2E Playwright (/ia abas ver + buscar)");
    let chromium = null;
    try { ({ chromium } = await import("playwright")); } catch {}
    if (!chromium) {
      skip("E2E (browser)", "playwright indisponível");
    } else {
      const viteEnv = {
        VITE_IA_ENDPOINT: `http://127.0.0.1:${PORTA_PROXY}/api/ia/chat`,
        VITE_IA_ENDPOINT_VISAO: `http://127.0.0.1:${PORTA_PROXY}/api/ia/visao`,
        VITE_IA_ENDPOINT_VETORES: `http://127.0.0.1:${PORTA_PROXY}/api/ia/vetores`,
      };
      const vite = correr("npx", ["vite", "--port", "8099", "--strictPort"], viteEnv);
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
      t("três abas presentes (conversar · ver · buscar)",
        await page.getByTestId("ia-aba-conversar").isVisible().catch(() => false)
        && await page.getByTestId("ia-aba-ver").isVisible().catch(() => false)
        && await page.getByTestId("ia-aba-buscar").isVisible().catch(() => false));

      // fumo do chat v54 pela rota intacta
      await page.getByTestId("ia-caixa").fill("Diz olá");
      await page.getByTestId("ia-enviar").click();
      const chatChegou = await page.waitForFunction(
        () => document.querySelector("[data-testid^=ia-conteudo]")?.textContent?.includes("mock v55"),
        null, { timeout: 25000 },
      ).then(() => true).catch(() => false);
      t("chat v54 continua a fluir (regressão)", chatChegou);

      // ── ABA VER: visão em streaming vivo ──
      await page.getByTestId("ia-aba-ver").click();
      await page.getByTestId("ia-ver-pergunta").waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      t("aba Ver abre com a pergunta", await page.getByTestId("ia-ver-pergunta").isVisible().catch(() => false));

      await page.getByTestId("ia-ver-url").fill(IMG_DATA);
      await page.getByTestId("ia-ver-pergunta").fill("O que vês nesta imagem?");
      await page.getByTestId("ia-ver-analisar").click();
      const visaoChegou = await page.waitForFunction(
        () => document.querySelector("[data-testid^=ia-conteudo]")?.textContent?.includes("capulana"),
        null, { timeout: 25000 },
      ).then(() => true).catch(() => false);
      t("visão: resposta em streaming chega (proxy+mock reais)", visaoChegou);
      const racVisao = await page.locator("[data-testid^=ia-raciocinio]").first().isVisible().catch(() => false);
      t("visão: painel de pensamento com o raciocínio", racVisao);
      const statsVisao = await page.getByTestId("ia-ver-stats").textContent().catch(() => "");
      t("visão: stats com usage real", /\d+/.test(statsVisao));

      try {
        mkdirSync(join(RAIZ, "shots-v55"), { recursive: true });
        await page.screenshot({ path: join(RAIZ, "shots-v55", "ia-ver.png"), fullPage: false });
        console.log("    📸 shots-v55/ia-ver.png");
      } catch {}

      // erro honesto: imagem ilegal (file://) — validação no núcleo, zero rede
      await page.getByTestId("ia-ver-url").fill("file:///etc/passwd");
      await page.getByTestId("ia-ver-analisar").click();
      const erroVisao = await page.waitForFunction(
        () => !!document.querySelector("[data-testid=ia-ver-erro]"),
        null, { timeout: 10000 },
      ).then(() => true).catch(() => false);
      t("visão: URL ilegal → banner de erro honesto", erroVisao);

      // ── ABA BUSCAR: memória semântica com vetores do mock ──
      await page.getByTestId("ia-aba-buscar").click();
      await page.getByTestId("ia-buscar-rotulo").waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      t("aba Buscar abre", await page.getByTestId("ia-buscar-rotulo").isVisible().catch(() => false));

      const ITENS = [
        ["Banana de Maputo", "banana madura do mercado central"],
        ["Hotel em Pemba", "hotel à beira-mar com quartos com vista"],
        ["Capulana tecida", "capulana tradicional tecida à mão"],
      ];
      for (let idx = 0; idx < ITENS.length; idx++) {
        await page.getByTestId("ia-buscar-rotulo").fill(ITENS[idx][0]);
        await page.getByTestId("ia-buscar-texto").fill(ITENS[idx][1]);
        await page.getByTestId("ia-buscar-indexar-botao").click();
        await page.waitForFunction(
          (n) => document.querySelectorAll("[data-testid=ia-buscar-item]").length >= n,
          idx + 1,
          { timeout: 15000 },
        ).catch(() => {});
      }
      const itensNaLoja = await page.locator("[data-testid=ia-buscar-item]").count().catch(() => 0);
      t("buscar: 3 itens indexados (vetores do mock reais)", itensNaLoja === 3, `itens=${itensNaLoja}`);
      const dimChip = await page.getByTestId("ia-buscar-dim").textContent().catch(() => "");
      t("buscar: chip de dimensão real", /\d+/.test(dimChip));

      await page.getByTestId("ia-buscar-consulta").fill("banana");
      await page.getByTestId("ia-buscar-buscar-botao").click();
      const resultado0 = await page.waitForFunction(
        () => document.querySelector("[data-testid=ia-buscar-resultado-0]")?.textContent ?? "",
        null, { timeout: 15000 },
      ).then((h) => String(h)).catch(() => "");
      t("buscar: 1.º resultado é a Banana (significado, não palavras soltas)", resultado0.includes("Banana"), resultado0.slice(0, 80));
      const score0 = parseFloat(await page.getByTestId("ia-buscar-score-0").textContent().catch(() => "0")) || 0;
      const score1 = parseFloat(await page.getByTestId("ia-buscar-score-1").textContent().catch(() => "0")) || 0;
      t("buscar: pontuações ordenadas por cosseno", score0 >= score1, `s0=${score0} s1=${score1}`);

      await page.getByTestId("ia-buscar-sim-a").fill("banana amarela madura");
      await page.getByTestId("ia-buscar-sim-b").fill("banana verde pequena");
      await page.getByTestId("ia-buscar-sim-botao").click();
      const simTexto = await page.waitForFunction(
        () => document.querySelector("[data-testid=ia-buscar-sim-valor]")?.textContent ?? "",
        null, { timeout: 15000 },
      ).then((h) => String(h)).catch(() => "");
      const simPct = parseFloat(simTexto) || 0;
      t("similaridade: cosseno real entre dois textos (alto, mesmo campo semântico)", simPct > 30, `texto="${simTexto}"`);

      try {
        mkdirSync(join(RAIZ, "shots-v55"), { recursive: true });
        await page.screenshot({ path: join(RAIZ, "shots-v55", "ia-buscar.png"), fullPage: false });
        console.log("    📸 shots-v55/ia-buscar.png");
      } catch {}

      const errosLimpos = consoleErros.filter((e) => !NOISE.some((n) => e.includes(n)));
      t("zero erros de console não-ruidosos", errosLimpos.length === 0, errosLimpos.slice(0, 3).join(" | "));

      await browser.close();
      try { vite.kill("SIGKILL"); } catch {}
    }
  }

  // ═══ E) LIVE NVIDIA (skippável honesta) ═══
  console.log("— E) LIVE NVIDIA (visão + embeddings mínimos)");
  let chaveLive = null;
  try { chaveLive = readFileSync(join(RAIZ, ".env.ia"), "utf8").match(/IA_NEMOTRON_KEY=(\S+)/)?.[1] ?? null; } catch {}
  if (!chaveLive) {
    skip("live NVIDIA", "sem .env.ia");
  } else {
    // visão: a imagem EXACTA do snippet do utilizador
    try {
      const controladorLive = new AbortController();
      const temporizador = setTimeout(() => controlador.abort(), 45_000);
      const rLive = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${chaveLive}` },
        body: JSON.stringify({
          model: MODELO_VISAO_PADRAO,
          messages: [{ role: "user", content: [
            { type: "text", text: "What is in this image? Answer in one short sentence." },
            { type: "image_url", image_url: { url: "https://assets.ngc.nvidia.com/products/api-catalog/phi-3-5-vision/example1b.jpg" } },
          ] }],
          temperature: 0.6, top_p: 0.95, max_tokens: 2048, stream: false,
          reasoning_budget: 16384,
        }),
        signal: controladorLive.signal,
      });
      clearTimeout(temporizador);
      if (!rLive.ok) {
        skip("live VISÃO", `HTTP ${rLive.status} (chave/modelo/rede do sandbox)`);
        await rLive.body?.cancel().catch(() => {});
      } else {
        const json = await rLive.json();
        const resposta = analisarRespostaVisao(json);
        t("live VISÃO: a NVIDIA descreveu a imagem do snippet", resposta.conteudo.trim().length > 0, `conteúdo="${resposta.conteudo.slice(0, 100)}"`);
        console.log(`    live visão: conteúdo="${resposta.conteudo.slice(0, 140)}" rac=${resposta.raciocinio.length} chars uso=${JSON.stringify(resposta.uso)}`);
      }
    } catch (e) {
      skip("live VISÃO", `rede/timeout do sandbox: ${String(e?.message ?? e).slice(0, 60)}`);
    }

    // embeddings: a MESMA frase + formato do snippet (passage · truncate END)
    try {
      const controladorLive = new AbortController();
      const temporizador = setTimeout(() => controlador.abort(), 45_000);
      const rLive2 = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${chaveLive}` },
        body: JSON.stringify({
          input: ["AI enables robots to perceive, plan, and act autonomously."],
          model: MODELO_EMBED_PADRAO,
          encoding_format: "float",
          modality: ["text_image"],
          input_type: "passage",
          truncate: "END",
        }),
        signal: controladorLive.signal,
      });
      clearTimeout(temporizador);
      if (!rLive2.ok) {
        skip("live VETORES", `HTTP ${rLive2.status} (chave/modelo/rede do sandbox)`);
        await rLive2.body?.cancel().catch(() => {});
      } else {
        const json = await rLive2.json();
        const r = validarRespostaVetores(json);
        t("live VETORES: embedding REAL com dimensão consistente", r.vetores.length === 1 && r.dimensao > 0 && r.vetores[0].every(Number.isFinite), `dim=${r.dimensao}`);
        console.log(`    live vetores: dim=${r.dimensao} primeiros=${r.vetores[0].slice(0, 4).map((x) => x.toFixed(4)).join(", ")}…`);
      }
    } catch (e) {
      skip("live VETORES", `rede/timeout do sandbox: ${String(e?.message ?? e).slice(0, 60)}`);
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
