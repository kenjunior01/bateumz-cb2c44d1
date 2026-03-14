import { motion } from "framer-motion";
import { ArrowRight, Shield, Users, Clock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import heroPrize from "@/assets/hero-prize.jpg";
import CountdownTimer from "./CountdownTimer";
import ParticleField from "./ParticleField";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden pt-20">
      <div className="absolute inset-0 z-0">
        <img src={heroPrize} alt="Prémio principal" className="h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
      </div>
      <ParticleField />
      <div className="absolute left-1/4 top-1/3 h-96 w-96 rounded-full bg-primary/8 blur-[140px] animate-pulse" />
      <div className="absolute right-1/4 bottom-1/3 h-72 w-72 rounded-full bg-accent/8 blur-[120px] animate-pulse" />

      <div className="container relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-4xl">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2 text-sm text-primary">
            <Sparkles className="h-4 w-4 animate-pulse" />
            A sorte escolhe quem participa — 847 pessoas já estão dentro
          </motion.div>

          <h1 className="mb-6 font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            O seu próximo <span className="text-gradient-primary">grande momento</span>
            <br />começa aqui
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Sorteios 100% transparentes com verificação pública. Prémios reais, vencedores reais — e o próximo pode ser você.
          </p>

          <div className="mb-10">
            <p className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-widest">O próximo grande momento em</p>
            <CountdownTimer targetDate={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)} />
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/marketplace" className="group flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground transition-all glow-primary hover:opacity-90">
              Quero participar
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="#como-funciona" className="flex items-center gap-2 rounded-xl border border-border px-8 py-4 text-lg font-medium text-foreground transition-colors hover:bg-secondary">
              Ver como funciona
            </Link>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Resultados verificáveis publicamente</span>
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> +52.000 vencedores reais</span>
            <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Novos sorteios toda semana</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
