import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RegionalTheme {
  id: string;
  country_code: string;
  name?: string | null;
  label: string;
  flag?: string | null;
  theme_colors?: any | null;
  logo_url?: string | null;
  banner_url?: string | null;
  custom_css?: string | null;
  default_language?: string | null;
  tagline?: string | null;
}

interface Ctx {
  country: string;
  setCountry: (c: string) => void;
  region: RegionalTheme | null;
  loading: boolean;
  translations: Record<string, string>;
  rt: (key: string, fallback?: string) => string;
  reload: () => Promise<void>;
}

const RegionalThemeContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "bateu_country";

function detectInitialCountry(): string {
  if (typeof window === "undefined") return "US";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return saved.toUpperCase();
  const loc = (navigator.language || "").toLowerCase();
  if (loc.endsWith("-ca")) return "CA";
  if (loc.endsWith("-br") || loc === "pt-br") return "BR";
  if (loc === "pt" || loc.endsWith("-pt")) return "PT";
  if (loc.endsWith("-mz")) return "MZ";
  if (loc.endsWith("-ao")) return "AO";
  if (loc.endsWith("-in") || loc === "hi" || loc === "hi-in") return "IN";
  return "US";
}

function applyCssVars(theme: RegionalTheme | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Clear previous custom style block
  const existing = document.getElementById("bateu-region-custom-css");
  if (existing) existing.remove();
  if (!theme) {
    root.style.removeProperty("--region-primary");
    root.style.removeProperty("--region-secondary");
    root.style.removeProperty("--region-accent");
    return;
  }
  const colors = theme.theme_colors as any;
  if (colors?.primary) root.style.setProperty("--region-primary", colors.primary);
  if (colors?.secondary) root.style.setProperty("--region-secondary", colors.secondary);
  if (colors?.accent) root.style.setProperty("--region-accent", colors.accent);
  if (theme.custom_css && theme.custom_css.trim()) {
    const style = document.createElement("style");
    style.id = "bateu-region-custom-css";
    // Basic safety: scope under :root so accidental selectors stay contained-ish
    style.textContent = theme.custom_css;
    document.head.appendChild(style);
  }
}

export function RegionalThemeProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<string>(detectInitialCountry);
  const [region, setRegion] = useState<RegionalTheme | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const setCountry = (c: string) => {
    const code = c.toUpperCase();
    setCountryState(code);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, code);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: regionRow } = await supabase
        .from("regions")
        .select("*")
        .eq("country_code", country)
        .eq("is_active", true)
        .maybeSingle();

      const theme = (regionRow as unknown as RegionalTheme) || null;
      setRegion(theme);
      applyCssVars(theme);

      const lang = theme?.default_language || "en";
      // Load translations: global (region_id is null) + region-specific. Region overrides global.
      const { data: trans } = await supabase
        .from("translations")
        .select("key,value,region_id")
        .eq("language_code", lang)
        .or(`region_id.is.null,region_id.eq.${theme?.id ?? "00000000-0000-0000-0000-000000000000"}`);

      const map: Record<string, string> = {};
      // Apply globals first, then region-specific overrides
      (trans || [])
        .sort((a: any, b: any) => (a.region_id ? 1 : 0) - (b.region_id ? 1 : 0))
        .forEach((t: any) => { map[t.key] = t.value; });
      setTranslations(map);
    } finally {
      setLoading(false);
    }
  }, [country]);

  useEffect(() => { load(); }, [load]);

  const rt = (key: string, fallback?: string) => translations[key] ?? fallback ?? key;

  const value = useMemo<Ctx>(() => ({
    country, setCountry, region, loading, translations, rt, reload: load,
  }), [country, region, loading, translations, load]);

  return <RegionalThemeContext.Provider value={value}>{children}</RegionalThemeContext.Provider>;
}

export function useRegionalTheme() {
  const ctx = useContext(RegionalThemeContext);
  if (!ctx) {
    return {
      country: "US",
      setCountry: () => {},
      region: null,
      loading: false,
      translations: {},
      rt: (k: string, f?: string) => f ?? k,
      reload: async () => {},
    } as Ctx;
  }
  return ctx;
}
