import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      setBusiness(profileRes.data as BusinessInfo | null);
      setRaffles((rafflesRes.data as Raffle[]) || []);
      setContests((contestsRes.data as Contest[]) || []);
      setProducts((productsRes.data as PrestacaoProduct[]) || []);
      setLoading(false);
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
          <TabsList className="mb-6 w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
              Tudo
            </TabsTrigger>
            <TabsTrigger value="raffles" className="text-xs sm:text-sm">
              Sorteios ({raffles.length})
            </TabsTrigger>
            <TabsTrigger value="contests" className="text-xs sm:text-sm">
              Concursos ({contests.length})
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs sm:text-sm">
              Prestações ({products.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB: ALL — masonry-like 2 col mobile, 3 col desktop */}
          <TabsContent value="all">
            {raffles.length === 0 && contests.length === 0 && products.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-8">
                {raffles.length > 0 && (
                  <Section title="Sorteios" icon={Ticket} onMore={() => navigate("/")}>
                    <Grid>
                      {raffles.slice(0, 6).map((r) => (
                        <RaffleCard key={r.id} raffle={r} onClick={() => navigate(`/raffle/${r.slug || r.id}`)} />
                      ))}
                    </Grid>
                  </Section>
                )}

                {contests.length > 0 && (
                  <Section title="Concursos" icon={Trophy} onMore={() => navigate("/concursos")}>
                    <Grid>
                      {contests.slice(0, 6).map((c) => (
                        <ContestCard key={c.id} contest={c} onClick={() => navigate(`/concursos/${c.id}`)} />
                      ))}
                    </Grid>
                  </Section>
                )}

                {products.length > 0 && (
                  <Section title="Vendas a Prestações" icon={ShoppingBag} onMore={() => navigate("/prestacoes/catalogo")}>
                    <Grid>
                      {products.slice(0, 6).map((p) => (
                        <ProductCard key={p.id} product={p} onClick={() => navigate(`/prestacoes/${p.id}`)} />
                      ))}
                    </Grid>
                  </Section>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="raffles">
            {raffles.length === 0 ? (
              <EmptyState message="Nenhum sorteio disponível." />
            ) : (
              <Grid>
                {raffles.map((r) => (
                  <RaffleCard key={r.id} raffle={r} onClick={() => navigate(`/raffle/${r.slug || r.id}`)} />
                ))}
              </Grid>
            )}
          </TabsContent>

          <TabsContent value="contests">
            {contests.length === 0 ? (
              <EmptyState message="Nenhum concurso disponível." />
            ) : (
              <Grid>
                {contests.map((c) => (
                  <ContestCard key={c.id} contest={c} onClick={() => navigate(`/concursos/${c.id}`)} />
                ))}
              </Grid>
            )}
          </TabsContent>

          <TabsContent value="products">
            {products.length === 0 ? (
              <EmptyState message="Esta empresa ainda não publicou produtos a prestações." />
            ) : (
              <Grid>
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} onClick={() => navigate(`/prestacoes/${p.id}`)} />
                ))}
              </Grid>
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
  children,
}: {
  title: string;
  icon: any;
  onMore?: () => void;
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
          <Button variant="ghost" size="sm" onClick={onMore} className="text-xs">
            Ver mais
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

function RaffleCard({ raffle, onClick }: { raffle: Raffle; onClick: () => void }) {
  const pct = raffle.total_tickets > 0 ? (raffle.sold_tickets / raffle.total_tickets) * 100 : 0;
  return (
    <Card
      onClick={onClick}
      className="overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all border-border/60 group"
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
      <CardContent className="p-3 sm:p-4">
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
        <div className="flex items-center justify-between mt-2 text-[10px] sm:text-xs text-muted-foreground">
          <span>{raffle.sold_tickets}/{raffle.total_tickets}</span>
          <span className="font-mono">{pct.toFixed(0)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ContestCard({ contest, onClick }: { contest: Contest; onClick: () => void }) {
  return (
    <Card
      onClick={onClick}
      className="overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all border-border/60 group"
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
      <CardContent className="p-3 sm:p-4">
        <h3 className="font-semibold text-sm sm:text-base line-clamp-1">{contest.title}</h3>
        {contest.prize_description && (
          <p className="text-xs sm:text-sm text-primary font-medium mt-0.5 line-clamp-1">
            🏆 {contest.prize_description}
          </p>
        )}
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
          {contest.evaluation_type === "views" ? "📹 Visualizações" : "👍 Votos"}
        </p>
      </CardContent>
    </Card>
  );
}

function ProductCard({ product, onClick }: { product: PrestacaoProduct; onClick: () => void }) {
  const cover = Array.isArray(product.images) && product.images[0] ? product.images[0] : null;
  const monthly = Math.max(0, (product.total_price - product.min_down_payment) / Math.max(1, product.max_months));
  return (
    <Card
      onClick={onClick}
      className="overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all border-border/60 group"
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
      </div>
      <CardContent className="p-3 sm:p-4">
        <h3 className="font-semibold text-sm sm:text-base line-clamp-1">{product.title}</h3>
        {(product.brand || product.model) && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {[product.brand, product.model].filter(Boolean).join(" • ")}
          </p>
        )}
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-xs text-muted-foreground">desde</span>
          <span className="text-sm sm:text-base font-bold text-primary">
            {formatMZN(monthly)}
          </span>
          <span className="text-[10px] text-muted-foreground">/mês</span>
        </div>
        {(product.city || product.province) && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {[product.city, product.province].filter(Boolean).join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
