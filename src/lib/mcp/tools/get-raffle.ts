import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_raffle",
  title: "Get raffle details",
  description: "Get the full public details of one Bateu raffle by its slug or id.",
  inputSchema: {
    slug: z.string().trim().optional().describe("Raffle slug from the public URL."),
    id: z.string().uuid().optional().describe("Raffle UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug, id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!slug && !id) {
      return { content: [{ type: "text", text: "Provide either slug or id." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("raffles")
      .select("id, slug, title, description, prize_title, prize_value, hide_prize_value, ticket_price, currency, sold_tickets, total_tickets, max_tickets_per_user, status, start_date, end_date, category, country, province, city, image_url")
      .limit(1);
    q = slug ? q.eq("slug", slug) : q.eq("id", id!);
    const { data, error } = await q.maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Raffle not found." }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { raffle: data },
    };
  },
});
