import { memo } from "react";
import { motion } from "framer-motion";

const floatAnimation = (delay: number, duration: number) => ({
  y: [0, -15, 0],
  transition: { duration, delay, repeat: Infinity, ease: "easeInOut" as const },
});

const BackgroundDecorations = memo(() => (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
    <div className="absolute top-[10%] left-[8%] h-64 w-64 rounded-full bg-primary/[0.03] blur-[100px]" />
    <div className="absolute bottom-[20%] right-[10%] h-48 w-48 rounded-full bg-accent/[0.03] blur-[80px]" />
    <div className="absolute top-[50%] left-[50%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.02] blur-[120px]" />

    <motion.svg animate={floatAnimation(0, 6)} className="absolute top-[8%] left-[5%] w-20 h-20 text-primary opacity-[0.05] dark:opacity-[0.07] rotate-12" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="6" y="16" width="52" height="32" rx="4" />
      <path d="M22 16v32" strokeDasharray="4 3" />
      <circle cx="42" cy="32" r="5" />
    </motion.svg>

    <motion.svg animate={floatAnimation(1, 7)} className="absolute top-[15%] right-[10%] w-14 h-14 text-accent opacity-[0.05] dark:opacity-[0.07] -rotate-6" viewBox="0 0 64 64" fill="currentColor">
      <path d="M32 4l7.5 18.5H60l-15 12 5.5 19L32 42l-18.5 11.5 5.5-19-15-12h20.5z" />
    </motion.svg>

    <motion.svg animate={floatAnimation(2, 8)} className="absolute top-[40%] left-[3%] w-16 h-16 text-primary opacity-[0.04] dark:opacity-[0.06] rotate-[-15deg]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="10" y="26" width="44" height="30" rx="3" />
      <rect x="8" y="18" width="48" height="10" rx="3" />
      <line x1="32" y1="18" x2="32" y2="56" />
      <path d="M32 18c-4-8-14-8-14 0" />
      <path d="M32 18c4-8 14-8 14 0" />
    </motion.svg>

    <motion.svg animate={floatAnimation(0.5, 6.5)} className="absolute top-[55%] right-[6%] w-18 h-18 text-accent opacity-[0.05] dark:opacity-[0.07] rotate-6" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 10h24v20c0 8-5 14-12 14s-12-6-12-14z" />
      <path d="M20 16h-8c0 10 6 14 8 14" />
      <path d="M44 16h8c0 10-6 14-8 14" />
      <line x1="26" y1="44" x2="38" y2="44" />
      <rect x="24" y="48" width="16" height="4" rx="1" />
      <line x1="32" y1="44" x2="32" y2="48" />
    </motion.svg>

    <motion.svg animate={floatAnimation(3, 9)} className="absolute top-[75%] left-[12%] w-12 h-12 text-primary opacity-[0.04] dark:opacity-[0.06] rotate-[20deg]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="10" y="10" width="44" height="44" rx="8" />
      <circle cx="24" cy="24" r="3" fill="currentColor" />
      <circle cx="40" cy="24" r="3" fill="currentColor" />
      <circle cx="24" cy="40" r="3" fill="currentColor" />
      <circle cx="40" cy="40" r="3" fill="currentColor" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
    </motion.svg>

    <motion.svg animate={floatAnimation(1.5, 5)} className="absolute top-[25%] left-[50%] w-10 h-10 text-accent opacity-[0.04] dark:opacity-[0.06] rotate-45" viewBox="0 0 64 64" fill="currentColor">
      <path d="M32 0l4 28L64 32l-28 4L32 64l-4-28L0 32l28-4z" />
    </motion.svg>

    <motion.svg animate={floatAnimation(2.5, 7.5)} className="absolute top-[85%] right-[30%] w-14 h-14 text-accent opacity-[0.04] dark:opacity-[0.06] -rotate-12" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="32" cy="32" rx="20" ry="22" />
      <ellipse cx="32" cy="32" rx="14" ry="16" />
      <text x="32" y="38" textAnchor="middle" fontSize="16" fill="currentColor" fontWeight="bold">$</text>
    </motion.svg>

    <motion.svg animate={floatAnimation(4, 8)} className="absolute top-[65%] left-[60%] w-10 h-10 text-primary opacity-[0.03] dark:opacity-[0.05] rotate-[-30deg]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="16" width="52" height="32" rx="4" />
      <path d="M22 16v32" strokeDasharray="4 3" />
    </motion.svg>

    <motion.svg animate={floatAnimation(1, 9)} className="absolute top-[30%] right-[25%] w-12 h-12 text-primary opacity-[0.03] dark:opacity-[0.05] rotate-[10deg]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="20" width="22" height="24" rx="6" />
      <rect x="38" y="20" width="22" height="24" rx="6" />
      <line x1="26" y1="32" x2="38" y2="32" />
    </motion.svg>

    <motion.svg animate={floatAnimation(3.5, 7)} className="absolute top-[45%] right-[45%] w-10 h-10 text-accent opacity-[0.03] dark:opacity-[0.05] rotate-[-8deg]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 44l8-28 12 14 4-18 4 18 12-14 8 28z" />
      <rect x="8" y="44" width="48" height="8" rx="2" />
    </motion.svg>

    <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]" style={{
      backgroundImage: "radial-gradient(hsl(var(--primary)) 0.5px, transparent 0.5px)",
      backgroundSize: "32px 32px",
    }} />
  </div>
));

BackgroundDecorations.displayName = "BackgroundDecorations";
export default BackgroundDecorations;
