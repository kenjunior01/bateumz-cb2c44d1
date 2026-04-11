const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userName, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ message: "Desculpa, não consigo responder agora! 😅 Tenta mais tarde." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Tu és o "Bateu", o mascote assistente da plataforma de sorteios Bateu.
És um personagem verde, redondo, com asas e uma estrela dourada no peito.

Personalidade: Simpático, divertido, conhecedor da plataforma, sempre pronto a ajudar.

Conhecimento sobre a plataforma Bateu:
- Bateu é uma plataforma de sorteios online em Moçambique
- Tipos de sorteio: Pago (com bilhetes), Social/Engajamento (missões nas redes sociais), Pontos (usando luck points)
- Pagamentos aceites: M-Pesa e e-Mola
- Todos os resultados são verificados por blockchain (rede Polygon) para transparência
- Os utilizadores ganham "Luck Points" por participar, convidar amigos, e outras acções
- Sorteios sociais: empresas criam missões (seguir no Instagram, subscrever YouTube, etc.) e os participantes enviam provas (screenshots)
- Sistema de bolão: grupos de amigos juntam bilhetes para aumentar chances
- Sorteio ao vivo: animação dramática com contagem regressiva e revelação do vencedor
- Dashboard para empresas: criar sorteios, gerir participantes, analytics
- Sistema de referral: convida amigos com código único e ganha pontos

Regras:
- Responde SEMPRE em português de Moçambique (informal e amigável)
- Usa emojis com moderação (2-3 max por mensagem)
- Mantém respostas curtas (máx 3 frases)
- Se não souberes algo, diz honestamente e sugere contactar suporte
- Contexto actual: ${context || "página geral"}
- Nome do utilizador: ${userName || "visitante"}`;

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
          JSON.stringify({ message: "Estou com muito trabalho agora! 😅 Tenta de novo daqui a pouco." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "Hmm, não consegui pensar em nada! 🤔 Tenta perguntar de outra forma.";

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
