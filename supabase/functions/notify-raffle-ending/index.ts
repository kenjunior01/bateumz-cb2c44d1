import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find raffles ending within the next 24 hours that are still active
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: endingRaffles, error: raffleError } = await supabaseAdmin
      .from("raffles")
      .select("id, title, prize_title, end_date")
      .eq("status", "active")
      .not("end_date", "is", null)
      .lte("end_date", in24h.toISOString())
      .gte("end_date", now.toISOString());

    if (raffleError) throw raffleError;
    if (!endingRaffles || endingRaffles.length === 0) {
      return new Response(JSON.stringify({ message: "No raffles ending soon", notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalNotified = 0;

    for (const raffle of endingRaffles) {
      // Get all participants for this raffle
      const { data: participants } = await supabaseAdmin
        .from("participants")
        .select("user_id")
        .eq("raffle_id", raffle.id);

      // Also get social raffle entries
      const { data: socialEntries } = await supabaseAdmin
        .from("social_raffle_entries")
        .select("user_id")
        .eq("raffle_id", raffle.id)
        .eq("status", "approved");

      const userIds = new Set<string>();
      participants?.forEach(p => userIds.add(p.user_id));
      socialEntries?.forEach(e => userIds.add(e.user_id));

      if (userIds.size === 0) continue;

      // Check which users have NOT already been notified for this raffle ending
      const { data: existingNotifs } = await supabaseAdmin
        .from("notifications")
        .select("user_id")
        .eq("raffle_id", raffle.id)
        .eq("type", "raffle_ending");

      const alreadyNotified = new Set(existingNotifs?.map(n => n.user_id) || []);

      const endDate = new Date(raffle.end_date!);
      const hoursLeft = Math.max(1, Math.round((endDate.getTime() - now.getTime()) / (1000 * 60 * 60)));

      const notifications = [...userIds]
        .filter(uid => !alreadyNotified.has(uid))
        .map(userId => ({
          user_id: userId,
          raffle_id: raffle.id,
          type: "raffle_ending",
          title: `⏰ ${raffle.title} termina em breve!`,
          message: `O sorteio "${raffle.title}" (prémio: ${raffle.prize_title}) termina em aproximadamente ${hoursLeft}h! Não percas a oportunidade! 🎉`,
          metadata: { hours_left: hoursLeft, end_date: raffle.end_date } as any,
        }));

      if (notifications.length > 0) {
        await supabaseAdmin.from("notifications").insert(notifications);
        totalNotified += notifications.length;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      raffles_checked: endingRaffles.length,
      notified: totalNotified 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
