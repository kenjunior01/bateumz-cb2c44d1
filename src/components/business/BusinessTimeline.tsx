import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Gamepad2,
  Radio,
  Trophy,
  Ticket,
  Filter,
  PlayCircle,
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

const kindMeta: Record<Kind, { icon: typeof Trophy; label: string; color: string }> = {
  game: { icon: Gamepad2, label: "Game", color: "text-violet-500" },
  live: { icon: Radio, label: "Live", color: "text-rose-500" },
  winner: { icon: Trophy, label: "Winner", color: "text-amber-500" },
  raffle: { icon: Ticket, label: "Raffle", color: "text-primary" },
};

interface Props {
  businessUserId: string;
  reloadKey?: number;
}

/** Single chronological timeline uniting games, lives and winners. */
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
        feed.push({ id: `sp-${g.id}`, kind: "game", title: g.name || "Spin wheel", subtitle: "Spin the wheel", badge: g.is_active ? "Active" : "Paused", at: g.created_at, href: `/games/spin-wheel/${g.id}` }),
      );
      ((mills.data as any[]) || []).forEach((g) =>
        feed.push({ id: `mi-${g.id}`, kind: "game", title: g.name || "Millionaire", subtitle: "Quiz game", badge: g.is_active ? "Active" : "Paused", at: g.created_at, href: `/games/millionaire/${g.id}` }),
      );
      ((lives.data as any[]) || []).forEach((l) =>
        feed.push({
          id: `lv-${l.id}`,
          kind: "live",
          title: l.title,
          subtitle: l.status === "live" ? "Streaming now" : l.status === "scheduled" ? "Upcoming live" : "Replay available",
          badge: l.status === "live" ? "Live now" : l.status === "scheduled" ? "Upcoming" : "Replay",
          at: l.scheduled_at,
          href: `/live-evento/${l.slug}`,
          image: l.cover_url,
        }),
      );
      ((sessions.data as any[]) || []).forEach((s) =>
        feed.push({ id: `wn-${s.id}`, kind: "winner", title: `${s.player_name || "Player"} won${s.prize ? ` ${s.prize}` : ""}`, subtitle: s.game_name, badge: "Winner", at: s.created_at }),
      );
      ((raffles.data as any[]) || []).forEach((r) =>
        feed.push({ id: `rf-${r.id}`, kind: "raffle", title: r.title, subtitle: r.prize_title, badge: r.status === "active" ? "Open" : "Closed", at: r.created_at, href: r.slug ? `/sorteio/${r.slug}` : undefined }),
      );

      feed.sort((a, b) => +new Date(b.at) - +new Date(a.at));
      setItems(feed);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [businessUserId, reloadKey]);

  const visible = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.kind === filter)),
    [items, filter],
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {(["all", "live", "game", "winner", "raffle"] as const).map((k) => (
          <Button
            key={k}
            size="sm"
            variant={filter === k ? "default" : "outline"}
            className="h-7 text-[11px] capitalize"
            onClick={() => setFilter(k)}
          >
            {k === "all" ? "Everything" : `${kindMeta[k].label}s`}
          </Button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <PlayCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Nothing published in this category yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative pl-5">
          <div className="absolute left-1.5 top-1 bottom-1 w-px bg-border" />
          <div className="space-y-3">
            {visible.map((it, i) => {
              const meta = kindMeta[it.kind];
              const Icon = meta.icon;
              const body = (
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    {it.image ? (
                      <img src={it.image} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" loading="lazy" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{it.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {it.subtitle} · {new Date(it.at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    {it.badge && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">{it.badge}</Badge>
                    )}
                  </CardContent>
                </Card>
              );
              return (
                <motion.div
                  key={it.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4) }}
                  className="relative"
                >
                  <span className={`absolute -left-[18px] top-6 h-2.5 w-2.5 rounded-full bg-background ring-2 ring-border`} />
                  {it.href ? <Link to={it.href}>{body}</Link> : body}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
