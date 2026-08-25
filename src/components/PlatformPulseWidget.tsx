import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Activity,
  Megaphone,
  Ticket,
  Trophy,
  Gamepad2,
  X,
  Bookmark,
  BookmarkCheck,
  Maximize2,
} from "lucide-react";

const sb: any = supabase;

const HIDDEN_KEY = "bateu_hidden_announcements";
const SAVED_KEY = "bateu_saved_announcements";

interface ActivityItem {
  id: string;
  icon: "raffle" | "winner" | "game";
  text: string;
  href?: string;
  at: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  href?: string;
}

const iconFor = (k: ActivityItem["icon"]) =>
  k === "raffle" ? Ticket : k === "winner" ? Trophy : Gamepad2;

const readList = (key: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};
const writeList = (key: string, list: string[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* noop */
  }
};

/** Cross-platform pulse: recent activity + dismissible/saveable announcements. */
export default function PlatformPulseWidget() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [hidden, setHidden] = useState<string[]>(() => readList(HIDDEN_KEY));
  const [saved, setSaved] = useState<string[]>(() => readList(SAVED_KEY));
  const [open, setOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [rafflesRes, sessionsRes, settingsRes] = await Promise.all([
        sb.from("raffles")
          .select("id, title, slug, created_at")
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(10),
        sb.from("game_sessions")
          .select("id, player_name, game_name, prize, created_at")
          .eq("is_winner", true)
          .order("created_at", { ascending: false })
          .limit(10),
        (sb as any).from("platform_settings_public").select("value").eq("key", "announcements").maybeSingle(),
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
      setItems(acts);

      const raw = settingsRes.data?.value;
      if (Array.isArray(raw)) {
        setAnnouncements(
          (raw as any[]).map((a, i) => ({
            id: String(a.id ?? `${a.title}-${i}`),
            title: a.title,
            message: a.message,
            href: a.href,
          })),
        );
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleHidden = (id: string) => {
    const next = hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id];
    setHidden(next);
    writeList(HIDDEN_KEY, next);
  };
  const toggleSaved = (id: string) => {
    const next = saved.includes(id) ? saved.filter((x) => x !== id) : [...saved, id];
    setSaved(next);
    writeList(SAVED_KEY, next);
  };

  const visibleAnnouncements = announcements.filter(
    (a) => showHidden || !hidden.includes(a.id) || saved.includes(a.id),
  );

  if (items.length === 0 && announcements.length === 0) return null;

  const AnnouncementRow = ({ a, full }: { a: Announcement; full?: boolean }) => (
    <div className="rounded-lg bg-accent/10 p-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">{a.title}</p>
          <p className={`text-[11px] text-muted-foreground ${full ? "" : "line-clamp-2"}`}>{a.message}</p>
          {a.href && (
            <Link to={a.href} className="text-[11px] text-primary underline">
              Learn more
            </Link>
          )}
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            aria-label={saved.includes(a.id) ? "Unsave announcement" : "Save announcement"}
            onClick={() => toggleSaved(a.id)}
          >
            {saved.includes(a.id) ? (
              <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            aria-label={hidden.includes(a.id) ? "Restore announcement" : "Hide announcement"}
            onClick={() => toggleHidden(a.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  const ActivityRow = ({ it }: { it: ActivityItem }) => {
    const Icon = iconFor(it.icon);
    const body = (
      <div className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors">
        <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
        <p className="text-[11px] text-muted-foreground leading-snug">{it.text}</p>
      </div>
    );
    return it.href ? <Link to={it.href}>{body}</Link> : body;
  };

  return (
    <>
      <Card className="border-border/60 shadow-[0_0_10px_hsl(var(--primary)/0.08)]">
        <CardContent className="p-4 space-y-4">
          {visibleAnnouncements.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold">Announcements</span>
                {hidden.length > 0 && (
                  <Badge variant="outline" className="text-[10px]">{hidden.length} hidden</Badge>
                )}
              </div>
              {visibleAnnouncements.slice(0, 2).map((a) => (
                <AnnouncementRow key={a.id} a={a} />
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
                {items.slice(0, 5).map((it, i) => (
                  <motion.div
                    key={it.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <ActivityRow it={it} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setOpen(true)}>
            <Maximize2 className="h-3.5 w-3.5" /> View all details
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Platform activity & announcements</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {announcements.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Megaphone className="h-4 w-4 text-accent" /> Announcements
                  </p>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setShowHidden((v) => !v)}>
                    {showHidden ? "Hide dismissed" : `Show dismissed (${hidden.length})`}
                  </Button>
                </div>
                {announcements
                  .filter((a) => showHidden || !hidden.includes(a.id))
                  .map((a) => (
                    <AnnouncementRow key={a.id} a={a} full />
                  ))}
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-primary" /> Recent activity
              </p>
              {items.map((it) => (
                <ActivityRow key={it.id} it={it} />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
