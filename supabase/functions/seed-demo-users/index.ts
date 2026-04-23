import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const results: string[] = [];

  // Helper to create or find user
  async function ensureUser(email: string, password: string, meta: Record<string, string>) {
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users?.find((u: any) => u.email === email);
    if (existing) {
      results.push(`⏭️ ${email} já existe`);
      return existing.id;
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: meta,
    });
    if (error || !data.user) {
      results.push(`❌ ${email}: ${error?.message}`);
      return null;
    }
    results.push(`✅ ${email} criado`);
    return data.user.id;
  }

  // ── 1. ADMIN ──
  const adminId = await ensureUser("admin@bateu.online", "Admin@2024!", {
    display_name: "Super Admin", role: "admin",
  });

  // ── 2. BUSINESS USERS (diverse categories) ──
  const businesses = [
    { email: "tech@bateu.online", password: "Tech@2024!", name: "TechMoz Store", company: "TechMoz Lda", province: "maputo_cidade", city: "Maputo" },
    { email: "auto@bateu.online", password: "Auto@2024!", name: "AutoPremium MZ", company: "AutoPremium Moçambique", province: "maputo_cidade", city: "Matola" },
    { email: "imobiliaria@bateu.online", password: "Imob@2024!", name: "Casa Nova Imóveis", company: "Casa Nova Imobiliária", province: "sofala", city: "Beira" },
    { email: "travel@bateu.online", password: "Travel@2024!", name: "Viaja Moçambique", company: "Viaja MZ Tours", province: "inhambane", city: "Vilankulo" },
    { email: "moda@bateu.online", password: "Moda@2024!", name: "Estilo Africano", company: "Estilo Africano Fashion", province: "nampula", city: "Nampula" },
  ];

  const bizIds: Record<string, string> = {};
  for (const b of businesses) {
    const id = await ensureUser(b.email, b.password, { display_name: b.name, role: "business", company_name: b.company });
    if (id) {
      bizIds[b.email] = id;
      // Update profile with geo
      await supabase.from("profiles").update({ company_name: b.company, province: b.province, city: b.city }).eq("user_id", id);
    }
  }

  // ── 3. REGULAR USERS (participants) ──
  const users = [
    { email: "joao@exemplo.mz", password: "User@2024!", name: "João Macuácua", province: "maputo_cidade", city: "Maputo", interests: ["electronica", "veiculos"] },
    { email: "maria@exemplo.mz", password: "User@2024!", name: "Maria Nhantumbo", province: "gaza", city: "Xai-Xai", interests: ["viagens", "moda"] },
    { email: "carlos@exemplo.mz", password: "User@2024!", name: "Carlos Mondlane", province: "sofala", city: "Beira", interests: ["imoveis", "electronica"] },
    { email: "ana@exemplo.mz", password: "User@2024!", name: "Ana Sitoe", province: "nampula", city: "Nampula", interests: ["culinaria", "musica"] },
    { email: "pedro@exemplo.mz", password: "User@2024!", name: "Pedro Cossa", province: "inhambane", city: "Inhambane", interests: ["veiculos", "desporto"] },
    { email: "fatima@exemplo.mz", password: "User@2024!", name: "Fátima Tembe", province: "zambezia", city: "Quelimane", interests: ["moda", "fotografia"] },
    { email: "ricardo@exemplo.mz", password: "User@2024!", name: "Ricardo Nguenha", province: "maputo_cidade", city: "Maputo", interests: ["electronica", "jogos"] },
    { email: "lucia@exemplo.mz", password: "User@2024!", name: "Lúcia Mabjaia", province: "tete", city: "Tete", interests: ["viagens", "culinaria"] },
  ];

  const userIds: Record<string, string> = {};
  for (const u of users) {
    const id = await ensureUser(u.email, u.password, { display_name: u.name, role: "user" });
    if (id) {
      userIds[u.email] = id;
      await supabase.from("profiles").update({ province: u.province, city: u.city, interests: u.interests, phone: `84${Math.floor(1000000 + Math.random() * 9000000)}` }).eq("user_id", id);
    }
  }

  // ── 4. WHITE LABEL CONFIGS for businesses ──
  const wlConfigs = [
    { email: "tech@bateu.online", brand: "TechMoz", primary: "#3b82f6", secondary: "#06b6d4", mpesa: "84 111 2222", emola: "86 333 4444" },
    { email: "auto@bateu.online", brand: "AutoPremium", primary: "#dc2626", secondary: "#f59e0b", mpesa: "84 555 6666", emola: null },
    { email: "imobiliaria@bateu.online", brand: "Casa Nova", primary: "#059669", secondary: "#8b5cf6", mpesa: "84 777 8888", emola: "86 999 0000" },
    { email: "travel@bateu.online", brand: "Viaja MZ", primary: "#f97316", secondary: "#14b8a6", mpesa: "84 222 3333", emola: "86 444 5555" },
    { email: "moda@bateu.online", brand: "Estilo Africano", primary: "#ec4899", secondary: "#a855f7", mpesa: "84 666 7777", emola: "86 888 9999" },
  ];
  for (const wl of wlConfigs) {
    const uid = bizIds[wl.email];
    if (!uid) continue;
    const { data: exists } = await supabase.from("white_label_configs").select("id").eq("business_user_id", uid).maybeSingle();
    if (!exists) {
      await supabase.from("white_label_configs").insert({
        business_user_id: uid, brand_name: wl.brand,
        primary_color: wl.primary, secondary_color: wl.secondary,
        mpesa_number: wl.mpesa, emola_number: wl.emola,
      });
      results.push(`🏷️ White Label: ${wl.brand}`);
    }
  }

  // ── 5. VERIFY some businesses ──
  for (const email of ["tech@bateu.online", "auto@bateu.online"]) {
    const uid = bizIds[email];
    if (uid) await supabase.from("profiles").update({ is_verified: true }).eq("user_id", uid);
  }

  // ── 6. RAFFLES (diverse categories per business) ──
  const inDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString();
  const raffleData = [
    // TechMoz
    { biz: "tech@bateu.online", title: "iPhone 16 Pro Max", prize_title: "iPhone 16 Pro Max 256GB", prize_value: 85000, ticket_price: 500, total_tickets: 200, sold_tickets: 67, category: "electronica", province: "maputo_cidade", city: "Maputo", description: "Concorra a um iPhone 16 Pro Max! Entrega na cidade de Maputo.", image_url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800", end_days: 14, raffle_type: "paid" },
    { biz: "tech@bateu.online", title: "MacBook Air M3", prize_title: "MacBook Air M3 15\" 512GB", prize_value: 120000, ticket_price: 750, total_tickets: 150, sold_tickets: 34, category: "electronica", province: "sofala", city: "Beira", description: "MacBook Air com chip M3, o portátil mais fino do mundo.", image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", end_days: 21, raffle_type: "paid" },
    { biz: "tech@bateu.online", title: "Samsung Galaxy S24 Ultra GRÁTIS", prize_title: "Galaxy S24 Ultra 512GB", prize_value: 75000, ticket_price: 0, total_tickets: 300, sold_tickets: 0, category: "electronica", province: "maputo_cidade", city: "Maputo", description: "Sorteio 100% GRATUITO! Participe já.", image_url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800", end_days: 7, raffle_type: "free" },
    // AutoPremium
    { biz: "auto@bateu.online", title: "Toyota Hilux 2024", prize_title: "Toyota Hilux SR5 2024", prize_value: 4500000, ticket_price: 2000, total_tickets: 500, sold_tickets: 289, category: "veiculos", province: "maputo_cidade", city: "Maputo", description: "O prémio dos sonhos! Uma Toyota Hilux novinha.", image_url: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800", end_days: 30, raffle_type: "paid" },
    { biz: "auto@bateu.online", title: "Honda CB300R 2024", prize_title: "Honda CB300R 2024", prize_value: 650000, ticket_price: 1000, total_tickets: 300, sold_tickets: 112, category: "veiculos", province: "nampula", city: "Nampula", description: "Mota Honda CB300R novinha!", image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800", end_days: 15, raffle_type: "paid" },
    // Casa Nova
    { biz: "imobiliaria@bateu.online", title: "Apartamento T3 Sommerschield", prize_title: "Apartamento T3 Sommerschield", prize_value: 15000000, ticket_price: 5000, total_tickets: 1000, sold_tickets: 456, category: "imoveis", province: "maputo_cidade", city: "Maputo", description: "Apartamento de luxo T3 no bairro Sommerschield.", image_url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800", end_days: 60, raffle_type: "paid" },
    { biz: "imobiliaria@bateu.online", title: "Terreno em Bilene", prize_title: "Terreno 20x30 em Bilene", prize_value: 2500000, ticket_price: 1500, total_tickets: 400, sold_tickets: 78, category: "imoveis", province: "gaza", city: "Bilene", description: "Terreno com vista para a lagoa.", image_url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800", end_days: 45, raffle_type: "paid" },
    // Viaja MZ
    { biz: "travel@bateu.online", title: "Viagem Zanzibar para 2", prize_title: "Viagem 7 noites Zanzibar", prize_value: 180000, ticket_price: 500, total_tickets: 200, sold_tickets: 167, category: "viagens", province: "maputo_cidade", city: "Maputo", description: "Pacote completo para 2 pessoas em Zanzibar!", image_url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800", end_days: 10, raffle_type: "paid" },
    { biz: "travel@bateu.online", title: "Weekend em Vilankulo", prize_title: "3 noites Hotel Vilankulo", prize_value: 45000, ticket_price: 0, total_tickets: 100, sold_tickets: 0, category: "viagens", province: "inhambane", city: "Vilankulo", description: "Ganhe um fim-de-semana em Vilankulo! Use seus Luck Points.", points_cost: 200, image_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800", end_days: 5, raffle_type: "points" },
    // Estilo Africano
    { biz: "moda@bateu.online", title: "Voucher Moda 25.000 MT", prize_title: "Voucher de Compras 25.000 MT", prize_value: 25000, ticket_price: 200, total_tickets: 80, sold_tickets: 52, category: "moda", province: "nampula", city: "Nampula", description: "Vale de compras na loja Estilo Africano.", image_url: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800", end_days: 8, raffle_type: "paid" },
    { biz: "moda@bateu.online", title: "Smart TV 65\" 4K", prize_title: "Samsung 65\" Crystal UHD", prize_value: 65000, ticket_price: 400, total_tickets: 120, sold_tickets: 45, category: "electronica", province: "maputo_cidade", city: "Maputo", description: "TV 4K gigante para a sua sala!", image_url: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800", end_days: 12, raffle_type: "paid" },
    { biz: "moda@bateu.online", title: "PlayStation 5 + 5 Jogos", prize_title: "PS5 Digital + 5 Jogos", prize_value: 45000, ticket_price: 250, total_tickets: 100, sold_tickets: 88, category: "electronica", province: "gaza", city: "Xai-Xai", description: "PS5 com 5 jogos à escolha do vencedor!", image_url: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800", end_days: 3, raffle_type: "paid" },
  ];

  const raffleIds: string[] = [];
  for (const r of raffleData) {
    const uid = bizIds[r.biz];
    if (!uid) continue;
    // Check if already exists
    const { data: existing } = await supabase.from("raffles").select("id").eq("title", r.title).eq("business_user_id", uid).maybeSingle();
    if (existing) { raffleIds.push(existing.id); continue; }
    const { data: ins } = await supabase.from("raffles").insert({
      business_user_id: uid, title: r.title, prize_title: r.prize_title,
      prize_value: r.prize_value, ticket_price: r.ticket_price,
      total_tickets: r.total_tickets, sold_tickets: r.sold_tickets,
      category: r.category, province: r.province, city: r.city,
      description: r.description, image_url: r.image_url,
      end_date: inDays(r.end_days), status: "active",
      raffle_type: r.raffle_type, points_cost: (r as any).points_cost || 0,
    }).select("id").single();
    if (ins) { raffleIds.push(ins.id); results.push(`🎟️ Sorteio: ${r.title}`); }
  }

  // ── 7. PARTICIPANTS (simulate purchases) ──
  const userEmails = Object.keys(userIds);
  let ticketNum = 1000;
  for (let i = 0; i < Math.min(raffleIds.length, 8); i++) {
    const numParticipants = 2 + Math.floor(Math.random() * 4);
    const shuffled = [...userEmails].sort(() => Math.random() - 0.5);
    for (let j = 0; j < numParticipants && j < shuffled.length; j++) {
      const uid = userIds[shuffled[j]];
      if (!uid) continue;
      ticketNum++;
      const paymentStatuses = ["confirmed", "confirmed", "confirmed", "pending", "pending_review"];
      const methods = ["mpesa", "mpesa", "emola", "mpesa", "emola"];
      await supabase.from("participants").insert({
        raffle_id: raffleIds[i], user_id: uid,
        ticket_number: ticketNum,
        payment_status: paymentStatuses[j % 5],
        payment_method: methods[j % 5],
      });
    }
  }
  results.push(`🎫 Participantes adicionados`);

  // ── 8. CONTESTS (diverse categories) ──
  const contestData = [
    { biz: "moda@bateu.online", title: "Melhor Look Capulana 2024", category: "moda", evaluation_type: "votes", description: "Mostre seu melhor look com capulana! O público vota no favorito.", prize_description: "Voucher 15.000 MT + Sessão fotográfica profissional", requires_photo: true, requires_video: false, hashtag: "#CapulanaMZ", image_url: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800", phases: [{ name: "Submissão", description: "Envie sua foto", durationDays: 14, type: "submission" }, { name: "Votação", description: "Público vota", durationDays: 7, type: "voting" }], contest_mode: "multi_phase", status: "active" },
    { biz: "travel@bateu.online", title: "Fotógrafo da Natureza MZ", category: "fotografia", evaluation_type: "votes", description: "Capture a beleza natural de Moçambique numa foto.", prize_description: "Viagem para Bazaruto + Câmara profissional", requires_photo: true, requires_video: false, hashtag: "#NaturezaMZ", image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800", phases: [{ name: "Submissão", description: "Envie fotos", durationDays: 21, type: "submission" }, { name: "Semifinal", description: "Top 20 avançam", durationDays: 7, type: "elimination" }, { name: "Final", description: "Votação final", durationDays: 5, type: "final" }], contest_mode: "multi_phase", status: "active" },
    { biz: "tech@bateu.online", title: "Melhor Vídeo Tech Review", category: "video", evaluation_type: "views", description: "Faça um review criativo de qualquer produto tech. Mais visualizações ganha!", prize_description: "iPhone 16 + Ring Light + Microfone", requires_photo: false, requires_video: true, hashtag: "#TechReviewMZ", image_url: "https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=800", phases: [{ name: "Submissão", description: "Envie seu vídeo", durationDays: 14, type: "submission" }, { name: "Votação por Views", description: "Views contam", durationDays: 10, type: "voting" }], contest_mode: "multi_phase", status: "voting" },
    { biz: "auto@bateu.online", title: "Meu Carro, Minha História", category: "video", evaluation_type: "votes", description: "Conte a história do seu carro em vídeo de até 60 segundos.", prize_description: "Kit completo de acessórios automóveis (50.000 MT)", requires_photo: true, requires_video: true, hashtag: "#MeuCarroMZ", image_url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800", phases: [{ name: "Inscrições", description: "Envie sua história", durationDays: 10, type: "submission" }, { name: "Votação", description: "Comunidade vota", durationDays: 7, type: "voting" }], contest_mode: "multi_phase", status: "active" },
    { biz: "imobiliaria@bateu.online", title: "Melhor Decoração de Interiores", category: "fotografia", evaluation_type: "votes", description: "Mostre como decorou a sua casa ou apartamento!", prize_description: "Voucher decoração 30.000 MT", requires_photo: true, requires_video: false, hashtag: "#DecorMZ", image_url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800", phases: [{ name: "Submissão", description: "Envie fotos", durationDays: 14, type: "submission" }], contest_mode: "single", status: "active" },
    { biz: "moda@bateu.online", title: "Chef do Bairro", category: "culinaria", evaluation_type: "votes", description: "Prepare o melhor prato moçambicano e partilhe a receita!", prize_description: "Kit de cozinha profissional + Curso culinário", requires_photo: true, requires_video: true, hashtag: "#ChefDoBairro", sponsor_name: "Supermercado Shoprite", image_url: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800", phases: [{ name: "Submissão", description: "Envie foto + vídeo", durationDays: 14, type: "submission" }, { name: "Semifinal", description: "Top 10", durationDays: 5, type: "elimination" }, { name: "Final", description: "Grande final", durationDays: 3, type: "final" }], contest_mode: "multi_phase", status: "active" },
  ];

  const contestIds: string[] = [];
  for (const c of contestData) {
    const uid = bizIds[c.biz];
    if (!uid) continue;
    const { data: exists } = await supabase.from("contests").select("id").eq("title", c.title).maybeSingle();
    if (exists) { contestIds.push(exists.id); continue; }
    const startDate = new Date(); startDate.setDate(startDate.getDate() - 3);
    const endDate = new Date(); endDate.setDate(endDate.getDate() + 25);
    const { data: ins } = await supabase.from("contests").insert({
      created_by: uid, title: c.title, category: c.category,
      evaluation_type: c.evaluation_type, description: c.description,
      prize_description: c.prize_description, requires_photo: c.requires_photo,
      requires_video: c.requires_video, hashtag: c.hashtag,
      image_url: c.image_url, phases: c.phases, contest_mode: c.contest_mode,
      status: c.status, start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      sponsor_name: (c as any).sponsor_name || null,
      submission_fields: [
        { key: "name", label: "Nome completo", type: "text", required: true },
        { key: "bio", label: "Sobre você", type: "textarea", required: false },
      ],
    }).select("id").single();
    if (ins) { contestIds.push(ins.id); results.push(`🏆 Concurso: ${c.title}`); }
  }

  // ── 9. CONTEST SUBMISSIONS ──
  const submissionNames = [
    { name: "João Macuácua", email: "joao@exemplo.mz" },
    { name: "Maria Nhantumbo", email: "maria@exemplo.mz" },
    { name: "Carlos Mondlane", email: "carlos@exemplo.mz" },
    { name: "Ana Sitoe", email: "ana@exemplo.mz" },
    { name: "Pedro Cossa", email: "pedro@exemplo.mz" },
    { name: "Fátima Tembe", email: "fatima@exemplo.mz" },
  ];
  const samplePhotos = [
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600",
  ];

  for (let ci = 0; ci < Math.min(contestIds.length, 5); ci++) {
    const numSubs = 3 + Math.floor(Math.random() * 3);
    for (let si = 0; si < numSubs && si < submissionNames.length; si++) {
      const sub = submissionNames[si];
      const uid = userIds[sub.email];
      if (!uid) continue;
      const { data: exists } = await supabase.from("contest_submissions")
        .select("id").eq("contest_id", contestIds[ci]).eq("user_id", uid).maybeSingle();
      if (exists) continue;
      await supabase.from("contest_submissions").insert({
        contest_id: contestIds[ci], user_id: uid,
        participant_name: sub.name,
        description: `A minha participação no concurso! #bateu`,
        photo_url: samplePhotos[si % samplePhotos.length],
        status: "approved",
        votes_count: Math.floor(Math.random() * 50),
        views_count: Math.floor(Math.random() * 200),
        extra_fields: { name: sub.name, bio: "Apaixonado por Moçambique 🇲🇿" },
      });
    }
  }
  results.push(`📸 Submissões de concursos adicionadas`);

  // ── 10. COMMUNITY MESSAGES ──
  const messages = [
    { email: "joao@exemplo.mz", content: "Acabei de ganhar no sorteio do iPhone! Obrigado Bateu! 🎉🇲🇿", type: "winners" },
    { email: "maria@exemplo.mz", content: "Dica: participem nos sorteios gratuitos, não custa nada e já ganhei uma vez! 💡", type: "tips" },
    { email: "carlos@exemplo.mz", content: "Alguém mais participou no concurso de fotografia? As fotos estão incríveis!", type: "general" },
    { email: "ana@exemplo.mz", content: "O Chef do Bairro está a bombar! Já votaram? 🍳🔥", type: "general" },
    { email: "pedro@exemplo.mz", content: "Primeira vez na plataforma e já estou viciado nos concursos! 😍", type: "general" },
    { email: "fatima@exemplo.mz", content: JSON.stringify({ question: "Qual concurso vocês mais gostaram?", options: [{ text: "Melhor Look Capulana", votes: 12 }, { text: "Chef do Bairro", votes: 8 }, { text: "Fotógrafo da Natureza", votes: 15 }] }), type: "poll" },
    { email: "ricardo@exemplo.mz", content: "Os Luck Points valem muito a pena! Já resgatei um desconto 🎯", type: "tips" },
    { email: "lucia@exemplo.mz", content: "Quem é de Tete? Vamos criar um bolão para o sorteio da Hilux! 🚗", type: "general" },
  ];

  for (const m of messages) {
    const uid = userIds[m.email];
    if (!uid) continue;
    await supabase.from("community_messages").insert({
      user_id: uid, content: m.content, message_type: m.type,
      likes_count: Math.floor(Math.random() * 15),
    });
  }
  results.push(`💬 Mensagens da comunidade adicionadas`);

  // ── 11. LUCK POINTS ──
  const pointActions = [
    { email: "joao@exemplo.mz", entries: [{ action: "purchase", points: 10, description: "Compra de bilhete - iPhone 16" }, { action: "referral", points: 50, description: "Amigo convidado registou-se" }, { action: "daily_login", points: 5, description: "Login diário" }] },
    { email: "maria@exemplo.mz", entries: [{ action: "purchase", points: 20, description: "Compra de 2 bilhetes" }, { action: "social_share", points: 15, description: "Partilhou sorteio nas redes" }] },
    { email: "carlos@exemplo.mz", entries: [{ action: "contest_participation", points: 25, description: "Participou num concurso" }, { action: "referral", points: 50, description: "Amigo registou-se" }, { action: "referral", points: 50, description: "Outro amigo registou-se" }] },
    { email: "pedro@exemplo.mz", entries: [{ action: "purchase", points: 30, description: "Compra de bilhetes" }, { action: "daily_login", points: 5, description: "Login diário" }] },
  ];

  for (const pa of pointActions) {
    const uid = userIds[pa.email];
    if (!uid) continue;
    for (const e of pa.entries) {
      await supabase.from("luck_points").insert({ user_id: uid, action: e.action, points: e.points, description: e.description });
    }
  }
  results.push(`⭐ Luck Points adicionados`);

  // ── 12. NOTIFICATIONS ──
  const notifs = [
    { email: "joao@exemplo.mz", title: "Bilhete confirmado!", message: "O seu pagamento para o sorteio iPhone 16 Pro Max foi confirmado.", type: "payment" },
    { email: "maria@exemplo.mz", title: "Novo concurso disponível", message: "O concurso 'Melhor Look Capulana 2024' está aberto para participação!", type: "contest" },
    { email: "carlos@exemplo.mz", title: "Submissão aprovada", message: "A sua submissão no concurso de fotografia foi aprovada! Boa sorte!", type: "approval" },
    { email: "pedro@exemplo.mz", title: "Sorteio a terminar", message: "O sorteio PS5 + 5 Jogos termina em 3 dias. Compre já o seu bilhete!", type: "reminder" },
  ];
  for (const n of notifs) {
    const uid = userIds[n.email];
    if (!uid) continue;
    await supabase.from("notifications").insert({ user_id: uid, title: n.title, message: n.message, type: n.type });
  }
  results.push(`🔔 Notificações adicionadas`);

  // ── 13. REFERRALS ──
  const joaoId = userIds["joao@exemplo.mz"];
  const mariaId = userIds["maria@exemplo.mz"];
  const carlosId = userIds["carlos@exemplo.mz"];
  if (joaoId && mariaId) {
    const { data: ref } = await supabase.from("profiles").select("referral_code").eq("user_id", joaoId).single();
    if (ref?.referral_code) {
      const { data: exists } = await supabase.from("referrals").select("id").eq("referrer_id", joaoId).eq("referred_id", mariaId).maybeSingle();
      if (!exists) {
        await supabase.from("referrals").insert({ referrer_id: joaoId, referred_id: mariaId, referral_code: ref.referral_code, points_awarded: 50 });
      }
    }
  }
  if (carlosId && joaoId) {
    const { data: ref } = await supabase.from("profiles").select("referral_code").eq("user_id", carlosId).single();
    if (ref?.referral_code) {
      const { data: exists } = await supabase.from("referrals").select("id").eq("referrer_id", carlosId).eq("referred_id", joaoId).maybeSingle();
      if (!exists) {
        await supabase.from("referrals").insert({ referrer_id: carlosId, referred_id: joaoId, referral_code: ref.referral_code, points_awarded: 50 });
      }
    }
  }
  results.push(`🤝 Referrals adicionados`);

  return new Response(
    JSON.stringify({ success: true, results, summary: { admin: adminId ? 1 : 0, businesses: Object.keys(bizIds).length, users: Object.keys(userIds).length, raffles: raffleIds.length, contests: contestIds.length } }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
