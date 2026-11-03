// ═══════════════════════════════════════════════════════════════════════
// REA APIS PÚBLICAS v34 — Cliente Frankfurter (histórico de câmbio BCE)
//
// Fonte: api.frankfurter.dev (public-apis → Finance) — taxas de referência
// do Banco Central Europeu, pública, sem chave, CORS aberto.
//
// VALIDAÇÃO AO VIVO (2026-11-03, scripts/probe-apis-v34b.sh, doc v34):
// · /v1/latest?base=EUR&symbols=USD,BRL,ZAR → HTTP 200 ✅ CORS *
//   {"amount":1.0,"base":"EUR","date":"2026-11-02","rates":{"BRL":6.099,...}}
// · /v1/2025-10-01..2025-10-10?base=EUR&symbols=USD → HTTP 200 ✅ (série)
// · NOTA: o domínio antigo api.frankfurter.app responde 301 → usar .dev
//
// Complementa a ExchangeRate-API (v30, taxa atual): o Frankfurter dá a
// SÉRIE dos últimos 30 dias para desenhar tendência real.
// Honestidade: o BCE NÃO publica MZN, AOA nem CVE — para essas moedas o
// componente mostra nota honesta "histórico indisponível", nunca inventa.
// Atribuição: "Histórico © Frankfurter (frankfurter.dev) · taxas de referência do BCE".
// ═══════════════════════════════════════════════════════════════════════

const API = "https://api.frankfurter.dev/v1";
const CACHE_TTL = 6 * 60 * 60_000;
const LS_PREFIX = "bateumz.fx-trend.";

export const FRANKFURTER_ATTRIBUTION =
  "Histórico de câmbio © Frankfurter (frankfurter.dev) · taxas de referência do BCE";

/** Moedas com série histórica no BCE (as que o conversor usa). */
export const FRANKFURTER_SUPORTADAS = new Set(["EUR", "USD", "BRL", "ZAR"]);

export interface SerieFx {
  base: string;
  simbolo: string;
  pontos: { data: string; taxa: number }[]; // ordem cronológica
  inicio: string;
  fim: string;
}

export class FrankfurterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FrankfurterError";
  }
}

function dataISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lerCache(base: string, simbolo: string): SerieFx | null {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${base}-${simbolo}`);
    if (!raw) return null;
    const g = JSON.parse(raw) as { t: number; serie: SerieFx };
    if (Date.now() - g.t < CACHE_TTL) return g.serie;
  } catch { /* segue */ }
  return null;
}

function guardarCache(base: string, simbolo: string, serie: SerieFx) {
  try { localStorage.setItem(`${LS_PREFIX}${base}-${simbolo}`, JSON.stringify({ t: Date.now(), serie })); } catch { /* quota */ }
}

const emVoo = new Map<string, Promise<SerieFx>>();

/** Série real dos últimos 30 dias (BCE; apenas moedas suportadas). */
export async function getSerieFx(base: string, simbolo: string): Promise<SerieFx> {
  if (base === simbolo) throw new FrankfurterError("Escolhe duas moedas diferentes");
  if (!FRANKFURTER_SUPORTADAS.has(base) || !FRANKFURTER_SUPORTADAS.has(simbolo)) {
    throw new FrankfurterError(`Sem histórico BCE para ${base}/${simbolo}`);
  }

  const cached = lerCache(base, simbolo);
  if (cached) return cached;

  const chave = `${base}-${simbolo}`;
  let pedido = emVoo.get(chave);
  if (!pedido) {
    const fim = new Date();
    const inicio = new Date(fim.getTime() - 30 * 86_400_000);
    const url = `${API}/${dataISO(inicio)}..${dataISO(fim)}?base=${base}&symbols=${simbolo}`;
    pedido = (async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      try {
        const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" }, cache: "no-store" });
        if (!res.ok) throw new FrankfurterError(`Frankfurter HTTP ${res.status}`);
        const d = (await res.json()) as { base?: string; start_date?: string; end_date?: string; rates?: Record<string, Record<string, number>> };
        const taxas = d.rates ?? {};
        const pontos = Object.keys(taxas).sort().map((data) => ({
          data,
          taxa: taxas[data]?.[simbolo],
        })).filter((p): p is { data: string; taxa: number } => typeof p.taxa === "number");
        if (pontos.length < 2) throw new FrankfurterError("Série de câmbio veio vazia");
        const serie: SerieFx = { base: d.base ?? base, simbolo, pontos, inicio: d.start_date ?? pontos[0].data, fim: d.end_date ?? pontos[pontos.length - 1].data };
        guardarCache(base, simbolo, serie);
        return serie;
      } catch (err) {
        if (err instanceof FrankfurterError) throw err;
        if (err instanceof DOMException && err.name === "AbortError") throw new FrankfurterError("Frankfurter demorou demasiado (timeout)");
        throw new FrankfurterError("Sem ligação ao Frankfurter");
      } finally {
        clearTimeout(timer);
        emVoo.delete(chave);
      }
    })();
    emVoo.set(chave, pedido);
  }
  return pedido;
}
