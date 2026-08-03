import { supabase } from "@/integrations/supabase/client";

export type ResetStage = "requested" | "opened" | "verified" | "failed" | "completed" | "resent";
export type ResetReason =
  | "token_missing"
  | "token_mismatch"
  | "expired"
  | "replayed"
  | "invalid"
  | "no_session"
  | "rate_limited"
  | "ok"
  | "unknown";

const EMAIL_KEY = "bateu_reset_email";

export function rememberResetEmail(email: string) {
  try {
    localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    /* ignore */
  }
}

export function getRememberedResetEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

/** Classify a Supabase auth error / URL error description into a stable reason code. */
export function classifyResetError(message?: string | null): ResetReason {
  const m = (message || "").toLowerCase();
  if (!m) return "unknown";
  if (m.includes("expired")) return "expired";
  if (m.includes("already") || m.includes("used")) return "replayed";
  if (m.includes("not found") || m.includes("mismatch")) return "token_mismatch";
  if (m.includes("invalid")) return "invalid";
  if (m.includes("rate") || m.includes("too many")) return "rate_limited";
  return "unknown";
}

export async function logResetEvent(payload: {
  stage: ResetStage;
  reason?: ResetReason;
  email?: string;
  linkType?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabase.functions.invoke("log-password-reset", { body: payload });
  } catch (e) {
    console.warn("reset telemetry failed", e);
  }
}
