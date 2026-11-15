// ============================================================
// BATEUCRAFT — Mundo voxel: geração procedural + malhagem
// Chunks 16×16×80 · biomas · cavernas · minérios · árvores
// ============================================================

import * as THREE from "three";
import { B, CHUNK, ALTURA, NIVEL_MAR, RAIO_EXPLOSAO, solidoId } from "./constants.ts";
import { Ruido, Aleatorio } from "./noise.ts";
import { criarAtlas } from "./textures.ts";
import { gerarDadosTerreno, aplicarEditsChunk, somaBytes, alturaTerrenoBase, biomaBase, type PerfilTerreno } from "./geracao.ts";
import { construirDadosMalha, malhaIgual, type DadosMalha, type VizinhosMalha } from "./malha.ts";

export interface Chunk { cx: number; cz: number; dados: Uint8Array; malha?: THREE.Mesh; malhaAgua?: THREE.Mesh; sujo: boolean }

const idx = (x: number, y: number, z: number) => (y * CHUNK + z) * CHUNK + x;

export class Mundo {
  chunks = new Map<string, Chunk>();
  edits = new Map<string, number>(); // alterações do jogador "x,y,z" -> id
  tochas = new Set<string>();       // posições de tochas colocadas (para luz real)
  ruido: Ruido; rndArvores: Aleatorio;
  grupo = new THREE.Group();
  material!: THREE.MeshLambertMaterial;
  materialAgua!: THREE.MeshLambertMaterial;

  // ── v46: geração de DADOS de chunk em Web Worker (padrão Veloren) ──
  // a malha continua no main thread (THREE); os DADOS são paralelizáveis.
  // As subclasses declaram o perfil de terreno para o worker usar AS MESMAS
  // fórmulas puras (terrenoRpg/terrenoCidade) — zero segunda fonte.
  perfilId = "base";
  worker: Worker | null = null;
  workerAtivo = false;
  workerErro = "";
  pendentes = new Set<string>();
  geradosWorker = 0; geradosSync = 0; emergencias = 0; descartados = 0;
  msUltimoWorker = 0; msWorkerTotal = 0;

  // ── v51: MALHAGEM em Web Worker (padrão Veloren: meshing threads) ──
  // o trabalho pesado (faces/AO/UV) corre no worker; o main thread SÓ
  // cria as BufferGeometry dos buffers prontos (o upload à GPU). Sync
  // permanece para o spawn/teleporte/emergência (E2Es assumem terreno
  // imediato — anotação v46) e como fallback honesto se o worker falhar.
  malhador: Worker | null = null;
  malhadorAtivo = false;
  malhadorErro = "";
  pendentesMalha = new Set<string>();
  malhasProntas: { cx: number; cz: number; dm: DadosMalha; ms: number }[] = [];
  malhasPedidas = 0; malhadosWorker = 0; malhadosSync = 0; malhasDescartadas = 0;
  msMalhaUltimo = 0; msMalhaWorkerTotal = 0; msMalhaSyncTotal = 0;

  constructor(public semente: number) {
    this.ruido = new Ruido(semente);
    this.rndArvores = new Aleatorio(semente * 31 + 7);
    const atlas = criarAtlas();
    const tex = new THREE.CanvasTexture(atlas);
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.material = new THREE.MeshLambertMaterial({ map: tex, vertexColors: true, alphaTest: 0.5 });
    this.materialAgua = new THREE.MeshLambertMaterial({
      map: tex, vertexColors: true, transparent: true, opacity: 0.72,
      depthWrite: false, side: THREE.DoubleSide,
    });
  }

  // ── Altura do terreno (mapa de alturas determinístico) ──────
  // v46: delega nas funções puras de geracao.ts — as MESMAS que o worker
  // usa (as subclasses sobrepõem por delegação aos seus perfis puras).
  alturaTerreno(x: number, z: number): number {
    return alturaTerrenoBase(this.ruido, x, z);
  }

  bioma(x: number, z: number): "planicie" | "deserto" | "floresta" | "montanha" {
    return biomaBase(this.ruido, x, z);
  }

  // ── Geração de um chunk (main thread) ────────────────────────────
  // v46: as colunas vêm de gerarDadosTerreno (o MESMO algoritmo que o
  // worker corre) + edições + carimbos do mundo via posGerar().
  gerarChunk(cx: number, cz: number): Chunk {
    this.geradosSync++;
    const dados = gerarDadosTerreno(this.ruido, cx, cz, this.perfil());
    return this.finalizarChunk(cx, cz, dados);
  }

  /** Par de funções de terreno desta instância (as subclasses delegam
   *  nas suas funções puras — o worker usa exactamente essas). */
  perfil(): PerfilTerreno {
    return { altura: (x, z) => this.alturaTerreno(x, z), bioma: (x, z) => this.bioma(x, z) };
  }

  /** Fase comum aos dois caminhos de geração (sync e worker): edições do
   *  jogador + carimbos específicos do mundo. Único ponto de entrada. */
  private finalizarChunk(cx: number, cz: number, dados: Uint8Array): Chunk {
    aplicarEditsChunk(dados, this.edits, cx, cz);
    const c: Chunk = { cx, cz, dados, sujo: true };
    this.posGerar(c);
    return c;
  }

  /** Carimbos específicos do mundo (POIs do RPG, distritos da CIDADE) —
   *  baratos, ficam no main thread; as subclasses sobrepõem. */
  protected posGerar(_c: Chunk) { void _c; }

  // ── v46: worker de geração ──────────────────────────────────
  ativarWorker(): boolean {
    if (this.worker) return this.workerAtivo;
    try {
      const w = new Worker(new URL("./geradorTerreno.worker.ts", import.meta.url), { type: "module" });
      w.onerror = (e) => { this.workerErro = e.message || "erro no worker"; this.workerAtivo = false; };
      w.onmessage = (e: MessageEvent) => this.receberDoWorker(e.data);
      w.postMessage({ tipo: "init", semente: this.semente, perfil: this.perfilId });
      this.worker = w;
      this.workerAtivo = true;
    } catch (err) {
      this.workerErro = String(err);
      this.workerAtivo = false;
    }
    return this.workerAtivo;
  }

  desativarWorker() {
    if (this.worker) { try { this.worker.terminate(); } catch { /* ignore */ } }
    this.worker = null;
    this.workerAtivo = false;
    this.pendentes.clear();
  }

  // ── v51: worker de MALHAGEM ─────────────────────────────────
  ativarMalhador(): boolean {
    if (this.malhador) return this.malhadorAtivo;
    try {
      const w = new Worker(new URL("./malhador.worker.ts", import.meta.url), { type: "module" });
      w.onerror = (e) => { this.malhadorErro = e.message || "erro no malhador"; this.malhadorAtivo = false; this.pendentesMalha.clear(); };
      w.onmessage = (e: MessageEvent) => this.receberMalhaDoWorker(e.data);
      w.postMessage({ tipo: "init", semente: this.semente, perfil: this.perfilId });
      this.malhador = w;
      this.malhadorAtivo = true;
    } catch (err) {
      this.malhadorErro = String(err);
      this.malhadorAtivo = false;
    }
    return this.malhadorAtivo;
  }

  desativarMalhador() {
    if (this.malhador) { try { this.malhador.terminate(); } catch { /* ignore */ } }
    this.malhador = null;
    this.malhadorAtivo = false;
    this.pendentesMalha.clear();
    this.malhasProntas = [];
  }

  /** Dados crus dos 4 vizinhos (para a malha respeitar as fronteiras
   *  e o AO — o MESMO critério do getBloco antigo: ausente = AR). */
  vizinhosMalha(cx: number, cz: number): VizinhosMalha {
    const n = (dx: number, dz: number) => this.getChunk(cx + dx, cz + dz)?.dados;
    return { xn: n(-1, 0), xp: n(1, 0), zn: n(0, -1), zp: n(0, 1) };
  }

  /** Construção PURA dos buffers (usada pelo caminho sync e pela
   *  verificação de identidade compararMalhaComSync). */
  dadosMalha(c: Chunk): DadosMalha {
    return construirDadosMalha(c.cx, c.cz, c.dados, this.vizinhosMalha(c.cx, c.cz), (x, z) => this.alturaTerreno(x, z));
  }

  /** Pede a MALHA de um chunk ao worker. Os dados vão como CÓPIAS
   *  (structured clone — o main thread mantém os seus). A resposta
   *  entra na fila malhasProntas e o motor aplica com orçamento. */
  pedirMalha(c: Chunk): boolean {
    if (!this.malhadorAtivo || !this.malhador) return false;
    const k = this.chave(c.cx, c.cz);
    if (this.pendentesMalha.has(k)) return false;
    this.pendentesMalha.add(k);
    this.malhasPedidas++;
    this.malhador.postMessage({ tipo: "malhar", cx: c.cx, cz: c.cz, dados: c.dados, vizinhos: this.vizinhosMalha(c.cx, c.cz) });
    return true;
  }

  private receberMalhaDoWorker(m: { tipo?: string; cx?: number; cz?: number; dm?: DadosMalha; ms?: number }) {
    if (m?.tipo !== "malha" || typeof m.cx !== "number" || typeof m.cz !== "number" || !m.dm) return;
    const k = this.chave(m.cx, m.cz);
    this.pendentesMalha.delete(k);
    const ms = m.ms ?? 0;
    this.msMalhaUltimo = ms;
    if (!this.chunks.has(k)) { this.malhasDescartadas++; return; } // descartado longe enquanto em voo
    this.malhasProntas.push({ cx: m.cx, cz: m.cz, dm: m.dm, ms });
  }

  /** Aplica as malhas prontas do worker com orçamento por frame —
   *  o main thread só faz o upload (BufferGeometry) da parte barata. */
  processarMalhasProntas(orcamento = 4) {
    while (orcamento > 0 && this.malhasProntas.length > 0) {
      const p = this.malhasProntas.shift()!;
      const c = this.chunks.get(this.chave(p.cx, p.cz));
      if (!c) { this.malhasDescartadas++; continue; }
      this.montarMalha(c, p.dm);
      this.malhadosWorker++;
      this.msMalhaWorkerTotal += p.ms;
      orcamento--;
    }
  }

  /** Contagens honestas da malhagem (E2E v51). */
  infoMalha() {
    return {
      malhador: this.malhadorAtivo, erroMalhador: this.malhadorErro, perfil: this.perfilId,
      pedidas: this.malhasPedidas, malhadasWorker: this.malhadosWorker, malhadasSync: this.malhadosSync,
      descartadas: this.malhasDescartadas, pendentes: this.pendentesMalha.size, prontas: this.malhasProntas.length,
      msUltimoWorker: Math.round(this.msMalhaUltimo), msWorkerTotal: Math.round(this.msMalhaWorkerTotal),
      msSyncTotal: Math.round(this.msMalhaSyncTotal),
    };
  }

  /** Prova de identidade da MALHA: reconstrói os buffers PELO CAMINHO
   *  SYNC (dados vivos + vizinhos vivos + altura do perfil) e compara
   *  com a malha viva (que pode ter vindo do worker) — bit a bit. */
  compararMalhaComSync(cx: number, cz: number): {
    igual: boolean; vertsLive: number; vertsSync: number; vertsAguaLive: number; vertsAguaSync: number; msSync: number;
  } {
    const t0 = performance.now();
    const live = this.chunks.get(this.chave(cx, cz));
    if (!live || !live.malha) return { igual: false, vertsLive: -1, vertsSync: -1, vertsAguaLive: -1, vertsAguaSync: -1, msSync: 0 };
    const dm = this.dadosMalha(live);
    const g = live.malha.geometry, gA = live.malhaAgua?.geometry;
    const att = (geo: THREE.BufferGeometry, nome: string) => Array.from(geo.getAttribute(nome).array as ArrayLike<number>);
    // o índice vive em geometry.index (NÃO em attributes) — THREE mantém-no à parte
    const idxArr = (geo: THREE.BufferGeometry | null) =>
      geo?.index ? Array.from(geo.index.array as ArrayLike<number>) : [];
    const iguais = malhaIgual(dm, {
      pos: new Float32Array(att(g, "position")), nor: new Float32Array(att(g, "normal")),
      uv: new Float32Array(att(g, "uv")), cor: new Float32Array(att(g, "color")),
      ind: new Uint32Array(idxArr(g)),
      posA: gA ? new Float32Array(att(gA, "position")) : new Float32Array(0),
      norA: gA ? new Float32Array(att(gA, "normal")) : new Float32Array(0),
      uvA: gA ? new Float32Array(att(gA, "uv")) : new Float32Array(0),
      corA: gA ? new Float32Array(att(gA, "color")) : new Float32Array(0),
      indA: new Uint32Array(idxArr(gA)),
    });
    return {
      igual: iguais,
      vertsLive: g.getAttribute("position").count, vertsSync: dm.pos.length / 3,
      vertsAguaLive: gA ? gA.getAttribute("position").count : 0, vertsAguaSync: dm.posA.length / 3,
      msSync: Math.round(performance.now() - t0),
    };
  }

  private receberDoWorker(m: { tipo?: string; cx?: number; cz?: number; dados?: ArrayBuffer; ms?: number }) {
    if (m?.tipo !== "chunk" || typeof m.cx !== "number" || typeof m.cz !== "number" || !m.dados) return;
    const k = this.chave(m.cx, m.cz);
    this.pendentes.delete(k);
    const ms = m.ms ?? 0;
    this.msUltimoWorker = ms;
    this.msWorkerTotal += ms;
    if (this.chunks.has(k)) { this.descartados++; return; } // física/teleporte já garantiu sync
    const c = this.finalizarChunk(m.cx, m.cz, new Uint8Array(m.dados));
    this.chunks.set(k, c);
    this.geradosWorker++;
  }

  /** Pede os dados de um chunk ao worker (sem duplicar pedidos).
   *  A resposta entra pelo MESMO caminho do sync (edições + carimbos). */
  pedirChunk(cx: number, cz: number): boolean {
    if (!this.workerAtivo || !this.worker) return false;
    const k = this.chave(cx, cz);
    if (this.chunks.has(k) || this.pendentes.has(k)) return false;
    this.pendentes.add(k);
    this.worker.postMessage({ tipo: "gerar", cx, cz });
    return true;
  }

  /** Contagens honestas da geração (E2E v46). */
  infoGeracao() {
    return {
      worker: this.workerAtivo, erroWorker: this.workerErro, perfil: this.perfilId,
      semente: this.semente, geradosWorker: this.geradosWorker, geradosSync: this.geradosSync,
      emergencias: this.emergencias, pendentes: this.pendentes.size, descartados: this.descartados,
      carregados: this.chunks.size, msUltimoWorker: Math.round(this.msUltimoWorker),
      msWorkerTotal: Math.round(this.msWorkerTotal),
    };
  }

  /** Prova de identidade byte a byte: regenera o chunk PELO CAMINHO SYNC
   *  (ruido fresco da mesma semente + edições + carimbos) e compara a soma
   *  de bytes com o chunk vivo (que pode ter vindo do worker). */
  compararComSync(cx: number, cz: number): { igual: boolean; somaLive: number; somaSync: number; msSync: number } {
    const t0 = performance.now();
    const dados = gerarDadosTerreno(new Ruido(this.semente), cx, cz, this.perfil());
    const c = this.finalizarChunk(cx, cz, dados);
    const msSync = performance.now() - t0;
    const live = this.chunks.get(this.chave(cx, cz));
    if (!live) return { igual: false, somaLive: -1, somaSync: somaBytes(c.dados), msSync };
    const somaLive = somaBytes(live.dados), somaSync = somaBytes(c.dados);
    return { igual: somaLive === somaSync, somaLive, somaSync, msSync: Math.round(msSync) };
  }

  chave(cx: number, cz: number) { return `${cx},${cz}`; }

  getChunk(cx: number, cz: number): Chunk | undefined { return this.chunks.get(this.chave(cx, cz)); }

  garantir(cx: number, cz: number): Chunk {
    const k = this.chave(cx, cz);
    let c = this.chunks.get(k);
    if (!c) { c = this.gerarChunk(cx, cz); this.chunks.set(k, c); }
    return c;
  }

  getBloco(x: number, y: number, z: number): number {
    if (y < 0 || y >= ALTURA) return B.AR;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.chunks.get(this.chave(cx, cz));
    if (!c) return B.AR;
    return c.dados[idx(((x % CHUNK) + CHUNK) % CHUNK, y, ((z % CHUNK) + CHUNK) % CHUNK)];
  }

  setBloco(x: number, y: number, z: number, id: number, marcarEdit = true) {
    if (y < 0 || y >= ALTURA) return;
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    const c = this.chunks.get(this.chave(cx, cz));
    if (!c) return;
    const lx = ((x % CHUNK) + CHUNK) % CHUNK, lz = ((z % CHUNK) + CHUNK) % CHUNK;
    c.dados[idx(lx, y, lz)] = id;
    const chave = `${x},${y},${z}`;
    if (id === B.TOCHA) this.tochas.add(chave); else this.tochas.delete(chave);
    if (marcarEdit) {
      this.edits.set(chave, id);
      // editar também na génese futura (regen de chunk descarregado)
    }
    c.sujo = true;
    // vizinhos de fronteira também precisam de remalhar
    if (lx === 0) { const v = this.getChunk(cx - 1, cz); if (v) v.sujo = true; }
    if (lx === CHUNK - 1) { const v = this.getChunk(cx + 1, cz); if (v) v.sujo = true; }
    if (lz === 0) { const v = this.getChunk(cx, cz - 1); if (v) v.sujo = true; }
    if (lz === CHUNK - 1) { const v = this.getChunk(cx, cz + 1); if (v) v.sujo = true; }
  }

  solido(x: number, y: number, z: number): boolean {
    // v52 — N4: a semântica vive em solidoId (constants.ts) — a MESMA tabela
    // que a re-simulação do servidor usa (zero segunda fonte).
    return solidoId(this.getBloco(Math.floor(x), Math.floor(y), Math.floor(z)));
  }

  // ── Explosão (Estourador / TNT) — destrói blocos num raio ──
  explodir(cx: number, cy: number, cz: number, rnd: Aleatorio, raio = RAIO_EXPLOSAO): [number, number, number][] {
    const removidos: [number, number, number][] = [];
    const r = Math.ceil(raio);
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      const d = Math.hypot(dx, dy, dz);
      if (d > raio + rnd.proximo() * 0.6) continue;
      const x = cx + dx, y = cy + dy, z = cz + dz;
      const id = this.getBloco(x, y, z);
      if (id === B.AR || id === B.AGUA || id === B.ROCHA_MAE) continue;
      this.setBloco(x, y, z, B.AR);
      removidos.push([x, y, z]);
    }
    return removidos;
  }

  // ── Malhagem de chunk (v51: buffers PUROS em malha.ts) ──────
  // construirMalha = caminho SYNC (spawn/teleporte/emergência/fallback):
  // calcula os buffers no próprio frame e cria as geometrias.
  construirMalha(c: Chunk) {
    const t0 = performance.now();
    const dm = this.dadosMalha(c);
    this.montarMalha(c, dm);
    this.malhadosSync++;
    this.msMalhaSyncTotal += performance.now() - t0;
  }

  /** O único ponto onde THREE entra na malhagem: typed arrays prontos →
   *  BufferGeometry + Mesh (a parte barata — upload). Os números são
   *  EXACTAMENTE os mesmos do caminho do worker (compararMalhaComSync
   *  prova bit a bit no E2E v51). */
  montarMalha(c: Chunk, dm: DadosMalha) {
    const montar = (solidos: boolean, mat: THREE.Material): THREE.Mesh | undefined => {
      const I2 = solidos ? dm.ind : dm.indA;
      if (!I2.length) return undefined;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(solidos ? dm.pos : dm.posA, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(solidos ? dm.nor : dm.norA, 3));
      g.setAttribute("uv", new THREE.BufferAttribute(solidos ? dm.uv : dm.uvA, 2));
      g.setAttribute("color", new THREE.BufferAttribute(solidos ? dm.cor : dm.corA, 3));
      g.setIndex(new THREE.BufferAttribute(I2, 1));
      const m = new THREE.Mesh(g, mat);
      m.frustumCulled = true;
      return m;
    };
    for (const antigo of [c.malha, c.malhaAgua]) if (antigo) { this.grupo.remove(antigo); antigo.geometry.dispose(); }
    c.malha = montar(true, this.material);
    c.malhaAgua = montar(false, this.materialAgua);
    if (c.malha) this.grupo.add(c.malha);
    if (c.malhaAgua) this.grupo.add(c.malhaAgua);
    c.sujo = false;
  }

  // posição segura de spawn — AGORA perto de floresta (v29):
  // a progressão começa por soque um tronco, por isso o jogador
  // tem de nascer com árvores à vista. Procura floresta em anéis
  // (determinístico), depois planície; deserto/montanha são evitados.
  spawnPos(): [number, number, number] {
    let planicie: [number, number, number] | null = null;
    let qualquer: [number, number, number] | null = null;
    for (let r = 0; r <= 360; r += 8) {
      const passos = Math.max(1, Math.floor((r * 6.283) / 8));
      for (let a = 0; a < passos; a++) {
        const ang = (a / passos) * 6.283 + r * 0.35;
        const x = Math.round(Math.cos(ang) * r), z = Math.round(Math.sin(ang) * r);
        const h = this.alturaTerreno(x, z);
        if (h <= NIVEL_MAR + 1) continue;
        const b = this.bioma(x, z);
        const pos: [number, number, number] = [x + 0.5, h + 1.02, z + 0.5];
        if (b === "floresta") return pos;
        if (b === "planicie" && !planicie) planicie = pos;
        if (!qualquer) qualquer = pos;
      }
      if (r >= 120 && planicie) return planicie; // planície a >120 blocos já serve
    }
    if (planicie) return planicie;
    if (qualquer) return qualquer;
    return [0.5, this.alturaTerreno(0, 0) + 1.02, 0.5];
  }
}
