import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert as SBTablesInsert } from "@/integrations/supabase/types";

const sb: any = supabase;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Voucher {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_purchase?: number;
  max_uses?: number;
  current_uses: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_by: string;
  raffle_id?: string;
  region?: string;
  created_at: string;
}

export interface VoucherRedemption {
  id: string;
  voucher_id: string;
  user_id: string;
  raffle_id: string;
  discount_applied: number;
  created_at: string;
}

export interface DiscountInfo {
  type: "percentage" | "fixed";
  value: number;
  code: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomSegment(length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Generate a random voucher code in the format "BATEU-XXXX-XXXX"
 */
export function generateVoucherCode(length: number = 4): string {
  return `BATEU-${randomSegment(length)}-${randomSegment(length)}`;
}

// ─── Core functions ──────────────────────────────────────────────────────────

/**
 * Validate a voucher code against the vouchers table.
 * Returns the voucher record if valid, or an error string.
 */
export async function validateVoucher(
  code: string,
  raffleId: string
): Promise<{ valid: true; voucher: Voucher } | { valid: false; reason: string }> {
  const normalizedCode = code.trim().toUpperCase();

  const { data: voucher, error } = await sb
    .from("vouchers")
    .select("*")
    .eq("code", normalizedCode)
    .single();

  if (error || !voucher) {
    return { valid: false, reason: "voucher.invalid" };
  }

  if (!voucher.is_active) {
    return { valid: false, reason: "voucher.invalid" };
  }

  const now = new Date().toISOString();
  if (now < voucher.valid_from) {
    return { valid: false, reason: "voucher.expired" };
  }
  if (now > voucher.valid_until) {
    return { valid: false, reason: "voucher.expired" };
  }

  if (voucher.max_uses !== null && voucher.current_uses >= voucher.max_uses) {
    return { valid: false, reason: "voucher.max_uses" };
  }

  if (voucher.raffle_id && voucher.raffle_id !== raffleId) {
    return { valid: false, reason: "voucher.invalid" };
  }

  return { valid: true, voucher: voucher as Voucher };
}

/**
 * Apply a voucher: validates it, creates a redemption record,
 * increments current_uses, and returns the discount info.
 */
export async function applyVoucher(
  code: string,
  userId: string,
  raffleId: string
): Promise<{ success: true; discount: DiscountInfo } | { success: false; reason: string }> {
  const validation = await validateVoucher(code, raffleId);
  if (!validation.valid) {
    return { success: false, reason: (validation as any).reason };
  }

  const voucher = validation.voucher;

  // Create redemption record
  const { error: redemptionError } = await sb.from("voucher_redemptions").insert({
    voucher_id: voucher.id,
    user_id: userId,
    raffle_id: raffleId,
    discount_applied: voucher.value,
  });

  if (redemptionError) {
    console.error("Voucher redemption error:", redemptionError);
    return { success: false, reason: "voucher.invalid" };
  }

  // Increment current_uses atomically
  await sb.rpc("increment_voucher_uses", { p_voucher_id: voucher.id }).single();
  // Fallback if RPC doesn't exist:
  await sb
    .from("vouchers")
    .update({ current_uses: voucher.current_uses + 1 })
    .eq("id", voucher.id);

  return {
    success: true,
    discount: {
      type: voucher.type as "percentage" | "fixed",
      value: voucher.value,
      code: voucher.code,
    },
  };
}

/**
 * Admin/Business function to create a new voucher.
 */
export interface CreateVoucherInput {
  code: string;
  type: string;
  value: number;
  min_purchase?: number;
  max_uses?: number;
  valid_from: string;
  valid_until: string;
  is_active?: boolean;
  created_by: string;
  raffle_id?: string;
  region?: string;
}

export async function createVoucher(
  voucher: CreateVoucherInput
): Promise<Voucher | null> {
  const { data, error } = await sb
    .from("vouchers")
    .insert({
      ...voucher,
      current_uses: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Create voucher error:", error);
    return null;
  }

  return data as Voucher;
}



/**
 * List all vouchers (admin use).
 */
export async function listVouchers() {
  const { data, error } = await sb
    .from("vouchers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("List vouchers error:", error);
    return [];
  }

  return (data ?? []) as Voucher[];
}

/**
 * Toggle voucher active status.
 */
export async function toggleVoucherStatus(id: string, isActive: boolean) {
  const { error } = await sb
    .from("vouchers")
    .update({ is_active: isActive })
    .eq("id", id);

  return !error;
}

/**
 * Delete a voucher.
 */
export async function deleteVoucher(id: string) {
  const { error } = await sb.from("vouchers").delete().eq("id", id);
  return !error;
}
