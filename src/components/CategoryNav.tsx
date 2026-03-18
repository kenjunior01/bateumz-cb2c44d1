import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Smartphone, Car, Home, Plane, Gamepad2, ShoppingBag, Gift, Sparkles } from "lucide-react";

const categories = [
  { icon: Car, label: "Veículos", color: "bg-primary/10 text-primary" },
  { icon: Smartphone, label: "Eletrónicos", color: "bg-accent/10 text-accent" },
  { icon: Home, label: "Imóveis", color: "bg-destructive/10 text-destructive" },
  { icon: Plane, label: "Viagens", color: "bg-primary/10 text-primary" },
  { icon: Gamepad2, label: "Gaming", color: "bg-accent/10 text-accent" },
  { icon: ShoppingBag, label: "Moda", color: "bg-destructive/10 text-destructive" },
  { icon: Gift, label: "Prémios", color: "bg-primary/10 text-primary" },
  { icon: Sparkles, label: "Todos", color: "bg-accent/10 text-accent" },
];

const CategoryNav = () => {
  return (
    <section className="py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Categorias</h3>
        </div>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to="/marketplace"
                className="flex flex-col items-center gap-2 rounded-2xl p-3 transition-all hover:bg-secondary group"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cat.color} transition-transform group-hover:scale-110`}>
                  <cat.icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
                  {cat.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryNav;
