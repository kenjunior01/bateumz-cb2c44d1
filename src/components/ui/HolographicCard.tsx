import {
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface HolographicCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  intensity?: "low" | "medium" | "high";
  disabled?: boolean;
}

const INTENSITY_MAP = {
  low: { tiltMax: 8, glareOpacity: 0.15, shimmerOpacity: 0.08, glowSize: 1 },
  medium: { tiltMax: 15, glareOpacity: 0.25, shimmerOpacity: 0.15, glowSize: 1.5 },
  high: { tiltMax: 15, glareOpacity: 0.4, shimmerOpacity: 0.25, glowSize: 2 },
} as const;

/** Parse hex color to RGB components */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

export default function HolographicCard({
  children,
  className = "",
  glowColor = "#2ea043",
  intensity = "medium",
  disabled = false,
}: HolographicCardProps) {
  const config = INTENSITY_MAP[intensity];
  const rgb = hexToRgb(glowColor);

  const cardRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const borderRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isHoveredRef = useRef(false);
  const isTouchTapRef = useRef(false);
  const isTouchDeviceRef = useRef(false);
  const mousePosRef = useRef({ x: 0.5, y: 0.5 });
  const currentTiltRef = useRef({ x: 0, y: 0 });
  const targetTiltRef = useRef({ x: 0, y: 0 });
  const floatPhaseRef = useRef(0);
  const shimmerAngleRef = useRef(0);

  // Detect touch device on first touch
  useEffect(() => {
    const onTouchStart = () => {
      isTouchDeviceRef.current = true;
    };
    window.addEventListener("touchstart", onTouchStart, { once: true });
    return () => window.removeEventListener("touchstart", onTouchStart);
  }, []);

  // Main animation loop — all mutations via refs, zero re-renders
  const animate = useCallback(() => {
    if (!cardRef.current) return;
    const card = cardRef.current;

    const isHovering = isHoveredRef.current;
    const isTouch = isTouchDeviceRef.current;
    const isTap = isTouchTapRef.current;

    // ── HOVERED + DESKTOP: full 3D tilt + all effects ──
    if (isHovering && !isTouch) {
      // Smooth lerp toward target tilt for buttery 60fps
      const lerpFactor = 0.12;
      currentTiltRef.current.x +=
        (targetTiltRef.current.x - currentTiltRef.current.x) * lerpFactor;
      currentTiltRef.current.y +=
        (targetTiltRef.current.y - currentTiltRef.current.y) * lerpFactor;

      const tx = currentTiltRef.current.x;
      const ty = currentTiltRef.current.y;

      // 3D tilt with subtle scale
      card.style.transform = `perspective(1000px) rotateX(${tx}deg) rotateY(${ty}deg) scale3d(1.02, 1.02, 1.02)`;

      // ── Specular glare ──
      if (glareRef.current) {
        const mx = mousePosRef.current.x;
        const my = mousePosRef.current.y;
        const angleMag = Math.sqrt(tx * tx + ty * ty);
        const boost = 1 + angleMag / config.tiltMax;
        const alpha = Math.min(config.glareOpacity * boost, 0.6);
        const size = 30 + angleMag * 1.5;
        glareRef.current.style.background = `radial-gradient(
          ellipse ${size}% ${size * 0.75}% at ${mx * 100}% ${my * 100}%,
          rgba(255,255,255,${alpha}) 0%,
          rgba(255,255,255,${alpha * 0.3}) 30%,
          transparent 70%
        )`;
        glareRef.current.style.opacity = "1";
      }

      // ── Rainbow holographic shimmer ──
      if (shimmerRef.current) {
        shimmerAngleRef.current += 0.8;
        const angle = shimmerAngleRef.current;
        const mx = mousePosRef.current.x;
        const my = mousePosRef.current.y;
        const grad = angle + (mx - 0.5) * 60 + (my - 0.5) * 40;
        const s = config.shimmerOpacity;
        shimmerRef.current.style.background = `linear-gradient(
          ${grad}deg,
          transparent 0%,
          rgba(0,255,255,${s}) 10%,
          rgba(255,0,255,${s * 1.2}) 20%,
          rgba(255,215,0,${s}) 30%,
          rgba(52,211,153,${s * 1.1}) 40%,
          transparent 50%,
          rgba(129,140,248,${s * 0.9}) 60%,
          rgba(244,114,182,${s}) 70%,
          transparent 80%
        )`;
        shimmerRef.current.style.backgroundPosition = `${mx * 100}% ${my * 100}%`;
        shimmerRef.current.style.backgroundSize = "200% 200%";
        shimmerRef.current.style.opacity = "1";
      }

      // ── Edge glow ──
      updateEdgeGlow(tx, ty);
    }
    // ── TOUCH TAP: shimmer only, no tilt ──
    else if (isTap && isTouch) {
      if (shimmerRef.current) {
        shimmerAngleRef.current += 1.5;
        const angle = shimmerAngleRef.current;
        const s = config.shimmerOpacity * 1.5;
        shimmerRef.current.style.background = `linear-gradient(
          ${angle}deg,
          transparent 0%,
          rgba(0,255,255,${s}) 15%,
          rgba(255,0,255,${s * 1.3}) 30%,
          rgba(255,215,0,${s}) 45%,
          rgba(52,211,153,${s * 1.2}) 60%,
          transparent 80%
        )`;
        shimmerRef.current.style.backgroundSize = "200% 200%";
        shimmerRef.current.style.opacity = "1";
      }
    }
    // ── IDLE: lerp back + floating animation ──
    else {
      currentTiltRef.current.x *= 0.9;
      currentTiltRef.current.y *= 0.9;

      floatPhaseRef.current += 0.03;
      const floatY = Math.sin(floatPhaseRef.current) * 2.5;
      const tx = currentTiltRef.current.x;
      const ty = currentTiltRef.current.y;

      card.style.transform =
        Math.abs(tx) > 0.01 || Math.abs(ty) > 0.01
          ? `perspective(1000px) rotateX(${tx}deg) rotateY(${ty}deg) translateY(${floatY}px)`
          : `translateY(${floatY}px)`;

      // Fade out all overlays
      if (glareRef.current) glareRef.current.style.opacity = "0";
      if (shimmerRef.current) shimmerRef.current.style.opacity = "0";
      if (glowRef.current) glowRef.current.style.opacity = "0";
      if (borderRef.current) {
        borderRef.current.style.borderColor = "transparent";
        borderRef.current.style.borderWidth = "1.5px";
      }
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [config, rgb.r, rgb.g, rgb.b]);

  // Update prismatic edge glow using tilt angle + glowColor prop
  const updateEdgeGlow = useCallback(
    (tx: number, ty: number) => {
      // Map tilt direction to hue for prismatic rainbow shift
      const hue = ((ty + 15) / 30) * 360;
      const sat = 80 + Math.abs(ty) * 2;
      const edgeIntensity =
        (Math.abs(tx) + Math.abs(ty)) / (config.tiltMax * 2);
      const glowSpread = edgeIntensity * 8 * config.glowSize;

      // Prismatic outer glow
      if (glowRef.current) {
        glowRef.current.style.background = `conic-gradient(
          from ${180 + ty * 4}deg,
          hsl(${hue}, ${sat}%, 60%, ${edgeIntensity * 0.7}),
          hsl(${(hue + 90) % 360}, ${sat}%, 50%, ${edgeIntensity * 0.5}),
          hsl(${(hue + 180) % 360}, ${sat}%, 60%, ${edgeIntensity * 0.7}),
          hsl(${(hue + 270) % 360}, ${sat}%, 50%, ${edgeIntensity * 0.5}),
          hsl(${hue}, ${sat}%, 60%, ${edgeIntensity * 0.7})
        )`;
        glowRef.current.style.filter = `blur(${glowSpread}px)`;
        glowRef.current.style.opacity = String(
          Math.min(edgeIntensity * 1.5, 0.9)
        );
      }

      // Inner border glow — blends glowColor with the prismatic hue
      if (borderRef.current) {
        const mixAlpha = edgeIntensity * 0.8;
        borderRef.current.style.borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${mixAlpha})`;
        borderRef.current.style.boxShadow = `inset 0 0 ${8 * config.glowSize}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${edgeIntensity * 0.3}), 0 0 ${4 * config.glowSize}px hsla(${hue}, 80%, 60%, ${edgeIntensity * 0.5})`;
        borderRef.current.style.borderWidth = "1.5px";
      }
    },
    [config, rgb.r, rgb.g, rgb.b]
  );

  // Start / stop animation loop
  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  // ── Event handlers — lightweight, just update refs ──
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mousePosRef.current = { x, y };
      targetTiltRef.current = {
        x: (y - 0.5) * -config.tiltMax,
        y: (x - 0.5) * config.tiltMax,
      };
    },
    [config, disabled]
  );

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    isHoveredRef.current = true;
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    isHoveredRef.current = false;
    targetTiltRef.current = { x: 0, y: 0 };
  }, []);

  // Touch: shimmer on tap, no tilt
  const handleTouchStart = useCallback(() => {
    if (disabled) return;
    isTouchDeviceRef.current = true;
    isTouchTapRef.current = true;
    shimmerAngleRef.current = 0;
  }, [disabled]);

  const handleTouchEnd = useCallback(() => {
    isTouchTapRef.current = false;
  }, []);

  return (
    <div
      className={`relative [perspective:1000px] ${className}`}
      style={{ willChange: "transform" }}
    >
      {/* Prismatic outer glow */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute -inset-[6px] rounded-2xl opacity-0"
        aria-hidden="true"
      />

      {/* Card body */}
      <div
        ref={cardRef}
        className={"relative overflow-hidden rounded-xl " + (disabled ? "" : "cursor-pointer")}
        style={{
          transformStyle: "preserve-3d",
          willChange: "transform",
          transition: "box-shadow 0.3s ease",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Prismatic border */}
        <div
          ref={borderRef}
          className="pointer-events-none absolute inset-0 rounded-xl border-2 border-transparent"
          style={{ zIndex: 10, transition: "border-color 0.3s ease, box-shadow 0.3s ease" }}
          aria-hidden="true"
        />

        {/* Rainbow holographic shimmer */}
        <div
          ref={shimmerRef}
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0"
          style={{
            mixBlendMode: "color-dodge",
            zIndex: 5,
            transition: "opacity 0.5s ease",
          }}
          aria-hidden="true"
        />

        {/* Specular glare highlight */}
        <div
          ref={glareRef}
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0"
          style={{
            mixBlendMode: "overlay",
            zIndex: 6,
            transition: "opacity 0.3s ease",
          }}
          aria-hidden="true"
        />

        {/* Content layer */}
        <div className="relative z-[1]" style={{ transform: "translateZ(0)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
