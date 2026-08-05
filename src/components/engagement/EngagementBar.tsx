'use client';

import { useState, useEffect, useRef, type JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Flame, Users, Eye } from 'lucide-react';
import { useDailyReward } from './DailyRewardModal';
import DailyRewardModal from './DailyRewardModal';

const TICKER_ITEMS = [
  'Joao ganhou 50 MZN no Galo',
  'Maria entrou num sorteio de iPhone',
  'Carlos venceu a batalha de Quiz',
  'Ana depositou 200 MZN na carteira',
  'Pedro completou 5 dias de sequencia',
  'Lucia ganhou 100 MZN no bonus diario',
  'Fernando entrou no torneio FIFA',
  'Beatriz reclamou recompensa de 60 MZN',
  'Miguel ganhou no Jogo do Bicho',
  'Sofia entrou no sorteio de Capulana',
  'Rui venceu a batalha de Perguntas',
  'Isabel depositou 500 MZN',
  'Nelson completou 7 dias de sequencia',
  'Cristina ganhou 25 MZN no Bicho',
  'Andre entrou no torneio de Chess',
];

const ONLINE_COUNT = '1,247';

export default function EngagementBar(): JSX.Element {
  const { canClaim, streak, showDailyModal, setShowDailyModal } = useDailyReward();
  const [tickerIndex, setTickerIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % TICKER_ITEMS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let lastScroll = 0;
    const handleScroll = () => {
      const current = window.scrollY;
      if (current > lastScroll && current > 200) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScroll = current;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <DailyRewardModal
        open={showDailyModal}
        onOpenChange={setShowDailyModal}
      />

      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-40"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <motion.div
              className="mx-2 sm:mx-4 mb-2 rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(15,15,30,0.92), rgba(30,20,50,0.9))',
                border: '1px solid rgba(250,204,21,0.15)',
                boxShadow: '0 -4px 30px rgba(0,0,0,0.3), 0 0 20px rgba(250,204,21,0.08)',
                backdropFilter: 'blur(16px)',
              }}
              animate={{
                y: [0, -2, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5">
                <motion.div
                  className="hidden sm:flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5 flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                >
                  <span className="relative flex h-2 w-2">
                    <motion.span
                      className="absolute inline-flex h-full w-full rounded-full bg-emerald-400"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <Users className="text-white/60" size={13} />
                  <span className="text-xs font-semibold text-white/70">{ONLINE_COUNT}</span>
                  <span className="text-[10px] text-white/40">online</span>
                </motion.div>

                <div className="hidden sm:block w-px h-6 bg-white/10 flex-shrink-0" />

                <div className="flex-1 min-w-0 overflow-hidden h-6 flex items-center" ref={tickerRef}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tickerIndex}
                      className="flex items-center gap-1.5 whitespace-nowrap"
                      initial={{ y: 24, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -24, opacity: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                    >
                      <Eye className="text-yellow-400/70 flex-shrink-0" size={13} />
                      <span className="text-xs sm:text-sm text-white/70 font-medium truncate">
                        {TICKER_ITEMS[tickerIndex]}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="w-px h-6 bg-white/10 flex-shrink-0" />

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <motion.button
                    className="relative w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                    onClick={() => setShowDailyModal(true)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Bell className="text-white/60" size={16} />
                    {canClaim && (
                      <motion.span
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #ef4444, #f97316)',
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <span className="text-[9px] font-bold text-white">!</span>
                      </motion.span>
                    )}
                  </motion.button>

                  <motion.div
                    className="flex items-center gap-1 bg-white/5 rounded-xl px-2.5 py-1.5"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowDailyModal(true)}
                  >
                    <motion.div
                      animate={streak >= 2 ? {
                        scale: [1, 1.2, 1],
                        rotate: [-3, 3, -3],
                      } : {}}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Flame
                        className={streak >= 2 ? 'text-orange-500' : 'text-white/30'}
                        size={16}
                        fill={streak >= 2 ? 'currentColor' : 'none'}
                      />
                    </motion.div>
                    <span className={`text-xs font-bold ${streak >= 2 ? 'text-orange-400' : 'text-white/30'}`}>
                      {streak > 0 ? `${streak}d` : '-'}
                    </span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
