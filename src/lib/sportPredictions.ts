// ═══════════════════════════════════════════════════════════════════════
// REA DESPORTO v24 — Palpites parimutuel entre jogadores
// Escrow na carteira de jogo (a mesma dos duelos P2P), rollback em falha,
// liquidação exclusivamente server-side (edge function settle-sport-predictions).
// ═══════════════════════════════════════════════════════════════════════
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateWallet } from "@/lib/esports-advanced";
import type { SportEvent } from "@/lib/sports";

const sb: any = supabase;

export type SportPick = "home" | "draw" | "away";

export const PICK_LABELS: Record<SportPick, string> = {
  home: "Casa",
  draw: "Empate",
  away: "Fora",
};

export interface SportPrediction {
  id: string;
  user_id: string;
  event_id: string;
  league_id: string;
  league_name: string;
  event_name: string;
  home_team: string;
  away_team: string;
  home_badge?: string;
  away_badge?: string;
  kickoff_at: string;
  round: number;
  season: string;
  pick: SportPick;
  stake: number;
  status: "open" | "won" | "lost" | "void";
  payout: number;
  pool_total?: number;
  pool_winners?: number;
  settled_result?: string;
  settled_at?: string;
  created_at: string;
}

export interface PredictionPoolStats {
  event_id: string;
  picks_home: number;
  picks_draw: number;
  picks_away: number;
  pool_home: number;
  pool_draw: number;
  pool_away: number;
  pool_total: number;
  picks_total: number;
}

export const STAKE_MIN = 5;
export const STAKE_MAX = 200;

export async function getPoolStats(eventId: string): Promise<PredictionPoolStats | null> {
  const { data, error } = await sb
    .from("sport_prediction_stats")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) return null;
  return data as PredictionPoolStats | null;
}

export async function getMyPredictions(userId: string, limit = 30): Promise<SportPrediction[]> {
  const { data, error } = await sb
    .from("sport_predictions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as SportPrediction[];
}

export type PredictionResult = {
  ok: boolean;
  prediction?: SportPrediction;
  error?: string;
};

export async function placeSportPrediction(params: {
  userId: string;
  ev: SportEvent;
  pick: SportPick;
  stake: number;
}): Promise<PredictionResult> {
  const { userId, ev, pick, stake } = params;
  if (stake < STAKE_MIN || stake > STAKE_MAX) {
    return { ok: false, error: `Aposta entre ${STAKE_MIN} e ${STAKE_MAX} moedas` };
  }
  const wallet = await getOrCreateWallet(userId);
  if (wallet.balance < stake) {
    return { ok: false, error: "Saldo insuficiente na carteira de jogo" };
  }

  // Escrow: debita já (idêntico ao duelo P2P)
  const newBalance = wallet.balance - stake;
  const { error: debitErr } = await sb
    .from("user_wallets")
    .update({ balance: newBalance, total_wagered: wallet.total_wagered + stake })
    .eq("user_id", userId);
  if (debitErr) return { ok: false, error: "Falha ao debitar a carteira" };

  const { data: inserted, error: insertErr } = await sb
    .from("sport_predictions")
    .insert({
      user_id: userId,
      event_id: ev.id,
      league_id: ev.leagueId,
      league_name: ev.leagueName,
      event_name: ev.name,
      home_team: ev.home,
      away_team: ev.away,
      home_badge: ev.homeBadge ?? null,
      away_badge: ev.awayBadge ?? null,
      kickoff_at: ev.kickoff,
      round: ev.round,
      season: ev.season,
      pick,
      stake,
    })
    .select()
    .single();

  if (insertErr) {
    // Rollback do escrow se o palpite não pôde ser gravado (ex.: jogo já começou)
    await sb.from("user_wallets").update({ balance: wallet.balance }).eq("user_id", userId);
    const msg = String(insertErr.message ?? "");
    if (msg.includes("comecou") || msg.includes("Palpites fechados")) {
      return { ok: false, error: "Palpites fechados: a partida já começou" };
    }
    if (msg.includes("duplicate")) {
      return { ok: false, error: "Já tens um palpite nesta partida" };
    }
    return { ok: false, error: "Não foi possível registar o palpite" };
  }

  await sb.from("wallet_transactions").insert({
    user_id: userId,
    wallet_id: wallet.id,
    type: "palpite_escrow",
    amount: -stake,
    balance_after: newBalance,
    description: `Palpite ${PICK_LABELS[pick]} — ${ev.name}`,
    reference_id: inserted.id,
  });

  return { ok: true, prediction: inserted as SportPrediction };
}

/** Divide um pool entre outcomes para as barras de distribuição (0-100%). */
export function poolShares(stats: PredictionPoolStats | null): { home: number; draw: number; away: number } {
  const total = stats ? Number(stats.pool_total) : 0;
  if (!stats || total <= 0) return { home: 0, draw: 0, away: 0 };
  return {
    home: Math.round((Number(stats.pool_home) / total) * 100),
    draw: Math.round((Number(stats.pool_draw) / total) * 100),
    away: Math.round((Number(stats.pool_away) / total) * 100),
  };
}
