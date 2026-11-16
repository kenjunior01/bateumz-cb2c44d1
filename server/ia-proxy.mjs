// ═══════════════════════════════════════════════════════════════════════
// v54 — IA NEMOTRON — PROXY LOCAL (dev/testes)
//
// O browser NUNCA fala directamente com a NVIDIA (nem conhece a chave).
// Em produção a edge function `nemotron-chat` (Supabase) faz o mesmo papel
// com a chave em segredo do Deno; em dev/testes este proxy corre local:
//   node server/ia-proxy.mjs
//   IA_UPSTREAM=http://127.0.0.1:9001  node server/ia-proxy.mjs   (mock p/ testes)
//
// A chave vem de: env IA_NEMOTRON_KEY (prod/testes) ou do ficheiro .env.ia
// (gitignored — nunca commitada). A resposta do upstream é TUBO puro
// (byte a byte, SSE incluído) — o proxy não altera nem finge nada.
// Limites honestos: rate-limit por IP (balde de fichas), corpo cap 256 KB,
// timeout de ligação ao upstream 30 s, desconexão do cliente PROPAGADA ao
// upstream (cancela a geração — não há tokens pagos escondidos).
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
const ORIGEM_CORS = process.env.IA_CORS_ORIGEM || "*";
const CHAT_PATH = process.env.IA_CHAT_PATH || "/chat/completions";
const LIGACAO_TIMEOUT_MS = Number(process.env.IA_LIGACAO_TIMEOUT_MS || 30_000);
const CORPO_CAP = 256 * 1024;
const SAUDE_PATH = "/api/ia/saude";
const CHAT_ENDPOINT = "/api/ia/chat";

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

// ── Validação do corpo (regras isomórficas declaradas) ──────────────────
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
      versão: "v54",
      upstream: UPSTREAM.replace(/\/\/[^/]+@/, "//***@") + CHAT_PATH,
      chaveConfigurada: !!CHAVE,
      modeloPadrao: MODELO_PADRAO,
      limites: { fichas: FICHAS_CAPACIDADE, recargaPorMin: FICHAS_RECARGA_POR_MIN, corpoCap: CORPO_CAP },
    });
    return;
  }

  if (req.method !== "POST" || url !== CHAT_ENDPOINT) {
    json(res, 404, { erro: "só POST " + CHAT_ENDPOINT + " e GET " + SAUDE_PATH });
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

  // Corpo com cap honesto.
  let cru = "";
  let demasiado = false;
  for await (const bloco of req) {
    cru += bloco;
    if (cru.length > CORPO_CAP) { demasiado = true; break; }
  }
  if (demasiado) { json(res, 413, { erro: `corpo excede ${CORPO_CAP} bytes` }); return; }

  let corpo;
  try { corpo = JSON.parse(cru); } catch { json(res, 400, { erro: "JSON inválido" }); return; }
  const erroValidacao = validarCorpo(corpo);
  if (erroValidacao) { json(res, 400, { erro: erroValidacao }); return; }

  //.forward — o corpo chega ao upstream IGUAL (o cliente já construiu com as
  // regras do núcleo isomórfico); o proxy só injeta a AUTORIZAÇÃO.
  const controlador = new AbortController();
  req.on("close", () => { if (!res.writableEnded) controlador.abort(); });
  const tempoLigacao = setTimeout(() => controlador.abort(), LIGACAO_TIMEOUT_MS);

  let respostaUpstream;
  try {
    respostaUpstream = await fetch(UPSTREAM + CHAT_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
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

  const cabecalhos = { "Content-Type": respostaUpstream.headers.get("content-type") || "text/event-stream", "Cache-Control": "no-store", ...cabecalhosCors() };
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
    log("stream concluído", respostaUpstream.status, `ip=${ip.slice(-8)}`);
  } catch (err) {
    log("stream interrompido:", String(err?.message ?? err).slice(0, 120));
    res.end();
  }
});

servidor.listen(PORTA, () => {
  log(`IA-PROXY v54 no ar — porta ${PORTA} — upstream ${UPSTREAM}${CHAT_PATH} — chave ${CHAVE ? "CONFIGURADA (oculta)" : "AUSENTE"}`);
  log(`  POST http://localhost:${PORTA}${CHAT_ENDPOINT}  ·  GET http://localhost:${PORTA}${SAUDE_PATH}`);
});

process.on("SIGINT", () => { log("a terminar honestamente…"); servidor.close(() => process.exit(0)); });
