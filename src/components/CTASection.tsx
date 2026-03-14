import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => (
  <section className="relative py-24 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
    <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[150px]" />
    
    <div className="container relative z-10 mx-auto px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto max-w-2xl"
      >
        <Sparkles className="mx-auto mb-6 h-10 w-10 text-accent" />
        <h2 className="mb-4 font-display text-4xl font-bold text-foreground md:text-5xl">
          Está a um passo do seu próximo grande momento
        </h2>
        <p className="mb-8 text-lg text-muted-foreground">
          Milhares de pessoas já participaram e ganharam. Não fique só a ver — faça parte da próxima história de sucesso.
        </p>
        <Link
          to="/marketplace"
          className="group inline-flex items-center gap-2 rounded-xl bg-primary px-10 py-4 text-lg font-semibold text-primary-foreground transition-all glow-primary hover:opacity-90"
        >
          Ver sorteios disponíveis
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
