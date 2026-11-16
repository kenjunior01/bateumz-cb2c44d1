// ═══════════════════════════════════════════════════════════════════════
// v54 — IA NEMOTRON — EDGE FUNCTION DE PRODUÇÃO (supabase)
//
// O mesmo papel do proxy local (server/ia-proxy.mjs) na plataforma:
// o browser fala com ESTA função (mesma origem Supabase, chave no segredo
// do Deno — NUNCA no bundle) e a função fala com a NVIDIA:
//   supabase secrets set NVIDIA_API_KEY=nvapi-...
//   supabase functions deploy nemotron-chat
//
// Contrato: POST { messages, model?, temperature?, top_p?, max_tokens?,
// thinking? } → SSE puro (stream=true, include_usage, reasoning_content).
// Autenticação OBRIGATÓRIA (JWT Supabase) — é computação paga; o rate
// limit por utilizador é POR ISOLATE (honesto: é o máximo que uma edge
// function sem estado partilhado garante) e complementa o portão do
// cliente (núcleo isomórfico) e os limites do próprio upstream.
// ═══════════════════════════════════════════════════════════════════════

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODELO_PADRAO = "nvidia/nemotron-3-ultra-550b-a55b";
const MENSAGENS_CAP = 40;
const CONTEUDO_CAP = 32_000;
const MAX_TOKENS_CAP = 16_384;
const CHAMADAS_POR_UTILIZADOR = 20; // por janela de 60 s, POR ISOLATE
const CHAMADAS_JANELA_MS = 60_000;

async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  if (token.split(".").length !== 3) return null; // não é um JWT — rejeitado sem rede
  try {
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      },
    });
    if (!r.ok) return null;
    const user = await r.json();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// Balde de fichas por utilizador (memória do isolate — declarado).
const chamadas = new Map<string, number[]>();
function portao(userId: string): { ok: boolean; esperaMs: number } {
  const agora = Date.now();
  const marcas = (chamadas.get(userId) ?? []).filter((m) => agora - m < CHAMADAS_JANELA_MS);
  if (marcas.length >= CHAMADAS_POR_UTILIZADOR) {
    const esperaMs = CHAMADAS_JANELA_MS - (agora - marcas[0]);
    return { ok: false, esperaMs };
  }
  marcas.push(agora);
  chamadas.set(userId, marcas);
  if (chamadas.size > 5_000) chamadas.clear();
  return { ok: true, esperaMs: 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ erro: "só POST" }), { status: 405, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  const CHAVE = Deno.env.get("NVIDIA_API_KEY");
  if (!CHAVE) {
    return new Response(
      JSON.stringify({ erro: "edge function sem NVIDIA_API_KEY — corre: supabase secrets set NVIDIA_API_KEY=..." }),
      { status: 503, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return new Response(JSON.stringify({ erro: "autenticação obrigatória — inicia sessão na Bateu" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const ficha = portao(userId);
  if (!ficha.ok) {
    return new Response(JSON.stringify({ erro: "rate limit — espera", esperaMs: ficha.esperaMs }), {
      status: 429,
      headers: { ...CORS, "Content-Type": "application/json", "Retry-After": String(Math.ceil(ficha.esperaMs / 1000)) },
    });
  }

  let corpo: any;
  try {
    corpo = await req.json();
  } catch {
    return new Response(JSON.stringify({ erro: "JSON inválido" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // Validação + clamp (regras declaradas — o cliente aplica as MESMAS no núcleo).
  const mensagens = corpo?.messages;
  if (!Array.isArray(mensagens) || !mensagens.length || mensagens.length > MENSAGENS_CAP) {
    return new Response(JSON.stringify({ erro: `messages: array 1..${MENSAGENS_CAP}` }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }
  for (const m of mensagens) {
    if (!m || (m.role !== "system" && m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || !m.content.length || m.content.length > CONTEUDO_CAP) {
      return new Response(JSON.stringify({ erro: "mensagem inválida (role/content/cap)" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }
  const clamp = (v: unknown, min: number, max: number, padrao: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
  };

  const pedidos = {
    model: typeof corpo.model === "string" && corpo.model ? corpo.model : MODELO_PADRAO,
    messages: mensagens.map((m: any) => ({ role: m.role, content: m.content })),
    temperature: clamp(corpo.temperature, 0, 2, 1),
    top_p: clamp(corpo.top_p, 0, 1, 0.95),
    max_tokens: Math.round(clamp(corpo.max_tokens, 1, MAX_TOKENS_CAP, 1024)),
    stream: true,
    stream_options: { include_usage: true },
    // v55 — FURO da v54 fechado: o núcleo isomórfico manda o modo pensamento
    // em chat_template_kwargs.enable_thinking (a forma WIRE do snippet); a
    // edge só olhava para corpo.thinking e PERDIA o modo em produção.
    chat_template_kwargs: {
      enable_thinking: corpo?.chat_template_kwargs?.enable_thinking !== undefined
        ? !!corpo.chat_template_kwargs.enable_thinking
        : !!corpo.thinking,
    },
  };

  let upstream: Response;
  try {
    upstream = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream", Authorization: `Bearer ${CHAVE}` },
      body: JSON.stringify(pedidos),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    const motivo = err?.name === "TimeoutError" ? "timeout do upstream" : String(err?.message ?? err).slice(0, 200);
    return new Response(JSON.stringify({ erro: "NVIDIA inacessível — " + motivo }), { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // TUBO puro: o SSE da NVIDIA chega ao browser byte a byte (zero re-escrita,
  // zero atraso — o reasoning_content e o usage passam como vêm).
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { ...CORS, "Content-Type": upstream.headers.get("content-type") || "text/event-stream", "Cache-Control": "no-store" },
  });
});
