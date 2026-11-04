// ============================================================
// CIDADE BATEU — NÚCLEO ISOMÓRFICO (v37)
// Padrão estudado do Veloren: o crate `common` é partilhado entre
// client e server para que as duas pontas apliquem AS MESMAS regras
// (docs/REA-veloren-estudo-v36.md §1-2, fontes ficheiro:linha lá).
// Este ficheiro corre IGUAL no browser (vite) e no servidor Node
// (Node 24 importa .ts por type stripping — verificado na v37).
// Zero imports · zero DOM · zero three.js. Fonte única da verdade.
// ============================================================

// ── Mundo (fonte única — cidade.ts re-exporta para não partir imports) ──
export const SEED_CIDADE = 20251103;
/** Superfície andável do plateau = ALTURA_PLATEAU + 1. */
export const ALTURA_PLATEAU = 34;

/** Spawn da praça — IGUAL no cliente e no servidor (furo real do E2E v37:
 *  servidor assumia (0,0), cliente nascia em (0,5·6,5) → 1ª msg tinha d≈6,58
 *  > orçamento e era rejeitada para sempre. Fonte única resolve.) */
export const SPAWN_PRACA: [number, number] = [0.5, 6.5];

// ── Protocolo de presença partilhada ──
// Fontes dos padrões (estudo v36): TPS 30 → server-cli/src/main.rs:49 ·
// MAX_GAME_DT 1/5 s → common/src/clock.rs:53 · cap de jogadores 100 →
// server/src/settings/mod.rs:226 (usamos 64: a cidade é menor).
export const TPS = 30;
export const SNAPSHOT_HZ = 10;          // posições a 10 Hz (browsers)
export const MAX_VEL = 12;              // blocos/s — correr honesto do motor
export const RAIO_INTERESSE = 40;       // blocos — presença na cidade
export const MAX_JOGADORES = 64;

// ── Orçamento de movimento (v37 — A regra partilhada de validação) ──
// Substitui o clamp por mensagem (furo real apanhado pelo E2E v37: o clamp
// avançava 5,28 blocos por msg ilegal = 52 b/s de deriva). Modelo:
//   · cada mensagem recarrega MAX_VEL × dt (dt com tecto 0,5 s — nunca
//     integra saltos longos, padrão MAX_GAME_DT do clock.rs);
//   · o tecto ORCAMENTO_CAP limita a poupança → velocidade sustentada nunca
//     passa de MAX_VEL (12 b/s), nem com spam de mensagens;
//   · lag honesto (pausa ≤0,5 s) é absorvido — o jogador não é punido pela
//     taxa de envio, só pela velocidade real.
export const TOLERANCIA = 2.2;                               // graça de arranque
export const ORCAMENTO_CAP = MAX_VEL * 0.5;                  // 6 blocos
export const ORCAMENTO_INICIAL = MAX_VEL * 0.2 * TOLERANCIA;  // 5,28

export function proximoOrcamento(orcamento: number, dtSegundos: number): number {
  if (typeof orcamento !== "number" || !Number.isFinite(orcamento)) return ORCAMENTO_INICIAL;
  const dt = Math.min(0.5, Math.max(0, typeof dtSegundos === "number" && Number.isFinite(dtSegundos) ? dtSegundos : 0));
  return Math.min(ORCAMENTO_CAP, orcamento + MAX_VEL * dt);
}

// ── Chat da praça (v37) ──
export const FALA_MAX = 140;            // caracteres
export const FALA_RATE_MS = 1500;       // 1 fala / 1,5 s por jogador

/**
 * Sanitização de fala — a MESMA no cliente (pré-visualização) e no
 * servidor (autoridade). Remove caracteres de controlo, corta a FALA_MAX,
 * devolve null se não sobrar texto válido.
 */
export function limpaFala(entrada: unknown): string | null {
  if (typeof entrada !== "string") return null;
  const limpo = entrada.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, FALA_MAX);
  return limpo.length ? limpo : null;
}
