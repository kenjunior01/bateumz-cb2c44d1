// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Car,
  Home,
  Wrench,
  Truck,
  Factory,
  Package,
  Search,
  MapPin,
  Eye,
  Gavel,
  KeyRound,
  BadgeCheck,
  ShieldCheck,
  FileCheck,
  TrendingUp,
  Loader2,
  Calendar,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSEO } from "@/hooks/useSEO";
import { supabase } from "@/integrations/supabase/client";
import { formatMZN } from "@/lib/currency";
import { leasingQuote, MODALITY_COLORS } from "@/lib/alienacao";
import OptimizedImage from "@/components/OptimizedImage";

type Asset = {
  id: string;
  title: string;
  category: string;
  modality: string;
  description: string | null;
  asset_value: number;
  min_down_payment: number;
  max_months: number;
  annual_rate: number;
  residual_pct: number;
  images: string[];
  province: string | null;
  city: string | null;
  condition: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  documents_ready: boolean;
  warranty_months: number;
  status: string;
  featured: boolean;
  views_count: number;
  offers_count: number;
  slug: string | null;
  auction_deadline: string | null;
  business_user_id: string | null;
  profiles?: { display_name: string | null; business_name?: string | null } | null;
};

const CATEGORY_ICONS: Record<string, typeof Car> = {
  viaturas: Car,
  imoveis: Home,
  equipamentos: Wrench,
  frotas: Truck,
  maquinario: Factory,
  outros: Package,
};

const CATEGORY_LABELS: Record<string, string> = {
  viaturas: "Viaturas",
  imoveis: "Imóveis",
  equipamentos: "Equipamentos",
  frotas: "Frotas",
  maquinario: "Máquinas",
  outros: "Outros",
};

const MODALITY_LABELS: Record<string, string> = {
  venda_direta: "Venda Direta",
  leasing: "Leasing",
  rent_to_own: "Rent-to-Own",
  leilao: "Leilão",
};

const CONDITIONS: Record<string, string> = {
  novo: "Novo",
  seminovo: "Seminovo",
  usado: "Usado",
};

function monthlyEstimate(a: Asset): number {
  const q = leasingQuote({
    assetValue: Number(a.asset_value),
    downPayment: Number(a.min_down_payment),
    months: a.max_months,
    annualRate: Number(a.annual_rate),
    residualPct: Number(a.residual_pct),
  });
  return q.monthly;
}

const AlienacaoCatalogo = () => {
  useSEO({
    title: "Leilões e Bens — Viaturas, Imóveis e Equipamentos | Mercado Bateu",
    description:
      "Empresas alienam viaturas, imóveis, equipamentos e frotas. Simule leasing com valor residual, participe em leilões e feche contratos com propostas em minutos.",
    canonicalPath: "/alienacao",
  });

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [modality, setModality] = useState<string>("all");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("alienacao_assets")
      .select("*")
      .in("status", ["disponivel", "reservado"])
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60);
    if (!error) setAssets((data as unknown as Asset[]) || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const list = assets.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (modality !== "all" && a.modality !== modality) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${a.title} ${a.brand || ""} ${a.model || ""} ${a.city || ""} ${a.province || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return list;
  }, [assets, category, modality, search]);

  const featured = filtered.filter((a) => a.featured).slice(0, 3);
  const rest = filtered.filter((a) => !featured.includes(a));

  const stats = useMemo(() => {
    const total = assets.length;
    const leasing = assets.filter((a) => a.modality === "leasing" || a.modality === "rent_to_own").length;
    const leilao = assets.filter((a) => a.modality === "leilao").length;
    const value = assets.reduce((s, a) => s + Number(a.asset_value), 0);
    return { total, leasing, leilao, value };
  }, [assets]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pb-20">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/10 via-background to-background">
          <div className="absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute top-20 -right-20 h-64 w-64 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
          <div className="container mx-auto px-4 py-12 lg:py-16 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl"
            >
              <Badge className="mb-4 gap-1.5 bg-primary/15 text-primary border-primary/30">
                <KeyRound className="h-3.5 w-3.5" /> Novo na Bateu
              </Badge>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold leading-tight">
                Leilões e <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">bens</span>
              </h1>
              <p className="mt-4 text-muted-foreground text-base sm:text-lg leading-relaxed">
                Empresas colocam viaturas, imóveis, equipamentos, frotas e máquinas para
                alienação. Escolha <strong className="text-foreground">venda direta</strong>,{" "}
                <strong className="text-foreground">leasing</strong> com valor residual,{" "}
                <strong className="text-foreground">rent-to-own</strong> ou participe em{" "}
                <strong className="text-foreground">leilões</strong> — tudo com simulador
                integrado e propostas em minutos.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Contratos verificáveis
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileCheck className="h-4 w-4 text-blue-500" /> Documentação validada
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Gavel className="h-4 w-4 text-orange-500" /> Leilões transparentes
                </div>
              </div>
            </motion.div>

            {/* STATS */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-2xl"
            >
              {[
                { label: "Bens disponíveis", value: stats.total, icon: TrendingUp },
                { label: "Em leasing/RTO", value: stats.leasing, icon: Calendar },
                { label: "Leilões ativos", value: stats.leilao, icon: Gavel },
              ].map((s) => (
                <Card key={s.label} className="shadow-[0_0_15px_hsl(var(--primary)/0.1)]">
                  <CardContent className="p-3">
                    <s.icon className="h-4 w-4 text-primary mb-1.5" />
                    <p className="text-xl font-bold">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
              <Card className="shadow-[0_0_15px_hsl(var(--primary)/0.1)]">
                <CardContent className="p-3">
                  <BadgeCheck className="h-4 w-4 text-emerald-500 mb-1.5" />
                  <p className="text-base font-bold">{formatMZN(stats.value)}</p>
                  <p className="text-[11px] text-muted-foreground">Valor em carteira</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* FILTROS */}
        <section className="container mx-auto px-4 py-6 sticky top-14 lg:top-16 z-30 bg-background/95 backdrop-blur-md border-b border-border/40">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por título, marca, cidade..."
                className="pl-9"
              />
            </div>
            <Select value={modality} onValueChange={setModality}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Modalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as modalidades</SelectItem>
                {Object.entries(MODALITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 overflow-x-auto mt-3 pb-1 scrollbar-hide">
            <button
              onClick={() => setCategory("all")}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                category === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-primary/40"
              }`}
            >
              Todos
            </button>
            {Object.entries(CATEGORY_LABELS).map(([k, label]) => {
              const Icon = CATEGORY_ICONS[k];
              return (
                <button
                  key={k}
                  onClick={() => setCategory(k)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all inline-flex items-center gap-1.5 ${
                    category === k
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:border-primary/40"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* DESTAQUES */}
        {featured.length > 0 && (
          <section className="container mx-auto px-4 pt-8">
            <h2 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-amber-500" /> Destaques da semana
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((a, i) => (
                <AssetCard key={a.id} asset={a} index={i} featured />
              ))}
            </div>
          </section>
        )}

        {/* LISTAGEM */}
        <section className="container mx-auto px-4 py-8">
          <h2 className="text-xl font-display font-bold mb-4">
            {category === "all" ? "Todos os bens" : CATEGORY_LABELS[category]}
            <span className="text-muted-foreground font-normal text-sm ml-2">({filtered.length})</span>
          </h2>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-44 w-full rounded-t-lg" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium">Ainda não há bens nesta seleção</p>
              <p className="text-sm text-muted-foreground mt-1">
                As empresas estão a preparar os próximos lotes de alienação. Volte em breve!
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((a, i) => (
                <AssetCard key={a.id} asset={a} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* CTA EMPRESAS */}
        <section className="container mx-auto px-4 pb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-8 lg:p-10"
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative max-w-xl">
              <h3 className="text-2xl font-display font-bold">É uma empresa? Aliene os seus bens aqui</h3>
              <p className="mt-2 text-muted-foreground">
                Publique viaturas, imóveis e equipamentos, receba propostas qualificadas e
                gere contratos de leasing com cronograma de pagamentos automático —
                diretamente no seu painel.
              </p>
              <Button asChild className="mt-5">
                <Link to="/dashboard/alienacao">Publicar bem para alienação →</Link>
              </Button>
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

const AssetCard = ({ asset: a, index, featured }: { asset: Asset; index: number; featured?: boolean }) => {
  const Icon = CATEGORY_ICONS[a.category] || Package;
  const monthly = monthlyEstimate(a);
  const deadline = a.auction_deadline ? new Date(a.auction_deadline) : null;
  const daysLeft = deadline ? Math.max(0, Math.ceil((+deadline - Date.now()) / 86400000)) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3) }}
      whileHover={{ y: -4 }}
    >
      <Link to={`/alienacao/${a.slug || a.id}`}>
        <Card className="overflow-hidden group h-full shadow-[0_0_15px_hsl(var(--primary)/0.08)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.18)] transition-shadow">
          <div className="relative h-44 overflow-hidden bg-muted">
            {a.images?.[0] ? (
              <OptimizedImage
                src={a.images[0]}
                alt={a.title}
                optimizeWidth={640}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/15 to-accent/10">
                <Icon className="h-12 w-12 text-primary/50" />
              </div>
            )}
            <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur ${MODALITY_COLORS[a.modality] || ""}`}>
                {MODALITY_LABELS[a.modality] || a.modality}
              </span>
              {featured && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-white">
                  ⭐ Destaque
                </span>
              )}
              {a.condition === "novo" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white">
                  Novo
                </span>
              )}
            </div>
            {a.modality === "leilao" && daysLeft !== null && (
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-semibold flex items-center gap-1">
                <Gavel className="h-3 w-3" /> {daysLeft}d para fechar
              </div>
            )}
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] flex items-center gap-1">
              <Eye className="h-3 w-3" /> {a.views_count}
            </div>
          </div>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {a.title}
              </h3>
              {a.documents_ready && (
                <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" title="Documentação pronta" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {a.city || a.province || "—"}
              </span>
              {a.year && <span>· {a.year}</span>}
              {a.mileage ? <span>· {a.mileage.toLocaleString("pt-PT")} km</span> : null}
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-lg font-bold text-primary">
                  {formatMZN(Number(a.asset_value))}
                </p>
                {a.modality !== "venda_direta" && a.modality !== "leilao" && monthly > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    desde <strong className="text-foreground">{formatMZN(monthly)}</strong>/mês · {a.max_months}x
                  </p>
                )}
                {a.modality === "leilao" && (
                  <p className="text-[11px] text-muted-foreground">
                    {a.offers_count} proposta{a.offers_count === 1 ? "" : "s"} recebida{a.offers_count === 1 ? "" : "s"}
                  </p>
                )}
              </div>
              <span className="text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground">
                {CATEGORY_LABELS[a.category]}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};

export default AlienacaoCatalogo;
