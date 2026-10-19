// ═══════════════════════════════════════════════════════════════
//  BATEU PRO KIT — barra de exportação do kit
// ═══════════════════════════════════════════════════════════════
export { playSfx, haptic, juice, unlockAudio, isSfxEnabled, setSfxEnabled } from "./sfx";
export { FxProvider, useFx, evPoint } from "./fx";
export { useGameLoop, useProGame } from "./loop";
export { ProGameFrame, useScoreReporter } from "./ProGameFrame";
export {
  recordGameResult, claimMission, getMissions, getProgress, getGameMeta,
  saveState, loadState, levelFromXp, xpForLevel,
  type ScoreResult, type GameMission, type Progress,
} from "./progress";
