// =============================================================
// BUTTON RIPPLE - Material-design ripple effect on any clickable
// Fixed: uses useState for proper re-render on ripple creation
// =============================================================

import { ReactNode, useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RippleData {
  id: number;
  x: number;
  y: number;
  size: number;
}

interface ButtonRippleProps {
  children: ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  rippleColor?: string;
  disabled?: boolean;
  as?: 'button' | 'div' | 'a';
  type?: 'button' | 'submit' | 'reset';
  soundEffect?: (() => void) | null; // optional sound on click
}

let rippleId = 0;

export default function ButtonRipple({
  children,
  className = '',
  onClick,
  rippleColor = 'rgba(255,255,255,0.3)',
  disabled = false,
  as: Tag = 'button',
  type = 'button',
  soundEffect,
}: ButtonRippleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<RippleData[]>([]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      onClick?.(e);
      soundEffect?.();

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2.5;

      const id = ++rippleId;
      setRipples((prev) => [...prev, { id, x, y, size }]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);
    },
    [onClick, disabled, soundEffect]
  );

  return (
    <Tag
      ref={containerRef as any}
      className={`relative overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onClick={handleClick}
      type={Tag === 'button' ? type : undefined}
    >
      {children}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x - ripple.size / 2,
              top: ripple.y - ripple.size / 2,
              width: ripple.size,
              height: ripple.size,
              background: rippleColor,
            }}
            initial={{ opacity: 0.5, scale: 0 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </Tag>
  );
}
