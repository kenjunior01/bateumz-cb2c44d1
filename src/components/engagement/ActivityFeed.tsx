'use client';

import { useState, useEffect, type JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Wallet, Swords, Ticket, Coins, Crown } from 'lucide-react';

// Activity type definitions
const ACTIVITY_TYPES = {
  win: { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  deposit: { icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  battle: { icon: Swords, color: 'text-red-400', bg: 'bg-red-400/10' },
  raffle: { icon: Ticket, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  reward: { icon: Coins, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  streak: { icon: Crown, color: 'text-amber-400', bg: 'bg-amber-400/10' },
};

type ActivityType = keyof typeof ACTIVITY_TYPES;

interface Activity {
  id: string;
  type: ActivityType;
  user: string;
  message: string;
  amount?: string;
  timeAgo: string;
}

const ALL_ACTIVITIES: Omit<Activity, 'id'>[] = [
  { type: 'win', user: 'Joao M.', message: 'ganhou 50 MZN no Galo', timeAgo: '1 min atras' },
  { type: 'deposit', user: 'Ana S.', message: 'depositou 200 MZN', timeAgo: '2 min atras' },
  { type: 'battle', user: 'Carlos N.', message: 'venceu batalha de Quiz', timeAgo: '3 min atras' },
  { type: 'raffle', user: 'Maria L.', message: 'entrou no sorteio iPhone', timeAgo: '3 min atras' },
  { type: 'reward', user: 'Pedro T.', message: 'reclamou bonus de 15 MZN', timeAgo: '5 min atras' },
  { type: 'streak', user: 'Lucia F.', message: 'completou 7 dias de sequencia', timeAgo: '6 min atras' },
  { type: 'win', user: 'Fernando C.', message: 'ganhou 100 MZN no Bicho', timeAgo: '7 min atras' },
  { type: 'deposit', user: 'Beatriz M.', message: 'depositou 500 MZN', timeAgo: '8 min atras' },
  { type: 'battle', user: 'Miguel R.', message: 'venceu torneio FIFA', timeAgo: '10 min atras' },
  { type: 'raffle', user: 'Sofia A.', message: 'entrou no sorteio Capulana', timeAgo: '12 min atras' },
  { type: 'win', user: 'Rui D.', message: 'ganhou 25 MZN nos slots', timeAgo: '13 min atras' },
  { type: 'deposit', user: 'Isabel J.', message: 'depositou 150 MZN', timeAgo: '15 min atras' },
  { type: 'battle', user: 'Nelson P.', message: 'venceu batalha de Chess', timeAgo: '16 min atras' },
  { type: 'reward', user: 'Cristina G.', message: 'reclamou bonus de 60 MZN', timeAgo: '18 min atras' },
  { type: 'raffle', user: 'Andre V.', message: 'entrou no sorteio TV', timeAgo: '20 min atras' },
  { type: 'win', user: 'Diana B.', message: 'ganhou 75 MZN na Roleta', timeAgo: '22 min atras' },
  { type: 'streak', user: 'Hugo K.', message: 'completou 5 dias de sequencia', timeAgo: '24 min atras' },
  { type: 'deposit', user: 'Teresa L.', message: 'depositou 300 MZN', timeAgo: '25 min atras' },
  { type: 'battle', user: 'Oscar M.', message: 'venceu batalha de Perguntas', timeAgo: '27 min atras' },
  { type: 'raffle', user: 'Elsa Q.', message: 'entrou no sorteio Airpods', timeAgo: '30 min atras' },
];

const VISIBLE_COUNT = 6;
const CYCLE_INTERVAL = 4000;

export default function ActivityFeed({ className }: { className?: string }): JSX.Element {
  const [startIndex, setStartIndex] = useState(0);
  const [items, setItems] = useState(() =>
    ALL_ACTIVITIES.slice(0, VISIBLE_COUNT).map((a, i) => ({ ...a, id: `act-${i}` }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setStartIndex((prev) => {
        const next = prev + 1;
        if (next + VISIBLE_COUNT > ALL_ACTIVITIES.length) {
          return 0;
        }
        return next;
      });
    }, CYCLE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const newItems = ALL_ACTIVITIES.slice(startIndex, startIndex + VISIBLE_COUNT).map((a, i) => ({
      ...a,
      id: `act-${startIndex + i}`,
    }));
    setItems(newItems);
  }, [startIndex]);

  return (
    <div className={className}>
      <div className="rounded-2xl overflow-hidden" style={{
        background: 'linear-gradient(135deg, rgba(15,15,30,0.85), rgba(25,18,40,0.85))',
        border: '1px solid rgba(250,204,21,0.1)',
        backdropFilter: 'blur(12px)',
      }}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <motion.span
              className="w-2 h-2 rounded-full bg-emerald-400"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            Actividade ao Vivo
          </h3>
          <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">tempo real</span>
        </div>

        <div className="px-3 pb-3 space-y-1">
          <AnimatePresence mode="popLayout">
            {items.map((activity) => {
              const typeConfig = ACTIVITY_TYPES[activity.type];
              const IconComp = typeConfig.icon;

              return (
                <motion.div
                  key={activity.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/5 transition-colors"
                  layout
                  initial={{ opacity: 0, x: -30, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <motion.div
                    className={`w-8 h-8 rounded-lg ${typeConfig.bg} flex items-center justify-center flex-shrink-0`}
                    whileHover={{ scale: 1.15, rotate: 10 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  >
                    <IconComp className={typeConfig.color} size={15} />
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 font-medium truncate">
                      <span className="text-white font-semibold">{activity.user}</span>{' '}
                      {activity.message}
                    </p>
                    <span className="text-[10px] text-white/30">{activity.timeAgo}</span>
                  </div>

                  {activity.type === 'win' && activity.amount && (
                    <motion.span
                      className="text-[11px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full flex-shrink-0"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                    >
                      +{activity.amount}
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
