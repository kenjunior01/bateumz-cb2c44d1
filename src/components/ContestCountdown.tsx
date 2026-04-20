import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  endDate: string | null;
  compact?: boolean;
}

const calc = (end: string | null) => {
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, ended: true };
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
    ended: false,
  };
};

export default function ContestCountdown({ endDate, compact }: Props) {
  const [t, setT] = useState(() => calc(endDate));

  useEffect(() => {
    const i = setInterval(() => setT(calc(endDate)), 1000);
    return () => clearInterval(i);
  }, [endDate]);

  if (!t) return null;
  if (t.ended) {
    return <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Encerrado</span>;
  }

  const items = [
    { label: "d", value: t.d },
    { label: "h", value: t.h },
    { label: "m", value: t.m },
    { label: "s", value: t.s },
  ];

  return (
    <div className={`flex gap-1.5 ${compact ? "text-xs" : "text-sm"}`}>
      {items.map((it) => (
        <motion.div
          key={it.label}
          className={`${compact ? "px-2 py-1" : "px-2.5 py-1.5"} rounded-md bg-gradient-premium text-primary-foreground font-bold font-display tabular-nums shadow-elegant min-w-[36px] text-center`}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
        >
          <span className="block leading-none">{String(it.value).padStart(2, "0")}</span>
          <span className="block text-[9px] opacity-80 uppercase mt-0.5">{it.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
