import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Megaphone, Ticket, Trophy, Gamepad2 } from "lucide-react";

const sb: any = supabase;

interface ActivityItem {
  id: string;
  icon: "raffle" | "winner" | "game";
  text: string;
  href?: string;
  at: string;
}

interface Announcement {
  title: string;
  message: string;
  href?: string;
}

const iconFor = (k: ActivityItem["icon"]) =>
  k === "raffle" ? Ticket : k === "winner" ? Trophy : Gamepad2;

/** Cross-platform pulse: recent activity + platform announcements. */
export default function PlatformPulseWidget() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [rafflesRes, sessionsRes, settingsRes] = await Promise.all([
        sb.from("raffles")
          .select("id, title, slug, created_at, status")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(4),
        sb.from("game_sessions")
          .select("id, player_name, game_name, prize, created_at")
          .eq("is_winner", true)
          .order("created_at", { ascending: false })
          .limit(4),
        sb.from("platform_settings").select("value").eq("key", "announcements").maybeSingle(),
      ]);

      if (cancelled) return;

      const acts: ActivityItem[] = [];
      ((rafflesRes.data as any[]) || []).forEach((r) =>
        acts.push({
          id: `r-${r.id}`,
          icon: "raffle",
          text: `New raffle live: ${r.title}`,
          href: r.slug ? `/sorteio/${r.slug}` : undefined,
          at: r.created_at,
        }),
      );
      ((sessionsRes.data as any[]) || []).forEach((s) =>
        acts.push({
          id: `s-${s.id}`,
          icon: "winner",
          text: `${s.player_name || "A player"} won${s.prize ? ` ${s.prize}` : ""} on ${s.game_name}`,
          at: s.created_at,
        }),
      );
      acts.sort((a, b) => +new Date(b.at) - +new Date(a.at));
      setItems(acts.slice(0, 6));

      const raw = settingsRes.data?.value;
      if (Array.isArray(raw)) setAnnouncements(raw as Announcement[]);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0 && announcements.length === 0) return null;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-4">
        {announcements.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold">Announcements</span>
            </div>
            {announcements.slice(0, 3).map((a, i) => (
              <div key={i} className="rounded-lg bg-accent/10 p-2.5">
                <p className="text-xs font-semibold text-foreground">{a.title}</p>
                <p className="text-[11px] text-muted-foreground">{a.message}</p>
                {a.href && (
                  <Link to={a.href} className="text-[11px] text-primary underline">
                    Learn more
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Platform activity</span>
              <Badge variant="secondary" className="text-[10px]">Live</Badge>
            </div>
            <div className="space-y-1.5">
              {items.map((it, i) => {
                const Icon = iconFor(it.icon);
                const body = (
                  <div className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors">
                    <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                    <p className="text-[11px] text-muted-foreground leading-snug">{it.text}</p>
                  </div>
                );
                return (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    {it.href ? <Link to={it.href}>{body}</Link> : body}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
