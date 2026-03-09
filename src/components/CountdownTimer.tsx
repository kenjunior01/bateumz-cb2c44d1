import { useState, useEffect } from "react";

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
    <div className="inline-flex gap-3">
      {units.map((u) => (
        <div key={u.label} className="flex flex-col items-center">
          <div className="glass flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold text-foreground font-display md:h-20 md:w-20 md:text-3xl">
            {String(u.value).padStart(2, "0")}
          </div>
          <span className="mt-1.5 text-xs text-muted-foreground uppercase tracking-wider">
            {u.label}
          </span>
        </div>
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
