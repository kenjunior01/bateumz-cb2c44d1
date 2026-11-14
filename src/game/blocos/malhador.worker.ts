// ============================================================
// BATEUCRAFT — WORKER DE MALHAGEM (v51)
// Padrão do Veloren: a malhagem de chunks corre nas meshing
// threads — só os buffers prontos chegam ao render thread
// (docs/REA-veloren-v35.md §world). Aqui corre APENAS a
// construção de vértices (faces/AO/UV — malha.ts pura, o MESMO
// algoritmo que o main thread usa no caminho sync). O THREE
// (BufferGeometry/upload) fica no main thread: o dono honesto
// da cena. Os dados do chunk e dos 4 vizinhos chegam por
// mensagem (cópias — o main thread mantém os seus); a resposta
// sai com buffers TRANSFERIDOS (zero cópia de volta).
// ============================================================

import { Ruido } from "./noise.ts";
import { perfilBase, type PerfilTerreno } from "./geracao.ts";
import { perfilRpg } from "../rpg/terrenoRpg.ts";
import { perfilCidade } from "../cidade/terrenoCidade.ts";
import { construirDadosMalha } from "./malha.ts";

let perfil: PerfilTerreno | null = null;

self.onmessage = (e: MessageEvent) => {
  const m = e.data as {
    tipo?: string; semente?: number; perfil?: string;
    cx?: number; cz?: number; dados?: Uint8Array;
    vizinhos?: { xn?: Uint8Array; xp?: Uint8Array; zn?: Uint8Array; zp?: Uint8Array };
  };
  if (m?.tipo === "init") {
    const ruido = new Ruido(m.semente ?? 1);
    perfil = m.perfil === "rpg" ? perfilRpg(ruido)
      : m.perfil === "cidade" ? perfilCidade(ruido)
      : perfilBase(ruido);
    (self as unknown as { postMessage: (d: unknown) => void }).postMessage({ tipo: "pronto", perfil: m.perfil });
    return;
  }
  if (m?.tipo === "malhar" && perfil && typeof m.cx === "number" && typeof m.cz === "number" && m.dados) {
    const t0 = performance.now();
    const dm = construirDadosMalha(m.cx, m.cz, m.dados, m.vizinhos ?? {}, perfil.altura);
    const ms = performance.now() - t0;
    const out = { tipo: "malha", cx: m.cx, cz: m.cz, dm, ms };
    const buf = (t: Float32Array | Uint16Array | Uint32Array) => t.buffer as ArrayBuffer;
    const transfer: ArrayBuffer[] = [
      buf(dm.pos), buf(dm.nor), buf(dm.uv), buf(dm.cor), buf(dm.ind),
      buf(dm.posA), buf(dm.norA), buf(dm.uvA), buf(dm.corA), buf(dm.indA),
    ];
    (self as unknown as { postMessage: (d: unknown, t?: Transferable[]) => void }).postMessage(out, transfer);
  }
};
