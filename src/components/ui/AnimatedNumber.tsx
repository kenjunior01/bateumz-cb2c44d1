// =============================================================
// ANIMATED NUMBER - Smooth counting animation with formatting
// =============================================================

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatOptions?: Intl.NumberFormatOptions;
  locale?: string;
  triggerOnce?: boolean;
  // Color change on positive/negative delta
  colorPositive?: string;
  colorNegative?: string;
  previousValue?: number;
}

export default function AnimatedNumber({
  value,
  duration = 0.8,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  formatOptions,
  locale = 'pt-BR',
  triggerOnce = false,
  colorPositive,
  colorNegative,
  previousValue,
}: AnimatedNumberProps) {
  const spring = useSpring(0, { duration: duration * 1000, bounce: 0 });
  const display = useTransform(spring, (latest) =>
    formatNumber(latest, decimals, locale, formatOptions)
  );
  const [displayValue, setDisplayValue] = useState(formatNumber(value, decimals, locale, formatOptions));
  const hasAnimated = useRef(false);
  const [flashColor, setFlashColor] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (triggerOnce && hasAnimated.current) return;
    hasAnimated.current = true;
    spring.set(value);

    // Flash color on change
    if (previousValue !== undefined && previousValue !== value) {
      if (value > previousValue && colorPositive) {
        setFlashColor(colorPositive);
      } else if (value < previousValue && colorNegative) {
        setFlashColor(colorNegative);
      }
      const timer = setTimeout(() => setFlashColor(undefined), 600);
      return () => clearTimeout(timer);
    }
  }, [value, spring, triggerOnce, previousValue, colorPositive, colorNegative]);

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => setDisplayValue(v));
    return unsubscribe;
  }, [display]);

  return (
    <motion.span
      className={`tabular-nums ${className}`}
      style={{ color: flashColor }}
      animate={flashColor ? { scale: [1, 1.15, 1] } : {}}
      transition={{ duration: 0.3 }}
    >
      {prefix}{displayValue}{suffix}
    </motion.span>
  );
}

function formatNumber(
  num: number,
  decimals: number,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    ...options,
  }).format(num);
}
