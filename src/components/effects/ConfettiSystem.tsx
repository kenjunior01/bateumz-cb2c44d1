import { useCallback, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

const presets: Record<string, any> = {
  celebration: {
    particleCount: 150,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#fbbf24', '#3b82f6', '#8b5cf6', '#ef4444', '#10b981'],
  },
  winner: {
    particleCount: 200,
    spread: 120,
    origin: { y: 0.5 },
    colors: ['#fbbf24', '#f59e0b', '#d97706'],
    startVelocity: 35,
  },
  achievement: {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.65 },
    colors: ['#10b981', '#34d399', '#6ee7b7'],
    shapes: ['circle'],
    startVelocity: 25,
  },
  love: {
    particleCount: 100,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#ec4899', '#f472b6', '#f9a8d4'],
    shapes: ['circle'],
    startVelocity: 20,
  },
};

export function useConfetti() {
  const intervalRef = useRef<number | null>(null);

  const fire = useCallback((options?: any) => {
    confetti(options);
  }, []);

  const firePreset = useCallback(
    (preset: string) => {
      const config = presets[preset] || presets.celebration;
      confetti(config);
    },
    []
  );

  const fireContinuous = useCallback(() => {
    if (intervalRef.current) return;
    const colors = ['#fbbf24', '#3b82f6', '#8b5cf6'];
    intervalRef.current = window.setInterval(() => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
    }, 100);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    confetti.reset();
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { fire, firePreset, fireContinuous, stop };
}

interface ConfettiSystemProps {
  trigger?: boolean;
  preset?: string;
  autoStopMs?: number;
}

export default function ConfettiSystem({
  trigger = false,
  preset = 'celebration',
  autoStopMs = 5000,
}: ConfettiSystemProps) {
  const { firePreset, stop } = useConfetti();

  useEffect(() => {
    if (trigger) {
      firePreset(preset);
      const timer = setTimeout(stop, autoStopMs);
      return () => clearTimeout(timer);
    }
  }, [trigger, preset, autoStopMs, firePreset, stop]);

  return null;
}
