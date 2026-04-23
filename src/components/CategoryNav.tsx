import { useRef } from "react";
import { motion } from "framer-motion";
import { Smartphone, Car, Home, Plane, Gamepad2, ShoppingBag, Gift, Sparkles } from "lucide-react";

const categories = [
  { icon: Car, label: "Veículos", value: "veiculos", color: "bg-primary/10 text-primary" },
  { icon: Smartphone, label: "Eletrónicos", value: "eletronicos", color: "bg-accent/10 text-accent" },
  { icon: Home, label: "Imóveis", value: "imoveis", color: "bg-destructive/10 text-destructive" },
  { icon: Plane, label: "Viagens", value: "viagens", color: "bg-primary/10 text-primary" },
  { icon: Gamepad2, label: "Gaming", value: "gaming", color: "bg-accent/10 text-accent" },
  { icon: ShoppingBag, label: "Moda", value: "moda", color: "bg-destructive/10 text-destructive" },
  { icon: Gift, label: "Prémios", value: "premios", color: "bg-primary/10 text-primary" },
  { icon: Sparkles, label: "Todos", value: "todos", color: "bg-accent/10 text-accent" },
];

interface CategoryNavProps {
  selected?: string;
  onSelect?: (category: string) => void;
}

const CategoryNav = ({ selected = "todos", onSelect }: CategoryNavProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Categorias</h3>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">← deslize →</span>
        </div>

        {/* Mobile: horizontal swipe scroll */}
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-2 sm:grid sm:grid-cols-8 sm:gap-3 sm:overflow-visible sm:pb-0"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          {categories.map((cat, i) => {
            const isActive = selected === cat.value;
            return (
              <motion.div
                key={cat.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="snap-start shrink-0"
              >
                <button
                  onClick={() => onSelect?.(cat.value)}
                  className={`flex w-20 sm:w-full flex-col items-center gap-2 rounded-2xl p-3 transition-all group ${
                    isActive ? "bg-primary/10 ring-2 ring-primary/30" : "hover:bg-secondary"
                  }`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cat.color} transition-transform group-hover:scale-110 ${isActive ? "scale-110" : ""}`}>
                    <cat.icon className="h-5 w-5" />
                  </div>
                  <span className={`text-[11px] font-medium transition-colors text-center leading-tight ${
                    isActive ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                  }`}>
                    {cat.label}
                  </span>
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryNav;
