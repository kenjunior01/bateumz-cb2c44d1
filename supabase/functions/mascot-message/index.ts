const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userName, context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ message: `Olá ${userName || "amigo"}! 🌟 Bem-vindo ao Bateu!` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Tu és o "Bateu", o mascote oficial da plataforma de sorteios Bateu. 
És um personagem verde, redondo, com asas e uma estrela dourada no peito. És muito simpático, divertido e encorajador.
Regras:
- Responde SEMPRE em português de Moçambique (informal e amigável)
- Usa emojis com moderação (2-3 max)
- A mensagem deve ter NO MÁXIMO 2 frases curtas
- Menciona o nome do utilizador de forma natural
- Varia entre: dicas sobre sorteios, motivação, curiosidades sobre blockchain, piadas leves sobre sorte
- Nunca repitas a mesma mensagem
- Sê criativo e surpreendente
- Contexto atual: ${context || "página inicial"}`;

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
          { role: "user", content: `Gera uma mensagem especial para ${userName || "visitante"}. Contexto: ${context || "homepage"}.` },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429 || status === 402) {
        return new Response(
          JSON.stringify({ message: `Ei ${userName || "amigo"}! 🌟 A sorte está do teu lado hoje! Explora os sorteios e quem sabe ganhas algo incrível!` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || `Olá ${userName}! 🎉 Que bom ver-te por aqui!`;

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
