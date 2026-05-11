import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({} as any));
    const refCode = String(body?.refCode || "").trim();
    const liveCode = String(body?.liveCode || "").trim();
    const visitorId = String(body?.visitorId || "").trim();
    const scheduledLiveId = (body?.scheduledLiveId ? String(body.scheduledLiveId).trim() : null) || null;
    const userAgent = req.headers.get("user-agent") || "";
    const referrer = String(body?.referrer || "");

    if (!refCode || refCode.length > 64) {
      return new Response(JSON.stringify({ error: "invalid refCode" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Resolve ambassador
    const { data: amb, error: ambErr } = await supa
      .from("live_ambassadors")
      .select("id, business_user_id, total_visits")
      .eq("ref_code", refCode)
      .eq("is_active", true)
      .maybeSingle();
    if (ambErr) throw ambErr;
    if (!amb) {
      return new Response(JSON.stringify({ error: "ambassador not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a stable per-day visitor hash from IP + UA + visitorId fallback.
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "0.0.0.0";
    const day = new Date().toISOString().slice(0, 10);
    const visitorHash = await sha256(`${ip}|${userAgent}|${visitorId}|${day}`);

    const { data: insRow, error: insErr } = await supa
      .from("live_ambassador_visits")
      .insert({
        ambassador_id: amb.id,
        business_user_id: amb.business_user_id,
        live_code: liveCode || "",
        scheduled_live_id: scheduledLiveId,
        visitor_hash: visitorHash,
        user_agent: userAgent.slice(0, 500),
        referrer: referrer.slice(0, 500),
      })
      .select("id")
      .maybeSingle();

    let counted = true;
    let visitId: string | null = insRow?.id || null;
    if (insErr) {
      counted = false;
      // Try to recover the existing visit id for attendance confirmation.
      const { data: existing } = await supa
        .from("live_ambassador_visits")
        .select("id")
        .eq("visitor_hash", visitorHash)
        .eq("ambassador_id", amb.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      visitId = existing?.id || null;
    } else {
      await supa
        .from("live_ambassadors")
        .update({ total_visits: (amb.total_visits || 0) + 1 })
        .eq("id", amb.id);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        counted,
        visitId,
        businessUserId: amb.business_user_id,
        ambassadorId: amb.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("track-ambassador-visit error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
