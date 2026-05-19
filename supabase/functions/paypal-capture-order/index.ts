// Captures a PayPal order and inserts paid participants/tickets server-side.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const PAYPAL_BASE = (Deno.env.get('PAYPAL_ENV') || 'sandbox').toLowerCase() === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getAccessToken() {
  const id = Deno.env.get('PAYPAL_CLIENT_ID')!;
  const secret = Deno.env.get('PAYPAL_SECRET')!;
  const auth = btoa(`${id}:${secret}`);
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const j = await res.json();
  return j.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims } = await supabaseUser.auth.getClaims(authHeader.replace('Bearer ', ''));
    const userId = claims?.claims?.sub;
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { order_id, raffle_id, ticket_numbers } = await req.json();
    if (!order_id || !raffle_id || !Array.isArray(ticket_numbers) || ticket_numbers.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: corsHeaders });
    }

    const token = await getAccessToken();
    const capRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order_id}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const cap = await capRes.json();
    if (cap.status !== 'COMPLETED') {
      return new Response(JSON.stringify({ error: 'Capture failed', detail: cap }), { status: 400, headers: corsHeaders });
    }
    const captureId = cap?.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;

    // Service-role client to insert participants regardless of RLS edge-cases
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: raffle } = await admin.from('raffles').select('id,currency,sold_tickets').eq('id', raffle_id).single();
    const currency = (raffle?.currency || 'USD').toUpperCase();

    const rows = ticket_numbers.map((n: number) => ({
      raffle_id,
      user_id: userId,
      ticket_number: n,
      status: 'active',
      payment_status: 'paid',
      payment_method: 'paypal',
      currency,
      paypal_order_id: order_id,
      paypal_capture_id: captureId,
    }));

    const { error: insErr } = await admin.from('participants').insert(rows);
    if (insErr) return new Response(JSON.stringify({ error: 'Insert failed', detail: insErr.message }), { status: 500, headers: corsHeaders });

    await admin.from('raffles').update({ sold_tickets: (raffle?.sold_tickets ?? 0) + rows.length }).eq('id', raffle_id);

    // === Referral first-purchase bonus campaign ===
    // If this is the buyer's first ever paid participant AND they were referred,
    // award the referrer extra Luck Points (one-time per referred user).
    try {
      const FIRST_PURCHASE_BONUS = 100;
      const { count: priorPaid } = await admin
        .from('participants')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('payment_status', 'paid')
        .neq('paypal_capture_id', captureId);

      if ((priorPaid ?? 0) === 0) {
        const { data: ref } = await admin
          .from('referrals')
          .select('id, referrer_id, first_purchase_bonus_at')
          .eq('referred_id', userId)
          .maybeSingle();

        if (ref && !ref.first_purchase_bonus_at) {
          await admin.from('luck_points').insert({
            user_id: ref.referrer_id,
            points: FIRST_PURCHASE_BONUS,
            action: 'referral_first_purchase',
            description: 'Bonus: a friend you referred made their first PayPal purchase 🎉',
          });
          await admin.from('referrals').update({
            first_purchase_bonus_at: new Date().toISOString(),
            first_purchase_bonus_points: FIRST_PURCHASE_BONUS,
          }).eq('id', ref.id);
          await admin.from('notifications').insert({
            user_id: ref.referrer_id,
            type: 'success',
            title: `+${FIRST_PURCHASE_BONUS} Luck Points unlocked! 🎁`,
            message: 'A friend you referred just made their first PayPal purchase. Keep inviting to stack more bonuses!',
            metadata: { campaign: 'referral_first_purchase', points: FIRST_PURCHASE_BONUS },
          });
        }
      }
    } catch (bonusErr) {
      // Non-fatal: bonus failure must never break checkout
      console.error('Referral bonus error:', bonusErr);
    }

    return new Response(JSON.stringify({ ok: true, capture_id: captureId, count: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
