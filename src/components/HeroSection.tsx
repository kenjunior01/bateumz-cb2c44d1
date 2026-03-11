import { motion } from "framer-motion";
import { ArrowRight, Shield, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import heroPrize from "@/assets/hero-prize.jpg";
import CountdownTimer from "./CountdownTimer";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden pt-20">
      <div className="absolute inset-0 z-0">
        <img src={heroPrize} alt="Prémio principal" className="h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
      </div>
      <div className="absolute left-1/4 top-1/3 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute right-1/4 bottom-1/3 h-72 w-72 rounded-full bg-accent/10 blur-[100px]" />

      <div className="container relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-4xl">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary">
            <span className="h-2 w-2 animate-pulse-glow rounded-full bg-primary" />
            Sorteio ao vivo — 847 participantes agora
          </motion.div>

          <h1 className="mb-6 font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Ganhe <span className="text-gradient-primary">prémios incríveis</span>
            <br />com total transparência
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
            A plataforma de sorteios mais avançada de Moçambique. Resultados verificáveis, gamificação e prémios de luxo.
          </p>

          <div className="mb-10">
            <p className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-widest">Próximo grande sorteio em</p>
            <CountdownTimer targetDate={new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)} />
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/marketplace" className="group flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground transition-all glow-primary hover:opacity-90">
              Participar por 590 MZN
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="#como-funciona" className="flex items-center gap-2 rounded-xl border border-border px-8 py-4 text-lg font-medium text-foreground transition-colors hover:bg-secondary">
              Como funciona
            </Link>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Blockchain verificável</span>
            <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> +52.000 vencedores</span>
            <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Sorteios diários</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
