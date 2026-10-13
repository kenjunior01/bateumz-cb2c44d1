// ============================================================
// BATEU v15 — MENSALIDADE + ECOSSISTEMA EM HARMONIA
// Modelo: empresas pagam uma mensalidade; todas as outras pessoas
// usam a plataforma GRÁTIS para os seus fins (0% de comissão).
// Fonte única de verdade — toda a plataforma lê daqui.
// ============================================================
import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

/** Pilares do ecossistema — cada um é uma forma de ganhar dinheiro */
export type EarningSource =
  | "raffle"
  | "contest"
  | "tournament"
  | "marketplace"
  | "sale"
  | "challenge"
  | "esports";

export interface CommissionConfig {
  raffle: number;
  contest: number;
  tournament: number;
  marketplace: number;
  sale: number;
  challenge: number;
  esports: number;
  currency: string;
}

/** Comissões por omissão — 0% em tudo: o sustento é a mensalidade das empresas */
export const DEFAULT_COMMISSIONS: CommissionConfig = {
  raffle: 0,
  contest: 0,
  tournament: 0,
  marketplace: 0,
  sale: 0,
  challenge: 0,
  esports: 0,
  currency: "MZN",
};

/** Divide um montante entre criador e plataforma de forma transparente (0% hoje) */
export function computeSplit(
  amount: number,
  source: EarningSource,
  commissions: CommissionConfig = DEFAULT_COMMISSIONS
): { gross: number; fee: number; net: number; percent: number } {
  const percent = commissions[source] ?? 0;
  const fee = Math.round(amount * (percent / 100) * 100) / 100;
  return { gross: amount, fee, net: Math.round((amount - fee) * 100) / 100, percent };
}

/** Lê as comissões configuradas pelo admin (com fallback aos defaults) */
export async function getCommissionConfig(): Promise<CommissionConfig> {
  try {
    const { data } = await sb
      .from("platform_settings")
      .select("value")
      .eq("key", "commissions")
      .maybeSingle();
    if (data?.value && typeof data.value === "object") {
      return { ...DEFAULT_COMMISSIONS, ...data.value } as CommissionConfig;
    }
  } catch {
    /* fallback silencioso */
  }
  return { ...DEFAULT_COMMISSIONS };
}

export interface CreatorEarning {
  id: string;
  source_type: EarningSource | "other";
  source_id: string | null;
  title: string | null;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  currency: string;
  commission_percent: number;
  status: "pending" | "available" | "paid" | "cancelled";
  created_at: string;
}

/** Ganhos de um criador/empresa (a minha carteira de negócio) */
export async function getMyEarnings(userId: string): Promise<CreatorEarning[]> {
  const { data, error } = await sb
    .from("creator_earnings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return [];
  return (data ?? []) as CreatorEarning[];
}

export interface EarningsSummary {
  totalNet: number;
  totalGross: number;
  totalFees: number;
  count: number;
  bySource: Record<string, number>;
}

export function summarizeEarnings(rows: CreatorEarning[]): EarningsSummary {
  const bySource: Record<string, number> = {};
  let totalNet = 0;
  let totalGross = 0;
  let totalFees = 0;
  for (const r of rows) {
    if (r.status === "cancelled") continue;
    totalNet += Number(r.net_amount) || 0;
    totalGross += Number(r.gross_amount) || 0;
    totalFees += Number(r.platform_fee) || 0;
    bySource[r.source_type] = (bySource[r.source_type] ?? 0) + (Number(r.net_amount) || 0);
  }
  return { totalNet, totalGross, totalFees, count: rows.length, bySource };
}

/** Pulso do ecossistema — métricas agregadas públicas para a home */
export interface EcosystemPulse {
  active_raffles: number;
  active_contests: number;
  active_tournaments: number;
  prize_pool: number;
  members: number;
  businesses: number;
  creators_net: number;
  platform_commissions: number;
  earnings_records: number;
  business_subscribers?: number;
  monthly_revenue?: number;
}

// ============================================================
// MENSALIDADE — planos da plataforma
// ============================================================
export type PlanKey = "free" | "business" | "corporate";

export interface PlatformPlan {
  key: PlanKey;
  name: string;
  price: number;
  tagline: string;
  features: string[];
}

export const PLATFORM_PLANS: PlatformPlan[] = [
  {
    key: "free",
    name: "Grátis",
    price: 0,
    tagline: "Para pessoas usarem a plataforma para os seus fins",
    features: [
      "Jogos e RPG 3D",
      "Stories, feed e lives",
      "Participar em sorteios e concursos",
      "Criar eventos gratuitos",
      "Carteira e pontos",
    ],
  },
  {
    key: "business",
    name: "Empresarial",
    price: 1500,
    tagline: "Para empresas venderem e promoverem todos os dias",
    features: [
      "Tudo do Grátis",
      "Sorteios, concursos e campeonatos ilimitados",
      "Loja + prestações + alienação com a sua marca",
      "Stories comerciais com ofertas relâmpago",
      "Em destaque na home e no diretório",
      "Selo de empresa verificada",
    ],
  },
  {
    key: "corporate",
    name: "Corporativa",
    price: 4500,
    tagline: "Para marcas que querem o palco inteiro",
    features: [
      "Tudo do Empresarial",
      "Mega destaque na home (herói)",
      "Campanhas com rodas e jogos da marca",
      "White-label no perfil da empresa",
      "Suporte prioritário dedicado",
      "Relatórios de desempenho",
    ],
  },
];

/** Lê o catálogo de planos configurado pelo admin (com fallback) */
export async function getPlansConfig(): Promise<PlatformPlan[]> {
  try {
    const { data } = await sb
      .from("platform_settings")
      .select("value")
      .eq("key", "plans")
      .maybeSingle();
    const cfg = data?.value as Record<string, { name?: string; price?: number; tagline?: string; features?: string[] }> | undefined;
    if (cfg && typeof cfg === "object") {
      return PLATFORM_PLANS.map((p) => ({
        ...p,
        name: cfg[p.key]?.name ?? p.name,
        price: Number(cfg[p.key]?.price ?? p.price),
        tagline: cfg[p.key]?.tagline ?? p.tagline,
        features: cfg[p.key]?.features ?? p.features,
      }));
    }
  } catch {
    /* fallback silencioso */
  }
  return PLATFORM_PLANS;
}

export interface CompanySubscription {
  id: string;
  company_id: string;
  plan_key: PlanKey;
  status: "active" | "past_due" | "canceled";
  price_mnt: number;
  started_at: string;
  current_period_end: string;
  canceled_at: string | null;
}

/** A assinatura da empresa autenticada (null se nunca subscreveu) */
export async function getMySubscription(userId: string): Promise<CompanySubscription | null> {
  try {
    const { data } = await sb
      .from("company_subscriptions")
      .select("*")
      .eq("company_id", userId)
      .maybeSingle();
    return (data as CompanySubscription) ?? null;
  } catch {
    return null;
  }
}

export interface SubscribeResult {
  ok: boolean;
  plan?: PlanKey;
  price?: number;
  period_end?: string;
  error?: string;
}

/** Paga a mensalidade com o saldo da carteira (RPC atómico) */
export async function subscribeCompany(planKey: PlanKey): Promise<SubscribeResult> {
  try {
    const { data, error } = await sb.rpc("subscribe_company" as any, { p_plan_key: planKey } as any);
    if (error) return { ok: false, error: error.message };
    return (data as SubscribeResult) ?? { ok: false, error: "Resposta vazia" };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao subscrever" };
  }
}

/** O plano está ativo (mensalidade paga e dentro do período)? */
export function isSubscriptionActive(sub: CompanySubscription | null): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  if (sub.plan_key === "free") return true; // grátis não expira
  return new Date(sub.current_period_end).getTime() > Date.now();
}

export async function getEcosystemPulse(): Promise<EcosystemPulse | null> {
  try {
    const { data, error } = await sb.from("ecosystem_pulse").select("*").maybeSingle();
    if (error || !data) return null;
    return data as EcosystemPulse;
  } catch {
    return null;
  }
}

/** Metadados dos 5 pilares — usados na home, no /negocios e no menu */
export interface EcosystemPillar {
  id: EarningSource | "games";
  icon: string;
  name: string;
  tagline: string;
  href: string;
  color: string;
  commissionKey: CommissionConfig | null;
}

export const ECOSYSTEM_PILLARS: EcosystemPillar[] = [
  {
    id: "games",
    icon: "🎮",
    name: "Jogos",
    tagline: "Joga, sobe de nível e converte pontos em saldo real",
    href: "/jogos",
    color: "from-sky-500 to-cyan-400",
    commissionKey: null,
  },
  {
    id: "raffle",
    icon: "🎁",
    name: "Sorteios",
    tagline: "Cria sorteios verificados e arrecada 100% do que vende",
    href: "/dashboard/raffles/create",
    color: "from-violet-500 to-purple-400",
    commissionKey: DEFAULT_COMMISSIONS,
  },
  {
    id: "contest",
    icon: "🏆",
    name: "Concursos",
    tagline: "Lança concursos de talento com taxa de inscrição",
    href: "/dashboard/contests",
    color: "from-amber-500 to-yellow-400",
    commissionKey: DEFAULT_COMMISSIONS,
  },
  {
    id: "tournament",
    icon: "⚔️",
    name: "Campeonatos",
    tagline: "Organiza torneios com jogos da plataforma e prémios",
    href: "/tournaments",
    color: "from-emerald-500 to-green-400",
    commissionKey: DEFAULT_COMMISSIONS,
  },
  {
    id: "sale",
    icon: "🛒",
    name: "Vendas",
    tagline: "Vende a prestações, alienação e serviços ao país inteiro",
    href: "/empresas",
    color: "from-rose-500 to-pink-400",
    commissionKey: DEFAULT_COMMISSIONS,
  },
];

export function formatMZN(v: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "MZN",
    maximumFractionDigits: v % 1 === 0 ? 0 : 2,
  }).format(v);
}
