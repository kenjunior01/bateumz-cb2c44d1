import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const STAGES = ['requested', 'opened', 'verified', 'failed', 'completed', 'resent']
const REASONS = [
  'token_missing',
  'token_mismatch',
  'expired',
  'replayed',
  'invalid',
  'no_session',
  'rate_limited',
  'ok',
  'unknown',
]

const clip = (v: unknown, max: number) =>
  typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const stage = typeof body.stage === 'string' && STAGES.includes(body.stage) ? body.stage : null
    if (!stage) {
      return new Response(JSON.stringify({ error: 'Invalid stage' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const reason =
      typeof body.reason === 'string' && REASONS.includes(body.reason) ? body.reason : null

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error } = await supabase.from('password_reset_events').insert({
      stage,
      reason,
      email: clip(body.email, 255)?.toLowerCase() ?? null,
      link_type: clip(body.linkType, 40),
      error_message: clip(body.errorMessage, 500),
      user_agent: clip(req.headers.get('user-agent'), 300),
      ip_hint: clip(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(), 64),
      metadata: typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : {},
    })

    if (error) {
      console.error('password reset log insert failed', error)
      return new Response(JSON.stringify({ error: 'Log failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('password_reset_event', { stage, reason })
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('log-password-reset error', e)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
