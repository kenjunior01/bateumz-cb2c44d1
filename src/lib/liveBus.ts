/**
 * Tiny pub/sub bus that syncs Live Hub state with overlay tabs/windows
 * without polling. Uses BroadcastChannel when available and falls back
 * to the `storage` event for cross-tab sync (works for OBS browser source
 * loaded on the same origin).
 */

export type LiveBusEvent =
  | { type: "leaderboard"; payload: Array<{ id: string; name: string; score: number; game: string; at: number }> }
  | { type: "winner"; payload: { name: string; meta?: string; at: number } }
  | { type: "config"; payload: any }
  | { type: "wheelPrizes"; payload: any }
  | { type: "liveCode"; payload: string };

const CHANNEL_NAME = "bateu-live-hub";
const STORAGE_PREFIX = "liveBus:";

let channel: BroadcastChannel | null = null;
const getChannel = () => {
  if (typeof window === "undefined") return null;
  if (channel) return channel;
  try { channel = new BroadcastChannel(CHANNEL_NAME); } catch { channel = null; }
  return channel;
};

export const publish = (evt: LiveBusEvent) => {
  if (typeof window === "undefined") return;
  const ch = getChannel();
  ch?.postMessage(evt);
  // Fallback: write to localStorage so other tabs receive a `storage` event.
  // Use a unique key so the same-value-write still fires the event.
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${evt.type}`, JSON.stringify({ ...evt, _ts: Date.now() }));
  } catch { /* noop */ }
};

export const subscribe = (handler: (evt: LiveBusEvent) => void) => {
  if (typeof window === "undefined") return () => {};
  const ch = getChannel();
  const onMsg = (e: MessageEvent) => handler(e.data as LiveBusEvent);
  ch?.addEventListener("message", onMsg);

  const onStorage = (e: StorageEvent) => {
    if (!e.key || !e.newValue || !e.key.startsWith(STORAGE_PREFIX)) return;
    try {
      const parsed = JSON.parse(e.newValue);
      handler(parsed as LiveBusEvent);
    } catch { /* noop */ }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    ch?.removeEventListener("message", onMsg);
    window.removeEventListener("storage", onStorage);
  };
};

/** Read the most recently published value for a given event type (for late subscribers). */
export const readLatest = <T = any>(type: LiveBusEvent["type"]): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${type}`);
    if (!raw) return null;
    return (JSON.parse(raw) as any).payload as T;
  } catch { return null; }
};
