import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Share2, Copy, Check, MessageCircle, Facebook, Instagram, Send, Twitter, Music2, Sparkles, Loader2, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  ensureAmbassador, fetchRanking, buildAmbassadorUrl, buildShareLink,
  type AmbassadorRanking, type ShareChannel,
} from "@/lib/ambassador";
import { toast } from "sonner";

interface Props {
  businessUserId: string;
  businessName: string;
  /** When provided, shows a per-live ranking tab. */
  liveCode?: string;
  /** Compact mode (used inside Live Hub side panel). */
  compact?: boolean;
}

/**
 * Embedded panel: lets a logged-in user become ambassador, share the link,
 * and shows the live + all-time leaderboard for the business.
 */
const AmbassadorPanel = ({ businessUserId, businessName, liveCode, compact }: Props) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<"live" | "all">(liveCode ? "live" : "all");
  const [refCode, setRefCode] = useState<string>("");
  const [loadingMine, setLoadingMine] = useState(false);
  const [ranking, setRanking] = useState<AmbassadorRanking[]>([]);
  const [loadingRank, setLoadingRank] = useState(true);
  const [copied, setCopied] = useState(false);

  const myUrl = useMemo(
    () => (refCode ? buildAmbassadorUrl(businessUserId, refCode) : ""),
    [businessUserId, refCode],
  );
  const shareMessage = `Entra comigo na live de ${businessName} no Bateu! 🎁`;

  const loadRanking = async () => {
    setLoadingRank(true);
    try {
      const r = await fetchRanking(businessUserId, tab === "live" ? liveCode : undefined);
      setRanking(r);
    } finally { setLoadingRank(false); }
  };

  useEffect(() => { loadRanking(); /* eslint-disable-next-line */ }, [tab, businessUserId, liveCode]);

  const becomeAmbassador = async () => {
    if (!user) return;
    setLoadingMine(true);
    try {
      const a = await ensureAmbassador(businessUserId, user.id, user.email?.split("@")[0] || null as any);
      setRefCode(a.ref_code);
      toast.success("És agora embaixador desta empresa! Partilha o teu link.");
    } catch (e: any) {
      toast.error("Não foi possível activar embaixador", { description: e.message });
    } finally { setLoadingMine(false); }
  };

  // Auto-load existing code on mount.
  useEffect(() => {
    const run = async () => {
      if (!user) return;
      const a = ranking.find((r) => r.user_id === user.id);
      if (a) setRefCode(a.ref_code);
    };
    run();
  }, [user, ranking]);

  const myRank = useMemo(() => {
    if (!user) return null;
    const idx = ranking.findIndex((r) => r.user_id === user.id);
    return idx >= 0 ? { position: idx + 1, ...ranking[idx] } : null;
  }, [ranking, user]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(myUrl);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    toast.success("Link copiado!");
  };

  const openShare = (channel: ShareChannel) => {
    if (!myUrl) return;
    if (channel === "instagram" || channel === "tiktok") {
      copyLink();
      toast.info(`Cola o link na tua publicação do ${channel === "instagram" ? "Instagram" : "TikTok"}.`);
      return;
    }
    if (channel === "copy") return copyLink();
    window.open(buildShareLink(channel, myUrl, shareMessage), "_blank", "noopener,noreferrer");
  };

  const channels: { id: ShareChannel; label: string; icon: any; color: string }[] = [
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "bg-emerald-500" },
    { id: "facebook", label: "Facebook", icon: Facebook, color: "bg-blue-600" },
    { id: "instagram", label: "Instagram", icon: Instagram, color: "bg-pink-500" },
    { id: "tiktok", label: "TikTok", icon: Music2, color: "bg-black" },
    { id: "x", label: "X / Twitter", icon: Twitter, color: "bg-slate-800" },
    { id: "telegram", label: "Telegram", icon: Send, color: "bg-sky-500" },
  ];

  return (
    <div className={`rounded-3xl border border-border bg-card overflow-hidden ${compact ? "" : "shadow-lg"}`}>
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/10 to-amber-500/10 border-b border-border flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-emerald-600" />
        <h3 className="font-display text-sm font-bold flex-1">Embaixadores da Live</h3>
        {liveCode && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 font-bold uppercase">
            {liveCode}
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {!user ? (
          <Link to="/login" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full bg-emerald-500 text-white text-sm font-bold">
            <LogIn className="h-4 w-4" /> Entrar para ser embaixador
          </Link>
        ) : !refCode ? (
          <button onClick={becomeAmbassador} disabled={loadingMine}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 text-white text-sm font-bold disabled:opacity-50">
            {loadingMine ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Tornar-me embaixador {businessName ? `de ${businessName}` : ""}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="rounded-xl bg-muted/40 border border-border px-3 py-2">
              <p className="text-[9px] uppercase tracking-wide text-muted-foreground">O teu link de embaixador</p>
              <p className="text-[11px] font-mono break-all text-foreground/80">{myUrl}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {channels.map((c) => (
                <button key={c.id} onClick={() => openShare(c.id)}
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-white text-[11px] font-bold ${c.color} hover:opacity-90`}>
                  <c.icon className="h-3.5 w-3.5" /> {c.label}
                </button>
              ))}
            </div>
            <button onClick={copyLink}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-full bg-secondary text-foreground text-xs font-medium">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              Copiar link
            </button>
            {myRank && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <Trophy className="h-4 w-4 text-amber-500" />
                <p className="text-xs">
                  Estás em <strong>#{myRank.position}</strong> com <strong>{myRank.visits}</strong> convites
                </p>
              </div>
            )}
          </div>
        )}

        {liveCode && (
          <div className="flex gap-1 rounded-full bg-muted p-1 text-[11px] font-bold">
            <button onClick={() => setTab("live")}
              className={`flex-1 py-1.5 rounded-full ${tab === "live" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              Esta live
            </button>
            <button onClick={() => setTab("all")}
              className={`flex-1 py-1.5 rounded-full ${tab === "all" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              Acumulado
            </button>
          </div>
        )}

        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
            Top embaixadores · {tab === "live" ? "esta live" : "de sempre"}
          </p>
          {loadingRank ? (
            <p className="text-center text-xs text-muted-foreground py-4 inline-flex items-center gap-2 justify-center w-full">
              <Loader2 className="h-3 w-3 animate-spin" /> A carregar…
            </p>
          ) : ranking.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-4">Ainda sem convites contabilizados.</p>
          ) : (
            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {ranking.slice(0, 10).map((r, i) => (
                  <motion.li key={r.ambassador_id} layout initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${i === 0 ? "border-amber-500/50 bg-amber-500/10" : "border-border bg-background/40"}`}>
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${i === 0 ? "bg-amber-400 text-black" : i === 1 ? "bg-slate-300 text-black" : i === 2 ? "bg-amber-700 text-white" : "bg-muted"}`}>
                      {i + 1}
                    </span>
                    <p className="flex-1 text-xs font-medium truncate">{r.display_name || r.ref_code.toUpperCase()}</p>
                    <span className="text-sm font-extrabold text-emerald-600">{r.visits}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AmbassadorPanel;
