// Stored payment preferences for fast checkout. North American market = PayPal default.

export type StoredMethod = "paypal" | "card";

const KEY = "bateu_oneclick_v1";

export interface OneClickPrefs {
  method: StoredMethod;
  email?: string;
  updatedAt: string;
}

export const getOneClick = (): OneClickPrefs | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OneClickPrefs) : null;
  } catch {
    return null;
  }
};

export const saveOneClick = (prefs: Omit<OneClickPrefs, "updatedAt">) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...prefs, updatedAt: new Date().toISOString() }));
  } catch {}
};

export const clearOneClick = () => {
  try { localStorage.removeItem(KEY); } catch {}
};
