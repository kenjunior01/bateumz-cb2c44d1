// Creates a PayPal order with server-authoritative pricing.
// Computes amount from raffles.ticket_price * quantity, returns the order id.
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
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('PayPal auth failed');
  return j.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims?.sub) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { raffle_id, quantity } = await req.json();
    if (!raffle_id || !quantity || quantity < 1 || quantity > 500) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400, headers: corsHeaders });
    }

    const { data: raffle, error } = await supabase
      .from('raffles')
      .select('id,title,ticket_price,currency,status')
      .eq('id', raffle_id)
      .single();
    if (error || !raffle) return new Response(JSON.stringify({ error: 'Raffle not found' }), { status: 404, headers: corsHeaders });
    if (raffle.status !== 'active') return new Response(JSON.stringify({ error: 'Raffle not active' }), { status: 400, headers: corsHeaders });

    const currency = (raffle.currency || 'USD').toUpperCase();
    const total = (Number(raffle.ticket_price) * Number(quantity)).toFixed(2);

    const token = await getAccessToken();
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: raffle.id,
          description: `${raffle.title} x${quantity}`,
          amount: { currency_code: currency, value: total },
        }],
      }),
    });
    const order = await orderRes.json();
    if (!order.id) {
      return new Response(JSON.stringify({ error: 'PayPal order failed', detail: order }), { status: 500, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ id: order.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
