import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Car,
  Home,
  Smartphone,
  Building2,
  MapPin,
  ShoppingBag,
  Loader2,
  ArrowRight,
  SlidersHorizontal,
  Eye,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomTabBar from "@/components/BottomTabBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatMZN } from "@/lib/currency";
import { PROVINCES } from "@/lib/provinces";
import { supabase } from "@/integrations/supabase/client";
import { monthlyInstallment } from "@/lib/prestacoes";

type Product = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  total_price: number;
  min_down_payment: number;
  max_months: number;
  annual_rate: number;
  images: string[];
  province: string | null;
  city: string | null;
  brand: string | null;
  model: string | null;
  featured: boolean;
  views_count: number;
  stock: number;
};

const categoryMeta: Record<string, { label: string; icon: typeof Car }> = {
  viaturas: { label: "Viaturas", icon: Car },
  imoveis: { label: "Imóveis", icon: Home },
  eletronicos: { label: "Eletrónicos", icon: Smartphone },
  equipamentos: { label: "Equipamentos", icon: Building2 },
  outros: { label: "Outros", icon: ShoppingBag },
};

type SortKey = "recent" | "price-asc" | "price-desc" | "monthly-asc" | "popular";

export default function PrestacoesCatalogo() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [province, setProvince] = useState<string>("all");
  const [brand, setBrand] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("recent");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("prestacao_products")
        .select(
          "id,title,category,description,total_price,min_down_payment,max_months,annual_rate,images,province,city,brand,model,featured,views_count,stock",
        )
        .eq("status", "active")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      setProducts(
        (data ?? []).map((p: any) => ({
          ...p,
          images: Array.isArray(p.images) ? p.images : [],
        })),
      );
      setLoading(false);
    })();
  }, []);

  // Brands available given current category filter
  const brandOptions = useMemo(() => {
    const base = category === "all" ? products : products.filter((p) => p.category === category);
    const set = new Set<string>();
    for (const p of base) if (p.brand) set.add(p.brand);
    return Array.from(set).sort();
  }, [products, category]);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.brand ?? "").toLowerCase().includes(q) ||
          (p.model ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    }
    if (category !== "all") list = list.filter((p) => p.category === category);
    if (province !== "all") list = list.filter((p) => p.province === province);
    if (brand !== "all") list = list.filter((p) => p.brand === brand);
    const minP = Number(minPrice);
    if (minP > 0) list = list.filter((p) => Number(p.total_price) >= minP);
    const maxP = Number(maxPrice);
    if (maxP > 0) list = list.filter((p) => Number(p.total_price) <= maxP);

    const withMonthly = list.map((p) => {
      const principal = Math.max(
        Number(p.total_price) - Number(p.min_down_payment),
        0,
      );
      const monthly = monthlyInstallment(
        principal,
        Number(p.annual_rate),
        p.max_months,
      );
      return { p, monthly };
    });

    if (sort === "price-asc")
      withMonthly.sort((a, b) => Number(a.p.total_price) - Number(b.p.total_price));
    else if (sort === "price-desc")
      withMonthly.sort((a, b) => Number(b.p.total_price) - Number(a.p.total_price));
    else if (sort === "monthly-asc")
      withMonthly.sort((a, b) => a.monthly - b.monthly);
    else if (sort === "popular")
      withMonthly.sort((a, b) => (b.p.views_count ?? 0) - (a.p.views_count ?? 0));

    return withMonthly;
  }, [products, search, category, province, brand, minPrice, maxPrice, sort]);

  function resetFilters() {
    setSearch("");
    setCategory("all");
    setProvince("all");
    setBrand("all");
    setMinPrice("");
    setMaxPrice("");
    setSort("recent");
  }

  const FiltersBlock = (
    <div className="space-y-4">
      <div>
        <Label>Categoria</Label>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v);
            setBrand("all");
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(categoryMeta).map(([id, meta]) => (
              <SelectItem key={id} value={id}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Província</Label>
        <Select value={province} onValueChange={setProvince}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {PROVINCES.map((p) => (
              <SelectItem key={p.value} value={p.label}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {brandOptions.length > 0 && (
        <div>
          <Label>Marca</Label>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {brandOptions.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Preço mín. (MZN)</Label>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </div>
        <div>
          <Label>Preço máx. (MZN)</Label>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Ex.: 1.000.000"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label>Ordenar</Label>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="popular">Mais vistos</SelectItem>
            <SelectItem value="monthly-asc">Mensalidade: menor</SelectItem>
            <SelectItem value="price-asc">Preço: menor</SelectItem>
            <SelectItem value="price-desc">Preço: maior</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="ghost" size="sm" className="w-full" onClick={resetFilters}>
        Limpar filtros
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 pt-24">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Catálogo a Prestações</h1>
              <p className="text-muted-foreground mt-1">
                Viaturas, imóveis, eletrónicos e equipamentos com pagamento parcelado.
              </p>
            </div>
            <Link to="/prestacoes">
              <Button variant="outline" size="sm">
                Saber mais
              </Button>
            </Link>
          </div>
        </motion.header>

        <div className="grid md:grid-cols-[260px_1fr] gap-6">
          <aside className="hidden md:block">
            <Card>
              <CardContent className="p-4">{FiltersBlock}</CardContent>
            </Card>
          </aside>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Pesquisar produto, marca ou modelo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">{FiltersBlock}</div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
              <Button
                size="sm"
                variant={category === "all" ? "default" : "outline"}
                onClick={() => {
                  setCategory("all");
                  setBrand("all");
                }}
              >
                Todas
              </Button>
              {Object.entries(categoryMeta).map(([id, meta]) => {
                const Icon = meta.icon;
                return (
                  <Button
                    key={id}
                    size="sm"
                    variant={category === id ? "default" : "outline"}
                    onClick={() => {
                      setCategory(id);
                      setBrand("all");
                    }}
                    className="shrink-0"
                  >
                    <Icon className="h-3.5 w-3.5 mr-1" />
                    {meta.label}
                  </Button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground mb-3">
              {loading ? "A carregar..." : `${filtered.length} produto(s)`}
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-semibold">Sem produtos disponíveis</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ainda não há ofertas que correspondam aos seus filtros.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={resetFilters}>
                    Limpar filtros
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(({ p, monthly }, i) => {
                  const Icon = categoryMeta[p.category]?.icon ?? ShoppingBag;
                  const outOfStock = p.stock <= 0;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    >
                      <Link to={`/prestacoes/${p.id}`}>
                        <Card className="overflow-hidden hover:shadow-elegant transition group h-full">
                          <div className="aspect-video bg-muted relative overflow-hidden">
                            {p.images[0] ? (
                              <img
                                src={p.images[0]}
                                alt={p.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Icon className="h-10 w-10 text-muted-foreground" />
                              </div>
                            )}
                            {p.featured && (
                              <Badge className="absolute top-2 left-2">Destaque</Badge>
                            )}
                            {outOfStock && (
                              <Badge variant="destructive" className="absolute bottom-2 left-2">
                                Sem stock
                              </Badge>
                            )}
                            <Badge variant="secondary" className="absolute top-2 right-2">
                              {categoryMeta[p.category]?.label ?? p.category}
                            </Badge>
                          </div>
                          <CardContent className="p-4 space-y-2">
                            <h3 className="font-semibold line-clamp-1">{p.title}</h3>
                            {(p.brand || p.model) && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {[p.brand, p.model].filter(Boolean).join(" · ")}
                              </p>
                            )}
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs text-muted-foreground">desde</span>
                              <span className="text-lg font-bold text-primary">
                                {formatMZN(monthly)}
                                <span className="text-xs text-muted-foreground">/mês</span>
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center justify-between">
                              <span>Total: {formatMZN(Number(p.total_price))}</span>
                              <span>{p.max_months}x</span>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center justify-between">
                              {(p.province || p.city) ? (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {[p.city, p.province].filter(Boolean).join(", ")}
                                </span>
                              ) : <span />}
                              <span className="inline-flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {p.views_count ?? 0}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-between mt-2"
                            >
                              Ver detalhes <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
      <BottomTabBar />
    </div>
  );
}
