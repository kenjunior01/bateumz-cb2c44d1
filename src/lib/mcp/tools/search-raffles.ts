import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_raffles",
  title: "Search raffles",
  description: "Search active raffles on Bateu by title, category or country.",
  inputSchema: {
    query: z.string().trim().optional().describe("Text to match against the raffle title."),
    country: z.string().trim().optional().describe("Two-letter country code, e.g. US, CA, PT, BR, MZ, AO."),
    category: z.string().trim().optional().describe("Raffle category filter."),
    limit: z.number().int().min(1).max(50).optional().describe("Maximum results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, country, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("raffles")
      .select("id, slug, title, prize_title, prize_value, ticket_price, currency, sold_tickets, total_tickets, end_date, status, country, category")
      .eq("status", "active")
      .order("end_date", { ascending: true })
      .limit(limit ?? 10);
    if (query) q = q.ilike("title", `%${query}%`);
    if (country) q = q.eq("country", country.toUpperCase());
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { raffles: data ?? [] },
    };
  },
});
