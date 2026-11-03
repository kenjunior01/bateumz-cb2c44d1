// ═══════════════════════════════════════════════════════════════════════
// REA APIS PÚBLICAS v32 — Cliente TheMealDB (Sabores do Mundo)
//
// Fonte: themealdb.com (public-apis → Food & Drink) — gratuita, a chave
// "1" é a chave de testes OFICIAL do próprio site para leitura pública,
// CORS aberto (Access-Control-Allow-Origin: *, validado ao vivo a 200).
// Todos os pratos, fotos, categorias e regiões vêm da API — nada é
// desenhado nem inventado por nós.
//
// Notas honestas:
// · Os NOMES dos pratos ficam no idioma original da fonte (maioritariamente
//   inglês) — inventar tradução seria fabricar dados.
// · As REGIÕES de distracção vêm de list.php?a=list (lista REAL da API),
//   nunca de uma lista escrita à mão.
//
// Estratégia: random.php devolve 1 prato por pedido (pedidos pontuais por
// ronda) com cache localStorage de 24 h por id + dedupe em voo — API
// partilhada, nunca martelamos.
// ═══════════════════════════════════════════════════════════════════════

const API_BASE = "https://www.themealdb.com/api/json/v1/1";
const CACHE_KEY = "bateu-meals-v1:";
const CACHE_TTL = 24 * 60 * 60_000;
const AREAS_KEY = CACHE_KEY + "areas";
const AREAS_TTL = 7 * 24 * 60 * 60_000;

export const MEALDB_ATTRIBUTION = "Dados e imagens de pratos © TheMealDB (themealdb.com)";

export interface MealBasico {
  id: string; // idMeal (string na API)
  nome: string; // strMeal (idioma original da fonte)
  thumb: string; // strMealThumb (foto oficial)
  area: string; // strArea (região real: "Portuguese", "Japanese"…)
  categoria: string; // strCategory (real: "Seafood", "Dessert"…)
}

interface CacheEntry<T> { t: number; data: T }

export class MealDbError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MealDbError";
  }
}

async function req<T>(url: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new MealDbError(`TheMealDB HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof MealDbError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new MealDbError("TheMealDB demorou demasiado (timeout)");
    }
    throw new MealDbError("Sem ligação à TheMealDB");
  } finally {
    clearTimeout(timer);
  }
}

function lerCache<T>(chave: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(chave);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.t > ttl) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function gravarCache<T>(chave: string, data: T) {
  try {
    localStorage.setItem(chave, JSON.stringify({ t: Date.now(), data } satisfies CacheEntry<T>));
  } catch {
    // quota cheia — cache é best-effort
  }
}

// ── Regiões REAIS (1 pedido a list.php?a=list, cache 7 dias) ────────────
const emVooAreas: Map<string, Promise<string[]>> = new Map();

export async function listarAreas(): Promise<string[]> {
  const cache = lerCache<string[]>(AREAS_KEY, AREAS_TTL);
  if (cache && cache.length > 0) return cache;
  const pendente = emVooAreas.get("all");
  if (pendente) return pendente;
  const p = (async () => {
    const raw = await req<{ meals: Array<{ strArea: string } | null> | null }>(`${API_BASE}/list.php?a=list`);
    const areas = (raw.meals ?? []).map((m) => m.strArea).filter((a): a is string => Boolean(a));
    if (areas.length === 0) throw new MealDbError("Lista de regiões vazia");
    gravarCache(AREAS_KEY, areas);
    return areas;
  })();
  emVooAreas.set("all", p);
  try { return await p; } finally { emVooAreas.delete("all"); }
}

// ── Prato aleatório REAL (1 pedido por ronda, cache 24 h + dedupe) ──────
const emVoo: Map<string, Promise<MealBasico>> = new Map();

export async function pratoAleatorio(): Promise<MealBasico> {
  // random.php não aceita id — dedupe por pedido em voo (evita 2 seguidos)
  const pendente = emVoo.get("random");
  if (pendente) return pendente;
  const p = (async () => {
    const raw = await req<{ meals: Array<Record<string, string>> | null }>(`${API_BASE}/random.php`);
    const m = raw.meals?.[0];
    if (!m || !m.idMeal || !m.strMeal) throw new MealDbError("Resposta sem prato");
    const meal: MealBasico = {
      id: m.idMeal,
      nome: m.strMeal,
      thumb: m.strMealThumb || "",
      area: m.strArea || "Unknown",
      categoria: m.strCategory || "Unknown",
    };
    gravarCache(CACHE_KEY + meal.id, meal);
    return meal;
  })();
  emVoo.set("random", p);
  try { return await p; } finally { emVoo.delete("random"); }
}

/** Lê um prato do cache (para o E2E verificar persistência honesta). */
export function pratoCacheado(id: string): MealBasico | null {
  return lerCache<MealBasico>(CACHE_KEY + id, CACHE_TTL);
}

/** Sorteio com crypto (padrão da plataforma) — índice distinto de `excluir`. */
export function indiceAleatorio(max: number, excluir?: number): number {
  if (max <= 0) return 0;
  for (let guard = 0; guard < 100; guard++) {
    let v: number;
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      v = buf[0] % max;
    } else {
      v = Math.floor(Math.random() * max);
    }
    if (excluir === undefined || v !== excluir) return v;
  }
  return (excluir ?? -1) + 1 < max ? (excluir ?? -1) + 1 : 0;
}

/** 3 regiões reais distintas da região-alvo — distratores honestos. */
export function distratores(areas: string[], alvo: string): string[] {
  const fora = areas.filter((a) => a !== alvo && a !== "Unknown");
  const out: string[] = [];
  let guard = 0;
  while (out.length < 3 && out.length < fora.length && guard < 400) {
    guard++;
    const a = fora[indiceAleatorio(fora.length)];
    if (!out.includes(a)) out.push(a);
  }
  return out;
}
