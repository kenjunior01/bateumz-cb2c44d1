import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Require authentication and admin role
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: isSuperAdmin } = await supabase.rpc("is_superadmin", { user_id: user.id });
  if (!isSuperAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden: superadmin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { email: adminEmail, password: adminPassword } = await req.json().catch(() => ({}));
  if (!adminEmail || !adminPassword) {
    return new Response(JSON.stringify({ error: "Email and password required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { display_name: "Administrador Bateu", role: "admin" },
    });

    if (authError) {
      if (authError.message?.includes("already been registered")) {
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users?.users?.find((u: any) => u.email === adminEmail);
        if (existingUser) {
          await supabase.auth.admin.updateUserById(existingUser.id, { password: adminPassword });
          const { data: existingRole } = await supabase
            .from("user_roles")
            .select("id")
            .eq("user_id", existingUser.id)
            .eq("role", "admin")
            .maybeSingle();

          if (!existingRole) {
            await supabase.from("user_roles").insert({ user_id: existingUser.id, role: "admin" });
          }
          return new Response(JSON.stringify({ success: true, message: "Admin updated" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      throw authError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Admin created",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: "Operation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
