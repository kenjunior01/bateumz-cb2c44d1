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

  const totalSecondsLeft = Math.max(0, Math.floor((targetDate.getTime() - Date.now()) / 1000));
  const isUrgent = totalSecondsLeft > 0 && totalSecondsLeft <= 3600; // last hour
  const isCritical = totalSecondsLeft > 0 && totalSecondsLeft <= 300; // last 5 min
  const isEnded = totalSecondsLeft <= 0;

  const units = [
    { label: "Days", value: time.days },
    { label: "Hours", value: time.hours },
    { label: "Min", value: time.minutes },
    { label: "Sec", value: time.seconds },
  ];

  if (isEnded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3"
      >
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-2xl"
        >
          🏁
        </motion.span>
        <span className="font-display text-lg font-bold text-destructive">Raffle Closed!</span>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Urgency banner */}
      {isCritical && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-2"
        >
          <motion.div
            animate={{
              backgroundColor: [
                "hsl(0, 90%, 60% / 0.1)",
                "hsl(0, 90%, 60% / 0.2)",
                "hsl(0, 90%, 60% / 0.1)",
              ],
            }}
            transition={{ duration: 1, repeat: Infinity }}
            className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 border border-destructive/30"
          >
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-lg"
            >
              🔥
            </motion.span>
            <span className="text-sm font-bold text-destructive">
              FINAL MINUTES! Hurry!
            </span>
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
              className="text-lg"
            >
              🔥
            </motion.span>
          </motion.div>
        </motion.div>
      )}

      {isUrgent && !isCritical && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 text-accent text-sm font-semibold mb-2"
        >
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ⏰ Last hour! Don't miss this opportunity!
          </motion.span>
        </motion.div>
      )}

      <div className="inline-flex gap-2 md:gap-3">
        {units.map((u, i) => (
          <motion.div
            key={u.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center"
          >
            <motion.div
              animate={isCritical ? {
                scale: [1, 1.05, 1],
                boxShadow: [
                  "0 0 0px hsl(0, 90%, 60% / 0)",
                  "0 0 20px hsl(0, 90%, 60% / 0.3)",
                  "0 0 0px hsl(0, 90%, 60% / 0)",
                ],
              } : isUrgent ? {
                boxShadow: [
                  "0 0 0px hsl(var(--accent) / 0)",
                  "0 0 15px hsl(var(--accent) / 0.2)",
                  "0 0 0px hsl(var(--accent) / 0)",
                ],
              } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              className={`relative flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-xl border shadow-sm ${
                isCritical
                  ? "bg-destructive/5 border-destructive/30"
                  : isUrgent
                  ? "bg-accent/5 border-accent/30"
                  : "bg-card border-border"
              }`}
            >
              <motion.span
                key={u.value}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`font-display text-lg md:text-2xl font-bold tabular-nums ${
                  isCritical ? "text-destructive" : isUrgent ? "text-accent" : "text-foreground"
                }`}
              >
                {String(u.value).padStart(2, "0")}
              </motion.span>
              <div className="absolute inset-x-0 top-1/2 h-px bg-border/30" />
            </motion.div>
            <span className={`mt-1 text-[9px] md:text-[10px] uppercase tracking-widest font-medium ${
              isCritical ? "text-destructive/70" : "text-muted-foreground"
            }`}>
              {u.label}
            </span>
          </motion.div>
        ))}
      </div>
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
