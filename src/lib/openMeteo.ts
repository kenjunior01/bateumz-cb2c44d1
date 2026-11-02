// ═══════════════════════════════════════════════════════════════════════
// REA APIS PÚBLICAS v31 — Cliente Open-Meteo (clima REAL no BateuCraft)
//
// Fonte: open-meteo.com (public-apis → Weather) — pública, sem chave,
// uso não-comercial gratuito (10 000 pedidos/dia), CORS aberto.
//
// VALIDAÇÃO AO VIVO (2026-11-02, registada em docs/REA-apis-publicas-v31.md):
// · geocoding-api.open-meteo.com/v1/search → HTTP 200 ✅ (Luanda, 3 resultados)
// · archive-api.open-meteo.com (outro host da MESMA família de resposta)
//   → HTTP 200 ✅ com `weather_code` WMO real (53, 61)
// · api.open-meteo.com (forecast) → HTTP 429 no dia da integração: limite
//   diário do IP PARTILHADO do ambiente de desenvolvimento. A forma da
//   resposta é a mesma família validada acima; o smoke real do forecast
//   fica registado como pendente — se falhar no browser, o jogo mostra o
//   erro real e mantém o clima simulado (nunca finge).
//
// Mapeamento WMO → jogo: códigos 95+ viram TEMPESTADE, 51–86 (chuva/
// drizzle/aguaceiros) viram CHUVA, o resto LIMPO. Neve (71–77, 85–86) tem
// descrição real no painel com nota "não simulada no jogo" — o jogo não
// tem neve e NUNCA mente a dizer que chove.
//
// Princípios: ZERO dados inventados (temperatura e código WMO reais),
// erros honestos, atribuição "Tempo © Open-Meteo (CC BY 4.0)".
// ═══════════════════════════════════════════════════════════════════════

const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_API = "https://api.open-meteo.com/v1/forecast";

export const OPENMETEO_ATTRIBUTION =
  "Tempo real © Open-Meteo (open-meteo.com) · licença CC BY 4.0";

export class OpenMeteoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenMeteoError";
  }
}

export interface CidadeEncontrada {
  nome: string;
  pais: string;
  regiao?: string;
  latitude: number;
  longitude: number;
}

export interface ClimaAtual {
  temperatura: number; // °C
  codigoWmo: number;
  ventoKmh: number;
  cidade: CidadeEncontrada;
  observadoEm: string; // ISO
}

const WMO_PT: Record<number, string> = {
  0: "Céu limpo", 1: "Principalmente limpo", 2: "Parcialmente nublado", 3: "Encoberto",
  45: "Nevoeiro", 48: "Nevoeiro com geada",
  51: "Chuvisco fraco", 53: "Chuvisco", 55: "Chuvisco forte",
  56: "Chuvisco gelado fraco", 57: "Chuvisco gelado forte",
  61: "Chuva fraca", 63: "Chuva", 65: "Chuva forte",
  66: "Chuva gelada fraca", 67: "Chuva gelada forte",
  71: "Neve fraca", 73: "Neve", 75: "Neve forte", 77: "Grãos de neve",
  80: "Aguaceiros fracos", 81: "Aguaceiros", 82: "Aguaceiros violentos",
  85: "Aguaceiros de neve fracos", 86: "Aguaceiros de neve fortes",
  95: "Trovoada", 96: "Trovoada com granizo", 99: "Trovoada com granizo forte",
};

const CODIGOS_NEVE = new Set([71, 73, 75, 77, 85, 86]);

/** Descrição real do código WMO em pt (cadeia vazia se desconhecido). */
export function wmoDescricaoPt(codigo: number): string {
  return WMO_PT[codigo] ?? "";
}

/** True se o código WMO é de neve (o jogo não simula neve — nota honesta). */
export function wmoEhNeve(codigo: number): boolean {
  return CODIGOS_NEVE.has(codigo);
}

/** Tipo de Meteo do jogo derivado do código WMO REAL. */
export function wmoParaMeteo(codigo: number): "limpo" | "chuva" | "tempestade" {
  if (codigo >= 95) return "tempestade";
  if ((codigo >= 51 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) return "chuva";
  return "limpo"; // neve → LIMPO com nota honesta no painel (o jogo não tem neve)
}

async function reqJson<T>(url: string, base: string, timeoutMs = 12_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) throw new OpenMeteoError(`Open-Meteo HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof OpenMeteoError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new OpenMeteoError(`${base} demorou demasiado (timeout)`);
    }
    throw new OpenMeteoError(`Sem ligação a ${base}`);
  } finally {
    clearTimeout(timer);
  }
}

// ── Geocoding (host validado ao vivo com HTTP 200) ───────────────────────

export async function procurarCidade(nome: string): Promise<CidadeEncontrada[]> {
  const q = nome.trim();
  if (!q) return [];
  const url = `${GEO_API}?name=${encodeURIComponent(q)}&count=5&language=pt&format=json`;
  const d = await reqJson<{ results?: { name: string; country?: string; admin1?: string; latitude: number; longitude: number }[] }>(
    url, "geocoding da Open-Meteo",
  );
  return (d.results ?? []).map((r) => ({
    nome: r.name,
    pais: r.country ?? "",
    regiao: r.admin1,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

// ── Clima atual (cache 30 min por cidade + dedupe + stale-on-error) ──────

const LS_CLIMA_PREFIX = "bateumz.openmeteo.clima.";
const TTL_CLIMA_MS = 30 * 60 * 1000;

let climaEmVoo: Map<string, Promise<ClimaAtual>> = new Map();

function chaveCidade(c: CidadeEncontrada): string {
  return `${c.latitude.toFixed(2)},${c.longitude.toFixed(2)}`;
}

export async function getClimaAtual(cidade: CidadeEncontrada): Promise<ClimaAtual> {
  const chave = chaveCidade(cidade);
  try {
    const guardado = localStorage.getItem(LS_CLIMA_PREFIX + chave);
    if (guardado) {
      const g = JSON.parse(guardado) as { t: number; clima: ClimaAtual };
      if (Date.now() - g.t < TTL_CLIMA_MS) return g.clima;
    }
  } catch { /* segue para a rede */ }

  let emVoo = climaEmVoo.get(chave);
  if (!emVoo) {
    const url =
      `${FORECAST_API}?latitude=${cidade.latitude}&longitude=${cidade.longitude}` +
      `&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
    emVoo = reqJson<{ current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number } }>(
      url, "Open-Meteo",
    ).then((d) => {
      const cur = d.current;
      if (!cur || typeof cur.temperature_2m !== "number" || typeof cur.weather_code !== "number") {
        throw new OpenMeteoError("Open-Meteo devolveu clima incompleto");
      }
      const clima: ClimaAtual = {
        temperatura: cur.temperature_2m,
        codigoWmo: cur.weather_code,
        ventoKmh: typeof cur.wind_speed_10m === "number" ? cur.wind_speed_10m : 0,
        cidade,
        observadoEm: new Date().toISOString(),
      };
      try { localStorage.setItem(LS_CLIMA_PREFIX + chave, JSON.stringify({ t: Date.now(), clima })); } catch { /* quota */ }
      return clima;
    }).finally(() => { climaEmVoo.delete(chave); });
    climaEmVoo.set(chave, emVoo);
  }

  try {
    return await emVoo;
  } catch (erroRede) {
    // stale-on-error: clima recente (<6h) com aviso honesto
    try {
      const guardado = localStorage.getItem(LS_CLIMA_PREFIX + chave);
      if (guardado) {
        const g = JSON.parse(guardado) as { t: number; clima: ClimaAtual };
        if (Date.now() - g.t < 6 * 60 * 60 * 1000) return { ...g.clima, observadoEm: g.clima.observadoEm };
      }
    } catch { /* segue */ }
    throw erroRede;
  }
}
