// ============================================================
// BATEU WORLD — Áudio sintetizado (WebAudio, zero assets) · v4
// SFX de combate, progressão, economia e ambiente do mundo.
// v4: MÚSICA ambiente procedural (pad harmónico que muda de
// dia para noite), novos SFX (ondas, loot, combo, pet, foto)
// e canais separados (música vs efeitos) com mute próprio.
// ============================================================

type SfxName =
  | "click" | "hit" | "crit" | "hurt" | "death" | "levelup" | "discover"
  | "coin" | "chest" | "skill" | "steal" | "shield" | "heal" | "join"
  | "boss" | "deny" | "swing"
  // v4
  | "wave" | "loot" | "combo" | "pet" | "photo"
  // v6 — defesa e mapa
  | "block" | "waypoint" | "region"
  // v7 — acontecimentos do mundo
  | "boom" | "event"
  // v8 — interiores
  | "door";

class WorldAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambientStarted = false;
  private musicStarted = false;
  private musicTimer: any = null;
  private muted = false;
  private musicOff = false;
  private lastAt: Record<string, number> = {};
  private chordIdx = 0;

  constructor() {
    try { this.muted = localStorage.getItem("bateu_world_audio") === "off"; } catch { /* ignore */ }
    try { this.musicOff = localStorage.getItem("bateu_world_music") === "off"; } catch { /* ignore */ }
  }

  get isMuted(): boolean { return this.muted; }
  get isMusicOff(): boolean { return this.musicOff; }

  toggleMute(): boolean {
    this.muted = !this.muted;
    try { localStorage.setItem("bateu_world_audio", this.muted ? "off" : "on"); } catch { /* ignore */ }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
    if (!this.muted) this.ensure();
    return this.muted;
  }

  toggleMusic(): boolean {
    this.musicOff = !this.musicOff;
    try { localStorage.setItem("bateu_world_music", this.musicOff ? "off" : "on"); } catch { /* ignore */ }
    if (this.musicOff) this.stopMusic();
    else { this.ensure(); this.startMusic(); }
    return this.musicOff;
  }

  // Chamar no primeiro gesto do utilizador (política dos browsers)
  ensure(): void {
    if (this.muted) return;
    try {
      if (!this.ctx) {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") this.ctx.resume();
    } catch { /* ignore */ }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0, dest?: GainNode): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(dest || this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol: number, lowpass = 1200, delay = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = lowpass;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0);
  }

  play(name: SfxName): void {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    // throttling anti-espam
    const now = performance.now();
    const minGap: Partial<Record<SfxName, number>> = { hit: 70, coin: 60, swing: 120, hurt: 120, combo: 220, loot: 150 };
    const gap = minGap[name] ?? 0;
    if (gap && now - (this.lastAt[name] || 0) < gap) return;
    this.lastAt[name] = now;

    switch (name) {
      case "click": this.tone(660, 0.06, "square", 0.12); break;
      case "swing": this.noise(0.09, 0.1, 2400); this.tone(220, 0.07, "sawtooth", 0.05, 120); break;
      case "hit": this.noise(0.07, 0.16, 900); this.tone(180, 0.06, "square", 0.1, 90); break;
      case "crit": this.noise(0.1, 0.2, 1400); this.tone(520, 0.09, "square", 0.14, 160); this.tone(780, 0.12, "triangle", 0.1, 300, 0.03); break;
      case "hurt": this.tone(200, 0.14, "sawtooth", 0.14, 80); this.noise(0.08, 0.1, 600); break;
      case "death": this.tone(320, 0.5, "sawtooth", 0.16, 60); this.noise(0.4, 0.14, 500); break;
      case "levelup":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, "triangle", 0.16, undefined, i * 0.09));
        this.noise(0.35, 0.05, 3000, 0.05);
        break;
      case "discover":
        [784, 988, 1319].forEach((f, i) => this.tone(f, 0.2, "sine", 0.14, undefined, i * 0.1));
        break;
      case "coin": this.tone(988, 0.06, "square", 0.08); this.tone(1319, 0.09, "square", 0.07, undefined, 0.05); break;
      case "chest": this.tone(392, 0.1, "square", 0.1); this.tone(523, 0.1, "square", 0.1, undefined, 0.1); this.tone(784, 0.16, "square", 0.12, undefined, 0.2); break;
      case "skill": this.tone(440, 0.14, "sawtooth", 0.1, 880); this.noise(0.12, 0.07, 2000); break;
      case "steal": this.tone(880, 0.08, "square", 0.12, 440); this.tone(440, 0.14, "square", 0.1, 220, 0.08); break;
      case "shield": this.tone(330, 0.25, "sine", 0.12, 660); break;
      case "heal": [523, 659].forEach((f, i) => this.tone(f, 0.14, "sine", 0.1, undefined, i * 0.08)); break;
      case "join": this.tone(523, 0.08, "sine", 0.08); this.tone(659, 0.1, "sine", 0.08, undefined, 0.07); break;
      case "boss": this.tone(110, 0.5, "sawtooth", 0.16, 70); this.tone(116, 0.5, "square", 0.1, 74); break;
      case "deny": this.tone(220, 0.1, "square", 0.08, 160); break;
      // ── v4 ──
      case "wave":
        // corneta grave de início de onda
        this.tone(98, 0.55, "sawtooth", 0.16, 62);
        this.tone(147, 0.4, "square", 0.09, 98, 0.12);
        this.noise(0.3, 0.08, 500);
        break;
      case "loot":
        // brilho arpejado de item
        [1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.1, "sine", 0.09, undefined, i * 0.06));
        break;
      case "combo":
        // blip ascendente por cada elo de combo
        this.tone(600 + Math.min(900, this.comboN() * 90), 0.08, "square", 0.09, 900);
        break;
      case "pet":
        // trinado alegre do companheiro
        this.tone(1200, 0.07, "sine", 0.08, 1800);
        this.tone(1800, 0.09, "sine", 0.07, 1400, 0.09);
        break;
      case "photo":
        // obturador
        this.noise(0.05, 0.14, 4000);
        this.noise(0.04, 0.1, 2500, 0.09);
        break;
      // ── v6 ──
      case "block":
        // clang metálico do escudo a aguentar o golpe
        this.tone(1180, 0.16, "square", 0.13, 620);
        this.tone(760, 0.2, "triangle", 0.09, 500, 0.02);
        this.noise(0.1, 0.12, 3000);
        break;
      case "waypoint":
        // ping de destino marcado
        this.tone(880, 0.1, "sine", 0.1);
        this.tone(1320, 0.14, "sine", 0.09, undefined, 0.09);
        break;
      case "region":
        // chegada a uma região — acorde grave majestoso
        [131, 196, 262].forEach((f, i) => this.tone(f, 0.5, "triangle", 0.08, undefined, i * 0.06));
        break;
      // ── v7 ──
      case "boom":
        // impacto de meteoro: estrondo grave
        this.tone(60, 0.5, "sine", 0.22, 38);
        this.noise(0.45, 0.2, 320);
        this.tone(120, 0.3, "sawtooth", 0.1, 55, 0.02);
        break;
      case "event":
        // fanfarra de acontecimento do mundo
        [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.14, "square", 0.1, undefined, i * 0.09));
        this.noise(0.3, 0.05, 3500, 0.1);
        break;
      // ── v8 ──
      case "door":
        // porto de madeira a abrir (creak)
        this.tone(210, 0.34, "sawtooth", 0.05, 305);
        this.tone(133, 0.4, "triangle", 0.06, 176, 0.05);
        break;
    }
  }

  private comboN(): number {
    // contexto simples: cada chamada consecutiva soa mais alto
    const now = performance.now();
    this._comboCtx = now - (this._comboCtx || 0) < 1500 ? Math.min(10, (this._comboCtxN || 1) + 1) : 1;
    this._comboCtx = now;
    this._comboCtxN = this._comboCtx;
    return this._comboCtxN;
  }
  private _comboCtx = 0;
  private _comboCtxN = 1;

  // Ambiente: vento suave contínuo + pássaros de dia / grilos de noite
  startAmbient(): void {
    if (this.muted || this.ambientStarted || !this.ctx || !this.master) return;
    this.ambientStarted = true;
    try {
      const ctx = this.ctx!;
      this.ambientGain = ctx.createGain();
      this.ambientGain.gain.value = 0.035;
      this.ambientGain.connect(this.master);

      // vento: ruído filtrado em loop com LFO
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 420;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.13;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 180;
      lfo.connect(lfoG); lfoG.connect(f.frequency);
      src.connect(f); f.connect(this.ambientGain);
      src.start(); lfo.start();

      // pássaros/grilos aleatórios
      const chirp = () => {
        if (!this.ctx || this.muted) return;
        const hourish = new Date().getHours();
        const day = hourish >= 6 && hourish < 20;
        if (day) {
          const base = 1800 + Math.random() * 1400;
          for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
            this.tone(base + Math.random() * 400, 0.05, "sine", 0.02, base + 600, i * 0.09);
          }
        } else {
          for (let i = 0; i < 5; i++) this.tone(4200, 0.02, "sine", 0.012, 4200, i * 0.06);
        }
        setTimeout(chirp, 5000 + Math.random() * 14000);
      };
      setTimeout(chirp, 4000);
    } catch { /* ignore */ }
  }

  // ── v4: MÚSICA procedural — pads que mudam de dia para noite ──
  // Progressões: dia (jazzoso e claro) · noite (escura e lenta).
  startMusic(): void {
    if (this.musicStarted || this.musicOff || this.muted || !this.ctx || !this.master) return;
    this.musicStarted = true;
    try {
      const ctx = this.ctx!;
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0.05;
      const musFilter = ctx.createBiquadFilter();
      musFilter.type = "lowpass";
      musFilter.frequency.value = 1400;
      this.musicGain.connect(musFilter);
      musFilter.connect(this.master);
    } catch { this.musicStarted = false; return; }

    const DAY_CHORDS = [
      [261.6, 329.6, 392.0, 493.9],   // Cmaj7
      [220.0, 261.6, 329.6, 392.0],   // Am7
      [174.6, 220.0, 261.6, 329.6],   // Fmaj7
      [196.0, 246.9, 293.7, 349.2],   // G
    ];
    const NIGHT_CHORDS = [
      [220.0, 261.6, 329.6, 415.3],   // Am(maj7) sombrio
      [174.6, 207.7, 261.6, 311.1],   // Fm
      [146.8, 174.6, 220.0, 261.6],   // Dm
      [130.8, 155.6, 196.0, 233.1],   // Cm
    ];

    const scheduleChord = () => {
      if (!this.ctx || !this.musicGain || this.muted) {
        this.musicTimer = setTimeout(scheduleChord, 4000);
        return;
      }
      const hourish = new Date().getHours();
      const day = hourish >= 6 && hourish < 20;
      const chords = day ? DAY_CHORDS : NIGHT_CHORDS;
      const chord = chords[this.chordIdx % chords.length];
      this.chordIdx++;
      const dur = day ? 7.5 : 9.5;
      chord.forEach((freq, i) => {
        // duas vozes desafinadas por nota = pad largo
        this.padNote(freq, dur, i === 0 ? 0.05 : 0.032);
        this.padNote(freq * 1.004, dur, i === 0 ? 0.04 : 0.026);
        if (i === 3) this.padNote(freq * 2, dur * 0.6, 0.012); // brilho
      });
      this.musicTimer = setTimeout(scheduleChord, dur * 1000 - 400);
    };
    scheduleChord();
  }

  stopMusic(): void {
    if (this.musicTimer) { clearTimeout(this.musicTimer); this.musicTimer = null; }
    this.musicStarted = false;
    if (this.musicGain && this.ctx) {
      try { this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3); } catch { /* ignore */ }
      const g = this.musicGain;
      setTimeout(() => { try { g.disconnect(); } catch { /* ignore */ } }, 1500);
      this.musicGain = null;
    }
  }

  private padNote(freq: number, dur: number, vol: number): void {
    if (!this.ctx || !this.musicGain) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.35);   // ataque lento
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);       // release longo
    osc.connect(g); g.connect(this.musicGain);
    osc.start(t0); osc.stop(t0 + dur + 0.1);
  }
}

export const worldAudio = new WorldAudio();
