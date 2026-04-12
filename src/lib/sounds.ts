// Web Audio API sound effects - no external files needed
const audioCtx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

export function playPopSound() {
  try {
    const ctx = audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
}

export function playWinSound() {
  try {
    const ctx = audioCtx();
    const notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = i < 3 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.15 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.5);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.5);
    });
    setTimeout(() => {
      try {
        const ctx2 = audioCtx();
        [2093, 2637].forEach((freq, i) => {
          const osc = ctx2.createOscillator();
          const gain = ctx2.createGain();
          osc.connect(gain);
          gain.connect(ctx2.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx2.currentTime + i * 0.08);
          gain.gain.setValueAtTime(0, ctx2.currentTime + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.1, ctx2.currentTime + i * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + i * 0.08 + 0.8);
          osc.start(ctx2.currentTime + i * 0.08);
          osc.stop(ctx2.currentTime + i * 0.08 + 0.8);
        });
      } catch {}
    }, 800);
  } catch {}
}

// 🎊 Epic victory fanfare — bass impact + ascending melody + sparkle arpeggios + sustained chord
export function playVictoryFanfare() {
  try {
    const ctx = audioCtx();

    // Bass drum impact
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.connect(bassGain);
    bassGain.connect(ctx.destination);
    bassOsc.type = "sine";
    bassOsc.frequency.setValueAtTime(80, ctx.currentTime);
    bassOsc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
    bassGain.gain.setValueAtTime(0.25, ctx.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    bassOsc.start(ctx.currentTime);
    bassOsc.stop(ctx.currentTime + 0.4);

    // Ascending triumphant melody: C4-E4-G4-C5-E5-G5-C6
    const melody = [262, 330, 392, 523, 659, 784, 1047];
    melody.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = i < 4 ? "sawtooth" : "triangle";
      const t = ctx.currentTime + 0.1 + i * 0.12;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t);
      osc.stop(t + 0.4);
    });

    // Sparkle arpeggios
    setTimeout(() => {
      try {
        const ctx2 = audioCtx();
        const sparkle = [1568, 2093, 2637, 3136, 2637, 3136, 3520];
        sparkle.forEach((freq, i) => {
          const osc = ctx2.createOscillator();
          const gain = ctx2.createGain();
          osc.connect(gain);
          gain.connect(ctx2.destination);
          osc.type = "sine";
          const t = ctx2.currentTime + i * 0.06;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.07, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
          osc.start(t);
          osc.stop(t + 0.6);
        });
      } catch {}
    }, 1000);

    // Final chord sustain
    setTimeout(() => {
      try {
        const ctx3 = audioCtx();
        [523, 659, 784, 1047].forEach((freq) => {
          const osc = ctx3.createOscillator();
          const gain = ctx3.createGain();
          osc.connect(gain);
          gain.connect(ctx3.destination);
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, ctx3.currentTime);
          gain.gain.setValueAtTime(0.05, ctx3.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx3.currentTime + 1.5);
          osc.start(ctx3.currentTime);
          osc.stop(ctx3.currentTime + 1.5);
        });
      } catch {}
    }, 1500);
  } catch {}
}

// ⭐ Points milestone — warm bell chime cascade with harmonic overtones
export function playMilestoneChime() {
  try {
    const ctx = audioCtx();
    const bellFreqs = [523, 659, 784, 1047];
    bellFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.2;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.13, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.02, t + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);
      osc.start(t);
      osc.stop(t + 1.0);

      // Bell-like inharmonic partial
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(freq * 2.76, t);
      gain2.gain.setValueAtTime(0, t);
      gain2.gain.linearRampToValueAtTime(0.03, t + 0.005);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc2.start(t);
      osc2.stop(t + 0.4);
    });

    // Rising shimmer
    setTimeout(() => {
      try {
        const ctx2 = audioCtx();
        [1319, 1568, 1760, 2093].forEach((freq, i) => {
          const osc = ctx2.createOscillator();
          const gain = ctx2.createGain();
          osc.connect(gain);
          gain.connect(ctx2.destination);
          osc.type = "sine";
          const t = ctx2.currentTime + i * 0.1;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.05, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
          osc.start(t);
          osc.stop(t + 0.8);
        });
      } catch {}
    }, 700);
  } catch {}
}

// 🎵 Level up jingle — quick ascending game-like sound
export function playLevelUpSound() {
  try {
    const ctx = audioCtx();
    const notes = [392, 494, 587, 784];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      const t = ctx.currentTime + i * 0.1;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.07, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.25);
    });
    const finalOsc = ctx.createOscillator();
    const finalGain = ctx.createGain();
    finalOsc.connect(finalGain);
    finalGain.connect(ctx.destination);
    finalOsc.type = "triangle";
    finalOsc.frequency.setValueAtTime(784, ctx.currentTime + 0.4);
    finalGain.gain.setValueAtTime(0.08, ctx.currentTime + 0.4);
    finalGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    finalOsc.start(ctx.currentTime + 0.4);
    finalOsc.stop(ctx.currentTime + 1.2);
  } catch {}
}

export function playDismissSound() {
  try {
    const ctx = audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

export function playTickSound() {
  try {
    const ctx = audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch {}
}

export function playDrumRoll() {
  try {
    const ctx = audioCtx();
    for (let i = 0; i < 20; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(100 + Math.random() * 50, ctx.currentTime + i * 0.06);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.06);
      gain.gain.linearRampToValueAtTime(0.04 + i * 0.004, ctx.currentTime + i * 0.06 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.06);
      osc.start(ctx.currentTime + i * 0.06);
      osc.stop(ctx.currentTime + i * 0.06 + 0.06);
    }
  } catch {}
}

export function playSendSound() {
  try {
    const ctx = audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}
