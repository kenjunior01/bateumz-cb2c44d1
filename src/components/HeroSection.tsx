import { motion } from "framer-motion";
import { ArrowRight, Shield, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import CountdownTimer from "./CountdownTimer";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden pt-20 pb-4 md:pt-24 md:pb-8">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
      <div className="absolute left-1/4 top-1/3 h-48 w-48 rounded-full bg-primary/8 blur-[100px]" />
      <div className="absolute right-1/4 top-1/4 h-36 w-36 rounded-full bg-accent/8 blur-[80px]" />

      <div className="container relative z-10 mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <h1 className="mb-3 font-display text-2xl sm:text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            O seu próximo <span className="text-gradient-primary">grande momento</span>
          </h1>

          <p className="mx-auto mb-5 max-w-xl text-xs md:text-base text-muted-foreground">
            Sorteios transparentes com verificação pública. Prémios reais, vencedores reais.
          </p>

          {/* Countdown - compact and beautiful */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-5 md:mb-6"
          >
            <CountdownTimer targetDate={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)} />
          </motion.div>

          <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center">
            <Link
              to="/marketplace"
              className="group flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 md:px-7 md:py-3 text-sm md:text-base font-semibold text-primary-foreground transition-all glow-primary hover:opacity-90"
            >
              Participar agora
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-5 md:mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-5 text-[10px] md:text-xs text-muted-foreground"
          >
            <span className="flex items-center gap-1"><Shield className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" /> Verificação pública</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" /> +52.000 vencedores</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" /> Novos toda semana</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
