/**
 * worldMusic — música ambiente do Bateu World sem direitos de autor.
 *
 * Peças famosas em DOMÍNIO PÚBLICO (composição livre de direitos),
 * tocadas ao vivo por um pequeno sintetizador WebAudio — nenhum ficheiro
 * gravado, nenhuma licença necessária:
 *  1. "Für Elise" — Ludwig van Beethoven (1810)
 *  2. "Ode à Alegria" (9.ª Sinfonia) — Ludwig van Beethoven (1824)
 *  3. "Canon em Ré" — Johann Pachelbel (c. 1680)
 *
 * Timbre suave (sine + triangle com envelope) para ambiente relaxante.
 */

export interface TrackDef {
  id: string;
  name: string;
  author: string;
  bpm: number;
  /** [nota midi | null (pausa), duração em colcheias] */
  melody: [number | null, number][];
  bass: [number | null, number][];
}

const N = (n: number | null, d: number): [number | null, number] => [n, d];

// ── 1. FÜR ELISE (tema) ─────────────────────────────────────────────
const FUR_ELISE: TrackDef = {
  id: "furelise",
  name: "Für Elise",
  author: "Beethoven",
  bpm: 132,
  melody: [
    N(76, 1), N(75, 1), N(76, 1), N(75, 1), N(76, 1), N(71, 1), N(74, 1), N(72, 2),
    N(69, 2), N(null, 1), N(60, 1), N(64, 1), N(69, 1), N(71, 2), N(64, 1), N(68, 1), N(71, 2),
    N(72, 2), N(64, 1), N(69, 1), N(76, 1), N(75, 1), N(76, 1), N(75, 1), N(76, 1), N(71, 1),
    N(74, 1), N(72, 2), N(69, 2), N(null, 1), N(60, 1), N(64, 1), N(69, 1), N(71, 2), N(64, 1),
    N(72, 1), N(71, 2), N(69, 3), N(null, 1),
  ],
  bass: [
    N(45, 2), N(44, 2), N(45, 2), N(40, 2),
    N(41, 2), N(45, 2), N(44, 2), N(40, 2),
    N(41, 2), N(45, 2), N(40, 2), N(44, 2),
    N(45, 2), N(44, 2), N(45, 2), N(40, 2),
    N(41, 2), N(45, 2), N(44, 2), N(40, 2),
  ],
};

// ── 2. ODE À ALEGRIA (tema) ─────────────────────────────────────────
const ODE_A_ALEGRIA: TrackDef = {
  id: "odealegria",
  name: "Ode à Alegria",
  author: "Beethoven",
  bpm: 124,
  melody: [
    N(72, 1), N(72, 1), N(73, 1), N(75, 1), N(75, 1), N(73, 1), N(72, 1), N(71, 1),
    N(69, 2), N(69, 1), N(71, 1), N(72, 2), N(72, 1), N(71, 1), N(71, 2),
    N(69, 2), N(null, 1), N(72, 1), N(72, 1), N(73, 1), N(75, 1),
    N(75, 1), N(73, 1), N(72, 1), N(71, 1), N(69, 2), N(69, 1), N(71, 1),
    N(72, 2), N(71, 1), N(73, 1), N(71, 2), N(69, 2), N(null, 2),
  ],
  bass: [
    N(48, 2), N(48, 2), N(53, 2), N(53, 2),
    N(55, 2), N(43, 2), N(48, 2), N(43, 2),
    N(48, 2), N(48, 2), N(53, 2), N(53, 2),
    N(55, 2), N(43, 2), N(48, 2), N(48, 2),
  ],
};

// ── 3. CANON EM RÉ (progressão famosa) ──────────────────────────────
const CANON_D: TrackDef = {
  id: "canond",
  name: "Canon em Ré",
  author: "Pachelbel",
  bpm: 108,
  melody: [
    N(74, 2), N(78, 2), N(81, 2), N(78, 2),
    N(79, 2), N(74, 2), N(71, 2), N(74, 2),
    N(76, 2), N(73, 2), N(70, 2), N(73, 2),
    N(74, 2), N(78, 2), N(81, 2), N(78, 2),
    N(79, 2), N(83, 2), N(86, 2), N(83, 2),
    N(85, 2), N(80, 2), N(77, 2), N(80, 2),
  ],
  bass: [
    N(38, 2), N(45, 2), N(50, 2), N(45, 2),
    N(43, 2), N(50, 2), N(55, 2), N(50, 2),
    N(41, 2), N(48, 2), N(53, 2), N(48, 2),
    N(38, 2), N(45, 2), N(50, 2), N(45, 2),
  ],
};

export const TRACKS: TrackDef[] = [FUR_ELISE, ODE_A_ALEGRIA, CANON_D];

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class WorldMusic {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private trackIdx = 0;
  private pos = 0;          // colcheias decorridas da pista
  private bassPos = 0;
  private nextT = 0;        // tempo de áudio do próximo evento
  playing = false;
  volume = 0.5;

  /**olume 0..1 */
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume * 0.5, this.ctx.currentTime, 0.1);
  }

  get track(): TrackDef { return TRACKS[this.trackIdx]; }

  toggle(): boolean {
    if (this.playing) this.stop();
    else this.start();
    return this.playing;
  }

  next(): void {
    this.trackIdx = (this.trackIdx + 1) % TRACKS.length;
    this.pos = 0; this.bassPos = 0;
    if (this.playing && this.ctx) this.nextT = this.ctx.currentTime + 0.06;
  }

  prev(): void {
    this.trackIdx = (this.trackIdx - 1 + TRACKS.length) % TRACKS.length;
    this.pos = 0; this.bassPos = 0;
    if (this.playing && this.ctx) this.nextT = this.ctx.currentTime + 0.06;
  }

  start(): void {
    if (this.playing) return;
    this.playing = true; // mesmo sem dispositivo de áudio, o "tocador" fica ativo
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume * 0.5;
        // eco suave para ambiente
        const delay = this.ctx.createDelay(0.6);
        delay.delayTime.value = 0.34;
        const fb = this.ctx.createGain(); fb.gain.value = 0.22;
        const wet = this.ctx.createGain(); wet.gain.value = 0.18;
        this.master.connect(this.ctx.destination);
        this.master.connect(delay);
        delay.connect(fb); fb.connect(delay);
        delay.connect(wet); wet.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      this.nextT = this.ctx.currentTime + 0.08;
    } catch { /* sem áudio no dispositivo — fica mudo mas "a tocar" */ }
    this.timer = window.setInterval(() => this.schedule(), 120);
  }

  stop(): void {
    this.playing = false;
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
  }

  dispose(): void {
    this.stop();
    try { this.ctx?.close(); } catch { /* ignora */ }
    this.ctx = null; this.master = null;
  }

  /** agenda notas até ~0.5s à frente */
  private schedule(): void {
    if (!this.ctx || !this.master || !this.playing) return;
    const tr = this.track;
    const eighth = 60 / tr.bpm / 2; // duração de 1 colcheia
    const horizon = this.ctx.currentTime + 0.5;
    while (this.nextT < horizon) {
      const t = this.nextT;
      // melodia
      const [mn, md] = tr.melody[this.pos % tr.melody.length];
      if (mn !== null) this.note(midiToHz(mn), t, md * eighth * 0.92, "triangle", 0.30);
      this.pos += md;
      // baixo (avança no seu próprio relógio)
      const [bn, bd] = tr.bass[this.bassPos % tr.bass.length];
      if (bn !== null) this.note(midiToHz(bn), t, bd * eighth * 0.9, "sine", 0.22);
      this.bassPos += bd;
      this.nextT += eighth;
    }
  }

  private note(hz: number, at: number, dur: number, type: OscillatorType, vol: number): void {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = hz;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.025);
    g.gain.setTargetAtTime(0.0001, at + dur * 0.6, 0.09);
    o.connect(g); g.connect(this.master);
    o.start(at); o.stop(at + dur + 0.35);
  }
}
