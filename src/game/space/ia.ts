// =============================================================
// IA DA GUERRA ESPACIAL — v73: ESQUIVA DE BALAS
// ─────────────────────────────────────────────────────────────
// NÚCLEO PURO (sem React/DOM — testável em Node, importado pelo
// SpaceShooter.tsx): a função decide SE e PARA ONDE o inimigo se
// desvia de uma bala do jogador. Cada TIPO tem destreza própria:
// scout desvia mais, fighter quase tanto, kamikaze é DEDICADO
// (merge acelerado — desvia pouco), splitter um pouco, tank é
// um tanque (não desvia), normal não tem piloto humano para
// se importar.
// A chamada é feita QUANDO o cooldown de esquiva chega a zero —
// a direção guardada dura ~12 frames (a esquiva é um merger
// decidido, não um tremor).
// =============================================================

export type KindInimigo = "normal" | "scout" | "fighter" | "tank" | "kamikaze" | "splitter";

/** Destreza de esquiva por tipo (0 = não desvia; 1 = muito vivo). */
export const ESQUIVA_SKILL: Record<KindInimigo, number> = {
  normal: 0,
  scout: 1.15,     // rápido, o piloto mais reativo
  fighter: 0.95,   // caça de combate — desvia e ainda atira
  tank: 0,         // TANK: é um tanque — come as balas
  kamikaze: 0.55,  // dedicado: mergulha, só desvia o suficiente
  splitter: 0.3,   // lento a reagir
};

/** Frames de duração do merger depois de decidido. */
export const ESQUIVA_DURACAO = 12;

/** Velocidade lateral da esquiva (px/frame) × skill. */
export const ESQUIVA_VEL = 2.0;

/** Alcance vertical de ameaça: bala a SUBIR até esta distância é perigo real. */
export const ESQUIVA_ALCANCE_Y = 150;

/** Meia-largura da ameaça horizontal: bala perto disto em x é perigo real. */
export const ESQUIVA_JANELA_X = 46;

export interface InimigoEsquiva {
  x: number;
  y: number;
  size: number;
  kind: string;
  dodgeCd: number;
}

export interface BalaInfo { x: number; y: number }

/**
 * Decide a direção de esquiva: -1 (esquerda), 1 (direita), 0 (nada).
 * DETERMINÍSTICO — dado o mesmo inimigo/balas, a MESMA decisão
 * (a suíte prova as regras todas em Node).
 */
export function decidirEsquiva(
  e: InimigoEsquiva,
  balas: BalaInfo[],
  larguraCampo: number
): number {
  if (e.dodgeCd > 0) return 0;                          // merger em curso → mantém
  const skill = ESQUIVA_SKILL[(e.kind as KindInimigo)] ?? 0;
  if (skill <= 0) return 0;                             // tank/normal NUNCA desviam

  // bala ABAIXO do inimigo (a subir para ele) e perto em x
  let maisPerto: BalaInfo | null = null;
  let menorDy = Infinity;
  for (const b of balas) {
    const dy = e.y - b.y;                               // >0 → bala abaixo
    if (dy <= 0 || dy > ESQUIVA_ALCANCE_Y) continue;
    const dx = Math.abs(b.x - e.x);
    if (dx > e.size + ESQUIVA_JANELA_X) continue;
    if (dy < menorDy) { menorDy = dy; maisPerto = b; }
  }
  if (!maisPerto) return 0;

  const dx = maisPerto.x - e.x;
  if (Math.abs(dx) < 10) {
    // bala CENTRADA: foge para o lado com MAIS ESPAÇO no campo
    return (larguraCampo - e.x) >= e.x ? 1 : -1;
  }
  return dx > 0 ? -1 : 1;                               // afasta-se da bala
}
