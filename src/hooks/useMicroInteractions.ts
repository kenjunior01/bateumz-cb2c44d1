import { useCallback, useRef } from 'react';

export function useMicroInteractions() {
  const elementRef = useRef<HTMLElement>(null);

  const triggerPulse = useCallback(() => {
    if (!elementRef.current) return;
    const el = elementRef.current;
    el.classList.remove('micro-pulse');
    // Force reflow
    void el.offsetWidth;
    el.classList.add('micro-pulse');
    el.addEventListener('animationend', () => el.classList.remove('micro-pulse'), { once: true });
  }, []);

  const triggerShake = useCallback(() => {
    if (!elementRef.current) return;
    const el = elementRef.current;
    el.classList.remove('micro-shake');
    void el.offsetWidth;
    el.classList.add('micro-shake');
    el.addEventListener('animationend', () => el.classList.remove('micro-shake'), { once: true });
  }, []);

  const triggerGlowSuccess = useCallback(() => {
    if (!elementRef.current) return;
    const el = elementRef.current;
    el.classList.remove('micro-glow-success');
    void el.offsetWidth;
    el.classList.add('micro-glow-success');
    el.addEventListener('animationend', () => el.classList.remove('micro-glow-success'), { once: true });
  }, []);

  const triggerGlowError = useCallback(() => {
    if (!elementRef.current) return;
    const el = elementRef.current;
    el.classList.remove('micro-glow-error');
    void el.offsetWidth;
    el.classList.add('micro-glow-error');
    el.addEventListener('animationend', () => el.classList.remove('micro-glow-error'), { once: true });
  }, []);

  const triggerBounceIn = useCallback(() => {
    if (!elementRef.current) return;
    const el = elementRef.current;
    el.classList.remove('micro-bounce-in');
    void el.offsetWidth;
    el.classList.add('micro-bounce-in');
    el.addEventListener('animationend', () => el.classList.remove('micro-bounce-in'), { once: true });
  }, []);

  const triggerTickUp = useCallback(() => {
    if (!elementRef.current) return;
    const el = elementRef.current;
    el.classList.remove('micro-tick-up');
    void el.offsetWidth;
    el.classList.add('micro-tick-up');
    el.addEventListener('animationend', () => el.classList.remove('micro-tick-up'), { once: true });
  }, []);

  const triggerTickDown = useCallback(() => {
    if (!elementRef.current) return;
    const el = elementRef.current;
    el.classList.remove('micro-tick-down');
    void el.offsetWidth;
    el.classList.add('micro-tick-down');
    el.addEventListener('animationend', () => el.classList.remove('micro-tick-down'), { once: true });
  }, []);

  return { elementRef, triggerPulse, triggerShake, triggerGlowSuccess, triggerGlowError, triggerBounceIn, triggerTickUp, triggerTickDown };
}
