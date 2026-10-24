// ═══════════════════════════════════════════════════════════════
// liveGameStudio — motor dos Jogos de Palco para empresas.
// REA dos melhores do mundo:
//  - wheelofnames.com  → roleta com pesos proporcionais, auto-remover
//    vencedor, histórico, modo OBS, odds visíveis
//  - Uplup             → log de sorteio auditável (pool + odds + hora)
//  - Woorise           → gerador de regulamento
//  - commentpicker.com → sorteio de comentários com dedupe
//  - WWTBAM / Kahoot   → quiz Milionário com controlo de apresentador
//  - Meta/TikTok ads   → disclaimers por plataforma + checklist
// Tudo local-first (localStorage) — funciona sem base de dados,
// num só dispositivo (o típico de quem faz live com OBS/celular).
// ═══════════════════════════════════════════════════════════════

export type StageGameKind = "roleta" | "quiz" | "comentarios";

export type StagePlatform = "instagram" | "facebook" | "tiktok" | "youtube" | "kwai" | "outra";

export type WheelSegment = {
  id: string;
  label: string;
  color: string;
  /** peso 1..10 — o tamanho do segmento na roda é proporcional ao peso */
  weight: number;
  /** custo do prémio em MZN para o orçamento da empresa */
  cost: number;
  reward?: string;
  active: boolean;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explanation?: string;
};

export type StageBrand = {
  name: string;
  slogan?: string;
  logoUrl?: string;
  primaryColor: string;
};

export type StageBudget = {
  enabled: boolean;
  total: number;
  spent: number;
  currency: string;
};

export type StageCompliance = {
  platforms: StagePlatform[];
  minAge: string;
  noEntryFee: boolean;
  rules: string;
};

export type StageOptions = {
  spinSeconds: number;
  autoRemoveWinner: boolean;
  showOdds: boolean;
  sound: boolean;
  showDisclaimer: boolean;
};

export type StageDraw = {
  id: string;
  ts: number;
  game: StageGameKind;
  /** rótulo do vencedor / prémio / pergunta */
  label: string;
  cost: number;
  poolSize: number;
  oddsPct: number;
};

export type StageConfig = {
  liveId: string;
  title: string;
  game: StageGameKind;
  brand: StageBrand;
  segments: WheelSegment[];
  /** participantes/comentários para a roleta-de-nomes e sorteio de comentários */
  entries: { user: string; text: string }[];
  questions: QuizQuestion[];
  ladder: number[];
  budget: StageBudget;
  compliance: StageCompliance;
  options: StageOptions;
  draws: StageDraw[];
  updatedAt: number;
};

export const GAME_LABELS: Record<StageGameKind, string> = {
  roleta: "Roleta de Prémios",
  quiz: "Quiz Milionário",
  comentarios: "Sorteio de Comentários",
};

export const PLATFORM_LABELS: Record<StagePlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  kwai: "Kwai",
  outra: "Outra",
};

// Disclaimers oficiais — diretrizes de promoções das plataformas
export const PLATFORM_DISCLAIMERS: Record<StagePlatform, string> = {
  instagram: "Esta promoção não é patrocinada, endossada, associada nem administrada pelo Instagram ou pela Meta Platforms, Inc.",
  facebook: "Esta promoção não é patrocinada, endossada, associada nem administrada pelo Facebook ou pela Meta Platforms, Inc.",
  tiktok: "Esta promoção não é patrocinada, endossada, associada nem administrada pelo TikTok.",
  youtube: "Esta promoção não é patrocinada, endossada, associada nem administrada pelo YouTube ou pela Google LLC.",
  kwai: "Esta promoção não é patrocinada, endossada, associada nem administrada pelo Kwai.",
  outra: "Esta promoção não é patrocinada nem endossada pelas plataformas onde é divulgada.",
};

export const SEGMENT_PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

const uid = () => Math.random().toString(36).slice(2, 9);

export const DEFAULT_LADDER = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000];

export const DEFAULT_SEGMENTS = (): WheelSegment[] => [
  { id: uid(), label: "Voucher 500 MZN", color: SEGMENT_PALETTE[7], weight: 3, cost: 500, active: true },
  { id: uid(), label: "Produto da loja", color: SEGMENT_PALETTE[5], weight: 2, cost: 800, active: true },
  { id: uid(), label: "Desconto 25%", color: SEGMENT_PALETTE[9], weight: 3, cost: 150, active: true },
  { id: uid(), label: "Tente outra vez", color: "#3f3f46", weight: 2, cost: 0, active: true },
];

export const DEFAULT_QUESTIONS = (): QuizQuestion[] => [
  { id: uid(), question: "Qual é a capital de Moçambique?", options: ["Maputo", "Matola", "Beira", "Nampula"], correct: 0, explanation: "Maputo é a capital desde a independência." },
  { id: uid(), question: "Quantos dias tem uma semana?", options: ["5", "6", "7", "8"], correct: 2 },
  { id: uid(), question: "Qual destes é um cereal muito consumido em Moçambique?", options: ["Caju", "Xima (milho)", "Camarão", "Coco"], correct: 1 },
];

export const DEFAULT_ENTRIES = () => [
  { user: "ana_silva", text: "Quero ganhar! 🔥" },
  { user: "joao_m", text: "Participando desde Beira" },
  { user: "fatima_k", text: "Adoro esta loja" },
  { user: "tarcisio_z", text: "Boa sorte a todos" },
  { user: "linda_a", text: "Já é a 3ª live que vejo" },
];

export function defaultStageConfig(liveId: string, game: StageGameKind = "roleta"): StageConfig {
  return {
    liveId,
    title: "Live da Empresa",
    game,
    brand: { name: "Minha Empresa", slogan: "Prémios ao vivo", primaryColor: "#f59e0b" },
    segments: DEFAULT_SEGMENTS(),
    entries: DEFAULT_ENTRIES(),
    questions: DEFAULT_QUESTIONS(),
    ladder: [...DEFAULT_LADDER],
    budget: { enabled: true, total: 5000, spent: 0, currency: "MZN" },
    compliance: {
      platforms: ["instagram", "facebook"],
      minAge: "18",
      noEntryFee: true,
      rules: "",
    },
    options: { spinSeconds: 6, autoRemoveWinner: false, showOdds: true, sound: true, showDisclaimer: true },
    draws: [],
    updatedAt: Date.now(),
  };
}

// ── persistência ──────────────────────────────────────────────
const keyOf = (liveId: string) => `bw_stage_cfg_v1_${liveId}`;

export function loadStageConfig(liveId: string): StageConfig | null {
  try {
    const raw = localStorage.getItem(keyOf(liveId));
    if (!raw) return null;
    const cfg = JSON.parse(raw) as StageConfig;
    if (!cfg || !Array.isArray(cfg.segments)) return null;
    return cfg;
  } catch {
    return null;
  }
}

export function saveStageConfig(cfg: StageConfig): StageConfig {
  const next = { ...cfg, updatedAt: Date.now() };
  try {
    localStorage.setItem(keyOf(cfg.liveId), JSON.stringify(next));
    localStorage.setItem("bw_stage_cfg_last", cfg.liveId);
  } catch { /* quota */ }
  return next;
}

export function loadOrCreateStageConfig(liveId: string, game: StageGameKind = "roleta"): StageConfig {
  const existing = loadStageConfig(liveId);
  return existing ?? saveStageConfig(defaultStageConfig(liveId, game));
}

// ── roleta: pesos, odds, sorteio ──────────────────────────────
export const activeSegments = (cfg: StageConfig) => cfg.segments.filter((s) => s.active);

export function totalWeight(segments: WheelSegment[]): number {
  return segments.reduce((s, x) => s + Math.max(0, x.weight), 0) || 1;
}

export function oddsPct(segments: WheelSegment[], seg: WheelSegment): number {
  const total = totalWeight(segments);
  return Math.round((Math.max(0, seg.weight) / total) * 1000) / 10;
}

/** índice sorteado com pesos — usa crypto quando disponível (justiça auditável) */
export function pickWeightedIndex(segments: WheelSegment[]): number {
  const total = segments.reduce((s, x) => s + Math.max(0, x.weight), 0) || 1;
  let r: number;
  try {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    r = (buf[0] / 4294967296) * total;
  } catch {
    r = Math.random() * total;
  }
  for (let i = 0; i < segments.length; i++) {
    r -= Math.max(0, segments[i].weight);
    if (r <= 0) return i;
  }
  return segments.length - 1;
}

// ── orçamento (controlo de gastos) ────────────────────────────
export const budgetRemaining = (cfg: StageConfig) => Math.max(0, cfg.budget.total - cfg.budget.spent);

export const budgetCanSpin = (cfg: StageConfig) =>
  !cfg.budget.enabled || cfg.budget.total - cfg.budget.spent > 0;

/** aplica um prémio ao orçamento e registra o draw (log auditável) */
export function registerDraw(
  cfg: StageConfig,
  draw: Omit<StageDraw, "id" | "ts">,
): StageConfig {
  const next: StageConfig = {
    ...cfg,
    draws: [...cfg.draws, { ...draw, id: uid(), ts: Date.now() }],
  };
  if (draw.cost > 0) next.budget = { ...next.budget, spent: next.budget.spent + draw.cost };
  return saveStageConfig(next);
}

export function exportDrawsCsv(draws: StageDraw[]): string {
  const head = "data_hora,jogo,resultado,custo_mzn,participantes,probabilidade_pct";
  const rows = draws.map((d) => {
    const dt = new Date(d.ts).toISOString();
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    return [dt, d.game, esc(d.label), d.cost, d.poolSize, d.oddsPct].join(",");
  });
  return [head, ...rows].join("\n");
}

export function downloadCsv(name: string, csv: string) {
  try {
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch { /* noop */ }
}

// ── conformidade (diretrizes das redes sociais) ───────────────
export function buildRegulamento(cfg: StageConfig): string {
  const plats = cfg.compliance.platforms.map((p) => PLATFORM_LABELS[p]).join(", ") || "—";
  const disclaimers = cfg.compliance.platforms.map((p) => PLATFORM_DISCLAIMERS[p]).join(" ");
  const prizes = activeSegments(cfg)
    .filter((s) => s.cost > 0 || s.reward)
    .map((s) => `• ${s.label}${s.cost ? ` (valor aprox. ${s.cost} ${cfg.budget.currency}, prob. ${oddsPct(activeSegments(cfg), s)}%)` : ""}`)
    .join("\n");
  const lines: string[] = [
    `REGULAMENTO — ${cfg.title || "Promoção ao Vivo"}`,
    ``,
    `1. ORGANIZAÇÃO`,
    `Promoção organizada por ${cfg.brand.name || "a empresa organizadora"}, transmitida ao vivo nas plataformas: ${plats}.`,
    ``,
    `2. PERÍODO E PARTICIPAÇÃO`,
    `A promoção decorre exclusivamente durante a live. Participação gratuita — é proibida qualquer taxa de entrada ou pagamento para participar.`,
    `Idade mínima: ${cfg.compliance.minAge || "18"} anos.`,
    ``,
    `3. MECÂNICA`,
    cfg.game === "roleta"
      ? "A roleta de prémios é girada ao vivo; cada segmento tem probabilidade visível no ecrã, proporcional ao seu peso."
      : cfg.game === "quiz"
        ? "O quiz segue a escada de prémios: responder corretamente avança de nível; há ajudas (50:50, plateia e saltar) e níveis seguros garantidos."
        : "O vencedor é sorteado entre os comentários/participantes válidos, com eliminação de duplicados, ao vivo.",
    ``,
    `4. PRÉMIOS`,
    prizes || "• Prémios descritos durante a transmissão.",
    cfg.budget.enabled ? `\nOrçamento máximo declarado para prémios: ${cfg.budget.total} ${cfg.budget.currency}.` : "",
    ``,
    `5. TRANSPARÊNCIA`,
    `Todas as rodadas ficam registradas num histórico auditável (hora, participantes, probabilidade) disponível para consulta e exportação.`,
    ``,
    `6. ENTREGA`,
    `Os prémios são entregues após confirmação dos dados do vencedor, num prazo máximo de 30 dias.`,
    ``,
    `7. DIRETRIZES DAS PLATAFORMAS`,
    disclaimers || PLATFORM_DISCLAIMERS.outra,
    `A participação implica aceitar este regulamento. A promoção não exige compra nem pagamento — é um sorteio amistoso.`,
  ];
  return lines.filter((l) => l !== "").join("\n").replace(/\n{3,}/g, "\n\n");
}

export type ComplianceCheck = { key: string; label: string; pass: boolean };

export function complianceChecks(cfg: StageConfig): ComplianceCheck[] {
  const hasContent =
    cfg.game === "roleta"
      ? activeSegments(cfg).length >= 2
      : cfg.game === "quiz"
        ? cfg.questions.length >= 1
        : cfg.entries.length >= 1;
  return [
    { key: "content", label: "Conteúdo do jogo definido (prémios/perguntas/participantes)", pass: hasContent },
    { key: "platforms", label: "Plataformas da divulgação marcadas (gera o disclaimer oficial)", pass: cfg.compliance.platforms.length > 0 },
    { key: "noEntryFee", label: "Confirmado: participação gratuita, sem taxa de entrada", pass: cfg.compliance.noEntryFee },
    { key: "rules", label: "Regulamento gerado e publicado no post da live", pass: (cfg.compliance.rules || "").trim().length > 40 },
    { key: "age", label: "Idade mínima definida", pass: !!cfg.compliance.minAge },
  ];
}

export const isCompliant = (cfg: StageConfig) => complianceChecks(cfg).every((c) => c.pass);

// ── comentários: parse + dedupe ───────────────────────────────
export function parseEntries(text: string): { user: string; text: string }[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^([^:]{1,40}):\s*(.+)$/);
      if (m) return { user: m[1].trim(), text: m[2].trim() };
      const parts = line.split(/\s{2,}|\t/);
      if (parts.length >= 2) return { user: parts[0].trim(), text: parts.slice(1).join(" ").trim() };
      return { user: line.replace(/^@/, "").trim(), text: "" };
    });
}

export function dedupeEntries(entries: { user: string; text: string }[]) {
  const seen = new Set<string>();
  return entries.filter((e) => {
    const k = e.user.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── escada do quiz ────────────────────────────────────────────
export function ladderFor(ladder: number[], questionCount: number) {
  const out: number[] = [];
  for (let i = 0; i < questionCount; i++) out.push(ladder[i] ?? (ladder[ladder.length - 1] || 100) * Math.pow(2, i - ladder.length + 1));
  return out;
}

export const isSafeHaven = (index0: number) => (index0 + 1) % 5 === 0;

export const fmtMzn = (v: number) => `${v.toLocaleString("pt-PT")} MZN`;
