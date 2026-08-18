import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { SupportedCurrency } from "@/lib/currency";
import { formatMoney } from "@/lib/currency";

interface CurrencyContextValue {
  currency: SupportedCurrency;
  setCurrency: (c: SupportedCurrency) => void;
  format: (value: number) => string;
  formatMoney: (value: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);
const STORAGE_KEY = "bateu_currency";

function detectInitial(): SupportedCurrency {
  if (typeof window === "undefined") return "USD";
  const saved = localStorage.getItem(STORAGE_KEY) as SupportedCurrency | null;
  if (saved === "USD" || saved === "CAD" || saved === "INR") return saved;
  const loc = (navigator.language || "").toLowerCase();
  if (loc.endsWith("-ca") || loc.includes("fr-ca")) return "CAD";
  if (loc.endsWith("-in")) return "INR";
  return "USD";
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>(detectInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const fmt = (v: number) => formatMoney(v, currency);
  const value: CurrencyContextValue = {
    currency,
    setCurrency: (c) => setCurrencyState(c),
    format: fmt,
    formatMoney: fmt,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    const fallback = (v: number) => formatMoney(v, "MZN");
    return {
      currency: "MZN" as SupportedCurrency,
      setCurrency: () => {},
      format: fallback,
      formatMoney: fallback,
    };
  }
  return ctx;
}
