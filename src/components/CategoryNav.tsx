import { motion } from "framer-motion";
import {
  Smartphone, Car, Home, Plane, Gamepad2, ShoppingBag, Gift, Sparkles,
  Trophy, Heart, Utensils, Baby,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const categories = [
  { icon: Sparkles,    label: "Todos",       value: "todos",       grad: "from-primary to-accent" },
  { icon: Car,         label: "Veículos",    value: "veiculos",    grad: "from-blue-500 to-cyan-500" },
  { icon: Smartphone,  label: "Eletrónicos", value: "eletronicos", grad: "from-violet-500 to-fuchsia-500" },
  { icon: Home,        label: "Imóveis",     value: "imoveis",     grad: "from-emerald-500 to-teal-500" },
  { icon: Plane,       label: "Viagens",     value: "viagens",     grad: "from-sky-500 to-indigo-500" },
  { icon: Gamepad2,    label: "Gaming",      value: "gaming",      grad: "from-pink-500 to-rose-500" },
  { icon: ShoppingBag, label: "Moda",        value: "moda",        grad: "from-amber-500 to-orange-500" },
  { icon: Gift,        label: "Prémios",     value: "premios",     grad: "from-red-500 to-pink-500" },
  { icon: Trophy,      label: "Concursos",   value: "concursos",   grad: "from-yellow-500 to-amber-500" },
  { icon: Heart,       label: "Saúde",       value: "saude",       grad: "from-rose-500 to-red-500" },
  { icon: Utensils,    label: "Comida",      value: "comida",      grad: "from-orange-500 to-red-500" },
  { icon: Baby,        label: "Família",     value: "familia",     grad: "from-teal-500 to-emerald-500" },
];

interface CategoryNavProps {
  selected?: string;
  onSelect?: (category: string) => void;
}

const CategoryNav = ({ selected = "todos", onSelect }: CategoryNavProps) => {
  const isMobile = useIsMobile();

  // Mobile: grid 5 colunas estilo Meituan (mostra 10 + "Mais")
  if (isMobile) {
    const visible = categories.slice(0, 10);
    return (
      <section className="py-3">
        <div className="container mx-auto px-3">
          <div className="rounded-2xl bg-gradient-to-br from-card via-card to-secondary/30 border border-border/50 p-3 shadow-sm">
            <div className="grid grid-cols-5 gap-x-1 gap-y-3">
              {visible.map((cat, i) => {
                const isActive = selected === cat.value;
                return (
                  <motion.button
                    key={cat.value}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.025 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSelect?.(cat.value)}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div
                      className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.grad} shadow-md transition-all ${
                        isActive ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background" : "group-active:scale-95"
                      }`}
                    >
                      <cat.icon className="h-5 w-5 text-white drop-shadow" strokeWidth={2.2} />
                    </div>
                    <span
                      className={`text-[10px] font-medium leading-tight text-center truncate w-full ${
                        isActive ? "text-primary font-bold" : "text-foreground/85"
                      }`}
                    >
                      {cat.label}
                    </span>
                  </motion.button>
                );
              })}
              {/* Mais */}
              <motion.button
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: visible.length * 0.025 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onSelect?.("todos")}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary border border-border">
                  <span className="text-base">⋯</span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">Mais</span>
              </motion.button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Desktop: grid 8 colunas em row
  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Categorias</h3>
        </div>
        <div className="grid grid-cols-8 gap-3">
          {categories.slice(0, 8).map((cat, i) => {
            const isActive = selected === cat.value;
            return (
              <motion.button
                key={cat.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onSelect?.(cat.value)}
                className={`flex w-full flex-col items-center gap-2 rounded-2xl p-3 transition-all group ${
                  isActive ? "bg-primary/10 ring-2 ring-primary/30" : "hover:bg-secondary"
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.grad} text-white shadow group-hover:scale-110 transition-transform ${isActive ? "scale-110" : ""}`}>
                  <cat.icon className="h-5 w-5" />
                </div>
                <span className={`text-[11px] font-medium text-center leading-tight ${
                  isActive ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                }`}>
                  {cat.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryNav;
