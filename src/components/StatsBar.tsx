import { motion } from "framer-motion";

const stats = [
  { value: "R$ 12M+", label: "Em prémios distribuídos" },
  { value: "52.847", label: "Vencedores felizes" },
  { value: "100%", label: "Resultados verificáveis" },
  { value: "4.9/5", label: "Avaliação dos utilizadores" },
];

const StatsBar = () => (
  <section className="relative border-y border-border bg-card/50">
    <div className="container mx-auto grid grid-cols-2 gap-6 px-6 py-12 md:grid-cols-4">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="text-center"
        >
          <div className="font-display text-3xl font-bold text-gradient-primary md:text-4xl">
            {s.value}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
        </motion.div>
      ))}
    </div>
  </section>
);

export default StatsBar;
