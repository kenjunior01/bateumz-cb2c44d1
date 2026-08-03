import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Settings2,
  RefreshCw,
  Link2,
  Copy,
  Check,
  Loader2,
  Gamepad2,
  Radio,
  Trophy,
  Ticket,
  Gift,
} from "lucide-react";
import {
  generateSlug,
  checkSlugAvailability,
  saveCompanySlug,
} from "@/hooks/useCompanySlug";
import { getPublicBaseUrl } from "@/lib/publicUrl";

interface Props {
  userId: string;
  companyName: string;
  currentSlug?: string | null;
  onRefresh: () => void;
  onSlugSaved: (slug: string) => void;
  counts: { games: number; raffles: number; contests: number; winners: number };
}

const quickLinks = [
  { label: "Games", to: "/dashboard/live-games", icon: Gamepad2 },
  { label: "Scheduled lives", to: "/dashboard/scheduled-lives", icon: Radio },
  { label: "Live history", to: "/dashboard/live-history", icon: Trophy },
  { label: "Raffles", to: "/dashboard/raffles", icon: Ticket },
  { label: "Prizes", to: "/dashboard/prizes", icon: Gift },
];

/** Owner-only control panel shown on the company's own public profile. */
export default function BusinessManagePanel({
  userId,
  companyName,
  currentSlug,
  onRefresh,
  onSlugSaved,
  counts,
}: Props) {
  const [slug, setSlug] = useState(currentSlug || generateSlug(companyName));
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug || slug === currentSlug) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      setAvailable(await checkSlugAvailability(slug, userId));
      setChecking(false);
    }, 450);
    return () => clearTimeout(t);
  }, [slug, currentSlug, userId]);

  const publicUrl = `${getPublicBaseUrl()}/empresa/${currentSlug || userId}`;

  const copy = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Public profile link copied");
    setTimeout(() => setCopied(false), 1800);
  };

  const save = async () => {
    if (!slug || available === false) return;
    setSaving(true);
    try {
      await saveCompanySlug(userId, slug);
      onSlugSaved(slug);
      toast.success("Public link updated");
    } catch {
      toast.error("Could not save this link. Try another one.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/[0.04]">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Manage your profile</span>
            <Badge variant="secondary" className="text-[10px]">Only you see this</Badge>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh content
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Games", value: counts.games },
            { label: "Raffles", value: counts.raffles },
            { label: "Contests", value: counts.contests },
            { label: "Winners", value: counts.winners },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border/60 bg-card p-2 text-center">
              <p className="font-display text-lg font-bold leading-none">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {quickLinks.map((l) => (
            <Button key={l.to} asChild size="sm" variant="secondary" className="gap-1.5">
              <Link to={l.to}>
                <l.icon className="h-3.5 w-3.5" /> {l.label}
              </Link>
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-primary" /> Public profile link
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex flex-1 items-center rounded-lg border border-border bg-background px-2">
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">/empresa/</span>
              <Input
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                placeholder="your-company"
                className="border-0 h-9 px-1 focus-visible:ring-0"
              />
              {checking && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              {!checking && available === true && <Check className="h-3.5 w-3.5 text-emerald-500" />}
              {!checking && available === false && (
                <span className="text-[10px] text-destructive whitespace-nowrap">taken</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving || available === false || !slug}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={copy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground break-all">{publicUrl}</p>
        </div>
      </CardContent>
    </Card>
  );
}
