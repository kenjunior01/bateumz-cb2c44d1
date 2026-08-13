import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Clock, ExternalLink, Trophy, Share2, Users, Loader2, Sparkles, Youtube, Instagram, Music2, Facebook, Globe, Tv } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchScheduledLiveBySlug, fetchScheduledLiveRanking, buildScheduledAmbassadorUrl, consumePendingAttendance, confirmAttendance, clearPendingAttendance, type ScheduledLive, type ScheduledLiveRanking } from "@/lib/scheduledLives";
import { ensureAmbassador, buildShareLink, type ShareChannel } from "@/lib/ambassador";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MobileTopBar from "@/components/MobileTopBar";

const platformIcon = (p?: string | null) => {
  switch (p) {
    case "youtube": return Youtube;
    case "instagram": return Instagram;
    case "tiktok": return Music2;
    case "facebook": return Facebook;
    default: return Globe;
  }
};

const useCountdown = (targetISO?: string | null) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!targetISO) return null;
  const diff = new Date(targetISO).getTime() - now;
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, done: false };
};

const ScheduledLivePage = () => {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const refCode = params.get("ref") || "";
  const { user } = useAuth();
  const [live, setLive] = useState<ScheduledLive | null>(null);
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<ScheduledLiveRanking[]>([]);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [businessName, setBusinessName] = useState<string>("");
  const [myRefCode, setMyRefCode] = useState<string>("");
  const [activating, setActivating] = useState(false);

  const cd = useCountdown(live?.scheduled_at);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const sl = await fetchScheduledLiveBySlug(slug);
      if (!active) return;
      setLive(sl);
      if (sl) {
        const [{ data: bp }, { data: pr }] = await Promise.all([
          supabase.from("profiles").select("display_name, company_name").eq("user_id", sl.business_user_id).maybeSingle(),
          supabase.from("live_ambassador_prizes_public").select("*").eq("scheduled_live_id", sl.id).order("position"),
        ]);
        setBusinessName((bp as any)?.company_name || (bp as any)?.display_name || "Empresa");
        setPrizes(pr || []);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!live) return;
    const load = async () => setRanking(await fetchScheduledLiveRanking(live.id, { limit: 50 }));
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [live]);

  // Auto-load existing ambassador code for current user
  useEffect(() => {
    if (!user || !live) return;
    (async () => {
      const { data } = await supabase
        .from("live_ambassadors")
        .select("ref_code")
        .eq("business_user_id", live.business_user_id)
        .eq("user_id", user.id).maybeSingle();
      if (data) setMyRefCode((data as any).ref_code);
    })();
  }, [user, live]);

  const myUrl = useMemo(
    () => (live && myRefCode ? buildScheduledAmbassadorUrl(live.business_user_id, myRefCode, live.id) : ""),
    [live, myRefCode],
  );

  const becomeAmbassador = async () => {
    if (!user || !live) { toast.error("Inicia sessão para convidar amigos"); return; }
    setActivating(true);
    try {
      const a = await ensureAmbassador(live.business_user_id, user.id, user.email?.split("@")[0]);
      setMyRefCode(a.ref_code);
      toast.success("És agora embaixador desta live!");
    } catch (e: any) {
      toast.error("Não foi possível activar", { description: e.message });
    } finally { setActivating(false); }
  };

  const enterLive = async () => {
    if (!live) return;
    // Confirm attendance for inviter (anti-fraud: 1× per device per live)
    const visitId = consumePendingAttendance(live.id);
    if (visitId) {
      const r = await confirmAttendance(visitId);
      if (r.ok && r.counted) {
        toast.success("Entrada confirmada — o teu convite conta no ranking!");
      } else if (r.ok && r.already) {
        toast.info("Já tinhas sido contado nesta live.");
      } else if (r.reason === "too_early") {
        toast.warning("A live ainda não começou — entra mais perto da hora.");
      } else if (r.reason === "too_late") {
        toast.warning("Janela de confirmação encerrada.");
      } else if (r.reason === "self_referral") {
        toast.error("Não podes usar o teu próprio link de embaixador.");
      }
      clearPendingAttendance();
    }
    if (live.source_type === "external" && live.external_url) {
      window.open(live.external_url, "_blank", "noopener,noreferrer");
    } else if (live.source_type === "internal" && live.live_code) {
      window.location.href = `/lives?code=${encodeURIComponent(live.live_code)}`;
    }
  };

  const share = (channel: ShareChannel) => {
    if (!myUrl) return;
    const msg = `Entra comigo na live "${live?.title}" no Bateu! 🎁`;
    if (channel === "copy" || channel === "instagram" || channel === "tiktok") {
      navigator.clipboard.writeText(myUrl);
      toast.success(channel === "copy" ? "Link copiado!" : "Link copiado — cola na publicação.");
      return;
    }
    window.open(buildShareLink(channel, myUrl, msg), "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>;
  }
  if (!live) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <Tv className="h-12 w-12 text-muted-foreground mb-3" />
        <h1 className="font-display text-xl font-bold">Live não encontrada</h1>
        <Link to="/" className="mt-4 text-sm text-emerald-600">Voltar ao início</Link>
      </div>
    );
  }

  const PlatformIcon = platformIcon(live.external_platform);
  const isLive = live.status === "live" || (cd?.done && live.status !== "ended" && live.status !== "cancelled");
  const isEnded = live.status === "ended" || live.status === "cancelled";

  const channels: { id: ShareChannel; label: string }[] = [
    { id: "whatsapp", label: "WhatsApp" }, { id: "facebook", label: "Facebook" },
    { id: "instagram", label: "Instagram" }, { id: "tiktok", label: "TikTok" },
    { id: "x", label: "X" }, { id: "telegram", label: "Telegram" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5 pb-20">
      <MobileTopBar />
      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl overflow-hidden border border-border bg-card shadow-lg">
          {live.cover_url && (
            <div className="aspect-video bg-muted">
              <img src={live.cover_url} alt={live.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700">
                {isEnded ? "Terminada" : isLive ? "AO VIVO" : "Agendada"}
              </span>
              <PlatformIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">por {businessName}</span>
            </div>
            <h1 className="font-display text-2xl font-extrabold">{live.title}</h1>
            {live.description && <p className="text-sm text-muted-foreground">{live.description}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />
                {new Date(live.scheduled_at).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>

            {!isEnded && cd && !cd.done && (
              <div className="grid grid-cols-4 gap-2 pt-2">
                {[["Dias", cd.d], ["Horas", cd.h], ["Min", cd.m], ["Seg", cd.s]].map(([l, v]) => (
                  <div key={l as string} className="rounded-2xl bg-gradient-to-br from-emerald-500 to-amber-500 text-white text-center py-3">
                    <p className="text-2xl font-extrabold tabular-nums">{String(v).padStart(2, "0")}</p>
                    <p className="text-[9px] uppercase tracking-wide opacity-90">{l}</p>
                  </div>
                ))}
              </div>
            )}

            <button onClick={enterLive} disabled={isEnded}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-foreground text-background font-bold text-sm disabled:opacity-50">
              <ExternalLink className="h-4 w-4" />
              {isEnded ? "Esta live já terminou" : isLive ? "Entrar na live agora" : "Abrir página da live"}
            </button>
          </div>
        </motion.div>

        <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <h2 className="font-display text-sm font-bold flex-1">Convida amigos e ganha prémios</h2>
          </div>
          {!user ? (
            <Link to="/login" className="block w-full text-center px-4 py-2.5 rounded-full bg-emerald-500 text-white text-sm font-bold">
              Entrar para participar
            </Link>
          ) : !myRefCode ? (
            <button onClick={becomeAmbassador} disabled={activating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 text-white text-sm font-bold disabled:opacity-50">
              {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              Gerar o meu link único
            </button>
          ) : (
            <>
              <div className="rounded-xl bg-muted/40 border border-border px-3 py-2">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">O teu link</p>
                <p className="text-[11px] font-mono break-all">{myUrl}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {channels.map((c) => (
                  <button key={c.id} onClick={() => share(c.id)}
                    className="px-2 py-2 rounded-xl bg-secondary text-foreground text-[11px] font-bold">{c.label}</button>
                ))}
              </div>
              <button onClick={() => share("copy")} className="w-full px-4 py-2 rounded-full bg-foreground text-background text-xs font-bold">Copiar link</button>
            </>
          )}
        </div>

        {prizes.length > 0 && (
          <div className="rounded-3xl border border-border bg-card p-5 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <h2 className="font-display text-sm font-bold">Prémios para os top embaixadores</h2>
            </div>
            <ul className="space-y-2">
              {prizes.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-border">
                  <span className="w-7 h-7 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center text-xs">#{p.position}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{p.title}</p>
                    {p.description && <p className="text-[11px] text-muted-foreground">{p.description}</p>}
                  </div>
                  {p.winner_user_id && <span className="text-[10px] text-emerald-600 font-bold">Atribuído</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-emerald-600" />
            <h2 className="font-display text-sm font-bold flex-1">Ranking ao vivo</h2>
            <span className="text-[10px] text-muted-foreground">conta entradas confirmadas</span>
          </div>
          {ranking.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">Ainda sem convidados confirmados. Sê o primeiro!</p>
          ) : (
            <ul className="space-y-1.5">
              {ranking.map((r, i) => (
                <li key={r.ambassador_id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${i === 0 ? "border-amber-500/50 bg-amber-500/10" : "border-border"} ${user?.id === r.user_id ? "ring-2 ring-emerald-500" : ""}`}>
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${i === 0 ? "bg-amber-400 text-black" : i === 1 ? "bg-slate-300 text-black" : i === 2 ? "bg-amber-700 text-white" : "bg-muted"}`}>{i + 1}</span>
                  <p className="flex-1 text-xs font-medium truncate">{r.display_name || r.ref_code.toUpperCase()}</p>
                  <span className="text-sm font-extrabold text-emerald-600">{r.visits}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
};

export default ScheduledLivePage;
