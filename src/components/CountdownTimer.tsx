import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Props {
  targetDate: Date;
}

const CountdownTimer = ({ targetDate }: Props) => {
  const [time, setTime] = useState(getTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => setTime(getTimeLeft(targetDate)), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const units = [
    { label: "Dias", value: time.days },
    { label: "Horas", value: time.hours },
    { label: "Min", value: time.minutes },
    { label: "Seg", value: time.seconds },
  ];

  return (
    <div className="inline-flex gap-2 md:gap-3">
      {units.map((u, i) => (
        <motion.div
          key={u.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex flex-col items-center"
        >
          <div className="relative flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-xl bg-card border border-border shadow-sm">
            <span className="font-display text-lg md:text-2xl font-bold text-foreground tabular-nums">
              {String(u.value).padStart(2, "0")}
            </span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-border/30" />
          </div>
          <span className="mt-1 text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
            {u.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
};

function getTimeLeft(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export default CountdownTimer;
