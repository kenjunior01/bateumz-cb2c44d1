// ============================================================
// CIDADE BATEU — Ambiente sonoro da cidade (v38)
// 100% sintetizado em WebAudio (padrão do motor: zero assets externos):
//  · pássaros de dia (chirps com varredura de frequência)
//  · grilos à noite (oscilador pulsado ~4,2 kHz)
//  · brisa suave constante (ruído filtrado)
// O motor já tem chuva/trovão próprios (engine.ts:873-886) — este módulo
// NÃO duplica: os pássaros silenciam com a chuva, os grilos ficam.
// Nota de estudo: o Veloren tem áudio ambiente por bioma no voxygen
// (crates não incluídos no clone esparso) — padrão citado com reserva,
// implementação inteiramente nossa.
// ============================================================

type Ctx = AudioContext;

export interface EstadoAmbiente {
  ativo: boolean;
  noite: boolean;
  chuva: number; // 0..1
}

export class AmbienteSonoro {
  private ctx: Ctx | null = null;
  private mestre: GainNode | null = null;
  private gBrisa: GainNode | null = null;
  private gGrilos: GainNode | null = null;
  private oscGrilos: OscillatorNode | null = null;
  private lfoGrilos: OscillatorNode | null = null;
  private ativo_ = false;
  private noite_ = false;
  private chuva_ = 0;
  private mudo_ = false;
  private proximoChirp = 0; // timestamp de performance.now()
  private timer: number | null = null;

  /** Liga (precisa de um gesto do utilizador — o botão Entrar serve). */
  ligar() {
    if (this.ctx) { void this.ctx.resume(); this.ativo_ = true; return; }
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return; // sem WebAudio — cidade silenciosa, honesto
      this.ctx = new AC();
      const ctx = this.ctx;
      this.mestre = ctx.createGain();
      this.mestre.gain.value = this.mudo_ ? 0 : 0.9;
      this.mestre.connect(ctx.destination);

      // brisa: ruído 2 s em loop → lowpass 380 Hz → ganho baixo
      const dur = 2, sr = ctx.sampleRate;
      const buf = ctx.createBuffer(1, sr * dur, sr);
      const dados = buf.getChannelData(0);
      let u = 0;
      for (let i = 0; i < dados.length; i++) { u = (u * 0.97) + (Math.random() * 2 - 1) * 0.03; dados[i] = u * 4; }
      const ruido = ctx.createBufferSource();
      ruido.buffer = buf; ruido.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 380;
      this.gBrisa = ctx.createGain(); this.gBrisa.gain.value = 0.05;
      ruido.connect(lp); lp.connect(this.gBrisa); this.gBrisa.connect(this.mestre);
      ruido.start();

      // grilos: oscilador 4,2 kHz pulsado por LFO 22 Hz (padrão "chirp contínuo")
      this.oscGrilos = ctx.createOscillator();
      this.oscGrilos.type = "triangle"; this.oscGrilos.frequency.value = 4200;
      this.lfoGrilos = ctx.createOscillator();
      this.lfoGrilos.type = "square"; this.lfoGrilos.frequency.value = 22;
      const gLfo = ctx.createGain(); gLfo.gain.value = 0.5;
      this.gGrilos = ctx.createGain(); this.gGrilos.gain.value = 0; // ligado só à noite
      this.lfoGrilos.connect(gLfo); gLfo.connect(this.gGrilos.gain);
      this.oscGrilos.connect(this.gGrilos); this.gGrilos.connect(this.mestre);
      this.oscGrilos.start(); this.lfoGrilos.start();

      this.ativo_ = true;
      this.programarChirps();
    } catch { /* WebAudio indisponível — silêncio honesto */ }
  }

  parar() {
    this.ativo_ = false;
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    try { void this.ctx?.close(); } catch { /* já fechado */ }
    this.ctx = null; this.mestre = null; this.gBrisa = null;
    this.gGrilos = null; this.oscGrilos = null; this.lfoGrilos = null;
  }

  alternarMudo(): boolean {
    this.mudo_ = !this.mudo_;
    if (this.mestre && this.ctx) this.mestre.gain.setTargetAtTime(this.mudo_ ? 0 : 0.9, this.ctx.currentTime, 0.1);
    return this.mudo_;
  }

  get mudo() { return this.mudo_; }
  get ativo() { return this.ativo_; }

  /** Atualiza alvos (chamado a cada frame da página; barato). */
  passo(noite: boolean, chuva: number) {
    this.noite_ = noite;
    this.chuva_ = Math.max(0, Math.min(1, chuva));
    if (!this.ctx || !this.mestre) return;
    const t = this.ctx.currentTime;
    // grilos: só à noite; chuva abafa um pouco
    this.gGrilos?.gain.setTargetAtTime(noite ? 0.012 * (1 - this.chuva_ * 0.5) : 0, t, 1.2);
    // brisa: mais forte com chuva
    this.gBrisa?.gain.setTargetAtTime(0.05 + this.chuva_ * 0.05, t, 1.5);
  }

  /** Agendador de chirps de pássaros (só de dia, sem chuva forte). */
  private programarChirps() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      if (this.ativo_ && this.ctx && !this.noite_ && this.chuva_ < 0.45) this.chirp();
      const proximo = 2400 + Math.random() * 4600;
      this.proximoChirp = performance.now() + proximo;
      this.programarChirps();
    }, 2400 + Math.random() * 4600);
  }

  /** Um chirp: 2–4 sílabas com varredura de frequência (síntese, zero assets). */
  private chirp() {
    const ctx = this.ctx, mestre = this.mestre;
    if (!ctx || !mestre) return;
    const t0 = ctx.currentTime + 0.05;
    const silabas = 2 + Math.floor(Math.random() * 3);
    const tom = 2300 + Math.random() * 900;
    for (let s = 0; s < silabas; s++) {
      const ts = t0 + s * 0.16;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(tom, ts);
      osc.frequency.exponentialRampToValueAtTime(tom * 1.35, ts + 0.06);
      osc.frequency.exponentialRampToValueAtTime(tom * 0.9, ts + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ts);
      g.gain.linearRampToValueAtTime(0.035, ts + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ts + 0.14);
      osc.connect(g); g.connect(mestre);
      osc.start(ts); osc.stop(ts + 0.16);
    }
  }

  /** Estado para ganchos E2E (nunca inventado: reflete o AudioContext real). */
  estado(): EstadoAmbiente {
    return { ativo: this.ativo_ && this.ctx !== null, noite: this.noite_, chuva: this.chuva_ };
  }
}
