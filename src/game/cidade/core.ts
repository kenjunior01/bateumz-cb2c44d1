// ============================================================
// CIDADE BATEU — NÚCLEO ISOMÓRFICO (v37 · v47)
// Padrão estudado do Veloren: o crate `common` é partilhado entre
// client e server para que as duas pontas apliquem AS MESMAS regras
// (docs/REA-veloren-estudo-v36.md §1-2, fontes ficheiro:linha lá).
// Este ficheiro corre IGUAL no browser (vite) e no servidor Node
// (Node 24 importa .ts por type stripping — verificado na v37).
// Zero DOM · zero three.js. Fonte única da verdade.
// v47 — o único import é constants.ts (DADOS puros do motor: SALTO,
// GRAVIDADE, NIVEL_MAR) — as regras de subida derivam da física REAL
// do motor em vez de duplicar números (uma só fonte, honesto).
// ============================================================

import { GRAVIDADE, NIVEL_MAR, SALTO, VEL_CORRER, LARGURA_JOGADOR, ALTURA_JOGADOR, CORPO_Y_INF, CORPO_Y_SUP } from "../blocos/constants.ts";

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

// ── v47 — N2: FÍSICA DO TERRENO (a regra que o servidor re-simula) ──
// O que o Veloren faz no phys/ (docs/REA-veloren-n3-v37.md §6): o servidor
// volta a simular o movimento. Aqui, com x,z (a Y nasce do terreno nas duas
// pontas), a regra honesta e derivada da física REAL do motor partilhado:
//   · um salto sobe no máximo v²/2g de superfície (GANHO_SALTO ≈ 1,42);
//   · subida SUSTENTADA de verdade (subir escadas de 1 a salto por salto)
//     custa ≈ 1 salto por arco de 0,66 s → ~1,43 b/s; a taxa dá margem
//     honesta ×1,8 para rampas de fusão e passo irregular;
//   · descidas são LEGAIS sempre (cair é física do motor — dano de queda);
//   · na água (superfície < NIVEL_MAR) a subida é do nado — o orçamento
//     vertical não se aplica (afrouxamento DECLARADO, não escondido).
export const GANHO_SALTO = (SALTO * SALTO) / (2 * GRAVIDADE);   // ≈ 1,42 blocos
export const SUBIDA_CAP = GANHO_SALTO + 0.8;                    // um salto completo + graça
export const SUBIDA_TAXA = 2.6;                                 // blocos/s sustentados
export const SUBIDA_INICIAL = SUBIDA_CAP;

export function proximoOrcamentoSubida(orcamento: number, dtSegundos: number): number {
  if (typeof orcamento !== "number" || !Number.isFinite(orcamento)) return SUBIDA_INICIAL;
  const dt = Math.min(0.5, Math.max(0, typeof dtSegundos === "number" && Number.isFinite(dtSegundos) ? dtSegundos : 0));
  return Math.min(SUBIDA_CAP, orcamento + SUBIDA_TAXA * dt);
}

// ── v52 — N4: PAREDES DE EDIFÍCIOS (o servidor pisa os MESMOS voxels) ──
// O que faltava à re-simulação da v47: ela só conhecia O TERRENO
// (alturaCidade) — os edifícios carimbados eram invisíveis ao servidor e
// um cliente podia atravessar as paredes da cidade partilhada. Agora o
// servidor constrói o campo de voxels COMPLETO (gerarDadosTerreno +
// carimbarCidade — os módulos puros que o cliente usa, provados byte a
// byte) e valida o caminho do corpo pela MESMA caixa do motor.
export const VOO_ESCALA_ATELETA = 1.18; // progressão v38: máx. real do Atleta (progressao.ts)
/** Voo criativo (tecla F): vy = velBase × 1.2 com velBase ≤ VEL_CORRER×1.18
 *  → pior subida legítima ≈ 8,36 b/s. Tecto seguinte inteiro = 9 b/s. */
export const VOO_TAXA = Math.ceil(VEL_CORRER * VOO_ESCALA_ATELETA * 1.2);   // 9 b/s
export const VOO_CAP = VOO_TAXA * 0.5;                                      // 4,5 (padrão ORCAMENTO_CAP)
export const VOO_INICIAL = VOO_CAP;

export function proximoOrcamentoVoo(orcamento: number, dtSegundos: number): number {
  if (typeof orcamento !== "number" || !Number.isFinite(orcamento)) return VOO_INICIAL;
  const dt = Math.min(0.5, Math.max(0, typeof dtSegundos === "number" && Number.isFinite(dtSegundos) ? dtSegundos : 0));
  return Math.min(VOO_CAP, orcamento + VOO_TAXA * dt);
}

/** A CAIXA DE COLISÃO do jogador — espelho EXACTO do colideEm do motor
 *  (engine.ts): 8 cantos com ±LARGURA_JOGADOR e CORPO_Y_INF/CORPO_Y_SUP,
 *  mesma tabela de solidez (solidoId). O servidor passa a sua função de
 *  voxels; as probes passam o campo puro — a MESMA regra em todas as pontas. */
export function caixaColide(
  solido: (x: number, y: number, z: number) => boolean,
  x: number, y: number, z: number,
): boolean {
  for (const ox of [-LARGURA_JOGADOR, LARGURA_JOGADOR])
    for (const oz of [-LARGURA_JOGADOR, LARGURA_JOGADOR])
      for (const oy of [CORPO_Y_INF, CORPO_Y_SUP])
        if (solido(x + ox, y + oy, z + oz)) return true;
  return false;
}

/** Passo de amostragem do caminho: ≤ 2×LARGURA_JOGADOR (diâmetro da caixa
 *  0,6) garante cobertura contínua — nenhum voxel é saltado entre amostras. */
export const CAIXA_PASSO = 0.25;

/** O caminho entre duas posições está LIVRE para o corpo? Amostra o
 *  segmento (inclusive as pontas) com a caixa de colisão — a regra que o
 *  servidor executa em cada msg `pos` com y (protocolo v52). */
export function caminhoLivre(
  solido: (x: number, y: number, z: number) => boolean,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
): boolean {
  const d = Math.hypot(bx - ax, by - ay, bz - az);
  const n = Math.max(1, Math.ceil(d / CAIXA_PASSO));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (caixaColide(solido, ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t)) return false;
  }
  return true;
}

// ── v52 — edições do mundo no multiplayer (a verdade da colisão) ──
// A cidade é CRIATIVO: quebrar/colocar é legítimo. Para a re-simulação não
// castigar quem partiu uma parede legitimamente, o cliente REPORTA cada
// edição (gancho aoEditar do motor) e o servidor aplica-a ao seu campo
// antes de validar o movimento — limites honestos nas duas pontas:
export const EDIT_RATE_MS = 50;     // 20 edições/s — mineração humana real é ~4-6/s
export const EDIT_OVERLAY_CAP = 100_000; // cap do overlay de edições no servidor

