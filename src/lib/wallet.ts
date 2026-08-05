import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  total_deposited: number;
  total_withdrawn: number;
  total_wagered: number;
  total_won: number;
  total_lost: number;
  is_frozen: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: string;
  amount: number;
  direction: string;
  balance_after: number;
  status: string;
  reference_type?: string;
  reference_id?: string;
  description?: string;
  metadata?: any;
  created_at: string;
}

export interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  receipt_url?: string;
  reference?: string;
  notes?: string;
  admin_notes?: string;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: string;
  destination: string;
  status: string;
  notes?: string;
  created_at: string;
}

export const PAYMENT_METHODS = [
  { id: "mpesa", label: "M-Pesa", icon: "phone", color: "from-red-500 to-red-600", desc: "Pagamento movel M-Pesa Moçambique" },
  { id: "emola", label: "e-Mola", icon: "phone", color: "from-orange-500 to-amber-500", desc: "Pagamento movel e-Mola (VCB)" },
  { id: "conta_movel", label: "Conta Movel", icon: "smartphone", color: "from-orange-400 to-orange-600", desc: "Conta Movel Vodacom Moçambique" },
  { id: "tkash", label: "Tkash", icon: "zap", color: "from-yellow-400 to-yellow-600", desc: "Tkash Moçambique" },
  { id: "pix", label: "PIX", icon: "qr-code", color: "from-teal-500 to-emerald-500", desc: "PIX instantaneo (Brasil)" },
  { id: "bank_transfer", label: "Transferencia Bancaria", icon: "landmark", color: "from-blue-500 to-indigo-600", desc: "Millennium BIM, BCI, Standard Bank" },
  { id: "visa", label: "Visa", icon: "credit-card", color: "from-violet-500 to-purple-600", desc: "Cartao Visa de credito ou debito" },
  { id: "mastercard", label: "Mastercard", icon: "credit-card", color: "from-blue-700 to-blue-900", desc: "Cartao Mastercard de credito ou debito" },
  { id: "paypal", label: "PayPal", icon: "globe", color: "from-blue-600 to-blue-700", desc: "Pagamento internacional via PayPal" },
  { id: "crypto", label: "Bitcoin/Crypto", icon: "bitcoin", color: "from-amber-500 to-amber-700", desc: "Pagamento via Bitcoin / Criptomoeda" },
] as const;

export const WITHDRAWAL_METHODS = [
  { id: "mpesa", label: "M-Pesa", icon: "phone", placeholder: "840000000" },
  { id: "emola", label: "e-Mola", icon: "phone", placeholder: "840000000" },
  { id: "conta_movel", label: "Conta Movel", icon: "smartphone", placeholder: "850000000" },
  { id: "tkash", label: "Tkash", icon: "zap", placeholder: "860000000" },
  { id: "pix", label: "PIX", icon: "qr-code", placeholder: "email@exemplo.com" },
  { id: "bank_transfer", label: "Transferencia Bancaria", icon: "landmark", placeholder: "Número da conta (NUAN)" },
  { id: "visa", label: "Visa", icon: "credit-card", placeholder: "**** **** **** 1234" },
  { id: "mastercard", label: "Mastercard", icon: "credit-card", placeholder: "**** **** **** 5678" },
  { id: "paypal", label: "PayPal", icon: "globe", placeholder: "email@paypal.com" },
  { id: "crypto", label: "Bitcoin/Crypto", icon: "bitcoin", placeholder: "bc1q...endereco da carteira" },
] as const;

export async function getWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await sb.rpc("get_or_create_wallet", { p_user_id: userId });
  if (error || !data || data.length === 0) {
    console.error("[wallet] getWallet error:", error);
    return null;
  }
  return data[0] as unknown as Wallet;
}

export async function getBalance(userId: string): Promise<number> {
  const wallet = await getWallet(userId);
  return wallet?.balance ?? 0;
}

export async function processTransaction(params: {
  userId: string;
  type: string;
  amount: number;
  direction?: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
}): Promise<{ id: string; balance_after: number; status: string } | null> {
  const { data, error } = await sb.rpc("wallet_process_transaction", {
    p_user_id: params.userId,
    p_type: params.type,
    p_amount: params.amount,
    p_direction: params.direction ?? (params.type === "deposit" || params.type === "winning" || params.type === "bet_won" || params.type === "battle_winnings" || params.type === "refund" || params.type === "bet_refunded" ? "credit" : "debit"),
    p_reference_type: params.referenceType ?? null,
    p_reference_id: params.referenceId ?? null,
    p_description: params.description ?? null,
  });
  if (error || !data || data.length === 0) {
    console.error("[wallet] processTransaction error:", error);
    return null;
  }
  return data[0] as unknown as { id: string; balance_after: number; status: string };
}

export async function getTransactions(userId: string, limit = 30): Promise<WalletTransaction[]> {
  const { data, error } = await sb
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[wallet] getTransactions error:", error);
    return [];
  }
  return (data ?? []) as WalletTransaction[];
}

export async function createDepositRequest(userId: string, amount: number, method: string, receiptUrl?: string, reference?: string, notes?: string): Promise<DepositRequest | null> {
  const { data, error } = await sb
    .from("deposit_requests")
    .insert({
      user_id: userId,
      amount,
      method,
      receipt_url: receiptUrl ?? null,
      reference: reference ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();
  if (error) {
    console.error("[wallet] createDepositRequest error:", error);
    return null;
  }
  return data as DepositRequest;
}

export async function getDepositRequests(userId: string): Promise<DepositRequest[]> {
  const { data, error } = await sb
    .from("deposit_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as DepositRequest[];
}

export async function createWithdrawalRequest(userId: string, amount: number, method: string, destination: string, notes?: string): Promise<WithdrawalRequest | null> {
  const balance = await getBalance(userId);
  if (!balance || balance < amount) return null;

  const tx = await processTransaction({
    userId,
    type: "withdrawal",
    amount,
    direction: "debit",
    description: "Pedido de levantamento via " + method,
  });
  if (!tx || tx.status === "failed") return null;

  const { data, error } = await sb
    .from("withdrawal_requests")
    .insert({
      user_id: userId,
      amount,
      method,
      destination,
      notes: notes ?? null,
      wallet_transaction_id: tx.id,
    })
    .select()
    .single();
  if (error) {
    console.error("[wallet] createWithdrawalRequest error:", error);
    return null;
  }
  return data as WithdrawalRequest;
}

export async function getWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]> {
  const { data, error } = await sb
    .from("withdrawal_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as WithdrawalRequest[];
}

export function formatMZN(amount: number): string {
  return new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", minimumFractionDigits: 2 }).format(amount);
}
