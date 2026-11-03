// ═══════════════════════════════════════════════════════════════════════
// REA APIS PÚBLICAS v34 — Open-Meteo Air Quality (AQI europeu real)
//
// Fonte: air-quality-api.open-meteo.com (família Open-Meteo, public-apis
// → Weather) — pública, sem chave, CORS aberto.
//
// VALIDAÇÃO AO VIVO (2026-11-03, scripts/probe-apis-v34.sh, doc v34):
// · /v1/air-quality?latitude=-25.9686&longitude=32.5832&current=
//   european_aqi,pm2_5 → HTTP 200 ✅ CORS * (timezone Africa/Maputo)
//
// Uso: painel de clima da Cidade Bateu — "Qualidade do ar" com o índice
// EAQI REAL da cidade escolhida. Escala de rótulos = bandas oficiais do
// índice europeu (0–20 boa … >100 extremamente má), só traduzidas.
// Atribuição: "Qualidade do ar © Open-Meteo (CC BY 4.0)".
// ═══════════════════════════════════════════════════════════════════════

const API = "https://air-quality-api.open-meteo.com/v1/air-quality";
const CACHE_TTL = 30 * 60_000;
const LS_PREFIX = "bateumz.aqi.";

export const AQI_ATTRIBUTION = "Qualidade do ar © Open-Meteo (CC BY 4.0)";

export interface ArAtual {
  aqi: number;          // european_aqi (EAQI) real
  pm25: number | null;  // µg/m³ real
  observadoEm: string;  // ISO
}

export class ArError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArError";
  }
}

/** Bandas oficiais do índice europeu de qualidade do ar (traduzidas). */
export function rotuloAqi(aqi: number): { rotulo: string; cor: string } {
  if (aqi <= 20) return { rotulo: "Boa", cor: "#22c55e" };
  if (aqi <= 40) return { rotulo: "Razoável", cor: "#84cc16" };
  if (aqi <= 60) return { rotulo: "Moderada", cor: "#eab308" };
  if (aqi <= 80) return { rotulo: "Fraca", cor: "#f97316" };
  if (aqi <= 100) return { rotulo: "Má", cor: "#ef4444" };
  return { rotulo: "Extremamente má", cor: "#a21caf" };
}

function chave(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

function lerCache(k: string): ArAtual | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + k);
    if (!raw) return null;
    const g = JSON.parse(raw) as { t: number; ar: ArAtual };
    if (Date.now() - g.t < CACHE_TTL) return g.ar;
  } catch { /* segue */ }
  return null;
}

function guardarCache(k: string, ar: ArAtual) {
  try { localStorage.setItem(LS_PREFIX + k, JSON.stringify({ t: Date.now(), ar })); } catch { /* quota */ }
}

const emVoo = new Map<string, Promise<ArAtual>>();

/** AQI real da coordenada (cache 30 min; erro honesto sem inventar). */
export async function getArAtual(lat: number, lon: number): Promise<ArAtual> {
  const k = chave(lat, lon);
  const cached = lerCache(k);
  if (cached) return cached;

  let pedido = emVoo.get(k);
  if (!pedido) {
    const url = `${API}?latitude=${lat}&longitude=${lon}&current=european_aqi,pm2_5&timezone=auto`;
    pedido = (async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      try {
        const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" }, cache: "no-store" });
        if (!res.ok) throw new ArError(`Air Quality HTTP ${res.status}`);
        const d = (await res.json()) as { current?: { european_aqi?: number; pm2_5?: number } };
        const cur = d.current;
        if (!cur || typeof cur.european_aqi !== "number") throw new ArError("Air Quality veio incompleto");
        const ar: ArAtual = {
          aqi: cur.european_aqi,
          pm25: typeof cur.pm2_5 === "number" ? cur.pm2_5 : null,
          observadoEm: new Date().toISOString(),
        };
        guardarCache(k, ar);
        return ar;
      } catch (err) {
        if (err instanceof ArError) throw err;
        if (err instanceof DOMException && err.name === "AbortError") throw new ArError("Air Quality demorou demasiado (timeout)");
        throw new ArError("Sem ligação ao serviço de qualidade do ar");
      } finally {
        clearTimeout(timer);
        emVoo.delete(k);
      }
    })();
    emVoo.set(k, pedido);
  }
  return pedido;
}
