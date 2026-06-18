import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { isLangExplicitlyChosen, resolveLangFromCountry } from "@/lib/country-language";

/**
 * Keeps UI language aligned with the selected country unless the user
 * manually picked a language via LanguageSwitcher.
 */
export default function CountryLanguageSync() {
  const { country, region } = useRegionalTheme();
  const { lang, setLang } = useLanguage();

  useEffect(() => {
    if (isLangExplicitlyChosen()) return;
    const next = resolveLangFromCountry(country, region?.default_language);
    if (next === lang) return;
    setLang(next, { explicit: false });
  }, [country, region?.default_language, lang, setLang]);

  return null;
}
