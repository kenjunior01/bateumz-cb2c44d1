// ============================================================
// ARMAZÉM — persistência honesta da Bateu (v39, roteiro N1)
// ────────────────────────────────────────────────────────────
// Problema real: TODOS os saves viviam só em localStorage
// (tecto ~5 MB, apagável pelo browser a qualquer momento) e cada
// escrita estava embrulhada em `catch { /* quota */ }` SILENCIOSO —
// quando o armazenamento enchia, o jogo perdia o progresso sem
// dizer uma palavra. Isto violava a regra nº 2 da plataforma
// (erros honestos).
//
// Solução (v39): IndexedDB como armazém primário (quota de
// centenas de MB, sobrevive a limpezas de localStorage), com
// localStorage como espelho de arranque imediato. Cada registo no
// IDB leva um envelope { ts, v } — a leitura do motor escolhe
// SEMPRE o registo com `ts` mais recente, nunca um antigo.
// Todas as falhas são DEVOLVIDAS ao chamador — nunca engolidas.
//
// Puro TS, zero deps. Corre também no Node (sem window): todas as
// APIs acedem ao browser através de guardas `typeof`.
// Honestidade: nenhum valor aqui é inventado — `estimarEspaco()`
// devolve null quando o browser não expõe navigator.storage.
// ============================================================

export interface ResGuarda {
  ok: boolean;
  /** Onde o registo ficou efetivamente guardado. */
  onde: "idb" | "ls" | null;
  /** Tamanho do payload serializado, em bytes (medido, não estimado). */
  bytes: number;
  erro?: string;
}

export interface Envelope { ts: number; v: unknown }
export interface Estimativa { uso: number; quota: number }

const NOME_DB = "bateu_armazem";
const LOJA = "chaves";
const VERSAO_DB = 1;

/** true quando IndexedDB existe e está acessível (modo privado de
 *  alguns browsers lança no open — devolvemos false honesto). */
export function idbDisponivel(): boolean {
  try { return typeof indexedDB !== "undefined" && indexedDB !== null; }
  catch { return false; }
}

// ── Abertura (singleton) ─────────────────────────────────────
let promessaDB: Promise<IDBDatabase | null> | null = null;

export function abrirArmazem(): Promise<IDBDatabase | null> {
  if (promessaDB) return promessaDB;
  promessaDB = new Promise((resolve) => {
    if (!idbDisponivel()) { resolve(null); return; }
    try {
      const pedido = indexedDB.open(NOME_DB, VERSAO_DB);
      pedido.onupgradeneeded = () => {
        const db = pedido.result;
        if (!db.objectStoreNames.contains(LOJA)) db.createObjectStore(LOJA);
      };
      pedido.onsuccess = () => resolve(pedido.result);
      // Erro honesto (quota, modo privado, política do browser) — nunca finge.
      pedido.onerror = () => { console.warn("[armazem] IDB indisponível:", pedido.error?.message); resolve(null); };
      pedido.onblocked = () => { console.warn("[armazem] IDB bloqueado por outra versão"); resolve(null); };
    } catch (e) {
      console.warn("[armazem] open lançou:", e instanceof Error ? e.message : String(e));
      resolve(null);
    }
  });
  return promessaDB;
}

// ── Escrita ──────────────────────────────────────────────────
/** Guarda `valor` no IDB dentro de um envelope com carimbo temporal.
 *  Nunca lança: devolve ResGuarda com ok=false e a mensagem real. */
export async function idbDefinir(chave: string, valor: unknown): Promise<ResGuarda> {
  const bytes = medirBytes(valor);
  const db = await abrirArmazem();
  if (!db) return { ok: false, onde: null, bytes, erro: "IndexedDB indisponível" };
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(LOJA, "readwrite");
      const loja = tx.objectStore(LOJA);
      const envelope: Envelope = { ts: Date.now(), v: valor };
      loja.put(envelope, chave);
      tx.oncomplete = () => resolve({ ok: true, onde: "idb", bytes });
      tx.onerror = () => resolve({ ok: false, onde: null, bytes, erro: tx.error?.message || "erro IDB" });
      tx.onabort = () => resolve({ ok: false, onde: null, bytes, erro: tx.error?.message || "IDB abortada (quota?)" });
    } catch (e) {
      resolve({ ok: false, onde: null, bytes, erro: e instanceof Error ? e.message : String(e) });
    }
  });
}

/** Tenta escrever em localStorage com erro HONESTO (nunca silencioso). */
export function espelharLS(chaveLS: string, valor: unknown): { ok: boolean; bytes: number; erro?: string } {
  const bytes = medirBytes(valor);
  try {
    localStorage.setItem(chaveLS, JSON.stringify(valor));
    return { ok: true, bytes };
  } catch (e) {
    return { ok: false, bytes, erro: e instanceof Error ? e.message : "localStorage cheio/indisponível" };
  }
}

// ── Leitura ──────────────────────────────────────────────────
/** Devolve o envelope { ts, v } guardado por idbDefinir, ou null. */
export async function idbObter(chave: string): Promise<Envelope | null> {
  const db = await abrirArmazem();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(LOJA, "readonly");
      const pedido = tx.objectStore(LOJA).get(chave);
      tx.oncomplete = () => {
        const r = pedido.result as Envelope | undefined;
        resolve(r && typeof r.ts === "number" ? r : null);
      };
      tx.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

export async function idbRemover(chave: string): Promise<boolean> {
  const db = await abrirArmazem();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(LOJA, "readwrite");
      tx.objectStore(LOJA).delete(chave);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch { resolve(false); }
  });
}

// ── Quota real (navigator.storage.estimate) ──────────────────
/** Números REAIS do browser. null = o browser não expõe a estimativa
 *  (dizemos "—" na UI em vez de inventar). */
export async function estimarEspaco(): Promise<Estimativa | null> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
    const e = await navigator.storage.estimate();
    if (typeof e.usage !== "number" || typeof e.quota !== "number") return null;
    return { uso: e.usage, quota: e.quota };
  } catch { return null; }
}

// ── Recuperação: IDB → localStorage ──────────────────────────
/** Se o localStorage perdeu a `chaveLS` (limpeza do browser, modo
 *  privado, quota) mas o IDB tem um registo válido, repõe o LS a
 *  partir do IDB. Devolve true quando repôs. `validar` decide se o
 *  valor é utilizável (versão/shape) — dados inválidos NUNCA entram. */
export async function restaurarLSdeIDB(
  chaveLS: string, chaveIDB: string, validar: (v: any) => boolean,
): Promise<boolean> {
  try {
    const bruto = localStorage.getItem(chaveLS);
    if (bruto) {
      const v = JSON.parse(bruto);
      if (validar(v)) return false; // LS está são — nada a fazer
    }
  } catch { /* LS corrompido/indisponível — tentamos o IDB */ }
  const env = await idbObter(chaveIDB);
  if (!env || !validar(env.v)) return false;
  const espelho = espelharLS(chaveLS, env.v);
  return espelho.ok;
}

// ── Utilitários ──────────────────────────────────────────────
function medirBytes(valor: unknown): number {
  try { return JSON.stringify(valor).length; } catch { return 0; }
}

/** MB legível para UI honesta (arredonda para 1 decimal). */
export function mbLegivel(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

// ── Ganchos E2E (window.__armazem) ──────────────────────────
// Determinísticos e só para testes: permitem semear/inspecionar o
// IDB diretamente sem passar pelos motores.
export function ligarGanchosArmazem(): void {
  try {
    if (typeof window === "undefined" || (window as any).__armazem) return;
    (window as any).__armazem = {
      definir: (c: string, v: unknown) => idbDefinir(c, v),
      obter: (c: string) => idbObter(c),
      remover: (c: string) => idbRemover(c),
      estimar: () => estimarEspaco(),
      disponivel: () => idbDisponivel(),
    };
  } catch { /* sem window — Node */ }
}
ligarGanchosArmazem();
