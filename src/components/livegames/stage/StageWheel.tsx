// ═══════════════════════════════════════════════════════════════
// StageWheel — Roleta de Palco para lives de empresas.
// REA de wheelofnames.com (o melhor do mundo em roletas de live):
//  - segmentos com tamanho PROPORCIONAL ao peso (roda honesta)
//  - girar com clique / barra de espaço, física de desaceleração real
//  - auto-remover vencedor, histórico de resultados, odds visíveis
//  - modo OBS/palco (clean), logo da marca no centro, disclaimers
//  - orçamento com teto (controlo de gastos) + log auditável CSV
// ═══════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Play, RotateCcw, Volume2, VolumeX, Trash2, Download, Maximize2, X,
  Percent, Users, Gift, MinusCircle, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { toast } from "sonner";
import {
  type StageConfig, type WheelSegment, activeSegments, oddsPct, pickWeightedIndex,
  registerDraw, budgetCanSpin, budgetRemaining, exportDrawsCsv, downloadCsv,
  fmtMzn, GAME_LABELS, SEGMENT_PALETTE, PLATFORM_DISCLAIMERS,
} from "@/lib/liveGameStudio";

type Mode = "premios" | "participantes";

type DrawItem = { id: string; label: string; color: string; cost: number; poolSize: number; oddsPct: number };

interface Props {
  cfg: StageConfig;
  onChange: (cfg: StageConfig) => void;
  clean?: boolean;
  onExit?: () => void;
}

const TAU = Math.PI * 2;

const StageWheel = ({ cfg, onChange, clean = false, onExit }: Props) => {
  const { sfx } = useSoundEffects();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const logoImg = useRef<HTMLImageElement | null>(null);
  const rotationRef = useRef(0);
  const lastSegRef = useRef(-1);

  const [mode, setMode] = useState<Mode>("premios");
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<DrawItem | null>(null);
  const [history, setHistory] = useState<DrawItem[]>([]);
  const [sound, setSound] = useState(cfg.options.sound);
  const [showOddsPanel, setShowOddsPanel] = useState(false);

  // itens da roda conforme o modo
  const items: WheelSegment[] = useMemo(() => {
    if (mode === "premios") return activeSegments(cfg);
    return cfg.entries.map((e, i) => ({
      id: `p_${e.user}_${i}`, label: e.user, color: SEGMENT_PALETTE[i % SEGMENT_PALETTE.length],
      weight: 1, cost: 0, active: true,
    }));
  }, [mode, cfg]);

  const totalW = useMemo(() => items.reduce((s, x) => s + Math.max(0, x.weight), 0) || 1, [items]);
  const angles = useMemo(() => {
    // ângulos cumulativos proporcionais ao peso
    let acc = 0;
    return items.map((it) => {
      const a = (Math.max(0, it.weight) / totalW) * TAU;
      const start = acc;
      acc += a;
      return { start, end: acc };
    });
  }, [items, totalW]);

  const canSpin = !spinning && items.length >= 2 && budgetCanSpin(cfg);
  const remaining = budgetRemaining(cfg);

  // logo da marca
  useEffect(() => {
    if (cfg.brand.logoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { logoImg.current = img; draw(); };
      img.src = cfg.brand.logoUrl;
    } else {
      logoImg.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.brand.logoUrl]);

  const segAtPointer = useCallback(
    (rotDeg: number): number => {
      const rot = (((360 - rotDeg) % 360) + 360) % 360;
      const pos = (rot * TAU) / 360;
      for (let i = 0; i < angles.length; i++) {
        if (pos >= angles[i].start && pos < angles[i].end) return i;
      }
      return 0;
    },
    [angles],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssSize = Math.min(wrapRef.current?.clientWidth ?? 480, 560);
    if (cssSize <= 0) return;
    if (canvas.width !== Math.round(cssSize * dpr)) {
      canvas.width = Math.round(cssSize * dpr);
      canvas.height = Math.round(cssSize * dpr);
    }
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx || items.length === 0) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const R = cx - 8 * dpr;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotationRef.current * TAU) / 360 - TAU / 4);

    // aro externo
    ctx.beginPath();
    ctx.arc(0, 0, R + 4 * dpr, 0, TAU);
    ctx.fillStyle = "#18181b";
    ctx.fill();
    ctx.strokeStyle = cfg.brand.primaryColor;
    ctx.lineWidth = 5 * dpr;
    ctx.stroke();

    // segmentos proporcionais
    items.forEach((it, i) => {
      const { start, end } = angles[i];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, start, end);
      ctx.closePath();
      ctx.fillStyle = it.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.45)";
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();

      // rótulo
      ctx.save();
      ctx.rotate((start + end) / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      const f = Math.max(11, Math.min(20, (18 * 360) / (items.length * 12 + 180)));
      ctx.font = `800 ${f * dpr}px Inter, system-ui, sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 4 * dpr;
      const max = R * 0.62;
      let label = it.label;
      while (ctx.measureText(label).width > max && label.length > 4) label = label.slice(0, label.length - 2);
      if (label !== it.label) label += "…";
      ctx.fillText(label, R - 16 * dpr, f * dpr * 0.35);
      ctx.restore();
    });
    ctx.restore();

    // ponteiro
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(-9 * dpr, -R - 2 * dpr);
    ctx.lineTo(9 * dpr, -R - 2 * dpr);
    ctx.lineTo(0, -R + 20 * dpr);
    ctx.closePath();
    ctx.fillStyle = cfg.brand.primaryColor;
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1.5 * dpr;
    ctx.stroke();
    ctx.restore();

    // hub central com logo ou sigla
    const hubR = R * 0.17;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, hubR, 0, TAU);
    ctx.fillStyle = "#09090b";
    ctx.fill();
    ctx.strokeStyle = cfg.brand.primaryColor;
    ctx.lineWidth = 3 * dpr;
    ctx.stroke();
    if (logoImg.current) {
      const img = logoImg.current;
      const s = Math.min((hubR * 1.5) / img.width, (hubR * 1.5) / img.height);
      ctx.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
    } else {
      ctx.fillStyle = cfg.brand.primaryColor;
      ctx.font = `900 ${hubR * 0.55}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const initials = (cfg.brand.name || "BM").split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase();
      ctx.fillText(initials, cx, cy);
    }
    ctx.restore();
  }, [items, angles, cfg.brand]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  const spin = useCallback(() => {
    if (spinning) return;
    if (items.length < 2) return;
    if (!budgetCanSpin(cfg)) {
      toast.error("Orçamento esgotado — aumenta o teto no Estúdio de Jogos.");
      return;
    }
    const idx = pickWeightedIndex(items);
    const winSeg = items[idx];
    const center = (angles[idx].start + angles[idx].end) / 2;
    const spins = 5 + Math.floor(Math.random() * 3);
    // centro do segmento vencedor fica sob o ponteiro (topo = -TAU/4 no canvas)
    const targetRad = -TAU / 4 - center + spins * TAU;
    const from = rotationRef.current;
    const fromRad = (from * TAU) / 360;
    const toRad = targetRad + Math.ceil((fromRad - targetRad) / TAU) * TAU;
    const to = (toRad * 360) / TAU;
    const durMs = Math.max(1200, cfg.options.spinSeconds * 1000);
    const t0 = performance.now();
    setSpinning(true);
    setWinner(null);
    lastSegRef.current = -1;

    const ease = (p: number) => 1 - Math.pow(1 - p, 4);
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / durMs);
      const r = from + (to - from) * ease(p);
      rotationRef.current = r;
      draw();
      if (sound) {
        const s = segAtPointer(r);
        if (s !== lastSegRef.current) {
          lastSegRef.current = s;
          sfx.pop();
        }
      }
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        rotationRef.current = to % 360;
        draw();
        setSpinning(false);
        const item: DrawItem = {
          id: `${Date.now()}`,
          label: winSeg.label,
          color: winSeg.color,
          cost: mode === "premios" ? winSeg.cost : 0,
          poolSize: items.length,
          oddsPct: oddsPct(items, winSeg),
        };
        setWinner(item);
        setHistory((h) => [item, ...h].slice(0, 50));
        if (sound) {
          if (mode === "premios" && winSeg.cost === 0) sfx.lose(); else sfx.win();
        }
        if (!(mode === "premios" && winSeg.cost === 0)) {
          confetti({ particleCount: 140, spread: 100, origin: { y: 0.35 }, zIndex: 60, colors: [cfg.brand.primaryColor, "#ffffff", winSeg.color] });
        }
        // registra no log auditável + orçamento
        onChange(registerDraw(cfg, {
          game: cfg.game, label: mode === "premios" ? winSeg.label : `Participante: ${winSeg.label}`,
          cost: item.cost, poolSize: items.length, oddsPct: item.oddsPct,
        }));
        // auto-remover vencedor (REA wheelofnames)
        if (cfg.options.autoRemoveWinner) {
          if (mode === "participantes") {
            onChange({ ...cfg, entries: cfg.entries.filter((e) => e.user !== winSeg.label) });
          } else {
            onChange({ ...cfg, segments: cfg.segments.map((s) => (s.id === winSeg.id ? { ...s, active: false } : s)) });
          }
        }
      }
    };
    requestAnimationFrame(tick);
  }, [spinning, items, angles, cfg, onChange, draw, sound, segAtPointer, sfx, mode]);

  // barra de espaço gira (REA wheelofnames)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        if (!spinning) spin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spin, spinning]);

  const removeWinner = () => {
    if (!winner) return;
    if (mode === "participantes") {
      onChange({ ...cfg, entries: cfg.entries.filter((e) => e.user !== winner.label) });
    } else {
      const seg = items.find((i) => i.label === winner.label);
      if (seg) onChange({ ...cfg, segments: cfg.segments.map((s) => (s.id === seg.id ? { ...s, active: false } : s)) });
    }
    toast.success(`"${winner.label}" removido da roda`);
    setWinner(null);
  };

  const requestFs = () => {
    const el = wrapRef.current?.closest("[data-stage-root]") as HTMLElement | null;
    try { el?.requestFullscreen?.(); } catch { /* ignore */ }
  };

  const disclaimer = cfg.compliance.platforms.map((p) => PLATFORM_DISCLAIMERS[p]).join(" ");
  const oddsRows = mode === "premios" ? activeSegments(cfg) : items;

  return (
    <div data-stage-root className="flex h-full flex-col bg-[#07070a] text-white">
      {/* topo */}
      {!clean && (
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          {cfg.brand.logoUrl ? (
            <img src={cfg.brand.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-black" style={{ background: cfg.brand.primaryColor, color: "#000" }}>
              {(cfg.brand.name || "B").slice(0, 1)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{cfg.title || GAME_LABELS[cfg.game]}</p>
            <p className="truncate text-[11px] text-zinc-400">{cfg.brand.name}{cfg.brand.slogan ? ` · ${cfg.brand.slogan}` : ""}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> AO VIVO
          </span>
          <Button size="sm" variant="ghost" onClick={() => setSound((s) => !s)} aria-label="Som">
            {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowOddsPanel((v) => !v)} aria-label="Probabilidades"><Percent className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" onClick={requestFs} aria-label="Ecrã inteiro"><Maximize2 className="h-4 w-4" /></Button>
          {onExit && <Button size="sm" variant="ghost" onClick={onExit} aria-label="Sair"><X className="h-4 w-4" /></Button>}
        </header>
      )}

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-4 lg:flex-row lg:items-center lg:gap-10">
        {/* roda */}
        <div ref={wrapRef} className="relative w-full max-w-[560px] flex-1 basis-full lg:basis-2/3" data-testid="stage-wheel-wrap">
          <canvas ref={canvasRef} onClick={() => !spinning && spin()} className="mx-auto block cursor-pointer" data-testid="stage-wheel-canvas" />
          <p className="mt-2 text-center text-[11px] text-zinc-500">
            {spinning ? "A girar…" : "Toca na roda ou pressiona ESPAÇO para girar"}
          </p>

          {/* vencedor */}
          <AnimatePresence>
            {winner && (
              <motion.div
                key="winner"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-x-2 top-6 z-50 rounded-2xl border-2 bg-black/90 p-4 text-center shadow-2xl backdrop-blur"
                style={{ borderColor: cfg.brand.primaryColor }}
                data-testid="stage-winner"
              >
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Resultado</p>
                <p className="mt-1 text-2xl font-black" style={{ color: cfg.brand.primaryColor }}>{winner.label}</p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  {winner.poolSize} participantes · {winner.oddsPct}% de probabilidade
                  {winner.cost > 0 ? ` · ${fmtMzn(winner.cost)}` : ""}
                </p>
                {!clean && (
                  <div className="mt-3 flex justify-center gap-2">
                    <Button size="sm" variant="secondary" onClick={removeWinner}><MinusCircle className="mr-1 h-3.5 w-3.5" />Remover da roda</Button>
                    <Button size="sm" onClick={() => setWinner(null)} style={{ background: cfg.brand.primaryColor, color: "#000" }}>Continuar</Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* lateral: odds + orçamento + histórico */}
        <div className="w-full max-w-[560px] space-y-3 lg:w-72 lg:basis-1/3">
          {showOddsPanel && cfg.options.showOdds && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3" data-testid="stage-odds">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400"><Percent className="h-3 w-3" />Probabilidades ({oddsRows.length})</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto">
                {oddsRows.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-[11px]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
                    <span className="flex-1 truncate">{s.label}</span>
                    <span className="font-bold text-zinc-300">{oddsPct(items, s)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cfg.budget.enabled && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3" data-testid="stage-budget">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold uppercase tracking-wider text-zinc-400">Orçamento de prémios</span>
                <span className="font-black" style={{ color: remaining <= 0 ? "#f87171" : cfg.brand.primaryColor }}>{fmtMzn(remaining)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (remaining / Math.max(1, cfg.budget.total)) * 100)}%`, background: remaining <= 0 ? "#f87171" : cfg.brand.primaryColor }} />
              </div>
              <p className="mt-1.5 text-[10px] text-zinc-500">Gasto {fmtMzn(cfg.budget.spent)} de {fmtMzn(cfg.budget.total)}</p>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3" data-testid="stage-history">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400"><ShieldCheck className="h-3 w-3" />Histórico ({cfg.draws.length})</p>
              <button
                onClick={() => { downloadCsv(`log-roleta-${cfg.liveId}.csv`, exportDrawsCsv(cfg.draws)); toast.success("CSV exportado"); }}
                className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20"
                data-testid="stage-export"
              >
                <Download className="h-3 w-3" />CSV
              </button>
            </div>
            <ul className="max-h-44 space-y-1 overflow-y-auto">
              {history.length === 0 && <li className="py-2 text-center text-[11px] text-zinc-500">Ainda sem rodadas — o log fica aqui, auditável.</li>}
              {history.map((h) => (
                <li key={h.id} className="flex items-center gap-2 rounded-lg bg-black/40 px-2 py-1 text-[11px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: h.color }} />
                  <span className="flex-1 truncate">{h.label}</span>
                  <span className="text-zinc-500">{new Date(h.ts).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* controles do apresentador */}
      {!clean && (
        <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-4 py-3">
          <div className="flex overflow-hidden rounded-full border border-white/15">
            <button onClick={() => setMode("premios")} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold ${mode === "premios" ? "text-black" : "text-zinc-300"}`} style={mode === "premios" ? { background: cfg.brand.primaryColor } : {}}>
              <Gift className="h-3.5 w-3.5" />Prémios
            </button>
            <button onClick={() => setMode("participantes")} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold ${mode === "participantes" ? "text-black" : "text-zinc-300"}`} style={mode === "participantes" ? { background: cfg.brand.primaryColor } : {}}>
              <Users className="h-3.5 w-3.5" />Participantes
            </button>
          </div>
          <button
            onClick={spin}
            disabled={!canSpin}
            data-testid="stage-spin"
            className="flex items-center gap-2 rounded-full px-6 py-2 text-sm font-black shadow-lg transition-transform active:scale-95 disabled:opacity-40"
            style={{ background: cfg.brand.primaryColor, color: "#000" }}
          >
            <Play className="h-4 w-4" />{spinning ? "A girar…" : "GIRAR"}
          </button>
          <Button size="sm" variant="ghost" onClick={() => { setHistory([]); setWinner(null); toast.info("Histórico da sessão limpo"); }}><RotateCcw className="h-4 w-4" />Sessão</Button>
        </footer>
      )}

      {/* disclaimer — diretrizes das redes sociais */}
      {cfg.options.showDisclaimer && (
        <div className="overflow-hidden border-t border-white/10 bg-black/60 px-4 py-1.5" data-testid="stage-disclaimer">
          <p className="whitespace-nowrap text-[10px] text-zinc-500">
            {disclaimer || "Promoção amistosa — participação gratuita, sem pagamento. Regulamento disponível no post da live."}
          </p>
        </div>
      )}
    </div>
  );
};

export default StageWheel;
