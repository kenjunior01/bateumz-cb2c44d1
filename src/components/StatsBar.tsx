import { motion } from "framer-motion";

const stats = [
  { value: "750M+", suffix: " MZN", label: "Já entregues em prémios" },
  { value: "52.847", suffix: "", label: "Pessoas que já ganharam" },
  { value: "100%", suffix: "", label: "Dos resultados são verificáveis" },
  { value: "4.9/5", suffix: "", label: "Nota dos participantes" },
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
            {s.value}<span className="text-2xl md:text-3xl">{s.suffix}</span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
        </motion.div>
      ))}
    </div>
  </section>
);

export default StatsBar;
