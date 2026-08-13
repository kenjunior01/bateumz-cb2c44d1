'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  Trophy,
  Flame,
  Users,
  Coins,
  Clock,
  TrendingUp,
  Zap,
  ChevronRight,
  Star,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ── Countdown hook ──────────────────────────────────────────────
function useCountdown(targetDate: Date) {
  const calcTimeLeft = useCallback(() => {
    const diff = targetDate.getTime() - Date.now();
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      expired: false,
    };
  }, [targetDate]);

  const [timeLeft, setTimeLeft] = useState(calcTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calcTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [calcTimeLeft]);

  return timeLeft;
}

// ── Animated digit block ───────────────────────────────────────
function DigitBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        key={value}
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-lg font-mono text-lg sm:text-2xl font-bold"
        style={{
          background: 'linear-gradient(180deg, rgba(0,212,255,0.15) 0%, rgba(0,212,255,0.05) 100%)',
          border: '1px solid rgba(0,212,255,0.3)',
          color: '#00d4ff',
          textShadow: '0 0 8px rgba(0,212,255,0.5)',
        }}
      >
        {String(value).padStart(2, '0')}
      </motion.div>
      <span className="text-[10px] sm:text-xs text-white/40 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ── Arena background visual ────────────────────────────────────
function ArenaVisual() {
  return (
    <div className="relative w-full h-32 sm:h-48 lg:h-64 overflow-hidden">
      {/* Radial glow base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 120%, rgba(0,212,255,0.18) 0%, rgba(0,212,255,0.04) 50%, transparent 70%)',
        }}
      />

      {/* Animated concentric rings */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border left-1/2 top-1/2"
          style={{
            borderColor: `rgba(0,212,255,${0.08 + i * 0.04})`,
            width: `${120 + i * 60}px`,
            height: `${120 + i * 60}px`,
            x: '-50%',
            y: '-50%',
          }}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.4,
          }}
        />
      ))}

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`p-${i}`}
          className="absolute rounded-full"
          style={{
            width: `${2 + (i % 3) * 2}px`,
            height: `${2 + (i % 3) * 2}px`,
            background: '#00d4ff',
            boxShadow: '0 0 6px rgba(0,212,255,0.6)',
            left: `${15 + (i * 12) % 70}%`,
            top: `${20 + (i * 17) % 60}%`,
          }}
          animate={{
            y: [-12, 12, -12],
            opacity: [0.2, 0.9, 0.2],
          }}
          transition={{
            duration: 3 + (i % 3),
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,212,255,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Horizontal scan line */}
      <motion.div
        className="absolute left-0 right-0 h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)',
        }}
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

// ── Fair play verified badge ────────────────────────────────────
function VerifiedFairPlayBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.8, ease: 'easeOut' }}
      className="relative"
    >
      {/* Glow behind */}
      <div
        className="absolute -inset-1 rounded-full blur-md"
        style={{ background: 'rgba(16,185,129,0.2)' }}
      />

      <div
        className="relative inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full"
        style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.05))',
          border: '1px solid rgba(16,185,129,0.35)',
          boxShadow: '0 0 16px rgba(16,185,129,0.1)',
        }}
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
        </motion.div>
        <div className="flex flex-col">
          <span className="text-xs sm:text-sm font-bold text-emerald-300 tracking-wide">
            VERIFICADO JUSTO
          </span>
          <span className="text-[9px] sm:text-[10px] text-emerald-400/60 leading-none mt-0.5">
            Sem dinheiro real · Moedas virtuais
          </span>
        </div>
        <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400/70" />
      </div>
    </motion.div>
  );
}

// ── Main component ──────────────────────────────────────────────
export default function PredictionArenaHero() {
  // Next round: ~23h from now (for demo purposes)
  const [targetDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 23);
    d.setMinutes(d.getMinutes() + 47);
    d.setSeconds(d.getSeconds() + 12);
    return d;
  });

  const { hours, minutes, seconds, expired } = useCountdown(targetDate);

  const quickStats = [
    {
      icon: Users,
      label: '12,847',
      sublabel: 'previsores ativos',
      color: '#00d4ff',
    },
    {
      icon: Coins,
      label: 'MT 5,000,000',
      sublabel: 'em prémios este mês',
      color: '#facc15',
    },
  ];

  return (
    <section className="relative w-full overflow-hidden" aria-label="Arena de Previsões Hero">
      {/* Background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(180deg, #0a0e1a 0%, #0d1321 40%, #111827 100%)',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* ── Arena Visual ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl pointer-events-none"
        >
          <ArenaVisual />
        </motion.div>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center text-center mb-6 sm:mb-8"
        >
          <Badge
            variant="outline"
            className="mb-3 text-[10px] sm:text-xs font-medium tracking-widest uppercase"
            style={{
              borderColor: 'rgba(0,212,255,0.3)',
              color: '#00d4ff',
              background: 'rgba(0,212,255,0.06)',
            }}
          >
            <Zap className="w-3 h-3 mr-1" />
            Predict & Compete
          </Badge>

          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight"
            style={{
              color: '#00d4ff',
              textShadow:
                '0 0 20px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.15), 0 2px 4px rgba(0,0,0,0.6)',
            }}
          >
            ARENA DE PREVISÕES
          </h1>

          <p className="mt-2 text-sm sm:text-base text-white/50 max-w-md">
            Mostra o teu conhecimento. Sobe no ranking. Ganha prémios.
          </p>
        </motion.div>

        {/* ── Tournament Info + Countdown ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center mb-8 sm:mb-10"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(0,212,255,0.03))',
              border: '1px solid rgba(0,212,255,0.2)',
            }}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm sm:text-base font-semibold text-white/90">
              Torneio Semanal #47
            </span>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Clock className="w-4 h-4 text-white/40 hidden sm:block" />
            <AnimatePresence mode="wait">
              {expired ? (
                <motion.p
                  key="expired"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-amber-400 font-semibold"
                >
                  Nova ronda a começar!
                </motion.p>
              ) : (
                <motion.div
                  key="countdown"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 sm:gap-3"
                >
                  <span className="text-xs text-white/40 mr-1 hidden sm:inline">Próxima ronda em</span>
                  <DigitBlock value={hours} label="Horas" />
                  <span className="text-white/30 text-lg font-bold mt-[-16px]">:</span>
                  <DigitBlock value={minutes} label="Min" />
                  <span className="text-white/30 text-lg font-bold mt-[-16px]">:</span>
                  <DigitBlock value={seconds} label="Seg" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Ranking Card + Quick Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
          {/* Ranking Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card
              className="relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,212,255,0.02))',
                borderColor: 'rgba(0,212,255,0.2)',
              }}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-white/40 font-medium uppercase tracking-wider">
                    O Teu Ranking
                  </span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>

                <div className="flex items-center gap-4 mb-4">
                  {/* Position circle */}
                  <div
                    className="relative flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.06))',
                      border: '2px solid rgba(0,212,255,0.4)',
                      boxShadow: '0 0 20px rgba(0,212,255,0.15)',
                    }}
                  >
                    <span
                      className="text-xl sm:text-2xl font-black"
                      style={{ color: '#00d4ff' }}
                    >
                      42
                    </span>
                    <span className="absolute -bottom-0.5 text-[9px] text-white/30">º</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-white/80 font-semibold text-sm sm:text-base">
                      Subiste 8 posições
                    </span>
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 rotate-[-90deg]" />
                      Tendência positiva
                    </span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-lg p-3"
                    style={{
                      background: 'rgba(0,212,255,0.05)',
                      border: '1px solid rgba(0,212,255,0.12)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Star className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] text-white/40">Pontos esta semana</span>
                    </div>
                    <span className="text-lg font-bold text-white">1,280</span>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{
                      background: 'rgba(0,212,255,0.05)',
                      border: '1px solid rgba(0,212,255,0.12)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      <span className="text-[10px] text-white/40">Win Streak</span>
                    </div>
                    <span className="text-lg font-bold text-white">7 jogos</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Stats */}
          {quickStats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + idx * 0.15 }}
              >
                <Card
                  className="h-full"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,212,255,0.05), rgba(0,212,255,0.01))',
                    borderColor: 'rgba(0,212,255,0.12)',
                  }}
                >
                  <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-center gap-2 h-full">
                    <div
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center"
                      style={{
                        background: `rgba(${stat.color === '#00d4ff' ? '0,212,255' : '250,204,21'},0.1)`,
                        border: `1px solid rgba(${stat.color === '#00d4ff' ? '0,212,255' : '250,204,21'},0.25)`,
                      }}
                    >
                      <Icon
                        className="w-5 h-5 sm:w-6 sm:h-6"
                        style={{ color: stat.color }}
                      />
                    </div>
                    <span
                      className="text-xl sm:text-2xl font-bold"
                      style={{ color: stat.color }}
                    >
                      {stat.label}
                    </span>
                    <span className="text-xs sm:text-sm text-white/40">{stat.sublabel}</span>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* ── Verified Fair Play Badge ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex justify-center"
        >
          <VerifiedFairPlayBadge />
        </motion.div>

        {/* ── Bottom CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.1 }}
          className="flex justify-center mt-8"
        >
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(0,212,255,0.3)' }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-3.5 rounded-full font-semibold text-sm sm:text-base text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
              boxShadow: '0 0 20px rgba(0,212,255,0.2)',
            }}
          >
            Fazer Previsão Agora
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
