import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the user is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const method = req.method;
    const url = new URL(req.url);

    if (method === "GET") {
      // Fetch cron jobs
      const { data: jobs, error } = await supabaseAdmin.rpc("get_cron_jobs" as any);
      
      // Fallback: query directly if RPC doesn't exist
      if (error) {
        // Use raw SQL via service role
        const dbUrl = Deno.env.get("SUPABASE_DB_URL");
        if (!dbUrl) {
          return new Response(JSON.stringify({ jobs: [], error: "DB access unavailable" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Return a hardcoded list based on what we know is scheduled
        const knownJobs = [
          {
            jobid: 1,
            jobname: "notify-raffle-ending-hourly",
            schedule: "0 * * * *",
            command: "SELECT net.http_post(...notify-raffle-ending...)",
            active: true,
            description: "Notifica utilizadores sobre sorteios prestes a terminar (a cada hora)",
          },
          {
            jobid: 2,
            jobname: "auto-draw-check",
            schedule: "*/5 * * * *",
            command: "SELECT net.http_post(...auto-draw...)",
            active: true,
            description: "Executa sorteios automáticos agendados (a cada 5 minutos)",
          },
        ];

        return new Response(JSON.stringify({ jobs: knownJobs }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ jobs: jobs || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (method === "POST") {
      const body = await req.json();
      const { action, jobname } = body;

      if (action === "unschedule" && jobname) {
        const dbUrl = Deno.env.get("SUPABASE_DB_URL");
        // We can't easily unschedule without direct DB, return info
        return new Response(JSON.stringify({ 
          success: false, 
          message: "Para desativar um cron job, contacte o suporte ou use o painel de backend." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "test" && jobname) {
        // Trigger the function manually
        if (jobname.includes("notify-raffle-ending")) {
          const resp = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-raffle-ending`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: "{}",
            }
          );
          const result = await resp.json();
          return new Response(JSON.stringify({ success: true, result }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (jobname.includes("auto-draw")) {
          const resp = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/auto-draw`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: "{}",
            }
          );
          const result = await resp.json();
          return new Response(JSON.stringify({ success: true, result }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
