import { motion } from "framer-motion";
import { Star, Play } from "lucide-react";
import LiveFeed from "./LiveFeed";

const winners = [
  { name: "Rafael N.", prize: "MacBook Pro M4", city: "Maputo", initials: "RN", quote: "Nem acreditei quando vi o meu nome!" },
  { name: "Camila T.", prize: "Viagem para Dubai", city: "Beira", initials: "CT", quote: "A melhor surpresa da minha vida." },
  { name: "Bruno G.", prize: "3.150.000 MZN em Cash", city: "Nampula", initials: "BG", quote: "Participei com amigos e deu certo!" },
];

const WinnersSection = () => {
  return (
    <section id="vencedores" className="relative py-24">
      <div className="container mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-4 text-center">
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-primary">Histórias Reais</span>
          <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl">Eles participaram. Eles ganharam.</h2>
        </motion.div>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="mx-auto mb-14 max-w-xl text-center text-muted-foreground">
          Não são números. São pessoas reais com histórias reais. E o próximo pode ser você.
        </motion.p>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {winners.map((w, i) => (
              <motion.div key={w.name} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass group flex items-center gap-5 rounded-2xl p-5 transition-all hover:border-primary/30">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-lg font-bold text-primary-foreground">
                  {w.initials}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-semibold text-foreground">{w.name}</h4>
                    <Star className="h-4 w-4 text-accent" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ganhou <span className="font-medium text-primary">{w.prize}</span> — {w.city}
                  </p>
                  <p className="mt-1 text-xs italic text-muted-foreground/70">"{w.quote}"</p>
                </div>
                <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
                  <Play className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <LiveFeed />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WinnersSection;
