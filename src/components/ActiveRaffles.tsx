import { motion } from "framer-motion";
import { Clock, Users, Ticket, Flame, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import TiltCard from "@/components/TiltCard";
import prizePhone from "@/assets/prize-phone.jpg";
import prizeVilla from "@/assets/prize-villa.jpg";
import prizeGaming from "@/assets/prize-gaming.jpg";
import heroPrize from "@/assets/hero-prize.jpg";

const raffles = [
  { id: 1, title: "Porsche 911 GT3", image: heroPrize, price: "1.890 MZN", sold: 87, total: 1000, participants: 847, endsIn: "2d 14h", tag: "Últimas vagas", tagIcon: Flame, tagColor: "bg-destructive/20 text-destructive" },
  { id: 2, title: "iPhone 16 Pro Max", image: prizePhone, price: "590 MZN", sold: 62, total: 500, participants: 312, endsIn: "5d 8h", tag: "Mais escolhido", tagIcon: Star, tagColor: "bg-accent/20 text-accent" },
  { id: 3, title: "Villa em Bali — 7 Noites", image: prizeVilla, price: "1.250 MZN", sold: 45, total: 800, participants: 360, endsIn: "8d 2h", tag: "Acabou de abrir", tagIcon: Sparkles, tagColor: "bg-primary/20 text-primary" },
  { id: 4, title: "Setup Gamer Completo", image: prizeGaming, price: "310 MZN", sold: 91, total: 300, participants: 273, endsIn: "12h 30m", tag: "A esgotar", tagIcon: Flame, tagColor: "bg-destructive/20 text-destructive" },
];

const ActiveRaffles = () => {
  return (
    <section id="sorteios" className="relative py-8 md:py-24">
      <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />
      <div className="container mx-auto px-4 md:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-3 md:mb-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="mb-1 inline-block text-xs md:text-sm font-semibold uppercase tracking-widest text-primary">🔥 A decorrer</span>
              <h2 className="font-display text-xl md:text-4xl font-bold text-foreground">Destaques do Dia</h2>
            </div>
            <Link to="/marketplace" className="text-xs md:text-sm font-medium text-primary hover:underline">Ver todos →</Link>
          </div>
        </motion.div>

        {/* Mobile: vertical compact cards | Desktop: grid */}
        <div className="grid gap-3 md:gap-6 grid-cols-2 lg:grid-cols-4">
          {raffles.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}>
              <Link to="/marketplace" className="block group">
                <div className="rounded-2xl border border-border bg-card transition-all hover:border-primary/40 overflow-hidden">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={r.image} alt={r.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                    <span className={`absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] md:text-xs font-semibold ${r.tagColor}`}>
                      <r.tagIcon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                      {r.tag}
                    </span>
                    <span className="absolute right-2 top-2 rounded-full bg-card/80 backdrop-blur-sm px-2 py-0.5 text-[10px] md:text-xs font-bold text-foreground">
                      {r.price}
                    </span>
                  </div>

                  <div className="p-3 md:p-5">
                    <h3 className="mb-2 font-display text-sm md:text-lg font-bold text-foreground leading-tight line-clamp-1">{r.title}</h3>
                    <div className="mb-2">
                      <div className="h-1.5 md:h-2 overflow-hidden rounded-full bg-secondary">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${r.sold}%` }} viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.2 + i * 0.08 }} className="h-full rounded-full bg-gradient-to-r from-primary to-accent" />
                      </div>
                      <p className="mt-1 text-[10px] md:text-xs text-muted-foreground">{r.sold}% • {r.endsIn}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{r.participants}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.endsIn}</span>
                    </div>
                    <div className="hidden md:flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                      <Ticket className="h-4 w-4" />Garantir por {r.price}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ActiveRaffles;
