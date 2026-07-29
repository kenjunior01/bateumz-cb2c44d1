import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Users, Calendar, Gift } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Tournament } from "@/lib/tournaments";

interface TournamentCardProps {
  tournament: Tournament;
  onClick: () => void;
}

function getProgress(start: string, end: string): number {
  const now = Date.now();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (now < s) return 0;
  if (now > e) return 100;
  return Math.round(((now - s) / (e - s)) * 100);
}

function statusLabel(status: string, t: (k: string) => string): string {
  switch (status) {
    case "active": return t("tournament.active");
    case "completed": return t("tournament.completed");
    default: return t("tournament.upcoming");
  }
}

function statusVariant(
  status: string
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "active": return "default";
    case "completed": return "secondary";
    default: return "outline";
  }
}

export default function TournamentCard({ tournament, onClick }: TournamentCardProps) {
  const { t } = useLanguage();
  const progress = useMemo(
    () => getProgress(tournament.start_date, tournament.end_date),
    [tournament.start_date, tournament.end_date]
  );

  const isActive = tournament.status === "active";
  const startDate = new Date(tournament.start_date).toLocaleDateString("pt-BR");
  const endDate = new Date(tournament.end_date).toLocaleDateString("pt-BR");

  return (
    <motion.div whileTap={{ scale: 0.97 }} className="relative">
      {isActive && (
        <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-primary via-amber-500 to-accent p-[2px]">
          <div className="h-full w-full rounded-[10px] bg-card" />
        </div>
      )}
      <Card
        className={`cursor-pointer transition-shadow hover:shadow-lg ${isActive ? "relative -z-10 bg-transparent border-transparent shadow-none" : ""}`}
        onClick={onClick}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base leading-tight line-clamp-2">
              {tournament.name}
            </h3>
            <Badge variant={statusVariant(tournament.status)} className="shrink-0 text-[11px]">
              {statusLabel(tournament.status, t)}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {startDate} — {endDate}
            </span>
          </div>

          {tournament.prize_description && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Gift className="h-3.5 w-3.5" />
              <span className="line-clamp-1">{tournament.prize_description}</span>
              {tournament.prize_value != null && tournament.currency && (
                <span className="text-muted-foreground font-normal">
                  {tournament.prize_value.toLocaleString("pt-BR")} {tournament.currency}
                </span>
              )}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{t("tournament.progress")}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {tournament.max_participants != null && (
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>{t("tournament.maxParticipants", { count: String(tournament.max_participants) })}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" />
              <span>{t("tournament.prize")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
