// ============================================================
// BATEUCRAFT — Mundo voxel: geração procedural + malhagem
// Chunks 16×16×80 · biomas · cavernas · minérios · árvores
// ============================================================

import * as THREE from "three";
import { B, BLOCOS, CHUNK, ALTURA, NIVEL_MAR, RAIO_EXPLOSAO } from "./constants";
import { Ruido, Aleatorio } from "./noise";
import { criarAtlas, COLS_ATLAS, LINHAS_ATLAS, TILE } from "./textures";
import { gerarDadosTerreno, aplicarEditsChunk, somaBytes, alturaTerrenoBase, biomaBase, type PerfilTerreno } from "./geracao";

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
    const d = BLOCOS[this.getBloco(Math.floor(x), Math.floor(y), Math.floor(z))];
    return !!d && d.solido;
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

  // ── Malhagem de chunk (faces visíveis + AO por vértice) ──────
  private static UVs = (() => {
    const w = COLS_ATLAS, h = LINHAS_ATLAS;
    const uvPorTile = (t: number) => {
      const col = t % w, lin = Math.floor(t / w);
      const u0 = col / w, v1 = 1 - lin / h, u1 = (col + 1) / w, v0 = 1 - (lin + 1) / h;
      return { u0, v0, u1, v1 };
    };
    return uvPorTile;
  })();

  construirMalha(c: Chunk) {
    const baseX = c.cx * CHUNK, baseZ = c.cz * CHUNK;
    const pos: number[] = [], nor: number[] = [], uv: number[] = [], cor: number[] = [], ind: number[] = [];
    const posA: number[] = [], norA: number[] = [], uvA: number[] = [], corA: number[] = [], indA: number[] = [];

    const face = (
      x: number, y: number, z: number, dir: [number, number, number],
      verts: [number, number, number][], tile: number, sombra: number, alvo: "s" | "a", tileLado?: number,
    ) => {
      const { u0, v0, u1, v1 } = Mundo.UVs(tile);
      const P = alvo === "s" ? pos : posA, N = alvo === "s" ? nor : norA,
        U = alvo === "s" ? uv : uvA, C = alvo === "s" ? cor : corA, I2 = alvo === "s" ? ind : indA;
      const ini = P.length / 3;
      const [dx, dy, dz] = dir;
      // AO por vértice: amostra vizinhos diagonais
      const aov = verts.map(([vx, vy, vz]) => {
        // amostragem simples: dois vizinhos laterais ao vértice, no plano da face
        let oc = 0;
        const ex = dx !== 0 ? 0 : 1, ey = dy !== 0 ? 0 : 1, ez = dz !== 0 ? 0 : 1;
        const bx = x + dx, by = y + dy, bz = z + dz;
        if (ex) { if (this.solido(bx, by + (vy ? -0.5 : 0.5), bz)) oc++; if (this.solido(bx, by, bz + (vz ? -0.5 : 0.5))) oc++; }
        if (ey) { if (this.solido(bx + (vx ? -0.5 : 0.5), by, bz)) oc++; if (this.solido(bx, by, bz + (vz ? -0.5 : 0.5))) oc++; }
        if (ez) { if (this.solido(bx + (vx ? -0.5 : 0.5), by, bz)) oc++; if (this.solido(bx, by + (vy ? -0.5 : 0.5), bz)) oc++; }
        return 1 - oc * 0.16;
      });
      for (let i = 0; i < 4; i++) {
        const [vx, vy, vz] = verts[i];
        P.push(x + vx, y + vy, z + vz);
        N.push(dx, dy, dz);
        C.push(sombra * aov[i], sombra * aov[i], sombra * aov[i]);
      }
      const m = 0.001;
      if (dir[1] === 1) U.push(u0 + m, v0 + m, u1 - m, v0 + m, u1 - m, v1 - m, u0 + m, v1 - m);
      else if (dir[1] === -1) U.push(u0 + m, v1 - m, u1 - m, v1 - m, u1 - m, v0 + m, u0 + m, v0 + m);
      else if (dir[0] === 1) U.push(u1 - m, v1 - m, u0 + m, v1 - m, u0 + m, v0 + m, u1 - m, v0 + m);
      else if (dir[0] === -1) U.push(u0 + m, v1 - m, u1 - m, v1 - m, u1 - m, v0 + m, u0 + m, v0 + m);
      else if (dir[2] === 1) U.push(u0 + m, v1 - m, u1 - m, v1 - m, u1 - m, v0 + m, u0 + m, v0 + m);
      else U.push(u1 - m, v1 - m, u0 + m, v1 - m, u0 + m, v0 + m, u1 - m, v0 + m);
      I2.push(ini, ini + 1, ini + 2, ini, ini + 2, ini + 3);
      void tileLado;
    };

    const FACES: { dir: [number, number, number]; verts: [number, number, number][]; sombra: number; escolher: "topo" | "baixo" | "lado" }[] = [
      { dir: [0, 1, 0], verts: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], sombra: 1.0, escolher: "topo" },
      { dir: [0, -1, 0], verts: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], sombra: 0.5, escolher: "baixo" },
      { dir: [1, 0, 0], verts: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], sombra: 0.8, escolher: "lado" },
      { dir: [-1, 0, 0], verts: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], sombra: 0.8, escolher: "lado" },
      { dir: [0, 0, 1], verts: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], sombra: 0.65, escolher: "lado" },
      { dir: [0, 0, -1], verts: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], sombra: 0.65, escolher: "lado" },
    ];

    // blocos em CRUZ (erva, flores): 2 planos diagonais × 2 lados, sem AO (v29)
    const emitirCruz = (x: number, y: number, z: number, tile: number, luz: number) => {
      const { u0, v0, u1, v1 } = Mundo.UVs(tile);
      // RECOLHA de ½ texel: sem ela, o filtro vizinho mais próximo sangra
      // o tile contíguo do atlas nas bordas → contornos escuros em cada erva/flor
      const m = 0.5 / (COLS_ATLAS * TILE);
      const mv = 0.5 / (LINHAS_ATLAS * TILE);
      const uA = u0 + m, uB = u1 - m, vA = v0 + mv, vB = v1 - mv;
      const planos: [[number, number], [number, number]][] = [
        [[0.09, 0.09], [0.91, 0.91]],
        [[0.91, 0.09], [0.09, 0.91]],
      ];
      for (const [[ax, az], [bx, bz]] of planos) {
        for (const inv of [false, true]) { // 2ª passagem com windding invertido = visível dos dois lados
          const ini = pos.length / 3;
          const vs = inv
            ? [[bx, 0, bz], [ax, 0, az], [ax, 1, az], [bx, 1, bz]]
            : [[ax, 0, az], [bx, 0, bz], [bx, 1, bz], [ax, 1, az]];
          for (const [vx, vy, vz] of vs) { pos.push(x + vx, y + vy, z + vz); nor.push(0, 1, 0); cor.push(luz, luz, luz); }
          uv.push(uA, vA, uB, vA, uB, vB, uA, vB);
          ind.push(ini, ini + 1, ini + 2, ini, ini + 2, ini + 3);
        }
      }
    };

    for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
      const wx = baseX + lx, wz = baseZ + lz;
      const superficie = this.alturaTerreno(wx, wz);
      for (let y = 0; y < ALTURA; y++) {
        const id = c.dados[idx(lx, y, lz)];
        if (id === B.AR) continue;
        const def = BLOCOS[id];
        if (!def) continue;
        // cruz: 2 planos diagonais com alfa (erva/flores) — nunca oclui vizinhos
        if (def.cruz) {
          const profC = Math.max(0, Math.min(1, (superficie - 3 - y) / 9));
          emitirCruz(wx, y, wz, def.tiles[0], 1 - profC * 0.72);
          continue;
        }
        const aguada = !!def.liquido;
        for (const f of FACES) {
          const nx = wx + f.dir[0], ny = y + f.dir[1], nz = wz + f.dir[2];
          const viz = this.getBloco(nx, ny, nz);
          const defViz = BLOCOS[viz];
          const mostrar = viz === B.AR || (defViz && defViz.transparente && !def.transparente) ||
            (def.transparente && viz === B.AGUA && id !== B.AGUA);
          if (!mostrar) continue;
          if (aguada && f.dir[1] !== 1) continue; // água: só topo
          const tile = f.escolher === "topo" ? def.tiles[0] : f.escolher === "baixo" ? def.tiles[1] : def.tiles[2];
          // escurecer pela profundidade (cavernas escuras)
          const prof = Math.max(0, Math.min(1, (superficie - 3 - y) / 9));
          const luz = aguada ? 1 : (1 - prof * 0.72);
          face(wx, y, wz, f.dir, f.verts as [number, number, number][], tile, f.sombra * luz, aguada ? "a" : "s");
        }
      }
    }

    const montar = (P: number[], N: number[], U: number[], C: number[], I2: number[], mat: THREE.Material): THREE.Mesh | undefined => {
      if (!I2.length) return undefined;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
      g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3));
      g.setIndex(I2);
      const m = new THREE.Mesh(g, mat);
      m.frustumCulled = true;
      return m;
    };

    for (const antigo of [c.malha, c.malhaAgua]) if (antigo) { this.grupo.remove(antigo); antigo.geometry.dispose(); }
    c.malha = montar(pos, nor, uv, cor, ind, this.material);
    c.malhaAgua = montar(posA, norA, uvA, corA, indA, this.materialAgua);
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
