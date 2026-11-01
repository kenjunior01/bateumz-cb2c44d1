// ═══════════════════════════════════════════════════════════════════════
// REA APIS PÚBLICAS v25 — Cliente Open Trivia DB (banco real de perguntas)
//
// Fonte: opentdb.com (public-apis → Games/Quiz) — pública, sem chave,
// CORS aberto. Problemas do cliente antigo que este REA corrige:
//   • sem SESSION TOKEN → a API repetia perguntas entre jogos (code 4)
//   • sem fila/limite de ritmo → code 5 (too many requests) silencioso
//   • shuffle com sort(() => Math.random() - 0.5) → enviesado
//   • decode com <textarea>.innerHTML → ineficiente e frágil
// Camadas: token de sessão com reset automático (codes 3/4) + fila
// serializada (1,2 s) + dedupe em voo + cache curto (StrictMode/duplo
// mount) + retry com backoff no code 5 + stale-on-error.
// Compat: fetchTriviaQuestions / decodeHTMLEntities / shuffleAnswers
// mantidos (MillionairePage + EnhancedMillionaireGame).
// ═══════════════════════════════════════════════════════════════════════

export interface TriviaQuestion {
  category: string;
  type: 'multiple' | 'boolean';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

export interface TriviaResponse {
  response_code: number;
  results: TriviaQuestion[];
}

// ── Categorias oficiais (ids estáveis da API), curadas para o público ──

export interface TriviaCategory {
  id: number;
  label: string;
}

export const TRIVIA_CATEGORIES: TriviaCategory[] = [
  { id: 9, label: "Conhecimento Geral" },
  { id: 21, label: "Desporto" },
  { id: 22, label: "Geografia" },
  { id: 23, label: "História" },
  { id: 17, label: "Ciência & Natureza" },
  { id: 18, label: "Computadores" },
  { id: 15, label: "Videojogos" },
  { id: 12, label: "Música" },
  { id: 11, label: "Filmes" },
  { id: 25, label: "Arte" },
  { id: 27, label: "Animais" },
  { id: 20, label: "Mitologia" },
];

// ── Camada de rede: token + fila + cache + dedupe ───────────────────────

const API_BASE = "https://opentdb.com";
const TOKEN_KEY = "bateu-otdb-token";
const CACHE_PREFIX = "bateu-otdb:";
const MIN_GAP_MS = 1200;
const MAX_RETRIES = 2;

let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;
let tokenPromise: Promise<string | null> | null = null;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // best-effort
  }
}

/** Pede (uma vez) um session token à API — evita perguntas repetidas. */
async function ensureToken(): Promise<string | null> {
  if (tokenPromise) return tokenPromise;
  tokenPromise = (async () => {
    const existing = readToken();
    if (existing) return existing;
    const res = await fetch(`${API_BASE}/api_token.php?command=request`);
    if (!res.ok) return null;
    const body = (await res.json()) as { token?: string; response_code?: number };
    if (body.response_code === 0 && body.token) {
      writeToken(body.token);
      return body.token;
    }
    return null;
  })();
  return tokenPromise;
}

async function rawFetch<T>(url: string): Promise<T> {
  const gap = Date.now() - lastCall;
  if (gap < MIN_GAP_MS) await sleep(MIN_GAP_MS - gap);
  lastCall = Date.now();
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`OpenTDB HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** Pedido com fila serializada + retry no rate-limit (code 5). */
async function queuedFetch<T>(url: string): Promise<T> {
  const run = async (): Promise<T> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await rawFetch<T>(url);
      } catch (err) {
        lastErr = err;
        await sleep(2500 * (attempt + 1)); // backoff
      }
    }
    throw lastErr;
  };
  const next = chain.then(run, run);
  chain = next.catch(() => undefined); // nunca deixa a fila morrer
  return next as Promise<T>;
}

interface CacheEntry<T> {
  t: number;
  data: T;
}

function readCache<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    return Date.now() - entry.t < ttlMs ? entry.data : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), data }));
  } catch {
    // quota cheia — cache é best-effort
  }
}

const inFlight = new Map<string, Promise<unknown>>();

/** Pedido de perguntas brutas com cache curto + dedupe em voo. */
async function questionsCached(
  amount: number,
  category?: number,
  difficulty?: 'easy' | 'medium' | 'hard',
): Promise<TriviaQuestion[]> {
  const key = `${amount}:${category ?? "all"}:${difficulty ?? "any"}`;
  const hit = readCache<TriviaQuestion[]>(key, 5 * 60_000);
  if (hit) return hit;
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<TriviaQuestion[]>;

  const p = (async () => {
    const token = await ensureToken();
    let url = `${API_BASE}/api.php?amount=${Math.min(Math.max(amount, 1), 50)}`;
    if (category) url += `&category=${category}`;
    if (difficulty) url += `&difficulty=${difficulty}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      const body = await queuedFetch<TriviaResponse>(token ? `${url}&token=${encodeURIComponent(token)}` : url);
      // 0 ok · 1 sem resultados · 2 parâmetro inválido · 3/4 token expirou/esgotou · 5 rate limit
      if (body.response_code === 0) return body.results ?? [];
      if (body.response_code === 3 || body.response_code === 4) {
        // token morto → reset e tenta mais uma vez sem/s com token novo
        writeToken(null);
        tokenPromise = null;
        const fresh = await ensureToken();
        const retry = await queuedFetch<TriviaResponse>(
          fresh ? `${url}&token=${encodeURIComponent(fresh)}` : url,
        );
        if (retry.response_code === 0) return retry.results ?? [];
        return [];
      }
      if (body.response_code === 5) {
        await sleep(2500);
        continue; // rate limit → tenta outra vez
      }
      return []; // 1/2 → não vai melhorar com retry
    }
    return [];
  })();

  inFlight.set(key, p);
  try {
    const data = await p;
    if (data.length > 0) writeCache(key, data);
    return data;
  } finally {
    inFlight.delete(key);
  }
}

// ── Utilitários seguros ─────────────────────────────────────────────────

/** Decodifica entidades HTML da API (DOMParser — sem tocar no DOM vivo). */
export const decodeHTMLEntities = (text: string): string => {
  if (!text) return "";
  try {
    return new DOMParser().parseFromString(text, "text/html").documentElement.textContent ?? text;
  } catch {
    return text;
  }
};

function randInt(maxExclusive: number): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % maxExclusive; // módulo com enviesamento desprezável para 4-6 opções
  }
  return Math.floor(Math.random() * maxExclusive);
}

/** Fisher-Yates sem viés (o antigo sort(random) enviesava as posições). */
export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── API pública (compat) ────────────────────────────────────────────────

/** Compat: perguntas brutas da API (como antes, agora com token/fila/cache). */
export const fetchTriviaQuestions = async (
  amount: number = 15,
  category?: number,
  difficulty?: 'easy' | 'medium' | 'hard',
  type?: 'multiple' | 'boolean'
): Promise<TriviaQuestion[]> => {
  try {
    const results = await questionsCached(amount, category, difficulty);
    return type && type !== "multiple" ? results.filter((r) => r.type === type) : results;
  } catch (error) {
    console.error('Failed to fetch trivia questions:', error);
    return [];
  }
};

/** Compat: embaralha as 4 opções e devolve a letra correta. */
export const shuffleAnswers = (correct: string, incorrect: string[]): {
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
} => {
  const options = shuffle([correct, ...incorrect]);
  const correctIndex = options.indexOf(correct);
  const letters = ['A', 'B', 'C', 'D'];
  return {
    option_a: options[0],
    option_b: options[1],
    option_c: options[2],
    option_d: options[3],
    correct_answer: letters[correctIndex] ?? "A",
  };
};

/** Pergunta pronta para jogo (decodificada + opções embaralhadas). */
export interface ReadyQuestion {
  text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options: string[];
  correctIndex: number;
}

/** Alto nível: busca + decodifica + embaralha numa só chamada. */
export const getReadyQuestions = async (
  amount: number,
  category?: number,
  difficulty?: 'easy' | 'medium' | 'hard',
): Promise<ReadyQuestion[]> => {
  const raw = await questionsCached(amount, category, difficulty);
  return raw
    .filter((q) => q.type === "multiple")
    .map((q) => {
      const correct = decodeHTMLEntities(q.correct_answer);
      const options = shuffle([correct, ...q.incorrect_answers.map(decodeHTMLEntities)]);
      return {
        text: decodeHTMLEntities(q.question),
        category: q.category,
        difficulty: q.difficulty,
        options,
        correctIndex: options.indexOf(correct),
      };
    });
};

/** Escada de dificuldade estilo "Quem Quer Ser Milionário": easy → hard. */
export const getLadderQuestions = async (
  perLevel: number,
  category?: number,
): Promise<TriviaQuestion[]> => {
  const difficulties: Array<'easy' | 'medium' | 'hard'> = ["easy", "medium", "hard"];
  const legs = await Promise.all(
    difficulties.map((d) => questionsCached(perLevel, category, d).catch(() => [])),
  );
  const combined = legs.flat();
  if (combined.length === 0) return [];
  // Se alguma perna falhou, completa com o que houver (mantém a ordem easy→hard).
  const ordered: TriviaQuestion[] = [];
  difficulties.forEach((d) => {
    ordered.push(...shuffle(combined.filter((q) => q.difficulty === d)).slice(
      0,
      Math.max(perLevel, 0),
    ));
  });
  return ordered;
};
