import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "payment_approved"
  | "payment_rejected"
  | "raffle_created"
  | "raffle_approved"
  | "raffle_rejected"
  | "raffle_cancelled"
  | "raffle_deleted"
  | "raffle_updated"
  | "raffle_drawn"
  | "settings_updated"
  | "user_verified"
  | "social_entry_approved"
  | "social_entry_rejected"
  | "maintenance_toggled"
  | "countdown_toggled";

export type AuditEntityType =
  | "raffle"
  | "payment"
  | "settings"
  | "user"
  | "social_entry";

export async function logAudit(
  action: AuditAction,
  entityType: AuditEntityType,
  entityId?: string,
  details?: Record<string, unknown>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_logs" as any).insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || {},
    } as any);
  } catch (e) {
    console.error("Audit log error:", e);
  }
}
