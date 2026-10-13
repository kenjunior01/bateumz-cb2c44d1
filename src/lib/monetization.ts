// ============================================================
// BATEU v14 — ECOSSISTEMA EM HARMONIA
// Fonte única de verdade das comissões da plataforma e dos
// ganhos de criadores/empresas. Toda a plataforma lê daqui.
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

/** Comissões por omissão — coerentes com o resto da plataforma (5%) */
export const DEFAULT_COMMISSIONS: CommissionConfig = {
  raffle: 5,
  contest: 5,
  tournament: 5,
  marketplace: 10,
  sale: 10,
  challenge: 5,
  esports: 5,
  currency: "MZN",
};

/** Divide um montante entre criador e plataforma de forma transparente */
export function computeSplit(
  amount: number,
  source: EarningSource,
  commissions: CommissionConfig = DEFAULT_COMMISSIONS
): { gross: number; fee: number; net: number; percent: number } {
  const percent = commissions[source] ?? 5;
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
    tagline: "Cria sorteios verificados e arrecada com 5% de comissão",
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
