import { memo } from "react";

/** Subtle floating SVG icons related to raffles/lottery scattered across the background */
const BackgroundDecorations = memo(() => (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.04] dark:opacity-[0.06]" aria-hidden>
    {/* Ticket */}
    <svg className="absolute top-[8%] left-[5%] w-24 h-24 text-primary rotate-12" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="6" y="16" width="52" height="32" rx="4" />
      <path d="M22 16v32" strokeDasharray="4 3" />
      <circle cx="42" cy="32" r="5" />
    </svg>

    {/* Star */}
    <svg className="absolute top-[15%] right-[10%] w-16 h-16 text-accent -rotate-6" viewBox="0 0 64 64" fill="currentColor">
      <path d="M32 4l7.5 18.5H60l-15 12 5.5 19L32 42l-18.5 11.5 5.5-19-15-12h20.5z" />
    </svg>

    {/* Gift box */}
    <svg className="absolute top-[40%] left-[3%] w-20 h-20 text-primary rotate-[-15deg]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="10" y="26" width="44" height="30" rx="3" />
      <rect x="8" y="18" width="48" height="10" rx="3" />
      <line x1="32" y1="18" x2="32" y2="56" />
      <path d="M32 18c-4-8-14-8-14 0" />
      <path d="M32 18c4-8 14-8 14 0" />
    </svg>

    {/* Trophy */}
    <svg className="absolute top-[55%] right-[6%] w-20 h-20 text-accent rotate-6" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 10h24v20c0 8-5 14-12 14s-12-6-12-14z" />
      <path d="M20 16h-8c0 10 6 14 8 14" />
      <path d="M44 16h8c0 10-6 14-8 14" />
      <line x1="26" y1="44" x2="38" y2="44" />
      <rect x="24" y="48" width="16" height="4" rx="1" />
      <line x1="32" y1="44" x2="32" y2="48" />
    </svg>

    {/* Dice */}
    <svg className="absolute top-[75%] left-[12%] w-14 h-14 text-primary rotate-[20deg]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="10" y="10" width="44" height="44" rx="8" />
      <circle cx="24" cy="24" r="3" fill="currentColor" />
      <circle cx="40" cy="24" r="3" fill="currentColor" />
      <circle cx="24" cy="40" r="3" fill="currentColor" />
      <circle cx="40" cy="40" r="3" fill="currentColor" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
    </svg>

    {/* Confetti / sparkle */}
    <svg className="absolute top-[25%] left-[50%] w-12 h-12 text-accent rotate-45" viewBox="0 0 64 64" fill="currentColor">
      <path d="M32 0l4 28L64 32l-28 4L32 64l-4-28L0 32l28-4z" />
    </svg>

    {/* Coin */}
    <svg className="absolute top-[85%] right-[30%] w-16 h-16 text-accent -rotate-12" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="32" cy="32" rx="20" ry="22" />
      <ellipse cx="32" cy="32" rx="14" ry="16" />
      <text x="32" y="38" textAnchor="middle" fontSize="16" fill="currentColor" fontWeight="bold">$</text>
    </svg>

    {/* Small ticket right side */}
    <svg className="absolute top-[65%] left-[60%] w-10 h-10 text-primary rotate-[-30deg]" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="16" width="52" height="32" rx="4" />
      <path d="M22 16v32" strokeDasharray="4 3" />
    </svg>
  </div>
));

BackgroundDecorations.displayName = "BackgroundDecorations";
export default BackgroundDecorations;
