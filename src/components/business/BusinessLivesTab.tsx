import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Radio, PlayCircle, Calendar, Trophy, Video, ArrowRight } from "lucide-react";

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

      // Winners recorded during lives (game sessions flagged as winners)
      const codes = list.map((l) => l.slug);
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
      void codes;
      if (!cancelled) setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [businessUserId]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (lives.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <Radio className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No lives published yet.</p>
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

  const renderCard = (l: LiveRow) => {
    const replays = links.filter((k) => k.scheduled_live_id === l.id);
    const w = winners[l.slug] || [];
    return (
      <Card key={l.id} className="overflow-hidden">
        {l.cover_url && (
          <div className="h-28 w-full overflow-hidden bg-muted">
            <img src={l.cover_url} alt={l.title} className="h-full w-full object-cover" loading="lazy" />
          </div>
        )}
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm leading-tight line-clamp-2">{l.title}</h4>
            <Badge
              variant={l.status === "live" ? "default" : "secondary"}
              className="shrink-0 text-[10px] capitalize"
            >
              {l.status === "live" ? "Live now" : l.status === "scheduled" ? "Upcoming" : "Replay"}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {fmt(l.scheduled_at)}
          </p>
          {l.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{l.description}</p>
          )}

          {replays.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {replays.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Video className="h-3 w-3" />
                    {r.label || r.platform}
                  </Badge>
                </a>
              ))}
            </div>
          )}

          {w.length > 0 && (
            <div className="rounded-lg bg-amber-500/10 p-2 space-y-1">
              <p className="text-[10px] font-semibold text-amber-600 flex items-center gap-1">
                <Trophy className="h-3 w-3" /> Winners
              </p>
              {w.slice(0, 3).map((x, i) => (
                <p key={i} className="text-[11px] text-foreground">
                  {x.name}
                  {x.prize ? ` — ${x.prize}` : ""}
                </p>
              ))}
            </div>
          )}

          <Button asChild size="sm" variant="secondary" className="w-full mt-1 gap-1">
            <Link to={`/live-evento/${l.slug}`}>
              <PlayCircle className="h-3.5 w-3.5" />
              {l.status === "ended" ? "Watch recap" : "Open live page"}
              <ArrowRight className="h-3.5 w-3.5 ml-auto" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

  const Section = ({ title, items }: { title: string; items: LiveRow[] }) =>
    items.length === 0 ? null : (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-base">{title}</h3>
          <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(renderCard)}</div>
      </div>
    );

  return (
    <div className="space-y-8">
      <Section title="Live now" items={liveNow} />
      <Section title="Upcoming" items={upcoming} />
      <Section title="Recordings & past lives" items={past} />
    </div>
  );
}
