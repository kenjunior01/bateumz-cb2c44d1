import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy, Users, Calendar, Gift, ArrowLeft, BookOpen, Building2,
  Medal, Flame,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import TournamentLeaderboard from "@/components/tournaments/TournamentLeaderboard";
import {
  getTournamentById,
  getTournamentStandings,
  getTournamentParticipantCount,
  type Tournament,
  type TournamentStanding,
} from "@/lib/tournaments";

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [standings, setStandings] = useState<TournamentStanding[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getTournamentById(id),
      getTournamentStandings(id),
      getTournamentParticipantCount(id),
    ])
      .then(([t, s, c]) => {
        setTournament(t);
        setStandings(s);
        setParticipantCount(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Trophy className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <p className="text-lg font-semibold mb-2">{t("tournament.no_tournaments")}</p>
        <Button variant="outline" onClick={() => navigate("/tournaments")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("tournament.backToList")}
        </Button>
      </div>
    );
  }

  const startDate = new Date(tournament.start_date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const endDate = new Date(tournament.end_date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const statusVariant = (() => {
    switch (tournament.status) {
      case "active": return "default" as const;
      case "completed": return "secondary" as const;
      default: return "outline" as const;
    }
  })();

  const statusText = (() => {
    switch (tournament.status) {
      case "active": return t("tournament.active");
      case "completed": return t("tournament.completed");
      default: return t("tournament.upcoming");
    }
  })();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => navigate("/tournaments")}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {t("tournament.backToList")}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <Card className="overflow-hidden">
            {tournament.status === "active" && (
              <div className="h-1.5 bg-gradient-to-r from-primary via-amber-500 to-accent" />
            )}
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-xl leading-tight">{tournament.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant}>{statusText}</Badge>
                    {tournament.status === "active" && (
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        <Flame className="h-3 w-3 mr-1" />
                        AO VIVO
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
                  <Trophy className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {tournament.description && (
                <p className="text-sm text-muted-foreground">{tournament.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <InfoItem
                  icon={<Calendar className="h-4 w-4" />}
                  label={t("tournament.dateRange")}
                  value={`${startDate} — ${endDate}`}
                />
                <InfoItem
                  icon={<Users className="h-4 w-4" />}
                  label={t("tournament.participants")}
                  value={`${participantCount}${tournament.max_participants ? ` / ${tournament.max_participants}` : ""}`}
                />
                <InfoItem
                  icon={<Gift className="h-4 w-4" />}
                  label={t("tournament.prize")}
                  value={
                    tournament.prize_description ||
                    (tournament.prize_value != null
                      ? `${tournament.prize_value.toLocaleString("pt-BR")} ${tournament.currency || ""}`
                      : "—")
                  }
                />
                <InfoItem
                  icon={<Medal className="h-4 w-4" />}
                  label={t("tournament.rankings")}
                  value={`${standings.length} ${t("tournament.participants").toLowerCase()}`}
                />
              </div>

              {tournament.rules && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold mb-1">{t("tournament.rules")}</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">
                        {tournament.rules}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <Separator />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>{t("tournament.organizedBy")}</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => navigate(`/empresa/${tournament.business_id}`)}
                >
                  {t("tournament.viewBusiness")}
                </Button>
              </div>

              {tournament.status === "active" && (
                <Button className="w-full" size="lg">
                  <Trophy className="h-4 w-4 mr-2" />
                  {t("tournament.join")}
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="mt-6"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Medal className="h-5 w-5 text-amber-500" />
                {t("tournament.rankings")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TournamentLeaderboard standings={standings} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-2.5">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold">{value}</p>
      </div>
    </div>
  );
}
