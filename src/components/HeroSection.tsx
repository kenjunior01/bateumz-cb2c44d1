import { motion } from "framer-motion";
import { ArrowRight, Shield, Users, Clock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import heroPrize from "@/assets/hero-prize.jpg";
import CountdownTimer from "./CountdownTimer";
import ParticleField from "./ParticleField";

const HeroSection = () => {
  return (
    <section className="relative min-h-[70vh] md:min-h-screen overflow-hidden pt-20">
      <div className="absolute inset-0 z-0">
        <img src={heroPrize} alt="Prémio principal" className="h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
      </div>
      <ParticleField />
      <div className="absolute left-1/4 top-1/3 h-96 w-96 rounded-full bg-primary/8 blur-[140px] animate-pulse" />
      <div className="absolute right-1/4 bottom-1/3 h-72 w-72 rounded-full bg-accent/8 blur-[120px] animate-pulse" />

      <div className="container relative z-10 mx-auto flex min-h-[calc(70vh-5rem)] md:min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-4xl">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="mb-4 md:mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs md:text-sm text-primary">
            <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4 animate-pulse" />
            <span className="hidden sm:inline">A sorte escolhe quem participa — </span>847 pessoas já estão dentro
          </motion.div>

          <h1 className="mb-4 md:mb-6 font-display text-3xl sm:text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            O seu próximo <span className="text-gradient-primary">grande momento</span>
          </h1>

          <p className="mx-auto mb-6 md:mb-10 max-w-2xl text-sm md:text-lg text-muted-foreground">
            Sorteios transparentes com verificação pública. Prémios reais, vencedores reais.
          </p>

          <div className="mb-6 md:mb-10">
            <p className="mb-2 md:mb-3 text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-widest">Próximo sorteio em</p>
            <CountdownTimer targetDate={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)} />
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/marketplace" className="group flex items-center gap-2 rounded-xl bg-primary px-6 py-3 md:px-8 md:py-4 text-sm md:text-lg font-semibold text-primary-foreground transition-all glow-primary hover:opacity-90">
              Quero participar
              <ArrowRight className="h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="mt-8 md:mt-12 flex flex-wrap items-center justify-center gap-4 md:gap-6 text-xs md:text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" /> Verificação pública</span>
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" /> +52.000 vencedores</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" /> Novos toda semana</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
