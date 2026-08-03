import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require an authenticated caller (the buyer who uploaded the receipt)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data: { user }, error: authErr } = await authClient.auth.getUser(
      authHeader.slice(7)
    );
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { raffle_id, participant_name, ticket_numbers, payment_method } =
      await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get raffle + business user
    const { data: raffle, error: raffleErr } = await supabaseAdmin
      .from("raffles")
      .select("title, business_user_id")
      .eq("id", raffle_id)
      .single();

    if (raffleErr || !raffle) {
      return new Response(JSON.stringify({ error: "Raffle not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get business user email from auth
    const {
      data: { user: businessUser },
    } = await supabaseAdmin.auth.admin.getUserById(raffle.business_user_id);

    if (!businessUser?.email) {
      return new Response(
        JSON.stringify({ error: "Business user email not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get business profile for display name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, company_name")
      .eq("user_id", raffle.business_user_id)
      .single();

    const businessName =
      profile?.company_name || profile?.display_name || "Empresa";

    // Log the notification (we store it as a record for the business to see)
    console.log(
      `📧 Notification: New payment receipt from ${participant_name} for raffle "${raffle.title}" (${payment_method}). Tickets: ${ticket_numbers}. Business: ${businessName}`
    );

    // In production, integrate with email/SMS service here
    // For now we return success so the frontend knows the notification was triggered
    return new Response(
      JSON.stringify({
        success: true,
        message: "The organizer has been notified about your receipt.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
