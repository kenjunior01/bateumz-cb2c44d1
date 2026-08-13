'use client';

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Crown, Gamepad2, X, ChevronRight, Sparkles, Zap } from 'lucide-react';

const WORLDS = [
  {
    id: 'esports',
    title: 'ESPORTS',
    tagline: 'Compete. Domina.',
    href: '/esports',
    icon: Swords,
    color: '#00d4ff',
    colorSecondary: '#ff4655',
    bg: 'linear-gradient(135deg, #0a0a0f 0%, #0f1628 50%, #0a0a0f 100%)',
    border: 'rgba(0, 212, 255, 0.2)',
    glow: 'rgba(0, 212, 255, 0.08)',
    particleColor: '#00d4ff',
    stats: '12+ Campeonatos',
  },
  {
    id: 'sorteios',
    title: 'SORTEIOS',
    tagline: 'Ganhe. Sonhe.',
    href: '/marketplace',
    icon: Crown,
    color: '#a855f7',
    colorSecondary: '#f59e0b',
    bg: 'linear-gradient(135deg, #0b0515 0%, #1a0a2e 50%, #0b0515 100%)',
    border: 'rgba(168, 85, 247, 0.2)',
    glow: 'rgba(168, 85, 247, 0.08)',
    particleColor: '#a855f7',
    stats: '100+ Sorteios',
  },
  {
    id: 'jogos',
    title: 'JOGOS',
    tagline: 'Joga. Domina.',
    href: '/jogos',
    icon: Gamepad2,
    color: '#2ea043',
    colorSecondary: '#58a6ff',
    bg: 'linear-gradient(135deg, #0d1117 0%, #0a1f0e 50%, #0d1117 100%)',
    border: 'rgba(46, 160, 67, 0.2)',
    glow: 'rgba(46, 160, 67, 0.08)',
    particleColor: '#2ea043',
    stats: '90+ Jogos',
  },
];

export default function WorldSwitcher() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [currentWorld, setCurrentWorld] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/esports')) setCurrentWorld('esports');
    else if (path.startsWith('/marketplace') || path.startsWith('/concursos') || path.startsWith('/instant-win') || path.startsWith('/historico')) setCurrentWorld('sorteios');
    else if (path.startsWith('/jogos') || path.startsWith('/lives') || path.startsWith('/batalhas') || path.startsWith('/participar') || path.startsWith('/tournaments')) setCurrentWorld('jogos');
    else setCurrentWorld(null);
  }, [location.pathname]);

  // Show after scrolling down a bit on homepage, or always show inside areas
  useEffect(() => {
    const handleScroll = () => {
      if (currentWorld) {
        setVisible(true);
      } else {
        setVisible(window.scrollY > 400);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentWorld]);

  const handleNavigate = (href: string) => {
    navigate(href);
    setOpen(false);
  };

  // Find current world data for the FAB
  const activeWorld = WORLDS.find(w => w.id === currentWorld);

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {visible && !open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-24 left-5 z-[60] w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-xl"
            style={{
              background: activeWorld
                ? `linear-gradient(135deg, ${activeWorld.color}25, ${activeWorld.colorSecondary}15)`
                : 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(168,85,247,0.1), rgba(46,160,67,0.1))',
              border: activeWorld
                ? `1px solid ${activeWorld.color}30`
                : '1px solid rgba(255,255,255,0.08)',
              boxShadow: activeWorld
                ? `0 8px 32px ${activeWorld.glow}, 0 0 0 1px ${activeWorld.border}`
                : '0 8px 32px rgba(0,0,0,0.3)',
            }}
            aria-label="Mudar de mundo"
          >
            {/* Spinning border effect */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div
                className="absolute inset-[-2px] rounded-2xl"
                style={{
                  background: activeWorld
                    ? `conic-gradient(from 0deg, ${activeWorld.color}40, transparent 40%, transparent 60%, ${activeWorld.colorSecondary}40)`
                    : 'conic-gradient(from 0deg, rgba(0,212,255,0.3), transparent 33%, transparent 66%, rgba(46,160,67,0.3))',
                  animation: 'world-switcher-spin 4s linear infinite',
                }}
              />
              <div className="absolute inset-[1.5px] rounded-2xl" style={{ background: activeWorld ? activeWorld.color + '08' : 'rgba(10,10,15,0.95)' }} />
            </div>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="relative z-10"
            >
              <Sparkles className="w-6 h-6" style={{ color: activeWorld?.color || '#ffffff' }} />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-4 bottom-24 z-[70] w-[300px] rounded-3xl overflow-hidden"
              style={{
                background: 'rgba(10, 10, 18, 0.97)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
                backdropFilter: 'blur(40px)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h3 className="text-sm font-black text-white/90 tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
                    MUNDOS
                  </h3>
                  <p className="text-[10px] text-white/30 tracking-widest uppercase mt-0.5">
                    Tres experiencias. Uma plataforma.
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* World Cards */}
              <div className="px-4 pb-5 flex flex-col gap-3">
                {WORLDS.map((world, index) => {
                  const Icon = world.icon;
                  const isActive = currentWorld === world.id;

                  return (
                    <motion.button
                      key={world.id}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.08, duration: 0.3 }}
                      onClick={() => handleNavigate(world.href)}
                      className="group relative w-full text-left rounded-2xl p-4 overflow-hidden transition-all duration-300"
                      style={{
                        background: isActive
                          ? `linear-gradient(135deg, ${world.color}15, ${world.colorSecondary}08)`
                          : 'rgba(255,255,255,0.02)',
                        border: isActive
                          ? `1px solid ${world.color}25`
                          : '1px solid rgba(255,255,255,0.04)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = `linear-gradient(135deg, ${world.color}10, ${world.colorSecondary}05)`;
                          e.currentTarget.style.borderColor = `${world.color}15`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                        }
                      }}
                    >
                      {/* Background glow */}
                      <div
                        className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
                        style={{
                          background: world.color,
                          filter: 'blur(50px)',
                          opacity: isActive ? 0.08 : 0,
                          transition: 'opacity 0.3s',
                        }}
                      />

                      <div className="relative z-10 flex items-center gap-4">
                        {/* Icon */}
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                          style={{
                            background: `linear-gradient(135deg, ${world.color}20, ${world.colorSecondary}10)`,
                            border: `1px solid ${world.color}20`,
                            boxShadow: isActive ? `0 0 20px ${world.color}20` : 'none',
                          }}
                        >
                          <Icon className="w-5 h-5" style={{ color: world.color }} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm font-black tracking-wider"
                              style={{
                                color: isActive ? world.color : 'rgba(255,255,255,0.7)',
                                fontFamily: 'var(--font-display)',
                                textShadow: isActive ? `0 0 15px ${world.color}40` : 'none',
                              }}
                            >
                              {world.title}
                            </span>
                            {isActive && (
                              <span
                                className="text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest"
                                style={{
                                  background: `${world.color}20`,
                                  color: world.color,
                                  border: `1px solid ${world.color}25`,
                                }}
                              >
                                ATUAL
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-white/30 tracking-wide mt-0.5">
                            {world.tagline}
                          </p>
                          <p className="text-[10px] text-white/20 mt-1">
                            {world.stats}
                          </p>
                        </div>

                        {/* Arrow */}
                        <ChevronRight
                          className="w-4 h-4 shrink-0 transition-all duration-300"
                          style={{ color: isActive ? world.color : 'rgba(255,255,255,0.15)' }}
                        />
                      </div>

                      {/* Active indicator line */}
                      {isActive && (
                        <motion.div
                          layoutId="world-switcher-active"
                          className="absolute bottom-0 left-4 right-4 h-px"
                          style={{ background: `linear-gradient(90deg, ${world.color}60, ${world.colorSecondary}40, transparent)` }}
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer stats */}
              <div
                className="px-5 py-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-center justify-center gap-6">
                  {WORLDS.map((world) => (
                    <div key={world.id} className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: world.color,
                          boxShadow: `0 0 6px ${world.color}50`,
                        }}
                      />
                      <span className="text-[9px] text-white/25 font-medium">{world.id.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Close FAB replacement */}
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setOpen(false)}
              className="fixed bottom-24 left-5 z-[71] w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(10,10,18,0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
              aria-label="Fechar"
            >
              <X className="w-5 h-5 text-white/50" />
            </motion.button>
          </>
        )}
      </AnimatePresence>

      {/* Global animation keyframes */}
      <style>{`
        @keyframes world-switcher-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
