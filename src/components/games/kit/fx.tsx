// ═══════════════════════════════════════════════════════════════
//  BATEU PRO KIT — Motor de FX (juice visual) sem canvas:
//  textos flutuantes, explosões de partículas (emoji/cores),
//  tremor de ecrã e contador de COMBO — via Web Animations API
//  (só transform/opacity = barato na GPU do telemóvel).
// ═══════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback, createContext, useContext, type ReactNode } from "react";

interface FxLayer {
  burst: (x: number, y: number, opts?: BurstOpts) => void;
  floatText: (x: number, y: number, text: string, opts?: FloatOpts) => void;
  shake: (intensity?: number, ms?: number) => void;
  combo: () => void;           // soma 1 ao combo (expira após 2s)
  resetCombo: () => void;
  comboCount: number;
}

export interface BurstOpts {
  emojis?: string[];          // ex.: ["✨", "💥"]
  colors?: string[];          // partículas redondas coloridas
  count?: number;
  power?: number;             // 1 = normal, 2 = forte
}

export interface FloatOpts {
  color?: string;
  size?: number;
  bold?: boolean;
}

const FxCtx = createContext<FxLayer | null>(null);

export function useFx(): FxLayer {
  return useContext(FxCtx) ?? nullFx;
}

const nullFx: FxLayer = {
  burst: () => {}, floatText: () => {}, shake: () => {},
  combo: () => {}, resetCombo: () => {}, comboCount: 0,
};

const MAX_PARTICLES = 26; // teto de segurança p/ telemóvel

export function FxProvider({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const shakeRef = useRef<HTMLElement | null>(null);
  const comboTimer = useRef<number | null>(null);
  const [comboCount, setComboCount] = useState(0);
  const comboVal = useRef(0);

  // alvo do tremor: o elemento .pro-game-root mais próximo (ou o body)
  useEffect(() => {
    shakeRef.current = document.querySelector<HTMLElement>(".pro-game-root") || document.body;
  }, []);

  const spawn = useCallback((el: HTMLElement) => {
    const host = hostRef.current;
    if (!host) return;
    if (host.childElementCount > 90) host.removeChild(host.firstChild as ChildNode); // teto DOM
    host.appendChild(el);
  }, []);

  const burst = useCallback((x: number, y: number, opts?: BurstOpts) => {
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const px = x - rect.left, py = y - rect.top;
    const power = opts?.power ?? 1;
    const count = Math.min(MAX_PARTICLES, opts?.count ?? 10);
    const emojis = opts?.emojis;
    const colors = opts?.colors ?? ["#fbbf24", "#f97316", "#ef4444", "#a78bfa", "#22d3ee"];
    for (let i = 0; i < count; i++) {
      const p = document.createElement(emojis ? "span" : "i");
      const isEmoji = emojis && i % 2 === 0;
      const size = isEmoji ? 14 + Math.random() * 10 : 5 + Math.random() * 5;
      p.textContent = isEmoji ? emojis[i % emojis.length]! : "";
      p.style.cssText = `position:absolute;left:${px}px;top:${py}px;width:${size}px;height:${size}px;` +
        `pointer-events:none;z-index:60;border-radius:9999px;will-change:transform,opacity;` +
        (isEmoji ? "font-size:" + size + "px;line-height:1;" : `background:${colors[i % colors.length]};box-shadow:0 0 6px ${colors[i % colors.length]}88;`);
      spawn(p);
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const dist = (40 + Math.random() * 70) * power;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - 30 * power;
      p.animate([
        { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`, opacity: 0 },
      ], { duration: 550 + Math.random() * 350, easing: "cubic-bezier(.2,.8,.3,1)" }).onfinish = () => p.remove();
    }
  }, [spawn]);

  const floatText = useCallback((x: number, y: number, text: string, opts?: FloatOpts) => {
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const el = document.createElement("span");
    el.textContent = text;
    const size = opts?.size ?? 16;
    el.style.cssText = `position:absolute;left:${x - rect.left}px;top:${y - rect.top}px;` +
      `transform:translate(-50%,-50%);pointer-events:none;z-index:61;font-weight:${opts?.bold === false ? 500 : 800};` +
      `font-size:${size}px;color:${opts?.color ?? "#fde047"};text-shadow:0 2px 6px rgba(0,0,0,.55),0 0 12px ${opts?.color ?? "#fbbf24"}66;` +
      `will-change:transform,opacity;white-space:nowrap;font-family:inherit;`;
    spawn(el);
    el.animate([
      { transform: "translate(-50%,-50%) scale(.6)", opacity: 0 },
      { transform: "translate(-50%,-90%) scale(1.15)", opacity: 1, offset: 0.25 },
      { transform: "translate(-50%,-170%) scale(1)", opacity: 0 },
    ], { duration: 900, easing: "ease-out" }).onfinish = () => el.remove();
  }, [spawn]);

  const shake = useCallback((intensity = 6, ms = 220) => {
    const el = shakeRef.current;
    if (!el) return;
    const kf: Keyframe[] = [];
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const f = 1 - i / steps;
      kf.push({
        transform: `translate(${(Math.random() * 2 - 1) * intensity * f}px, ${(Math.random() * 2 - 1) * intensity * f}px)`,
      });
    }
    kf.push({ transform: "translate(0,0)" });
    el.animate(kf, { duration: ms, easing: "ease-out" });
  }, []);

  const combo = useCallback(() => {
    comboVal.current += 1;
    setComboCount(comboVal.current);
    if (comboTimer.current) window.clearTimeout(comboTimer.current);
    comboTimer.current = window.setTimeout(() => {
      comboVal.current = 0;
      setComboCount(0);
    }, 2000);
  }, []);

  const resetCombo = useCallback(() => {
    comboVal.current = 0;
    setComboCount(0);
    if (comboTimer.current) window.clearTimeout(comboTimer.current);
  }, []);

  return (
    <FxCtx.Provider value={{ burst, floatText, shake, combo, resetCombo, comboCount }}>
      {children}
      <div ref={hostRef} aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 60 }} />
      {comboCount >= 2 && (
        <div aria-hidden className="pointer-events-none fixed left-1/2 top-[12%] z-[62] -translate-x-1/2" key={comboCount}>
          <div style={{ animation: "fxComboPop .3s cubic-bezier(.2,1.6,.4,1)" }}
            className="rounded-full border border-amber-300/50 bg-gradient-to-r from-amber-500/90 to-orange-600/90 px-4 py-1 text-sm font-black text-white shadow-lg shadow-orange-900/40">
            COMBO ×{comboCount}!
          </div>
        </div>
      )}
    </FxCtx.Provider>
  );
}

/** Converte coordenadas de evento (pointer/touch) para o FX layer. */
export function evPoint(e: { clientX: number; clientY: number }) {
  return { x: e.clientX, y: e.clientY };
}
