import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, MapPin, TrendingUp, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { COUNTRIES } from "@/lib/regions";

const TRENDING = ["iPhone 15", "Toyota", "Viagem Dubai", "PlayStation 5", "Apartamento", "Moto"];

const QUICK_CHIP_KEYS = [
  { key: "search.chip.trending", value: "trending" },
  { key: "search.chip.new", value: "new" },
  { key: "search.chip.ending", value: "ending" },
  { key: "search.chip.cheap", value: "cheap" },
  { key: "search.chip.premium", value: "premium" },
];

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const { country } = useRegionalTheme();
  const countryLabel = COUNTRIES.find((c) => c.code === country)?.label || country;

  useEffect(() => {
    // Slow rotation, paused if user prefers reduced motion
    if (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const i = setInterval(() => setPlaceholderIdx((v) => (v + 1) % TRENDING.length), 3500);
    return () => clearInterval(i);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/marketplace?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const goWith = (q: string) => navigate(`/marketplace?q=${encodeURIComponent(q)}`);

  return (
    <section className="pt-2 pb-3 sm:py-4 sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40 sm:border-0 sm:static sm:bg-transparent sm:backdrop-blur-0">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              onClick={() => navigate("/marketplace")}
              className="flex items-center gap-1 shrink-0 rounded-full bg-secondary/60 px-2.5 py-2 text-[11px] font-semibold text-foreground"
              aria-label={t("search.location")}
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="max-w-[72px] truncate">{countryLabel}</span>
            </button>
          )}

          <form
            onSubmit={handleSubmit}
            className={`relative flex-1 flex items-center rounded-full border bg-card transition-all duration-300 ${
              focused
                ? "border-primary shadow-md shadow-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.15)] ring-1 ring-primary/15"
                : "border-border/70"
            }`}
          >
            <Search className="ml-3 h-4 w-4 shrink-0 text-primary" />
            <div className="relative flex-1 overflow-hidden">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder=""
                className="w-full bg-transparent px-2 py-2.5 text-sm text-foreground focus:outline-none"
                aria-label={t("common.search")}
              />
              {!query && (
                <div className="pointer-events-none absolute inset-0 flex items-center px-2 text-sm text-muted-foreground">
                  <span className="mr-1">{t("search.placeholderPrefix")}</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={placeholderIdx}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="font-medium text-primary/80"
                    >
                      "{TRENDING[placeholderIdx]}"
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}
            </div>

            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mr-1 rounded-full p-1.5 text-muted-foreground hover:text-foreground"
                aria-label={t("search.clear")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <button
              type="submit"
              className="mr-1 rounded-full bg-gradient-to-r from-primary to-accent px-3.5 py-1.5 text-[11px] font-bold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity"
            >
              {t("search.button")}
            </button>
          </form>
        </div>

        <AnimatePresence>
          {focused && !query && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-3 right-3 sm:left-4 sm:right-4 mt-2 rounded-2xl border border-border bg-popover shadow-xl p-3 z-40"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("search.trending")}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TRENDING.map((trend, i) => (
                  <button
                    key={trend}
                    onMouseDown={(e) => { e.preventDefault(); goWith(trend); }}
                    className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <span className="text-primary mr-1 font-bold">#{i + 1}</span>
                    {trend}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-3 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("search.quickAccess")}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CHIP_KEYS.map((c) => (
                  <button
                    key={c.value}
                    onMouseDown={(e) => { e.preventDefault(); navigate(`/marketplace?filter=${c.value}`); }}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary hover:text-primary"
                  >
                    {t(c.key)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isMobile && !focused && (
          <div
            className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar"
          >
            {QUICK_CHIP_KEYS.map((c) => (
              <button
                key={c.value}
                onClick={() => navigate(`/marketplace?filter=${c.value}`)}
                className="shrink-0 rounded-full border border-border/70 bg-card px-2.5 py-1 text-[10.5px] font-medium text-foreground hover:border-primary"
              >
                {t(c.key)}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SearchBar;
