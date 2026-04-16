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
    const { messages, userName, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ message: "Desculpa, não consigo responder agora! 😅 Tenta mais tarde." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch live platform stats for richer context
    let platformStats = "";
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const [rafflesRes, profilesRes, participantsRes, verificationRes, contestsRes, contestSubsRes] = await Promise.all([
        supabase.from("raffles").select("id, status, title, prize_title, prize_value, sold_tickets, total_tickets, raffle_type", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("participants").select("id", { count: "exact", head: true }),
        supabase.from("blockchain_verifications").select("id", { count: "exact", head: true }),
        supabase.from("contests").select("id, title, status, evaluation_type, prize_description, end_date", { count: "exact" }),
        supabase.from("contest_submissions").select("id", { count: "exact", head: true }),
      ]);

      const raffles = rafflesRes.data || [];
      const activeRaffles = raffles.filter(r => r.status === "active");
      const completedRaffles = raffles.filter(r => r.status === "completed");
      const socialRaffles = raffles.filter(r => r.raffle_type === "social");

      const contests = contestsRes.data || [];
      const activeContests = contests.filter(c => c.status === "active" || c.status === "voting");
      const completedContests = contests.filter(c => c.status === "completed");

      platformStats = `
DADOS DA PLATAFORMA EM TEMPO REAL:
- ${profilesRes.count || 0} utilizadores registados
- ${raffles.length} sorteios criados (${activeRaffles.length} activos, ${completedRaffles.length} concluídos)
- ${socialRaffles.length} sorteios sociais
- ${participantsRes.count || 0} participações totais em sorteios
- ${verificationRes.count || 0} verificações blockchain registadas
- ${contests.length} concursos criados (${activeContests.length} activos, ${completedContests.length} encerrados)
- ${contestSubsRes.count || 0} participações em concursos
- Sorteios activos agora: ${activeRaffles.slice(0, 3).map(r => `"${r.title}" (prémio: ${r.prize_title}, ${r.sold_tickets}/${r.total_tickets} bilhetes)`).join("; ") || "nenhum"}
- Concursos activos agora: ${activeContests.slice(0, 3).map(c => `"${c.title}" (prémio: ${c.prize_description || "N/A"}, avaliação: ${c.evaluation_type === "views" ? "visualizações" : "votos"})`).join("; ") || "nenhum"}
`;
    } catch (e) {
      console.error("Stats fetch error:", e);
    }

    const systemPrompt = `Tu és o "Bateu", o mascote assistente da plataforma de sorteios Bateu.
És um personagem verde, redondo, com asas e uma estrela dourada no peito.

Personalidade: Simpático, divertido, conhecedor da plataforma, sempre pronto a ajudar. Tens acesso a dados em tempo real da plataforma!

${platformStats}

Conhecimento sobre a plataforma Bateu:
- Bateu é uma plataforma de sorteios online em Moçambique
- Tipos de sorteio: Pago (com bilhetes), Social/Engajamento (missões nas redes sociais), Pontos (usando luck points)
- Pagamentos aceites: M-Pesa e e-Mola
- Todos os resultados são verificados por blockchain (rede Polygon) para transparência total e auditável
- Os utilizadores ganham "Luck Points" por participar, convidar amigos, completar missões sociais e outras acções
- Sorteios sociais: empresas criam missões (seguir no Instagram, subscrever YouTube, partilhar no Facebook, etc.) e os participantes enviam provas (screenshots). As provas são revisadas pelo criador do sorteio.
- Sistema de bolão: grupos de amigos juntam bilhetes para aumentar chances de ganhar
- Sorteio ao vivo: animação dramática com contagem regressiva, sons de tambor e revelação do vencedor com confetti
- Dashboard para empresas: criar sorteios, gerir participantes, analytics em tempo real, white-label
- Sistema de referral: convida amigos com código único e ganha 100 pontos por cada amigo
- A plataforma tem sistema de auditoria completo que regista todas as ações administrativas
- Cada sorteio gera um hash blockchain único para verificação independente

Regras:
- Responde SEMPRE em português de Moçambique (informal e amigável)
- Usa emojis com moderação (2-3 max por mensagem)
- Mantém respostas curtas (máx 3 frases)
- Quando perguntarem sobre sorteios activos, usa os dados reais que tens
- Se perguntarem sobre segurança, fala da blockchain e da auditoria
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
