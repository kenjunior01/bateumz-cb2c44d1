/**
 * Digital Wallet system for Bateu platform.
 * Manages user wallets, balances, and transactions.
 */

import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export type WalletInsert = Omit<Wallet, "id" | "created_at" | "updated_at">;

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: "deposit" | "withdrawal" | "purchase" | "refund" | "winning";
  amount: number;
  description?: string;
  reference_type?: string;
  reference_id?: string;
  status: string;
  created_at: string;
}

export type WalletTransactionInsert = Omit<WalletTransaction, "id" | "created_at">;

// ── Functions ───────────────────────────────────────────────────────

/**
 * Fetch or create a wallet for the given user.
 */
export async function getWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    // No wallet exists — create one
    return createWallet(userId);
  }

  if (error) {
    console.error("[wallet] getWallet error:", error);
    return null;
  }

  return data;
}

/**
 * Create a brand-new wallet for a user.
 */
async function createWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from("wallets")
    .insert({ user_id: userId, balance: 0, currency: "MZN" })
    .select()
    .single();

  if (error) {
    console.error("[wallet] createWallet error:", error);
    return null;
  }

  return data;
}

/**
 * Get the current balance for a user (returns 0 if no wallet).
 */
export async function getBalance(userId: string): Promise<number> {
  const wallet = await getWallet(userId);
  return wallet?.balance ?? 0;
}

/**
 * Create a transaction and update the wallet balance atomically.
 *
 * Uses a Supabase RPC call to `wallet_process_transaction` if available,
 * otherwise falls back to a sequential insert + update.
 */
export async function createTransaction(
  walletId: string,
  tx: Omit<WalletTransactionInsert, "wallet_id" | "status">
): Promise<WalletTransaction | null> {
  // Try RPC first (atomic)
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "wallet_process_transaction",
    {
      p_wallet_id: walletId,
      p_type: tx.type,
      p_amount: tx.amount,
      p_description: tx.description ?? null,
      p_reference_type: tx.reference_type ?? null,
      p_reference_id: tx.reference_id ?? null,
    }
  );

  if (!rpcError && rpcData) {
    return rpcData as unknown as WalletTransaction;
  }

  // Fallback: sequential approach
  const wallet = await supabase.from("wallets").select("balance").eq("id", walletId).single();
  if (wallet.error) {
    console.error("[wallet] createTransaction – fetch wallet error:", wallet.error);
    return null;
  }

  const newBalance =
    tx.type === "deposit" || tx.type === "refund" || tx.type === "winning"
      ? wallet.data.balance + tx.amount
      : wallet.data.balance - tx.amount;

  if (newBalance < 0) {
    console.warn("[wallet] Insufficient balance for withdrawal/purchase");
    return null;
  }

  const { data: txData, error: txError } = await supabase
    .from("wallet_transactions")
    .insert({
      wallet_id: walletId,
      type: tx.type,
      amount: tx.amount,
      description: tx.description ?? null,
      reference_type: tx.reference_type ?? null,
      reference_id: tx.reference_id ?? null,
      status: "completed",
    })
    .select()
    .single();

  if (txError) {
    console.error("[wallet] createTransaction – insert error:", txError);
    return null;
  }

  const { error: updError } = await supabase
    .from("wallets")
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq("id", walletId);

  if (updError) {
    console.error("[wallet] createTransaction – update error:", updError);
  }

  return txData;
}

/**
 * Get transaction history for a user (joins wallet_transactions with wallets).
 */
export async function getTransactions(
  userId: string,
  limit = 20
): Promise<WalletTransaction[]> {
  // First get the wallet
  const wallet = await getWallet(userId);
  if (!wallet) return [];

  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[wallet] getTransactions error:", error);
    return [];
  }

  return (data ?? []) as unknown as WalletTransaction[];
}

/**
 * Record a deposit via a payment method.
 */
export async function depositViaWallet(
  userId: string,
  amount: number,
  paymentMethod: string
): Promise<WalletTransaction | null> {
  const wallet = await getWallet(userId);
  if (!wallet) return null;

  return createTransaction(wallet.id, {
    type: "deposit",
    amount,
    description: `Depósito via ${paymentMethod}`,
    reference_type: "payment_method",
    reference_id: `pm_${Date.now()}`,
  });
}
