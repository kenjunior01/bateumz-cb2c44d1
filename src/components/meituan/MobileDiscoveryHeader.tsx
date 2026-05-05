import { ReactNode } from "react";
import { ArrowLeft, Search, SlidersHorizontal } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface CategoryChip {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface Props {
  title: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  categories: CategoryChip[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  onOpenFilters?: () => void;
  rightAction?: ReactNode;
  backTo?: string;
  /** Extra mini-banner row below chips (e.g. promo strip) */
  banner?: ReactNode;
}

/**
 * Sticky mobile header in Meituan style:
 *  ┌─ Back │ Search input │ Filters ─┐
 *  │ horizontal scroll: [chip][chip] │
 *  └─────────────────────────────────┘
 */
export default function MobileDiscoveryHeader({
  title,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Pesquisar...",
  categories,
  activeCategory,
  onCategoryChange,
  onOpenFilters,
  rightAction,
  backTo,
  banner,
}: Props) {
  const navigate = useNavigate();

  return (
    <header className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40 -mx-4 px-4 pt-2 pb-2">
      {/* Top row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
          className="h-9 w-9 shrink-0 rounded-full bg-secondary/60 flex items-center justify-center active:scale-95 transition"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-9 pl-9 pr-3 rounded-full bg-secondary/60 border border-transparent focus:border-primary/40 focus:bg-background text-sm outline-none transition"
            aria-label={searchPlaceholder}
          />
        </div>

        {onOpenFilters && (
          <button
            onClick={onOpenFilters}
            className="h-9 w-9 shrink-0 rounded-full bg-secondary/60 flex items-center justify-center active:scale-95 transition"
            aria-label="Abrir filtros"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        )}

        {rightAction}
      </div>

      {/* Page title (subtle, like Meituan section header) */}
      {title && (
        <div className="mt-1.5 px-1 flex items-center justify-between">
          <h1 className="text-[13px] font-semibold text-muted-foreground tracking-wide uppercase">
            {title}
          </h1>
        </div>
      )}

      {/* Category chips row */}
      {categories.length > 0 && (
        <div className="mt-2 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar snap-x">

            {categories.map((cat) => {
              const active = cat.id === activeCategory;
              return (
                <motion.button
                  key={cat.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => onCategoryChange(cat.id)}
                  className={`shrink-0 snap-start flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary/60 text-foreground/80"
                  }`}
                >
                  {cat.icon && <span className="text-[14px] leading-none">{cat.icon}</span>}
                  <span>{cat.label}</span>
                  {typeof cat.count === "number" && (
                    <span className={`text-[10px] ml-0.5 px-1.5 rounded-full ${
                      active ? "bg-primary-foreground/20" : "bg-foreground/10"
                    }`}>
                      {cat.count}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {banner && <div className="mt-2">{banner}</div>}
    </header>
  );
}
