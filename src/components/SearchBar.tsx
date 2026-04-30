import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, MapPin, TrendingUp, Sparkles, Mic, ScanLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const TRENDING = ["iPhone 15", "Toyota", "Viagem Dubai", "PlayStation 5", "Apartamento", "Moto"];
const QUICK_CHIPS = [
  { label: "🔥 Em alta", value: "trending" },
  { label: "🆕 Novos", value: "new" },
  { label: "⏳ A terminar", value: "ending" },
  { label: "💰 Baratos", value: "cheap" },
  { label: "🏆 Premium", value: "premium" },
];

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const i = setInterval(() => setPlaceholderIdx((v) => (v + 1) % TRENDING.length), 2400);
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
        {/* Linha superior: localização + busca (estilo Meituan) */}
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              onClick={() => navigate("/marketplace")}
              className="flex items-center gap-1 shrink-0 rounded-full bg-secondary/60 px-2.5 py-2 text-[11px] font-semibold text-foreground"
              aria-label="Localização"
            >
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="max-w-[60px] truncate">Maputo</span>
            </button>
          )}

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative flex-1 flex items-center rounded-full border bg-card transition-all ${
              focused
                ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/15"
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
                aria-label="Pesquisar"
              />
              {!query && (
                <div className="pointer-events-none absolute inset-0 flex items-center px-2 text-sm text-muted-foreground">
                  <span className="mr-1">Buscar</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={placeholderIdx}
                      initial={{ y: 12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -12, opacity: 0 }}
                      transition={{ duration: 0.3 }}
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
                aria-label="Limpar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-0.5 mr-1">
                <button
                  type="button"
                  className="rounded-full p-1.5 text-muted-foreground hover:text-primary"
                  aria-label="Pesquisa por voz"
                  onClick={() => navigate("/marketplace")}
                >
                  <Mic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-muted-foreground hover:text-primary"
                  aria-label="Scan código"
                  onClick={() => navigate("/marketplace")}
                >
                  <ScanLine className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <button
              type="submit"
              className="mr-1 rounded-full bg-gradient-to-r from-primary to-accent px-3.5 py-1.5 text-[11px] font-bold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity"
            >
              Buscar
            </button>
          </motion.form>
        </div>

        {/* Sugestões dropdown (focused) */}
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
                  Tendências
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TRENDING.map((t, i) => (
                  <button
                    key={t}
                    onMouseDown={(e) => { e.preventDefault(); goWith(t); }}
                    className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <span className="text-primary mr-1 font-bold">#{i + 1}</span>
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-3 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Acesso rápido
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CHIPS.map((c) => (
                  <button
                    key={c.value}
                    onMouseDown={(e) => { e.preventDefault(); navigate(`/marketplace?filter=${c.value}`); }}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-primary hover:text-primary"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chips horizontais (sempre visíveis em mobile) */}
        {isMobile && !focused && (
          <div
            className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5"
            style={{ scrollbarWidth: "none" }}
          >
            {QUICK_CHIPS.map((c) => (
              <button
                key={c.value}
                onClick={() => navigate(`/marketplace?filter=${c.value}`)}
                className="shrink-0 rounded-full border border-border/70 bg-card px-2.5 py-1 text-[10.5px] font-medium text-foreground hover:border-primary"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default SearchBar;
