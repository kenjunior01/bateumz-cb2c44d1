import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  Loader2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Calculator,
  Package,
  Building2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomTabBar from "@/components/BottomTabBar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMZN } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import {
  buildWhatsAppMessage,
  clampSimulation,
  monthlyInstallment,
} from "@/lib/prestacoes";

type Product = {
  id: string;
  business_user_id: string;
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
  year: number | null;
  whatsapp: string;
  stock: number;
  status: string;
  views_count: number;
};

type Seller = {
  user_id: string;
  display_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
};

export default function PrestacoesProduto() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [months, setMonths] = useState(12);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("prestacao_products_public")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const p: Product = {
          ...(data as any),
          images: Array.isArray((data as any).images) ? (data as any).images : [],
        };
        setProduct(p);
        setDownPayment(Number(p.min_down_payment));
        setMonths(p.max_months);
        // Increment views (fire and forget)
        supabase.rpc("increment_prestacao_product_views", { _product_id: p.id });
        const { data: s } = await supabase
          .from("profiles_public")
          .select("user_id,display_name,company_name,avatar_url,is_verified")
          .eq("user_id", p.business_user_id)
          .maybeSingle();
        if (!cancelled) setSeller(s as Seller | null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const clamped = useMemo(() => {
    if (!product) return { downPayment: 0, months: 12 };
    return clampSimulation({
      totalPrice: Number(product.total_price),
      minDownPayment: Number(product.min_down_payment),
      maxMonths: product.max_months,
      downPayment,
      months,
    });
  }, [product, downPayment, months]);

  const principal = useMemo(
    () => Math.max((product?.total_price ?? 0) - clamped.downPayment, 0),
    [product, clamped],
  );
  const monthly = useMemo(
    () =>
      monthlyInstallment(
        principal,
        Number(product?.annual_rate ?? 0),
        clamped.months,
      ),
    [principal, product, clamped],
  );
  const total = useMemo(
    () => monthly * clamped.months + clamped.downPayment,
    [monthly, clamped],
  );

  async function openWhatsApp() {
    if (!product) return;
    const msg = buildWhatsAppMessage({
      productTitle: product.title,
      totalPrice: Number(product.total_price),
      downPayment: clamped.downPayment,
      months: clamped.months,
      monthly,
    });

    // Require sign-in to fetch the seller's WhatsApp number (privacy hardening)
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
      return;
    }

    const { data: phone, error } = await (supabase as any).rpc("get_prestacao_whatsapp", {
      p_product_id: product.id,
    });
    if (error || !phone) {
      window.alert("Could not load seller contact. Please try again.");
      return;
    }
    const num = String(phone).replace(/\D/g, "");

    // Log lead (best-effort, never block the user)
    try {
      await supabase.from("prestacao_product_leads").insert({
        product_id: product.id,
        business_user_id: product.business_user_id,
        visitor_user_id: auth.user.id,
        total_price: Number(product.total_price),
        down_payment: clamped.downPayment,
        months: clamped.months,
        monthly_estimate: Math.round(monthly),
        source: "product",
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
      });
    } catch {
      /* ignore lead errors */
    }

    window.open(
      `https://wa.me/${num}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product || product.status !== "active") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12">
          <Card>
            <CardContent className="py-16 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h2 className="font-semibold">Produto indisponível</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Este anúncio já não está disponível ou ainda não foi publicado.
              </p>
              <Link to="/prestacoes/catalogo">
                <Button variant="outline" className="mt-4">
                  Voltar ao catálogo
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const outOfStock = product.stock <= 0;
  const maxDown = Math.max(
    Number(product.total_price) * 0.9,
    Number(product.min_down_payment),
  );

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Navbar />
      <main className="container mx-auto px-4 pt-24">
        <Link
          to="/prestacoes/catalogo"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao catálogo
        </Link>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="overflow-hidden">
              <div className="aspect-video bg-muted">
                {product.images[activeImage] ? (
                  <img
                    src={product.images[activeImage]}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                        activeImage === i ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{product.category}</Badge>
                  {product.year && <Badge variant="outline">{product.year}</Badge>}
                  {outOfStock && (
                    <Badge variant="destructive">Sem stock</Badge>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {product.views_count + 1} visualizações
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold">{product.title}</h1>
                {(product.brand || product.model) && (
                  <p className="text-muted-foreground">
                    {[product.brand, product.model].filter(Boolean).join(" · ")}
                  </p>
                )}
                {(product.province || product.city) && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {[product.city, product.province].filter(Boolean).join(", ")}
                  </div>
                )}
                {product.description && (
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                )}
              </CardContent>
            </Card>

            {seller && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                    {seller.avatar_url ? (
                      <img
                        src={seller.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm">
                        {seller.company_name ?? seller.display_name ?? "Vendedor"}
                      </p>
                      {seller.is_verified && (
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {seller.is_verified ? "Vendedor verificado" : "Vendedor"}
                    </p>
                  </div>
                  <Link to={`/empresa/${seller.user_id}`}>
                    <Button variant="outline" size="sm">
                      Ver loja
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4 lg:sticky lg:top-24 lg:self-start"
          >
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Valor total</span>
                  <span className="text-2xl font-bold">
                    {formatMZN(Number(product.total_price))}
                  </span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calculator className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Simulador</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs">Entrada</Label>
                        <span className="text-sm font-semibold">
                          {formatMZN(clamped.downPayment)}
                        </span>
                      </div>
                      <Slider
                        min={Number(product.min_down_payment)}
                        max={maxDown}
                        step={1000}
                        value={[clamped.downPayment]}
                        onValueChange={(v) => setDownPayment(v[0])}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Mínimo: {formatMZN(Number(product.min_down_payment))} ·
                        Máximo: {formatMZN(maxDown)}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs">Prazo</Label>
                        <span className="text-sm font-semibold">
                          {clamped.months} meses
                        </span>
                      </div>
                      <Slider
                        min={3}
                        max={product.max_months}
                        step={1}
                        value={[clamped.months]}
                        onValueChange={(v) => setMonths(v[0])}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Entre 3 e {product.max_months} meses
                      </p>
                    </div>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-4 mt-4 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Mensalidade</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatMZN(monthly)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total a pagar</span>
                      <span className="font-medium">{formatMZN(total)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Taxa anual indicativa</span>
                      <span className="font-medium">
                        {(Number(product.annual_rate) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={openWhatsApp}
                  className="w-full"
                  size="lg"
                  disabled={outOfStock}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {outOfStock
                    ? "Sem stock disponível"
                    : "Contactar vendedor (WhatsApp)"}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Os valores são simulações indicativas. Condições finais a confirmar
                  com o vendedor.
                </p>
              </CardContent>
            </Card>
          </motion.aside>
        </div>
      </main>
      <Footer />
      <BottomTabBar />
    </div>
  );
}
