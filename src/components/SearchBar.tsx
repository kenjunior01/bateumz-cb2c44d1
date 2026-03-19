import { useState } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SearchBar = () => {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/marketplace?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <section className="py-4">
      <div className="container mx-auto px-4">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative flex items-center rounded-2xl border bg-card transition-all ${
            focused ? "border-primary shadow-lg shadow-primary/10" : "border-border"
          }`}
        >
          <Search className="ml-4 h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Pesquisar sorteios, prémios, categorias..."
            className="flex-1 bg-transparent px-3 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mr-2 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            className="mr-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Buscar
          </button>
        </motion.form>
      </div>
    </section>
  );
};

export default SearchBar;
