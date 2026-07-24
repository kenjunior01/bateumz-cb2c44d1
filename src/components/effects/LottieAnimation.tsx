import { ReactNode } from 'react';

interface LottieAnimationProps {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  className?: string;
  width?: number | string;
  height?: number | string;
}

export default function LottieAnimation({
  src,
  loop = true,
  autoplay = true,
  speed = 1,
  className = '',
  width = 200,
  height = 200,
}: LottieAnimationProps) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width, height }}
    >
      <div className="text-xs text-muted-foreground">Animation</div>
    </div>
  );
}

export function SpinningLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ width: 40, height: 40 }}>
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      <div
        className="absolute inset-1 rounded-full border-2 border-transparent border-b-accent animate-spin"
        style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
      />
    </div>
  );
}

export function BouncingDots({ className = '' }: { className?: string }) {
  return (
    <div className={`flex gap-1.5 items-center ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-2 w-2 rounded-full bg-primary animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export function SuccessCheck({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 52 52" width="52" height="52">
      <circle cx="26" cy="26" r="25" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.2" />
      <circle
        cx="26" cy="26" r="25" fill="none" stroke="#10b981" strokeWidth="2"
        strokeDasharray="157" strokeDashoffset="157"
        style={{ animation: 'dash 0.6s ease-in-out forwards' }}
      />
      <path
        fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        d="M14.1 27.2l7.1 7.2 16.7-16.8"
        strokeDasharray="40" strokeDashoffset="40"
        style={{ animation: 'dash 0.4s 0.4s ease-in-out forwards' }}
      />
      <style>{`@keyframes dash { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  );
}

export function StarBurst({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ width: 60, height: 60 }}>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 h-1 bg-yellow-400 rounded-full"
          style={{
            width: 20,
            transformOrigin: '0 0',
            transform: `rotate(${i * 45}deg)`,
            animation: `star-burst 0.6s ${i * 0.05}s ease-out both`,
          }}
        />
      ))}
      <style>{`@keyframes star-burst { 0% { width: 0; opacity: 1; } 100% { width: 24px; opacity: 0; } }`}</style>
    </div>
  );
}

export function PrebuiltAnimations() {
  return null;
}
