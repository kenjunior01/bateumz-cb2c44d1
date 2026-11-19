// ============================================================
// MOTOR DE SOM — v67 (BateuKart; os predefinidos «arena*» ficaram
// inativos desde a v68 — o BATEU RPG foi removido da plataforma)
// ────────────────────────────────────────────────────────────
// 100% SINTETIZADO com Web Audio — ZERO assets externos (nada
// para descarregar, nada para licenciar, funciona offline e no
// APK). Todos os efeitos e as músicas nascem de osciladores +
// ruído + envelopes.
//
// Regras da casa:
// · SEGURO EM NODE — nada de window/AudioContext no topo do
//   módulo (as suítes importam-no sem browser); tudo o que toca
//   é no-op honesto sem contexto e continua a REGISTAR o que
//   tocaria (ultimos/estadoLoops — instrumentação honesta).
// · AUTOPLAY — o AudioContext só nasce no `despertar()`, que os
//   componentes chamam dentro de um GESTO do utilizador
//   (pointerdown/click). `despertar()` é idempotente.
// · MUDO persistido no aparelho (`bateu_som` = "1"/"0").
// · O motor de jogo NÃO conhece esta classe diretamente — recebe
//   um adaptador de ganchos (SomKart) e o React é quem liga o
//   singleton `somGlobal()` aos ganchos (padrão: lógica no core,
//   UI/no React).
//
// Loops: MOTOR do kart (pitch pela velocidade), DERRAPAGEM
// (ruído filtrado) e MÚSICA procedural (sequenciador com
// look-ahead — tema do menu, tema de corrida, ambiente da arena).
// ============================================================

// ── ids de efeitos (tabela fechada — o teste prova que TODOS tocam) ──
export type SomId =
  | "ui"          // clique de interface
  | "moeda"       // moeda recolhida (kart)
  | "item"        // caixa «?» rebenta + revelação do item
  | "casca" | "cascaAlvo" | "missil" | "oleo" | "raio" | "escudo" | "cogumelo" // usos
  | "turbo1" | "turbo2" // mini-turbo (deriva)
  | "rampa"       // rampa de turbo
  | "golpe"       // EU fui atingido
  | "acerto"      // o MEU projétil acertou alguém
  | "contrario"   // sentido contrário (zumbido)
  | "contagem"    // beep 3/2/1
  | "ja"          // «JÁ!» da largada
  | "chegada"     // EU terminei (fanfarra)
  | "podio"       // v69: pódio (1.º/2.º/3.º lugar) — fanfarra triunfal
  | "recorde"     // recorde da pista
  | "arenaGolpe"  // EU recebi dano (arena)
  | "arenaAcerto" // o MEU golpe acertou um mob/herói
  | "arenaCast"   // habilidade lançada
  | "arenaMorte"  // EU morri
  | "arenaAbate"  // EU abati (mob ou herói)
  | "arenaNivel"  // subi de nível
  | "arenaCura"   // cura recebida
  | "arenaRespawn" // renasci
  | "arenaChat"   // mensagem nova no chat
  | "erro";       // erro genérico (cd/mana/contrário)

export const IDS_SOM: SomId[] = [
  "ui", "moeda", "item",
  "casca", "cascaAlvo", "missil", "oleo", "raio", "escudo", "cogumelo",
  "turbo1", "turbo2", "rampa", "golpe", "acerto", "contrario",
  "contagem", "ja", "chegada", "podio", "recorde",
  "arenaGolpe", "arenaAcerto", "arenaCast", "arenaMorte", "arenaAbate",
  "arenaNivel", "arenaCura", "arenaRespawn", "arenaChat", "erro",
];

export const CHAVE_SOM = "bateu_som";

// ── ganchos que o MotorKart recebe (adaptador fino) ──────────
export interface SomKart {
  motor(velNorm: number, acelerando: boolean): void;
  derrapagem(forca: number): void;
  beep(indice: number): void; // 3/2/1 → «contagem» · 0 → «ja»
  evento(ev: { t: string; id?: number; item?: string; fase?: number; por?: number; alvo?: number }, meuId: number): void;
  chegada(): void;
}

type TipoMusica = "menu" | "corrida" | "praia" | "deserto" | "vulcao" | "batalha" | "arena" | null;

// ── padrões musicais (midi; 0 = pausa) ────────────────────────
const NOTA = {
  menu: {
    bpm: 132,
    baixo: [36, 0, 36, 0, 33, 0, 36, 0, 29, 0, 29, 0, 31, 0, 35, 0],
    guia: [76, 0, 79, 0, 81, 0, 79, 0, 76, 0, 74, 0, 72, 0, 74, 0],
    bateria: 4, // kick a cada N passos
  },
  corrida: {
    bpm: 148,
    baixo: [36, 36, 0, 36, 36, 0, 33, 0, 29, 29, 0, 29, 31, 0, 31, 31],
    guia: [72, 0, 76, 79, 0, 81, 79, 76, 72, 0, 74, 76, 0, 79, 76, 74],
    bateria: 4,
  },
  praia: {
    bpm: 126, // v69: tropical maior — relaxado e salgado
    baixo: [36, 0, 43, 0, 36, 0, 40, 0, 38, 0, 45, 0, 38, 0, 40, 0],
    guia: [79, 0, 83, 84, 0, 79, 0, 76, 77, 0, 81, 0, 84, 0, 79, 0],
    bateria: 4,
  },
  deserto: {
    bpm: 142, // v69: frígio (D) — seco e agressivo
    baixo: [38, 0, 38, 38, 0, 39, 0, 38, 34, 0, 34, 34, 36, 0, 37, 0],
    guia: [74, 0, 77, 0, 75, 0, 74, 0, 70, 0, 72, 0, 73, 0, 74, 0],
    bateria: 4,
  },
  vulcao: {
    bpm: 152, // v69: menor (A) — escuro e martelado
    baixo: [33, 33, 0, 33, 0, 33, 31, 0, 29, 29, 0, 29, 31, 0, 32, 0],
    guia: [69, 0, 72, 76, 0, 72, 69, 0, 65, 0, 68, 72, 0, 76, 75, 72],
    bateria: 2,
  },
  batalha: {
    bpm: 160, // v69: tensão diminuta — o Coliseu pulsa
    baixo: [36, 0, 36, 39, 0, 36, 38, 0, 36, 0, 36, 39, 0, 36, 38, 40],
    guia: [72, 0, 75, 78, 0, 75, 72, 0, 74, 0, 77, 80, 0, 77, 74, 0],
    bateria: 4,
  },
  arena: {
    bpm: 72,
    // acordes longos (meia-lua): Cmaj → Amin
    baixo: [48, 0, 0, 0, 0, 0, 0, 0, 45, 0, 0, 0, 0, 0, 0, 0],
    guia: [64, 0, 0, 67, 0, 0, 72, 0, 60, 0, 0, 64, 0, 0, 69, 0],
    bateria: 0, // sem bateria — ambiente
  },
} as const;

const MIDI_FREQ = 440 * Math.pow(2, 1 / 12);

function freqMidi(n: number): number {
  return MIDI_FREQ * Math.pow(2, (n - 69) / 12);
}

// ═══════════════════════════════════════════════════════════════
export class MotorSom {
  private ctx: AudioContext | null = null;
  private mestre: GainNode | null = null;
  private ganhoMusica: GainNode | null = null;
  private ganhoMotor: GainNode | null = null;
  private ganhoDerrapa: GainNode | null = null;
  private oscMotor1: OscillatorNode | null = null;
  private oscMotor2: OscillatorNode | null = null;
  private filtroMotor: BiquadFilterNode | null = null;
  private filtroDerrapa: BiquadFilterNode | null = null;
  private bufRuido: AudioBuffer | null = null;
  private mudo = false;
  private musicaTipo: TipoMusica = null;
  private temporizadorMusica: number | null = null;
  private passoMusica = 0;
  private proximoTempo = 0;
  // instrumentação honesta (testes + depuração)
  readonly ultimos: SomId[] = [];
  private velNormUlt = 0;
  private derrapaUlt = 0;

  constructor() {
    try { this.mudo = (typeof localStorage !== "undefined" && localStorage.getItem(CHAVE_SOM) === "1"); } catch { /* sem storage — honesto */ }
  }

  // ── ciclo de vida ──────────────────────────────────────────────
  /** Nasce DENTRO de um gesto do utilizador (política de autoplay). Idempotente. */
  despertar(): void {
    if (typeof window === "undefined" || typeof AudioContext === "undefined") return;
    if (!this.ctx) {
      const AC: typeof AudioContext = window.AudioContext;
      this.ctx = new AC();
      this.mestre = this.ctx.createGain();
      this.mestre.gain.value = this.mudo ? 0 : 1;
      this.mestre.connect(this.ctx.destination);

      this.ganhoMusica = this.ctx.createGain();
      this.ganhoMusica.gain.value = 0.15;
      this.ganhoMusica.connect(this.mestre);

      // ruído reutilizável (2 s)
      const dur = 2;
      this.bufRuido = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
      const dados = this.bufRuido.getChannelData(0);
      for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;

      // loop do MOTOR (2 serras desafinadas → passa-baixo)
      this.ganhoMotor = this.ctx.createGain();
      this.ganhoMotor.gain.value = 0;
      this.filtroMotor = this.ctx.createBiquadFilter();
      this.filtroMotor.type = "lowpass";
      this.filtroMotor.frequency.value = 400;
      this.oscMotor1 = this.ctx.createOscillator();
      this.oscMotor1.type = "sawtooth";
      this.oscMotor1.frequency.value = 56;
      this.oscMotor2 = this.ctx.createOscillator();
      this.oscMotor2.type = "sawtooth";
      this.oscMotor2.frequency.value = 57;
      this.oscMotor2.detune.value = 8;
      this.oscMotor1.connect(this.filtroMotor);
      this.oscMotor2.connect(this.filtroMotor);
      this.filtroMotor.connect(this.ganhoMotor);
      this.ganhoMotor.connect(this.mestre);
      this.oscMotor1.start();
      this.oscMotor2.start();

      // loop da DERRAPAGEM (ruído → passa-banda)
      this.ganhoDerrapa = this.ctx.createGain();
      this.ganhoDerrapa.gain.value = 0;
      this.filtroDerrapa = this.ctx.createBiquadFilter();
      this.filtroDerrapa.type = "bandpass";
      this.filtroDerrapa.frequency.value = 950;
      this.filtroDerrapa.Q.value = 0.8;
      const srcDerrapa = this.ctx.createBufferSource();
      srcDerrapa.buffer = this.bufRuido;
      srcDerrapa.loop = true;
      srcDerrapa.connect(this.filtroDerrapa);
      this.filtroDerrapa.connect(this.ganhoDerrapa);
      this.ganhoDerrapa.connect(this.mestre);
      srcDerrapa.start();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    // retoma a música pedida antes do 1.º gesto
    if (this.musicaTipo) this.ligarMusica(this.musicaTipo);
  }

  vivo(): boolean {
    return this.ctx !== null && this.ctx.state !== "closed";
  }

  destruir(): void {
    this.pararLoops();
    this.ligarMusica(null);
  }

  // ── mudo ───────────────────────────────────────────────────────
  definirMudo(v: boolean): void {
    this.mudo = v;
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(CHAVE_SOM, v ? "1" : "0");
    } catch { /* sem storage — honesto */ }
    if (this.mestre && this.ctx) {
      this.mestre.gain.setTargetAtTime(v ? 0 : 1, this.ctx.currentTime, 0.03);
    }
    // ao desilenciar, retoma a música pedida (o sequenciador não corre em mudo)
    if (!v && this.musicaTipo) this.ligarMusica(this.musicaTipo);
  }
  estaMudo(): boolean { return this.mudo; }

  // ── efeitos ────────────────────────────────────────────────────
  tocar(id: SomId, vol = 1): void {
    // registar SEMPRE (Node incluído — instrumentação honesta)
    this.ultimos.push(id);
    if (this.ultimos.length > 24) this.ultimos.shift();
    if (!this.ctx || !this.mestre || this.mudo) return;
    const t0 = this.ctx.currentTime;
    switch (id) {
      case "ui":
        this.tom(t0, 660, "sine", 0.05, 0.35 * vol);
        this.tom(t0 + 0.03, 880, "sine", 0.05, 0.18 * vol);
        break;
      case "moeda":
        this.tom(t0, 988, "square", 0.07, 0.22 * vol);
        this.tom(t0 + 0.07, 1319, "square", 0.16, 0.22 * vol);
        break;
      case "item": // caixa «?» REBENTA (estilhaço + varrimento) e revela o item (arpejo)
        this.ruido(t0, 0.08, 0.28 * vol, "highpass", 3200);
        this.tom(t0, 520, "triangle", 0.1, 0.28 * vol, 1200);
        this.tom(t0 + 0.09, 392, "sine", 0.09, 0.28 * vol);
        this.tom(t0 + 0.16, 523, "sine", 0.1, 0.28 * vol);
        this.tom(t0 + 0.23, 659, "sine", 0.14, 0.28 * vol);
        break;
      case "casca":
        this.ruido(t0, 0.26, 0.4 * vol, "bandpass", 2600, 700, 1.2);
        this.tom(t0, 300, "sawtooth", 0.12, 0.12 * vol, 120);
        break;
      case "cascaAlvo":
        this.tom(t0, 1180, "sine", 0.06, 0.3 * vol);
        this.tom(t0 + 0.09, 1180, "sine", 0.06, 0.3 * vol);
        this.ruido(t0 + 0.18, 0.24, 0.38 * vol, "bandpass", 2600, 700, 1.2);
        break;
      case "missil":
        this.tom(t0, 130, "sawtooth", 0.4, 0.4 * vol, 62);
        this.ruido(t0, 0.35, 0.4 * vol, "lowpass", 900, 250);
        break;
      case "oleo":
        this.tom(t0, 210, "sine", 0.2, 0.4 * vol, 72);
        this.ruido(t0 + 0.02, 0.16, 0.3 * vol, "lowpass", 520);
        break;
      case "raio":
        for (let i = 0; i < 6; i++) this.tom(t0 + i * 0.05, 880 + i * 170, "square", 0.045, 0.2 * vol);
        this.ruido(t0, 0.4, 0.3 * vol, "highpass", 1800);
        break;
      case "escudo":
        this.tom(t0, 523, "triangle", 0.4, 0.22 * vol);
        this.tom(t0, 659, "triangle", 0.4, 0.2 * vol);
        this.tom(t0 + 0.05, 784, "triangle", 0.48, 0.18 * vol);
        break;
      case "cogumelo":
        this.tom(t0, 300, "sine", 0.2, 0.4 * vol, 760);
        break;
      case "turbo1":
        this.ruido(t0, 0.24, 0.36 * vol, "bandpass", 1200, 2400, 0.9);
        this.tom(t0, 440, "sawtooth", 0.2, 0.14 * vol, 880);
        break;
      case "turbo2":
        this.ruido(t0, 0.34, 0.5 * vol, "bandpass", 900, 3200, 0.9);
        this.tom(t0, 440, "sawtooth", 0.3, 0.22 * vol, 1240);
        break;
      case "rampa":
        this.tom(t0, 330, "sine", 0.18, 0.3 * vol, 880);
        break;
      case "golpe":
        this.tom(t0, 170, "square", 0.24, 0.45 * vol, 58);
        this.ruido(t0, 0.14, 0.42 * vol, "lowpass", 720);
        break;
      case "acerto":
        this.tom(t0, 220, "square", 0.11, 0.32 * vol, 88);
        this.ruido(t0, 0.08, 0.3 * vol, "lowpass", 950);
        break;
      case "contrario":
        this.tom(t0, 150, "square", 0.22, 0.24 * vol);
        this.tom(t0 + 0.26, 150, "square", 0.22, 0.24 * vol);
        break;
      case "contagem":
        this.tom(t0, 440, "square", 0.13, 0.34 * vol);
        break;
      case "ja":
        this.tom(t0, 880, "square", 0.4, 0.4 * vol);
        this.tom(t0, 1760, "sine", 0.3, 0.14 * vol);
        break;
      case "chegada":
        [523, 659, 784, 1047].forEach((f, i) => this.tom(t0 + i * 0.11, f, "triangle", 0.14, 0.3 * vol));
        this.tom(t0 + 0.44, 1047, "triangle", 0.5, 0.26 * vol);
        this.tom(t0 + 0.44, 1319, "sine", 0.5, 0.14 * vol);
        break;
      case "podio": // v69: fanfarra TRIUNFAL (acorde final aberto + brilho)
        [392, 523, 659, 784].forEach((f, i) => this.tom(t0 + i * 0.13, f, "triangle", 0.16, 0.28 * vol));
        [523, 659, 784, 1047].forEach((f) => { this.tom(t0 + 0.55, f, "triangle", 0.85, 0.2 * vol); this.tom(t0 + 0.55, f * 2, "sine", 0.7, 0.08 * vol); });
        this.ruido(t0 + 0.52, 0.4, 0.14 * vol, "highpass", 5200);
        break;
      case "recorde":
        [784, 988, 1175, 1568, 2093].forEach((f, i) => this.tom(t0 + i * 0.07, f, "sine", 0.12, 0.22 * vol));
        break;
      case "arenaGolpe":
        this.tom(t0, 140, "sine", 0.12, 0.4 * vol, 70);
        this.ruido(t0, 0.1, 0.4 * vol, "lowpass", 820);
        break;
      case "arenaAcerto":
        this.ruido(t0, 0.09, 0.34 * vol, "lowpass", 1100);
        this.tom(t0, 190, "square", 0.08, 0.2 * vol, 95);
        break;
      case "arenaCast":
        this.tom(t0, 500, "sine", 0.15, 0.28 * vol, 980);
        this.ruido(t0 + 0.02, 0.11, 0.16 * vol, "highpass", 3000);
        break;
      case "arenaMorte":
        this.tom(t0, 392, "sawtooth", 0.55, 0.3 * vol, 98);
        this.tom(t0, 196, "sine", 0.55, 0.22 * vol, 49);
        break;
      case "arenaAbate":
        this.tom(t0, 660, "triangle", 0.1, 0.32 * vol);
        this.tom(t0 + 0.1, 990, "triangle", 0.2, 0.34 * vol);
        break;
      case "arenaNivel":
        [523, 659, 784, 1047].forEach((f, i) => this.tom(t0 + i * 0.1, f, "triangle", 0.13, 0.3 * vol));
        this.tom(t0 + 0.4, 1319, "sine", 0.3, 0.2 * vol);
        break;
      case "arenaCura":
        this.tom(t0, 660, "sine", 0.24, 0.2 * vol, 880);
        break;
      case "arenaRespawn":
        this.tom(t0, 200, "sine", 0.4, 0.22 * vol, 800);
        break;
      case "arenaChat":
        this.tom(t0, 1050, "sine", 0.05, 0.22 * vol);
        break;
      case "erro":
        this.tom(t0, 120, "square", 0.15, 0.22 * vol);
        break;
    }
  }

  // ── loops do kart (chamados por FRAME pelo MotorKart) ─────────
  motorKart(velNorm: number, acelerando: boolean): void {
    const vn = Math.max(0, Math.min(1, velNorm));
    this.velNormUlt = vn; // regista SEMPRE (instrumentação honesta, mesmo mudo/sem ctx)
    if (!this.ctx || !this.oscMotor1 || !this.oscMotor2 || !this.ganhoMotor || !this.filtroMotor || this.mudo) return;
    const t = this.ctx.currentTime;
    const f = 56 + vn * 196;
    this.oscMotor1.frequency.setTargetAtTime(f, t, 0.07);
    this.oscMotor2.frequency.setTargetAtTime(f * 1.006, t, 0.07);
    this.filtroMotor.frequency.setTargetAtTime(380 + vn * 950, t, 0.09);
    const g = vn <= 0.001 ? 0 : 0.05 + vn * 0.15 + (acelerando ? 0.05 : 0);
    this.ganhoMotor.gain.setTargetAtTime(g, t, 0.07);
  }

  derrapagem(forca: number): void {
    const f = Math.max(0, Math.min(1, forca));
    this.derrapaUlt = f; // regista SEMPRE (idem)
    if (!this.ctx || !this.ganhoDerrapa || !this.filtroDerrapa || this.mudo) return;
    const t = this.ctx.currentTime;
    this.ganhoDerrapa.gain.setTargetAtTime(f <= 0.001 ? 0 : f * 0.24, t, 0.04);
    if (f > 0.001) this.filtroDerrapa.frequency.setTargetAtTime(700 + f * 520, t, 0.06);
  }

  pararLoops(): void {
    if (this.ctx && this.ganhoMotor) this.ganhoMotor.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    if (this.ctx && this.ganhoDerrapa) this.ganhoDerrapa.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    this.velNormUlt = 0;
    this.derrapaUlt = 0;
  }

  ultimoVelNorm(): number { return this.velNormUlt; }
  ultimoDerrapa(): number { return this.derrapaUlt; }

  // ── música procedural (sequenciador com look-ahead) ────────────
  musica(tipo: TipoMusica): void {
    this.musicaTipo = tipo;
    this.ligarMusica(tipo);
  }
  musicaActual(): TipoMusica { return this.musicaTipo; }

  private ligarMusica(tipo: TipoMusica): void {
    if (this.temporizadorMusica !== null) {
      window.clearInterval(this.temporizadorMusica);
      this.temporizadorMusica = null;
    }
    if (!tipo || !this.ctx || !this.ganhoMusica || this.mudo) return;
    this.passoMusica = 0;
    this.proximoTempo = this.ctx.currentTime + 0.06;
    const def = NOTA[tipo];
    const durPasso = 60 / def.bpm / 2; // colcheias
    this.temporizadorMusica = window.setInterval(() => {
      if (!this.ctx || !this.ganhoMusica) return;
      const horizonte = this.ctx.currentTime + 0.35;
      while (this.proximoTempo < horizonte) {
        this.tocarPasso(tipo, this.passoMusica, this.proximoTempo, durPasso);
        this.passoMusica = (this.passoMusica + 1) % 16;
        this.proximoTempo += durPasso;
      }
    }, 110);
  }

  private tocarPasso(tipo: Exclude<TipoMusica, null>, passo: number, t: number, dur: number): void {
    const def = NOTA[tipo];
    const b = def.baixo[passo];
    // v69: timbres por tema — deserto/vulcão AGRESSIVOS (serra), praia macia, batalha tensa
    const ondaBaixo: OscillatorType = tipo === "deserto" || tipo === "vulcao" ? "sawtooth"
      : tipo === "batalha" ? "square" : "triangle";
    const ondaGuia: OscillatorType = tipo === "praia" ? "sine"
      : tipo === "batalha" || tipo === "vulcao" ? "sawtooth" : "square";
    const volBaixo = tipo === "arena" ? 0.16 : (tipo === "deserto" || tipo === "vulcao") ? 0.17 : 0.2;
    if (b > 0) this.tom(t, freqMidi(b), ondaBaixo, dur * (tipo === "arena" ? 14 : 1.7), volBaixo, undefined, this.ganhoMusica!);
    const g = def.guia[passo];
    if (g > 0) this.tom(t, freqMidi(g), ondaGuia, dur * (tipo === "arena" ? 6 : 1.4), tipo === "arena" ? 0.1 : 0.1, undefined, this.ganhoMusica!);
    if (def.bateria > 0 && passo % def.bateria === 0) {
      // kick sintético (serra grave com queda) — vulcão/batalha mais GRAVES
      const kickF = tipo === "vulcao" || tipo === "batalha" ? 88 : 110;
      this.tom(t, kickF, "sine", 0.1, 0.24, 42, this.ganhoMusica!);
    }
    if ((tipo === "corrida" || tipo === "batalha") && (passo % 2 === 1)) {
      // chapéu curto nos contratempos
      this.ruido(t, 0.03, 0.1, "highpass", 6000, undefined, undefined, this.ganhoMusica!);
    }
    if (tipo === "praia" && passo % 8 === 6) {
      // onda do mar (ruído filtrado suave — o tema tropical RESPIRA)
      this.ruido(t, 0.28, 0.05, "bandpass", 900, 500, 0.7, this.ganhoMusica!);
    }
    if (tipo === "vulcao" && passo % 8 === 4) {
      // rumble profundo (o chão TREME)
      this.tom(t, 55, "sine", 0.3, 0.14, 40, this.ganhoMusica!);
    }
  }

  // ── primitivas ─────────────────────────────────────────────────
  private tom(t: number, freq: number, tipo: OscillatorType, dur: number, vol: number,
    sweep?: number, destino?: AudioNode): void {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = tipo;
    o.frequency.setValueAtTime(Math.max(20, freq), t);
    if (sweep !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(20, sweep), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(destino ?? this.mestre!);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  private ruido(t: number, dur: number, vol: number, filtro: BiquadFilterType,
    freq: number, freqFim?: number, q?: number, destino?: AudioNode): void {
    if (!this.ctx || !this.bufRuido) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.bufRuido;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filtro;
    f.frequency.setValueAtTime(freq, t);
    if (freqFim !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(30, freqFim), t + dur);
    if (q !== undefined) f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(destino ?? this.mestre!);
    src.start(t);
    src.stop(t + dur + 0.03);
  }
}

// ── singleton da página (os dois jogos partilham o contexto) ──
let _som: MotorSom | null = null;
export function somGlobal(): MotorSom {
  if (!_som) _som = new MotorSom();
  return _som;
}

// ── adaptador MotorSom → ganchos do MotorKart ─────────────────
export function adaptadorSomKart(som: MotorSom): SomKart {
  return {
    motor: (v, a) => som.motorKart(v, a),
    derrapagem: (f) => som.derrapagem(f),
    beep: (i) => som.tocar(i === 0 ? "ja" : "contagem"),
    evento: (ev, meuId) => {
      const meu = ev.id === meuId;
      switch (ev.t) {
        case "moeda": if (meu) som.tocar("moeda"); break;
        case "item": if (meu) som.tocar("item"); break; // caixa rebenta + revelação (o core emite SÓ «item»)
        case "uso": if (meu) som.tocar((ev.item as SomId) in { casca: 1, cascaAlvo: 1, missil: 1, oleo: 1, raio: 1, escudo: 1, cogumelo: 1, cogumelo3: 1 } ? (ev.item === "cogumelo3" ? "cogumelo" : (ev.item as SomId)) : "ui"); break;
        case "golpe":
          if (ev.alvo === meuId) som.tocar("golpe");
          else if (ev.por === meuId) som.tocar("acerto");
          break;
        case "raio": som.tocar(ev.por === meuId ? "raio" : "golpe"); break;
        case "escudo": if (ev.alvo === meuId) som.tocar("escudo"); break;
        case "deriva": if (meu && ev.fase) som.tocar(ev.fase === 2 ? "turbo2" : "turbo1"); break;
        case "rampa": if (meu) som.tocar("rampa"); break;
        case "contrario": som.tocar("contrario"); break;
        default: break; // volta/chegada/fim/fimSala têm tratamento próprio
      }
    },
    chegada: () => som.tocar("chegada"),
  };
}
