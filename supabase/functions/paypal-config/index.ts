// Returns the public PayPal client ID + environment to the frontend.
// Client ID is publishable; we only avoid hardcoding it so it stays a project secret.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID') || '';
  const env = (Deno.env.get('PAYPAL_ENV') || 'sandbox').toLowerCase();
  return new Response(JSON.stringify({ clientId, env }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
