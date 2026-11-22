// ============================================================
// COSMETICOS SELECIONADOS (v80) — STORE DO APARELHO (wrapper fino)
// ────────────────────────────────────────────────────────────
// O núcleo (desbloqueios.ts) é PURO; esta camada só lê/escreve o
// localStorage do aparelho e revalida TUDO contra o nível REAL do
// jogador (hidratarCosmeticos recusa bloqueado/podre). PADRÃO DA
// CASA (progressaoStore v78): mesmas funções do núcleo, ZERO
// lógica própria. Convidado incluído — os cosmeticos vivem no
// aparelho tal como a progressão (honesto e declarado).
// ============================================================
import { useCallback, useEffect, useState } from "react";
import {
  CosmeticosEstado, cosmeticosPadrao, hidratarCosmeticos, escolherCosmetico,
  tipoSelecionavel, TipoDesbloqueio,
} from "./desbloqueios";

const CHAVE = "bateu_cosmeticos_v80";

function ler(nivel: number): CosmeticosEstado {
  try {
    const cru = localStorage.getItem(CHAVE);
    return hidratarCosmeticos(cru ? JSON.parse(cru) : null, nivel);
  } catch { return cosmeticosPadrao(); }
}
function gravar(e: CosmeticosEstado): void {
  try { localStorage.setItem(CHAVE, JSON.stringify(e)); } catch { /* aparelho cheio → só memória */ }
}

/** Hook do aparelho: seleção + escolher() (TUDO passa pelo núcleo). */
export function useCosmeticos(nivel: number) {
  const [estado, setEstado] = useState<CosmeticosEstado>(() => ler(nivel));

  // o nível subiu → mantém; o nível DESCE (outro aparelho/novo jogador)
  // → revalida: o que passou a estar bloqueado sai (nada de uso fantasma)
  useEffect(() => {
    const revalidado = hidratarCosmeticos(estado, nivel);
    if (revalidado !== estado) { setEstado(revalidado); gravar(revalidado); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel]);

  const escolher = useCallback((tipo: "moldura" | "titulo" | "tema", id: string | null) => {
    const r = escolherCosmetico(estado, tipo, id, nivel);
    if (r.motivo === "ok") { setEstado(r.estado); gravar(r.estado); }
    return r;
  }, [estado, nivel]);

  return { estado, escolher, tipoSelecionavel: (t: TipoDesbloqueio) => tipoSelecionavel(t) };
}
export type { CosmeticosEstado };
