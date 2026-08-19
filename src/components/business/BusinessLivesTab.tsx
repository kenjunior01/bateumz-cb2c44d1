import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, PlayCircle, Calendar, Trophy, Video, ArrowRight, Clock, Eye } from "lucide-react";

const sb: any = supabase;

interface LiveRow {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  scheduled_at: string;
  ends_at: string | null;
  status: string;
  slug: string;
  source_type: string;
  external_platform: string | null;
}

interface LinkRow {
  id: string;
  scheduled_live_id: string;
  platform: string;
  url: string;
  label: string | null;
  is_primary: boolean;
}

interface Props {
  businessUserId: string;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function BusinessLivesTab({ businessUserId }: Props) {
  const [lives, setLives] = useState<LiveRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [winners, setWinners] = useState<Record<string, { name: string; prize: string | null }[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: liveRows } = await sb
        .from("scheduled_lives")
        .select("*")
        .eq("business_user_id", businessUserId)
        .in("status", ["scheduled", "live", "ended"])
        .order("scheduled_at", { ascending: false })
        .limit(60);

      const list = (liveRows as LiveRow[]) || [];
      if (cancelled) return;
      setLives(list);

      if (list.length > 0) {
        const { data: linkRows } = await sb
          .from("scheduled_live_links")
          .select("*")
          .in("scheduled_live_id", list.map((l) => l.id));
        if (!cancelled) setLinks((linkRows as LinkRow[]) || []);
      }

      const { data: sessions } = await sb
        .from("game_sessions")
        .select("live_code, player_name, prize, is_winner, created_at")
        .eq("business_user_id", businessUserId)
        .eq("is_winner", true)
        .order("created_at", { ascending: false })
        .limit(200);

      const map: Record<string, { name: string; prize: string | null }[]> = {};
      ((sessions as any[]) || []).forEach((s) => {
        if (!s.live_code) return;
        (map[s.live_code] ||= []).push({ name: s.player_name || "Player", prize: s.prize });
      });
      if (!cancelled) setWinners(map);
      if (!cancelled) setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [businessUserId]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (lives.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <Radio className="h-10 w-10 mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.25)" }} />
          </motion.div>
          <p className="text-sm font-medium" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>Nenhuma live publicada ainda.</p>
          <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }}>Cria a tua primeira live agendada no dashboard.</p>
        </CardContent>
      </Card>
    );
  }

  const now = Date.now();
  const liveNow = lives.filter((l) => l.status === "live");
  const upcoming = lives
    .filter((l) => l.status === "scheduled" && new Date(l.scheduled_at).getTime() >= now - 3600_000)
    .sort((a, b) => +new Date(a.scheduled_at) - +new Date(b.scheduled_at));
  const past = lives.filter((l) => !liveNow.includes(l) && !upcoming.includes(l));

  const renderCard = (l: LiveRow, i: number) => {
    const replays = links.filter((k) => k.scheduled_live_id === l.id);
    const w = winners[l.slug] || [];
    const isLive = l.status === "live";
    const isEnded = l.status === "ended";
    return (
      <motion.div
        key={l.id}
        initial={{ opacity: 0, y: 15, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: i * 0.04, type: "spring", stiffness: 280, damping: 25 }}
      >
        <Card className="biz-live-card overflow-hidden">
          {l.cover_url && (
            <div className="biz-live-cover">
              <img src={l.cover_url} alt={l.title} className="biz-live-cover-img" loading="lazy" />
              <div className="biz-live-cover-overlay" />
              {isLive && (
                <div className="biz-live-indicator">
                  <span className="biz-live-dot" />
                  LIVE
                </div>
              )}
            </div>
          )}
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-bold text-sm leading-tight line-clamp-2">{l.title}</h4>
              <Badge
                className="biz-live-badge"
                style={{
                  backgroundColor: isLive ? "rgba(239,68,68,0.15)" : isEnded ? "rgba(255,255,255,0.05)" : "rgba(52,211,153,0.15)",
                  color: isLive ? "#f87171" : isEnded ? "hsl(var(--muted-foreground))" : "#34d399",
                  border: `1px solid ${isLive ? "rgba(239,68,68,0.2)" : isEnded ? "rgba(255,255,255,0.06)" : "rgba(52,211,153,0.2)"}`,
                }}
              >
                {isLive ? "Em direto" : l.status === "scheduled" ? "Agendada" : "Replay"}
              </Badge>
            </div>

            <div className="biz-live-meta">
              <Calendar className="h-3 w-3" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }} />
              <span>{fmt(l.scheduled_at)}</span>
            </div>

            {l.description && (
              <p className="text-xs line-clamp-2" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>{l.description}</p>
            )}

            {replays.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {replays.map((r) => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer">
                    <Badge className="biz-live-replay-badge">
                      <Video className="h-3 w-3" />
                      {r.label || r.platform}
                    </Badge>
                  </a>
                ))}
              </div>
            )}

            {w.length > 0 && (
              <motion.div
                className="biz-live-winners"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <p className="biz-live-winners-title">
                  <Trophy className="h-3 w-3" style={{ color: "#fbbf24" }} /> Vencedores
                </p>
                {w.slice(0, 3).map((x, wi) => (
                  <p key={wi} className="biz-live-winner-name">
                    <span className="biz-live-winner-pos">{wi + 1}.</span>
                    {x.name}
                    {x.prize && <span className="biz-live-winner-prize"> — {x.prize}</span>}
                  </p>
                ))}
              </motion.div>
            )}

            <Button asChild size="sm" className="biz-live-cta gap-1.5 w-full">
              <Link to={`/live-evento/${l.slug}`}>
                <PlayCircle className="h-3.5 w-3.5" />
                {isEnded ? "Ver gravação" : "Abrir página da live"}
                <ArrowRight className="h-3 w-3 ml-auto" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const Section = ({ title, items, icon: Icon }: { title: string; items: LiveRow[]; icon: React.ElementType }) =>
    items.length === 0 ? null : (
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          <h3 className="font-bold text-base">{title}</h3>
          <Badge variant="secondary" className="text-[10px] font-bold">{items.length}</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => renderCard(item, i))}
        </div>
      </div>
    );

  return (
    <div className="space-y-10">
      <Section title="Em direto" items={liveNow} icon={Radio} />
      <Section title="Próximas" items={upcoming} icon={Calendar} />
      <Section title="Gravações e lives passadas" items={past} icon={Eye} />
    </div>
  );
}