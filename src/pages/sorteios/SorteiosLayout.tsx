'use client';

import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket, Gift, Crown, Star, ChevronLeft,
  Menu, X, Sparkles, Trophy, Flame, Calendar,
} from 'lucide-react';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import SoundSettings from '@/components/SoundSettings';
import GlowOrb from '@/components/ui/GlowOrb';
import ParticleTrail from '@/components/ui/ParticleTrail';
import ButtonRipple from '@/components/ui/ButtonRipple';
import ShimmerText from '@/components/ui/ShimmerText';
import ScrollReveal from '@/components/ui/ScrollReveal';

const NAV_ITEMS = [
  { icon: Ticket, label: 'Sorteios', path: '/marketplace' },
  { icon: Trophy, label: 'Concursos', path: '/concursos' },
  { icon: Flame, label: 'Instant Win', path: '/instant-win' },
  { icon: Calendar, label: 'Historico', path: '/historico' },
  { icon: Gift, label: 'Meus Bilhetes', path: '/my-tickets' },
];

export default function SorteiosLayout() {
  const { sfx } = useSoundEffects();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleNavClick = (path: string) => {
    sfx.tabClick();
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div
      className="area-sorteios min-h-screen relative"
      style={{ background: 'var(--area-bg)', color: 'var(--area-text)' }}
    >
      <div className="area-floating-particles">
        <span /><span /><span /><span /><span /><span />
      </div>

      <nav
        className="fixed top-0 left-0 right-0 h-14 z-50"
        style={{
          background: 'linear-gradient(180deg, rgba(11,5,21,0.98) 0%, rgba(11,5,21,0.92) 100%)',
          borderBottom: '1px solid rgba(168, 85, 247, 0.1)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-between h-full px-3 md:px-6 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => { sfx.click(); navigate('/'); }}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:text-[#a855f7] hover:bg-[#a855f7]/5 transition-all duration-200"
              style={{ color: 'var(--area-text-muted)' }}
              aria-label="Voltar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px" style={{ background: 'rgba(168, 85, 247, 0.15)' }} />
            <button
              onClick={() => handleNavClick('/marketplace')}
              className="flex items-center gap-2.5 group"
            >
              <div
                className="relative flex items-center justify-center w-9 h-9 rounded-xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(245, 158, 11, 0.15))',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                }}
              >
                <Crown className="w-4 h-4 text-[#a855f7] relative z-10" />
              </div>
              <div className="hidden sm:flex flex-col relative">
                <GlowOrb
                  className="absolute -top-8 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  color="#a855f7"
                  secondaryColor="#fbbf24"
                  size={80}
                  intensity={0.5}
                  speed={6}
                  orbitRadius={0}
                  enableTrail={false}
                />
                <span
                  className="text-sm font-black tracking-wide sorteios-glow-purple"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  SORTEIOS & PREMIOS
                </span>
                <span className="text-[9px] tracking-widest text-[#a855f7]/40 font-medium uppercase">
                  Ganhe. Sonhe. Conquiste.
                </span>
              </div>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={"relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 rounded-full " + (active ? 'text-white' : 'hover:text-white/80')}
                  style={!active ? { color: 'var(--area-text-muted)' } : {}}
                >
                  {active && (
                    <motion.div
                      layoutId="sorteios-nav-active"
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.1))',
                        border: '1px solid rgba(168, 85, 247, 0.25)',
                        boxShadow: '0 0 20px rgba(168, 85, 247, 0.08)',
                      }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={"relative z-10 w-3.5 h-3.5 " + (active ? 'text-[#c084fc]' : '')} />
                  <span className="relative z-10 whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center">
              <SoundSettings />
            </div>
            <ButtonRipple
              className="hidden sm:flex"
              rippleColor="#fbbf24"
              soundEffect={sfx.click}
            >
              <motion.div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 191, 36, 0.1))',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="w-3 h-3 text-[#fbbf24]" />
                <ShimmerText
                  colors={["#fbbf24", "#a855f7", "#fbbf24"]}
                  speed={3}
                  as="span"
                  className="text-[10px] font-bold"
                >
                  PREMIOS
                </ShimmerText>
              </motion.div>
            </ButtonRipple>

            <button
              onClick={() => {
                if (!mobileMenuOpen) { sfx.modalOpen(); } else { sfx.modalClose(); }
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:text-[#a855f7] hover:bg-[#a855f7]/5 transition-all duration-200"
              style={{ color: 'var(--area-text-muted)' }}
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
                background: 'rgba(11,5,21,0.98)',
                borderBottom: '1px solid rgba(168, 85, 247, 0.08)',
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
                      className={"flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 "}
                      style={active ? {
                        color: 'white',
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(236, 72, 153, 0.08))',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                      } : { color: 'var(--area-text-muted)' }}
                    >
                      <Icon className={"w-4 h-4 " + (active ? 'text-[#c084fc]' : '')} />
                      <span>{item.label}</span>
                      {active && (
                        <motion.div
                          layoutId="sorteios-mobile-indicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-[#a855f7]"
                          style={{ boxShadow: '0 0 8px rgba(168, 85, 247, 0.5)' }}
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
          background: 'linear-gradient(90deg, transparent 0%, rgba(168, 85, 247, 0.4) 25%, rgba(251, 191, 36, 0.3) 50%, rgba(236, 72, 153, 0.2) 75%, transparent 100%)',
        }}
      />

      <ParticleTrail
        className="absolute inset-0 z-[5] pointer-events-none"
        colors={["#a855f7", "#fbbf24", "#ec4899"]}
        particleSize={3}
        lifetime={40}
        spread={20}
      />
      <div className="h-14" />
      <ScrollReveal direction='up' delay={100}>
      <main className="relative z-10">
        <Outlet />
      </main>
      </ScrollReveal>
    </div>
  );
}
