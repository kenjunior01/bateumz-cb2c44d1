'use client';

import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2, Radio, Swords, ChevronLeft,
  Menu, X, Zap, Trophy, Users, Sparkles,
} from 'lucide-react';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import SoundSettings from '@/components/SoundSettings';
import GlowOrb from '@/components/ui/GlowOrb';
import ParticleField from '@/components/ui/ParticleField';
import CardTilt from '@/components/ui/CardTilt';
import ShimmerText from '@/components/ui/ShimmerText';

const NAV_ITEMS = [
  { icon: Gamepad2, label: 'Todos os Jogos', path: '/jogos' },
  { icon: Radio, label: 'Ao Vivo', path: '/lives' },
  { icon: Swords, label: 'Batalhas', path: '/batalhas' },
  { icon: Users, label: 'Participar', path: '/participar' },
  { icon: Trophy, label: 'Torneios', path: '/tournaments' },
];

export default function JogosLayout() {
  const { sfx } = useSoundEffects();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/jogos') {
      return location.pathname === '/jogos' || location.pathname === '/jogos/';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string) => {
    sfx.tabClick();
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div
      className="area-jogos min-h-screen relative"
      style={{ background: 'var(--area-bg)', color: 'var(--area-text)' }}
    >
      {/* Subtle grid pattern for Steam-like feel */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(46,160,67,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(46,160,67,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
      <ParticleField
        className="fixed inset-0 z-[1] pointer-events-none"
        colors={["#2ea043", "#58a6ff", "#3fb950"]}
        count={30}
        speed={0.3}
        particleSize={1.5}
        enableConnections={true}
        connectionDistance={120}
        enableMouseRepel={true}
        mouseInfluenceRadius={100}
      />

      <nav
        className="fixed top-0 left-0 right-0 h-14 z-50"
        style={{
          background: 'linear-gradient(180deg, rgba(13,17,23,0.98) 0%, rgba(13,17,23,0.92) 100%)',
          borderBottom: '1px solid rgba(46, 160, 67, 0.1)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-between h-full px-3 md:px-6 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => { sfx.click(); navigate('/'); }}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-[#2ea043] hover:bg-[#2ea043]/5 transition-all duration-200"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-white/5" />
            <button
              onClick={() => handleNavClick('/jogos')}
              className="flex items-center gap-2.5 group"
            >
              <div
                className="relative flex items-center justify-center w-9 h-9 rounded-lg overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(46, 160, 67, 0.15), rgba(88, 166, 255, 0.15))',
                  border: '1px solid rgba(46, 160, 67, 0.2)',
                }}
              >
                <Gamepad2 className="w-4 h-4 text-[#2ea043] relative z-10" />
              </div>
              <div className="hidden sm:flex flex-col relative">
                <GlowOrb
                  className="absolute -top-8 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  color="#2ea043"
                  secondaryColor="#58a6ff"
                  size={80}
                  intensity={0.5}
                  speed={6}
                  orbitRadius={0}
                  enableTrail={false}
                />
                <span
                  className="text-sm font-black tracking-wide jogos-glow-green"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  JOGOS ONLINE
                </span>
                <span className="text-[9px] tracking-widest text-[#2ea043]/40 font-medium uppercase">
                  Joga. Conquista. Domina.
                </span>
              </div>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={"relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 rounded-md " + (active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]')}
                >
                  {active && (
                    <motion.div
                      layoutId="jogos-nav-active"
                      className="absolute inset-0 rounded-md"
                      style={{
                        background: 'linear-gradient(135deg, rgba(46, 160, 67, 0.15), rgba(88, 166, 255, 0.08))',
                        border: '1px solid rgba(46, 160, 67, 0.2)',
                        boxShadow: '0 0 15px rgba(46, 160, 67, 0.06)',
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={"relative z-10 w-3.5 h-3.5 " + (active ? 'text-[#3fb950]' : '')} />
                  <span className="relative z-10 whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center">
              <SoundSettings />
            </div>
            <motion.div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md"
              style={{
                background: 'rgba(46, 160, 67, 0.08)',
                border: '1px solid rgba(46, 160, 67, 0.15)',
              }}
            >
              <Zap className="w-3 h-3 text-[#3fb950]" />
              <ShimmerText
                colors={["#3fb950", "#58a6ff", "#3fb950"]}
                speed={3}
                as="span"
                className="text-[10px] font-bold"
              >
                90+ JOGOS
              </ShimmerText>
            </motion.div>

            <button
              onClick={() => {
                if (!mobileMenuOpen) { sfx.modalOpen(); } else { sfx.modalClose(); }
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-[#2ea043] hover:bg-[#2ea043]/5 transition-all duration-200"
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
              className="lg:hidden overflow-hidden"
              style={{
                background: 'rgba(13,17,23,0.98)',
                borderBottom: '1px solid rgba(46, 160, 67, 0.06)',
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
                      className={"flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 " + (active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200')}
                      style={active ? {
                        background: 'linear-gradient(135deg, rgba(46, 160, 67, 0.12), rgba(88, 166, 255, 0.08))',
                        border: '1px solid rgba(46, 160, 67, 0.2)',
                      } : {}}
                    >
                      <Icon className={"w-4 h-4 " + (active ? 'text-[#3fb950]' : '')} />
                      <span>{item.label}</span>
                      {active && (
                        <motion.div
                          layoutId="jogos-mobile-indicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3fb950]"
                          style={{ boxShadow: '0 0 8px rgba(46, 160, 67, 0.5)' }}
                          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <div className="fixed top-14 left-0 right-0 h-px z-50"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(46, 160, 67, 0.3) 30%, rgba(88, 166, 255, 0.2) 60%, transparent 100%)',
        }}
      />

      <div className="h-14" />
      <main className="relative z-10">
        <CardTilt
          className="w-full"
          maxTilt={1.5}
          scaleOnHover={1.005}
          glareOpacity={0}
          borderGlow="#2ea043"
        >
          <Outlet />
        </CardTilt>
      </main>
    </div>
  );
}
