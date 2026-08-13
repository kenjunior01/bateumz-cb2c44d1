// =============================================================
// useCountUp - Animacao suave de numeros contando
// =============================================================

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCountUpOptions {
  end: number;
  duration?: number;
  start?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
  enabled?: boolean;
  onComplete?: () => void;
}

export function useCountUp({
  end,
  duration = 1200,
  start = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = ',',
  enabled = true,
  onComplete,
}: UseCountUpOptions) {
  const [value, setValue] = useState(start);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const formatNumber = useCallback((n: number): string => {
    const fixed = n.toFixed(decimals);
    if (!separator) return `${prefix}${fixed}${suffix}`;
    const [intPart, decPart] = fixed.split('.');
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return `${prefix}${formatted}${decPart !== undefined ? '.' + decPart : ''}${suffix}`;
  }, [decimals, prefix, suffix, separator]);

  useEffect(() => {
    if (!enabled) return;

    startTimeRef.current = 0;
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setValue(end);
        onComplete?.();
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [end, duration, start, enabled, onComplete]);

  return { value, formatted: formatNumber(value) };
}

export default useCountUp;
