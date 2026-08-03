import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_tickets",
  title: "List my tickets",
  description: "List the signed-in user's Bateu raffle tickets and their payment status.",
  inputSchema: {
    payment_status: z.enum(["pending", "approved", "rejected"]).optional().describe("Filter by payment status."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ payment_status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("participants")
      .select("id, ticket_number, status, payment_status, payment_method, currency, created_at, raffle_id, raffles(title, slug, status, end_date)")
      .eq("user_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (payment_status) q = q.eq("payment_status", payment_status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { tickets: data ?? [] },
    };
  },
});
