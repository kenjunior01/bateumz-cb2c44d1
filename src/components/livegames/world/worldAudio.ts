// ============================================================
// BATEU WORLD — Áudio sintetizado (WebAudio, zero assets) · v11
// SFX de combate, progressão, economia e ambiente do mundo.
// v11: BANDA SONORA ORIGINAL com 5 FAIXAS compostas em código
// (100% livres de direitos de autor — nenhum sample, nenhuma
// melhoria de terceiros): Amanhecer no Vale (aventura),
// Blocos ao Vento (calma tipo sandbox), Corrida do Ouro
// (chiptune arcade), Neon da Metrópole (synthwave noturna) e
// Coração da Floresta (mística). Leitor com próxima/anterior,
// volume próprio e chuva/trovão para o novo CLIMA.
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
  | "door"
  // v11 — clima, colheita e montaria
  | "thunder" | "gather" | "mount" | "craft";

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

  // ── v11: banda sonora por faixas originais ──
  private trackIdx = 0;
  private musicVol = 0.6;      // 0..1 — slider do leitor
  private stepIdx = 0;
  private nextStepAt = 0;
  private schedTimer: any = null;
  private rainNode: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

  constructor() {
    try { this.muted = localStorage.getItem("bateu_world_audio") === "off"; } catch { /* ignore */ }
    try { this.musicOff = localStorage.getItem("bateu_world_music") === "off"; } catch { /* ignore */ }
    try { this.trackIdx = Math.max(0, Math.min(MUSIC_TRACKS.length - 1, parseInt(localStorage.getItem("bateu_world_track") || "0", 10) || 0)); } catch { /* ignore */ }
    try { this.musicVol = Math.max(0.05, Math.min(1, parseFloat(localStorage.getItem("bateu_world_vol") || "0.6") || 0.6)); } catch { /* ignore */ }
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
      // ── v11 ──
      case "thunder":
        // trovão distante: rugido grave com eco
        this.tone(52, 1.1, "sine", 0.22, 34);
        this.noise(0.8, 0.16, 260);
        this.tone(88, 0.5, "sawtooth", 0.06, 44, 0.18);
        break;
      case "gather":
        // colheita: pop orgânico + brilho
        this.tone(520, 0.07, "triangle", 0.1, 780);
        this.tone(1040, 0.1, "sine", 0.07, 1560, 0.06);
        break;
      case "mount":
        // montaria: rugido curto + passos
        this.tone(160, 0.3, "sawtooth", 0.13, 90);
        this.noise(0.18, 0.1, 500, 0.08);
        this.noise(0.14, 0.08, 420, 0.26);
        break;
      case "craft":
        // forja: marteladas metálicas
        this.tone(1240, 0.06, "square", 0.1, 880);
        this.noise(0.06, 0.1, 2600, 0.02);
        this.tone(990, 0.08, "square", 0.08, 660, 0.14);
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

  // ═══════════════════════════════════════════════════════════
  // v11: BANDA SONORA — 5 faixas ORIGINAIS compostas em código.
  // Nenhuma melodia/sample de terceiros: 100% sem direitos de
  // autor. Cada faixa é um mini-compositor de passos (semínimas
  // ao BPM) com progressão própria, baixo, melodia e percussão.
  // ═══════════════════════════════════════════════════════════

  startMusic(): void {
    if (this.musicStarted || this.musicOff || this.muted || !this.ctx || !this.master) return;
    this.musicStarted = true;
    try {
      const ctx = this.ctx!;
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0.13 * this.musicVol;
      const musFilter = ctx.createBiquadFilter();
      musFilter.type = "lowpass";
      musFilter.frequency.value = 3400;
      this.musicGain.connect(musFilter);
      musFilter.connect(this.master);
    } catch { this.musicStarted = false; return; }
    this.stepIdx = 0;
    this.nextStepAt = (this.ctx?.currentTime || 0) + 0.12;
    this.schedTimer = setInterval(this.schedTick, 130);
  }

  private schedTick = (): void => {
    if (!this.ctx || !this.musicGain || this.musicOff || this.muted) return;
    const tr = MUSIC_TRACKS[this.trackIdx];
    const stepDur = 60 / tr.bpm / 2; // colcheias
    if (this.nextStepAt < this.ctx.currentTime) this.nextStepAt = this.ctx.currentTime + 0.05;
    while (this.nextStepAt < this.ctx.currentTime + 0.5) {
      this.composeStep(this.stepIdx, this.nextStepAt);
      this.stepIdx++;
      this.nextStepAt += stepDur;
    }
  };

  private isNight(): boolean {
    const h = new Date().getHours();
    return h < 6 || h >= 20;
  }

  /** Composição por passo — o coração das faixas originais. */
  private composeStep(step: number, when: number): void {
    if (!this.ctx || !this.musicGain) return;
    const tr = MUSIC_TRACKS[this.trackIdx];
    const chords = TRACK_CHORDS[tr.id] || TRACK_CHORDS.vale;
    const mel = TRACK_MEL[tr.id] || TRACK_MEL.vale;
    const chord = chords[Math.floor(step / 16) % chords.length];
    const s16 = step % 16;
    const night = this.isNight();
    const delay = Math.max(0, when - this.ctx.currentTime);
    const out = this.musicGain;

    // PAD — a cada compasso
    if (step % 16 === 0) {
      const padType: OscillatorType = tr.id === "neon" ? "sawtooth" : "triangle";
      chord.forEach((f, i) => {
        const v = (tr.id === "neon" ? 0.026 : 0.03) * (night ? 1.12 : 1);
        this.padNoteAt(f, 5.2, v, when, padType, out);
        if (i === 0) this.padNoteAt(f / 2, 5.2, v * 0.85, when, "sine", out);
      });
    }
    // BAIXO
    if (tr.id === "neon" || tr.id === "corrida") {
      if (step % 2 === 0) {
        const seq = [0, 1, 2, 1];
        const f = chord[seq[(step >> 1) % 4] % chord.length] / 2;
        this.tone(f, tr.id === "neon" ? 0.2 : 0.14, tr.id === "neon" ? "sawtooth" : "square", tr.id === "neon" ? 0.055 : 0.062, undefined, delay, out);
      }
    } else {
      if (s16 === 0) this.tone(chord[0] / 2, 0.6, "sine", tr.id === "floresta" ? 0.038 : 0.048, undefined, delay, out);
      if (s16 === 8) this.tone((chord[1] || chord[0]) / 2, 0.45, "sine", 0.036, undefined, delay, out);
    }
    // MELODIA — tabelas originais de 32 passos (0 = pausa)
    const f = mel[step % 32];
    if (f > 0) {
      const v = 0.05 * (night ? 0.82 : 1);
      if (tr.id === "floresta") {
        this.tone(f, 1.0, "sine", v, undefined, delay, out);
        this.tone(f * 2, 0.8, "sine", v * 0.32, undefined, delay, out); // sino com oitava
      } else if (tr.id === "blocos") {
        this.tone(f, 0.5, "triangle", v * 0.9, undefined, delay, out);
        this.tone(f * 1.002, 0.4, "sine", v * 0.3, undefined, delay, out);
      } else if (tr.id === "corrida") {
        this.tone(f, 0.13, "square", v * 0.85, undefined, delay, out);
      } else {
        this.tone(f, 0.3, "triangle", v, undefined, delay, out);
        this.tone(f * 1.004, 0.26, "sine", v * 0.4, undefined, delay, out);
      }
    }
    // PERCUSSÃO suave só na chiptune; sino raro na calma
    if (tr.id === "corrida") {
      if (step % 8 === 0) this.tone(72, 0.1, "sine", 0.075, 46, delay, out);
      if (step % 8 === 4) this.noiseAt(0.045, 0.03, 3400, delay, out);
    }
    if (tr.id === "blocos" && step % 32 === 30) this.tone(1568, 0.6, "sine", 0.018, undefined, delay, out);
    if (tr.id === "neon" && step % 4 === 2) this.noiseAt(0.03, 0.014, 5200, delay, out); // hats synthwave
  }

  getTrackIdx(): number { return this.trackIdx; }
  getMusicVol(): number { return this.musicVol; }
  trackInfo(): TrackDef { return MUSIC_TRACKS[this.trackIdx]; }

  setTrack(i: number): number {
    this.trackIdx = Math.max(0, Math.min(MUSIC_TRACKS.length - 1, i));
    try { localStorage.setItem("bateu_world_track", String(this.trackIdx)); } catch { /* ignore */ }
    if (this.musicStarted) {
      this.stepIdx = 0;
      this.nextStepAt = (this.ctx?.currentTime || 0) + 0.06;
    }
    return this.trackIdx;
  }
  nextTrack(): number { return this.setTrack((this.trackIdx + 1) % MUSIC_TRACKS.length); }
  prevTrack(): number { return this.setTrack((this.trackIdx - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length); }

  setMusicVol(v: number): void {
    this.musicVol = Math.max(0.05, Math.min(1, v));
    try { localStorage.setItem("bateu_world_vol", String(this.musicVol)); } catch { /* ignore */ }
    if (this.musicGain && this.ctx) {
      try { this.musicGain.gain.setTargetAtTime(0.13 * this.musicVol, this.ctx.currentTime, 0.12); } catch { /* ignore */ }
    }
  }

  /** v11: chuva contínua (ruído filtrado em loop) para o sistema de clima. */
  setRain(on: boolean): void {
    if (on) {
      if (this.rainNode || !this.ctx || !this.master || this.muted) return;
      try {
        const ctx = this.ctx!;
        const len = Math.floor(ctx.sampleRate * 2);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = "bandpass"; f.frequency.value = 950; f.Q.value = 0.55;
        const g = ctx.createGain();
        g.gain.value = 0;
        g.gain.setTargetAtTime(0.05, ctx.currentTime, 1.4);
        src.connect(f); f.connect(g); g.connect(this.master);
        src.start();
        this.rainNode = { src, gain: g };
      } catch { /* ignore */ }
    } else if (this.rainNode && this.ctx) {
      const { src, gain } = this.rainNode;
      this.rainNode = null;
      try {
        gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.9);
        setTimeout(() => { try { src.stop(); } catch { /* ignore */ } }, 3000);
      } catch { /* ignore */ }
    }
  }

  stopMusic(): void {
    if (this.schedTimer) { clearInterval(this.schedTimer); this.schedTimer = null; }
    if (this.musicTimer) { clearTimeout(this.musicTimer); this.musicTimer = null; }
    this.musicStarted = false;
    if (this.musicGain && this.ctx) {
      try { this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3); } catch { /* ignore */ }
      const g = this.musicGain;
      setTimeout(() => { try { g.disconnect(); } catch { /* ignore */ } }, 1500);
      this.musicGain = null;
    }
  }

  private padNoteAt(freq: number, dur: number, vol: number, when: number, type: OscillatorType, dest: GainNode): void {
    if (!this.ctx) return;
    const t0 = Math.max(this.ctx.currentTime, when);
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.3);   // ataque lento
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);       // release longo
    osc.connect(g); g.connect(dest);
    osc.start(t0); osc.stop(t0 + dur + 0.1);
  }

  private noiseAt(dur: number, vol: number, lowpass: number, delay: number, dest: GainNode): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = lowpass * 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t0);
  }
}

// ── v11: metadados das faixas originais (leitor do HUD) ──────
export interface TrackDef { id: string; name: string; emoji: string; bpm: number; desc: string }

export const MUSIC_TRACKS: TrackDef[] = [
  { id: "vale", name: "Amanhecer no Vale", emoji: "🌄", bpm: 84, desc: "Aventura serena para explorar o mundo" },
  { id: "blocos", name: "Blocos ao Vento", emoji: "🌿", bpm: 72, desc: "Calma contemplativa para construir e sonhar" },
  { id: "corrida", name: "Corrida do Ouro", emoji: "🏃", bpm: 126, desc: "Chiptune energética de arcada clássico" },
  { id: "neon", name: "Neon da Metrópole", emoji: "🌃", bpm: 100, desc: "Synthwave para noites na cidade" },
  { id: "floresta", name: "Coração da Floresta", emoji: "💚", bpm: 66, desc: "Mistério sagrado da Floresta Ancestral" },
];

// Progressões originais (Hz) — 4 acordes que rodam a cada compasso
const TRACK_CHORDS: Record<string, number[][]> = {
  vale: [
    [261.6, 329.6, 392.0], [196.0, 246.9, 293.7],
    [220.0, 261.6, 329.6], [174.6, 220.0, 261.6],
  ],
  blocos: [
    [261.6, 329.6, 392.0, 493.9], [220.0, 261.6, 329.6, 392.0],
    [174.6, 220.0, 261.6, 329.6], [196.0, 246.9, 293.7, 392.0],
  ],
  corrida: [
    [261.6, 329.6, 392.0], [196.0, 246.9, 293.7],
    [220.0, 261.6, 329.6], [174.6, 220.0, 349.2],
  ],
  neon: [
    [220.0, 261.6, 329.6], [174.6, 220.0, 261.6],
    [130.8, 164.8, 196.0], [196.0, 246.9, 293.7],
  ],
  floresta: [
    [146.8, 220.0, 293.7], [174.6, 261.6, 349.2],
    [110.0, 220.0, 261.6], [196.0, 293.7, 329.6],
  ],
};

// Melodias ORIGINAIS de 32 passos (compostas para o Bateu World;
// 0 = pausa) — nada de canções existentes.
const TRACK_MEL: Record<string, number[]> = {
  vale: [
    523, 0, 587, 659, 0, 784, 659, 587,
    523, 0, 392, 440, 0, 523, 440, 392,
    330, 0, 392, 440, 523, 0, 440, 392,
    349, 0, 392, 440, 392, 0, 330, 294,
  ],
  blocos: [
    392, 0, 0, 523, 0, 0, 440, 0,
    330, 0, 0, 392, 0, 0, 0, 0,
    349, 0, 0, 440, 0, 0, 523, 0,
    392, 0, 0, 330, 0, 0, 0, 0,
  ],
  corrida: [
    659, 0, 659, 0, 784, 0, 659, 587,
    523, 0, 523, 0, 587, 659, 587, 0,
    494, 0, 494, 0, 587, 0, 494, 440,
    392, 0, 440, 494, 523, 0, 587, 0,
  ],
  neon: [
    440, 0, 0, 0, 523, 0, 0, 659,
    0, 0, 587, 0, 523, 0, 0, 0,
    349, 0, 0, 0, 440, 0, 0, 523,
    0, 0, 494, 0, 392, 0, 0, 0,
  ],
  floresta: [
    587, 0, 0, 0, 0, 0, 880, 0,
    0, 0, 698, 0, 0, 0, 0, 0,
    523, 0, 0, 0, 0, 0, 784, 0,
    0, 0, 659, 0, 0, 0, 0, 0,
  ],
};

export const worldAudio = new WorldAudio();
