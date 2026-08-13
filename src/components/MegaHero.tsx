'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import {
  Swords, Crown, Gamepad2, ChevronRight, Zap, Users, Trophy, Star, Play, Sparkles,
} from 'lucide-react';

const WORLDS = [
  {
    id: 'esports',
    title: 'ESPORTS',
    tagline: 'Compete. Domina. Conquista.',
    description: 'Campeonatos ao vivo, ligas competitivas, ranking global e transferencias.',
    href: '/esports',
    icon: Swords,
    color: '#00d4ff',
    colorSecondary: '#ff4655',
    bgGradient: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0,212,255,0.08) 0%, transparent 70%)',
    features: ['AO VIVO', 'RANKING GLOBAL', 'LIGAS'],
  },
  {
    id: 'sorteios',
    title: 'SORTEIOS & PREMIOS',
    tagline: 'Ganhe. Sonhe. Conquiste.',
    description: 'Sorteios com verificacao blockchain, concursos exclusivos e premios reais.',
    href: '/marketplace',
    icon: Crown,
    color: '#a855f7',
    colorSecondary: '#f59e0b',
    bgGradient: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(168,85,247,0.08) 0%, transparent 70%)',
    features: ['BLOCKCHAIN', '24/7', 'GOLD'],
  },
  {
    id: 'jogos',
    title: 'JOGOS ONLINE',
    tagline: 'Joga. Conquista. Domina.',
    description: '90+ jogos em tempo real: arcade, estrategia, quiz, puzzle e multiplayer.',
    href: '/jogos',
    icon: Gamepad2,
    color: '#2ea043',
    colorSecondary: '#58a6ff',
    bgGradient: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(46,160,67,0.08) 0%, transparent 70%)',
    features: ['MULTIPLAYER', '90+ JOGOS', 'BOT'],
  },
];

function Particles({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: (1 + Math.random() * 3) + 'px',
            height: (1 + Math.random() * 3) + 'px',
            background: color,
            left: Math.random() * 100 + '%',
            top: Math.random() * 100 + '%',
          }}
          animate={{
            y: [0, -20 - Math.random() * 40, 0],
            opacity: [0.1, 0.4 + Math.random() * 0.3, 0.1],
            scale: [1, 1.2 + Math.random() * 0.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function GridOverlay({ color }: { color: string }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.03]"
      style={{
        backgroundImage: `linear-gradient(${color}30 1px, transparent 1px), linear-gradient(90deg, ${color}30 1px, transparent 1px)`,
        backgroundSize: '80px 80px',
      }}
    />
  );
}

export default function MegaHero() {
  const navigate = useNavigate();
  const [activeWorld, setActiveWorld] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const bgX = useTransform(springX, [0, 1], ['-20%', '20%']);
  const bgY = useTransform(springY, [0, 1], ['-20%', '20%']);

  const world = WORLDS[activeWorld];
  const Icon = world.icon;

  const startAutoPlay = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setActiveWorld(prev => (prev + 1) % WORLDS.length);
    }, 5000);
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startAutoPlay]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleWorldClick = (index: number) => {
    setActiveWorld(index);
    if (intervalRef.current) clearInterval(intervalRef.current);
    startAutoPlay();
  };

  return (
    <section
      className="relative min-h-[85vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
      style={{ background: 'hsl(var(--background))' }}
    >
      {/* Animated background glow that follows mouse */}
      <motion.div
        className="absolute w-[800px] h-[800px] pointer-events-none"
        style={{
          left: bgX,
          top: bgY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={world.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.8 }}
            className="w-full h-full rounded-full"
            style={{
              background: `radial-gradient(circle, ${world.color}12 0%, transparent 60%)`,
              filter: 'blur(40px)',
            }}
          />
        </AnimatePresence>
      </motion.div>

      {/* Grid overlay */}
      <AnimatePresence mode="wait">
        <motion.div
          key={world.id + '-grid'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <GridOverlay color={world.color} />
        </motion.div>
      </AnimatePresence>

      {/* Particles */}
      <AnimatePresence mode="wait">
        <motion.div
          key={world.id + '-particles'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Particles color={world.color} />
        </motion.div>
      </AnimatePresence>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-4 max-w-5xl">
        {/* World selector tabs */}
        <div className="flex justify-center mb-12">
          <div
            className="inline-flex items-center gap-1 p-1.5 rounded-2xl"
            style={{
              background: 'hsl(var(--card) / 0.5)',
              border: '1px solid hsl(var(--border) / 0.3)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {WORLDS.map((w, index) => {
              const WIcon = w.icon;
              const isActive = activeWorld === index;
              return (
                <button
                  key={w.id}
                  onClick={() => handleWorldClick(index)}
                  className={"relative flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 " + (isActive ? 'text-white' : 'text-muted-foreground hover:text-foreground')}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mega-hero-tab"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: `linear-gradient(135deg, ${w.color}25, ${w.colorSecondary}10)`,
                        border: `1px solid ${w.color}30`,
                        boxShadow: `0 0 20px ${w.color}15`,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <WIcon className={"relative z-10 w-4 h-4 " + (isActive ? '' : 'opacity-60')} style={isActive ? { color: w.color } : {}} />
                  <span className="relative z-10 hidden sm:inline tracking-wide">{w.title}</span>
                  {isActive && (
                    <motion.div
                      layoutId="mega-hero-dot"
                      className="relative z-10 w-1.5 h-1.5 rounded-full"
                      style={{ background: w.color, boxShadow: `0 0 8px ${w.color}60` }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hero content with animated transitions */}
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={world.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-8"
                style={{
                  background: `linear-gradient(135deg, ${world.color}15, ${world.colorSecondary}08)`,
                  border: `1px solid ${world.color}20`,
                  color: world.color,
                }}
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="tracking-wider">{world.features.join('  ·  ')}</span>
              </motion.div>

              {/* Title */}
              <h1
                className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-4"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: world.color,
                  textShadow: `0 0 40px ${world.color}30, 0 0 80px ${world.color}15`,
                }}
              >
                {world.title}
              </h1>

              {/* Tagline */}
              <p
                className="text-lg md:text-2xl font-bold tracking-wide mb-6"
                style={{
                  color: `hsl(var(--muted-foreground))`,
                  textShadow: `0 0 20px ${world.color}10`,
                }}
              >
                {world.tagline}
              </p>

              {/* Description */}
              <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
                {world.description}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(world.href)}
                  className="flex items-center gap-3 px-8 py-4 rounded-2xl text-sm font-bold tracking-wide text-white transition-all duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${world.color}, ${world.colorSecondary || world.color})`,
                    boxShadow: `0 8px 30px ${world.color}30, 0 0 0 1px ${world.color}40`,
                  }}
                >
                  <Play className="w-4 h-4" />
                  <span>ENTRAR AGORA</span>
                  <ChevronRight className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(world.href)}
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold tracking-wide transition-all duration-300"
                  style={{
                    background: `${world.color}08`,
                    border: `1px solid ${world.color}20`,
                    color: world.color,
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span>EXPLORAR</span>
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-16 flex items-center justify-center gap-8 md:gap-16"
          >
            {[
              { icon: Users, value: '10K+', label: 'Utilizadores' },
              { icon: Trophy, value: '500+', label: 'Premios' },
              { icon: Star, value: '100+', label: 'Sorteios' },
              { icon: Zap, value: '90+', label: 'Jogos' },
            ].map((stat) => {
              const SIcon = stat.icon;
              return (
                <div key={stat.label} className="text-center">
                  <SIcon className="w-4 h-4 mx-auto mb-1.5 opacity-40" />
                  <div className="text-xl md:text-2xl font-black font-[family-name:var(--font-display)] tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      {/* Animated world indicator dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
        {WORLDS.map((w, i) => (
          <button
            key={w.id}
            onClick={() => handleWorldClick(i)}
            className="relative w-8 h-1.5 rounded-full overflow-hidden transition-all duration-300"
            style={{ background: i === activeWorld ? `${w.color}30` : 'rgba(255,255,255,0.06)' }}
          >
            {i === activeWorld && (
              <motion.div
                layoutId="mega-hero-progress"
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: w.color }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                animate={{ width: '100%' }}
                transition={{ duration: 5, ease: 'linear' }}
              />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
