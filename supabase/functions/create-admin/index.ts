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

  const { email: adminEmail, password: adminPassword } = await req.json().catch(() => ({}));
  if (!adminEmail || !adminPassword) {
    return new Response(JSON.stringify({ error: "Email and password required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Create admin user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { display_name: "Administrador Bateu", role: "admin" },
    });

    if (authError) {
      // Check if user already exists
      if (authError.message?.includes("already been registered")) {
        // Get user by email
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users?.users?.find((u: any) => u.email === adminEmail);
        if (existingUser) {
          // Update password
          await supabase.auth.admin.updateUserById(existingUser.id, { password: adminPassword });
          // Ensure admin role exists
          const { data: existingRole } = await supabase
            .from("user_roles")
            .select("id")
            .eq("user_id", existingUser.id)
            .eq("role", "admin")
            .maybeSingle();

          if (!existingRole) {
            await supabase.from("user_roles").insert({ user_id: existingUser.id, role: "admin" });
          }
          return new Response(JSON.stringify({ success: true, message: "Admin updated", email: adminEmail }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      throw authError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Admin created",
      email: adminEmail,
      userId: authData.user?.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
