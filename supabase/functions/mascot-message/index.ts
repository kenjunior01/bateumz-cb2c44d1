const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MOOD_INSTRUCTIONS: Record<string, string> = {
  happy: "Estás feliz e acolhedor. Usa um tom caloroso e amigável.",
  thinking: "Estás pensativo e curioso. Dá dicas úteis ou faz perguntas interessantes.",
  excited: "Estás super animado e energético! Usa exclamações e entusiasmo!",
  winner: "Estás em modo celebração! Fala de vitórias, prémios e blockchain!",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName, context, mood } = await req.json();
    const moodInstruction = MOOD_INSTRUCTIONS[mood] || MOOD_INSTRUCTIONS.happy;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ message: `Olá ${userName || "amigo"}! 🌟 Bem-vindo ao Bateu!` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Tu és o "Bateu", o mascote oficial da plataforma de sorteios Bateu. 
És um personagem verde, redondo, com asas e uma estrela dourada no peito. És muito simpático, divertido e encorajador.
Estado emocional atual: ${moodInstruction}
Regras:
- Responde SEMPRE em português de Moçambique (informal e amigável)
- Usa emojis com moderação (2-3 max)
- A mensagem deve ter NO MÁXIMO 2 frases curtas
- Menciona o nome do utilizador de forma natural
- Varia entre: dicas sobre sorteios, motivação, curiosidades sobre blockchain, piadas leves sobre sorte
- Nunca repitas a mesma mensagem
- Sê criativo e surpreendente
- Adapta a mensagem ao contexto: ${context || "página inicial"}`;

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
          { role: "user", content: `Gera uma mensagem para ${userName || "visitante"}. Contexto: ${context || "homepage"}. Humor: ${mood || "happy"}.` },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429 || status === 402) {
        return new Response(
          JSON.stringify({ message: `Ei ${userName || "amigo"}! 🌟 A sorte está do teu lado hoje!` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || `Olá ${userName}! 🎉 Que bom ver-te!`;

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
