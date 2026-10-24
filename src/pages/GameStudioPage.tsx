// ═══════════════════════════════════════════════════════════════
// GameStudioPage — Estúdio de Jogos de Palco (standalone).
// /estudio-jogos/:liveId? — controlo total ANTES da live:
// jogos, personalização da marca, orçamento e conformidade.
// Funciona sem login (a sessão vive no dispositivo que faz a live).
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Disc3, GraduationCap, MessageSquareHeart, Radio } from "lucide-react";
import GameStudio from "@/components/livegames/studio/GameStudio";
import {
  type StageConfig, type StageGameKind, GAME_LABELS,
  loadOrCreateStageConfig, saveStageConfig,
} from "@/lib/liveGameStudio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GameStudioPage = () => {
  const { liveId: paramId } = useParams();
  const navigate = useNavigate();
  const [liveId, setLiveId] = useState(() => paramId || localStorage.getItem("bw_stage_cfg_last") || "demo");
  const [cfg, setCfg] = useState<StageConfig | null>(null);
  const [idDraft, setIdDraft] = useState(liveId);

  useEffect(() => {
    const g: StageGameKind = "roleta";
    setCfg(loadOrCreateStageConfig(liveId, g));
    setIdDraft(liveId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveId]);

  const change = (next: StageConfig) => setCfg(saveStageConfig(next));

  const openStage = (game: StageGameKind, clean = false) => {
    if (cfg) {
      const withGame = saveStageConfig({ ...cfg, game });
      navigate(`/palco/${withGame.liveId}?game=${game}${clean ? "&clean=1" : ""}`);
    }
  };

  return (
    <div className="mx-auto min-h-[100dvh] max-w-4xl px-4 pb-16 pt-6">
      <div className="mb-5 flex items-center gap-2">
        <Button size="icon" variant="ghost" onClick={() => navigate(-1)} aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></Button>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-extrabold sm:text-2xl">Estúdio de Jogos de Palco</h1>
          <p className="text-xs text-muted-foreground">Lives super divertidas com controlo total — prémios, marca, orçamento e diretrizes das redes sociais.</p>
        </div>
      </div>

      {/* sessão da live */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
        <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground"><Radio className="h-3.5 w-3.5 text-red-500" />Sessão da live</span>
        <Input value={idDraft} onChange={(e) => setIdDraft(e.target.value)} className="h-8 w-44 text-xs" placeholder="id da live" data-testid="studio-session-input" />
        <Button size="sm" variant="secondary" onClick={() => setLiveId(idDraft.trim() || "demo")} data-testid="studio-session-switch">Trocar sessão</Button>
        <span className="text-[10px] text-muted-foreground">A configuração fica guardada neste dispositivo (o mesmo que abre o palco).</span>
      </div>

      {cfg && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GameStudio cfg={cfg} onChange={change} onOpenStage={openStage} />
        </motion.div>
      )}

      {/* atalhos dos jogos */}
      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        {(Object.keys(GAME_LABELS) as StageGameKind[]).map((g, i) => {
          const Icon = [Disc3, GraduationCap, MessageSquareHeart][i];
          return (
            <button key={g} onClick={() => openStage(g)} data-testid={`studio-shortcut-${g}`}
              className="rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-emerald-400/60">
              <span className="flex items-center gap-2 text-sm font-extrabold"><Icon className="h-4 w-4 text-emerald-500" />{GAME_LABELS[g]}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">Abrir direto no palco</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GameStudioPage;
