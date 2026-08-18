import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Gamepad2, Radio, Trophy, Ticket, Filter, PlayCircle, Clock,
} from "lucide-react";

const sb: any = supabase;

type Kind = "game" | "live" | "winner" | "raffle";

interface FeedItem {
  id: string;
  kind: Kind;
  title: string;
  subtitle?: string;
  badge?: string;
  at: string;
  href?: string;
  image?: string | null;
}

const kindMeta: Record<Kind, { icon: typeof Trophy; label: string; color: string; bg: string }> = {
  game: { icon: Gamepad2, label: "Jogo", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  live: { icon: Radio, label: "Live", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  winner: { icon: Trophy, label: "Vencedor", color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  raffle: { icon: Ticket, label: "Sorteio", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
};

interface Props {
  businessUserId: string;
  reloadKey?: number;
}

export default function BusinessTimeline({ businessUserId, reloadKey = 0 }: Props) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Kind | "all">("all");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [spins, mills, lives, sessions, raffles] = await Promise.all([
        sb.from("spin_wheel_games").select("id, name, created_at, is_active").eq("business_user_id", businessUserId).order("created_at", { ascending: false }).limit(20),
        sb.from("millionaire_games").select("id, name, created_at, is_active").eq("business_user_id", businessUserId).order("created_at", { ascending: false }).limit(20),
        sb.from("scheduled_lives").select("id, title, slug, status, scheduled_at, cover_url").eq("business_user_id", businessUserId).order("scheduled_at", { ascending: false }).limit(30),
        sb.from("game_sessions").select("id, player_name, game_name, prize, created_at").eq("business_user_id", businessUserId).eq("is_winner", true).order("created_at", { ascending: false }).limit(30),
        sb.from("raffles").select("id, title, slug, prize_title, status, created_at").eq("business_user_id", businessUserId).order("created_at", { ascending: false }).limit(20),
      ]);
      if (cancelled) return;

      const feed: FeedItem[] = [];
      ((spins.data as any[]) || []).forEach((g) =>
        feed.push({ id: `sp-${g.id}`, kind: "game", title: g.name || "Roda de Prémios", subtitle: "Roda a roda", badge: g.is_active ? "Ativo" : "Pausado", at: g.created_at, href: `/games/spin-wheel/${g.id}` }),
      );
      ((mills.data as any[]) || []).forEach((g) =>
        feed.push({ id: `mi-${g.id}`, kind: "game", title: g.name || "Millionário", subtitle: "Jogo de perguntas", badge: g.is_active ? "Ativo" : "Pausado", at: g.created_at, href: `/games/millionaire/${g.id}` }),
      );
      ((lives.data as any[]) || []).forEach((l) =>
        feed.push({
          id: `lv-${l.id}`, kind: "live", title: l.title,
          subtitle: l.status === "live" ? "Em direto agora" : l.status === "scheduled" ? "Live agendada" : "Replay disponível",
          badge: l.status === "live" ? "Em direto" : l.status === "scheduled" ? "Agendada" : "Replay",
          at: l.scheduled_at, href: `/live-evento/${l.slug}`, image: l.cover_url,
        }),
      );
      ((sessions.data as any[]) || []).forEach((s) =>
        feed.push({ id: `wn-${s.id}`, kind: "winner", title: `${s.player_name || "Jogador"} ganhou${s.prize ? ` ${s.prize}` : ""}`, subtitle: s.game_name, badge: "Vencedor", at: s.created_at }),
      );
      ((raffles.data as any[]) || []).forEach((r) =>
        feed.push({ id: `rf-${r.id}`, kind: "raffle", title: r.title, subtitle: r.prize_title, badge: r.status === "active" ? "Aberto" : "Encerrado", at: r.created_at, href: r.slug ? `/sorteio/${r.slug}` : undefined }),
      );

      feed.sort((a, b) => +new Date(b.at) - +new Date(a.at));
      setItems(feed);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [businessUserId, reloadKey]);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.kind === filter)),
    [items, filter],
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }} />
        {(["all", "live", "game", "winner", "raffle"] as const).map((k) => {
          const isActive = filter === k;
          const meta = k !== "all" ? kindMeta[k] : null;
          return (
            <motion.button
              key={k}
              onClick={() => setFilter(k)}
              className="biz-tl-filter"
              style={{
                backgroundColor: isActive ? (meta ? meta.bg : "hsl(var(--primary) / 0.1)") : "transparent",
                color: isActive ? (meta ? meta.color : "hsl(var(--primary))") : "hsl(var(--muted-foreground))",
                border: `1px solid ${isActive ? (meta ? meta.color + "25" : "hsl(var(--primary) / 0.2)") : "hsl(var(--border))"}`,
              }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              {k === "all" ? "Tudo" : meta!.label}
            </motion.button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              <PlayCircle className="h-10 w-10 mx-auto mb-3" style={{ color: "hsl(var(--muted-foreground) / 0.2)" }} />
            </motion.div>
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>Nada publicado nesta categoria ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="biz-tl-track">
          <div className="biz-tl-line" />
          <div className="space-y-3">
            {visible.map((it, i) => {
              const meta = kindMeta[it.kind];
              const Icon = meta.icon;
              const body = (
                <motion.div
                  className="biz-tl-card"
                  initial={{ opacity: 0, y: 10, x: -8 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4), type: "spring", stiffness: 280, damping: 28 }}
                  whileHover={{ x: 4 }}
                >
                  {it.image ? (
                    <img src={it.image} alt="" className="biz-tl-thumb" loading="lazy" />
                  ) : (
                    <div className="biz-tl-icon-wrap" style={{ backgroundColor: meta.bg }}>
                      <Icon className="h-4 w-4" style={{ color: meta.color }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="biz-tl-title">{it.title}</p>
                    <div className="biz-tl-subtitle">
                      <Clock className="h-2.5 w-2.5" />
                      <span>{it.subtitle}</span>
                      <span className="biz-tl-sep">·</span>
                      <span>{new Date(it.at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                  {it.badge && (
                    <Badge
                      className="biz-tl-badge"
                      style={{ backgroundColor: meta.bg, color: meta.color, border: `1px solid ${meta.color}20` }}
                    >
                      {it.badge}
                    </Badge>
                  )}
                </motion.div>
              );
              return (
                <div key={it.id} className="relative pl-7">
                  <motion.div
                    className="absolute left-0 top-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: Math.min(i * 0.03, 0.4) }}
                  >
                    <div
                      className="biz-tl-dot"
                      style={{ backgroundColor: meta.color, boxShadow: `0 0 8px ${meta.color}40` }}
                    />
                  </motion.div>
                  {it.href ? <Link to={it.href}>{body}</Link> : body}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
