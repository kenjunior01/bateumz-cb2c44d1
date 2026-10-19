// ═══════════════════════════════════════════════════════════════
//  BATEU PRO KIT — Motor de som sintetizado (WebAudio) + haptics
//  Padrão REA dos líderes do nicho (MPL/WinZO/Hago): TODO toque
//  responde com som + vibração — "juice" que faz o jogo parecer pro.
//  Zero assets: tudo sintetizado (leve, offline, sem copyright).
// ═══════════════════════════════════════════════════════════════

type SfxName =
  | "click" | "hit" | "coin" | "powerup" | "win" | "lose"
  | "explosion" | "combo" | "levelup" | "pop" | "jump" | "shoot" | "tick";

const STORAGE_KEY = "bateu:kit-sound";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = (() => {
  try { return localStorage.getItem(STORAGE_KEY) !== "0"; } catch { return true; }
})();

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

/** Desbloqueia o áudio no primeiro toque do utilizador (política dos browsers). */
export function unlockAudio() {
  ensureCtx();
}

export function isSfxEnabled() {
  return enabled;
}

export function setSfxEnabled(v: boolean) {
  enabled = v;
  try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0"); } catch {}
}

let lastTick = 0;

/** Toca um efeito sintetizado. Fail-safe: nunca lança. */
export function playSfx(name: SfxName, opts?: { volume?: number; pitch?: number }) {
  if (!enabled) return;
  const ac = ensureCtx();
  if (!ac || !master) return;
  try {
    const vol = opts?.volume ?? 1;
    const pitch = opts?.pitch ?? 1;
    const t0 = ac.currentTime;
    const out = ac.createGain();
    out.connect(master);

    const tone = (freq: number, dur: number, type: OscillatorType, v: number, slideTo?: number, delay = 0) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type;
      const f = Math.max(30, Math.min(8000, freq * pitch));
      osc.frequency.setValueAtTime(f, t0 + delay);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo * pitch), t0 + delay + dur);
      g.gain.setValueAtTime(0.0001, t0 + delay);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v * vol), t0 + delay + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + dur);
      osc.connect(g); g.connect(out);
      osc.start(t0 + delay); osc.stop(t0 + delay + dur + 0.02);
    };

    const noise = (dur: number, v: number, hp = 400, delay = 0) => {
      const n = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const filter = ac.createBiquadFilter();
      filter.type = "highpass"; filter.frequency.value = hp;
      const g = ac.createGain();
      g.gain.setValueAtTime(v * vol, t0 + delay);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + delay + dur);
      src.connect(filter); filter.connect(g); g.connect(out);
      src.start(t0 + delay);
    };

    switch (name) {
      case "click":    tone(660, 0.06, "triangle", 0.5, 880); break;
      case "pop":      tone(520, 0.07, "sine", 0.55, 300); break;
      case "tick": {
        const now = performance.now();
        if (now - lastTick < 55) return; // evita metralhadora de ticks
        lastTick = now;
        tone(980, 0.035, "square", 0.18); break;
      }
      case "hit":      noise(0.08, 0.5, 900); tone(180, 0.08, "square", 0.35, 90); break;
      case "coin":     tone(988, 0.07, "square", 0.4); tone(1319, 0.14, "square", 0.35, undefined, 0.07); break;
      case "powerup":  tone(392, 0.09, "sawtooth", 0.3, 784); tone(587, 0.12, "sawtooth", 0.3, 1175, 0.09); break;
      case "jump":     tone(300, 0.12, "sine", 0.4, 620); break;
      case "shoot":    tone(880, 0.06, "sawtooth", 0.25, 220); break;
      case "explosion": noise(0.3, 0.8, 120); tone(90, 0.28, "sawtooth", 0.5, 40); break;
      case "combo": {
        const base = 660 + Math.min(6, 6) * 40;
        tone(base, 0.06, "square", 0.32); tone(base * 1.33, 0.09, "square", 0.3, undefined, 0.055); break;
      }
      case "levelup": {
        [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, "triangle", 0.38, undefined, i * 0.09));
        break;
      }
      case "win":      [523, 659, 784].forEach((f, i) => tone(f, 0.18, "triangle", 0.4, undefined, i * 0.11)); break;
      case "lose":     tone(392, 0.2, "sawtooth", 0.3, 196); tone(196, 0.3, "sawtooth", 0.25, 98, 0.16); break;
    }
  } catch { /* silencioso */ }
}

/** Vibração háptica curta (Android/WebView suportam; iOS web ignora). */
export function haptic(pattern: number | number[] = 12) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern as VibratePattern);
    }
  } catch {}
}

/** Atalho: resposta completa a um toque (som + haptics). */
export function juice(name: SfxName, hapticMs: number | number[] = 10) {
  playSfx(name);
  if (hapticMs) haptic(hapticMs);
}
