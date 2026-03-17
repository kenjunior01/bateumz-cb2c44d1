import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Called after ticket purchase to check if threshold is met and schedule auto-draw
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { raffle_id } = await req.json();
    if (!raffle_id) throw new Error("raffle_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: raffle } = await supabase
      .from("raffles")
      .select("id, draw_mode, auto_draw_days, tickets_threshold, total_tickets, sold_tickets, auto_draw_scheduled_at, status")
      .eq("id", raffle_id)
      .single();

    if (!raffle || raffle.draw_mode !== "auto_sold_out" || raffle.status !== "active") {
      return new Response(JSON.stringify({ scheduled: false, reason: "not_applicable" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Already scheduled
    if (raffle.auto_draw_scheduled_at) {
      return new Response(JSON.stringify({ scheduled: true, already: true, at: raffle.auto_draw_scheduled_at }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const threshold = raffle.tickets_threshold || raffle.total_tickets;
    if (raffle.sold_tickets < threshold) {
      return new Response(JSON.stringify({ scheduled: false, reason: "threshold_not_met", current: raffle.sold_tickets, needed: threshold }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Schedule auto-draw
    const drawDate = new Date();
    drawDate.setDate(drawDate.getDate() + (raffle.auto_draw_days || 0));

    await supabase.from("raffles").update({ auto_draw_scheduled_at: drawDate.toISOString() }).eq("id", raffle_id);

    return new Response(JSON.stringify({ scheduled: true, at: drawDate.toISOString() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
