// ============================================================
// BATEU KART — CLIENTE DA SALA DE CORRIDAS (WebSocket, v66)
// ────────────────────────────────────────────────────────────
// O MESMO padrão honesto da Arena (mp.ts v63/v64): o cliente manda
// APENAS INTENÇÃO (`ent` a ~30 Hz) e o servidor devolve a corrida
// em snapshots a 10 Hz — o cliente nunca simula a física de rede,
// só interpola o que recebe. Sem servidor, o jogo fica 100% SOLO
// como sempre (nunca finge multiplayer).
// ============================================================
import type { EntradaKart, ItemKartId, KartId, MelhoriaId, EventoCorrida } from "./core.ts";

export type EstadoLigacaoKart = "a_ligar" | "lobby" | "corrida" | "fechado" | "solo";

export interface EstadoMpKart {
  estado: EstadoLigacaoKart;
  latencia: number;        // ms do ping real
  url: string;
  corrigidos: number;
}

export interface OlaKartRede {
  nome: string;
  kart: KartId;
  melhorias: Partial<Record<MelhoriaId, number>>;
}

export interface CorredorInicio {
  id: number;
  nome: string;
  kart: KartId;
  cor: number;
  eJogador: boolean;
}

export interface CorredorSnap {
  id: number;
  x: number; z: number; ang: number; da: number; vel: number;
  bo: number; st: number; esc: number;
  fp: number; dr: number; dc: number;
  vo: number; po: number; mo: number; ia: number;
  it: ItemKartId | null; i3: number; fin: number; tf: number; ej: number;
}

/** Snapshot da sala (10 Hz) — campos curtos, documentados no servidor. */
export interface SnapKart {
  t: "snap";
  fase: "contagem" | "corrida" | "fim";
  tempo: number;
  cont: number;
  voltas: number;
  j: CorredorSnap[];
  cx: number[];
  mn: number[];
  pj?: { i: number; tp: "casca" | "cascaAlvo" | "missil"; x: number; z: number; ang: number; do: number }[];
  og?: { i: number; x: number; z: number; do: number }[];
  ev: EventoCorrida[];
  res?: { id: number; nome: string; posicao: number; tempo: number }[];
}

export interface ResultadoSala { id: number; nome: string; posicao: number; tempo: number }

export interface EscutasKartRede {
  aoEstado: (e: EstadoMpKart) => void;
  aoLobby: (info: { espera: number; presentes: number; teto: number }) => void;
  aoInicio: (info: { meuId: number; pistaId: string; voltas: number; corredores: CorredorInicio[] }) => void;
  aoSnap: (s: SnapKart) => void;
  aoFim: (info: { resultados: ResultadoSala[]; pistaId: string; voltas: number }) => void;
  aoSaiuCorredor: (id: number, nome: string) => void;
  aoCorrigido: (motivo: string) => void;
}

const RECON_MS = [800, 1600, 3200, 6400, 12000];
const HZ_ENT = 33; // ~30 Hz

export class RedeKart {
  private ws: WebSocket | null = null;
  private url = "";
  private ola: OlaKartRede | null = null;
  private estadoLigacao: EstadoLigacaoKart = "fechado";
  private latencia = 0;
  private corrigidos = 0;
  private escutas: EscutasKartRede | null = null;
  private fonteEntrada: (() => EntradaKart) | null = null;
  private tentativa = 0;
  private timerRecon: number | null = null;
  private timerPing: number | null = null;
  private timerEnt: number | null = null;
  private fechadoPeloUtilizador = false;

  definirEscutas(e: EscutasKartRede): void { this.escutas = e; }
  definirFonteEntrada(f: (() => EntradaKart) | null): void { this.fonteEntrada = f; }

  /** URL padrão: ?mp= > localStorage > mesma máquina na porta 8767. */
  static urlPadrao(): string {
    try {
      const p = new URLSearchParams(window.location.search).get("mp");
      if (p && /^(wss?:\/\/)/.test(p)) return p;
      const ls = localStorage.getItem("bateu_kart_mp_url");
      if (ls && /^(wss?:\/\/)/.test(ls)) return ls;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${proto}//${window.location.hostname}:8767`;
    } catch { return "ws://localhost:8767"; }
  }

  estado(): EstadoMpKart {
    return { estado: this.estadoLigacao, latencia: this.latencia, url: this.url, corrigidos: this.corrigidos };
  }
  estaEmCorrida(): boolean { return this.estadoLigacao === "corrida"; }

  ligar(url: string, ola: OlaKartRede): void {
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
      if (ws.readyState === WebSocket.OPEN && this.ola) {
        ws.send(JSON.stringify({ t: "ola", nome: this.ola.nome, kart: this.ola.kart, melhorias: this.ola.melhorias }));
      }
      this.setEstado("lobby");
      this.timerPing = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: "ping", ts: Date.now() }));
      }, 5000);
      this.timerEnt = window.setInterval(() => this.publicarEntrada(), HZ_ENT);
    };
    ws.onmessage = (ev) => this.receber(ev);
    ws.onerror = () => { try { ws.close(); } catch { /* já fechado */ } };
    ws.onclose = () => {
      if (this.timerPing) { clearInterval(this.timerPing); this.timerPing = null; }
      if (this.timerEnt) { clearInterval(this.timerEnt); this.timerEnt = null; }
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
      this.setEstado(m.sala === "corrida" ? "corrida" : "lobby");
    } else if (t === "lobby") {
      this.setEstado("lobby");
      this.escutas?.aoLobby({
        espera: typeof m.espera === "number" ? m.espera : 0,
        presentes: typeof m.presentes === "number" ? m.presentes : 0,
        teto: typeof m.teto === "number" ? m.teto : 12,
      });
    } else if (t === "inicio") {
      const corredores = Array.isArray(m.corredores) ? (m.corredores as unknown[]) : [];
      const limpos: CorredorInicio[] = [];
      for (const c of corredores) {
        if (typeof c !== "object" || c === null) continue;
        const o = c as Record<string, unknown>;
        if (typeof o.id !== "number") continue;
        limpos.push({
          id: o.id,
          nome: typeof o.nome === "string" ? o.nome.slice(0, 16) : "?",
          kart: (typeof o.kart === "string" ? o.kart : "viralata") as KartId,
          cor: typeof o.cor === "number" ? o.cor : 0x888888,
          eJogador: o.eJogador === true,
        });
      }
      const meuId = typeof m.meuId === "number" ? m.meuId : -1;
      if (meuId < 0 || limpos.length === 0) return;
      this.setEstado("corrida");
      this.escutas?.aoInicio({
        meuId,
        pistaId: typeof m.pistaId === "string" ? m.pistaId : "praia",
        voltas: typeof m.voltas === "number" ? m.voltas : 4,
        corredores: limpos,
      });
    } else if (t === "snap") {
      this.setEstado("corrida");
      this.escutas?.aoSnap(m as unknown as SnapKart);
    } else if (t === "fim") {
      this.setEstado("lobby");
      const resultados = Array.isArray(m.resultados)
        ? (m.resultados as Record<string, unknown>[]).filter((r) => typeof r?.id === "number").map((r) => ({
            id: r.id as number,
            nome: typeof r.nome === "string" ? r.nome.slice(0, 16) : "?",
            posicao: typeof r.posicao === "number" ? r.posicao : 99,
            tempo: typeof r.tempo === "number" ? r.tempo : 0,
          }))
        : [];
      this.escutas?.aoFim({
        resultados,
        pistaId: typeof m.pistaId === "string" ? m.pistaId : "praia",
        voltas: typeof m.voltas === "number" ? m.voltas : 4,
      });
    } else if (t === "saiu-corredor") {
      const id = typeof m.id === "number" ? m.id : -1;
      if (id >= 0) this.escutas?.aoSaiuCorredor(id, typeof m.nome === "string" ? m.nome.slice(0, 16) : "?");
    } else if (t === "espectando") {
      this.escutas?.aoCorrigido("sala-cheia-espera");
    } else if (t === "corrigido") {
      this.corrigidos++;
      this.escutas?.aoCorrigido(String(m.motivo ?? "?"));
    } else if (t === "pong") {
      const ts = typeof m.ts === "number" ? m.ts : 0;
      if (ts) this.latencia = Math.max(1, Math.round(Date.now() - ts));
    }
  }

  /** Publica a entrada do motor a ~30 Hz; o uso de item vai por MENSAGEM própria. */
  private publicarEntrada(): void {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN || !this.fonteEntrada) return;
    const e = this.fonteEntrada();
    ws.send(JSON.stringify({ t: "ent", a: e.acelerar ? 1 : 0, t2: e.travar ? 1 : 0, v: Math.round(e.virar * 100) / 100, d: e.derrapar ? 1 : 0 }));
  }

  /** Uso de item EDGE-triggered (mandado 1× — o servidor consome no próximo passo). */
  mandarUso(): void {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ t: "uso" }));
  }

  fechar(): void {
    this.fechadoPeloUtilizador = true;
    if (this.ws) {
      try { this.ws.send(JSON.stringify({ t: "sair" })); } catch { /* noop */ }
      try { this.ws.close(1000, "sair"); } catch { /* noop */ }
    }
    this.ws = null;
    if (this.timerRecon) { clearTimeout(this.timerRecon); this.timerRecon = null; }
    if (this.timerPing) { clearInterval(this.timerPing); this.timerPing = null; }
    if (this.timerEnt) { clearInterval(this.timerEnt); this.timerEnt = null; }
    this.setEstado("fechado");
  }

  private setEstado(e: EstadoLigacaoKart): void {
    if (this.estadoLigacao === e) return;
    this.estadoLigacao = e;
    this.escutas?.aoEstado(this.estado());
  }
}
