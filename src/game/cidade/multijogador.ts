// Cidade Bateu — cliente de presença partilhada (v37 — N3 completo)
// Padrões do estudo Veloren (docs/REA-veloren-estudo-v36.md): mensagens nomeadas
// (common/net/src/msg/*), interpolação, reconexão honesta, throttle por distância
// no servidor. v37: regras vindas do CORE ISOMÓRFICO (padrão `common` — a mesma
// validaMovimento/limpaFala que o servidor executa), chat da praça com bolha de
// fala e reconciliação honesta (`corrigido` → aviso + ajuste). Zero código
// Veloren. Sem servidor, o jogo fica 100% local como antes (nunca finge MP).

import * as THREE from "three";
import { ALTURA_PLATEAU, FALA_RATE_MS, EDIT_RATE_MS, limpaFala } from "./core";
// v53 — a MESMA regra de validação que o servidor aplica (constants.ts —
// uma só fonte): sanitiza TUDO que chega, mesmo vindo do servidor.
import { validaEdit } from "../blocos/constants";
// v59 — presença do NPC no MP: as MESMAS regras que o servidor executa
// (núcleo isomórfico npcMp.ts) sanitizam os pacotes `npc` que chegam.
import {
  NPC_FALA_GATE_MS, NPC_CONVERSA_TIMEOUT_MS,
  type ConversaNpc, type ConversaNpcFio,
  validarPacoteNpc, limparConversasExpiradas,
} from "./npcMp";

export type EstadoMP = "off" | "a_ligar" | "ligado" | "erro";

interface Remoto {
  id: number; nome: string;
  x: number; y: number | null; z: number; ry: number;        // posição interpolada (render)
  alvoX: number; alvoY: number | null; alvoZ: number; alvoRy: number; // último estado do servidor
  vistoEm: number;
  grupo: THREE.Group; etiqueta: THREE.Sprite;
}

const CORES_AVATAR = [0x2dd4bf, 0xf59e0b, 0xa78bfa, 0xf87171, 0x34d399, 0x60a5fa];

function etiquetaNome(nome: string): THREE.Sprite {
  const cv = document.createElement("canvas");
  cv.width = 256; cv.height = 64;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "rgba(10,10,20,0.72)";
  ctx.roundRect?.(8, 8, 240, 48, 14);
  ctx.fill();
  ctx.font = "600 26px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(nome.slice(0, 16), 128, 33);
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(1.9, 0.48, 1);
  spr.renderOrder = 5;
  return spr;
}

function avatar(cor: number): THREE.Group {
  const g = new THREE.Group();
  const mat = (c: number) => new THREE.MeshLambertMaterial({ color: c });
  // pernas
  const pernas = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.3), mat(0x2b2b3a));
  pernas.position.y = 0.36;
  // corpo
  const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), mat(cor));
  corpo.position.y = 1.08;
  // cabeça
  const cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.44), mat(0xe8c39e));
  cabeca.position.y = 1.66;
  g.add(pernas, corpo, cabeca);
  return g;
}

const lerpAng = (a: number, b: number, t: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

/** Bolha de fala (canvas → sprite) — igual ao padrão das etiquetas, 100% local. */
function bolhaFala(texto: string): THREE.Sprite {
  const t = texto.slice(0, 140);
  const cv = document.createElement("canvas");
  cv.width = 512; cv.height = 160;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.roundRect?.(10, 10, 492, 116, 22);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(236, 124); ctx.lineTo(256, 152); ctx.lineTo(276, 124); ctx.closePath();
  ctx.fill();
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillStyle = "#0f172a"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const palavras = t.split(" ");
  const linhas: string[] = [];
  let linha = "";
  for (const p of palavras) {
    const teste = linha ? `${linha} ${p}` : p;
    if (ctx.measureText(teste).width > 460 && linha) { linhas.push(linha); linha = p; } else linha = teste;
    if (linhas.length === 3) break;
  }
  if (linhas.length < 3 && linha) linhas.push(linha);
  linhas.forEach((l, i) => ctx.fillText(l, 256, 40 + i * 34));
  const tex = new THREE.CanvasTexture(cv);
  tex.needsUpdate = true;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  spr.scale.set(2.9, 0.9, 1);
  spr.renderOrder = 6;
  return spr;
}

export interface FalaInfo { id: number; nome: string; texto: string; em: number }

// v47 — eventos REAIS da sessão partilhada (para o painel «Praça em direto»):
// só o que aconteceu de verdade — entradas/saídas recebidas do servidor,
// correções honestas, edições dos outros jogadores (v53) e conversas com
// o NPC da Praça (v59 — presença, NUNCA conteúdo: o que se falou fica
// entre o jogador e a Bateu IA).
export interface EventoPraca {
  tipo: "entrou" | "saiu" | "corrigido" | "edicao" | "npc";
  nome?: string;          // entrou/saiu/edicao/npc: quem
  motivo?: string;        // corrigido: "alcance" | "parede" — o motivo real do servidor
  qtd?: number;           // edicao: quantas edições chegaram no lote
  npcFim?: boolean;       // v59 — npc: true = a conversa acabou (a fonte é o pacote do servidor)
  em: number;
}

// v53 — uma edição remota recebida (o E2E consome para provar a partilha)
export interface EdicaoRemota { x: number; y: number; z: number; id: number; por: number; em: number }

export class CidadeMP {
  estado: EstadoMP = "off";
  private ws: WebSocket | null = null;
  private remotos = new Map<number, Remoto>();
  private falas: FalaInfo[] = [];               // histórico local (últimas 12)
  private eventos: EventoPraca[] = [];          // v47 — acontecimentos REAIS (últimos 30)
  private edicoesRemotas: EdicaoRemota[] = [];  // v53 — edições recebidas (últimas 50)
  private totalEdicoesRemotas = 0;              // v53 — total recebido na sessão (honesto)
  private pico = 0;                             // v47 — pico REAL de presença observado
  private bolhas = new Map<number, { spr: THREE.Sprite; ate: number }>();
  private url = ""; private nome = "";
  private tentativa = 0; private queroLigado = false;
  private timerRecon: ReturnType<typeof setTimeout> | null = null;
  private ultimoPosMs = 0;
  private ultimaFalaLocal = 0;
  private ultimoEditMs = 0;                     // v52 — o MESMO rate-limit do servidor
  private ultimoNpcFalaMs = 0;                  // v59 — o MESMO gate do servidor (npcFala)
  private npcLista: ConversaNpc[] = [];         // v59 — quem conversa com a Bateu IA (estado do servidor)
  private meuId = 0;                            // v59 — o id MP DESTE jogador (bemvindo) — o display exclui o próprio
  private agora = () => performance.now();

  constructor(private opts: {
    alturaEm: (x: number, z: number) => number;
    onEstado: (e: EstadoMP, info?: string) => void;
    onAviso: (texto: string) => void;
    onFala?: (f: FalaInfo) => void;              // v37 — chat da praça
    onCorrecao?: (x: number, z: number, motivo?: string, y?: number) => void; // v37/47/52 — reconciliação honesta (v52: também no eixo y)
    onEdicao?: (x: number, y: number, z: number, id: number, por: number) => void; // v53 — partilha visual: a edição de OUTRO jogador
    onNpc?: (conversas: ConversaNpcFio[]) => void; // v59 — presença do NPC mudou (quem fala com a Bateu IA)
  }) {}

  ligar(url: string, nome: string) {
    if (this.queroLigado) this.desligar(); // religar limpo
    this.queroLigado = true;
    this.url = url; this.nome = nome;
    this.tentativa = 0;
    this.conectar();
  }

  private setEstado(e: EstadoMP, info?: string) {
    this.estado = e;
    this.opts.onEstado(e, info);
  }

  private conectar() {
    if (!this.queroLigado) return;
    this.setEstado(this.tentativa === 0 ? "a_ligar" : "a_ligar", this.tentativa > 0 ? `tentativa ${this.tentativa + 1}` : undefined);
    let ws: WebSocket;
    try { ws = new WebSocket(this.url); } catch { this.agendarRecon(); return; }
    this.ws = ws;
    const guarda = this; // closures abaixo usam a instância viva

    ws.onopen = () => {
      ws.send(JSON.stringify({ t: "ola", nome: guarda.nome }));
    };
    ws.onmessage = (ev) => {
      let m: any;
      try { m = JSON.parse(String(ev.data)); } catch { return; }
      if (m.t === "rejeitado") { guarda.setEstado("erro", m.motivo === "cheio" ? "mundo cheio" : "recusado"); guarda.queroLigado = false; try { ws.close(); } catch { /* ignore */ } return; }
      if (m.t === "bemvindo") {
        guarda.tentativa = 0;
        guarda.setEstado("ligado");
        guarda.meuId = Number(m.id) || 0; // v59 — o próprio id (display exclui o próprio nome)
        // v59 — o chegante nasce a ver quem já conversa com a Bateu IA
        // (MESMA sanitização dos pacotes seguintes — validaPacoteNpc)
        guarda.npcLista = validarPacoteNpc(m.npc, Date.now());
        if (guarda.npcLista.length) guarda.opts.onNpc?.(guarda.npcLista.map((c) => ({ id: c.id, nome: c.nome })));
        for (const j of m.jogadores ?? []) guarda.criarRemoto(j.id, j.nome, j.x, j.z, j.ry);
        guarda.opts.onAviso(`🌐 ${guarda.nome} entrou na cidade partilhada`);
        return;
      }
      if (m.t === "entrou") {
        guarda.criarRemoto(m.id, m.nome, 0, 0, 0, typeof m.y === "number" ? m.y : null);
        guarda.registarEvento({ tipo: "entrou", nome: String(m.nome ?? "").slice(0, 24), em: Date.now() });
        guarda.opts.onAviso(`🌐 ${m.nome} chegou à cidade`);
        return;
      }
      if (m.t === "saiu") {
        guarda.registarEvento({ tipo: "saiu", nome: guarda.remotos.get(m.id)?.nome ?? "", em: Date.now() });
        guarda.removerRemoto(m.id);
        return;
      }
      if (m.t === "corrigido") {
        // v37/47/52 — o servidor cortou um movimento ilegal: ajusta a posição
        // local com aviso honesto + o MOTIVO real ("alcance"/"parede");
        // v52 — quando o servidor conhece o y autoritativo, vem aqui para o
        // cliente reencaixar TAMBÉM o eixo vertical (nunca fica preso no ar).
        if (typeof m.x === "number" && typeof m.z === "number" && Number.isFinite(m.x) && Number.isFinite(m.z)) {
          guarda.registarEvento({ tipo: "corrigido", motivo: typeof m.motivo === "string" ? m.motivo : "alcance", em: Date.now() });
          const yServidor = typeof m.y === "number" && Number.isFinite(m.y) ? m.y : undefined;
          guarda.opts.onCorrecao?.(m.x, m.z, typeof m.motivo === "string" ? m.motivo : undefined, yServidor);
        }
        return;
      }
      if (m.t === "edicoes" && Array.isArray(m.lista)) {
        // v53 — PARTILHA VISUAL (o mundo editável partilhado): o servidor
        // difunde as edições aceites (difusão 10 Hz) e manda LOTES de
        // sincronização (bemvindo + cruzamento de região). Cada item é
        // sanitizado pela MESMA regra que o servidor aplica (validaEdit —
        // padrão da limpaFala: sanitiza MESMO vindo da fonte) e aplicado
        // ao motor pelo caminho remoto (sem eco — o autor já tem a sua).
        const validas: { x: number; y: number; z: number; id: number; por: number }[] = [];
        for (const e of m.lista.slice(0, 512)) {
          if (!e || !validaEdit(e.x, e.y, e.z, e.id)) continue;
          validas.push({ x: e.x, y: e.y, z: e.z, id: e.id, por: Number(e.por) || 0 });
        }
        if (validas.length) {
          const nomes = new Set<string>();
          for (const e of validas) {
            guarda.edicoesRemotas.push({ ...e, em: Date.now() });
            if (guarda.edicoesRemotas.length > 50) guarda.edicoesRemotas.shift();
            guarda.totalEdicoesRemotas++;
            guarda.opts.onEdicao?.(e.x, e.y, e.z, e.id, e.por);
            const autor = guarda.remotos.get(e.por);
            if (autor) nomes.add(autor.nome);
          }
          guarda.registarEvento({ tipo: "edicao", nome: [...nomes][0] ?? "", qtd: validas.length, em: Date.now() });
        }
        return;
      }
      if (m.t === "npc") {
        // v59 — PRESENÇA DO NPC: quem está a conversar com a Bateu IA mudou.
        // Sanitização pela MESMA regra do servidor (validarPacoteNpc) —
        // padrão da validaEdit: sanitiza MESMO vindo da fonte. Eventos REAIS
        // por dif (nomes que entraram/saíram da lista) — nunca gerados.
        const antes = new Map(guarda.npcLista.map((c) => [c.id, c.nome]));
        const vivos = validarPacoteNpc(m, Date.now());
        guarda.npcLista = vivos;
        const agora_ = new Map(vivos.map((c) => [c.id, c.nome]));
        for (const [id, nome] of agora_) if (!antes.has(id)) guarda.registarEvento({ tipo: "npc", nome, em: Date.now() });
        for (const [id, nome] of antes) if (!agora_.has(id)) guarda.registarEvento({ tipo: "npc", nome, npcFim: true, em: Date.now() });
        guarda.opts.onNpc?.(vivos.map((c) => ({ id: c.id, nome: c.nome })));
        return;
      }
      if (m.t === "fala") {
        const texto = limpaFala(m.texto);
        if (!texto || typeof m.nome !== "string") return; // sanitiza MESMO vindo do servidor
        const f: FalaInfo = { id: Number(m.id) || 0, nome: m.nome.slice(0, 24), texto, em: Date.now() };
        guarda.falas.push(f);
        if (guarda.falas.length > 12) guarda.falas.shift();
        guarda.opts.onFala?.(f);
        const r = guarda.remotos.get(f.id);
        if (r) guarda.mostrarBolha(f.id, texto);
        return;
      }
      if (m.t === "estado") {
        for (const j of m.jogadores ?? []) {
          const r = guarda.remotos.get(j.id);
          if (r) { r.alvoX = j.x; r.alvoZ = j.z; r.alvoRy = j.ry; if (typeof j.y === "number") r.alvoY = j.y; r.vistoEm = Date.now(); }
          else guarda.criarRemoto(j.id, j.nome, j.x, j.z, j.ry, typeof j.y === "number" ? j.y : null);
        }
        return;
      }
    };
    ws.onclose = () => {
      if (guarda.ws !== ws) return; // ligação velha
      guarda.ws = null;
      for (const id of [...guarda.remotos.keys()]) guarda.removerRemoto(id);
      if (!guarda.queroLigado) { guarda.setEstado("off"); return; }
      guarda.setEstado("erro");
      guarda.agendarRecon();
    };
    ws.onerror = () => { /* o onclose trata — evita duplicar aviso */ };
  }

  private agendarRecon() {
    if (!this.queroLigado || this.timerRecon) return;
    this.tentativa++;
    const espera = Math.min(15000, 2000 * this.tentativa);
    this.timerRecon = setTimeout(() => { this.timerRecon = null; this.conectar(); }, espera);
  }

  private criarRemoto(id: number, nome: string, x: number, z: number, ry: number, y: number | null = null) {
    if (this.remotos.has(id)) return;
    const grupo = avatar(CORES_AVATAR[id % CORES_AVATAR.length]);
    const etiqueta = etiquetaNome(nome);
    etiqueta.position.y = 2.35;
    grupo.add(etiqueta);
    this.remotos.set(id, {
      id, nome: String(nome ?? "Viajante"), x, y, z, ry, alvoX: x, alvoY: y, alvoZ: z, alvoRy: ry,
      vistoEm: Date.now(), grupo, etiqueta,
    });
    this.aplicarY(this.remotos.get(id)!);
  }

  private aplicarY(r: Remoto) {
    // v52 — o y REAL do servidor quando existe (quem está no telhado aparece
    // no telhado — fim do «remoto enterrado no terreno»); peers do protocolo
    // antigo (sem y) continuam pela altura do terreno, como na v36.
    if (r.alvoY !== null) {
      r.grupo.position.set(r.x, r.alvoY, r.z);
      return;
    }
    let y = ALTURA_PLATEAU;
    try { y = this.opts.alturaEm(r.x, r.z); } catch { /* fallback altura da praça */ }
    r.grupo.position.set(r.x, y, r.z);
  }

  private removerRemoto(id: number) {
    const r = this.remotos.get(id);
    if (!r) return;
    this.removerBolha(id);
    r.grupo.removeFromParent();
    r.etiqueta.material.map?.dispose();
    r.etiqueta.material.dispose();
    r.grupo.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) m.dispose();
      }
    });
    this.remotos.delete(id);
  }

  // ── v37 — chat da praça ──────────────────────────────
  private mostrarBolha(id: number, texto: string) {
    const r = this.remotos.get(id);
    if (!r) return;
    this.removerBolha(id);
    const spr = bolhaFala(texto);
    spr.position.y = 2.95;
    r.grupo.add(spr);
    this.bolhas.set(id, { spr, ate: Date.now() + 4000 });
  }

  private removerBolha(id: number) {
    const b = this.bolhas.get(id);
    if (!b) return;
    b.spr.removeFromParent();
    b.spr.material.map?.dispose();
    b.spr.material.dispose();
    this.bolhas.delete(id);
  }

  /** envia fala (sanitizada aqui e no servidor) · false = limitada/vazia — honesto */
  falar(texto: string): boolean {
    const limpo = limpaFala(texto);
    if (!limpo) return false;
    const agora = Date.now();
    if (agora - this.ultimaFalaLocal < FALA_RATE_MS) return false; // mesma regra do servidor
    if (!this.ws || this.ws.readyState !== 1 || this.estado !== "ligado") return false;
    this.ultimaFalaLocal = agora;
    try { this.ws.send(JSON.stringify({ t: "fala", texto: limpo })); return true; } catch { return false; }
  }

  /** v47 (E2E): envia uma posição IMEDIATAMENTE, sem o gate de 100 ms do passo()
   *  — reproduz dois movimentos no mesmo instante numa só tarefa JS (o rAF não
   *  corre dentro dela). A física do motor não faz dois saltos em 0,1 s; o
   *  servidor tem de recusar o segundo («parede»). Mesma via de envio real.
   *  v52 — protocolo novo: com `meuY` definido a msg ganha o eixo vertical
   *  (orçamentos de salto/voo + caminho do corpo no servidor); sem y, é uma
   *  msg do protocolo v37 (só regras do terreno) — compatibilidade honesta. */
  passoImediato(meuX: number, meuZ: number, meuRy = 0, meuY?: number, voando = false): boolean {
    if (!this.ws || this.ws.readyState !== 1 || this.estado !== "ligado") return false;
    const msg: Record<string, number | string | boolean> = {
      t: "pos", x: Math.round(meuX * 100) / 100, z: Math.round(meuZ * 100) / 100, ry: Math.round(meuRy * 100) / 100,
    };
    if (typeof meuY === "number" && Number.isFinite(meuY)) { msg.y = Math.round(meuY * 100) / 100; msg.voando = voando; }
    try {
      this.ws.send(JSON.stringify(msg));
      this.ultimoPosMs = Date.now(); // v52 — o envio imediato também conta para o ritmo 10 Hz (o rAF não duplica uma pos atrás dela)
      return true;
    } catch { return false; }
  }

  falasInfo(): FalaInfo[] { return [...this.falas]; }

  /** v53 — edições remotas recebidas (últimas 50) — o E2E prova a partilha. */
  edicoesRemotasInfo(): EdicaoRemota[] { return [...this.edicoesRemotas]; }

  /** v53 — total recebido na sessão (difusões + lotes de sincronização). */
  nEdicoesRemotas(): number { return this.totalEdicoesRemotas; }

  /** v52 — N4: reporta uma edição REAL do mundo (gancho aoEditar do motor:
   *  quebrar → id 0; colocar → id do bloco). O MESMO rate-limit do servidor
   *  no cliente — quando limitada devolve false (padrão do falar). */
  reportarEdit(x: number, y: number, z: number, id: number): boolean {
    if (!this.ws || this.ws.readyState !== 1 || this.estado !== "ligado") return false;
    const agora = Date.now();
    if (agora - this.ultimoEditMs < EDIT_RATE_MS) return false;
    this.ultimoEditMs = agora;
    try { this.ws.send(JSON.stringify({ t: "edit", x, y, z, id })); return true; } catch { return false; }
  }

  // ── v59 — presença do NPC (o MESMO gate que o servidor executa) ──────
  /** claim/heartbeat «estou a falar com a Bateu IA» — false = limitado ou
   *  offline (honesto: sem MP o NPC continua a funcionar como na v57, só
   *  não aparece à praça). Gate NPC_FALA_GATE_MS local — o SPAM não viaja. */
  npcFala(): boolean {
    if (!this.ws || this.ws.readyState !== 1 || this.estado !== "ligado") return false;
    const agora = Date.now();
    if (agora - this.ultimoNpcFalaMs < NPC_FALA_GATE_MS) return false;
    this.ultimoNpcFalaMs = agora;
    try { this.ws.send(JSON.stringify({ t: "npcfala" })); return true; } catch { return false; }
  }

  /** fim da conversa — sem gate (barato, raro); false se offline. */
  npcFim(): boolean {
    if (!this.ws || this.ws.readyState !== 1 || this.estado !== "ligado") return false;
    try { this.ws.send(JSON.stringify({ t: "npcfim" })); return true; } catch { return false; }
  }

  /** v59 — quem conversa com a Bateu IA AGORA (expiração aplicada na leitura
   *  — o estado do servidor pode ter ficado stale entre broadcasts). */
  npcConversasInfo(): ConversaNpcFio[] {
    const vivas = limparConversasExpiradas(this.npcLista, Date.now(), NPC_CONVERSA_TIMEOUT_MS).lista;
    return vivas.map((c) => ({ id: c.id, nome: c.nome }));
  }

  /** v59 — o id MP deste jogador (0 = sem sessão) — o display exclui o próprio. */
  get idNoMundo(): number { return this.meuId; }

  // ── v47 — acontecimentos reais (o painel «Praça em direto» consome) ──
  private registarEvento(e: EventoPraca) {
    this.eventos.push(e);
    if (this.eventos.length > 30) this.eventos.shift();
  }

  eventosInfo(): EventoPraca[] { return [...this.eventos]; }

  /** Pico REAL de presença desta sessão (maior «no mundo» observado). */
  picoPresenca(): number { return this.pico; }

  /** chamado a cada frame com a posição do jogador LOCAL (que continua predito no cliente)
   *  v52 — o protocolo novo envia TAMBÉM o eixo vertical (py) e o estado do
   *  voo criativo (a tecla F) — é o que a re-simulação do servidor precisa. */
  passo(dt: number, meuX: number, meuZ: number, meuRy: number, meuY?: number, voando = false) {
    const agora = Date.now();
    // v47 — pico de presença é observado, nunca estimado
    const n = this.remotos.size + (this.estado === "ligado" ? 1 : 0);
    if (n > this.pico) this.pico = n;
    // envio a ~10 Hz (servidor faz snapshot 10 Hz + throttle por distância)
    if (this.ws && this.ws.readyState === 1 && agora - this.ultimoPosMs > 100) {
      this.ultimoPosMs = agora;
      // v52 — protocolo novo: o eixo vertical real (py) + o estado do voo F
      const msg: Record<string, number | string | boolean> = { t: "pos", x: Math.round(meuX * 100) / 100, z: Math.round(meuZ * 100) / 100, ry: Math.round(meuRy * 100) / 100 };
      if (typeof meuY === "number" && Number.isFinite(meuY)) { msg.y = Math.round(meuY * 100) / 100; msg.voando = voando; }
      try { this.ws.send(JSON.stringify(msg)); } catch { /* ignora */ }
    }
    // bolhas expiradas saem (4 s de vida honesta)
    for (const [id, b] of this.bolhas) if (agora > b.ate) this.removerBolha(id);
    // interpolação suave (buffer implícito: alvo vem a 10 Hz, render a 60)
    const k = Math.min(1, dt * 8);
    const vistos = new Set<number>();
    for (const [id, r] of this.remotos) {
      if (agora - r.vistoEm > 15000) { this.removerRemoto(id); continue; } // sem news = fantasma sai
      vistos.add(id);
      r.x += (r.alvoX - r.x) * k;
      r.z += (r.alvoZ - r.z) * k;
      r.ry = lerpAng(r.ry, r.alvoRy, k);
      r.grupo.rotation.y = r.ry;
      this.aplicarY(r);
    }
  }

  remotosInfo() {
    // v52 — o y real entra no hook (o E2E prova «remoto no telhado»)
    return [...this.remotos.values()].map((r) => ({ id: r.id, nome: r.nome, x: Math.round(r.x * 10) / 10, z: Math.round(r.z * 10) / 10, y: r.alvoY !== null ? Math.round(r.alvoY * 10) / 10 : null }));
  }

  get nNoMundo() { return this.remotos.size + (this.estado === "ligado" ? 1 : 0); }

  desligar() {
    this.queroLigado = false;
    if (this.timerRecon) { clearTimeout(this.timerRecon); this.timerRecon = null; }
    if (this.ws) { try { this.ws.close(); } catch { /* ignore */ } this.ws = null; }
    for (const id of [...this.remotos.keys()]) this.removerRemoto(id);
    for (const id of [...this.bolhas.keys()]) this.removerBolha(id);
    this.falas = [];
    this.eventos = []; // sessão nova = lista nova (nunca mistura sessões)
    this.edicoesRemotas = [];
    this.totalEdicoesRemotas = 0;
    this.npcLista = []; // v59 — sessão nova = presença nova (o servidor limpa ao cair)
    this.meuId = 0;
    this.ultimoNpcFalaMs = 0;
    this.pico = 0;
    this.setEstado("off");
  }
}
