import type { Lang } from "@/contexts/LanguageContext";

const SUPPORTED: Lang[] = ["en", "pt", "pt-BR", "es", "fr", "hi"];

/** Default UI language when the user has not explicitly chosen one. */
export const COUNTRY_DEFAULT_LANG: Record<string, Lang> = {
  US: "en",
  CA: "en",
  PT: "pt",
  BR: "pt-BR",
  MZ: "pt",
  AO: "pt",
  IN: "hi",
};

export function detectCountryFromNavigator(): string {
  if (typeof navigator === "undefined") return "US";
  const loc = (navigator.language || "").toLowerCase();
  if (loc.endsWith("-ca")) return "CA";
  if (loc.endsWith("-br") || loc === "pt-br") return "BR";
  if (loc === "pt" || loc.endsWith("-pt")) return "PT";
  if (loc.endsWith("-mz")) return "MZ";
  if (loc.endsWith("-ao")) return "AO";
  if (loc.endsWith("-in") || loc === "hi" || loc === "hi-in") return "IN";
  return "US";
}

export function resolveLangFromCountry(country: string, dbDefault?: string | null): Lang {
  const db = dbDefault?.toLowerCase().replace("_", "-");
  if (db === "pt-br") return "pt-BR";
  if (db && SUPPORTED.includes(db as Lang)) return db as Lang;
  return COUNTRY_DEFAULT_LANG[country.toUpperCase()] ?? "pt";
}

export function isLangExplicitlyChosen(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("bateu_lang_explicit") === "1";
}

export function getStoredCountry(): string {
  if (typeof window === "undefined") return "MZ";
  return (localStorage.getItem("bateu_country") || detectCountryFromNavigator()).toUpperCase();
}
