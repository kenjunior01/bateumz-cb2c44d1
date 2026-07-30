import { memo } from "react";
import { motion } from "framer-motion";

const floatAnimation = (delay: number, duration: number) => ({
  y: [0, -15, 0],
  transition: { duration, delay, repeat: Infinity, ease: "easeInOut" as const },
});

const floatRotate = (delay: number, duration: number) => ({
  y: [0, -12, 0],
  rotate: [0, 5, -5, 0],
  transition: { duration, delay, repeat: Infinity, ease: "easeInOut" as const },
});

const BackgroundDecorations = memo(() => (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
    {/* Gradient blobs - more visible and vibrant */}
    <div className="absolute top-[8%] left-[5%] h-80 w-80 rounded-full blur-[120px] morph-blob" style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 0.06, transparent)" }} />
    <div className="absolute bottom-[15%] right-[8%] h-64 w-64 rounded-full blur-[100px] morph-blob" style={{ background: "color-mix(in srgb, var(--region-secondary, hsl(var(--accent))) 0.05, transparent)", animationDelay: "-5s" }} />
    <div className="absolute top-[45%] left-[55%] h-72 w-72 rounded-full blur-[130px] morph-blob" style={{ background: "color-mix(in srgb, var(--region-primary, hsl(var(--primary))) 0.04, transparent)", animationDelay: "-10s" }} />

    {/* Floating game-related SVG shapes - larger and more visible */}
    <motion.svg animate={floatRotate(0, 7)} className="absolute top-[6%] left-[4%] w-24 h-24 text-primary opacity-[0.06] dark:opacity-[0.08]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="6" y="16" width="52" height="32" rx="4" />
      <path d="M22 16v32" strokeDasharray="4 3" />
      <circle cx="42" cy="32" r="5" />
    </motion.svg>

    <motion.svg animate={floatRotate(1, 8)} className="absolute top-[12%] right-[8%] w-20 h-20 text-accent opacity-[0.06] dark:opacity-[0.08]" viewBox="0 0 64 64" fill="currentColor">
      <path d="M32 4l7.5 18.5H60l-15 12 5.5 19L32 42l-18.5 11.5 5.5-19-15-12h20.5z" />
    </motion.svg>

    <motion.svg animate={floatRotate(2, 9)} className="absolute top-[35%] left-[2%] w-20 h-20 text-primary opacity-[0.05] dark:opacity-[0.07]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="10" y="26" width="44" height="30" rx="3" />
      <rect x="8" y="18" width="48" height="10" rx="3" />
      <line x1="32" y1="18" x2="32" y2="56" />
      <path d="M32 18c-4-8-14-8-14 0" />
      <path d="M32 18c4-8 14-8 14 0" />
    </motion.svg>

    <motion.svg animate={floatRotate(0.5, 7.5)} className="absolute top-[50%] right-[5%] w-22 h-22 text-accent opacity-[0.05] dark:opacity-[0.07]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 10h24v20c0 8-5 14-12 14s-12-6-12-14z" />
      <path d="M20 16h-8c0 10 6 14 8 14" />
      <path d="M44 16h8c0 10-6 14-8 14" />
      <line x1="26" y1="44" x2="38" y2="44" />
      <rect x="24" y="48" width="16" height="4" rx="1" />
    </motion.svg>

    <motion.svg animate={floatRotate(3, 10)} className="absolute top-[72%] left-[10%] w-16 h-16 text-primary opacity-[0.05] dark:opacity-[0.06]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="10" y="10" width="44" height="44" rx="8" />
      <circle cx="24" cy="24" r="3" fill="currentColor" />
      <circle cx="40" cy="24" r="3" fill="currentColor" />
      <circle cx="24" cy="40" r="3" fill="currentColor" />
      <circle cx="40" cy="40" r="3" fill="currentColor" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
    </motion.svg>

    <motion.svg animate={floatRotate(1.5, 6)} className="absolute top-[20%] left-[48%] w-14 h-14 text-accent opacity-[0.05] dark:opacity-[0.06]" viewBox="0 0 64 64" fill="currentColor">
      <path d="M32 0l4 28L64 32l-28 4L32 64l-4-28L0 32l28-4z" />
    </motion.svg>

    <motion.svg animate={floatRotate(2.5, 8.5)} className="absolute top-[82%] right-[28%] w-18 h-18 text-accent opacity-[0.04] dark:opacity-[0.06]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="32" cy="32" rx="20" ry="22" />
      <ellipse cx="32" cy="32" rx="14" ry="16" />
      <text x="32" y="38" textAnchor="middle" fontSize="16" fill="currentColor" fontWeight="bold">$</text>
    </motion.svg>

    <motion.svg animate={floatRotate(4, 9)} className="absolute top-[62%] left-[58%] w-14 h-14 text-primary opacity-[0.04] dark:opacity-[0.05]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="16" width="52" height="32" rx="4" />
      <path d="M22 16v32" strokeDasharray="4 3" />
    </motion.svg>

    <motion.svg animate={floatRotate(1, 10)} className="absolute top-[28%] right-[22%] w-16 h-16 text-primary opacity-[0.04] dark:opacity-[0.05]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="20" width="22" height="24" rx="6" />
      <rect x="38" y="20" width="22" height="24" rx="6" />
      <line x1="26" y1="32" x2="38" y2="32" />
    </motion.svg>

    <motion.svg animate={floatRotate(3.5, 8)} className="absolute top-[42%] right-[42%] w-14 h-14 text-accent opacity-[0.04] dark:opacity-[0.05]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 44l8-28 12 14 4-18 4 18 12-14 8 28z" />
      <rect x="8" y="44" width="48" height="8" rx="2" />
    </motion.svg>

    {/* Diamond shape */}
    <motion.svg animate={floatRotate(2, 7)} className="absolute top-[88%] left-[35%] w-12 h-12 text-accent opacity-[0.04] dark:opacity-[0.05]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M32 4l24 28-24 28-24-28z" />
      <path d="M16 32h32" strokeDasharray="3 3" />
    </motion.svg>

    {/* Dot grid pattern - more visible */}
    <div className="absolute inset-0 opacity-[0.025] dark:opacity-[0.035]" style={{
      backgroundImage: "radial-gradient(hsl(var(--primary)) 0.5px, transparent 0.5px)",
      backgroundSize: "32px 32px",
    }} />
  </div>
));

BackgroundDecorations.displayName = "BackgroundDecorations";
export default BackgroundDecorations;
