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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find or create demo business user
    const { data: usersData } = await supabase.auth.admin.listUsers();
    let demoUser = usersData.users.find((u) => u.email === "demo@bateu.online");
    if (!demoUser) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: "demo@bateu.online",
        password: "BateuDemo2026!",
        email_confirm: true,
        user_metadata: { display_name: "Bateu Demo", role: "business" },
      });
      if (createErr) throw createErr;
      demoUser = created.user;
    }

    if (!demoUser) throw new Error("Could not get demo user");

    const now = new Date();
    const inDays = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

    const contests = [
      {
        title: "🍳 Melhor Receita Tradicional",
        description: "Mostra a tua receita típica preferida. Submete foto do prato + descrição dos ingredientes.",
        prize_description: "Vale de 15.000 MZN para cozinha + destaque na nossa rede social",
        category: "culinaria",
        evaluation_type: "votes",
        requires_photo: true,
        requires_video: false,
        hashtag: "#BateuCozinha",
        status: "active",
        max_submissions_per_user: 1,
        start_date: inDays(-3),
        end_date: inDays(20),
        rules: ["Receita original", "Foto de boa qualidade", "Listar ingredientes"],
        submission_fields: [
          { key: "ingredients", label: "Ingredientes", type: "textarea", required: true },
          { key: "prep_time", label: "Tempo de preparação (min)", type: "number" },
        ],
      },
      {
        title: "📸 Foto do Mês — Paisagens",
        description: "Captura a beleza do teu país. Envia a tua melhor foto de paisagem.",
        prize_description: "Câmara fotográfica + 10.000 MZN em equipamento",
        category: "fotografia",
        evaluation_type: "votes",
        requires_photo: true,
        requires_video: false,
        hashtag: "#BateuFoto",
        status: "active",
        max_submissions_per_user: 3,
        start_date: inDays(-1),
        end_date: inDays(15),
        rules: ["Foto original", "Sem marcas de água", "Resolução mínima 1920x1080"],
        submission_fields: [
          { key: "location", label: "Local da foto", type: "text", required: true },
        ],
      },
      {
        title: "🎵 Talento Musical 2026",
        description: "Mostra o teu talento musical em vídeo. Cantores, instrumentistas, produtores — todos bem-vindos!",
        prize_description: "Sessão de gravação profissional + 25.000 MZN",
        category: "musica",
        evaluation_type: "votes",
        requires_photo: false,
        requires_video: true,
        hashtag: "#BateuMusica",
        status: "active",
        max_submissions_per_user: 1,
        start_date: inDays(-5),
        end_date: inDays(30),
        rules: ["Vídeo até 2 minutos", "Performance ao vivo", "Música original ou cover com créditos"],
        submission_fields: [
          { key: "genre", label: "Género musical", type: "select", required: true,
            options: ["Pop", "Hip-Hop", "Marrabenta", "Pandza", "Afro", "Outro"] },
          { key: "instrument", label: "Instrumento principal", type: "text" },
        ],
      },
      {
        title: "🎬 Mini-Filme Criativo",
        description: "Conta uma história em 60 segundos de vídeo. Criatividade é tudo!",
        prize_description: "15.000 MZN + workshop de cinema",
        category: "video",
        evaluation_type: "views",
        requires_photo: false,
        requires_video: true,
        hashtag: "#BateuFilme",
        status: "active",
        max_submissions_per_user: 2,
        start_date: inDays(-2),
        end_date: inDays(25),
        rules: ["Máximo 60 segundos", "Conteúdo original", "Sem violência ou conteúdo adulto"],
        submission_fields: [
          { key: "synopsis", label: "Sinopse", type: "textarea", required: true, maxLength: 280 },
        ],
      },
      {
        title: "🎨 Arte Digital — Bateu Edition",
        description: "Cria uma ilustração digital inspirada na cultura local.",
        prize_description: "Tablet gráfica + 12.000 MZN em material",
        category: "arte",
        evaluation_type: "votes",
        requires_photo: true,
        requires_video: false,
        hashtag: "#BateuArte",
        status: "active",
        max_submissions_per_user: 2,
        start_date: inDays(0),
        end_date: inDays(28),
        rules: ["Arte 100% original", "Ferramentas digitais", "Submissão em alta resolução"],
        submission_fields: [
          { key: "tools", label: "Ferramentas usadas", type: "text", required: true },
        ],
      },
      {
        title: "💪 Desafio Fitness — Antes & Depois",
        description: "Mostra a tua transformação em 30 dias. Foto antes, foto depois e a tua história.",
        prize_description: "Subscrição anual de ginásio + 8.000 MZN em suplementação",
        category: "fitness",
        evaluation_type: "votes",
        requires_photo: true,
        requires_video: false,
        hashtag: "#BateuFit",
        status: "active",
        max_submissions_per_user: 1,
        start_date: inDays(-10),
        end_date: inDays(20),
        rules: ["Duas fotos comparativas", "História inspiradora", "Sem promoção de produtos não autorizados"],
        submission_fields: [
          { key: "story", label: "A tua história", type: "textarea", required: true, maxLength: 500 },
        ],
      },
      {
        title: "👗 Estilo do Mês",
        description: "Mostra o teu look favorito. Moda, criatividade e atitude.",
        prize_description: "Vale de 20.000 MZN em loja de moda",
        category: "moda",
        evaluation_type: "votes",
        requires_photo: true,
        requires_video: false,
        hashtag: "#BateuEstilo",
        status: "active",
        max_submissions_per_user: 3,
        start_date: inDays(-1),
        end_date: inDays(18),
        rules: ["Foto bem iluminada", "Estilo próprio", "Pode incluir várias peças"],
        submission_fields: [
          { key: "style", label: "Estilo (Casual, Formal, Street, etc.)", type: "text", required: true },
        ],
      },
      {
        title: "🎮 Speedrun Challenge",
        description: "Vence o teu jogo favorito o mais rápido possível e envia o vídeo!",
        prize_description: "Consola + 3 jogos à escolha",
        category: "gaming",
        evaluation_type: "views",
        requires_photo: false,
        requires_video: true,
        hashtag: "#BateuGaming",
        status: "active",
        max_submissions_per_user: 1,
        start_date: inDays(-4),
        end_date: inDays(22),
        rules: ["Gravação contínua sem cortes", "Anti-cheat respeitado", "Tempo final visível no vídeo"],
        submission_fields: [
          { key: "game", label: "Jogo", type: "text", required: true },
          { key: "time", label: "Tempo final (mm:ss)", type: "text", required: true },
        ],
      },
    ];

    let inserted = 0;
    let skipped = 0;
    for (const c of contests) {
      const { data: existing } = await supabase
        .from("contests")
        .select("id")
        .eq("title", c.title)
        .maybeSingle();
      if (existing) {
        skipped++;
        continue;
      }
      const { error } = await supabase.from("contests").insert({
        ...c,
        created_by: demoUser.id,
      });
      if (error) console.error("Insert error:", c.title, error.message);
      else inserted++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Seed concursos: ${inserted} inseridos, ${skipped} já existiam`,
        demoUserId: demoUser.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Seed contests error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
