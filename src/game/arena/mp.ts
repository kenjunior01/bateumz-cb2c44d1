// ============================================================
// ARENA DAS LENDAS — CLIENTE DE MULTI-JOGADOR (WebSocket)
// ────────────────────────────────────────────────────────────
// Estilo hordes.io: o mundo é PARTILHADO — os mobs são autoritativos
// no servidor e as posições dos heróis viajam em snapshots com raio
// de interesse. Sem servidor, o jogo fica 100% SOLO como antes
// (nunca finge MP — padrão de honestidade da plataforma).
//
// Orçamentos validados AQUI com as MESMAS funções do core.ts que o
// servidor executa: se o servidor clampa, mostra `corrigido` e o
// estado local segue o servidor (reconciliação, padrão v37).
// ============================================================
import {
  validaOla, validaGolpe, limpaFala, falaPermitida, FALA_INTERVALO_MS,
  validaGolpePvp, validaCast, type SlotOuBasico,
  type CampeaoId, type EstadoHeroi, type MobEstado, type AnimHeroi, type SlotHabilidade,
} from "./core.ts";

export type EstadoLigacao = "a_ligar" | "online" | "solo" | "fechado";

export interface EstadoMp {
  estado: EstadoLigacao;
  jogadores: number;
  latencia: number;      // ms do ping real
  url: string;
  corrigidos: number;
}

/** Estado AUTORITATIVO do próprio herói (servidor v64 — o cliente reconcilia). */
export interface EuRede {
  hp: number; hpMax: number; mp: number; mpMax: number;
  morto: boolean; escudo: number;
  essencia: number; abates: number;
  nivel: number; xpNoNivel: number; xpParaSubir: number;
}

export interface OlaRede {
  nome: string;
  campeao: CampeaoId;
  nivel: number;
  xpTotal: number;
  essencia: number;
  itens: Record<string, number>;
  abates: number;
}

export interface EscutasRede {
  aoSnapshot: (jogadores: EstadoHeroi[], mobs: MobEstado[]) => void;
  aoFere: (dano: number, x: number, z: number) => void;
  aoGolpeMob: (alvoId: number, dano: number, x: number, z: number) => void;
  aoMobMorte: (id: number, tipo: string, assassinoId: number, xp: number, essencia: number) => void;
  aoFala: (nome: string, texto: string) => void;
  aoMudancaEstado: (e: EstadoMp) => void;
  aoCorrigido: (motivo: string) => void;
  // v64 PvP — estado autoritativo e eventos de heróis
  aoEu: (eu: EuRede) => void;
  aoMorteHeroi: (id: number, vitima: string, nomeAssassino: string) => void;
  aoRenasceuHeroi: (id: number, x: number, z: number) => void;
  aoAbatePvp: (vitima: string, essencia: number, xp: number, abates: number) => void;
  aoGolpeHeroi: (alvoId: number, dano: number, x: number, z: number, de: number) => void;
}

const HZ_POS = 100;           // publicar posição a cada 100 ms (10 Hz)
const HZ_GOLPE = 120;         // claims de dano a cada 120 ms
const RECON_MS = [800, 1600, 3200, 6400, 12000];

export class RedeArena {
  private ws: WebSocket | null = null;
  private url = "";
  private ola: OlaRede | null = null;
  private id = -1;
  private estadoLigacao: EstadoLigacao = "fechado";
  private jogadores = 0;
  private latencia = 0;
  private corrigidos = 0;
  private escutas: EscutasRede | null = null;
  private tentativa = 0;
  private timerRecon: number | null = null;
  private timerPing: number | null = null;
  private ultimoPosMs = 0;
  private ultimoGolpeMs = 0;
  private ultimoPvpMs = 0;
  private ultimoFalaMs = 0;
  private ultimaPos: { x: number; z: number; ry: number; anim: AnimHeroi; hp: number; hpMax: number; mp: number; mpMax: number; nivel: number; abates: number; essencia: number; itens: Record<string, number>; campeao: CampeaoId } | null = null;
  private fechadoPeloUtilizador = false;

  definirEscutas(e: EscutasRede): void { this.escutas = e; }

  /** URL padrão: ?mp= > localStorage > mesma máquina na porta 8766. */
  static urlPadrao(): string {
    try {
      const p = new URLSearchParams(window.location.search).get("mp");
      if (p && /^(wss?:\/\/)/.test(p)) return p;
      const ls = localStorage.getItem("bateu_arena_mp_url");
      if (ls && /^(wss?:\/\/)/.test(ls)) return ls;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${window.location.hostname}:8766`;
    } catch { return "ws://localhost:8766"; }
  }

  ligar(url: string, ola: OlaRede): void {
    if (typeof WebSocket === "undefined") { this.setEstado("solo"); return; }
    this.fechadoPeloUtilizador = false;
    this.url = url;
    this.ola = ola;
    this.setEstado("a_ligar");
    this.abrir();
  }

  private abrir(): void {
    let ws: WebSocket;
    try { ws = new WebSocket(this.url); } catch { this.agendarRecon(); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.tentativa = 0;
      const o = validaOla(this.ola);
      if (o && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ t: "ola", ...o, xpTotal: this.ola?.xpTotal ?? 0, essencia: this.ola?.essencia ?? 0, itens: this.ola?.itens ?? {}, abates: this.ola?.abates ?? 0 }));
      }
      this.setEstado("online");
      this.timerPing = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: "ping", ts: Date.now() }));
      }, 5000);
    };
    ws.onmessage = (ev) => this.receber(ev);
    ws.onerror = () => { try { ws.close(); } catch { /* já fechado */ } };
    ws.onclose = () => {
      if (this.timerPing) { clearInterval(this.timerPing); this.timerPing = null; }
      if (this.fechadoPeloUtilizador) { this.setEstado("fechado"); return; }
      this.setEstado("solo");
      this.agendarRecon();
    };
  }

  private agendarRecon(): void {
    if (this.fechadoPeloUtilizador || this.timerRecon) return;
    const espera = RECON_MS[Math.min(this.tentativa, RECON_MS.length - 1)];
    this.tentativa++;
    this.timerRecon = window.setTimeout(() => {
      this.timerRecon = null;
      if (!this.fechadoPeloUtilizador && this.ola) this.abrir();
    }, espera);
  }

  private receber(ev: MessageEvent): void {
    let m: Record<string, unknown>;
    try { m = JSON.parse(String(ev.data)) as Record<string, unknown>; } catch { return; }
    const t = m.t;
    if (t === "bemvindo") {
      this.id = typeof m.id === "number" ? m.id : -1;
      this.jogadores = typeof m.jogadores === "number" ? m.jogadores : 1;
      this.escutas?.aoSnapshot(this.heroisDe(m.jogadoresLista), this.mobsDe(m.mobsLista));
      if (m.eu && typeof m.eu === "object") this.escutas?.aoEu(this.euDe(m.eu));
      this.setEstado("online");
    } else if (t === "snap") {
      this.escutas?.aoSnapshot(this.heroisDe(m.j), this.mobsDe(m.m));
      this.jogadores = Array.isArray(m.j) ? m.j.length + 1 : this.jogadores;
      if (m.eu && typeof m.eu === "object") this.escutas?.aoEu(this.euDe(m.eu));
      this.setEstado("online");
    } else if (t === "fere") {
      const dano = typeof m.dano === "number" ? m.dano : 0;
      const x = typeof m.x === "number" ? m.x : 0;
      const z = typeof m.z === "number" ? m.z : 0;
      if (dano > 0) this.escutas?.aoFere(dano, x, z);
    } else if (t === "golpemob") {
      const alvoId = typeof m.alvoId === "number" ? m.alvoId : -1;
      const dano = typeof m.dano === "number" ? m.dano : 0;
      if (alvoId >= 0 && dano > 0) this.escutas?.aoGolpeMob(alvoId, dano, Number(m.x) || 0, Number(m.z) || 0);
    } else if (t === "mobmorreu") {
      const id = typeof m.id === "number" ? m.id : -1;
      const assassino = typeof m.assassino === "number" ? m.assassino : -1;
      if (id >= 0) {
        this.escutas?.aoMobMorte(id, String(m.tipo ?? ""), assassino, Number(m.xp) || 0, Number(m.essencia) || 0);
      }
    } else if (t === "morteheroi") {
      const id = typeof m.id === "number" ? m.id : -1;
      if (id >= 0) {
        this.escutas?.aoMorteHeroi(id, String(m.vitima ?? ""), String(m.nomeAssassino ?? ""));
      }
    } else if (t === "renasceu") {
      const id = typeof m.id === "number" ? m.id : -1;
      const x = typeof m.x === "number" ? m.x : 0;
      const z = typeof m.z === "number" ? m.z : 0;
      if (id >= 0) this.escutas?.aoRenasceuHeroi(id, x, z);
    } else if (t === "abate-pvp") {
      const vitima = String(m.vitima ?? "");
      if (vitima) {
        this.escutas?.aoAbatePvp(vitima, Math.max(0, Number(m.essencia) || 0), Math.max(0, Number(m.xp) || 0), Math.max(0, Math.floor(Number(m.abates) || 0)));
      }
    } else if (t === "golpeheroi") {
      const alvoId = typeof m.alvoId === "number" ? m.alvoId : -1;
      const dano = typeof m.dano === "number" ? m.dano : 0;
      const de = typeof m.de === "number" ? m.de : -1;
      if (alvoId >= 0 && dano > 0) {
        this.escutas?.aoGolpeHeroi(alvoId, dano, Number(m.x) || 0, Number(m.z) || 0, de);
      }
    } else if (t === "fala") {
      const nome = String(m.nome ?? "");
      const texto = limpaFala(m.texto);
      if (nome && texto) this.escutas?.aoFala(nome, texto);
    } else if (t === "corrigido") {
      this.corrigidos++;
      this.escutas?.aoCorrigido(String(m.motivo ?? ""));
    } else if (t === "pong") {
      const ts = typeof m.ts === "number" ? m.ts : 0;
      if (ts > 0) this.latencia = Math.max(0, Date.now() - ts);
    } else if (t === "kicked") {
      try { this.ws?.close(); } catch { /* noop */ }
    }
  }

  private heroisDe(bruto: unknown): EstadoHeroi[] {
    if (!Array.isArray(bruto)) return [];
    const out: EstadoHeroi[] = [];
    for (const h of bruto) {
      const o = h as Record<string, unknown>;
      if (typeof o.id !== "number" || typeof o.x !== "number" || typeof o.z !== "number") continue;
      const nome = typeof o.nome === "string" ? o.nome.slice(0, 16) : "";
      const campeao = (o.campeao === "kaimu" || o.campeao === "lyra" || o.campeao === "vex" || o.campeao === "nara") ? o.campeao : "kaimu";
      out.push({
        id: o.id, nome, campeao,
        nivel: Math.max(1, Math.min(18, Math.floor(Number(o.nivel) || 1))),
        x: o.x, z: o.z, ry: Number(o.ry) || 0,
        anim: (o.anim === "andar" || o.anim === "atacar" || o.anim === "morte") ? o.anim : "parado",
        hp: Math.max(0, Number(o.hp) || 0), hpMax: Math.max(1, Number(o.hpMax) || 1),
        morto: o.morto === true,
        abates: Math.max(0, Math.floor(Number(o.abates) || 0)),
        essencia: Math.max(0, Math.floor(Number(o.essencia) || 0)),
      });
    }
    return out;
  }

  /** Estado próprio autoritativo — campos podres nunca derrubam o cliente. */
  private euDe(bruto: unknown): EuRede {
    const o = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
    const num = (v: unknown, min: number, max: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
    };
    return {
      hp: num(o.hp, 0, 1e6), hpMax: Math.max(1, num(o.hpMax, 1, 1e6)),
      mp: num(o.mp, 0, 1e6), mpMax: Math.max(1, num(o.mpMax, 1, 1e6)),
      morto: o.morto === true, escudo: num(o.escudo, 0, 1e6),
      essencia: num(o.essencia, 0, 1e7), abates: Math.floor(num(o.abates, 0, 1e6)),
      nivel: Math.max(1, Math.min(18, Math.floor(num(o.nivel, 1, 18)))),
      xpNoNivel: num(o.xpNoNivel, 0, 1e6), xpParaSubir: Math.max(1, num(o.xpParaSubir, 1, 1e6)),
    };
  }

  private mobsDe(bruto: unknown): MobEstado[] {
    if (!Array.isArray(bruto)) return [];
    const out: MobEstado[] = [];
    for (const m of bruto) {
      const o = m as Record<string, unknown>;
      if (typeof o.id !== "number" || typeof o.x !== "number" || typeof o.z !== "number") continue;
      const tipo = String(o.tipo ?? "");
      if (!(tipo in { lobo: 1, raptor: 1, golem: 1, espectro: 1, raposa: 1, dragao: 1, barao: 1 })) continue;
      out.push({
        id: o.id, tipo: tipo as MobEstado["tipo"],
        x: o.x, z: o.z, ry: Number(o.ry) || 0,
        hp: Math.max(0, Number(o.hp) || 0), hpMax: Math.max(1, Number(o.hpMax) || 1),
        anim: (o.anim === "andar" || o.anim === "atacar") ? o.anim : "parado",
      });
    }
    return out;
  }

  private setEstado(e: EstadoLigacao): void {
    if (this.estadoLigacao !== e || e === "online") {
      this.estadoLigacao = e;
      this.escutas?.aoMudancaEstado(this.estado());
    }
  }

  meuId(): number { return this.id; }

  estado(): EstadoMp {
    return {
      estado: this.estadoLigacao,
      jogadores: this.estadoLigacao === "online" ? this.jogadores : 1,
      latencia: this.latencia,
      url: this.url,
      corrigidos: this.corrigidos,
    };
  }

  /** Posição do herói — o motor chama a cada frame; AQUI o throttle a 10 Hz. */
  publicarPosicao(
    x: number, z: number, ry: number, anim: AnimHeroi,
    hp: number, hpMax: number, mp: number, mpMax: number,
    nivel: number, abates: number, essencia: number,
    itens: Record<string, number>, campeao: CampeaoId,
  ): void {
    const agora = Date.now();
    if (agora - this.ultimoPosMs < HZ_POS) return;
    this.ultimoPosMs = agora;
    this.ultimaPos = { x, z, ry, anim, hp, hpMax, mp, mpMax, nivel, abates, essencia, itens, campeao };
    if (this.ws?.readyState === WebSocket.OPEN && this.estadoLigacao === "online") {
      this.ws.send(JSON.stringify({ t: "pos", ...this.ultimaPos }));
    }
  }

  /** Reporta dano feito a um mob (o servidor valida e autorita). */
  reportarGolpe(id: number, dano: number, x: number, z: number): void {
    const agora = Date.now();
    if (agora - this.ultimoGolpeMs < HZ_GOLPE) return;
    this.ultimoGolpeMs = agora;
    const g = validaGolpe({ id, dano, x, z });
    if (g && this.ws?.readyState === WebSocket.OPEN && this.estadoLigacao === "online") {
      this.ws.send(JSON.stringify({ t: "golpe", ...g }));
    }
  }

  // ── v64 PvP ──────────────────────────────────────────────────
  /** Cast de habilidade (cd/mana/efeitos próprios validados pelo servidor). */
  castar(slot: SlotHabilidade): void {
    const c = validaCast({ slot });
    if (c && this.ws?.readyState === WebSocket.OPEN && this.estadoLigacao === "online") {
      this.ws.send(JSON.stringify({ t: "cast", slot: c.slot }));
    }
  }

  /** «Ferí o herói Y com a habilidade X» — SEM dano: o valor é do servidor. */
  golpearHeroi(alvoId: number, hab: SlotOuBasico): void {
    const agora = Date.now();
    if (agora - this.ultimoPvpMs < HZ_GOLPE) return;
    this.ultimoPvpMs = agora;
    const c = validaGolpePvp({ alvoId, hab });
    if (c && this.ws?.readyState === WebSocket.OPEN && this.estadoLigacao === "online") {
      this.ws.send(JSON.stringify({ t: "golpepvp", alvoId: c.alvoId, hab: c.hab }));
    }
  }

  /** Chat da arena (mesma taxa que o servidor aceita). */
  falar(texto: string): boolean {
    const limpo = limpaFala(texto);
    if (!limpo) return false;
    const agora = Date.now();
    if (!falaPermitida(this.ultimoFalaMs, agora)) return false;
    this.ultimoFalaMs = agora + FALA_INTERVALO_MS - FALA_INTERVALO_MS; // marca o instante
    this.ultimoFalaMs = agora;
    if (this.ws?.readyState === WebSocket.OPEN && this.estadoLigacao === "online") {
      this.ws.send(JSON.stringify({ t: "fala", texto: limpo }));
      return true;
    }
    return false;
  }

  comprar(item: string): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.estadoLigacao === "online") {
      this.ws.send(JSON.stringify({ t: "compra", item }));
    }
  }

  /** Herói morreu (o servidor marca o estado e deixa de validar movimento). */
  morrer(): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.estadoLigacao === "online") {
      this.ws.send(JSON.stringify({ t: "morte" }));
    }
  }

  /** Herói renasceu na fonte (posição validada pelo servidor). */
  renascer(x: number, z: number, nivel: number, essencia: number, abates: number, itens: Record<string, number>): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.estadoLigacao === "online") {
      this.ws.send(JSON.stringify({ t: "renasce", x, z, nivel, essencia, abates, itens }));
    }
  }

  /** Altera o herói/progresso no servidor (level-up etc. vai no pos). */
  atualizarOla(ola: OlaRede): void {
    this.ola = ola;
    const o = validaOla(ola);
    if (o && this.ws?.readyState === WebSocket.OPEN && this.estadoLigacao === "online") {
      this.ws.send(JSON.stringify({ t: "ola", ...o, xpTotal: ola.xpTotal, essencia: ola.essencia, itens: ola.itens, abates: ola.abates }));
    }
  }

  sair(): void {
    this.fechadoPeloUtilizador = true;
    if (this.timerRecon) { clearTimeout(this.timerRecon); this.timerRecon = null; }
    if (this.timerPing) { clearInterval(this.timerPing); this.timerPing = null; }
    try { this.ws?.close(); } catch { /* noop */ }
    this.ws = null;
    this.setEstado("fechado");
  }
}
