import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Create a demo business user
  const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
  let businessUserId: string;

  const demoUser = existingUser?.users?.find(u => u.email === "demo@sortex.co.mz");
  if (demoUser) {
    businessUserId = demoUser.id;
  } else {
    const { data: newUser, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: "demo@sortex.co.mz",
      password: "demo123456",
      email_confirm: true,
      user_metadata: { display_name: "SORTEX Demo", role: "business" },
    });
    if (userErr || !newUser.user) {
      return new Response(JSON.stringify({ error: userErr?.message || "Failed to create user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    businessUserId = newUser.user.id;
  }

  // Ensure white label config exists
  const { data: wlExists } = await supabaseAdmin
    .from("white_label_configs")
    .select("id")
    .eq("business_user_id", businessUserId)
    .maybeSingle();

  if (!wlExists) {
    await supabaseAdmin.from("white_label_configs").insert({
      business_user_id: businessUserId,
      brand_name: "SORTEX Demo",
      primary_color: "#10b981",
      secondary_color: "#eab308",
      mpesa_number: "84 123 4567",
      emola_number: "86 987 6543",
    });
  }

  // Insert raffles
  const raffles = [
    { title: "iPhone 16 Pro Max", prize_title: "iPhone 16 Pro Max 256GB", prize_value: 85000, ticket_price: 500, total_tickets: 200, sold_tickets: 47, status: "active", raffle_type: "paid", category: "electronica", province: "maputo_cidade", city: "Maputo", description: "Concorra a um iPhone 16 Pro Max novinho em folha! Entrega em mãos na cidade de Maputo.", image_url: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800" },
    { title: "Toyota Hilux 2024", prize_title: "Toyota Hilux SR5 2024", prize_value: 4500000, ticket_price: 2000, total_tickets: 500, sold_tickets: 213, status: "active", raffle_type: "paid", category: "veiculos", province: "maputo_cidade", city: "Maputo", description: "O prémio dos sonhos! Uma Toyota Hilux SR5 novinha.", image_url: "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800" },
    { title: "PlayStation 5 + Jogos", prize_title: "PS5 Digital + 5 Jogos", prize_value: 45000, ticket_price: 250, total_tickets: 100, sold_tickets: 78, status: "active", raffle_type: "paid", category: "electronica", province: "gaza", city: "Xai-Xai", description: "PS5 com 5 jogos a escolha do vencedor!", image_url: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800" },
    { title: "Apartamento T3 Sommerschield", prize_title: "Apartamento T3 em Sommerschield", prize_value: 15000000, ticket_price: 5000, total_tickets: 1000, sold_tickets: 342, status: "active", raffle_type: "paid", category: "imoveis", province: "maputo_cidade", city: "Maputo", description: "Apartamento de luxo T3 no bairro Sommerschield.", image_url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800" },
    { title: "MacBook Air M3", prize_title: "MacBook Air M3 15\" 512GB", prize_value: 120000, ticket_price: 750, total_tickets: 150, sold_tickets: 23, status: "active", raffle_type: "paid", category: "electronica", province: "sofala", city: "Beira", description: "MacBook Air com chip M3.", image_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800" },
    { title: "Mota Honda CB300R", prize_title: "Honda CB300R 2024", prize_value: 650000, ticket_price: 1000, total_tickets: 300, sold_tickets: 89, status: "active", raffle_type: "paid", category: "veiculos", province: "nampula", city: "Nampula", description: "Honda CB300R novinha!", image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800" },
    { title: "Viagem Zanzibar", prize_title: "Viagem para 2 a Zanzibar (7 noites)", prize_value: 180000, ticket_price: 500, total_tickets: 200, sold_tickets: 156, status: "active", raffle_type: "paid", category: "viagens", province: "maputo_cidade", city: "Maputo", description: "Pacote completo para 2 pessoas!", image_url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800" },
    { title: "Samsung Galaxy S24 Ultra", prize_title: "Galaxy S24 Ultra 512GB", prize_value: 75000, ticket_price: 0, total_tickets: 150, sold_tickets: 0, status: "active", raffle_type: "free", category: "electronica", province: "zambezia", city: "Quelimane", description: "Sorteio GRATUITO!", image_url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800" },
    { title: "Smart TV 65\" 4K", prize_title: "Samsung Smart TV 65\" Crystal UHD", prize_value: 65000, ticket_price: 400, total_tickets: 120, sold_tickets: 45, status: "active", raffle_type: "paid", category: "electronica", province: "maputo_cidade", city: "Maputo", description: "TV gigante para a sua sala!", image_url: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800" },
    { title: "Cesta Premium Natal", prize_title: "Cesta de Natal Premium", prize_value: 15000, ticket_price: 0, total_tickets: 50, sold_tickets: 12, status: "active", raffle_type: "points", category: "outros", province: "inhambane", city: "Inhambane", description: "Use seus Luck Points!", points_cost: 100 },
  ];

  const endDates = [7, 30, 5, 60, 14, 21, 10, 3, 12, 15];

  for (let i = 0; i < raffles.length; i++) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + endDates[i]);

    await supabaseAdmin.from("raffles").insert({
      ...raffles[i],
      business_user_id: businessUserId,
      end_date: endDate.toISOString(),
    });
  }

  return new Response(
    JSON.stringify({ success: true, message: `Seeded ${raffles.length} raffles for user ${businessUserId}` }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
