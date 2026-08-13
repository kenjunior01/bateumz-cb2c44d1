'use client';

import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Swords,
  Coins,
  Target,
  ArrowLeftRight,
  Award,
  LayoutGrid,
  ChevronLeft,
  Zap,
  Radio,
  Menu,
  X,
  Shield,
  Flame,
} from 'lucide-react';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import SoundSettings from '@/components/SoundSettings';

const NAV_ITEMS = [
  { icon: Trophy, label: 'Campeonatos', path: '/esports' },
  { icon: Swords, label: 'Ligas', path: '/esports/seasons' },
  { icon: Target, label: 'Previsoes', path: '/esports/betting' },
  { icon: Flame, label: 'Duelos P2P', path: '/esports/duelos' },
  { icon: Target, label: 'Ranking', path: '/esports/leaderboard' },
  { icon: ArrowLeftRight, label: 'Transferencias', path: '/esports/transfers' },
  { icon: Award, label: 'Conquistas', path: '/esports/achievements' },
  { icon: LayoutGrid, label: 'Equipas', path: '/esports/equipas' },
];

const HAS_LIVE_CHAMPIONSHIPS = true;

export default function EsportsLayout() {
  const { sfx } = useSoundEffects();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [glowPosition, setGlowPosition] = useState({ x: 0, y: 0 });

  const isActive = (path: string) => {
    if (path === '/esports') {
      return location.pathname === '/esports' || location.pathname === '/esports/';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    sfx.tabClick();
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setGlowPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className="area-esports min-h-screen text-white relative"
      style={{ background: 'var(--area-bg)' }}
      onMouseMove={handleMouseMove}
    >
      {/* Subtle scanline overlay for cyberpunk feel */}
      <div className="esports-scanline-overlay" />

      {/* Mouse-following glow */}
      <div
        className="fixed pointer-events-none z-0 transition-all duration-300"
        style={{
          left: glowPosition.x - 300,
          top: glowPosition.y - 300,
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 212, 255, 0.04) 0%, transparent 70%)',
        }}
      />

      {/* Top Navigation Bar */}
      <nav
        className="fixed top-0 left-0 right-0 h-14 z-50"
        style={{
          background: 'linear-gradient(180deg, rgba(10,10,15,0.98) 0%, rgba(10,10,15,0.95) 100%)',
          borderBottom: '1px solid rgba(0, 212, 255, 0.08)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-between h-full px-3 md:px-6 max-w-[1400px] mx-auto">
          {/* Left: Back + Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => { sfx.click(); navigate('/'); }}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-[#00d4ff] hover:bg-[#00d4ff]/5 transition-all duration-200"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-white/5" />
            <button
              onClick={() => handleNavClick('/esports')}
              className="flex items-center gap-2.5 group"
            >
              <div className="relative flex items-center justify-center w-9 h-9 rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(123, 47, 247, 0.15))',
                  border: '1px solid rgba(0, 212, 255, 0.2)',
                }}
              >
                <Shield className="w-4 h-4 text-[#00d4ff] relative z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#00d4ff]/0 via-[#00d4ff]/5 to-[#00d4ff]/0 group-hover:via-[#00d4ff]/10 transition-all duration-500" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span
                  className="text-sm font-black tracking-[0.2em] text-white esports-glow-text"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  BATEU ESPORTS
                </span>
                <span className="text-[9px] tracking-[0.3em] text-[#00d4ff]/40 font-medium uppercase">
                  Compete. Dominate.
                </span>
              </div>
            </button>
          </div>

          {/* Center: Desktop Nav */}
          <div className="hidden lg:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={"relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all duration-200 rounded-md " + (active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]')}
                >
                  {active && (
                    <motion.div
                      layoutId="esports-nav-active"
                      className="absolute inset-0 rounded-md"
                      style={{
                        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.12), rgba(123, 47, 247, 0.08))',
                        border: '1px solid rgba(0, 212, 255, 0.2)',
                        boxShadow: '0 0 15px rgba(0, 212, 255, 0.08)',
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  <Icon className={"relative z-10 w-3.5 h-3.5 " + (active ? 'text-[#00d4ff]' : '')} />
                  <span className="relative z-10 whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Sound + Live indicator + Mobile menu */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center">
              <SoundSettings />
            </div>
            {HAS_LIVE_CHAMPIONSHIPS && (
              <motion.div
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md"
                style={{
                  background: 'rgba(255, 70, 85, 0.08)',
                  border: '1px solid rgba(255, 70, 85, 0.2)',
                }}
                animate={{ boxShadow: ['0 0 0px rgba(255,70,85,0)', '0 0 15px rgba(255,70,85,0.1)', '0 0 0px rgba(255,70,85,0)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4655] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff4655]" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff4655]">
                  Live
                </span>
              </motion.div>
            )}

            <button
              onClick={() => {
                if (!mobileMenuOpen) { sfx.modalOpen(); } else { sfx.modalClose(); }
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-[#00d4ff] hover:bg-[#00d4ff]/5 transition-all duration-200"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="lg:hidden overflow-hidden"
              style={{
                background: 'rgba(10,10,15,0.98)',
                borderBottom: '1px solid rgba(0, 212, 255, 0.06)',
              }}
            >
              <div className="px-4 py-3 flex flex-col gap-1">
                {NAV_ITEMS.map((item, index) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <motion.button
                      key={item.path}
                      initial={{ x: -12, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.04, duration: 0.2, ease: 'easeOut' }}
                      onClick={() => handleNavClick(item.path)}
                      className={"flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 " + (active
                        ? 'text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                      )}
                      style={active ? {
                        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.12), rgba(123, 47, 247, 0.08))',
                        border: '1px solid rgba(0, 212, 255, 0.2)',
                      } : {}}
                    >
                      <Icon className={"w-4 h-4 " + (active ? 'text-[#00d4ff]' : '')} />
                      <span>{item.label}</span>
                      {active && (
                        <motion.div
                          layoutId="mobile-nav-indicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00d4ff]"
                          style={{ boxShadow: '0 0 8px rgba(0, 212, 255, 0.5)' }}
                          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        />
                      )}
                    </motion.button>
                  );
                })}

                {HAS_LIVE_CHAMPIONSHIPS && (
                  <div className="flex items-center gap-2 px-3 py-2 mt-1" style={{ borderTop: '1px solid rgba(0, 212, 255, 0.06)' }}>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff4655] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff4655]" />
                    </span>
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-[#ff4655]">Live</span>
                    <Radio className="w-3 h-3 text-[#ff4655] ml-auto" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Animated gradient line under nav */}
      <div className="fixed top-14 left-0 right-0 h-px z-50">
        <div
          className="h-full"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(0, 212, 255, 0.4) 20%, rgba(123, 47, 247, 0.3) 50%, rgba(255, 70, 85, 0.2) 80%, transparent 100%)',
          }}
        />
      </div>

      <div className="h-14" />
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
