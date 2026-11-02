// ═══════════════════════════════════════════════════════════════════════
// REA APIS PÚBLICAS v30 — Cliente ExchangeRate-API (taxas reais)
//
// Fonte: open.er-api.com/v6/latest (public-apis → Finance; serviço da
// ExchangeRate-API) — pública, sem chave, CORS aberto
// (Access-Control-Allow-Origin: *, validado ao vivo). Devolve taxas de
// câmbio REAIS actualizadas diariamente — nunca geramos números.
//
// Relevância para a Bateu: plataforma multi-região (Angola AOA,
// Moçambique MZN, Brasil BRL, Portugal EUR, África do Sul ZAR, base
// USD). Prémios e saldos ficam comparáveis entre regiões com taxas
// verdadeiras e data da última actualização exibida.
//
// Estratégia: 1 pedido à base USD (todas as moedas vêm juntos), cache
// 6 h (a API actualiza 1×/dia) + stale-on-error (offline mostra a
// última taxa válida com aviso honesto "taxa de {data}").
// Atribuição: "Taxas de câmbio © ExchangeRate-API (open.er-api.com)".
// ═══════════════════════════════════════════════════════════════════════

const API_BASE = "https://open.er-api.com/v6/latest/USD";
const CACHE_KEY = "bateu-fx-v1:usd";
const CACHE_TTL = 6 * 60 * 60_000;

export const FX_ATTRIBUTION = "Taxas de câmbio © ExchangeRate-API (open.er-api.com)";

export interface FxData {
  base: string; // "USD"
  rates: Record<string, number>; // AOA 922.95, MZN 63.66… (reais da API)
  updatedAt: number; // epoch da resposta
  providerDate: string; // data anunciada pelo fornecedor (ex.: "Mon, 02 Nov 2026")
}

export class FxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FxError";
  }
}

/** Moedas suportadas pelo conversor (todas com taxa REAL da API). */
export const FX_CURRENCIES = [
  { code: "USD", label: "Dólar americano", flag: "🇺🇸" },
  { code: "EUR", label: "Euro", flag: "🇪🇺" },
  { code: "AOA", label: "Kwanza angolano", flag: "🇦🇴" },
  { code: "MZN", label: "Metical", flag: "🇲🇿" },
  { code: "BRL", label: "Real brasileiro", flag: "🇧🇷" },
  { code: "ZAR", label: "Rand", flag: "🇿🇦" },
] as const;

interface CacheEntry { t: number; data: FxData }

function readCache(): { fresh: FxData | null; stale: FxData | null } {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { fresh: null, stale: null };
    const entry = JSON.parse(raw) as CacheEntry;
    const fresh = Date.now() - entry.t < CACHE_TTL ? entry.data : null;
    return { fresh, stale: entry.data };
  } catch {
    return { fresh: null, stale: null };
  }
}

function writeCache(data: FxData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data } satisfies CacheEntry));
  } catch {
    // quota — best-effort
  }
}

let inFlight: Promise<FxData> | null = null;

/** Taxas reais (cache 6 h; offline → última taxa válida com aviso). */
export async function getFxRates(opts?: { fresh?: boolean }): Promise<FxData> {
  const { fresh, stale } = readCache();
  if (!opts?.fresh && fresh) return fresh;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    try {
      const res = await fetch(API_BASE, { signal: ctrl.signal, headers: { Accept: "application/json" } });
      if (!res.ok) throw new FxError(`ExchangeRate HTTP ${res.status}`);
      const raw = (await res.json()) as {
        result?: string; base_code?: string; time_last_update_utc?: string;
        rates?: Record<string, number>;
      };
      if (raw.result !== "success" || !raw.rates) throw new FxError("Resposta inválida do fornecedor de taxas");
      const data: FxData = {
        base: raw.base_code ?? "USD",
        rates: raw.rates,
        updatedAt: Date.now(),
        providerDate: (raw.time_last_update_utc ?? "").replace(/ \d{2}:\d{2}:\d{2}.*$/, ""),
      };
      writeCache(data);
      return data;
    } catch (err) {
      if (stale) return stale; // offline → última taxa real conhecida (UI avisa a data)
      if (err instanceof FxError) throw err;
      throw new FxError("Sem ligação ao serviço de taxas de câmbio");
    } finally {
      clearTimeout(timer);
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Converte montante entre duas moedas via base USD (taxas reais). */
export function convert(amount: number, from: string, to: string, rates: Record<string, number>): number {
  if (from === to) return amount;
  const fromRate = from === "USD" ? 1 : rates[from];
  const toRate = to === "USD" ? 1 : rates[to];
  if (!fromRate || !toRate) return NaN;
  return (amount / fromRate) * toRate;
}

/** Formata com o símbolo da moeda (sem inventar casas decimais). */
export function fmtMoney(value: number, code: string): string {
  const decimals = code === "AOA" || code === "MZN" || code === "ZAR" ? 0 : 2;
  const n = Number.isFinite(value) ? value : 0;
  const formatted = n.toLocaleString("pt-PT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${formatted} ${code}`;
}
