// ═══════════════════════════════════════════════════════════════════════
// v55 — IA NEMOTRON VETORES (EMBEDDINGS) — EDGE FUNCTION DE PRODUÇÃO
//
// A MEMÓRIA semântica da plataforma em produção: o browser fala com ESTA
// função (JWT obrigatório) e a função fala com a NVIDIA — a chave nunca
// sai do segredo do Deno:
//   supabase secrets set NVIDIA_API_KEY=nvapi-...
//   supabase functions deploy nemotron-embed
//
// Contrato: a MESMA forma WIRE que o núcleo isomórfico constrói (o snippet
// oficial do utilizador — v55):
//   POST { model?, input: ["<texto> data:image/png;base64,…", …],
//          encoding_format?: "float", modality?: ["text_image"],
//          input_type?: "passage"|"query", truncate?: "END"|"NONE"|"START" }
//   A composição texto+imagem na MESMA string é feita PELO NÚCLEO (regra
//   única); esta função valida os caps e reencaminha. A resposta JSON do
//   upstream (data[i].embedding + usage) passa INTACTA.
//   · input 1..8 entradas · rate-limit POR ISOLATE: 20/min.
// ═══════════════════════════════════════════════════════════════════════

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODELO_PADRAO = "nvidia/nemotron-3.5-embed-8b";
const ENTRADAS_CAP = 8;
const ENTRADA_CAP = 12_000_000;
const CHAMADAS_POR_UTILIZADOR = 20; // por janela de 60 s, POR ISOLATE
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

  // Validação na MESMA forma WIRE do núcleo (construirCorpoVetores — regra única).
  const input = corpo?.input;
  if (!Array.isArray(input) || !input.length || input.length > ENTRADAS_CAP) {
    return new Response(JSON.stringify({ erro: `input: array 1..${ENTRADAS_CAP}` }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }
  for (const s of input) {
    if (typeof s !== "string" || !s.trim() || s.length > ENTRADA_CAP) {
      return new Response(JSON.stringify({ erro: "entrada vazia ou acima do cap" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }
  }
  if (corpo?.encoding_format !== undefined && corpo.encoding_format !== "float") {
    return new Response(JSON.stringify({ erro: "encoding_format tem de ser float" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }
  if (corpo?.input_type !== undefined && corpo.input_type !== "query" && corpo.input_type !== "passage") {
    return new Response(JSON.stringify({ erro: "input_type tem de ser query|passage" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }
  if (corpo?.truncate !== undefined && !["NONE", "END", "START"].includes(corpo.truncate)) {
    return new Response(JSON.stringify({ erro: "truncate tem de ser NONE|END|START" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  const pedidos = {
    model: typeof corpo.model === "string" && corpo.model ? corpo.model : MODELO_PADRAO,
    input,
    encoding_format: "float",       // o EXACTO do snippet
    modality: ["text_image"],       // o EXACTO do snippet
    input_type: corpo.input_type === "query" ? "query" : "passage",
    truncate: ["NONE", "START"].includes(corpo?.truncate) ? corpo.truncate : "END", // o EXACTO do snippet
  };

  let upstream: Response;
  try {
    upstream = await fetch("https://integrate.api.nvidia.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${CHAVE}`,
      },
      body: JSON.stringify(pedidos),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    const motivo = err?.name === "TimeoutError" ? "timeout do upstream" : String(err?.message ?? err).slice(0, 200);
    return new Response(JSON.stringify({ erro: "NVIDIA inacessível — " + motivo }), { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // JSON puro do upstream (data[i].embedding) — intacto.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { ...CORS, "Content-Type": upstream.headers.get("content-type") || "application/json", "Cache-Control": "no-store" },
  });
});
