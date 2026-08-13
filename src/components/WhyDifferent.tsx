'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  X,
  CheckCircle2,
  Skull,
  Coins,
  ShieldCheck,
  Eye,
  Brain,
  Users,
  Gamepad2,
  Trophy,
  Lock,
  Heart,
  Zap,
  Swords,
  Crown,
  Sparkles,
  AlertTriangle,
  Ban,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/* ─── Color Constants ─── */
const CYAN = '#00d4ff';
const PURPLE = '#a855f7';
const GREEN = '#2ea043';
const GOLD = '#fbbf24';

/* ─── Animation Helpers ─── */
const SPRING_BOUNCE = { type: 'spring' as const, stiffness: 280, damping: 22 };
const rowFadeUp = {
  hidden: (i: number) => ({ opacity: 0, x: i === 0 ? -24 : 24 }),
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ─── Comparison Data ─── */
interface ComparisonRow {
  traditional: {
    icon: React.ElementType;
    text: string;
    reason: string;
  };
  bateumz: {
    icon: React.ElementType;
    text: string;
    highlight: string;
    accentColor: string;
  };
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    traditional: {
      icon: Coins,
      text: 'Aposta com dinheiro real',
      reason: 'Risco de perda financeira real e dívidas',
    },
    bateumz: {
      icon: Sparkles,
      text: 'Moeda virtual 100% digital',
      highlight: 'Nenhuma perda financeira',
      accentColor: CYAN,
    },
  },
  {
    traditional: {
      icon: AlertTriangle,
      text: 'Algoritmos obscuros e não verificados',
      reason: 'Sem transparência nos resultados',
    },
    bateumz: {
      icon: Eye,
      text: 'Resultados públicos e auditáveis',
      highlight: 'Verificação em tempo real',
      accentColor: PURPLE,
    },
  },
  {
    traditional: {
      icon: Skull,
      text: 'Baseado em sorte pura',
      reason: 'A casa sempre ganha a longo prazo',
    },
    bateumz: {
      icon: Brain,
      text: 'Competições baseadas em habilidade',
      highlight: 'O melhor jogador vence',
      accentColor: CYAN,
    },
  },
  {
    traditional: {
      icon: Ban,
      text: 'Sem controlo de tempo ou gastos',
      reason: 'Vício sem proteção do utilizador',
    },
    bateumz: {
      icon: Heart,
      text: 'Ferramentas de jogo responsável',
      highlight: 'Limites personalizáveis',
      accentColor: GREEN,
    },
  },
  {
    traditional: {
      icon: TrendingDown,
      text: 'Perdas geram mais apostas',
      reason: 'Design que explora vulnerabilidades',
    },
    bateumz: {
      icon: Trophy,
      text: 'Ganhos são prémios reais',
      highlight: 'Sem ciclo de perda',
      accentColor: GOLD,
    },
  },
  {
    traditional: {
      icon: Lock,
      text: 'Dados pessoais vendidos a terceiros',
      reason: 'Privacidade comprometida',
    },
    bateumz: {
      icon: ShieldCheck,
      text: 'Privacidade e segurança máxima',
      highlight: 'Seus dados são seus',
      accentColor: PURPLE,
    },
  },
  {
    traditional: {
      icon: Skull,
      text: 'Experiência solitária e viciante',
      reason: 'Isolamento social e ansiedade',
    },
    bateumz: {
      icon: Users,
      text: 'Comunidade vibrante e social',
      highlight: 'Joga com amigos',
      accentColor: GREEN,
    },
  },
  {
    traditional: {
      icon: Ban,
      text: 'Um único tipo de aposta monótona',
      reason: 'Experiência limitada e repetitiva',
    },
    bateumz: {
      icon: Gamepad2,
      text: '3 mundos: Esports, Sorteios e Jogos',
      highlight: '50+ experiências diferentes',
      accentColor: CYAN,
    },
  },
];

/* ─── Sub-component: Platform Badge Pill ─── */
function PlatformPill({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm"
      style={{
        borderColor: `${color}33`,
        background: `${color}0D`,
      }}
      whileHover={{ scale: 1.05 }}
      transition={SPRING_BOUNCE}
    >
      <Icon className="h-4 w-4" style={{ color }} />
      <span className="text-xs font-bold" style={{ color }}>
        {label}
      </span>
    </motion.div>
  );
}

/* ─── Sub-component: Comparison Row ─── */
function ComparisonRowCard({ row, index }: { row: ComparisonRow; index: number }) {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-4 items-stretch"
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { delay: index * 0.09, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
        },
      }}
    >
      {/* Traditional Betting - BAD (red/dark) */}
      <motion.div
        className="relative rounded-xl border border-red-500/20 overflow-hidden group"
        whileHover={{ scale: 1.015, y: -2 }}
        transition={SPRING_BOUNCE}
      >
        {/* Red gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-400" />

        <div className="bg-gradient-to-br from-red-950/60 to-red-950/20 dark:from-red-950/80 dark:to-red-950/40 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5 h-9 w-9 rounded-lg bg-red-500/15 border border-red-500/20 flex items-center justify-center">
              <row.traditional.icon className="h-4.5 w-4.5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <X className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                <p className="text-sm font-semibold text-red-100 dark:text-red-200 truncate">
                  {row.traditional.text}
                </p>
              </div>
              <p className="text-xs text-red-300/70 dark:text-red-300/50 leading-relaxed pl-[22px]">
                {row.traditional.reason}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* VS Divider (desktop only) */}
      <div className="hidden md:flex flex-col items-center justify-center">
        <motion.div
          className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 shadow-lg"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.09 + 0.2, type: 'spring' as const, stiffness: 400, damping: 15 }}
        >
          <ArrowRight className="h-4 w-4 text-zinc-400" />
        </motion.div>
      </div>

      {/* Mobile VS divider */}
      <div className="flex md:hidden items-center justify-center gap-2 py-0">
        <motion.div
          className="flex items-center justify-center h-7 w-7 rounded-full bg-zinc-900 border border-zinc-700"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.09 + 0.15, type: 'spring' as const, stiffness: 400, damping: 15 }}
        >
          <ArrowRight className="h-3 w-3 text-zinc-500 rotate-90" />
        </motion.div>
      </div>

      {/* Bateumz - GOOD (colored/bright) */}
      <motion.div
        className="relative rounded-xl border overflow-hidden group"
        style={{
          borderColor: `${row.bateumz.accentColor}33`,
        }}
        whileHover={{ scale: 1.015, y: -2 }}
        transition={SPRING_BOUNCE}
      >
        {/* Accent gradient top bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: `linear-gradient(to right, ${row.bateumz.accentColor}, ${row.bateumz.accentColor}99)`,
          }}
        />

        {/* Subtle background glow */}
        <div
          className="absolute top-0 right-0 h-32 w-32 rounded-full blur-[60px] opacity-10 pointer-events-none"
          style={{ background: row.bateumz.accentColor }}
        />

        <div
          className="relative bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900/80 dark:to-zinc-950/60 p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center"
              style={{
                background: `${row.bateumz.accentColor}15`,
                border: `1px solid ${row.bateumz.accentColor}30`,
              }}
            >
              <row.bateumz.icon className="h-4.5 w-4.5" style={{ color: row.bateumz.accentColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: row.bateumz.accentColor }} />
                <p className="text-sm font-semibold text-foreground truncate">
                  {row.bateumz.text}
                </p>
              </div>
              <Badge
                className="ml-[22px] text-[10px] font-bold px-2 py-0.5 border-0"
                style={{
                  background: `${row.bateumz.accentColor}18`,
                  color: row.bateumz.accentColor,
                }}
              >
                {row.bateumz.highlight}
              </Badge>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Component ─── */
export default function WhyDifferent() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: '-60px' });
  const footerInView = useInView(sectionRef, { once: true, margin: '-40px' });

  return (
    <section
      ref={sectionRef}
      id="por-que-diferente"
      className="relative py-20 sm:py-24 overflow-hidden"
    >
      {/* ─── Background Effects ─── */}
      {/* Dark ambient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Top gradient fade */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-zinc-950 to-transparent" />
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-zinc-950 to-transparent" />

      {/* Glowing orbs */}
      <div
        className="absolute top-20 left-[10%] h-80 w-80 rounded-full blur-[120px] pointer-events-none"
        style={{ background: `${CYAN}08`, opacity: 0.5 }}
      />
      <div
        className="absolute top-[40%] right-[5%] h-72 w-72 rounded-full blur-[100px] pointer-events-none"
        style={{ background: `${PURPLE}08`, opacity: 0.5 }}
      />
      <div
        className="absolute bottom-20 left-[30%] h-64 w-64 rounded-full blur-[110px] pointer-events-none"
        style={{ background: `${GREEN}08`, opacity: 0.5 }}
      />

      {/* ─── Content ─── */}
      <div className="relative container mx-auto px-4 sm:px-6 max-w-5xl">
        {/* ─── Section Header ─── */}
        <div ref={headerRef} className="text-center mb-14 sm:mb-16">
          {/* Tagline Pill */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={headerInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
            className="inline-flex items-center gap-2 mb-5"
          >
            <Badge className="px-4 py-1.5 text-xs font-bold rounded-full border-0 bg-gradient-to-r from-cyan-500/15 via-purple-500/15 to-green-500/15 text-zinc-300">
              <Zap className="h-3.5 w-3.5 mr-1.5 text-yellow-400" />
              A Revolução do Gaming Sem Aposta
            </Badge>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 tracking-tight"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-zinc-300 to-zinc-100">
              Sites de Aposta
            </span>
            <br className="sm:hidden" />
            <span className="text-zinc-500 mx-2 sm:mx-4 text-2xl sm:text-3xl lg:text-4xl font-light">vs</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-green-400">
              Bateumz
            </span>
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed"
          >
            Descubra por que milhares de gamers escolhem o{' '}
            <span className="text-zinc-200 font-semibold">Bateumz</span> em vez de sites de apostas tradicionais.
            Sem risco financeiro. 100% habilidade. Total transparência.
          </motion.p>

          {/* Platform Pills */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-6"
          >
            <PlatformPill icon={Swords} label="Esports" color={CYAN} />
            <PlatformPill icon={Trophy} label="Sorteios" color={PURPLE} />
            <PlatformPill icon={Gamepad2} label="Jogos" color={GREEN} />
          </motion.div>
        </div>

        {/* ─── Column Headers ─── */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-4 items-center mb-6 px-1"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span className="text-xs font-bold uppercase tracking-widest text-red-400">
              Apostas Tradicionais
            </span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2 md:justify-end">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Bateumz
            </span>
            <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          </div>
        </motion.div>

        {/* ─── Comparison Rows ─── */}
        <div className="space-y-3 sm:space-y-4">
          {COMPARISON_ROWS.map((row, i) => (
            <ComparisonRowCard key={i} row={row} index={i} />
          ))}
        </div>

        {/* ─── Bottom Summary Banner ─── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={footerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="mt-12 sm:mt-16 relative"
        >
          <div className="relative rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 backdrop-blur-sm overflow-hidden">
            {/* Glow effects */}
            <div
              className="absolute top-0 left-[20%] h-40 w-40 rounded-full blur-[80px] pointer-events-none"
              style={{ background: `${CYAN}10` }}
            />
            <div
              className="absolute bottom-0 right-[20%] h-40 w-40 rounded-full blur-[80px] pointer-events-none"
              style={{ background: `${GREEN}10` }}
            />

            {/* Inner content */}
            <div className="relative flex flex-col sm:flex-row items-center gap-6 sm:gap-8 p-6 sm:p-8 lg:p-10">
              {/* Shield / Crown icon cluster */}
              <div className="flex-shrink-0 relative">
                <motion.div
                  className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-green-500/20 border border-zinc-700/50 flex items-center justify-center"
                  animate={{ rotate: [0, 2, -2, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-400" />
                </motion.div>
                {/* Orbiting sparkles */}
                <motion.div
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-cyan-400/80 blur-[2px]"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-green-400/80 blur-[2px]"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                />
              </div>

              {/* Text content */}
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-display text-xl sm:text-2xl font-bold text-zinc-100 mb-2">
                  O futuro do gaming{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-green-400">
                    é aqui.
                  </span>
                </h3>
                <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl">
                  Zero risco financeiro. 100% baseado em habilidade. Transparência total.
                  Junte-se a milhares de jogadores que já descobriram uma forma melhor de competir e ganhar prémios.
                </p>

                {/* Quick stats row */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 mt-4">
                  <StatChip icon={ShieldCheck} label="Verificado" color={CYAN} />
                  <StatChip icon={Brain} label="Habilidade" color={PURPLE} />
                  <StatChip icon={Heart} label="Responsável" color={GREEN} />
                  <StatChip icon={Lock} label="Seguro" color={GOLD} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Stat Chip ─── */
function StatChip({
  icon: Icon,
  label,
  color,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className="h-3.5 w-3.5" style={{ color }} />
      <span className="font-semibold text-zinc-300">{label}</span>
    </div>
  );
}
