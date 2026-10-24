// ═══════════════════════════════════════════════════════════════
// StageShow — Página do Palco (ecrã inteiro para a live/OBS).
// /palco/:liveId?game=roleta|quiz|comentarios&clean=1
// clean=1 → sem barra de controles (browser source do OBS/stream)
// ═══════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Maximize2, X, Disc3, GraduationCap, MessageSquareHeart } from "lucide-react";
import StageWheel from "@/components/livegames/stage/StageWheel";
import StageQuiz from "@/components/livegames/stage/StageQuiz";
import StagePicker from "@/components/livegames/stage/StagePicker";
import {
  type StageConfig, type StageGameKind, GAME_LABELS,
  loadOrCreateStageConfig, saveStageConfig,
} from "@/lib/liveGameStudio";
import { Button } from "@/components/ui/button";

const GAME_ICONS: Record<StageGameKind, typeof Disc3> = {
  roleta: Disc3,
  quiz: GraduationCap,
  comentarios: MessageSquareHeart,
};

const StageShow = () => {
  const { liveId = "demo" } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const clean = params.get("clean") === "1";
  const gameFromUrl = params.get("game") as StageGameKind | null;

  const [cfg, setCfg] = useState<StageConfig | null>(null);

  useEffect(() => {
    const g: StageGameKind = gameFromUrl === "quiz" || gameFromUrl === "comentarios" ? gameFromUrl : "roleta";
    const loaded = loadOrCreateStageConfig(liveId, g);
    // o jogo pedido na URL prevalece (links do dashboard/estúdio abrem o jogo certo)
    const fixed = loaded.game !== g ? saveStageConfig({ ...loaded, game: g }) : loaded;
    setCfg(fixed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId, gameFromUrl]);

  const change = useCallback((next: StageConfig) => {
    setCfg(saveStageConfig(next));
  }, []);

  const setGame = (g: StageGameKind) => {
    const next = { ...(cfg as StageConfig), game: g };
    change(next);
    const p = new URLSearchParams(params);
    p.set("game", g);
    setParams(p, { replace: true });
  };

  const requestFs = () => {
    const el = document.querySelector("[data-page-stage]") as HTMLElement | null;
    try { el?.requestFullscreen?.(); } catch { /* ignore */ }
  };

  if (!cfg) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#07070a] text-zinc-400">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4 }} className="text-sm font-bold">
          A preparar o palco…
        </motion.div>
      </div>
    );
  }

  return (
    <div data-page-stage className="flex h-[100dvh] w-full flex-col bg-[#07070a]">
      {!clean && (
        <div className="flex items-center gap-2 border-b border-white/10 bg-black/70 px-3 py-2">
          <div className="flex overflow-hidden rounded-full border border-white/15">
            {(Object.keys(GAME_LABELS) as StageGameKind[]).map((g) => {
              const Icon = GAME_ICONS[g];
              return (
                <button key={g} onClick={() => setGame(g)} data-testid={`stage-tab-${g}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold ${cfg.game === g ? "bg-emerald-500 text-white" : "text-zinc-400 hover:text-white"}`}>
                  <Icon className="h-3.5 w-3.5" />{GAME_LABELS[g]}
                </button>
              );
            })}
          </div>
          <span className="ml-1 text-[10px] text-zinc-600">sessão: {liveId}</span>
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={requestFs} data-testid="stage-fs"><Maximize2 className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => navigate(-1)} data-testid="stage-exit"><X className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1">
        {cfg.game === "roleta" && <StageWheel cfg={cfg} onChange={change} clean={clean} onExit={clean ? undefined : () => navigate(-1)} />}
        {cfg.game === "quiz" && <StageQuiz cfg={cfg} onChange={change} clean={clean} onExit={clean ? undefined : () => navigate(-1)} />}
        {cfg.game === "comentarios" && <StagePicker cfg={cfg} onChange={change} clean={clean} onExit={clean ? undefined : () => navigate(-1)} />}
      </div>
    </div>
  );
};

export default StageShow;
