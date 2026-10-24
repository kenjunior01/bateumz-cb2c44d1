// ═══════════════════════════════════════════════════════════════
// activityBus — o sistema nervoso da plataforma Bateu.
//
// Toda atividade real (inscrições, lances, ligas criadas, torneios,
// vitórias, créditos) passa por aqui e aparece como ATUALIZAÇÃO ao
// vivo em todas as funcionalidades: homepage, marketplace, esports,
// ligas, torneios e jogos.
//
// Transportes (em camadas, todos opcionais):
//   1. window CustomEvent     → mesma tab, latência zero
//   2. BroadcastChannel       → outras tabs da mesma sessão
//   3. localStorage           → persistência local + tabs antigas
//   4. Supabase (view)        → atividade de toda a plataforma
//
// Princípio honesto: só registramos ações que aconteceram de verdade
// nesta sessão ou na base de dados. Sem dados falsos.
// ═══════════════════════════════════════════════════════════════

export type ActivityType =
  | "raffle"      // bilhete comprado / sorteio criado
  | "winner"      // vitória em sorteio ou jogo
  | "contest"     // concurso
  | "tournament"  // torneio (criação, inscrição, resultado)
  | "business"    // empresa nova no ecossistema
  | "league"      // liga (criação, inscrição, jornada)
  | "auction"     // leilão (lance, compra imediata)
  | "market"      // marketplace (produto publicado, venda)
  | "game"        // jogo (conquista, recorde)
  | "live"        // jogos de palco — rodada de roleta/quiz/sorteio ao vivo na empresa
  | "credit"      // créditos/1GB/bonificações

export interface PlatformActivity {
  id: string;
  type: ActivityType;
  title: string;
  detail?: string | null;
  href?: string | null;
  created_at: string;
  source: "server" | "local";
}

const STORAGE_KEY = "bateu:activities";
const CHANNEL_NAME = "bateu-activity-bus";
const MAX_LOCAL = 60;
const EVENT_NAME = "bateu:activity";

// ---- transporte local ----------------------------------------------------

let bc: BroadcastChannel | null = null;
function getBC(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (bc) return bc;
  try { bc = new BroadcastChannel(CHANNEL_NAME); } catch { bc = null; }
  return bc;
}

function readLocal(): PlatformActivity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as PlatformActivity[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: PlatformActivity[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_LOCAL)));
  } catch { /* quota — ignorar */ }
}

function uid(): string {
  return `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Publica uma atividade REAL que acabou de acontecer nesta sessão. */
export function publishActivity(
  type: ActivityType,
  title: string,
  opts?: { detail?: string; href?: string },
): PlatformActivity | null {
  if (typeof window === "undefined") return null;
  const act: PlatformActivity = {
    id: uid(),
    type,
    title,
    detail: opts?.detail ?? null,
    href: opts?.href ?? null,
    created_at: new Date().toISOString(),
    source: "local",
  };
  // 1. persistir
  const all = [act, ...readLocal()].slice(0, MAX_LOCAL);
  writeLocal(all);
  // 2. mesma tab
  try { window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: act })); } catch { /* ssr */ }
  // 3. outras tabs
  getBC()?.postMessage(act);
  return act;
}

/** Subscrição de baixo nível: dispara a cada atividade publicada em qualquer tab. */
export function onActivity(cb: (act: PlatformActivity) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const winCb = (e: Event) => cb((e as CustomEvent<PlatformActivity>).detail);
  window.addEventListener(EVENT_NAME, winCb);
  const channel = getBC();
  const bcCb = (msg: MessageEvent) => cb(msg.data as PlatformActivity);
  channel?.addEventListener("message", bcCb);
  const storageCb = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const arr = JSON.parse(e.newValue) as PlatformActivity[];
        if (arr[0]) cb(arr[0]);
      } catch { /* ignora */ }
    }
  };
  window.addEventListener("storage", storageCb);
  return () => {
    window.removeEventListener(EVENT_NAME, winCb);
    channel?.removeEventListener("message", bcCb);
    window.removeEventListener("storage", storageCb);
  };
}

/** Carrega atividade do servidor (view platform_recent_activity) com tolerância a falhas. */
export async function fetchServerActivity(limit = 20): Promise<PlatformActivity[]> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await (supabase as any)
      .from("platform_recent_activity")
      .select("type, title, detail, href, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as any[]).map((r) => ({
      id: `srv-${r.type}-${r.href ?? ""}-${r.created_at}`,
      type: (r.type as ActivityType) ?? "contest",
      title: r.title,
      detail: r.detail ?? null,
      href: r.href ?? null,
      created_at: r.created_at,
      source: "server" as const,
    }));
  } catch {
    return [];
  }
}

/** Combina servidor + local, deduplica e ordena (mais recente primeiro). */
export function mergeActivities(server: PlatformActivity[], local: PlatformActivity[]): PlatformActivity[] {
  const seen = new Set<string>();
  const out: PlatformActivity[] = [];
  for (const a of [...local, ...server]) {
    const key = `${a.type}|${a.href ?? ""}|${a.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out.sort((x, y) => (x.created_at < y.created_at ? 1 : -1));
}

// ---- hook React -----------------------------------------------------------

import { useEffect, useState, useCallback } from "react";

/**
 * useActivityFeed — fonte única de verdade para TODA atividade visível.
 * Server (poll 30s) + local (instantâneo via bus) → feed unificado.
 */
export function useActivityFeed(limit = 12) {
  const [items, setItems] = useState<PlatformActivity[]>([]);
  const [loaded, setLoaded] = useState(false);

  const apply = useCallback((merged: PlatformActivity[]) => {
    setItems(merged.slice(0, limit));
  }, [limit]);

  useEffect(() => {
    let alive = true;

    const refresh = async () => {
      const server = await fetchServerActivity(20);
      if (!alive) return;
      apply(mergeActivities(server, readLocal()));
      setLoaded(true);
    };

    // arranca com o que já existe localmente (instantâneo)
    apply(mergeActivities([], readLocal()));
    setLoaded(true);
    refresh();

    const iv = setInterval(refresh, 30_000);
    const off = onActivity((act) => {
      if (!alive) return;
      // atividade recebida → merge imediato (mesmo sem passar pelo localStorage)
      const local = act && act.id ? [act, ...readLocal()] : readLocal();
      apply(mergeActivities([], local));
      void refresh();
    });

    return () => {
      alive = false;
      clearInterval(iv);
      off();
    };
  }, [apply]);

  return { items, loaded };
}
