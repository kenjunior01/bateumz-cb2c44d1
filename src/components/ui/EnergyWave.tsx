// =============================================================
// ENERGY WAVE - Radial pulse wave from center (P2P duel arenas)
// Unique to BATEU - activates on duel start, VS reveal, countdown
// =============================================================

import { useEffect, useRef, useCallback } from 'react';

interface EnergyWaveProps {
  active: boolean;
  className?: string;
  color?: string;
  waveCount?: number;
  maxRadius?: number;
  duration?: number;
  onComplete?: () => void;
}

export default function EnergyWave({
  active,
  className = '',
  color = '#00d4ff',
  waveCount = 4,
  maxRadius = 200,
  duration = 2000,
  onComplete,
}: EnergyWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wavesRef = useRef<{ startTime: number; radius: number; alpha: number }[]>([]);
  const animRef = useRef<number>(0);
  const triggeredRef = useRef(false);
  const nextWaveRef = useRef(0);

  const spawnWave = useCallback((startTime: number) => {
    wavesRef.current.push({ startTime, radius: 0, alpha: 0.8 });
  }, []);

  useEffect(() => {
    if (!active) {
      triggeredRef.current = false;
      wavesRef.current = [];
      nextWaveRef.current = 0;
      return;
    }
    if (triggeredRef.current) return;
    triggeredRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    const startTime = performance.now();
    let wavesSpawned = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      // Spawn new waves at intervals
      const waveInterval = duration / (waveCount + 1);
      while (nextWaveRef.current < waveCount && elapsed > nextWaveRef.current * waveInterval) {
        spawnWave(now);
        nextWaveRef.current++;
        wavesSpawned++;
      }

      // Draw and update waves
      let aliveCount = 0;
      for (const wave of wavesRef.current) {
        const age = (now - wave.startTime) / duration;
        if (age > 1) continue;
        aliveCount++;

        const radius = age * maxRadius;
        const alpha = (1 - age) * 0.6;
        const lineW = Math.max(1, (1 - age) * 4);

        // Main wave ring
        ctx.strokeStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = lineW;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glow of wave
        const gradient = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.7, `${color}${Math.round(alpha * 40).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Clean up old waves
      wavesRef.current = wavesRef.current.filter(w => (now - w.startTime) / duration < 1);

      if (aliveCount > 0 || wavesSpawned < waveCount) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef);
    };
  }, [active, color, waveCount, maxRadius, duration, onComplete, spawnWave]);

  if (!active && !triggeredRef.current) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 30 }}
    />
  );
}
