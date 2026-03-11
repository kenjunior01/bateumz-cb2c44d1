import { motion } from "framer-motion";
import { Clock, Users, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import prizePhone from "@/assets/prize-phone.jpg";
import prizeVilla from "@/assets/prize-villa.jpg";
import prizeGaming from "@/assets/prize-gaming.jpg";
import heroPrize from "@/assets/hero-prize.jpg";

const raffles = [
  {
    id: 1,
    title: "Porsche 911 GT3",
    image: heroPrize,
    price: "1.890 MZN",
    sold: 87,
    total: 1000,
    participants: 847,
    endsIn: "2d 14h",
    tag: "🔥 Quase esgotado",
    tagColor: "bg-destructive/20 text-destructive",
  },
  {
    id: 2,
    title: "iPhone 16 Pro Max",
    image: prizePhone,
    price: "590 MZN",
    sold: 62,
    total: 500,
    participants: 312,
    endsIn: "5d 8h",
    tag: "⚡ Popular",
    tagColor: "bg-accent/20 text-accent",
  },
  {
    id: 3,
    title: "Villa em Bali — 7 Noites",
    image: prizeVilla,
    price: "1.250 MZN",
    sold: 45,
    total: 800,
    participants: 360,
    endsIn: "8d 2h",
    tag: "🌴 Novo",
    tagColor: "bg-primary/20 text-primary",
  },
  {
    id: 4,
    title: "Setup Gamer Completo",
    image: prizeGaming,
    price: "310 MZN",
    sold: 91,
    total: 300,
    participants: 273,
    endsIn: "12h 30m",
    tag: "🔥 Últimas vagas",
    tagColor: "bg-destructive/20 text-destructive",
  },
];

const ActiveRaffles = () => {
  return (
    <section id="sorteios" className="relative py-24">
      <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />
      <div className="container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-14 text-center">
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-primary">Sorteios Ativos</span>
          <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">Escolha o seu prémio</h2>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {raffles.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.1 }} whileHover={{ y: -6, scale: 1.02 }}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/40 hover:glow-primary">
              <div className="relative h-48 overflow-hidden">
                <img src={r.image} alt={r.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${r.tagColor}`}>{r.tag}</span>
              </div>

              <div className="p-5">
                <h3 className="mb-3 font-display text-lg font-bold text-foreground">{r.title}</h3>
                <div className="mb-3">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>{r.sold}% vendido</span>
                    <span>{r.total} bilhetes</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${r.sold}%` }} viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.3 + i * 0.1 }} className="h-full rounded-full bg-gradient-to-r from-primary to-accent" />
                  </div>
                </div>
                <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{r.participants}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.endsIn}</span>
                </div>
                <Link to="/marketplace"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                  <Ticket className="h-4 w-4" />{r.price}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ActiveRaffles;
