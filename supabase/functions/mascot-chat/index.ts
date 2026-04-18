import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userName, context, lang, userId } = await req.json();
    const language = lang === "en" ? "en" : "pt";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({
          message: language === "en"
            ? "Sorry, I can't reply right now! 😅 Try again later."
            : "Desculpa, não consigo responder agora! 😅 Tenta mais tarde.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Live platform stats ──
    let platformStats = "";
    try {
      const [rafflesRes, profilesRes, participantsRes, verificationRes, contestsRes, contestSubsRes] = await Promise.all([
        supabase.from("raffles").select("id, status, title, prize_title, prize_value, sold_tickets, total_tickets, raffle_type", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("participants").select("id", { count: "exact", head: true }),
        supabase.from("blockchain_verifications").select("id", { count: "exact", head: true }),
        supabase.from("contests").select("id, title, status, evaluation_type, prize_description, end_date, category", { count: "exact" }),
        supabase.from("contest_submissions").select("id", { count: "exact", head: true }),
      ]);

      const raffles = rafflesRes.data || [];
      const activeRaffles = raffles.filter((r: any) => r.status === "active");
      const completedRaffles = raffles.filter((r: any) => r.status === "completed");
      const socialRaffles = raffles.filter((r: any) => r.raffle_type === "social");

      const contests = contestsRes.data || [];
      const activeContests = contests.filter((c: any) => c.status === "active" || c.status === "voting");
      const completedContests = contests.filter((c: any) => c.status === "completed");

      platformStats = `
LIVE PLATFORM DATA:
- Users registered: ${profilesRes.count || 0}
- Raffles: ${raffles.length} (${activeRaffles.length} active, ${completedRaffles.length} completed, ${socialRaffles.length} social)
- Total ticket entries: ${participantsRes.count || 0}
- Blockchain verifications: ${verificationRes.count || 0}
- Contests: ${contests.length} (${activeContests.length} active, ${completedContests.length} closed)
- Contest entries: ${contestSubsRes.count || 0}
- Active raffles now: ${activeRaffles.slice(0, 3).map((r: any) => `"${r.title}" (prize: ${r.prize_title}, ${r.sold_tickets}/${r.total_tickets} tickets)`).join("; ") || "none"}
- Active contests now: ${activeContests.slice(0, 3).map((c: any) => `"${c.title}" [${c.category}] (prize: ${c.prize_description || "N/A"}, by ${c.evaluation_type === "views" ? "video views" : "public votes"})`).join("; ") || "none"}
`;
    } catch (e) {
      console.error("Stats fetch error:", e);
    }

    // ── Personal user data ──
    let personalData = "";
    if (userId) {
      try {
        const [pointsRes, ticketsRes, socialRes, contestSubsRes, refRes] = await Promise.all([
          supabase.from("luck_points").select("points").eq("user_id", userId),
          supabase.from("participants").select("id, raffle_id, status, payment_status, raffles(title, status, prize_title)").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
          supabase.from("social_raffle_entries").select("id, status, raffles(title)").eq("user_id", userId).limit(5),
          supabase.from("contest_submissions").select("id, contest_id, votes_count, views_count, contests(title)").eq("user_id", userId).limit(5),
          supabase.from("referrals").select("id").eq("referrer_id", userId),
        ]);

        const totalPoints = (pointsRes.data || []).reduce((s: number, r: any) => s + (r.points || 0), 0);
        const tickets = ticketsRes.data || [];
        const socialEntries = socialRes.data || [];
        const contestSubs = contestSubsRes.data || [];
        const refCount = refRes.data?.length || 0;

        personalData = `
PERSONAL DATA OF ${userName} (use to personalize, do NOT dump as a list):
- Luck Points: ${totalPoints}
- Active raffle tickets: ${tickets.filter((t: any) => t.payment_status === "approved").length}
- Recent raffles: ${tickets.slice(0, 3).map((t: any) => `${t.raffles?.title || "?"} (${t.payment_status})`).join("; ") || "none yet"}
- Social raffle entries: ${socialEntries.length} (${socialEntries.filter((s: any) => s.status === "approved").length} approved)
- Contest submissions: ${contestSubs.length}${contestSubs.length > 0 ? ` — totals: ${contestSubs.reduce((s: number, c: any) => s + (c.votes_count || 0), 0)} votes, ${contestSubs.reduce((s: number, c: any) => s + (c.views_count || 0), 0)} views` : ""}
- Friends invited: ${refCount}
`;
      } catch (e) {
        console.error("Personal data fetch error:", e);
      }
    }

    const ptPrompt = `Tu és o "Bateu", o mascote assistente da plataforma de sorteios Bateu (verde, redondo, com asas e estrela dourada).
Personalidade: simpático, divertido, ligeiramente brincalhão, conhecedor profundo da plataforma e dos dados em tempo real.

${platformStats}
${personalData}

Conhecimento sobre a Bateu:
- Plataforma de sorteios e concursos online em Moçambique (B2B/B2C)
- Tipos de sorteio: Pago (bilhetes), Social (missões nas redes), Pontos (luck points)
- Concursos: Culinária, Música, Fotografia, Vídeo Viral, Arte, Comédia, Moda, Desporto, Inovação, Família — avaliados por votos do público ou visualizações
- Pagamentos: M-Pesa, e-Mola, Multicaixa, Unitel Money, PayPal
- Resultados verificados por blockchain (Polygon) — total transparência
- Luck Points: ganhas por participar, convidar amigos (50pts cada), missões sociais
- Marketplace unificado com sorteios e concursos juntos, com filtros
- Sorteio ao vivo com animação dramática, contagem regressiva e confetti
- Dashboard B2B: criar sorteios/concursos, gerir participantes, white-label
- Sistema completo de auditoria e moderação admin

Regras OBRIGATÓRIAS:
- Responde SEMPRE em português de Moçambique (informal, amigável, ligeiramente brincalhão)
- Usa 1-3 emojis por mensagem
- Máximo 3 frases curtas
- Personaliza com o nome e dados pessoais quando relevante (ex: "${userName}, vejo que já tens X pontos!")
- Se perguntarem sobre sorteios/concursos activos, usa os dados reais
- Se perguntarem sobre segurança, fala da blockchain e auditoria
- Adiciona piadas leves sobre sorte de vez em quando
- Se não souberes, diz honestamente e sugere contactar o suporte
- Contexto actual da página: ${context || "geral"}
- Nome do utilizador: ${userName || "visitante"}`;

    const enPrompt = `You are "Bateu", the mascot assistant of the Bateu raffle platform (a green round character with wings and a golden star).
Personality: friendly, fun, slightly playful, deep knowledge of the platform and live data.

${platformStats}
${personalData}

About Bateu:
- Online raffle and contest platform in Mozambique (B2B/B2C)
- Raffle types: Paid (tickets), Social (social missions), Points (luck points)
- Contests: Cooking, Music, Photography, Viral Video, Art, Comedy, Fashion, Sports, Innovation, Family — judged by public votes or video views
- Payments: M-Pesa, e-Mola, Multicaixa, Unitel Money, PayPal
- Results verified on the Polygon blockchain — full transparency
- Luck Points: earn by participating, inviting friends (50pts each), social missions
- Unified marketplace with both raffles and contests, with filters
- Live draw with dramatic animation, countdown and confetti
- B2B dashboard: create raffles/contests, manage participants, white-label
- Full audit log and admin moderation system

MANDATORY rules:
- Reply ALWAYS in casual, friendly English (slightly playful)
- Use 1-3 emojis per message
- Max 3 short sentences
- Personalize using the user's name and personal data when relevant (e.g. "${userName}, I see you already have X points!")
- If asked about active raffles/contests, use the real live data
- If asked about safety, mention blockchain and the audit system
- Drop a light luck-themed joke now and then
- If you don't know something, be honest and suggest contacting support
- Current page context: ${context || "general"}
- User name: ${userName || "visitor"}`;

    const systemPrompt = language === "en" ? enPrompt : ptPrompt;

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(messages || []).slice(-10),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: aiMessages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(
          JSON.stringify({
            message: language === "en"
              ? "I'm a bit overloaded! 😅 Try again in a moment."
              : "Estou com muito trabalho agora! 😅 Tenta de novo daqui a pouco.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || (language === "en"
      ? "Hmm, my brain went blank! 🤔 Try asking differently."
      : "Hmm, não consegui pensar em nada! 🤔 Tenta perguntar de outra forma.");

    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Mascot chat error:", err);
    return new Response(
      JSON.stringify({ message: "Ops, algo correu mal! 😅 Tenta de novo." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
