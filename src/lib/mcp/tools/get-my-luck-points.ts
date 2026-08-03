import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_my_luck_points",
  title: "Get my Luck Points",
  description: "Get the signed-in user's Luck Points balance and recent point activity on Bateu.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("How many recent entries to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("luck_points")
      .select("id, points, action, description, created_at")
      .eq("user_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const entries = data ?? [];
    const total = entries.reduce((sum, row) => sum + (row.points ?? 0), 0);
    return {
      content: [{ type: "text", text: JSON.stringify({ recent_total: total, entries }) }],
      structuredContent: { recent_total: total, entries },
    };
  },
});
