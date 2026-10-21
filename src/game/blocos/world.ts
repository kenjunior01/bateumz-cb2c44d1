// ============================================================
// BATEUCRAFT — Mundo voxel: geração procedural + malhagem
// Chunks 16×16×80 · biomas · cavernas · minérios · árvores
// ============================================================

import * as THREE from "three";
import { B, BLOCOS, CHUNK, ALTURA, NIVEL_MAR, RAIO_EXPLOSAO } from "./constants";
import { Ruido, Aleatorio } from "./noise";
import { criarAtlas, COLS_ATLAS, LINHAS_ATLAS } from "./textures";

export interface Chunk { cx: number; cz: number; dados: Uint8Array; malha?: THREE.Mesh; malhaAgua?: THREE.Mesh; sujo: boolean }

const idx = (x: number, y: number, z: number) => (y * CHUNK + z) * CHUNK + x;

export class Mundo {
  chunks = new Map<string, Chunk>();
  edits = new Map<string, number>(); // alterações do jogador "x,y,z" -> id
  ruido: Ruido; rndArvores: Aleatorio;
  grupo = new THREE.Group();
  material!: THREE.MeshLambertMaterial;
  materialAgua!: THREE.MeshLambertMaterial;

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
  alturaTerreno(x: number, z: number): number {
    const base = this.ruido.fbm2(x * 0.012, z * 0.012, 4);
    const montanha = this.ruido.fbm2(x * 0.004 + 500, z * 0.004 + 500, 3);
    const detalhe = this.ruido.n2(x * 0.06, z * 0.06);
    let h = 28 + base * 22 + Math.max(0, montanha - 0.55) * 70 + detalhe * 3;
    return Math.max(4, Math.min(ALTURA - 6, Math.floor(h)));
  }

  bioma(x: number, z: number): "planicie" | "deserto" | "floresta" | "montanha" {
    const t = this.ruido.fbm2(x * 0.005 + 900, z * 0.005 + 900, 3);
    if (this.alturaTerreno(x, z) > 52) return "montanha";
    if (t < 0.36) return "deserto";
    if (t > 0.62) return "floresta";
    return "planicie";
  }

  // ── Geração de um chunk ──────────────────────────────────────
  gerarChunk(cx: number, cz: number): Chunk {
    const dados = new Uint8Array(CHUNK * CHUNK * ALTURA);
    for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
      const x = cx * CHUNK + lx, z = cz * CHUNK + lz;
      const h = this.alturaTerreno(x, z);
      const bioma = this.bioma(x, z);
      for (let y = 0; y < ALTURA; y++) {
        let id: number = B.AR;
        if (y === 0 || (y === 1 && this.ruido.n3(x, y, z) < 0.5)) id = B.ROCHA_MAE;
        else if (y < h - 3) {
          id = B.PEDRA;
          // cavernas 3D
          if (y > 3 && y < h - 4) {
            const c = this.ruido.n3(x * 0.075, y * 0.1, z * 0.075);
            if (c > 0.74) id = B.AR;
          }
          // minérios por profundidade (raros — progressão difícil)
          if (id === B.PEDRA) {
            const r = this.ruido.n3(x * 0.9 + 40, y * 0.9 + 40, z * 0.9 + 40);
            if (y < 48 && r > 0.988) id = B.CARVAO_M;
            else if (y < 32 && r < 0.012) id = B.FERRO_M;
            else if (y < 20 && r > 0.985) id = B.OURO_M;
            else if (y < 14 && r < 0.007) id = B.DIAMANTE_M;
          }
        } else if (y < h) id = bioma === "deserto" ? B.AREIA : B.TERRA;
        else if (y === h) id = bioma === "deserto" ? B.AREIA : (h < NIVEL_MAR + 1 ? B.AREIA : B.RELVA);
        else if (y <= NIVEL_MAR) id = B.AGUA;
        dados[idx(lx, y, lz)] = id;
      }
      // árvore (só em terra firme acima do mar)
      if (h > NIVEL_MAR + 1 && dados[idx(lx, h, lz)] === B.RELVA) {
        const pArvore = bioma === "floresta" ? 0.035 : bioma === "planicie" ? 0.008 : 0;
        if (this.rndArvores.proximo() < pArvore && lx > 1 && lx < CHUNK - 2 && lz > 1 && lz < CHUNK - 2) {
          const alt = 4 + Math.floor(this.rndArvores.proximo() * 3);
          for (let t = 1; t <= alt; t++) dados[idx(lx, h + t, lz)] = B.TRONCO;
          for (let dy = alt - 2; dy <= alt + 1; dy++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
            const dist = Math.abs(dx) + Math.abs(dz) + Math.abs(dy - alt + 0.5) * 1.4;
            if (dist <= 3.4 && !(dx === 0 && dz === 0 && dy < alt)) {
              const px2 = lx + dx, py = h + dy + 1, pz2 = lz + dz;
              if (px2 >= 0 && px2 < CHUNK && pz2 >= 0 && pz2 < CHUNK && py < ALTURA && dados[idx(px2, py, pz2)] === B.AR)
                dados[idx(px2, py, pz2)] = B.FOLHAS;
            }
          }
        }
      }
    }
    // aplicar edições guardadas
    for (const [k, v] of this.edits) {
      const [ex, ey, ez] = k.split(",").map(Number);
      if (Math.floor(ex / CHUNK) === cx && Math.floor(ez / CHUNK) === cz)
        dados[idx(((ex % CHUNK) + CHUNK) % CHUNK, ey, ((ez % CHUNK) + CHUNK) % CHUNK)] = v;
    }
    return { cx, cz, dados, sujo: true };
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
    if (marcarEdit) {
      this.edits.set(`${x},${y},${z}`, id);
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

  // ── Explosão (Estourador) — destrói blocos num raio ─────────
  explodir(cx: number, cy: number, cz: number, rnd: Aleatorio): [number, number, number][] {
    const removidos: [number, number, number][] = [];
    const r = Math.ceil(RAIO_EXPLOSAO);
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
      const d = Math.hypot(dx, dy, dz);
      if (d > RAIO_EXPLOSAO + rnd.proximo() * 0.6) continue;
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

    for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
      const wx = baseX + lx, wz = baseZ + lz;
      const superficie = this.alturaTerreno(wx, wz);
      for (let y = 0; y < ALTURA; y++) {
        const id = c.dados[idx(lx, y, lz)];
        if (id === B.AR) continue;
        const def = BLOCOS[id];
        if (!def) continue;
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

  // posição segura de spawn: topo da coluna
  spawnPos(): [number, number, number] {
    for (let tent = 0; tent < 200; tent++) {
      const x = Math.floor(this.rndArvores.intervalo(-20, 20));
      const z = Math.floor(this.rndArvores.intervalo(-20, 20));
      const h = this.alturaTerreno(x, z);
      if (h > NIVEL_MAR + 1 && this.bioma(x, z) !== "montanha") return [x + 0.5, h + 1.02, z + 0.5];
    }
    return [0.5, this.alturaTerreno(0, 0) + 1.02, 0.5];
  }
}
