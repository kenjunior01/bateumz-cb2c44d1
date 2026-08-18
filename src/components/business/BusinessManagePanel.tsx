import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Settings2, RefreshCw, Link2, Copy, Check, Loader2,
  Gamepad2, Radio, Trophy, Ticket, Gift, BarChart3, Sparkles
} from "lucide-react";
import {
  generateSlug, checkSlugAvailability, saveCompanySlug,
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
  { label: "Jogos", to: "/dashboard/live-games", icon: Gamepad2, color: "#8b5cf6" },
  { label: "Lives Agendadas", to: "/dashboard/scheduled-lives", icon: Radio, color: "#ef4444" },
  { label: "Histórico de Lives", to: "/dashboard/live-history", icon: Trophy, color: "#fbbf24" },
  { label: "Sorteios", to: "/dashboard/raffles", icon: Ticket, color: "#3b82f6" },
  { label: "Prémios", to: "/dashboard/prizes", icon: Gift, color: "#10b981" },
];

const statItems = [
  { key: "games" as const, label: "Jogos", icon: Gamepad2, color: "#8b5cf6" },
  { key: "raffles" as const, label: "Sorteios", icon: Ticket, color: "#3b82f6" },
  { key: "contests" as const, label: "Concursos", icon: Trophy, color: "#fbbf24" },
  { key: "winners" as const, label: "Vencedores", icon: Sparkles, color: "#10b981" },
];

export default function BusinessManagePanel({
  userId, companyName, currentSlug, onRefresh, onSlugSaved, counts,
}: Props) {
  const [slug, setSlug] = useState(currentSlug || generateSlug(companyName));
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug || slug === currentSlug) { setAvailable(null); return; }
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
    toast.success("Link do perfil público copiado");
    setTimeout(() => setCopied(false), 1800);
  };

  const save = async () => {
    if (!slug || available === false) return;
    setSaving(true);
    try {
      await saveCompanySlug(userId, slug);
      onSlugSaved(slug);
      toast.success("Link público atualizado");
    } catch {
      toast.error("Não foi possível guardar. Tente outro.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="biz-panel-card">
      <CardContent className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="biz-panel-icon">
              <Settings2 className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold">Gerir o seu perfil</span>
            <Badge variant="secondary" className="biz-panel-badge">Apenas visível para si</Badge>
          </div>
          <Button size="sm" variant="outline" className="biz-panel-refresh gap-1.5" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statItems.map((s, i) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
              className="biz-stat-card"
              style={{ "--stat-color": s.color } as React.CSSProperties}
            >
              <s.icon className="h-4 w-4 biz-stat-icon" style={{ color: s.color }} />
              <div>
                <p className="biz-stat-value">{counts[s.key]}</p>
                <p className="biz-stat-label">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {quickLinks.map((l, i) => (
            <motion.div
              key={l.to}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.04 }}
            >
              <Button asChild size="sm" className="biz-quick-link gap-1.5">
                <Link to={l.to}>
                  <l.icon className="h-3.5 w-3.5" style={{ color: l.color }} />
                  {l.label}
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="biz-slug-section">
          <p className="biz-slug-label">
            <Link2 className="h-3.5 w-3.5" /> Link do perfil público
          </p>
          <div className="biz-slug-input-row">
            <div className="biz-slug-input-wrap">
              <span className="biz-slug-prefix">/empresa/</span>
              <Input
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                placeholder="your-company"
                className="biz-slug-input"
              />
              {checking && <Loader2 className="h-3.5 w-3.5 animate-spin biz-slug-status" />}
              {!checking && available === true && <Check className="h-3.5 w-3.5 biz-slug-ok" />}
              {!checking && available === false && (
                <span className="biz-slug-taken">ocupado</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="biz-slug-save" onClick={save} disabled={saving || available === false || !slug}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}
              </Button>
              <Button size="sm" variant="outline" className="biz-slug-copy gap-1.5" onClick={copy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copiar
              </Button>
            </div>
          </div>
          <p className="biz-slug-url">{publicUrl}</p>
        </div>
      </CardContent>
    </Card>
  );
}
