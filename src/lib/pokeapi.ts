// ═══════════════════════════════════════════════════════════════════════
// REA APIS PÚBLICAS v30 — Cliente PokéAPI (Pokémon reais)
//
// Fonte: pokeapi.co (public-apis → Games & Comics) — pública, sem chave,
// CORS aberto (Access-Control-Allow-Origin: *, validado ao vivo).
// Todos os nomes, tipos, altura, peso e imagens vêm da API — a silhueta
// é a própria arte oficial com filtro CSS (nada é desenhado por nós).
//
// Nota honesta: a PokéAPI não tem nomes nem descrições em português
// (só en/es/fr/de/ja/zh/ko). Mantemos o NOME CANÓNICO em inglês (é o
// nome real da criatura — inventar tradução seria fabricar dados) e as
// etiquetas de interface em pt. Atribuição obrigatória: "Dados © PokéAPI".
//
// Estratégia: pedidos pontuais por Pokémon (1 species + 1 pokemon por
// ronda) com cache localStorage de 7 dias — a PokéAPI é grátis mas
// partilhada, nunca martelamos. Geração 1–9 (ids 1–1025, todos reais).
// ═══════════════════════════════════════════════════════════════════════

const API_BASE = "https://pokeapi.co/api/v2";
const MAX_ID = 1025; // gerações 1–9 reais da API
const CACHE_KEY = "bateu-pokemon-v1:";
const CACHE_TTL = 7 * 24 * 60 * 60_000;

export const POKEMON_ATTRIBUTION = "Dados e arte oficial de Pokémon © PokéAPI (pokeapi.co)";

export interface PokemonData {
  id: number;
  name: string; // nome canónico em inglês (a API não tem pt — ver cabeçalho)
  artwork: string; // arte oficial (PNG via GitHub da própria PokéAPI)
  types: string[]; // "electric", "fire"…
  heightDm: number;
  weightHg: number;
}

interface CacheEntry<T> { t: number; data: T }

export class PokeApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PokeApiError";
  }
}

async function req<T>(url: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new PokeApiError(`PokéAPI HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof PokeApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new PokeApiError("A PokéAPI demorou demasiado (timeout)");
    }
    throw new PokeApiError("Sem ligação à PokéAPI");
  } finally {
    clearTimeout(timer);
  }
}

function readCache(id: number): PokemonData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY + id);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<PokemonData>;
    if (Date.now() - entry.t > CACHE_TTL) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(p: PokemonData) {
  try {
    localStorage.setItem(CACHE_KEY + p.id, JSON.stringify({ t: Date.now(), data: p } satisfies CacheEntry<PokemonData>));
  } catch {
    // quota cheia — cache é best-effort
  }
}

function artworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

const TYPE_PT: Record<string, string> = {
  normal: "Normal", fire: "Fogo", water: "Água", electric: "Elétrico", grass: "Planta",
  ice: "Gelo", fighting: "Luta", poison: "Veneno", ground: "Terra", flying: "Voador",
  psychic: "Psíquico", bug: "Inseto", rock: "Rocha", ghost: "Fantasma", dragon: "Dragão",
  dark: "Sombrio", steel: "Aço", fairy: "Fada",
};

/** Etiqueta pt para um tipo da API (interface, não tradução de dados). */
export function typePt(type: string): string {
  return TYPE_PT[type] ?? type;
}

/** Busca um Pokémon REAL por id (cache 7 dias + rede). */
export async function getPokemon(id: number): Promise<PokemonData> {
  const cached = readCache(id);
  if (cached) return cached;
  const raw = await req<{
    id: number; name: string; height: number; weight: number;
    sprites: { other: { "official-artwork"?: { front_default?: string } } };
    types: Array<{ type: { name: string } }>;
  }>(`${API_BASE}/pokemon/${id}`);
  const p: PokemonData = {
    id: raw.id,
    name: raw.name,
    artwork: raw.sprites?.other?.["official-artwork"]?.front_default || artworkUrl(raw.id),
    types: raw.types.map((t) => t.type.name),
    heightDm: raw.height,
    weightHg: raw.weight,
  };
  writeCache(p);
  return p;
}

/** Id aleatório 1–1025 — crypto quando disponível (padrão da plataforma). */
export function randomPokemonId(): number {
  const buf = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
    return (buf[0] % MAX_ID) + 1;
  }
  return Math.floor(Math.random() * MAX_ID) + 1;
}

/** Ids aleatórios distintos — para as opções erradas da ronda. */
export function randomDistinctIds(count: number, exclude: number): number[] {
  const out = new Set<number>();
  let guard = 0;
  while (out.size < count && guard < 200) {
    guard += 1;
    const id = randomPokemonId();
    if (id !== exclude) out.add(id);
  }
  return [...out];
}

/** Formata altura (dm → m) e peso (hg → kg) como na Pokédex real (pt-PT). */
export function heightM(dm: number): string {
  return (dm / 10).toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " m";
}
export function weightKg(hg: number): string {
  return (hg / 10).toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " kg";
}

// ── Nomes completos (1 pedido para TODOS os 1025 — cache 7 dias) ────────

const NAMES_KEY = CACHE_KEY + "names-all";

export interface PokeName { id: number; name: string }

/** Lista completa de nomes reais (1 pedido total, respeita a API partilhada). */
export async function getAllNames(): Promise<PokeName[]> {
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    if (raw) {
      const entry = JSON.parse(raw) as CacheEntry<PokeName[]>;
      if (Date.now() - entry.t < CACHE_TTL) return entry.data;
    }
  } catch { /* rede abaixo */ }
  const raw = await req<{ results: Array<{ name: string; url: string }> }>(`${API_BASE}/pokemon?limit=${MAX_ID}&offset=0`);
  const names: PokeName[] = raw.results.map((r) => {
    const m = r.url.match(/\/pokemon\/(\d+)\/?$/);
    return { id: m ? parseInt(m[1], 10) : 0, name: r.name };
  }).filter((n) => n.id > 0);
  try {
    localStorage.setItem(NAMES_KEY, JSON.stringify({ t: Date.now(), data: names } satisfies CacheEntry<PokeName[]>));
  } catch { /* quota — best-effort */ }
  return names;
}
