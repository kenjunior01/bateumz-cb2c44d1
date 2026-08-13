// =============================================================
// BATEU MASTER SOUND ENGINE v2.0
// Web Audio API - Zero external audio files
// Volume persistence + category control + 50+ synthesized effects
// =============================================================

// ---- Types ----
export type SoundCategory =
  | 'ui'        // clicks, hovers, toggles
  | 'feedback'  // success, error, confirmations
  | 'game'      // wins, losses, streaks, achievements
  | 'coins'     // money, wallet, transactions
  | 'social'    // chat, notifications, invites
  | 'ambient';  // background hums, transitions

export interface SoundConfig {
  masterVolume: number;     // 0-1
  categories: Record<SoundCategory, number>; // 0-1 per category
  enabled: boolean;
  hapticEnabled: boolean;
}

const STORAGE_KEY = 'bateu-sound-config';

const DEFAULT_CONFIG: SoundConfig = {
  masterVolume: 0.7,
  categories: {
    ui: 0.6,
    feedback: 0.8,
    game: 1.0,
    coins: 0.9,
    social: 0.5,
    ambient: 0.3,
  },
  enabled: true,
  hapticEnabled: true,
};

// ---- Singleton AudioContext ----
let _ctx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// ---- Config Management ----
let config: SoundConfig = loadConfig();

function loadConfig(): SoundConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed, categories: { ...DEFAULT_CONFIG.categories, ...parsed.categories } };
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export function getSoundConfig(): SoundConfig {
  return { ...config, categories: { ...config.categories } };
}

export function updateSoundConfig(partial: Partial<SoundConfig>): SoundConfig {
  config = { ...config, ...partial };
  if (partial.categories) {
    config.categories = { ...config.categories, ...partial.categories };
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  return getSoundConfig();
}

export function setCategoryVolume(cat: SoundCategory, vol: number): SoundConfig {
  return updateSoundConfig({ categories: { ...config.categories, [cat]: Math.max(0, Math.min(1, vol)) } });
}

export function setMasterVolume(vol: number): SoundConfig {
  return updateSoundConfig({ masterVolume: Math.max(0, Math.min(1, vol)) });
}

export function toggleSound(): SoundConfig {
  return updateSoundConfig({ enabled: !config.enabled });
}

export function toggleHaptic(): SoundConfig {
  return updateSoundConfig({ hapticEnabled: !config.hapticEnabled });
}

// ---- Volume Calculation ----
function vol(category: SoundCategory, base: number = 1): number {
  if (!config.enabled) return 0;
  return base * config.masterVolume * (config.categories[category] ?? 1);
}

// ---- Haptic ----
function haptic(pattern: number | number[]): void {
  if (!config.hapticEnabled) return;
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {}
}

// ============================================================
// LOW-LEVEL SOUND PRIMITIVES
// ============================================================

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.15,
  delay: number = 0,
  detune: number = 0,
) {
  try {
    const c = ctx();
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    if (detune) osc.detune.setValueAtTime(detune, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch {}
}

function sweep(
  startFreq: number,
  endFreq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.12,
  delay: number = 0,
) {
  try {
    const c = ctx();
    const t = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + duration);
  } catch {}
}

function noise(duration: number, volume: number = 0.05, delay: number = 0, filterFreq: number = 3000) {
  try {
    const c = ctx();
    const t = c.currentTime + delay;
    const bufferSize = Math.floor(c.sampleRate * duration);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const source = c.createBufferSource();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(filterFreq, t);
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    source.start(t);
  } catch {}
}

function chord(freqs: number[], duration: number, type: OscillatorType = 'sine', volume: number = 0.1, delay: number = 0) {
  freqs.forEach(f => tone(f, duration, type, volume / freqs.length * freqs.length * 0.7, delay));
}

function arpeggio(freqs: number[], interval: number, type: OscillatorType = 'sine', volume: number = 0.1) {
  freqs.forEach((f, i) => tone(f, interval * 1.5, type, volume, i * interval));
}

// ============================================================
// MASTER SOUND LIBRARY - 50+ EFFECTS
// ============================================================

export const sfx = {
  // ===================== UI =====================
  click: () => { tone(800, 0.05, 'sine', vol('ui', 0.08)); haptic(10); },
  hover: () => tone(1200, 0.025, 'sine', vol('ui', 0.03)),
  buttonClick: () => {
    tone(600, 0.04, 'square', vol('ui', 0.04));
    tone(900, 0.06, 'sine', vol('ui', 0.03));
    haptic(15);
  },
  buttonHover: () => tone(1400, 0.02, 'sine', vol('ui', 0.025)),
  tabClick: () => tone(800, 0.06, 'sine', vol('ui', 0.06)),
  tabHover: () => tone(1200, 0.03, 'sine', vol('ui', 0.03)),
  modalOpen: () => sweep(300, 600, 0.15, 'sine', vol('ui', 0.05)),
  modalClose: () => sweep(600, 300, 0.1, 'sine', vol('ui', 0.04)),
  inputFocus: () => tone(1400, 0.03, 'sine', vol('ui', 0.02)),
  toggleOn: () => { tone(800, 0.04, 'sine', vol('ui', 0.05)); tone(1200, 0.06, 'sine', vol('ui', 0.04), 0.04); haptic(10); },
  toggleOff: () => { tone(1200, 0.04, 'sine', vol('ui', 0.04)); tone(800, 0.06, 'sine', vol('ui', 0.05), 0.04); haptic(10); },
  cardFlip: () => { noise(0.04, vol('ui', 0.04)); sweep(400, 600, 0.08, 'sine', vol('ui', 0.03)); },
  slideIn: () => sweep(200, 500, 0.12, 'sine', vol('ui', 0.04)),
  slideOut: () => sweep(500, 200, 0.1, 'sine', vol('ui', 0.03)),
  expand: () => sweep(300, 700, 0.15, 'triangle', vol('ui', 0.04)),
  collapse: () => sweep(700, 300, 0.12, 'triangle', vol('ui', 0.03)),
  tooltipShow: () => tone(1600, 0.04, 'sine', vol('ui', 0.02)),
  dropdownOpen: () => { sweep(400, 800, 0.1, 'sine', vol('ui', 0.04)); noise(0.03, vol('ui', 0.02)); },
  dropdownClose: () => sweep(800, 400, 0.08, 'sine', vol('ui', 0.03)),
  
  // ===================== FEEDBACK =====================
  success: () => {
    tone(600, 0.08, 'sine', vol('feedback', 0.08));
    tone(800, 0.12, 'sine', vol('feedback', 0.06), 0.08);
    haptic([20, 30, 20]);
  },
  error: () => {
    tone(200, 0.15, 'square', vol('feedback', 0.07));
    tone(180, 0.15, 'square', vol('feedback', 0.06), 0.15);
    haptic(50);
  },
  warning: () => {
    tone(440, 0.1, 'square', vol('feedback', 0.05));
    tone(440, 0.1, 'square', vol('feedback', 0.05), 0.15);
    tone(440, 0.15, 'square', vol('feedback', 0.06), 0.3);
  },
  confirm: () => {
    tone(523, 0.1, 'sine', vol('feedback', 0.08));
    tone(659, 0.1, 'sine', vol('feedback', 0.08), 0.1);
    haptic([15, 20]);
  },
  deny: () => sweep(500, 200, 0.4, 'sine', vol('feedback', 0.07)),
  alert: () => {
    tone(880, 0.08, 'square', vol('feedback', 0.06));
    tone(880, 0.08, 'square', vol('feedback', 0.06), 0.2);
    tone(1100, 0.12, 'square', vol('feedback', 0.07), 0.4);
    haptic([30, 50, 30]);
  },
  complete: () => {
    arpeggio([523, 659, 784, 1047], 0.1, 'sine', vol('feedback', 0.08));
    haptic([10, 20, 10, 20, 30]);
  },
  loading: () => tone(600, 0.06, 'sine', vol('feedback', 0.03)),
  refresh: () => sweep(300, 900, 0.2, 'sine', vol('feedback', 0.04)),
  copy: () => { tone(900, 0.05, 'sine', vol('feedback', 0.06)); tone(1200, 0.08, 'sine', vol('feedback', 0.05), 0.05); haptic(10); },
  delete: () => { sweep(600, 200, 0.2, 'sawtooth', vol('feedback', 0.05)); noise(0.06, vol('feedback', 0.03)); },

  // ===================== GAME =====================
  win: () => {
    tone(523, 0.15, 'sine', vol('game', 0.1));
    tone(659, 0.15, 'sine', vol('game', 0.1), 0.12);
    tone(784, 0.3, 'sine', vol('game', 0.12), 0.24);
    tone(1047, 0.5, 'sine', vol('game', 0.08), 0.4);
    coinClink();
    haptic([20, 40, 20, 40, 60]);
  },
  bigWin: () => {
    sweep(300, 800, 0.5, 'sine', vol('game', 0.07));
    setTimeout(() => { tone(523, 0.15, 'sine', vol('game', 0.1)); coinClink(); }, 400);
    setTimeout(() => { tone(659, 0.15, 'sine', vol('game', 0.1)); coinClink(); }, 520);
    setTimeout(() => { tone(784, 0.2, 'sine', vol('game', 0.12)); multiCoin(5); }, 640);
    setTimeout(() => { tone(1047, 0.4, 'sine', vol('game', 0.1)); multiCoin(8); }, 800);
    haptic([20, 30, 20, 30, 40, 50, 60, 80]);
  },
  lose: () => {
    sweep(400, 150, 0.5, 'sine', vol('game', 0.07));
    tone(180, 0.4, 'sine', vol('game', 0.05), 0.3);
    haptic(40);
  },
  draw: () => { tone(440, 0.2, 'triangle', vol('game', 0.07)); tone(440, 0.2, 'triangle', vol('game', 0.06), 0.25); },
  victoryFanfare: () => {
    // Bass impact
    tone(80, 0.3, 'sine', vol('game', 0.2));
    sweep(80, 30, 0.3, 'sine', vol('game', 0.15), 0);
    // Ascending melody
    arpeggio([262, 330, 392, 523, 659, 784, 1047], 0.12, 'sawtooth', vol('game', 0.08));
    // Sparkle
    setTimeout(() => arpeggio([1568, 2093, 2637, 3136, 2637, 3136, 3520], 0.06, 'sine', vol('game', 0.06)), 1000);
    // Final chord
    setTimeout(() => chord([523, 659, 784, 1047], 1.5, 'triangle', vol('game', 0.05)), 1500);
    haptic([30, 40, 30, 40, 50, 60, 70, 80, 100]);
  },
  milestoneChime: () => {
    [523, 659, 784, 1047].forEach((f, i) => {
      tone(f, 1.0, 'sine', vol('game', 0.1), i * 0.2);
      tone(f * 2.76, 0.4, 'sine', vol('game', 0.03), i * 0.2); // inharmonic bell partial
    });
    setTimeout(() => arpeggio([1319, 1568, 1760, 2093], 0.1, 'sine', vol('game', 0.04)), 700);
    haptic([15, 30, 15, 30, 50]);
  },
  levelUp: () => {
    arpeggio([392, 494, 587, 784], 0.1, 'square', vol('game', 0.06));
    tone(784, 1.2, 'triangle', vol('game', 0.07), 0.4);
    haptic([20, 40, 20, 40, 60, 80]);
  },
  achievement: () => {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => {
      setTimeout(() => { tone(f, 0.15, 'sine', vol('game', 0.07), i * 0.1); if (i % 2 === 0) coinClink(); }, i * 100);
    });
    haptic([15, 25, 15, 25, 40, 55, 70]);
  },
  streakAchieved: () => { arpeggio([523, 659, 784, 1047, 1319], 0.08, 'sine', vol('game', 0.07)); haptic([10, 20, 30, 40, 60]); },
  streakBroken: () => { noise(0.15, vol('game', 0.08)); sweep(2000, 200, 0.3, 'sawtooth', vol('game', 0.05)); haptic(60); },
  battleStart: () => {
    tone(100, 0.15, 'square', vol('game', 0.1));
    tone(100, 0.15, 'square', vol('game', 0.1), 0.2);
    tone(100, 0.3, 'square', vol('game', 0.12), 0.4);
    sweep(200, 1200, 0.5, 'sawtooth', vol('game', 0.08), 0.4);
    noise(0.1, vol('game', 0.05), 0.4);
    haptic([30, 50, 80]);
  },
  vsReveal: () => {
    tone(150, 0.1, 'square', vol('game', 0.1));
    noise(0.08, vol('game', 0.06));
    sweep(200, 50, 0.3, 'sawtooth', vol('game', 0.04), 0.05);
    haptic(50);
  },
  countdown: (remaining: number) => {
    if (remaining <= 3) {
      tone(remaining === 1 ? 880 : 660, 0.15, 'square', vol('game', 0.06));
      haptic(remaining === 1 ? 40 : 20);
    } else {
      tone(440, 0.08, 'sine', vol('game', 0.03));
    }
  },
  countdownFinal: () => {
    tone(880, 0.3, 'square', vol('game', 0.1));
    noise(0.15, vol('game', 0.06));
    haptic([40, 60]);
  },
  drumRoll: () => {
    for (let i = 0; i < 20; i++) {
      tone(100 + Math.random() * 50, 0.06, 'triangle', vol('game', 0.03 + i * 0.003), i * 0.06);
    }
  },
  pop: () => {
    sweep(600, 1200, 0.08, 'sine', vol('game', 0.12));
    sweep(1200, 800, 0.07, 'sine', vol('game', 0.1), 0.08);
    haptic(15);
  },
  whoosh: () => { sweep(200, 1500, 0.25, 'sawtooth', vol('game', 0.05)); noise(0.15, vol('game', 0.03), 0, 5000); },
  powerUp: () => {
    sweep(200, 2000, 0.6, 'sawtooth', vol('game', 0.05));
    chord([523, 659, 784], 0.4, 'sine', vol('game', 0.06), 0.4);
    haptic([10, 20, 30, 40, 50, 60]);
  },
  shieldUp: () => {
    tone(400, 0.1, 'triangle', vol('game', 0.06));
    tone(600, 0.15, 'triangle', vol('game', 0.05), 0.1);
    tone(800, 0.2, 'sine', vol('game', 0.04), 0.2);
    haptic(20);
  },
  shieldBreak: () => {
    noise(0.2, vol('game', 0.08));
    sweep(1500, 200, 0.3, 'sawtooth', vol('game', 0.05));
    haptic(50);
  },

  // ===================== COINS =====================
  coinClink: () => { coinClink(); haptic(10); },
  coinMulti: (count: number = 3) => { multiCoin(count); haptic([10, 10, 10].slice(0, count)); },
  escrowLock: () => { tone(800, 0.05, 'square', vol('coins', 0.06)); tone(600, 0.08, 'square', vol('coins', 0.05), 0.06); noise(0.03, vol('coins', 0.04)); haptic([15, 25]); },
  escrowUnlock: () => { tone(600, 0.05, 'square', vol('coins', 0.05)); tone(800, 0.08, 'square', vol('coins', 0.06), 0.06); coinClink(); haptic([15, 10, 15]); },
  deposit: () => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => tone(2600 + i * 200, 0.06, 'sine', vol('coins', 0.07)), i * 60);
    }
    haptic([10, 10, 10, 10, 15]);
  },
  withdrawal: () => {
    for (let i = 4; i >= 0; i--) {
      setTimeout(() => tone(2600 + i * 200, 0.06, 'sine', vol('coins', 0.07)), (4 - i) * 60);
    }
    haptic([10, 10, 10, 10, 15]);
  },
  wagerPlace: () => {
    tone(400, 0.08, 'sine', vol('coins', 0.06));
    coinClink();
    haptic([15, 25]);
  },
  wagerPreset: () => tone(1000, 0.04, 'sine', vol('coins', 0.04)),
  jackpot: () => {
    arpeggio([523, 659, 784, 1047, 1319, 1568], 0.12, 'sine', vol('coins', 0.08));
    multiCoin(10);
    haptic([20, 30, 40, 50, 60, 80, 100]);
  },

  // ===================== SOCIAL =====================
  chatMessage: () => tone(1200, 0.04, 'sine', vol('social', 0.03)),
  chatMention: () => { tone(1200, 0.04, 'sine', vol('social', 0.05)); tone(1600, 0.06, 'sine', vol('social', 0.04), 0.04); haptic(20); },
  notification: () => {
    tone(880, 0.08, 'sine', vol('social', 0.05));
    tone(1100, 0.1, 'sine', vol('social', 0.04), 0.1);
    haptic([15, 30]);
  },
  inviteCopied: () => { tone(900, 0.05, 'sine', vol('social', 0.05)); tone(1200, 0.08, 'sine', vol('social', 0.04), 0.05); haptic(10); },
  newChallenger: () => {
    tone(440, 0.1, 'square', vol('social', 0.06));
    tone(550, 0.1, 'square', vol('social', 0.06), 0.12);
    tone(660, 0.15, 'square', vol('social', 0.07), 0.24);
    tone(440, 0.2, 'square', vol('social', 0.05), 0.4);
    haptic([20, 30, 40]);
  },
  trashTalk: () => { tone(600, 0.06, 'square', vol('social', 0.04)); tone(500, 0.06, 'square', vol('social', 0.04), 0.07); tone(700, 0.1, 'triangle', vol('social', 0.05), 0.14); },
  sendMessage: () => { tone(400, 0.08, 'sine', vol('social', 0.05)); sweep(400, 800, 0.1, 'sine', vol('social', 0.04)); },
  receiveMessage: () => tone(1000, 0.06, 'sine', vol('social', 0.04)),
  userOnline: () => tone(1400, 0.06, 'sine', vol('social', 0.03)),
  userOffline: () => tone(700, 0.06, 'sine', vol('social', 0.02)),
  friendRequest: () => { tone(523, 0.1, 'sine', vol('social', 0.05)); tone(659, 0.1, 'sine', vol('social', 0.05), 0.12); haptic(15); },

  // ===================== AMBIENT =====================
  pageLoad: () => sweep(200, 600, 0.3, 'sine', vol('ambient', 0.03)),
  sectionReveal: () => sweep(300, 500, 0.2, 'triangle', vol('ambient', 0.02)),
  transition: () => sweep(400, 700, 0.15, 'sine', vol('ambient', 0.02)),
  heartbeat: () => {
    tone(60, 0.15, 'sine', vol('ambient', 0.06));
    tone(60, 0.12, 'sine', vol('ambient', 0.04), 0.2);
  },
  ambientHum: () => tone(100, 2, 'sine', vol('ambient', 0.01)),
  reveal: () => {
    noise(0.1, vol('ambient', 0.03), 0, 2000);
    sweep(300, 800, 0.3, 'sine', vol('ambient', 0.04));
  },
  secret: () => {
    sweep(800, 400, 0.2, 'triangle', vol('ambient', 0.04));
    sweep(400, 800, 0.2, 'triangle', vol('ambient', 0.04), 0.25);
    haptic([10, 40, 10]);
  },
};

// ---- Coin helpers (used internally) ----
function coinClink() {
  tone(2800, 0.08, 'sine', vol('coins', 0.1));
  tone(3500, 0.12, 'sine', vol('coins', 0.08), 0.05);
  noise(0.04, vol('coins', 0.03), 0.03);
}

function multiCoin(count: number = 3) {
  for (let i = 0; i < Math.min(count, 10); i++) {
    setTimeout(() => tone(2600 + i * 200, 0.06, 'sine', vol('coins', 0.07)), i * 60);
  }
}

// ---- Init on first interaction ----
export function initAudio(): void {
  try { ctx(); } catch {}
}

// ---- Backwards compat with old sounds.ts ----
export const playPopSound = sfx.pop;
export const playWinSound = sfx.win;
export const playVictoryFanfare = sfx.victoryFanfare;
export const playMilestoneChime = sfx.milestoneChime;
export const playLevelUpSound = sfx.levelUp;
export const playDismissSound = sfx.modalClose;
export const playTickSound = () => tone(1000, 0.05, 'sine', vol('ui', 0.04));
export const playDrumRoll = sfx.drumRoll;
export const playSendSound = sfx.sendMessage;
