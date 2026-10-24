// ═══════════════════════════════════════════════════════════════
// GameStudio — Estúdio de Jogos de Palco (controlo total ANTES
// da live). REA dos melhores do mundo:
//  - Conteúdo: prémios/perguntas/comentários editáveis ao detalhe
//  - Personalização: marca, logo, cor, tempo de giro, opções de palco
//  - Orçamento: teto de gastos com bloqueio automático + log CSV
//  - Conformidade: disclaimers oficiais por plataforma (Meta,
//    TikTok, YouTube…) + gerador de regulamento + checklist
// ═══════════════════════════════════════════════════════════════
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Disc3, GraduationCap, MessageSquareHeart, Palette, Wallet, ShieldCheck, Plus, Trash2,
  Download, Copy, ExternalLink, CheckCircle2, XCircle, Shuffle, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  type StageConfig, type StageGameKind, GAME_LABELS,
  SEGMENT_PALETTE, PLATFORM_LABELS, PLATFORM_DISCLAIMERS, type StagePlatform,
  activeSegments, oddsPct, buildRegulamento, complianceChecks,
  exportDrawsCsv, downloadCsv, fmtMzn, DEFAULT_LADDER,
} from "@/lib/liveGameStudio";

type Tab = "jogo" | "marca" | "orcamento" | "conformidade";

const GAME_ICONS: Record<StageGameKind, typeof Disc3> = {
  roleta: Disc3,
  quiz: GraduationCap,
  comentarios: MessageSquareHeart,
};

const GAME_PITCH: Record<StageGameKind, string> = {
  roleta: "Rodada com pesos visuais, auto-remoção do vencedor e log auditável — como wheelofnames, mas com a tua marca.",
  quiz: "Escada de prémios com níveis seguros, ajudas 50:50/plateia/saltar e controlo total do apresentador.",
  comentarios: "Cola os comentários de qualquer rede, dedupe automático, multi-vencedores e sorteio animado.",
};

const COLOR_PRESETS = ["#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#14b8a6"];

interface Props {
  cfg: StageConfig;
  onChange: (cfg: StageConfig) => void;
  onOpenStage: (game: StageGameKind, clean?: boolean) => void;
}

const GameStudio = ({ cfg, onChange, onOpenStage }: Props) => {
  const [tab, setTab] = useState<Tab>("jogo");
  const [entryText, setEntryText] = useState("");
  const [showRegulamento, setShowRegulamento] = useState(false);

  const checks = useMemo(() => complianceChecks(cfg), [cfg]);
  const passCount = checks.filter((c) => c.pass).length;
  const segs = activeSegments(cfg);
  const projected = cfg.segments.filter((s) => s.active).reduce((s, x) => s + x.cost, 0);

  const up = (patch: Partial<StageConfig>) => onChange({ ...cfg, ...patch });

  const addSegment = () => {
    up({
      segments: [
        ...cfg.segments,
        {
          id: Math.random().toString(36).slice(2, 9),
          label: "Novo prémio",
          color: SEGMENT_PALETTE[cfg.segments.length % SEGMENT_PALETTE.length],
          weight: 1,
          cost: 100,
          active: true,
        },
      ],
    });
  };

  const shuffleColors = () => {
    const pool = [...SEGMENT_PALETTE].sort(() => Math.random() - 0.5);
    up({ segments: cfg.segments.map((s, i) => ({ ...s, color: pool[i % pool.length] })) });
  };

  const generateRules = () => {
    const txt = buildRegulamento(cfg);
    up({ compliance: { ...cfg.compliance, rules: txt } });
    setShowRegulamento(true);
    toast.success("Regulamento gerado — copia para o post da live.");
  };

  const copyRules = () => {
    try {
      navigator.clipboard.writeText(cfg.compliance.rules || buildRegulamento(cfg));
      toast.success("Regulamento copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const applyEntries = () => {
    const lines = entryText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map((line) => {
      const m = line.match(/^([^:]{1,40}):\s*(.+)$/);
      return m ? { user: m[1].trim(), text: m[2].trim() } : { user: line.replace(/^@/, "").trim(), text: "" };
    });
    up({ entries: parsed });
    toast.success(`${parsed.length} participantes atualizados`);
  };

  const tabs: { key: Tab; label: string; icon: typeof Palette }[] = [
    { key: "jogo", label: "Jogo", icon: Wand2 },
    { key: "marca", label: "Personalização", icon: Palette },
    { key: "orcamento", label: "Orçamento", icon: Wallet },
    { key: "conformidade", label: "Conformidade", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-4" data-testid="game-studio">
      {/* seleção de jogo */}
      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(GAME_LABELS) as StageGameKind[]).map((g) => {
          const Icon = GAME_ICONS[g];
          const active = cfg.game === g;
          return (
            <button
              key={g}
              onClick={() => up({ game: g })}
              data-testid={`studio-game-${g}`}
              className={`rounded-2xl border-2 p-3 text-left transition-all ${active ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.25)]" : "border-border bg-card hover:border-emerald-400/50"}`}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? "bg-emerald-500 text-white" : "bg-secondary"}`}>
                <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              </span>
              <p className="mt-2 text-sm font-extrabold">{GAME_LABELS[g]}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{GAME_PITCH[g]}</p>
            </button>
          );
        })}
      </div>

      {/* abrir palco */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => onOpenStage(cfg.game)} data-testid="studio-open-stage" className="bg-emerald-500 font-bold text-white hover:bg-emerald-400">
          <ExternalLink className="mr-1 h-4 w-4" />Abrir no Palco
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onOpenStage(cfg.game, true)} data-testid="studio-open-clean">
          Modo OBS (limpo)
        </Button>
        <span className="text-[11px] text-muted-foreground">
          {passCount}/{checks.length} conformidade · {cfg.budget.enabled ? `orçamento ${fmtMzn(Math.max(0, cfg.budget.total - cfg.budget.spent))} restante` : "sem teto de gastos"}
        </span>
      </div>

      {/* tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-full bg-secondary/50 p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold ${tab === t.key ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ── JOGO ─────────────────────────────────────────── */}
      {tab === "jogo" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <Input value={cfg.title} onChange={(e) => up({ title: e.target.value })} placeholder="Título da live/promoção" data-testid="studio-title" />

          {cfg.game === "roleta" && (
            <div className="rounded-2xl border border-border bg-card p-3" data-testid="studio-segments">
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-sm font-bold">Prémios da roleta ({segs.length} ativos)</Label>
                <div className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={shuffleColors}><Shuffle className="mr-1 h-3.5 w-3.5" />Cores</Button>
                  <Button size="sm" onClick={addSegment} data-testid="studio-add-segment"><Plus className="mr-1 h-3.5 w-3.5" />Adicionar</Button>
                </div>
              </div>
              <p className="mb-3 text-[11px] text-muted-foreground">O peso define o tamanho do segmento e a probabilidade (a soma do peso 100 = %). O custo desconta do orçamento.</p>
              <ul className="space-y-2">
                {cfg.segments.map((s, i) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-2">
                    <input type="color" value={s.color} onChange={(e) => up({ segments: cfg.segments.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)) })}
                      className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent" aria-label="Cor" />
                    <Input value={s.label} onChange={(e) => up({ segments: cfg.segments.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                      className="h-8 min-w-[120px] flex-1 text-xs" placeholder="Prémio" />
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      Peso
                      <input type="number" min={1} max={20} value={s.weight} onChange={(e) => up({ segments: cfg.segments.map((x, j) => (j === i ? { ...x, weight: Math.max(1, Math.min(20, Number(e.target.value) || 1)) } : x)) })}
                        className="h-8 w-14 rounded-lg border border-border bg-background px-1.5 text-xs" />
                    </label>
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      Custo MZN
                      <input type="number" min={0} step={50} value={s.cost} onChange={(e) => up({ segments: cfg.segments.map((x, j) => (j === i ? { ...x, cost: Math.max(0, Number(e.target.value) || 0) } : x)) })}
                        className="h-8 w-20 rounded-lg border border-border bg-background px-1.5 text-xs" />
                    </label>
                    <span className="text-[10px] font-bold text-emerald-600">{oddsPct(segs.length ? cfg.segments.filter((x) => x.active) : [s], s)}%</span>
                    <button onClick={() => up({ segments: cfg.segments.map((x, j) => (j === i ? { ...x, active: !x.active } : x)) })}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.active ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                      {s.active ? "ativo" : "off"}
                    </button>
                    <button onClick={() => up({ segments: cfg.segments.filter((_, j) => j !== i) })} className="text-red-500" aria-label="Remover"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cfg.game === "quiz" && (
            <div className="space-y-3" data-testid="studio-questions">
              <div className="rounded-2xl border border-border bg-card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-sm font-bold">Perguntas ({cfg.questions.length}) · prémio máximo {fmtMzn(cfg.ladder[cfg.questions.length - 1] || 0)}</Label>
                  <Button size="sm" onClick={() => up({
                    questions: [...cfg.questions, {
                      id: Math.random().toString(36).slice(2, 9), question: "Nova pergunta",
                      options: ["Opção A", "Opção B", "Opção C", "Opção D"], correct: 0 as 0 | 1 | 2 | 3,
                    }],
                  })} data-testid="studio-add-question"><Plus className="mr-1 h-3.5 w-3.5" />Adicionar</Button>
                </div>
                <ul className="space-y-2">
                  {cfg.questions.map((q, i) => (
                    <li key={q.id} className="rounded-xl border border-border p-2.5">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-secondary text-[10px] font-black">{i + 1}</span>
                        <Input value={q.question} onChange={(e) => up({ questions: cfg.questions.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)) })}
                          className="h-8 flex-1 text-xs" placeholder="Pergunta" />
                        <button onClick={() => up({ questions: cfg.questions.filter((_, j) => j !== i) })} className="text-red-500" aria-label="Remover"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {q.options.map((o, oi) => (
                          <label key={oi} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${q.correct === oi ? "border-emerald-500 bg-emerald-500/10" : "border-border"}`}>
                            <input type="radio" name={`correct-${q.id}`} checked={q.correct === oi}
                              onChange={() => up({ questions: cfg.questions.map((x, j) => (j === i ? { ...x, correct: oi as 0 | 1 | 2 | 3 } : x)) })}
                              className="accent-emerald-500" />
                            <input value={o} onChange={(e) => up({ questions: cfg.questions.map((x, j) => {
                              if (j !== i) return x;
                              const opts = [...x.options] as [string, string, string, string];
                              opts[oi] = e.target.value;
                              return { ...x, options: opts };
                            }) })}
                              className="h-7 w-full bg-transparent text-xs outline-none" placeholder={`Opção ${"ABCD"[oi]}`} />
                          </label>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3">
                <Label className="text-sm font-bold">Escada de prémios (MZN)</Label>
                <p className="mb-2 text-[11px] text-muted-foreground">Um valor por nível; a cada 5 níveis o prémio fica garantido (nível seguro).</p>
                <div className="flex flex-wrap gap-1.5">
                  {(cfg.ladder.length ? cfg.ladder : DEFAULT_LADDER).map((v, i) => (
                    <label key={i} className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] ${((i + 1) % 5 === 0) ? "border-amber-500/60 bg-amber-500/10" : "border-border"}`}>
                      N{i + 1}
                      <input type="number" min={0} step={100} value={v}
                        onChange={(e) => { const l = [...cfg.ladder]; l[i] = Math.max(0, Number(e.target.value) || 0); up({ ladder: l }); }}
                        className="w-16 bg-transparent text-xs outline-none" />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {cfg.game === "comentarios" && (
            <div className="rounded-2xl border border-border bg-card p-3" data-testid="studio-entries">
              <Label className="text-sm font-bold">Comentários / participantes ({cfg.entries.length})</Label>
              <p className="mb-2 text-[11px] text-muted-foreground">Uma entrada por linha — formato livre: <code className="rounded bg-secondary px-1">utilizador: comentário</code> ou só o nome. Também podes colar diretamente no palco durante a live.</p>
              <Textarea value={entryText} onChange={(e) => setEntryText(e.target.value)} rows={6}
                placeholder={"ana_silva: Quero ganhar!\njoao_m: Participando!\nfatima_k: Adoro esta loja"}
                className="font-mono text-xs" data-testid="studio-entries-input" />
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={applyEntries} data-testid="studio-entries-apply">Aplicar lista</Button>
                <Button size="sm" variant="secondary" onClick={() => setEntryText("")}>Limpar campo</Button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── PERSONALIZAÇÃO ───────────────────────────────── */}
      {tab === "marca" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-3 space-y-2.5">
            <Label className="flex items-center gap-1.5 text-sm font-bold"><Palette className="h-4 w-4 text-amber-500" />Marca</Label>
            <div>
              <Label className="text-[11px] text-muted-foreground">Nome da empresa</Label>
              <Input value={cfg.brand.name} onChange={(e) => up({ brand: { ...cfg.brand, name: e.target.value } })} data-testid="studio-brand-name" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Slogan</Label>
              <Input value={cfg.brand.slogan ?? ""} onChange={(e) => up({ brand: { ...cfg.brand, slogan: e.target.value } })} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">URL do logo (opcional)</Label>
              <Input value={cfg.brand.logoUrl ?? ""} onChange={(e) => up({ brand: { ...cfg.brand, logoUrl: e.target.value } })} placeholder="https://…" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Cor principal</Label>
              <div className="mt-1 flex items-center gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button key={c} onClick={() => up({ brand: { ...cfg.brand, primaryColor: c } })}
                    className={`h-7 w-7 rounded-full border-2 ${cfg.brand.primaryColor === c ? "border-foreground" : "border-transparent"}`}
                    style={{ background: c }} aria-label={c} />
                ))}
                <input type="color" value={cfg.brand.primaryColor} onChange={(e) => up({ brand: { ...cfg.brand, primaryColor: e.target.value } })}
                  className="h-7 w-10 cursor-pointer rounded-lg border-0 bg-transparent" aria-label="Cor personalizada" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3 space-y-2.5">
            <Label className="text-sm font-bold">Opções do palco</Label>
            <label className="flex items-center justify-between text-xs">
              <span>Tempo de giro da roleta: <b data-testid="studio-spin-seconds">{cfg.options.spinSeconds}s</b></span>
              <input type="range" min={3} max={12} value={cfg.options.spinSeconds}
                onChange={(e) => up({ options: { ...cfg.options, spinSeconds: Number(e.target.value) } })} className="w-32 accent-emerald-500" />
            </label>
            {[
              { k: "autoRemoveWinner" as const, l: "Remover vencedor da roda automaticamente" },
              { k: "showOdds" as const, l: "Mostrar probabilidades (transparência)" },
              { k: "sound" as const, l: "Som no palco" },
              { k: "showDisclaimer" as const, l: "Mostrar disclaimer das redes sociais no rodapé" },
            ].map((o) => (
              <label key={o.k} className="flex items-center justify-between rounded-lg border border-border px-2 py-1.5 text-xs">
                {o.l}
                <input type="checkbox" checked={cfg.options[o.k]} onChange={(e) => up({ options: { ...cfg.options, [o.k]: e.target.checked } })}
                  className="accent-emerald-500" data-testid={`studio-opt-${o.k}`} />
              </label>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── ORÇAMENTO ────────────────────────────────────── */}
      {tab === "orcamento" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-3 space-y-3" data-testid="studio-budget">
            <Label className="flex items-center gap-1.5 text-sm font-bold"><Wallet className="h-4 w-4 text-emerald-500" />Controlo de gastos</Label>
            <label className="flex items-center justify-between rounded-lg border border-border px-2 py-1.5 text-xs">
              <span>Ativar teto de orçamento (bloqueia a roleta ao esgotar)</span>
              <input type="checkbox" checked={cfg.budget.enabled} onChange={(e) => up({ budget: { ...cfg.budget, enabled: e.target.checked } })}
                className="accent-emerald-500" data-testid="studio-budget-enabled" />
            </label>
            <div>
              <Label className="text-[11px] text-muted-foreground">Orçamento total para prémios (MZN)</Label>
              <Input type="number" min={0} step={500} value={cfg.budget.total}
                onChange={(e) => up({ budget: { ...cfg.budget, total: Math.max(0, Number(e.target.value) || 0) } })}
                data-testid="studio-budget-total" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-secondary/60 p-2">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-black">{fmtMzn(cfg.budget.total)}</p>
              </div>
              <div className="rounded-xl bg-rose-500/10 p-2">
                <p className="text-[10px] text-muted-foreground">Gasto</p>
                <p className="text-sm font-black text-rose-500">{fmtMzn(cfg.budget.spent)}</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 p-2">
                <p className="text-[10px] text-muted-foreground">Restante</p>
                <p className="text-sm font-black text-emerald-600">{fmtMzn(Math.max(0, cfg.budget.total - cfg.budget.spent))}</p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-400"
                style={{ width: `${Math.min(100, (cfg.budget.spent / Math.max(1, cfg.budget.total)) * 100)}%` }} />
            </div>
            {cfg.game === "roleta" && (
              <p className="text-[11px] text-muted-foreground">Custo potencial de uma passagem completa pelos prémios ativos: <b className="text-foreground">{fmtMzn(projected)}</b></p>
            )}
            <Button size="sm" variant="secondary" onClick={() => { up({ budget: { ...cfg.budget, spent: 0 } }); toast.info("Gasto reposto a zero (novo ciclo)"); }}>Repor gasto a zero</Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3" data-testid="studio-drawlog">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-bold">Log de prémios ({cfg.draws.length})</Label>
              <button onClick={() => { downloadCsv(`log-premios-${cfg.liveId}.csv`, exportDrawsCsv(cfg.draws)); toast.success("CSV exportado"); }}
                className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold">
                <Download className="h-3 w-3" />Exportar CSV
              </button>
            </div>
            <ul className="max-h-60 space-y-1 overflow-y-auto">
              {cfg.draws.length === 0 && <li className="py-3 text-center text-[11px] text-muted-foreground">Sem prémios entregues ainda — cada giro/pergunta aparece aqui com hora, probabilidade e custo.</li>}
              {cfg.draws.slice().reverse().map((d) => (
                <li key={d.id} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-[11px]">
                  <span className="flex-1 truncate">{d.label}</span>
                  {d.cost > 0 && <span className="font-bold text-rose-500">-{fmtMzn(d.cost)}</span>}
                  <span className="text-muted-foreground">{new Date(d.ts).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* ── CONFORMIDADE ─────────────────────────────────── */}
      {tab === "conformidade" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-3 space-y-2.5" data-testid="studio-compliance">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-emerald-500" />Diretrizes das redes sociais</Label>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${passCount === checks.length ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`} data-testid="studio-compliance-score">
                {passCount === checks.length ? "CONFORME" : `${passCount}/${checks.length}`}
              </span>
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground">Plataformas onde a live vai ser divulgada (geram o disclaimer oficial)</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(Object.keys(PLATFORM_LABELS) as StagePlatform[]).map((p) => {
                  const on = cfg.compliance.platforms.includes(p);
                  return (
                    <button key={p}
                      onClick={() => up({ compliance: { ...cfg.compliance, platforms: on ? cfg.compliance.platforms.filter((x) => x !== p) : [...cfg.compliance.platforms, p] } })}
                      className={`rounded-full px-3 py-1 text-[11px] font-bold border ${on ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border text-muted-foreground"}`}
                      data-testid={`studio-platform-${p}`}>
                      {PLATFORM_LABELS[p]}
                    </button>
                  );
                })}
              </div>
              {cfg.compliance.platforms.length > 0 && (
                <p className="mt-2 rounded-lg bg-secondary/60 p-2 text-[10px] leading-relaxed text-muted-foreground" data-testid="studio-disclaimer-preview">
                  {cfg.compliance.platforms.map((p) => PLATFORM_DISCLAIMERS[p]).join(" ")}
                </p>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-[11px] text-muted-foreground">Idade mínima</Label>
                <Input value={cfg.compliance.minAge} onChange={(e) => up({ compliance: { ...cfg.compliance, minAge: e.target.value } })} placeholder="18" />
              </div>
              <label className="flex items-center justify-between gap-2 self-end rounded-lg border border-border px-2.5 py-2 text-xs">
                <span>Participação gratuita confirmada (sem taxa/compra)</span>
                <input type="checkbox" checked={cfg.compliance.noEntryFee} onChange={(e) => up({ compliance: { ...cfg.compliance, noEntryFee: e.target.checked } })}
                  className="accent-emerald-500" data-testid="studio-no-fee" />
              </label>
            </div>

            <ul className="space-y-1">
              {checks.map((c) => (
                <li key={c.key} className="flex items-center gap-2 text-xs">
                  {c.pass ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="h-4 w-4 shrink-0 text-amber-500" />}
                  <span className={c.pass ? "" : "text-muted-foreground"}>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3" data-testid="studio-rules">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <Label className="text-sm font-bold">Regulamento da promoção</Label>
              <div className="flex gap-1.5">
                <Button size="sm" onClick={generateRules} data-testid="studio-generate-rules"><Wand2 className="mr-1 h-3.5 w-3.5" />Gerar</Button>
                <Button size="sm" variant="secondary" onClick={copyRules} disabled={!(cfg.compliance.rules || "").trim()}><Copy className="mr-1 h-3.5 w-3.5" />Copiar</Button>
              </div>
            </div>
            {showRegulamento || (cfg.compliance.rules || "").length > 0 ? (
              <Textarea readOnly value={cfg.compliance.rules || ""} rows={10}
                onChange={() => { /* somente leitura */ }}
                className="font-mono text-[11px]" data-testid="studio-rules-text" />
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
                Clica em <b>Gerar</b> — o regulamento é criado automaticamente com a tua marca, mecânica, prémios, orçamento e os disclaimers oficiais das plataformas.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GameStudio;
