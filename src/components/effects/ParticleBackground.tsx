import { useEffect, useState } from 'react';

interface ParticleBackgroundProps {
  preset?: 'stars' | 'bubbles' | 'fire' | 'snow' | 'confetti';
  count?: number;
  color?: string;
  enabled?: boolean;
  className?: string;
}

export default function ParticleBackground({
  preset = 'stars',
  count = 50,
  color,
  enabled = true,
  className = '',
}: ParticleBackgroundProps) {
  const [particles] = useState(() =>
    Array.from({ length: Math.min(count, 60) }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
      opacity: Math.random() * 0.5 + 0.2,
    }))
  );

  if (!enabled) return null;

  const c =
    color ||
    (preset === 'stars'
      ? '#fbbf24'
      : preset === 'fire'
        ? '#ef4444'
        : preset === 'snow'
          ? '#e2e8f0'
          : preset === 'bubbles'
            ? '#3b82f6'
            : '#8b5cf6');

  return (
    <div className={`particles-overlay ${className}`}>
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full animate-float"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.left}%`,
              top: `${p.top}%`,
              backgroundColor: c,
              opacity: p.opacity,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              boxShadow: `0 0 ${p.size * 2}px ${c}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
