/**
 * Returns the canonical public base URL of the platform.
 *
 * Used for share/overlay links that must be stable across environments
 * (e.g. OBS Browser Source needs to load the overlay from the same
 * origin as the host tab so BroadcastChannel + storage events sync).
 *
 * Priority:
 *  1. VITE_PUBLIC_BASE_URL env override
 *  2. Current origin if already on the production domain
 *  3. https://bateu.online (paid custom domain)
 */
const PRODUCTION_HOSTS = ["bateu.online", "www.bateu.online"];
const DEFAULT_BASE = "https://bateu.online";

export const getPublicBaseUrl = (): string => {
  const envBase = (import.meta as any).env?.VITE_PUBLIC_BASE_URL as string | undefined;
  if (envBase) return envBase.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    try {
      const host = window.location.hostname;
      if (PRODUCTION_HOSTS.includes(host)) return window.location.origin;
    } catch { /* noop */ }
  }
  return DEFAULT_BASE;
};

export const isOnPublicDomain = (): boolean => {
  if (typeof window === "undefined") return false;
  try { return PRODUCTION_HOSTS.includes(window.location.hostname); } catch { return false; }
};

export const buildOverlayUrl = (code: string): string =>
  `${getPublicBaseUrl()}/lives/overlay?code=${encodeURIComponent(code)}`;
