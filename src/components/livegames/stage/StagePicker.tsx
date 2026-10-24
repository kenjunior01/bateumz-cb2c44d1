// ═══════════════════════════════════════════════════════════════
// StagePicker — Sorteio de Comentários para lives de empresas.
// REA do commentpicker.com (líder mundial em sorteios de social):
//  - colar comentários de qualquer rede (uma linha por comentário)
//  - dedupe por utilizador, filtro por palavra-chave/#hashtag
//  - sorteio animado com multi-vencedores (1º/2º/3º)
//  - histórico auditável + CSV, disclaimers das redes sociais
// ═══════════════════════════════════════════════════════════════
import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Download, Maximize2, X, Volume2, VolumeX, Trophy, Trash2, Users, Filter, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { toast } from "sonner";
import {
  type StageConfig, parseEntries, dedupeEntries, registerDraw, exportDrawsCsv,
  downloadCsv, fmtMzn, GAME_LABELS, PLATFORM_DISCLAIMERS,
} from "@/lib/liveGameStudio";

interface Props {
  cfg: StageConfig;
  onChange: (cfg: StageConfig) => void;
  clean?: boolean;
  onExit?: () => void;
}

const StagePicker = ({ cfg, onChange, clean = false, onExit }: Props) => {
  const { sfx } = useSoundEffects();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [raw, setRaw] = useState(() => cfg.entries.map((e) => (e.text ? `${e.user}: ${e.text}` : e.user)).join("\n"));
  const [dedupe, setDedupe] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [winnersCount, setWinnersCount] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [rollName, setRollName] = useState("");
  const [winner, setWinner] = useState<string | null>(null);
  const [sessionWinners, setSessionWinners] = useState<string[]>([]);
  const [sound, setSound] = useState(cfg.options.sound);

  // pool calculável a partir do texto + vencedores já sorteados
  const computePool = (taken: string[]) => {
    let list = parseEntries(raw);
    if (dedupe) list = dedupeEntries(list);
    const k = keyword.trim().toLowerCase();
    if (k) list = list.filter((e) => `${e.user} ${e.text}`.toLowerCase().includes(k));
    const tk = new Set(taken.map((w) => w.toLowerCase()));
    return list.filter((e) => !tk.has(e.user.toLowerCase()));
  };

  const pool = useMemo(() => computePool(sessionWinners), [raw, dedupe, keyword, sessionWinners]); // eslint-disable-line react-hooks/exhaustive-deps
  const poolSize = pool.length;

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const draw = async () => {
    if (rolling) return;
    if (poolSize < 1) {
      toast.error("Sem participantes no sorteio — cola comentários ou limpa o filtro.");
      return;
    }
    setRolling(true);
    setWinner(null);
    const taken = [...sessionWinners];
    let cur = cfg;
    for (let k = 0; k < winnersCount; k++) {
      const poolNow = computePool(taken);
      if (poolNow.length < 1) break;
      // roleta animada
      await new Promise<void>((resolve) => {
        let ticks = 0;
        const iv = setInterval(() => {
          setRollName(poolNow[Math.floor(Math.random() * poolNow.length)].user);
          ticks++;
          if (ticks % 3 === 0 && sound) sfx.pop();
        }, 90);
        setTimeout(() => { clearInterval(iv); resolve(); }, 1800);
      });
      const idx = cryptoRandomIndex(poolNow.length);
      const w = poolNow[idx].user;
      taken.push(w);
      setWinner(w);
      setSessionWinners(taken.slice(0, 30).reverse() as string[]);
      if (sound) sfx.win();
      confetti({ particleCount: 130, spread: 100, origin: { y: 0.35 }, colors: [cfg.brand.primaryColor, "#ffffff"] });
      cur = registerDraw(cur, {
        game: "comentarios",
        label: `Comentário sorteado: ${w}`,
        cost: 0,
        poolSize: poolNow.length,
        oddsPct: Math.round((1 / poolNow.length) * 1000) / 10,
      });
      onChange(cur);
      await sleep(1200); // mostra o vencedor antes do próximo
    }
    setRolling(false);
  };

  const requestFs = () => {
    const el = wrapRef.current?.closest("[data-stage-root]") as HTMLElement | null;
    try { el?.requestFullscreen?.(); } catch { /* ignore */ }
  };

  const disclaimer = cfg.compliance.platforms.map((p) => PLATFORM_DISCLAIMERS[p]).join(" ");

  return (
    <div data-stage-root className="flex h-full flex-col bg-[#07070a] text-white">
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
            <p className="truncate text-[11px] text-zinc-400">{cfg.brand.name}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> AO VIVO
          </span>
          <Button size="sm" variant="ghost" onClick={() => setSound((s) => !s)} aria-label="Som">
            {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={requestFs} aria-label="Ecrã inteiro"><Maximize2 className="h-4 w-4" /></Button>
          {onExit && <Button size="sm" variant="ghost" onClick={onExit} aria-label="Sair"><X className="h-4 w-4" /></Button>}
        </header>
      )}

      <div ref={wrapRef} className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-4 lg:flex-row lg:gap-10">
        {/* palco do sorteio */}
        <div className="flex w-full max-w-xl flex-1 basis-full flex-col items-center justify-center lg:basis-2/3" data-testid="stage-picker-stage">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-zinc-500">Sorteio de Comentários</p>

          <div className="mt-5 grid min-h-[120px] w-full place-items-center rounded-3xl border-2 p-6 text-center shadow-[0_0_40px_rgba(245,158,11,0.12)]"
            style={{ borderColor: cfg.brand.primaryColor }}>
            <AnimatePresence mode="wait">
              {rolling ? (
                <motion.p key={`${rollName}-${rollName.length}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="text-3xl font-black sm:text-4xl" data-testid="stage-picker-roll">@{rollName}</motion.p>
              ) : winner ? (
                <motion.div key="winner" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} data-testid="stage-picker-winner">
                  <Trophy className="mx-auto h-10 w-10 text-amber-400" />
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Vencedor #{sessionWinners.length}</p>
                  <p className="text-3xl font-black sm:text-4xl" style={{ color: cfg.brand.primaryColor }}>@{winner}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">1 entre {poolSize + 1} participantes · {Math.round((1 / Math.max(1, poolSize + 1)) * 1000) / 10}%</p>
                  <p className="mt-0.5 text-[11px] font-bold text-emerald-400" data-testid="stage-picker-remaining">Restam {poolSize} participantes válidos no sorteio</p>
                </motion.div>
              ) : (
                <p key="idle" className="text-sm text-zinc-500">{poolSize} participantes válidos no sorteio</p>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => { void draw(); }}
              disabled={rolling || poolSize < 1}
              data-testid="stage-picker-draw"
              className="flex items-center gap-2 rounded-full px-8 py-3 text-base font-black shadow-lg transition-transform active:scale-95 disabled:opacity-40"
              style={{ background: cfg.brand.primaryColor, color: "#000" }}
            >
              <Sparkles className="h-5 w-5" />{rolling ? "A sortear…" : winnersCount > 1 ? `SORTEAR ${winnersCount}` : "SORTEAR"}
            </button>
            {sessionWinners.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => { setSessionWinners([]); setWinner(null); toast.info("Sessão reiniciada — todos voltam ao pool"); }}><Trash2 className="h-4 w-4" />Reiniciar sessão</Button>
            )}
          </div>

          {sessionWinners.length > 0 && (
            <ul className="mt-4 flex max-h-28 flex-wrap justify-center gap-1.5 overflow-y-auto" data-testid="stage-picker-session">
              {sessionWinners.map((w, i) => (
                <li key={`${w}-${i}`} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                  {i === 0 && <Trophy className="mr-1 inline h-3 w-3 text-amber-400" />}{i + 1}º @{w}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* editor + histórico */}
        {!clean && (
          <aside className="w-full max-w-xl space-y-3 lg:w-80 lg:basis-1/3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400"><Users className="h-3 w-3" />Comentários ({poolSize})</p>
                <label className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                  <input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} className="accent-emerald-500" data-testid="stage-picker-dedupe" />
                  remover duplicados
                </label>
              </div>
              <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={7}
                placeholder={"Um comentário por linha:\n\nana_silva: Quero ganhar!\njoao_m: Participando!\n…"}
                className="border-white/10 bg-black/40 font-mono text-[11px] text-zinc-200" data-testid="stage-picker-input" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-zinc-400">Filtro por palavra/#tag</Label>
                  <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="ex.: #bateumz" className="h-8 border-white/10 bg-black/40 text-xs" data-testid="stage-picker-filter" />
                </div>
                <div>
                  <Label className="text-[10px] text-zinc-400">Nº de vencedores</Label>
                  <Input type="number" min={1} max={5} value={winnersCount}
                    onChange={(e) => setWinnersCount(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
                    className="h-8 border-white/10 bg-black/40 text-xs" data-testid="stage-picker-count" />
                </div>
              </div>
              <p className="mt-2 flex items-start gap-1 text-[10px] text-zinc-500"><Filter className="mt-0.5 h-3 w-3 shrink-0" />Cada vencedor sai do pool automaticamente — ninguém ganha duas vezes.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Log auditável ({cfg.draws.length})</p>
                <button onClick={() => { downloadCsv(`log-sorteio-${cfg.liveId}.csv`, exportDrawsCsv(cfg.draws)); toast.success("CSV exportado"); }}
                  className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20" data-testid="stage-picker-export">
                  <Download className="h-3 w-3" />CSV
                </button>
              </div>
              <ul className="max-h-36 space-y-1 overflow-y-auto">
                {cfg.draws.length === 0 && <li className="py-2 text-center text-[11px] text-zinc-500">Sem sorteios ainda.</li>}
                {cfg.draws.slice().reverse().map((d) => (
                  <li key={d.id} className="flex items-center gap-2 rounded-lg bg-black/40 px-2 py-1 text-[11px]">
                    <span className="flex-1 truncate">{d.label}</span>
                    <span className="text-zinc-500">{new Date(d.ts).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
              {cfg.budget.enabled && cfg.budget.spent > 0 && (
                <p className="mt-2 border-t border-white/10 pt-2 text-[10px] text-zinc-500">Gasto total na live: {fmtMzn(cfg.budget.spent)}</p>
              )}
            </div>
          </aside>
        )}
      </div>

      {cfg.options.showDisclaimer && (
        <div className="border-t border-white/10 bg-black/60 px-4 py-1.5" data-testid="stage-disclaimer">
          <p className="text-[10px] text-zinc-500">{disclaimer || "Sorteio amistoso — participação gratuita, sem pagamento. Regulamento no post da live."}</p>
        </div>
      )}
    </div>
  );
};

function cryptoRandomIndex(n: number): number {
  try {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % n;
  } catch {
    return Math.floor(Math.random() * n);
  }
}

export default StagePicker;
