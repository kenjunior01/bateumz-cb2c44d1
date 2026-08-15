"use client";

import { useRef, useCallback, useEffect, type ReactNode } from 'react';

interface HolographicCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: 'low' | 'medium' | 'high';
  disabled?: boolean;
}

export default function HolographicCard({
  children,
  className = '',
  glowColor = '#2ea043',
  intensity = 'medium',
  disabled = false,
}: HolographicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const intensityMap = { low: 8, medium: 15, high: 25 };
  const maxTilt = intensityMap[intensity];

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (disabled || !cardRef.current) return;
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -maxTilt;
    const rotateY = ((x - centerX) / centerX) * maxTilt;

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    card.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.08) 0%, transparent 60%)`;
  }, [disabled, maxTilt]);

  const handleMouseLeave = useCallback(() => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)';
    cardRef.current.style.background = '';
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || disabled) return;

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) handleMove(t.clientX, t.clientY);
    };

    card.addEventListener('mousemove', onMouseMove);
    card.addEventListener('touchmove', onTouchMove, { passive: true });
    card.addEventListener('mouseleave', handleMouseLeave);
    card.addEventListener('touchend', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', onMouseMove);
      card.removeEventListener('touchmove', onTouchMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
      card.removeEventListener('touchend', handleMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, [disabled, handleMove, handleMouseLeave]);

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-xl transition-shadow duration-300 ${className}`}
      style={{
        willChange: 'transform',
        transition: 'transform 0.15s ease-out',
      }}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${glowColor}22 0%, transparent 40%, ${glowColor}11 60%, transparent 100%)`,
          mixBlendMode: 'color-dodge',
        }}
      />
    </div>
  );
}
