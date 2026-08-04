'use client';

import { useState } from 'react';
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
} from 'lucide-react';

const NAV_ITEMS = [
  { icon: Trophy, label: 'Campeonatos', path: '/esports' },
  { icon: Swords, label: 'Ligas', path: '/esports/seasons' },
  { icon: Coins, label: 'Apostas', path: '/esports/betting' },
  { icon: Target, label: 'Ranking', path: '/esports/leaderboard' },
  { icon: ArrowLeftRight, label: 'Transferencias', path: '/esports/transfers' },
  { icon: Award, label: 'Conquistas', path: '/esports/achievements' },
  { icon: LayoutGrid, label: 'Equipas', path: '/esports/equipas' },
];

const HAS_LIVE_CHAMPIONSHIPS = true;

export default function EsportsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/esports') {
      return location.pathname === '/esports' || location.pathname === '/esports/';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#06060b] text-white">
      <nav className="fixed top-0 left-0 right-0 h-14 bg-[#0a0a12] border-b border-white/5 z-50">
        <div className="flex items-center justify-between h-full px-3 md:px-6 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors duration-200"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleNavClick('/esports')}
              className="flex items-center gap-2 group"
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600/10 border border-violet-500/20">
                <Zap className="w-4 h-4 text-violet-400" />
                <div className="absolute inset-0 rounded-lg bg-violet-500/10 blur-md group-hover:bg-violet-500/20 transition-colors duration-300" />
              </div>
              <span
                className="hidden sm:block text-sm font-bold tracking-wide text-white"
                style={{
                  textShadow: '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.2)',
                }}
              >
                BATEU ESPORTS
              </span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200"
                >
                  {active && (
                    <motion.div
                      layoutId="esports-nav-active"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600/20 to-purple-600/10 border border-violet-500/30"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  <Icon className={"relative z-10 w-3.5 h-3.5 " + (active ? 'text-white' : 'text-zinc-500')} />
                  <span className={"relative z-10 whitespace-nowrap " + (active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {HAS_LIVE_CHAMPIONSHIPS && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                  AO VIVO
                </span>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors duration-200"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="lg:hidden overflow-hidden bg-[#0a0a12] border-b border-white/5"
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
                      className={"flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 " + (active
                        ? 'bg-gradient-to-r from-violet-600/20 to-purple-600/10 border border-violet-500/30 text-white'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                      )}
                    >
                      <Icon className={"w-4 h-4 " + (active ? 'text-violet-400' : '')} />
                      <span>{item.label}</span>
                      {active && (
                        <motion.div
                          layoutId="mobile-nav-indicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400"
                          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        />
                      )}
                    </motion.button>
                  );
                })}

                {HAS_LIVE_CHAMPIONSHIPS && (
                  <div className="flex items-center gap-2 px-3 py-2 mt-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-red-400">AO VIVO</span>
                    <Radio className="w-3 h-3 text-red-400 ml-auto" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <div className="fixed top-14 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent z-50" />
      <div className="h-14" />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
