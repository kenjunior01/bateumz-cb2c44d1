// Stores user payment preferences locally for "1-Click Buy" flow.
// Nothing sensitive — only the chosen method label and phone hint.

export type StoredMethod =
  | "mpesa" | "emola" | "card"
  | "multicaixa" | "unitelMoney" | "africellMoney" | "baiTransfer" | "bfaTransfer"
  | "pix" | "boleto" | "cardBR"
  | "paypal";

const KEY = "bateu_oneclick_v1";

export interface OneClickPrefs {
  method: StoredMethod;
  phone?: string;
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
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...prefs, updatedAt: new Date().toISOString() })
    );
  } catch {}
};

export const clearOneClick = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {}
};
