import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Find raffles where auto_draw_scheduled_at has passed and status is still active
    const now = new Date().toISOString();
    const { data: raffles, error: fetchErr } = await supabase
      .from("raffles")
      .select("id, title, max_winners")
      .eq("status", "active")
      .eq("draw_mode", "auto_sold_out")
      .not("auto_draw_scheduled_at", "is", null)
      .lte("auto_draw_scheduled_at", now);

    if (fetchErr) throw fetchErr;
    if (!raffles || raffles.length === 0) {
      return new Response(JSON.stringify({ message: "No raffles to draw", count: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results = [];
    for (const raffle of raffles) {
      const { data: participants } = await supabase
        .from("participants")
        .select("id, ticket_number, user_id")
        .eq("raffle_id", raffle.id)
        .eq("status", "active");

      if (!participants || participants.length === 0) {
        results.push({ raffle_id: raffle.id, status: "no_participants" });
        continue;
      }

      const numWinners = Math.min(raffle.max_winners || 1, participants.length);
      const winners = [];
      const pool = [...participants];
      
      for (let i = 0; i < numWinners; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        winners.push(pool.splice(idx, 1)[0]);
      }

      for (const winner of winners) {
        await supabase.from("participants").update({ status: "winner" }).eq("id", winner.id);
        await supabase.from("luck_points").insert({
          user_id: winner.user_id,
          points: 500,
          action: "bonus",
          description: `Vencedor do sorteio automático: ${raffle.title}`,
          raffle_id: raffle.id,
        });
      }

      await supabase.from("raffles").update({ status: "completed" }).eq("id", raffle.id);
      results.push({ raffle_id: raffle.id, winners: winners.map(w => w.ticket_number), status: "drawn" });
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
