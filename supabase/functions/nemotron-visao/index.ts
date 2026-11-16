// ═══════════════════════════════════════════════════════════════════════
// v55 — IA NEMOTRON VISÃO — EDGE FUNCTION DE PRODUÇÃO (supabase)
//
// O OLHO da plataforma em produção: o browser fala com ESTA função (JWT
// obrigatório) e a função fala com a NVIDIA — a chave nunca sai do segredo
// do Deno:
//   supabase secrets set NVIDIA_API_KEY=nvapi-...
//   supabase functions deploy nemotron-visao
//
// Contrato: a MESMA forma WIRE que o núcleo isomórfico constrói (o snippet
// oficial do utilizador — v55):
//   POST { model?, messages: [{ role: "user", content: [
//            { type: "text", text }, { type: "image_url", image_url: { url } } ] }],
//          temperature?, top_p?, max_tokens?, reasoning_budget?, stream? }
//   stream=true → tubo SSE puro · stream=false → JSON puro (Accept segue o
//   stream). Caps EXACTOS do snippet: max_tokens 65536 · reasoning_budget
//   16384 · imagem https://… ou data:image/(png|jpeg|jpg|webp|gif);base64,…
//   · rate-limit POR ISOLATE: 10/min (visão é computação cara).
// ═══════════════════════════════════════════════════════════════════════

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODELO_PADRAO = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
const PERGUNTA_CAP = 4_000;
const IMAGEM_CAP = 12_000_000;
const PARTES_CAP = 4;
const MAX_TOKENS_CAP = 65_536;
const ORCAMENTO_CAP = 16_384;
const CHAMADAS_POR_UTILIZADOR = 10; // por janela de 60 s, POR ISOLATE — visão é cara
const CHAMADAS_JANELA_MS = 60_000;

async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  if (token.split(".").length !== 3) return null;
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

function imagemValida(imagem: unknown): boolean {
  return typeof imagem === "string" && imagem.length <= IMAGEM_CAP &&
    (/^https?:\/\/[^\s"'<>\\]+$/i.test(imagem) ||
     /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/i.test(imagem));
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

  // Validação na MESMA forma WIRE do núcleo (o cliente aplica as MESMAS
  // regras em construirCorpoVisao — fonte única do contrato).
  const mensagens = corpo?.messages;
  if (!Array.isArray(mensagens) || mensagens.length !== 1) {
    return new Response(JSON.stringify({ erro: "visão: 1 mensagem com content parts" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }
  const msg = mensagens[0];
  if (msg?.role !== "user" || !Array.isArray(msg?.content) || msg.content.length < 2 || msg.content.length > PARTES_CAP) {
    return new Response(JSON.stringify({ erro: `visão: content parts [text, image_url] (1..${PARTES_CAP})` }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }
  for (const parte of msg.content) {
    if (parte?.type === "text") {
      if (typeof parte.text !== "string" || !parte.text.trim() || parte.text.length > PERGUNTA_CAP) {
        return new Response(JSON.stringify({ erro: "visão: pergunta vazia ou acima do cap" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    } else if (parte?.type === "image_url") {
      if (!imagemValida(parte?.image_url?.url)) {
        return new Response(JSON.stringify({ erro: "imagem tem de ser https://… ou data:image/…;base64,…" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
      }
    } else {
      return new Response(JSON.stringify({ erro: "visão: partes só do tipo text e image_url" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }

  const clamp = (v: unknown, min: number, max: number, padrao: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
  };
  const stream = corpo.stream === undefined ? true : !!corpo.stream;
  const orcamento = Math.round(clamp(corpo.reasoning_budget, 0, ORCAMENTO_CAP, 0));

  const pedidos: Record<string, unknown> = {
    model: typeof corpo.model === "string" && corpo.model ? corpo.model : MODELO_PADRAO,
    messages: [{ role: "user", content: msg.content }],
    temperature: clamp(corpo.temperature, 0, 2, 0.6),  // o EXACTO do snippet
    top_p: clamp(corpo.top_p, 0, 1, 0.95),              // o EXACTO do snippet
    max_tokens: Math.round(clamp(corpo.max_tokens, 1, MAX_TOKENS_CAP, 2048)),
    stream,
  };
  if (orcamento > 0) pedidos.reasoning_budget = orcamento;
  if (stream) pedidos.stream_options = { include_usage: true };

  let upstream: Response;
  try {
    upstream = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: stream ? "text/event-stream" : "application/json",
        Authorization: `Bearer ${CHAVE}`,
      },
      body: JSON.stringify(pedidos),
      signal: AbortSignal.timeout(180_000), // visão+raciocínio pode demorar mais que o chat
    });
  } catch (err) {
    const motivo = err?.name === "TimeoutError" ? "timeout do upstream" : String(err?.message ?? err).slice(0, 200);
    return new Response(JSON.stringify({ erro: "NVIDIA inacessível — " + motivo }), { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // TUBO puro: o que a NVIDIA manda chega ao browser sem re-escrita.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...CORS,
      "Content-Type": upstream.headers.get("content-type") || (stream ? "text/event-stream" : "application/json"),
      "Cache-Control": "no-store",
    },
  });
});
