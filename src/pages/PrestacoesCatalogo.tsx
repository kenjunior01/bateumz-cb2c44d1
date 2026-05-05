import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Car,
  Home,
  Smartphone,
  Building2,
  ShoppingBag,
  Loader2,
  ArrowRight,
  SlidersHorizontal,
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
import { formatMZN } from "@/lib/currency";
import { PROVINCES } from "@/lib/provinces";
import { supabase } from "@/integrations/supabase/client";
import { monthlyInstallment } from "@/lib/prestacoes";
import MobileDiscoveryHeader from "@/components/meituan/MobileDiscoveryHeader";
import MobileFilterSheet from "@/components/meituan/MobileFilterSheet";
import ProductCardMeituan from "@/components/meituan/ProductCardMeituan";
import MeituanSkeleton from "@/components/meituan/MeituanSkeleton";

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

const categoryMeta: Record<string, { label: string; icon: typeof Car; emoji: string }> = {
  viaturas: { label: "Viaturas", icon: Car, emoji: "🚗" },
  imoveis: { label: "Imóveis", icon: Home, emoji: "🏠" },
  eletronicos: { label: "Eletrónicos", icon: Smartphone, emoji: "📱" },
  equipamentos: { label: "Equipamentos", icon: Building2, emoji: "🛠️" },
  outros: { label: "Outros", icon: ShoppingBag, emoji: "🛍️" },
};

type SortKey = "recent" | "price-asc" | "price-desc" | "monthly-asc" | "popular";

export default function PrestacoesCatalogo() {
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState<string>(searchParams.get("category") ?? "all");
  const [province, setProvince] = useState<string>(searchParams.get("province") ?? "all");
  const [brand, setBrand] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Keep filters in URL for shareable links
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (category === "all") next.delete("category"); else next.set("category", category);
    if (province === "all") next.delete("province"); else next.set("province", province);
    if (search.trim()) next.set("q", search.trim()); else next.delete("q");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, province, search]);

  const businessFilter = searchParams.get("business");
  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase
        .from("prestacao_products")
        .select(
          "id,title,category,description,total_price,min_down_payment,max_months,annual_rate,images,province,city,brand,model,featured,views_count,stock",
        )
        .eq("status", "active");
      if (businessFilter) query = query.eq("business_user_id", businessFilter);
      const { data } = await query
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
  }, [businessFilter]);

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
      const principal = Math.max(Number(p.total_price) - Number(p.min_down_payment), 0);
      const monthly = monthlyInstallment(principal, Number(p.annual_rate), p.max_months);
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

  // Counts per category for chips
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    });
    return counts;
  }, [products]);

  const chipCategories = [
    { id: "all", label: "Todas", icon: "✨", count: products.length },
    ...Object.entries(categoryMeta).map(([id, m]) => ({
      id,
      label: m.label,
      icon: m.emoji,
      count: catCounts[id] ?? 0,
    })),
  ];

  const FiltersBlock = (
    <div className="space-y-4">
      <div>
        <Label>Província</Label>
        <Select value={province} onValueChange={setProvince}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {PROVINCES.map((p) => (
              <SelectItem key={p.value} value={p.label}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {brandOptions.length > 0 && (
        <div>
          <Label>Marca</Label>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {brandOptions.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Preço mín. (MZN)</Label>
          <Input type="number" inputMode="numeric" placeholder="0"
            value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
        </div>
        <div>
          <Label>Preço máx. (MZN)</Label>
          <Input type="number" inputMode="numeric" placeholder="Ex.: 1.000.000"
            value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Ordenar</Label>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="popular">Mais vistos</SelectItem>
            <SelectItem value="monthly-asc">Mensalidade: menor</SelectItem>
            <SelectItem value="price-asc">Preço: menor</SelectItem>
            <SelectItem value="price-desc">Preço: maior</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // Desktop also needs category select for the sidebar
  const DesktopFiltersBlock = (
    <div className="space-y-4">
      <div>
        <Label>Categoria</Label>
        <Select value={category} onValueChange={(v) => { setCategory(v); setBrand("all"); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {Object.entries(categoryMeta).map(([id, meta]) => (
              <SelectItem key={id} value={id}>{meta.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {FiltersBlock}
      <Button variant="ghost" size="sm" className="w-full" onClick={resetFilters}>
        Limpar filtros
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Desktop navbar */}
      <div className="hidden md:block">
        <Navbar />
      </div>

      <main className="container mx-auto px-4 md:pt-24">
        {/* Mobile sticky header (Meituan style) */}
        <MobileDiscoveryHeader
          title="Catálogo a Prestações"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Pesquisar produto, marca ou modelo..."
          categories={chipCategories}
          activeCategory={category}
          onCategoryChange={(id) => { setCategory(id); setBrand("all"); }}
          onOpenFilters={() => setFiltersOpen(true)}
        />

        {/* Desktop header */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 hidden md:block"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Catálogo a Prestações</h1>
              <p className="text-muted-foreground mt-1">
                Viaturas, imóveis, eletrónicos e equipamentos com pagamento parcelado.
              </p>
            </div>
            <Link to="/prestacoes">
              <Button variant="outline" size="sm">Saber mais</Button>
            </Link>
          </div>
        </motion.header>

        <div className="grid md:grid-cols-[260px_1fr] gap-6 mt-3 md:mt-0">
          <aside className="hidden md:block">
            <Card>
              <CardContent className="p-4">{DesktopFiltersBlock}</CardContent>
            </Card>
          </aside>

          <section>
            {/* Desktop search row */}
            <div className="hidden md:flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9"
                  placeholder="Pesquisar produto, marca ou modelo..."
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Result count + active filters summary (mobile + desktop) */}
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-[11px] md:text-xs text-muted-foreground">
                {loading ? "A carregar..." : `${filtered.length} produto${filtered.length === 1 ? "" : "s"}`}
              </p>
              {!loading && (province !== "all" || brand !== "all" || minPrice || maxPrice || sort !== "recent") && (
                <button
                  onClick={resetFilters}
                  className="text-[11px] md:text-xs text-primary font-medium md:hidden"
                >
                  Limpar
                </button>
              )}
              {/* Desktop sort outside sidebar */}
              <div className="hidden md:block">
                <Button variant="ghost" size="sm" onClick={() => setFiltersOpen(true)}>
                  <SlidersHorizontal className="h-4 w-4 mr-1" /> Mais filtros
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="md:hidden">
                <MeituanSkeleton count={6} />
              </div>
            ) : null}
            {loading && (
              <div className="hidden md:flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            {!loading && filtered.length === 0 && (
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
            )}

            {!loading && filtered.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {filtered.map(({ p, monthly }, i) => {
                  const Icon = categoryMeta[p.category]?.icon ?? ShoppingBag;
                  const outOfStock = p.stock <= 0;
                  return (
                    <ProductCardMeituan
                      key={p.id}
                      index={i}
                      to={`/prestacoes/${p.id}`}
                      image={p.images[0]}
                      imageFallback={<Icon className="h-10 w-10" />}
                      title={p.title}
                      subtitle={[p.brand, p.model].filter(Boolean).join(" · ") || null}
                      topLeftBadge={p.featured ? { label: "Destaque", tone: "primary" } : null}
                      topRightChip={categoryMeta[p.category]?.label ?? p.category}
                      bottomLeftBadge={outOfStock ? { label: "Sem stock", tone: "danger" } : null}
                      priceLine={
                        <>
                          {formatMZN(monthly)}
                          <span className="text-[10px] text-muted-foreground font-normal">/mês</span>
                        </>
                      }
                      secondaryPriceLine={`Total ${formatMZN(Number(p.total_price))}`}
                      rightStat={`${p.max_months}x`}
                      location={[p.city, p.province].filter(Boolean).join(", ") || null}
                      views={p.views_count ?? 0}
                      footer={
                        <div className="hidden md:flex items-center justify-between text-[11px] text-primary font-medium pt-1">
                          Ver detalhes <ArrowRight className="h-3 w-3" />
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Mobile filter bottom sheet */}
      <MobileFilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filtrar produtos"
        resultCount={filtered.length}
        onReset={resetFilters}
        onApply={() => { /* state already applied */ }}
      >
        {FiltersBlock}
      </MobileFilterSheet>

      <div className="hidden md:block">
        <Footer />
      </div>
      <BottomTabBar />
    </div>
  );
}
