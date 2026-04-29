import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Ticket,
  Trophy,
  Calendar,
  CheckCircle,
  Building2,
  ArrowLeft,
  Share2,
  ShoppingBag,
  Sparkles,
  Eye,
  MapPin,
  TrendingUp,
  ArrowRight,
  Calculator,
  Crown,
  Medal,
  Wallet,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatMZN } from "@/lib/currency";

interface BusinessInfo {
  user_id: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  created_at: string | null;
}

interface Raffle {
  id: string;
  title: string;
  prize_title: string;
  prize_value: number;
  ticket_price: number;
  total_tickets: number;
  sold_tickets: number;
  status: string;
  image_url: string | null;
  slug: string | null;
  end_date: string | null;
  category: string | null;
  hide_prize_value: boolean | null;
}

interface Contest {
  id: string;
  title: string;
  description: string | null;
  prize_description: string | null;
  image_url: string | null;
  status: string;
  evaluation_type: string;
  end_date: string | null;
}

interface PrestacaoProduct {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  category: string;
  total_price: number;
  min_down_payment: number;
  max_months: number;
  images: any;
  city: string | null;
  province: string | null;
  views_count: number | null;
  status: string;
}

interface RaffleWinner {
  raffle_id: string;
  raffle_title: string;
  prize_title: string;
  ticket_number: number;
  display_name: string | null;
  slug: string | null;
}

interface ContestRanking {
  contest_id: string;
  contest_title: string;
  evaluation_type: string;
  status: string;
  top: {
    submission_id: string;
    name: string;
    photo_url: string | null;
    score: number;
  }[];
}

const statusLabels: Record<string, string> = {
  active: "Ativo",
  completed: "Encerrado",
  voting: "Em Votação",
  drawn: "Sorteado",
};

export default function BusinessProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [products, setProducts] = useState<PrestacaoProduct[]>([]);
  const [winners, setWinners] = useState<RaffleWinner[]>([]);
  const [rankings, setRankings] = useState<ContestRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [profileRes, rafflesRes, contestsRes, productsRes] = await Promise.all([
        supabase.from("profiles_public").select("*").eq("user_id", id).single(),
        supabase
          .from("raffles")
          .select("*")
          .eq("business_user_id", id)
          .in("status", ["active", "completed", "drawn"])
          .order("created_at", { ascending: false }),
        supabase
          .from("contests")
          .select("*")
          .eq("created_by", id)
          .in("status", ["active", "voting", "completed"])
          .order("created_at", { ascending: false }),
        supabase
          .from("prestacao_products")
          .select("*")
          .eq("business_user_id", id)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
      ]);

      const rafflesData = (rafflesRes.data as Raffle[]) || [];
      const contestsData = (contestsRes.data as Contest[]) || [];

      setBusiness(profileRes.data as BusinessInfo | null);
      setRaffles(rafflesData);
      setContests(contestsData);
      setProducts((productsRes.data as PrestacaoProduct[]) || []);
      setLoading(false);

      // Load winners + rankings (non-blocking)
      void loadWinnersAndRankings(rafflesData, contestsData);
    };

    const loadWinnersAndRankings = async (rs: Raffle[], cs: Contest[]) => {
      // Winners: from completed/drawn raffles
      const finishedRaffleIds = rs
        .filter((r) => r.status === "completed" || r.status === "drawn")
        .map((r) => r.id);

      if (finishedRaffleIds.length > 0) {
        const { data: winnerRows } = await supabase
          .from("participants")
          .select("raffle_id, ticket_number, user_id")
          .in("raffle_id", finishedRaffleIds)
          .eq("status", "winner");

        if (winnerRows && winnerRows.length > 0) {
          const userIds = [...new Set(winnerRows.map((w: any) => w.user_id))];
          const { data: profs } = await supabase
            .from("profiles_public")
            .select("user_id, display_name")
            .in("user_id", userIds);
          const profMap = new Map((profs || []).map((p: any) => [p.user_id, p.display_name]));
          const raffleMap = new Map(rs.map((r) => [r.id, r]));

          const mapped: RaffleWinner[] = winnerRows.map((w: any) => {
            const r = raffleMap.get(w.raffle_id);
            return {
              raffle_id: w.raffle_id,
              raffle_title: r?.title || "Sorteio",
              prize_title: r?.prize_title || "Prémio",
              ticket_number: w.ticket_number,
              display_name: profMap.get(w.user_id) || null,
              slug: r?.slug || null,
            };
          });
          setWinners(mapped);
        }
      }

      // Rankings: top 3 submissions per active/voting contest
      const liveContests = cs.filter((c) => c.status === "active" || c.status === "voting");
      if (liveContests.length > 0) {
        const results: ContestRanking[] = [];
        await Promise.all(
          liveContests.map(async (c) => {
            const orderCol = c.evaluation_type === "views" ? "views_count" : "votes_count";
            const { data } = await supabase
              .from("contest_submissions")
              .select("id, participant_name, photo_url, votes_count, views_count")
              .eq("contest_id", c.id)
              .eq("status", "approved")
              .order(orderCol, { ascending: false })
              .limit(3);
            results.push({
              contest_id: c.id,
              contest_title: c.title,
              evaluation_type: c.evaluation_type,
              status: c.status,
              top: (data || []).map((s: any) => ({
                submission_id: s.id,
                name: s.participant_name,
                photo_url: s.photo_url,
                score: c.evaluation_type === "views" ? s.views_count : s.votes_count,
              })),
            });
          }),
        );
        setRankings(results.filter((r) => r.top.length > 0));
      }
    };

    load();
  }, [id]);

  const stats = useMemo(() => {
    const activeRaffles = raffles.filter((r) => r.status === "active").length;
    const totalSold = raffles.reduce((acc, r) => acc + (r.sold_tickets || 0), 0);
    return {
      activeRaffles,
      totalRaffles: raffles.length,
      contests: contests.length,
      products: products.length,
      totalSold,
    };
  }, [raffles, contests, products]);

  const handleShare = async () => {
    const url = window.location.href;
    const title = business?.company_name || business?.display_name || "Empresa";
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} • Bateu`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link do perfil copiado!");
      }
    } catch {
      // user cancelled
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Empresa não encontrada</h1>
          <Button variant="outline" onClick={() => navigate("/empresas")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Diretório
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const displayName = business.company_name || business.display_name || "Empresa";
  const initial = displayName.charAt(0).toUpperCase();

  const goToCatalogForBusiness = () =>
    navigate(`/prestacoes/catalogo?business=${business.user_id}`);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-accent/10" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, hsl(var(--primary)/0.25) 0, transparent 40%), radial-gradient(circle at 80% 60%, hsl(var(--accent)/0.2) 0, transparent 40%)",
          }}
        />

        <div className="container relative mx-auto max-w-6xl px-4 py-6 sm:py-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/empresas")}
            className="mb-4 sm:mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center gap-5"
          >
            <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-accent blur-md opacity-50" />
              <div className="relative h-full w-full rounded-2xl bg-card border-2 border-primary/30 flex items-center justify-center text-3xl sm:text-4xl font-bold text-primary overflow-hidden shadow-xl">
                {business.avatar_url ? (
                  <img
                    src={business.avatar_url}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initial
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-bold truncate">{displayName}</h1>
                {business.is_verified && (
                  <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/20">
                    <CheckCircle className="h-3 w-3 mr-1" /> Verificada
                  </Badge>
                )}
              </div>
              {business.company_name && business.display_name && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {business.display_name}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Membro desde{" "}
                {business.created_at
                  ? new Date(business.created_at).toLocaleDateString("pt-MZ", {
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>

            <Button onClick={handleShare} className="sm:self-start gap-2">
              <Share2 className="h-4 w-4" /> Partilhar perfil
            </Button>
          </motion.div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-6">
            {[
              { icon: Ticket, label: "Sorteios ativos", value: stats.activeRaffles, color: "text-primary" },
              { icon: Trophy, label: "Concursos", value: stats.contests, color: "text-accent" },
              { icon: ShoppingBag, label: "Prestações", value: stats.products, color: "text-primary" },
              { icon: TrendingUp, label: "Bilhetes vendidos", value: stats.totalSold, color: "text-accent" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="rounded-xl border border-border/60 bg-card/70 backdrop-blur p-3 sm:p-4"
              >
                <s.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${s.color}`} />
                <p className="font-display text-lg sm:text-2xl font-bold mt-1">{s.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 sm:py-10 max-w-6xl">
        <Tabs defaultValue="all">
          <div className="sticky top-14 sm:top-16 z-30 -mx-4 px-4 py-2 bg-background/85 backdrop-blur-md border-b border-border/40 mb-4 sm:mb-6">
            <TabsList className="w-full sm:w-auto grid grid-cols-5 sm:inline-flex">
              <TabsTrigger value="all" className="text-[11px] sm:text-sm">
                <Sparkles className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Tudo
              </TabsTrigger>
              <TabsTrigger value="raffles" className="text-[11px] sm:text-sm">
                Sorteios
              </TabsTrigger>
              <TabsTrigger value="contests" className="text-[11px] sm:text-sm">
                Concursos
              </TabsTrigger>
              <TabsTrigger value="products" className="text-[11px] sm:text-sm">
                Prestações
              </TabsTrigger>
              <TabsTrigger value="winners" className="text-[11px] sm:text-sm">
                <Crown className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Vencedores
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB: ALL */}
          <TabsContent value="all">
            {raffles.length === 0 && contests.length === 0 && products.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-8">
                {raffles.length > 0 && (
                  <Section
                    title="Sorteios"
                    icon={Ticket}
                    moreLabel="Ver todos"
                    onMore={() => {
                      const t = document.querySelector<HTMLButtonElement>('[role="tab"][value="raffles"]');
                      t?.click();
                    }}
                  >
                    <Grid>
                      {raffles.slice(0, 6).map((r) => (
                        <RaffleCard key={r.id} raffle={r} navigate={navigate} />
                      ))}
                    </Grid>
                  </Section>
                )}

                {contests.length > 0 && (
                  <Section
                    title="Concursos"
                    icon={Trophy}
                    moreLabel="Ver todos"
                    onMore={() => {
                      const t = document.querySelector<HTMLButtonElement>('[role="tab"][value="contests"]');
                      t?.click();
                    }}
                  >
                    <Grid>
                      {contests.slice(0, 6).map((c) => (
                        <ContestCard key={c.id} contest={c} navigate={navigate} />
                      ))}
                    </Grid>
                  </Section>
                )}

                {products.length > 0 && (
                  <Section
                    title="Vendas a Prestações"
                    icon={ShoppingBag}
                    moreLabel="Ver todos"
                    onMore={() => {
                      const t = document.querySelector<HTMLButtonElement>('[role="tab"][value="products"]');
                      t?.click();
                    }}
                  >
                    <Grid>
                      {products.slice(0, 6).map((p) => (
                        <ProductCard key={p.id} product={p} navigate={navigate} />
                      ))}
                    </Grid>
                  </Section>
                )}

                {(winners.length > 0 || rankings.length > 0) && (
                  <Section
                    title="Vencedores & Rankings"
                    icon={Crown}
                    moreLabel="Ver tudo"
                    onMore={() => {
                      const trigger = document.querySelector<HTMLButtonElement>(
                        '[role="tab"][value="winners"]',
                      );
                      trigger?.click();
                    }}
                  >
                    <WinnersAndRankings
                      winners={winners.slice(0, 4)}
                      rankings={rankings.slice(0, 2)}
                      navigate={navigate}
                    />
                  </Section>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="raffles">
            <FilteredList
              items={raffles}
              statuses={[
                { value: "all", label: "Todos" },
                { value: "active", label: "Ativo" },
                { value: "completed", label: "Encerrado" },
                { value: "drawn", label: "Sorteado" },
              ]}
              sorts={[
                { value: "recent", label: "Mais recentes" },
                { value: "popular", label: "Mais populares" },
                { value: "ending", label: "A terminar" },
              ]}
              renderItem={(r) => <RaffleCard key={r.id} raffle={r} navigate={navigate} />}
              getStatus={(r) => r.status}
              getSortValue={(r, sort) => {
                if (sort === "popular") return r.sold_tickets || 0;
                if (sort === "ending") return r.end_date ? -new Date(r.end_date).getTime() : 0;
                return 0;
              }}
              emptyMessage="Nenhum sorteio nesse estado."
            />
          </TabsContent>

          <TabsContent value="contests">
            <FilteredList
              items={contests}
              statuses={[
                { value: "all", label: "Todos" },
                { value: "active", label: "Ativo" },
                { value: "voting", label: "Em votação" },
                { value: "completed", label: "Encerrado" },
              ]}
              sorts={[
                { value: "recent", label: "Mais recentes" },
                { value: "ending", label: "A terminar" },
              ]}
              renderItem={(c) => <ContestCard key={c.id} contest={c} navigate={navigate} />}
              getStatus={(c) => c.status}
              getSortValue={(c, sort) => {
                if (sort === "ending") return c.end_date ? -new Date(c.end_date).getTime() : 0;
                return 0;
              }}
              emptyMessage="Nenhum concurso nesse estado."
            />
          </TabsContent>

          <TabsContent value="products">
            <FilteredList
              items={products}
              extraAction={
                <Button variant="outline" size="sm" onClick={goToCatalogForBusiness} className="gap-2 text-xs">
                  Catálogo completo <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
              statuses={[{ value: "all", label: "Todos" }, { value: "active", label: "Disponível" }]}
              sorts={[
                { value: "recent", label: "Mais recentes" },
                { value: "popular", label: "Mais vistos" },
                { value: "monthly-asc", label: "Mensalidade ↑" },
                { value: "monthly-desc", label: "Mensalidade ↓" },
                { value: "price-asc", label: "Preço ↑" },
                { value: "price-desc", label: "Preço ↓" },
              ]}
              renderItem={(p) => <ProductCard key={p.id} product={p} navigate={navigate} />}
              getStatus={(p) => p.status}
              getSortValue={(p, sort) => {
                if (sort === "popular") return p.views_count || 0;
                if (sort === "price-asc") return -p.total_price;
                if (sort === "price-desc") return p.total_price;
                if (sort === "monthly-asc" || sort === "monthly-desc") {
                  const monthly = Math.max(0, (p.total_price - p.min_down_payment) / Math.max(1, p.max_months));
                  return sort === "monthly-asc" ? -monthly : monthly;
                }
                return 0;
              }}
              emptyMessage="Esta empresa ainda não publicou produtos a prestações."
            />
          </TabsContent>

          <TabsContent value="winners">
            {winners.length === 0 && rankings.length === 0 ? (
              <EmptyState message="Ainda não há vencedores nem rankings publicados." />
            ) : (
              <WinnersAndRankings winners={winners} rankings={rankings} navigate={navigate} full />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}

/* -------------------- Helpers -------------------- */

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">{children}</div>
  );
}

function Section({
  title,
  icon: Icon,
  onMore,
  moreLabel = "Ver mais",
  children,
}: {
  title: string;
  icon: any;
  onMore?: () => void;
  moreLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-xl font-bold flex items-center gap-2">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          {title}
        </h2>
        {onMore && (
          <Button variant="ghost" size="sm" onClick={onMore} className="text-xs gap-1">
            {moreLabel} <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message = "Esta empresa ainda não publicou nada." }: { message?: string }) {
  return (
    <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl">
      <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function RaffleCard({
  raffle,
  navigate,
}: {
  raffle: Raffle;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const pct = raffle.total_tickets > 0 ? (raffle.sold_tickets / raffle.total_tickets) * 100 : 0;
  const target = `/raffle/${raffle.slug || raffle.id}`;
  const isActive = raffle.status === "active";
  return (
    <Card
      onClick={() => navigate(target)}
      className="overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all border-border/60 group flex flex-col"
    >
      <div className="aspect-video relative overflow-hidden bg-muted">
        {raffle.image_url ? (
          <img
            src={raffle.image_url}
            alt={raffle.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Ticket className="h-8 w-8 text-primary/40" />
          </div>
        )}
        <Badge className="absolute top-2 left-2 bg-background/90 backdrop-blur text-foreground border-0 text-[10px]">
          {statusLabels[raffle.status] || raffle.status}
        </Badge>
      </div>
      <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm sm:text-base line-clamp-1">{raffle.title}</h3>
        <p className="text-xs sm:text-sm text-primary font-medium mt-0.5 line-clamp-1">
          🏆 {raffle.prize_title}
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[10px] sm:text-xs text-muted-foreground">
          <span>{raffle.sold_tickets}/{raffle.total_tickets}</span>
          <span className="font-mono">{pct.toFixed(0)}%</span>
        </div>
        <div className="mt-2 text-[11px] sm:text-xs">
          <span className="text-muted-foreground">Bilhete:</span>{" "}
          <span className="font-semibold text-foreground">{formatMZN(raffle.ticket_price)}</span>
        </div>
        <Button
          size="sm"
          className="mt-3 w-full gap-1.5 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            navigate(target);
          }}
          disabled={!isActive}
        >
          <Ticket className="h-3.5 w-3.5" />
          {isActive ? "Comprar bilhete" : "Ver sorteio"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ContestCard({
  contest,
  navigate,
}: {
  contest: Contest;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const target = `/concursos/${contest.id}`;
  const canEnter = contest.status === "active";
  return (
    <Card
      onClick={() => navigate(target)}
      className="overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all border-border/60 group flex flex-col"
    >
      <div className="aspect-video relative overflow-hidden bg-muted">
        {contest.image_url ? (
          <img
            src={contest.image_url}
            alt={contest.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-accent/40" />
          </div>
        )}
        <Badge className="absolute top-2 left-2 bg-background/90 backdrop-blur text-foreground border-0 text-[10px]">
          {statusLabels[contest.status] || contest.status}
        </Badge>
      </div>
      <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm sm:text-base line-clamp-1">{contest.title}</h3>
        {contest.prize_description && (
          <p className="text-xs sm:text-sm text-primary font-medium mt-0.5 line-clamp-1">
            🏆 {contest.prize_description}
          </p>
        )}
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
          {contest.evaluation_type === "views" ? "📹 Visualizações" : "👍 Votos"}
        </p>
        <Button
          size="sm"
          className="mt-3 w-full gap-1.5 text-xs"
          variant={canEnter ? "default" : "outline"}
          onClick={(e) => {
            e.stopPropagation();
            navigate(target);
          }}
        >
          <Trophy className="h-3.5 w-3.5" />
          {canEnter ? "Participar" : contest.status === "voting" ? "Votar" : "Ver concurso"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ProductCard({
  product,
  navigate,
}: {
  product: PrestacaoProduct;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const cover = Array.isArray(product.images) && product.images[0] ? product.images[0] : null;
  const monthly = Math.max(
    0,
    (product.total_price - product.min_down_payment) / Math.max(1, product.max_months),
  );
  const target = `/prestacoes/${product.id}`;
  return (
    <Card
      onClick={() => navigate(target)}
      className="overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all border-border/60 group flex flex-col"
    >
      <div className="aspect-video relative overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-primary/40" />
          </div>
        )}
        {(product.views_count ?? 0) > 0 && (
          <Badge className="absolute top-2 right-2 bg-background/90 backdrop-blur text-foreground border-0 text-[10px] gap-1">
            <Eye className="h-3 w-3" /> {product.views_count}
          </Badge>
        )}
        <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground border-0 text-[10px] capitalize">
          {product.category}
        </Badge>
      </div>
      <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm sm:text-base line-clamp-1">{product.title}</h3>
        {(product.brand || product.model) && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {[product.brand, product.model].filter(Boolean).join(" • ")}
          </p>
        )}

        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-[10px] sm:text-xs text-muted-foreground">desde</span>
          <span className="text-sm sm:text-base font-bold text-primary">
            {formatMZN(monthly)}
          </span>
          <span className="text-[10px] text-muted-foreground">/mês</span>
        </div>

        <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] sm:text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 min-w-0">
            <Wallet className="h-3 w-3 shrink-0 text-primary/70" />
            <span className="truncate">Entrada {formatMZN(product.min_down_payment)}</span>
          </span>
          <span className="flex items-center gap-1 min-w-0">
            <Clock className="h-3 w-3 shrink-0 text-primary/70" />
            <span className="truncate">até {product.max_months} meses</span>
          </span>
          <span className="col-span-2 text-foreground/80 font-medium">
            Total: {formatMZN(product.total_price)}
          </span>
        </div>

        {(product.city || product.province) && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {[product.city, product.province].filter(Boolean).join(", ")}
          </p>
        )}

        <Button
          size="sm"
          className="mt-3 w-full gap-1.5 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            navigate(target);
          }}
        >
          <Calculator className="h-3.5 w-3.5" />
          Simular & solicitar
        </Button>
      </CardContent>
    </Card>
  );
}

/* -------------------- Winners & Rankings -------------------- */

function WinnersAndRankings({
  winners,
  rankings,
  navigate,
  full = false,
}: {
  winners: RaffleWinner[];
  rankings: ContestRanking[];
  navigate: ReturnType<typeof useNavigate>;
  full?: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Winners list */}
      <Card className="border-border/60">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
            <h3 className="font-bold text-sm sm:text-base">Últimos Vencedores</h3>
          </div>
          {winners.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground">
              Ainda sem vencedores. Os primeiros sorteios estão a decorrer.
            </p>
          ) : (
            <ul className="space-y-2">
              {(full ? winners : winners.slice(0, 4)).map((w, i) => {
                const name = w.display_name || `Bilhete #${w.ticket_number}`;
                const initials = name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <li
                    key={`${w.raffle_id}-${i}`}
                    onClick={() => navigate(`/raffle/${w.slug || w.raffle_id}`)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                  >
                    <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs sm:text-sm font-bold text-primary-foreground">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold truncate">{name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                        Ganhou <span className="text-primary">{w.prize_title}</span>
                      </p>
                    </div>
                    <Medal className="h-4 w-4 text-accent shrink-0" />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Contest rankings */}
      <Card className="border-border/60">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h3 className="font-bold text-sm sm:text-base">Rankings dos Concursos</h3>
          </div>
          {rankings.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground">
              Sem concursos ativos com participações no momento.
            </p>
          ) : (
            <div className="space-y-4">
              {(full ? rankings : rankings.slice(0, 2)).map((r) => (
                <div key={r.contest_id}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <p
                      className="text-xs sm:text-sm font-semibold truncate cursor-pointer hover:text-primary"
                      onClick={() => navigate(`/concursos/${r.contest_id}`)}
                    >
                      {r.contest_title}
                    </p>
                    <Badge variant="outline" className="text-[9px] sm:text-[10px] shrink-0">
                      {r.evaluation_type === "views" ? "👁 views" : "❤ votos"}
                    </Badge>
                  </div>
                  <ol className="space-y-1.5">
                    {r.top.map((s, idx) => {
                      const medalColor =
                        idx === 0
                          ? "text-yellow-500"
                          : idx === 1
                          ? "text-gray-400"
                          : "text-amber-700";
                      return (
                        <li
                          key={s.submission_id}
                          className="flex items-center gap-2 p-1.5 rounded-md hover:bg-secondary/40"
                        >
                          <span className={`text-xs font-bold w-5 ${medalColor}`}>
                            #{idx + 1}
                          </span>
                          {s.photo_url ? (
                            <img
                              src={s.photo_url}
                              alt={s.name}
                              className="h-7 w-7 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-[11px] sm:text-xs flex-1 truncate">{s.name}</span>
                          <span className="text-[10px] sm:text-xs font-mono font-semibold text-foreground">
                            {s.score}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------- FilteredList: status filter + sort + pagination -------------------- */

interface StatusOption { value: string; label: string }
interface SortOption { value: string; label: string }

function FilteredList<T extends { id: string; created_at?: string | null }>({
  items,
  statuses,
  sorts,
  renderItem,
  getStatus,
  getSortValue,
  emptyMessage,
  extraAction,
  pageSize = 9,
}: {
  items: T[];
  statuses: StatusOption[];
  sorts: SortOption[];
  renderItem: (item: T) => React.ReactNode;
  getStatus: (item: T) => string;
  getSortValue: (item: T, sort: string) => number;
  emptyMessage: string;
  extraAction?: React.ReactNode;
  pageSize?: number;
}) {
  const [status, setStatus] = useState<string>(statuses[0]?.value ?? "all");
  const [sort, setSort] = useState<string>(sorts[0]?.value ?? "recent");
  const [page, setPage] = useState(1);

  // Reset page when filter/sort changes
  useEffect(() => {
    setPage(1);
  }, [status, sort]);

  const filtered = useMemo(() => {
    let list = status === "all" ? items : items.filter((i) => getStatus(i) === status);
    if (sort === "recent") {
      list = [...list].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
    } else {
      list = [...list].sort((a, b) => getSortValue(b, sort) - getSortValue(a, sort));
    }
    return list;
  }, [items, status, sort, getStatus, getSortValue]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice(0, page * pageSize);
  const canLoadMore = page < totalPages;

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    for (const i of items) {
      const s = getStatus(i);
      map[s] = (map[s] ?? 0) + 1;
    }
    return map;
  }, [items, getStatus]);

  if (items.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => {
            const active = status === s.value;
            const count = counts[s.value] ?? 0;
            return (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={`text-[11px] sm:text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
                }`}
              >
                {s.label}
                <span className="ml-1 opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "item" : "itens"}
          </p>
          <div className="flex items-center gap-2">
            {extraAction}
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-8 text-xs w-[150px] sm:w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sorts.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Nenhum resultado para os filtros selecionados." />
      ) : (
        <>
          <Grid>{visible.map((item) => renderItem(item))}</Grid>

          {canLoadMore && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} className="gap-2">
                Carregar mais
                <span className="text-xs text-muted-foreground">
                  ({visible.length}/{filtered.length})
                </span>
              </Button>
            </div>
          )}
          {!canLoadMore && filtered.length > pageSize && (
            <p className="mt-6 text-center text-[11px] text-muted-foreground">
              Mostrando todos os {filtered.length} itens
            </p>
          )}
        </>
      )}
    </div>
  );
}
