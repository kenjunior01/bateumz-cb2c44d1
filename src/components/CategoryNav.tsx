import {
  Smartphone, Car, Home, Plane, Gamepad2, ShoppingBag, Gift, Sparkles,
  Trophy, Heart, Utensils, Baby,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";

const categories = [
  { icon: Sparkles,    labelKey: "cat.all",         value: "todos",       grad: "from-primary to-accent" },
  { icon: Car,         labelKey: "cat.vehicles",    value: "veiculos",    grad: "from-blue-500 to-cyan-500" },
  { icon: Smartphone,  labelKey: "cat.electronics", value: "eletronicos", grad: "from-violet-500 to-fuchsia-500" },
  { icon: Home,        labelKey: "cat.realestate",  value: "imoveis",     grad: "from-emerald-500 to-teal-500" },
  { icon: Plane,       labelKey: "cat.travel",      value: "viagens",     grad: "from-sky-500 to-indigo-500" },
  { icon: Gamepad2,    labelKey: "cat.gaming",      value: "gaming",      grad: "from-pink-500 to-rose-500" },
  { icon: ShoppingBag, labelKey: "cat.fashion",     value: "moda",        grad: "from-amber-500 to-orange-500" },
  { icon: Gift,        labelKey: "cat.prizes",      value: "premios",     grad: "from-red-500 to-pink-500" },
  { icon: Trophy,      labelKey: "cat.contests",    value: "concursos",   grad: "from-yellow-500 to-amber-500" },
  { icon: Heart,       labelKey: "cat.health",      value: "saude",       grad: "from-rose-500 to-red-500" },
  { icon: Utensils,    labelKey: "cat.food",        value: "comida",      grad: "from-orange-500 to-red-500" },
  { icon: Baby,        labelKey: "cat.family",      value: "familia",     grad: "from-teal-500 to-emerald-500" },
];

interface CategoryNavProps {
  selected?: string;
  onSelect?: (category: string) => void;
}

const CategoryNav = ({ selected = "todos", onSelect }: CategoryNavProps) => {
  const isMobile = useIsMobile();
  const { t } = useLanguage();

  if (isMobile) {
    const visible = categories.slice(0, 10);
    return (
      <section className="py-3">
        <div className="container mx-auto px-3">
          <div className="rounded-2xl bg-gradient-to-br from-card via-card to-secondary/30 border border-border/50 p-3 shadow-sm">
            <div className="grid grid-cols-5 gap-x-1 gap-y-3">
              {visible.map((cat) => {
                const isActive = selected === cat.value;
                return (
                  <button
                    key={cat.value}
                    onClick={() => onSelect?.(cat.value)}
                    className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
                  >
                    <div
                      className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.grad} shadow-md ${
                        isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                      }`}
                    >
                      <cat.icon className="h-5 w-5 text-white drop-shadow" strokeWidth={2.2} />
                    </div>
                    <span
                      className={`text-[10px] font-medium leading-tight text-center truncate w-full ${
                        isActive ? "text-primary font-bold" : "text-foreground/85"
                      }`}
                    >
                      {t(cat.labelKey)}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => onSelect?.("todos")}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary border border-border">
                  <span className="text-base">⋯</span>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{t("cat.more")}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{t("cat.sectionTitle")}</h3>
        </div>
        <div className="grid grid-cols-8 gap-3">
          {categories.slice(0, 8).map((cat) => {
            const isActive = selected === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => onSelect?.(cat.value)}
                className={`flex w-full flex-col items-center gap-2 rounded-2xl p-3 transition-colors group ${
                  isActive ? "bg-primary/10 ring-2 ring-primary/30" : "hover:bg-secondary"
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.grad} text-white shadow group-hover:scale-105 transition-transform ${isActive ? "scale-105" : ""}`}>
                  <cat.icon className="h-5 w-5" />
                </div>
                <span className={`text-[11px] font-medium text-center leading-tight ${
                  isActive ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                }`}>
                  {t(cat.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryNav;
