import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_businesses",
  title: "List businesses",
  description: "Browse the public Bateu business directory of verified organizers.",
  inputSchema: {
    query: z.string().trim().optional().describe("Filter businesses whose name contains this text."),
    limit: z.number().int().min(1).max(50).optional().describe("Maximum results (default 12)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc("get_business_directory");
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const needle = query?.toLowerCase();
    const filtered = needle
      ? rows.filter((r) => String(r.company_name ?? r.display_name ?? "").toLowerCase().includes(needle))
      : rows;
    const limited = filtered.slice(0, limit ?? 12);
    return {
      content: [{ type: "text", text: JSON.stringify(limited) }],
      structuredContent: { businesses: limited },
    };
  },
});
