// ============================================================
// BATEUCRAFT — WORKER DE GERAÇÃO DE TERRENO (v46)
// Padrão do Veloren: a geração de chunks é paralelizável ao
// render thread. Aqui correm APENAS as colunas de terreno
// (cavernas, minérios, árvores, decorações) — as MESMAS funções
// puras do main thread (geracao.ts + perfis terrenoRpg /
// terrenoCidade). As edições do jogador e os carimbos dos mundos
// ficam no main thread (dono do estado) — a resposta entra pelo
// mesmo caminho do sync: zero segunda fonte de verdade.
// ============================================================

import { Ruido } from "./noise";
import { gerarDadosTerreno, perfilBase, type PerfilTerreno } from "./geracao";
import { perfilRpg } from "../rpg/terrenoRpg";
import { perfilCidade } from "../cidade/terrenoCidade";

let ruido: Ruido | null = null;
let perfil: PerfilTerreno | null = null;

self.onmessage = (e: MessageEvent) => {
  const m = e.data as { tipo?: string; semente?: number; perfil?: string; cx?: number; cz?: number };
  if (m?.tipo === "init") {
    ruido = new Ruido(m.semente ?? 1);
    perfil = m.perfil === "rpg" ? perfilRpg(ruido)
      : m.perfil === "cidade" ? perfilCidade(ruido)
      : perfilBase(ruido);
    (self as unknown as { postMessage: (d: unknown) => void }).postMessage({ tipo: "pronto", perfil: m.perfil });
    return;
  }
  if (m?.tipo === "gerar" && ruido && perfil && typeof m.cx === "number" && typeof m.cz === "number") {
    const t0 = performance.now();
    const dados = gerarDadosTerreno(ruido, m.cx, m.cz, perfil);
    const ms = performance.now() - t0;
    (self as unknown as { postMessage: (d: unknown, t?: Transferable[]) => void })
      .postMessage({ tipo: "chunk", cx: m.cx, cz: m.cz, dados, ms }, [dados.buffer]);
  }
};
