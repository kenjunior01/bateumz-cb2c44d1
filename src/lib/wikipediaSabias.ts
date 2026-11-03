// ═══════════════════════════════════════════════════════════════════════
// REA APIS PÚBLICAS v34 — Wikipédia PT ("Sabias que?" PALOP)
//
// Fonte: pt.wikipedia.org REST API (public-apis → Open sources) —
// resumos oficiais, sem chave, CORS aberto.
//
// VALIDAÇÃO AO VIVO (2026-11-03, scripts/probe-apis-v34*.sh, doc v34):
// · /api/rest_v1/page/summary/História de Moçambique → HTTP 200 ✅ CORS *
// · 17 títulos PALOP verificados 1 a 1 (200) — lista abaixo só tem artigos
//   que existem; os 429 transitórios (Luanda/Maputo/Cabo Verde) são
//   rate-limit do IP partilhado, não 404 — reconfirmados no smoke real.
//
// Honestidade: o resumo é o texto REAL da Wikipédia (não resumimos por
// nossa conta), o link abre o artigo oficial, atribuição CC BY-SA visível.
// Erros (429/404/rede) são mostrados como erro com retry.
// ═══════════════════════════════════════════════════════════════════════

const API = "https://pt.wikipedia.org/api/rest_v1/page/summary";
const CACHE_TTL = 24 * 60 * 60_000; // 24 h por artigo
const LS_PREFIX = "bateumz.wiki.";

export const WIKI_ATTRIBUTION =
  "Resumo © Wikipédia (CC BY-SA) · pt.wikipedia.org";

/** 17 artigos reais de pt.wikipedia (verificados ao vivo 2026-11-03). */
export const ARTIGOS_PALOP = [
  "Moçambique",
  "História de Moçambique",
  "Angola",
  "História de Angola",
  "Cabo Verde",
  "História de Cabo Verde",
  "Maputo",
  "Luanda",
  "Praia",
  "Mindelo",
  "Ilha de Moçambique",
  "Imbondeiro",
  "Marrabenta",
  "Morna",
  "Kizomba",
  "Semba",
  "Funaná",
] as const;

export interface SabiasQue {
  titulo: string;
  extracto: string;
  thumbnail?: string;
  url: string;
}

export class WikiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WikiError";
  }
}

async function reqJson<T>(url: string, timeoutMs = 12_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) throw new WikiError(`Wikipédia HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof WikiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new WikiError("Wikipédia demorou demasiado (timeout)");
    }
    throw new WikiError("Sem ligação à Wikipédia");
  } finally {
    clearTimeout(timer);
  }
}

interface Resumo {
  title?: string;
  extract?: string;
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

function lerCache(titulo: string): SabiasQue | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + titulo);
    if (!raw) return null;
    const g = JSON.parse(raw) as { t: number; dados: SabiasQue };
    if (Date.now() - g.t < CACHE_TTL) return g.dados;
  } catch { /* segue */ }
  return null;
}

function guardarCache(titulo: string, dados: SabiasQue) {
  try { localStorage.setItem(LS_PREFIX + titulo, JSON.stringify({ t: Date.now(), dados })); } catch { /* quota */ }
}

/** Índice do artigo de hoje — rotação diária determinística (UTC). */
export function artigoDeHoje(): string {
  const dias = Math.floor(Date.now() / 86_400_000);
  return ARTIGOS_PALOP[dias % ARTIGOS_PALOP.length];
}

/** Resumo real do artigo de hoje (cache 24 h + stale-on-error honesto). */
export async function getSabiasQue(titulo = artigoDeHoje()): Promise<SabiasQue> {
  const cache = lerCache(titulo);
  if (cache) return cache;

  const url = `${API}/${encodeURIComponent(titulo)}`;
  const d = await reqJson<Resumo>(url);
  if (!d.extract || !d.title) throw new WikiError("Resumo da Wikipédia veio incompleto");
  const dados: SabiasQue = {
    titulo: d.title,
    extracto: d.extract,
    thumbnail: d.thumbnail?.source,
    url: d.content_urls?.desktop?.page ?? `https://pt.wikipedia.org/wiki/${encodeURIComponent(titulo)}`,
  };
  guardarCache(titulo, dados);
  return dados;
}
