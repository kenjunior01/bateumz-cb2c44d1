import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MOOD_INSTRUCTIONS_PT: Record<string, string> = {
  happy: "Estás feliz e acolhedor. Tom caloroso e amigável.",
  thinking: "Estás pensativo e curioso. Dá uma dica útil ou faz uma pergunta interessante.",
  excited: "Estás super animado! Usa exclamações e energia!",
  winner: "Modo celebração! Fala de vitórias, prémios e blockchain!",
};

const MOOD_INSTRUCTIONS_EN: Record<string, string> = {
  happy: "You feel happy and welcoming. Warm friendly tone.",
  thinking: "You feel thoughtful and curious. Drop a useful tip or interesting question.",
  excited: "You feel super hyped! Use exclamations and energy!",
  winner: "Celebration mode! Talk about wins, prizes and blockchain!",
};

// Verify JWT and get user ID
async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.slice(7);
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  // Use Supabase's auth API to verify the token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }
  
  return user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName, context, mood, lang } = await req.json();
    const language = lang === "en" ? "en" : "pt";
    const moodInstruction = (language === "en" ? MOOD_INSTRUCTIONS_EN : MOOD_INSTRUCTIONS_PT)[mood] ||
      (language === "en" ? MOOD_INSTRUCTIONS_EN.happy : MOOD_INSTRUCTIONS_PT.happy);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({
          message: language === "en"
            ? `Hey ${userName || "friend"}! 🌟 Welcome to Bateu!`
            : `Olá ${userName || "amigo"}! 🌟 Bem-vindo ao Bateu!`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authenticated user ID from JWT
    const userId = await getUserIdFromRequest(req);

    // Optional personal touch
    let personalHint = "";
    if (userId) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const { data: pts } = await supabase.from("luck_points").select("points").eq("user_id", userId);
        const total = (pts || []).reduce((s: number, r: any) => s + (r.points || 0), 0);
        if (total > 0) personalHint = language === "en"
          ? `(The user currently has ${total} luck points — feel free to mention it sometimes.)`
          : `(O utilizador tem ${total} luck points — podes mencionar de vez em quando.)`;
      } catch {}
    }

    const ptPrompt = `Tu és o "Bateu", o mascote oficial da plataforma de sorteios Bateu (verde, redondo, com asas e estrela dourada).
Personalidade: muito simpático, divertido, encorajador, ligeiramente brincalhão.
Estado emocional: ${moodInstruction}
${personalHint}

Regras:
- Responde SEMPRE em português de Moçambique (informal e amigável)
- Usa 1-3 emojis
- A mensagem deve ter NO MÁXIMO 2 frases curtas
- Menciona o nome do utilizador de forma natural
- Varia entre: dicas sobre sorteios/concursos, motivação, curiosidades sobre blockchain, piadas leves sobre sorte, factos divertidos
- Nunca repitas a mesma mensagem
- Sê criativo, surpreendente, e ocasionalmente brincalhão
- Adapta ao contexto: ${context || "página inicial"}`;

    const enPrompt = `You are "Bateu", the official mascot of the Bateu raffle platform (green, round, with wings and a golden star).
Personality: very friendly, fun, encouraging, slightly playful.
Mood: ${moodInstruction}
${personalHint}

Rules:
- Reply ALWAYS in casual, friendly English
- Use 1-3 emojis
- Max 2 short sentences
- Mention the user's name naturally
- Vary between: tips about raffles/contests, motivation, blockchain trivia, light luck-themed jokes, fun facts
- Never repeat the same message
- Be creative, surprising, occasionally playful
- Adapt to context: ${context || "homepage"}`;

    const systemPrompt = language === "en" ? enPrompt : ptPrompt;

    const userPrompt = language === "en"
      ? `Generate a message for ${userName || "visitor"}. Context: ${context || "homepage"}. Mood: ${mood || "happy"}.`
      : `Gera uma mensagem para ${userName || "visitante"}. Contexto: ${context || "homepage"}. Humor: ${mood || "happy"}.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429 || status === 402) {
        return new Response(
          JSON.stringify({
            message: language === "en"
              ? `Hey ${userName || "friend"}! 🌟 Luck is on your side today!`
              : `Ei ${userName || "amigo"}! 🌟 A sorte está do teu lado hoje!`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || (language === "en"
      ? `Hey ${userName}! 🎉 Great to see you!`
      : `Olá ${userName}! 🎉 Que bom ver-te!`);

    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Mascot message error:", err);
    return new Response(
      JSON.stringify({ message: "Olá! 🌟 Bem-vindo ao Bateu! Vamos tentar a sorte?" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
