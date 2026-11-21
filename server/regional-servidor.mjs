// ============================================================
// SERVIDOR REGIONAL — v73 (co-fundadores MZ·AO·BR·PT a valer
// para TODOS os aparelhos da região)
// ────────────────────────────────────────────────────────────
// O MESMO núcleo puro do aparelho (src/lib/regionalCore.ts):
// validação, teto de 12 anúncios/país, agendamento, estatísticas
// e — acima de tudo — as PERMISSÕES executadas NO SERVIDOR:
// · CO-FUNDADOR (token do SEU país) → só mexe no SEU país
//   (identidade visual + anúncios). Atravessar país = 403.
// · ADMIN (token «TODOS») → vê e muda QUALQUER país — o ÚNICO
//   com visão total (panorama dos 4 países).
// · PÚBLICO → /saude, os anúncios ATIVOS do país (/publico/:pais)
//   e a contagem HONESTA de impressões/cliques. Nada mais.
//
// HONESTIDADE: sem tokens configurados o servidor fica em modo
// SÓ-LEITURA público (escritas respondem 401 com o motivo) —
// nunca há «demo que deixa tudo passar».
//
// JS PURO (Node ≥22 stripa os tipos do .ts):
//   node server/regional-servidor.mjs
//   PORT=8799 REGIAO_ADMIN_TOKEN=… REGIAO_GESTOR_MZ=… …
// Estado persistido em server/data/regional-estado.json (escrita
// atómica tmp+rename — o estado sobrevive a reinícios).
// ============================================================
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PAISES_COFUNDADOR, hidratarEstado, validarIdentidade, aplicarIdentidade,
  validarAnuncio, aplicarAnuncio, agirAnuncioEm, registrarImpressaoEm,
  registrarCliqueEm, estatisticasPaisDe, panoramaDe, anunciosAtivosDe,
  listarTodosDe, listarAnunciosPaisDe, estadoPadrao, LIMITES,
} from "../src/lib/regionalCore.ts";

const PORTA = Number(process.env.PORT || 8790);
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FICHEIRO_ESTADO = process.env.REGIAO_ESTADO || join(RAIZ, "server", "data", "regional-estado.json");
const MAX_CORPO = 16 * 1024;             // 16 KB — anúncio não é vídeo
const MAX_REQS_JANELA = 180;             // por IP por minuto (o hub conta impressões — folga honesta)

const log = (...a) => console.log(new Date().toISOString(), "[regional]", ...a);

// ── tokens (operador) — quem não tem token NÃO existe aqui ────
const TOKEN_ADMIN = (process.env.REGIAO_ADMIN_TOKEN || "").trim();
const TOKEN_GESTOR = {};
for (const p of PAISES_COFUNDADOR) {
  const t = (process.env[`REGIAO_GESTOR_${p}`] || "").trim();
  if (t) TOKEN_GESTOR[p] = t;
}
const haTokens = Boolean(TOKEN_ADMIN) || Object.keys(TOKEN_GESTOR).length > 0;

// ── estado persistido ─────────────────────────────────────────
let estado;
try {
  estado = existsSync(FICHEIRO_ESTADO)
    ? hidratarEstado(JSON.parse(readFileSync(FICHEIRO_ESTADO, "utf8")))
    : estadoPadrao();
} catch {
  estado = estadoPadrao();
}
let guardado = 0;

function gravarEstado() {
  try {
    mkdirSync(dirname(FICHEIRO_ESTADO), { recursive: true });
    const tmp = `${FICHEIRO_ESTADO}.tmp-${process.pid}-${++guardado}`;
    writeFileSync(tmp, JSON.stringify(estado));
    renameSync(tmp, FICHEIRO_ESTADO);
  } catch (e) {
    log("FALHA ao gravar estado:", e.message);
  }
}

// ── papéis a partir do token (Bearer) ─────────────────────────
function papelDoPedido(req) {
  const h = req.headers["authorization"] || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  const tok = m[1].trim();
  if (TOKEN_ADMIN && tok === TOKEN_ADMIN) return { tipo: "admin", pais: "TODOS" };
  for (const p of PAISES_COFUNDADOR) {
    if (TOKEN_GESTOR[p] && tok === TOKEN_GESTOR[p]) return { tipo: "gestor", pais: p };
  }
  return null;
}

// ── rate limit por IP (janela de 60 s) ────────────────────────
const janelaIp = new Map();
function excedeuTaxa(ip) {
  const agora = Date.now();
  const lista = (janelaIp.get(ip) || []).filter((ts) => agora - ts < 60_000);
  lista.push(agora);
  janelaIp.set(ip, lista);
  if (janelaIp.size > 5000) janelaIp.clear(); // higiene
  return lista.length > MAX_REQS_JANELA;
}

// ── respostas ─────────────────────────────────────────────────
function json(res, codigo, corpo) {
  const s = JSON.stringify(corpo);
  res.writeHead(codigo, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  res.end(s);
}

function lerCorpo(req) {
  return new Promise((resolver) => {
    let cru = "";
    let estourou = false;
    req.on("data", (c) => {
      cru += c;
      if (cru.length > MAX_CORPO) { estourou = true; req.destroy(); }
    });
    req.on("end", () => {
      if (estourou) return resolver(null);
      try { resolver(JSON.parse(cru)); } catch { resolver(null); }
    });
    req.on("error", () => resolver(null));
  });
}

// ── servidor ──────────────────────────────────────────────────
const servidor = createServer(async (req, res) => {
  const ip = req.socket.remoteAddress || "?";
  const url = new URL(req.url, "http://x");
  const caminho = url.pathname;
  const metodo = req.method || "GET";

  if (metodo === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "600",
    });
    return res.end();
  }
  if (excedeuTaxa(ip)) return json(res, 429, { erro: "demasiados pedidos — espera um pouco" });

  // ── PÚBLICO ──────────────────────────────────────────────
  if (metodo === "GET" && caminho === "/saude") {
    return json(res, 200, {
      ok: true, versao: "v73", agora: Date.now(),
      paises: PAISES_COFUNDADOR.length,
      anuncios: estado.anuncios.length,
      escritaAberta: haTokens, // sem tokens = só-leitura pública (declarado)
    });
  }

  // anúncios ATIVOS do país (o hub de qualquer visitante mostra isto)
  const mPublico = /^\/publico\/([A-Za-z]{2})$/.exec(caminho);
  if (metodo === "GET" && mPublico) {
    const pais = mPublico[1].toUpperCase();
    if (!PAISES_COFUNDADOR.includes(pais)) return json(res, 404, { erro: "país fora do lançamento" });
    return json(res, 200, { pais, ativos: anunciosAtivosDe(estado, pais) });
  }

  // contagem HONESTA de impressões/cliques (público — é o que o hub manda)
  if (metodo === "POST" && (caminho === "/impressao" || caminho === "/clique")) {
    const corpo = await lerCorpo(req);
    if (!corpo || typeof corpo.id !== "string") return json(res, 400, { erro: "corpo inválido" });
    if (caminho === "/impressao") registrarImpressaoEm(estado, corpo.id);
    else registrarCliqueEm(estado, corpo.id);
    gravarEstado();
    const a = estado.anuncios.find((x) => x.id === corpo.id);
    return json(res, 200, { ok: true, impressoes: a?.impressoes ?? 0, cliques: a?.cliques ?? 0 });
  }

  // ── AUTENTICADO (a partir daqui exige token) ──────────────
  const papel = papelDoPedido(req);
  if (!papel) {
    return json(res, 401, {
      erro: haTokens
        ? "token ausente ou inválido (Authorization: Bearer …)"
        : "servidor em modo SÓ-LEITURA: nenhum token configurado (REGIAO_ADMIN_TOKEN / REGIAO_GESTOR_*)",
    });
  }

  // ESTADO do papel — gestor vê SÓ o seu país; admin vê TUDO
  if (metodo === "GET" && caminho === "/estado") {
    if (papel.tipo === "admin") {
      return json(res, 200, { papel: "admin", pais: "TODOS", estado, panorama: panoramaDe(estado) });
    }
    return json(res, 200, {
      papel: "gestor", pais: papel.pais,
      identidade: estado.identidades[papel.pais],
      anuncios: listarAnunciosPaisDe(estado, papel.pais),
      stats: estatisticasPaisDe(estado, papel.pais),
      teto: LIMITES.maxAnunciosPorPais,
    });
  }

  // PANORAMA — o ÚNICO poder exclusivo do admin
  if (metodo === "GET" && caminho === "/panorama") {
    if (papel.tipo !== "admin") return json(res, 403, { erro: "o panorama é EXCLUSIVO do admin" });
    return json(res, 200, { panorama: panoramaDe(estado) });
  }

  if (metodo === "POST") {
    const corpo = await lerCorpo(req);
    if (!corpo || typeof corpo !== "object") return json(res, 400, { erro: "corpo inválido" });

    // IDENTIDADE VISUAL — gestor: SÓ o seu país · admin: qualquer
    if (caminho === "/identidade") {
      const pais = corpo.pais;
      if (!PAISES_COFUNDADOR.includes(pais)) return json(res, 400, { erro: "país fora do lançamento" });
      if (papel.tipo === "gestor" && papel.pais !== pais) {
        return json(res, 403, { erro: `co-fundador gere SÓ ${papel.pais} — ${pais} não é teu` });
      }
      const r = validarIdentidade(pais, {
        corPrimaria: String(corpo.corPrimaria ?? ""),
        corSecundaria: String(corpo.corSecundaria ?? ""),
        corAcento: String(corpo.corAcento ?? ""),
        nomeTema: String(corpo.nomeTema ?? ""),
        iniciaisLogo: String(corpo.iniciaisLogo ?? ""),
        slogan: String(corpo.slogan ?? ""),
      });
      if (!r.d) return json(res, 422, { erro: "identidade recusada pelo núcleo", motivo: r.motivo });
      aplicarIdentidade(estado, r.d);
      gravarEstado();
      log(`identidade ${pais} gravada por ${papel.tipo} (${r.d.nomeTema})`);
      return json(res, 200, { ok: true, identidade: r.d });
    }

    // NOVO ANÚNCIO — gestor: SÓ o seu país · admin: qualquer
    if (caminho === "/anuncio") {
      const pais = corpo.pais;
      if (!PAISES_COFUNDADOR.includes(pais)) return json(res, 400, { erro: "país fora do lançamento" });
      if (papel.tipo === "gestor" && papel.pais !== pais) {
        return json(res, 403, { erro: `co-fundador gere SÓ ${papel.pais} — ${pais} não é teu` });
      }
      const r = validarAnuncio({
        pais,
        tipo: corpo.tipo,
        titulo: String(corpo.titulo ?? ""),
        texto: String(corpo.texto ?? ""),
        ctaEtiqueta: String(corpo.ctaEtiqueta ?? ""),
        ctaUrl: String(corpo.ctaUrl ?? ""),
        gradiente: corpo.gradiente ? String(corpo.gradiente) : undefined,
        iniciaEm: Number.isFinite(corpo.iniciaEm) ? corpo.iniciaEm : undefined,
        terminaEm: Number.isFinite(corpo.terminaEm) ? corpo.terminaEm : undefined,
        criadoPor: papel.tipo === "admin" ? String(corpo.criadoPor ?? "Admin (TODOS)") : String(corpo.criadoPor ?? "Co-fundador"),
      }, estado);
      if (!r.d) return json(res, 422, { erro: "anúncio recusado pelo núcleo", motivo: r.motivo });
      aplicarAnuncio(estado, r.d);
      gravarEstado();
      log(`anúncio ${r.d.id} criado por ${papel.tipo} (${pais}) — «${r.d.titulo}»`);
      return json(res, 200, { ok: true, anuncio: r.d });
    }

    // AÇÃO sobre um anúncio — as permissões são do NÚCLEO
    if (caminho === "/acao") {
      const { id, acao } = corpo;
      if (typeof id !== "string" || typeof acao !== "string") return json(res, 400, { erro: "corpo inválido" });
      const ok = agirAnuncioEm(estado, id, acao, papel.tipo === "admin" ? "TODOS" : papel.pais);
      if (!ok) {
        const existe = estado.anuncios.some((x) => x.id === id);
        return json(res, existe ? 403 : 404, { erro: existe ? "ação recusada pelo núcleo (país ou ação)" : "anúncio inexistente" });
      }
      gravarEstado();
      log(`anúncio ${id} → ${acao} por ${papel.tipo} (${papel.pais})`);
      return json(res, 200, { ok: true });
    }
  }

  return json(res, 404, { erro: "rota inexistente" });
});

servidor.listen(PORTA, () => {
  const paises = Object.keys(TOKEN_GESTOR).join(",") || "—";
  log(`REGIONAL-SERVIDOR no ar — porta ${PORTA} · admin: ${TOKEN_ADMIN ? "SIM" : "NÃO"} · gestores: ${paises} · modo ${haTokens ? "COMPLETO" : "SÓ-LEITURA público"} · estado: ${FICHEIRO_ESTADO}`);
  log(`anúncios carregados: ${estado.anuncios.length} · teto/país: ${LIMITES.maxAnunciosPorPais}`);
});

process.on("SIGINT", () => { log("SIGINT — a desligar"); servidor.close(() => process.exit(0)); setTimeout(() => process.exit(0), 800); });
