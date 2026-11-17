// ═══════════════════════════════════════════════════════════════════════
// v54 — IA NEMOTRON — PROXY LOCAL (dev/testes)
// v55 — ROTAS NOVAS: /api/ia/visao (content parts multimodais, o snippet
//       do olho) e /api/ia/vetores (embeddings multimodais, o snippet da
//       memória) — e cap de corpo 8 MB nas rotas com imagem (base64 é
//       pesado — o chat mantém os 256 KB originais).
// v56 — RAG: sem rotas novas (reusa chat + vetores); a versão sobe para a
//       saúde declarar a geração (o teste da v56 valida, os antigos
//       aceitam v54–v56).
// v57 — NPC NA PRAÇA: sem rotas novas também (o NPC fala com o chat v54
//       pela MESMA rota /api/ia/chat); a versão sobe para a saúde
//       declarar a geração (o teste v57 valida, os antigos aceitam v54+).
// v58 — HISTÓRICO NO SERVIDOR: sem rotas novas AQUI (o histórico corre no
//       Supabase ia_historico com RLS — browser → PostgREST com o JWT do
//       utilizador; o proxy não vê esses pedidos); a versão sobe para a
//       saúde declarar a geração (o teste v58 valida, os antigos aceitam
//       v54+ / v56+).
//
// O browser NUNCA fala directamente com a NVIDIA (nem conhece a chave).
// Em produção as edge functions `nemotron-chat`/`nemotron-visao`/
// `nemotron-embed` (Supabase) fazem o mesmo papel com a chave em segredo
// do Deno; em dev/testes este proxy corre local:
//   node server/ia-proxy.mjs
//   IA_UPSTREAM=http://127.0.0.1:9001  node server/ia-proxy.mjs   (mock p/ testes)
//
// A chave vem de: env IA_NEMOTRON_KEY (prod/testes) ou do ficheiro .env.ia
// (gitignored — nunca commitada). A resposta do upstream é TUBO puro
// (byte a byte, SSE ou JSON) — o proxy não altera nem finge nada.
// Limites honestos: rate-limit por IP (balde de fichas, único para as 3
// rotas — declarado), corpo cap por rota, timeout de ligação 30 s,
// desconexão do cliente PROPAGADA ao upstream (não há tokens pagos
// escondidos).
// ═══════════════════════════════════════════════════════════════════════

import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, "..");

const PORTA = Number(process.env.IA_PORTA || 8788);
const UPSTREAM = (process.env.IA_UPSTREAM || "https://integrate.api.nvidia.com/v1").replace(/\/+$/, "");
const MODELO_PADRAO = process.env.IA_MODELO || "nvidia/nemotron-3-ultra-550b-a55b";
const MODELO_VISAO_PADRAO = process.env.IA_MODELO_VISAO || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
const MODELO_EMBED_PADRAO = process.env.IA_MODELO_EMBED || "nvidia/nemotron-3.5-embed-8b";
const ORIGEM_CORS = process.env.IA_CORS_ORIGEM || "*";
const CHAT_PATH = process.env.IA_CHAT_PATH || "/chat/completions";
const EMBED_PATH = process.env.IA_EMBED_PATH || "/embeddings";
const LIGACAO_TIMEOUT_MS = Number(process.env.IA_LIGACAO_TIMEOUT_MS || 30_000);
const CORPO_CAP = 256 * 1024;          // chat: texto puro
const CORPO_CAP_IMAGEM = 8 * 1024 * 1024; // visão/vetores: imagens base64 (honesto e declarado)
const SAUDE_PATH = "/api/ia/saude";
const CHAT_ENDPOINT = "/api/ia/chat";
const VISAO_ENDPOINT = "/api/ia/visao";
const VETORES_ENDPOINT = "/api/ia/vetores";

// Rate limit por IP: balde de fichas — capacidade 6, recarga 12/min (média 0,2/s).
const FICHAS_CAPACIDADE = Number(process.env.IA_FICHAS_CAPACIDADE || 6);
const FICHAS_RECARGA_POR_MIN = Number(process.env.IA_FICHAS_RECARGA_POR_MIN || 12);

function carregarChave() {
  const doEnv = process.env.IA_NEMOTRON_KEY || process.env.IA_UPSTREAM_KEY;
  if (doEnv) return doEnv;
  // IA_ENVFILE: caminho alternativo do ficheiro de segredos (testes usam
  // IA_ENVFILE=/inexistente para provar o modo 503 sem chave — honesto).
  const ficheiro = process.env.IA_ENVFILE || join(RAIZ, ".env.ia");
  if (ficheiro === "none") return null;
  if (existsSync(ficheiro)) {
    try {
      for (const linha of readFileSync(ficheiro, "utf8").split(/\r?\n/)) {
        const m = linha.match(/^\s*IA_NEMOTRON_KEY\s*=\s*(.+)\s*$/);
        if (m) return m[1];
      }
    } catch {}
  }
  return null;
}

const CHAVE = carregarChave();

function log(...args) {
  console.log(new Date().toISOString().slice(11, 19), "[ia-proxy]", ...args);
}

// ── Rate limit (balde de fichas por IP) ─────────────────────────────────
const baldes = new Map();
function fichas(ip) {
  const agora = Date.now();
  let balde = baldes.get(ip);
  if (!balde) { balde = { fichas: FICHAS_CAPACIDADE, ultima: agora }; baldes.set(ip, balde); }
  const recarga = ((agora - balde.ultima) / 60_000) * FICHAS_RECARGA_POR_MIN;
  balde.fichas = Math.min(FICHAS_CAPACIDADE, balde.fichas + recarga);
  balde.ultima = agora;
  if (balde.fichas < 1) {
    const esperaMs = ((1 - balde.fichas) / FICHAS_RECARGA_POR_MIN) * 60_000;
    return { ok: false, esperaMs: Math.ceil(esperaMs) };
  }
  balde.fichas -= 1;
  if (baldes.size > 10_000) baldes.clear(); // honesto: cap de memória
  return { ok: true, esperaMs: 0 };
}

// ── Validação do corpo do CHAT (regras isomórficas v54 — intactas) ──────
const LIMITES = { MENSAGENS_CAP: 40, CONTEUDO_CAP: 32_000, MAX_TOKENS_CAP: 16384 };
function validarCorpo(corpo) {
  if (!corpo || typeof corpo !== "object") return "corpo tem de ser JSON objecto";
  if (!Array.isArray(corpo.messages) || !corpo.messages.length) return "messages tem de ser um array não-vazio";
  if (corpo.messages.length > LIMITES.MENSAGENS_CAP) return `máximo ${LIMITES.MENSAGENS_CAP} mensagens`;
  for (const m of corpo.messages) {
    if (!m || (m.role !== "system" && m.role !== "user" && m.role !== "assistant")) return `papel inválido: ${String(m?.role)}`;
    if (typeof m.content !== "string" || !m.content.length) return "content vazio";
    if (m.content.length > LIMITES.CONTEUDO_CAP) return `content excede ${LIMITES.CONTEUDO_CAP} caracteres`;
  }
  if (typeof corpo.model !== "string" || !corpo.model) return "model em falta";
  for (const [k, max, min] of [["temperature", 2, 0], ["top_p", 1, 0], ["max_tokens", LIMITES.MAX_TOKENS_CAP, 1]]) {
    if (corpo[k] === undefined) continue;
    const n = Number(corpo[k]);
    if (!Number.isFinite(n) || n < min || n > max) return `${k} fora dos limites [${min}, ${max}]`;
  }
  return null;
}

// ── Validação da VISÃO (a MESMA forma WIRE que o núcleo envia — v55) ────
const LIMITES_VISAO = { PERGUNTA_CAP: 4_000, IMAGEM_CAP: 12_000_000, MAX_TOKENS_CAP: 65_536, ORCAMENTO_CAP: 16_384, PARTES_CAP: 4 };
function imagemValida(imagem) {
  return typeof imagem === "string" && imagem.length <= LIMITES_VISAO.IMAGEM_CAP &&
    (/^https?:\/\/[^\s"'<>\\]+$/i.test(imagem) ||
     /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/i.test(imagem));
}
function validarCorpoVisao(corpo) {
  if (!corpo || typeof corpo !== "object") return "corpo tem de ser JSON objecto";
  if (!Array.isArray(corpo.messages) || corpo.messages.length !== 1) return "visão: 1 mensagem com content parts";
  const msg = corpo.messages[0];
  if (msg?.role !== "user") return "visão: papel user";
  const partes = msg?.content;
  if (!Array.isArray(partes) || partes.length < 2 || partes.length > LIMITES_VISAO.PARTES_CAP) {
    return `visão: content parts [text, image_url] (1..${LIMITES_VISAO.PARTES_CAP})`;
  }
  const texto = partes[0];
  if (texto?.type !== "text" || typeof texto.text !== "string" || !texto.text.trim()) return "visão: parte text em falta";
  if (texto.text.length > LIMITES_VISAO.PERGUNTA_CAP) return `visão: pergunta excede ${LIMITES_VISAO.PERGUNTA_CAP} caracteres`;
  for (const parte of partes.slice(1)) {
    if (parte?.type !== "image_url" || !imagemValida(parte?.image_url?.url)) {
      return "visão: imagem tem de ser https://… ou data:image/…;base64,…";
    }
  }
  if (typeof corpo.model !== "string" || !corpo.model) return "model em falta";
  for (const [k, max, min] of [
    ["temperature", 2, 0], ["top_p", 1, 0], ["max_tokens", LIMITES_VISAO.MAX_TOKENS_CAP, 1], ["reasoning_budget", LIMITES_VISAO.ORCAMENTO_CAP, 0],
  ]) {
    if (corpo[k] === undefined) continue;
    const n = Number(corpo[k]);
    if (!Number.isFinite(n) || n < min || n > max) return `${k} fora dos limites [${min}, ${max}]`;
  }
  if (corpo.stream !== undefined && typeof corpo.stream !== "boolean") return "stream tem de ser boolean";
  return null;
}

// ── Validação dos VETORES (a MESMA forma WIRE que o núcleo envia — v55) ─
const LIMITES_VETORES = { ENTRADAS_CAP: 8, ENTRADA_CAP: 12_000_000 };
function validarCorpoVetores(corpo) {
  if (!corpo || typeof corpo !== "object") return "corpo tem de ser JSON objecto";
  if (!Array.isArray(corpo.input) || !corpo.input.length) return "input tem de ser um array não-vazio";
  if (corpo.input.length > LIMITES_VETORES.ENTRADAS_CAP) return `máximo ${LIMITES_VETORES.ENTRADAS_CAP} entradas`;
  for (const s of corpo.input) {
    if (typeof s !== "string" || !s.trim()) return "entrada vazia";
    if (s.length > LIMITES_VETORES.ENTRADA_CAP) return `entrada excede ${LIMITES_VETORES.ENTRADA_CAP} caracteres`;
  }
  if (typeof corpo.model !== "string" || !corpo.model) return "model em falta";
  if (corpo.encoding_format !== undefined && corpo.encoding_format !== "float") return "encoding_format tem de ser float";
  if (corpo.input_type !== undefined && corpo.input_type !== "query" && corpo.input_type !== "passage") return "input_type tem de ser query|passage";
  if (corpo.truncate !== undefined && !["NONE", "END", "START"].includes(corpo.truncate)) return "truncate tem de ser NONE|END|START";
  return null;
}

function cabecalhosCors() {
  return {
    "Access-Control-Allow-Origin": ORIGEM_CORS,
    "Access-Control-Allow-Headers": "authorization, content-type, x-bateu-ia",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function json(res, estado, obj) {
  res.writeHead(estado, { "Content-Type": "application/json; charset=utf-8", ...cabecalhosCors() });
  res.end(JSON.stringify(obj));
}

// Reencaminhamento TUBO puro (byte a byte) — partilhado pelas 3 rotas.
async function encaminhar(req, res, cru, caminhoUpstream, accept, ip) {
  const controlador = new AbortController();
  req.on("close", () => { if (!res.writableEnded) controlador.abort(); });
  const tempoLigacao = setTimeout(() => controlador.abort(), LIGACAO_TIMEOUT_MS);

  let respostaUpstream;
  try {
    respostaUpstream = await fetch(UPSTREAM + caminhoUpstream, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: accept,
        Authorization: `Bearer ${CHAVE}`,
      },
      body: cru,
      signal: controlador.signal,
    });
  } catch (err) {
    clearTimeout(tempoLigacao);
    log("erro de ligação ao upstream:", err?.name === "AbortError" ? "timeout/desconexão" : String(err?.message ?? err));
    if (!res.headersSent) json(res, 502, { erro: "upstream inacessível — " + (err?.name === "AbortError" ? "timeout" : String(err?.message ?? err).slice(0, 200)) });
    return;
  }
  clearTimeout(tempoLigacao);

  const tipoEsperado = accept === "text/event-stream" ? "text/event-stream" : accept;
  const cabecalhos = { "Content-Type": respostaUpstream.headers.get("content-type") || tipoEsperado, "Cache-Control": "no-store", ...cabecalhosCors() };
  res.writeHead(respostaUpstream.status, cabecalhos);

  if (!respostaUpstream.body) { res.end(); return; }
  const leitor = respostaUpstream.body.getReader();
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      if (!res.write(value)) await new Promise((r) => res.once("drain", r));
    }
    res.end();
    log("stream concluído", respostaUpstream.status, `${caminhoUpstream}`, `ip=${ip.slice(-8)}`);
  } catch (err) {
    log("stream interrompido:", String(err?.message ?? err).slice(0, 120));
    res.end();
  }
}

const servidor = http.createServer(async (req, res) => {
  const url = (req.url || "").split("?")[0];
  const ip = req.socket.remoteAddress || "?";

  if (req.method === "OPTIONS") {
    res.writeHead(204, cabecalhosCors());
    res.end();
    return;
  }

  // Saúde — NUNCA devolve a chave, só a sua PRESENÇA (honesto).
  if (req.method === "GET" && url === SAUDE_PATH) {
    json(res, 200, {
      ok: true,
      serviço: "bateu-ia-proxy",
      versão: "v58",
      upstream: UPSTREAM.replace(/\/\/[^/]+@/, "//***@") + CHAT_PATH,
      chaveConfigurada: !!CHAVE,
      modelosPadrao: { chat: MODELO_PADRAO, visao: MODELO_VISAO_PADRAO, vetores: MODELO_EMBED_PADRAO },
      rotas: [CHAT_ENDPOINT, VISAO_ENDPOINT, VETORES_ENDPOINT, SAUDE_PATH],
      limites: { fichas: FICHAS_CAPACIDADE, recargaPorMin: FICHAS_RECARGA_POR_MIN, corpoCap: CORPO_CAP, corpoCapImagem: CORPO_CAP_IMAGEM },
    });
    return;
  }

  const rota =
    url === CHAT_ENDPOINT ? { caminho: CHAT_PATH, cap: CORPO_CAP, validar: validarCorpo, accept: "text/event-stream", modelo: MODELO_PADRAO } :
    url === VISAO_ENDPOINT ? { caminho: CHAT_PATH, cap: CORPO_CAP_IMAGEM, validar: validarCorpoVisao, accept: null, modelo: MODELO_VISAO_PADRAO } :
    url === VETORES_ENDPOINT ? { caminho: EMBED_PATH, cap: CORPO_CAP_IMAGEM, validar: validarCorpoVetores, accept: "application/json", modelo: MODELO_EMBED_PADRAO } :
    null;

  if (req.method !== "POST" || !rota) {
    json(res, 404, { erro: `só POST ${CHAT_ENDPOINT}, ${VISAO_ENDPOINT}, ${VETORES_ENDPOINT} e GET ${SAUDE_PATH}` });
    return;
  }

  if (!CHAVE) {
    json(res, 503, { erro: "proxy sem chave configurada — define IA_NEMOTRON_KEY ou cria .env.ia (ver .env.example)" });
    return;
  }

  const porta = fichas(ip);
  if (!porta.ok) {
    res.setHeader("Retry-After", String(Math.ceil(porta.esperaMs / 1000)));
    json(res, 429, { erro: "rate limit do proxy — muitas chamadas, espera", esperaMs: porta.esperaMs });
    return;
  }

  // Corpo com cap honesto POR ROTA (chat 256 KB · visão/vetores 8 MB p/ imagens).
  let cru = "";
  let demasiado = false;
  for await (const bloco of req) {
    cru += bloco;
    if (cru.length > rota.cap) { demasiado = true; break; }
  }
  if (demasiado) {
    // FURO v55 (latente desde a v54): responder 413 num socket keep-alive
    // deixava POISÃO — o pedido seguinte reutilizado apanhava RST
    // (ECONNRESET). Correção determinística: drena o resto do corpo e
    // responde com Connection: close (a ligação morre com a resposta —
    // nenhum socket envenenado volta ao pool). Cap honesto de 64 MB
    // extra drenados; acima disso a ligação é destruída sem resposta.
    let drenado = 0;
    try {
      for await (const bloco of req) { void bloco; drenado++; if (drenado > 1_000_000) break; }
    } catch {}
    res.writeHead(413, { "Content-Type": "application/json; charset=utf-8", ...cabecalhosCors(), Connection: "close" });
    res.end(JSON.stringify({ erro: `corpo excede ${rota.cap} bytes` }));
    return;
  }

  let corpo;
  try { corpo = JSON.parse(cru); } catch { json(res, 400, { erro: "JSON inválido" }); return; }
  const erroValidacao = rota.validar(corpo);
  if (erroValidacao) { json(res, 400, { erro: erroValidacao }); return; }

  // forward — o corpo chega ao upstream IGUAL (o cliente já construiu com as
  // regras do núcleo isomórfico); o proxy só injeta a AUTORIZAÇÃO e escolhe
  // o Accept pelo modo do corpo (visão: stream=true → SSE, false → JSON).
  const accept = rota.accept ?? (corpo.stream === false ? "application/json" : "text/event-stream");
  await encaminhar(req, res, cru, rota.caminho, accept, ip);
});

servidor.listen(PORTA, () => {
  log(`IA-PROXY v58 no ar — porta ${PORTA} — upstream ${UPSTREAM} — chave ${CHAVE ? "CONFIGURADA (oculta)" : "AUSENTE"}`);
  log(`  POST http://localhost:${PORTA}${CHAT_ENDPOINT}   (chat v54)`);
  log(`  POST http://localhost:${PORTA}${VISAO_ENDPOINT}  (visão v55)`);
  log(`  POST http://localhost:${PORTA}${VETORES_ENDPOINT} (vetores v55)`);
  log(`  GET  http://localhost:${PORTA}${SAUDE_PATH}`);
});

process.on("SIGINT", () => { log("a terminar honestamente…"); servidor.close(() => process.exit(0)); });
