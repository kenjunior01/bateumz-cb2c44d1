/**
 * Live Hub pub/sub bus.
 *
 * Historically synced only across tabs on the same browser profile via
 * BroadcastChannel + localStorage `storage` events. That does NOT work for
 * OBS Browser Source, which runs its own isolated Chromium process — even
 * on the same machine, the storage/BroadcastChannel are not shared.
 *
 * Fix: also mirror publish/subscribe over a Supabase Realtime broadcast
 * channel keyed by the current live code, so any device (OBS on another PC,
 * a phone previewing the overlay, etc.) receives the same events in real
 * time. Local BroadcastChannel/storage remain as a low-latency fallback for
 * same-profile tabs and to hydrate late subscribers from cache.
 */

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type RoundState = {
  game: string;
  phase: "idle" | "running" | "ended";
  timeLeft: number;
  totalTime?: number;
  score?: number;
  meta?: Record<string, any>;
  at: number;
};

export type LiveBusEvent =
  | { type: "leaderboard"; payload: Array<{ id: string; name: string; score: number; game: string; at: number }> }
  | { type: "winner"; payload: { name: string; meta?: string; at: number } }
  | { type: "config"; payload: any }
  | { type: "wheelPrizes"; payload: any }
  | { type: "liveCode"; payload: string }
  | { type: "activeGame"; payload: string }
  | { type: "roundState"; payload: RoundState }
  | { type: "liveStarted"; payload: { code: string; at: number } }
  | { type: "liveEnded"; payload: { code: string; at: number } };

const CHANNEL_NAME = "bateu-live-hub";
const STORAGE_PREFIX = "liveBus:";

// ---- Local (same-profile) transport ----
let channel: BroadcastChannel | null = null;
const getChannel = () => {
  if (typeof window === "undefined") return null;
  if (channel) return channel;
  try { channel = new BroadcastChannel(CHANNEL_NAME); } catch { channel = null; }
  return channel;
};

// ---- Cross-device transport (Supabase Realtime) ----
// A single shared channel per live code. Publishers and subscribers on any
// device attach to the same room and exchange broadcast events.
let rtChannel: RealtimeChannel | null = null;
let rtChannelCode: string | null = null;
let rtSubscribed = false;
const rtHandlers = new Set<(evt: LiveBusEvent) => void>();

const currentLiveCode = (): string => {
  try {
    // liveCode is stored via publish("liveCode", ...) below; readLatest can't be
    // called before it's defined, so read localStorage directly.
    const raw = typeof window !== "undefined"
      ? localStorage.getItem(`${STORAGE_PREFIX}liveCode`)
      : null;
    if (!raw) return "LIVE";
    const parsed = JSON.parse(raw);
    return (parsed?.payload as string) || "LIVE";
  } catch { return "LIVE"; }
};

const roomName = (code: string) => `live:${(code || "LIVE").toUpperCase()}`;

const ensureRealtime = (code: string) => {
  if (typeof window === "undefined") return null;
  const target = roomName(code);
  if (rtChannel && rtChannelCode === target) return rtChannel;
  // Rebind if the code changed.
  if (rtChannel) {
    try { supabase.removeChannel(rtChannel); } catch { /* noop */ }
    rtChannel = null;
    rtSubscribed = false;
  }
  rtChannelCode = target;
  rtChannel = supabase.channel(target, { config: { broadcast: { self: false } } });
  rtChannel.on("broadcast", { event: "bus" }, (msg: any) => {
    const evt = msg?.payload as LiveBusEvent | undefined;
    if (!evt || !evt.type) return;
    rtHandlers.forEach((h) => { try { h(evt); } catch { /* noop */ } });
  });
  rtChannel.subscribe((status) => {
    rtSubscribed = status === "SUBSCRIBED";
  });
  return rtChannel;
};

export const publish = (evt: LiveBusEvent) => {
  if (typeof window === "undefined") return;

  // 1. Same-profile fast path
  const ch = getChannel();
  ch?.postMessage(evt);
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${evt.type}`, JSON.stringify({ ...evt, _ts: Date.now() }));
  } catch { /* noop */ }

  // 2. Cross-device via Supabase Realtime
  // If the event itself sets the live code, use it to bind the room; otherwise use the latest known code.
  const code = evt.type === "liveCode" ? (evt.payload as string) : currentLiveCode();
  const rc = ensureRealtime(code);
  if (rc && rtSubscribed) {
    rc.send({ type: "broadcast", event: "bus", payload: evt }).catch(() => { /* noop */ });
  } else if (rc) {
    // Queue a one-shot resend once SUBSCRIBED — Supabase Realtime buffers this internally in most cases,
    // but the explicit retry avoids losing the very first event after a fresh page load.
    setTimeout(() => {
      try { rc.send({ type: "broadcast", event: "bus", payload: evt }); } catch { /* noop */ }
    }, 400);
  }
};

export const subscribe = (handler: (evt: LiveBusEvent) => void) => {
  if (typeof window === "undefined") return () => {};

  // Local
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

  // Cross-device
  rtHandlers.add(handler);
  ensureRealtime(currentLiveCode());

  return () => {
    ch?.removeEventListener("message", onMsg);
    window.removeEventListener("storage", onStorage);
    rtHandlers.delete(handler);
  };
};

/** Rebind the realtime room when the live code changes (e.g. overlay reads ?code=…). */
export const bindLiveCode = (code: string) => {
  if (!code) return;
  ensureRealtime(code);
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
