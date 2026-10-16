// ═══════════════════════════════════════════════════════════════
//  BATEU PRO KIT — Loop de jogo com pausa automática + dt seguro
//  e hook de jogo "pro" (combina loop, fx, sfx, haptics, saves).
// ═══════════════════════════════════════════════════════════════
import { useEffect, useRef, useCallback } from "react";
import { playSfx, haptic, unlockAudio } from "./sfx";
import { useFx } from "./fx";

export interface LoopHandle {
  start: (cb: (dt: number, now: number) => void) => void;
  stop: () => void;
  paused: boolean;
  setPaused: (v: boolean) => void;
}

/** RAF loop com clamp de dt (evita saltos após tab switch) e pausa automática. */
export function useGameLoop() {
  const raf = useRef<number | null>(null);
  const paused = useRef(false);
  const last = useRef(0);
  const cbRef = useRef<((dt: number, now: number) => void) | null>(null);

  const stop = useCallback(() => {
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  const start = useCallback((cb: (dt: number, now: number) => void) => {
    cbRef.current = cb;
    last.current = performance.now();
    const tick = (now: number) => {
      if (!paused.current) {
        let dt = (now - last.current) / 1000;
        last.current = now;
        if (dt > 0.05) dt = 0.05;           // clamp: nunca "teleporta" física
        if (dt > 0) cbRef.current?.(dt, now);
      } else {
        last.current = now;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  // pausa automática quando o separador/app perde foco (economiza bateria)
  useEffect(() => {
    const onVis = () => { paused.current = document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [stop]);

  return { start, stop, paused, setPaused: (v: boolean) => { paused.current = v; } };
}

/** Conjunto "pro" pronto a usar dentro de qualquer jogo. */
export function useProGame() {
  const fx = useFx();
  const respond = useCallback((kind: Parameters<typeof playSfx>[0], hapticMs = 10) => {
    unlockAudio();
    playSfx(kind);
    if (hapticMs) haptic(hapticMs);
  }, []);
  return { fx, respond, playSfx, haptic };
}
