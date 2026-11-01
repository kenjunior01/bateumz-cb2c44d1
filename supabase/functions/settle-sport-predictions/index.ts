// ═══════════════════════════════════════════════════════════════════════
// REA DESPORTO v24 — Liquidação parimutuel de palpites (SERVER-SIDE)
//
// Honestidade total (padrão REA v23):
//  • Resultados vêm da fonte real (TheSportsDB) — nunca inventados;
//  • Liquidação exclusivamente aqui (service_role) — o cliente não pode
//    alterar palpite, status nem payout (RLS sem UPDATE);
//  • Pool comunitário (tote): prémio = 95% do pool dividido entre os
//    acertadores proporcionalmente ao valor apostado;
//  • Partida adiada/sem resultado após 7 dias = reembolso integral.
// Cron recomendado: a cada 30 min (AdminCronJobs).
// ═══════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SPORTS_API_BASE = "https://www.thesportsdb.com/api/v1/json";
const SETTLE_GRACE_MINUTES = 120; // espera pós-jogo antes de liquidar
const VOID_AFTER_DAYS = 7;        // sem resultado → reembolso
const PLATFORM_FEE = 0.05;        // 5% do pool (idêntico aos duelos P2P)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) return true;

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error } = await anon.auth.getUser(token);
  if (error || !user) return false;
  const admin = createClient(url, serviceKey!);
  const { data: ok } = await admin.rpc("is_superadmin", { _user_id: user.id });
  return ok === true;
}

interface TdbEvent {
  idEvent: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string | null;
  strPostponed: string | null;
}

async function fetchRound(leagueId: string, season: string, round: number): Promise<Map<string, TdbEvent>> {
  const key = Deno.env.get("SPORTS_API_KEY") ?? "123";
  const url = `${SPORTS_API_BASE}/${key}/eventsround.php?id=${leagueId}&r=${round}&s=${season}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`TheSportsDB HTTP ${res.status}`);
  const body = await res.json();
  const map = new Map<string, TdbEvent>();
  for (const ev of (body?.events ?? []) as TdbEvent[]) map.set(String(ev.idEvent), ev);
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await isAuthorized(req))) return json({ error: "unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const dryRun = new URL(req.url).searchParams.get("dry_run") === "true";

  // 1) Grupos (liga/temporada/jornada) com palpites maduros para apurar
  const cutoff = new Date(Date.now() - SETTLE_GRACE_MINUTES * 60_000).toISOString();
  const { data: groups, error: groupsErr } = await supabase
    .from("sport_predictions")
    .select("league_id, league_name, season, round, kickoff_at")
    .eq("status", "open")
    .lt("kickoff_at", cutoff);
  if (groupsErr) return json({ error: groupsErr.message }, 500);

  const seen = new Set<string>();
  const summary: Array<Record<string, unknown>> = [];

  for (const g of groups ?? []) {
    const gk = `${g.league_id}|${g.season}|${g.round}`;
    if (seen.has(gk)) continue;
    seen.add(gk);

    // 2) Resultados reais da fonte
    let results: Map<string, TdbEvent>;
    try {
      results = await fetchRound(g.league_id, g.season, g.round);
    } catch (e) {
      summary.push({ group: gk, error: String(e) });
      continue;
    }
    await new Promise((r) => setTimeout(r, 1600)); // respeita rate-limit da fonte

    // 3) Palpites abertos deste grupo
    const { data: preds } = await supabase
      .from("sport_predictions")
      .select("id, user_id, event_id, pick, stake")
      .eq("league_id", g.league_id)
      .eq("season", g.season)
      .eq("round", g.round)
      .eq("status", "open");
    if (!preds?.length) continue;

    // por evento
    const byEvent = new Map<string, typeof preds>();
    for (const p of preds) {
      const list = byEvent.get(p.event_id) ?? [];
      list.push(p);
      byEvent.set(p.event_id, list);
    }

    for (const [eventId, list] of byEvent) {
      const ev = results.get(eventId);
      const kickoff = new Date(g.kickoff_at as string);

      let outcome: "home" | "draw" | "away" | "void" | null = null;
      if (ev) {
        if ((ev.strPostponed ?? "no") === "yes") outcome = "void";
        else if (ev.intHomeScore != null && ev.intAwayScore != null) {
          const h = parseInt(ev.intHomeScore, 10);
          const a = parseInt(ev.intAwayScore, 10);
          outcome = h > a ? "home" : h < a ? "away" : "draw";
        }
      }
      if (!outcome && Date.now() - kickoff.getTime() > VOID_AFTER_DAYS * 86_400_000) {
        outcome = "void"; // sem resultado após 7 dias → reembolso
      }
      if (!outcome) continue; // ainda à espera de resultado real

      if (dryRun) {
        summary.push({ event: eventId, outcome, picks: list.length });
        continue;
      }

      const pool = list.reduce((s, p) => s + Number(p.stake), 0);
      const winners = outcome === "void" ? list : list.filter((p) => p.pick === outcome);
      const winnersPool = winners.reduce((s, p) => s + Number(p.stake), 0);
      const distributable = outcome === "void" ? pool : pool * (1 - PLATFORM_FEE);

      for (const p of list) {
        const isWinner = winners.some((w) => w.id === p.id);
        const payout = isWinner
          ? Math.floor((Number(p.stake) * distributable) / Math.max(winnersPool, 1))
          : 0;
        const { error: upErr } = await supabase
          .from("sport_predictions")
          .update({
            status: isWinner ? (outcome === "void" ? "void" : "won") : "lost",
            payout,
            pool_total: pool,
            pool_winners: winners.length,
            settled_result: outcome,
            settled_at: new Date().toISOString(),
          })
          .eq("id", p.id)
          .eq("status", "open");
        if (upErr) continue;

        if (payout > 0) {
          // Crédito na carteira de jogo (a mesma dos duelos P2P)
          const { data: wallet } = await supabase
            .from("user_wallets")
            .select("id, balance, total_won")
            .eq("user_id", p.user_id)
            .maybeSingle();
          const credit = Number(p.stake) + payout; // devolve a aposta + prémio
          const newBalance = Number(wallet?.balance ?? 0) + credit;
          await supabase
            .from("user_wallets")
            .update({ balance: newBalance, total_won: Number(wallet?.total_won ?? 0) + payout })
            .eq("user_id", p.user_id);
          await supabase.from("wallet_transactions").insert({
            user_id: p.user_id,
            wallet_id: wallet?.id ?? null,
            type: outcome === "void" ? "palpite_refunded" : "palpite_won",
            amount: credit,
            balance_after: newBalance,
            description:
              outcome === "void"
                ? `Palpite reembolsado — partida adiada (${p.event_id})`
                : `Palpite ganho — pool dividido (${p.event_id})`,
            reference_id: p.id,
          });
        }
      }
      summary.push({
        event: eventId,
        outcome,
        pool,
        winners: winners.length,
        paid: distributable,
      });
    }
  }

  return json({ ok: true, settled: summary.length, summary });
});
