import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PulseEvent {
  id: number;
  text: string;
  icon: string;
}

const EVENTS: Omit<PulseEvent, 'id'>[] = [
  { text: 'Joao ganhou no Galo PRO', icon: '🏆' },
  { text: 'Maria entrou no Sorteio VIP', icon: '🎰' },
  { text: 'Pedro iniciou uma Live', icon: '🔴' },
  { text: 'Ana juntou-se ao Torneio', icon: '⚔️' },
  { text: 'Carlos desbloqueou uma conquista', icon: '🏅' },
  { text: 'Lucia aceitou um desafio', icon: '🎯' },
  { text: 'Mozambique lidera o ranking', icon: '🌍' },
  { text: 'Rafael ganhou 500 moedas', icon: '💰' },
  { text: 'Fernanda venceu o Quiz', icon: '🧠' },
  { text: 'Novo sorteio ao vivo!', icon: '✨' },
  { text: 'David completou nivel 10', icon: '🚀' },
  { text: 'Beatriz comprou 10 bilhetes', icon: '🎫' },
];

const DISMISS_KEY = 'livepulse_dismiss_until';
const SHOW_INTERVAL = 6000;

export default function LivePulseBar() {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [visible, setVisible] = useState<PulseEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const isDismissed = useCallback(() => {
    try {
      const until = localStorage.getItem(DISMISS_KEY);
      if (until && Date.now() < Number(until)) return true;
    } catch {}
    return false;
  }, []);

  useEffect(() => {
    if (isDismissed()) { setDismissed(true); return; }
    const initial = EVENTS.map((e, i) => ({ ...e, id: i }));
    setEvents(initial);
  }, [isDismissed]);

  useEffect(() => {
    if (dismissed || events.length === 0) return;
    let idx = 0;
    const show = () => {
      setVisible(events[idx % events.length]);
      idx++;
    };
    const timer = setInterval(show, SHOW_INTERVAL);
    show();
    return () => clearInterval(timer);
  }, [dismissed, events]);

  const handleDismiss = () => {
    setVisible(null);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 30000)); } catch {}
    setDismissed(true);
  };

  if (dismissed || !visible) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-40">
      <AnimatePresence mode="wait">
        <motion.div
          key={visible.id}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 backdrop-blur-xl cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, rgba(0,0,0,0.7), rgba(20,10,30,0.8))',
          }}
          onClick={handleDismiss}
        >
          <span className="flex items-center justify-center w-2 h-2">
            <span className="absolute w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75 shadow-[0_0_8px_hsl(var(--primary)/0.4)]" />
            <span className="relative w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
          </span>
          <span className="text-sm text-green-400 font-bold tracking-wider">AO VIVO</span>
          <span className="text-xs text-white/70">{visible.icon} {visible.text}</span>
          <button
            className="ml-auto text-white/30 hover:text-white/60 text-xs"
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            aria-label="Fechar"
          >
            ✕
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
