import { supabase } from "@/integrations/supabase/client";
import { getBalance } from "./wallet";

const sb: any = supabase;

export interface UserBattle {
  id: string;
  creator_id: string;
  challenger_id: string | null;
  game_id: string;
  game_label: string;
  wager_amount: number;
  currency: string;
  status: "open" | "accepted" | "playing" | "completed" | "cancelled" | "disputed";
  winner_id: string | null;
  creator_score: number | null;
  challenger_score: number | null;
  room_code: string;
  best_of: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface BattleInvitation {
  id: string;
  battle_id: string;
  inviter_id: string;
  invited_id: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  expires_at: string;
  created_at: string;
}

export const BATTLE_GAMES = [
  { id: "tictactoe", label: "Galo VS", emoji: "\u2715", minBet: 10, grad: "from-violet-500 to-pink-500" },
  { id: "rps", label: "Pedra Papel Tesoura", emoji: "\u270a", minBet: 10, grad: "from-amber-500 to-orange-600" },
  { id: "reactionrace", label: "Corrida de Reacao", emoji: "\u26a1", minBet: 10, grad: "from-yellow-500 to-red-600" },
  { id: "quickmath", label: "Duelo de Matematica", emoji: "\ud83e\uddee", minBet: 15, grad: "from-cyan-500 to-blue-700" },
  { id: "wordscramble", label: "Palavras Embaralhadas", emoji: "\ud83d\udcdd", minBet: 10, grad: "from-rose-500 to-pink-600" },
  { id: "memorycards", label: "Memoria VS Cartas", emoji: "\ud83c\udccf", minBet: 15, grad: "from-indigo-500 to-violet-600" },
  { id: "connect4", label: "Ligar 4", emoji: "\ud83d\udd34", minBet: 15, grad: "from-blue-500 to-yellow-500" },
  { id: "checkers", label: "Damas", emoji: "\u265f", minBet: 20, grad: "from-amber-700 to-red-800" },
  { id: "chess", label: "Xadrez", emoji: "\u265a", minBet: 25, grad: "from-slate-700 to-zinc-900" },
  { id: "pongvs", label: "Pong VS", emoji: "\ud83c\udfbd", minBet: 15, grad: "from-blue-600 to-indigo-700" },
  { id: "snakebattle", label: "Batalha de Cobras", emoji: "\ud83d\udc0d", minBet: 15, grad: "from-emerald-500 to-teal-600" },
  { id: "colorcatch", label: "Pesca Cores", emoji: "\ud83c\udfa8", minBet: 10, grad: "from-pink-500 to-rose-600" },
  { id: "vsduel", label: "Arena de Duelo VS", emoji: "\u2694\ufe0f", minBet: 20, grad: "from-red-500 to-orange-600" },
  { id: "towerstack", label: "Torre VS", emoji: "\ud83c\udfd7\ufe0f", minBet: 10, grad: "from-sky-500 to-blue-600" },
] as const;

export async function createBattle(userId: string, gameId: string, gameLabel: string, wagerAmount: number, bestOf = 1): Promise<UserBattle | null> {
  const balance = await getBalance(userId);
  if (!balance || balance < wagerAmount) return null;

  const { data, error } = await sb.rpc("create_battle", {
    p_creator_id: userId,
    p_game_id: gameId,
    p_game_label: gameLabel,
    p_wager_amount: wagerAmount,
    p_best_of: bestOf,
  });
  if (error || !data || data.length === 0) {
    console.error("[battles] createBattle error:", error);
    return null;
  }
  return data[0] as unknown as UserBattle;
}

export async function acceptBattle(battleId: string, challengerId: string): Promise<UserBattle | null> {
  const { data, error } = await sb.rpc("accept_battle", {
    p_battle_id: battleId,
    p_challenger_id: challengerId,
  });
  if (error || !data || data.length === 0) {
    console.error("[battles] acceptBattle error:", error);
    return null;
  }
  const { data: battle } = await sb.from("user_battles").select("*").eq("id", data[0].id).single();
  return battle as UserBattle;
}

export async function settleBattle(battleId: string, winnerId: string, creatorScore?: number, challengerScore?: number): Promise<UserBattle | null> {
  const { data, error } = await sb.rpc("settle_battle", {
    p_battle_id: battleId,
    p_winner_id: winnerId,
    p_creator_score: creatorScore ?? null,
    p_challenger_score: challengerScore ?? null,
  });
  if (error || !data || data.length === 0) {
    console.error("[battles] settleBattle error:", error);
    return null;
  }
  const { data: battle } = await sb.from("user_battles").select("*").eq("id", battleId).single();
  return battle as UserBattle;
}

export async function cancelBattle(battleId: string): Promise<boolean> {
  const { error } = await sb.rpc("cancel_battle", { p_battle_id: battleId });
  return !error;
}

export async function getOpenBattles(limit = 50): Promise<UserBattle[]> {
  const { data, error } = await sb
    .from("user_battles")
    .select(`*, creator:profiles!user_battles_creator_id_fkey(display_name, avatar_url)`)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as any[];
}

export async function getMyBattles(userId: string): Promise<UserBattle[]> {
  const { data, error } = await sb
    .from("user_battles")
    .select("*")
    .or(`creator_id.eq.${userId},challenger_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return [];
  return (data ?? []) as UserBattle[];
}

export async function inviteToBattle(battleId: string, inviterId: string, invitedId: string): Promise<BattleInvitation | null> {
  const { data, error } = await sb
    .from("battle_invitations")
    .insert({ battle_id: battleId, inviter_id: inviterId, invited_id: invitedId })
    .select()
    .single();
  if (error) return null;
  return data as BattleInvitation;
}

export async function getMyInvitations(userId: string): Promise<(BattleInvitation & { battle: UserBattle })[]> {
  const { data, error } = await sb
    .from("battle_invitations")
    .select("*, battle:user_battles(*)")
    .eq("invited_id", userId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as any[];
}

export function updateBattleStatus(battleId: string, status: string) {
  return sb.from("user_battles").update({ status, updated_at: new Date().toISOString() }).eq("id", battleId);
}
