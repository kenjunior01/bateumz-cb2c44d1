import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Car,
  Home,
  Smartphone,
  Sparkles,
  Building2,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatMZN } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";

type CategoryId = "viaturas" | "imoveis" | "eletronicos" | "equipamentos";

const categories: {
  id: CategoryId;
  icon: typeof Car;
  label: string;
  desc: string;
  color: string;
  // indicative annual rate range (used by tiers)
  baseRate: number; // % year for "small" amount
  bestRate: number; // % year for "large" amount
  maxMonths: number;
  defaultValue: number;
  defaultDownPct: number;
}[] = [
  {
    id: "viaturas",
    icon: Car,
    label: "Viaturas",
    desc: "Carros novos e seminovos com plano flexível",
    color: "from-primary/30 to-primary/5",
    baseRate: 0.18,
    bestRate: 0.13,
    maxMonths: 60,
    defaultValue: 800_000,
    defaultDownPct: 0.2,
  },
  {
    id: "imoveis",
    icon: Home,
    label: "Imóveis",
    desc: "Apartamentos, casas e terrenos",
    color: "from-accent/30 to-accent/5",
    baseRate: 0.12,
    bestRate: 0.09,
    maxMonths: 60,
    defaultValue: 3_000_000,
    defaultDownPct: 0.25,
  },
  {
    id: "eletronicos",
    icon: Smartphone,
    label: "Eletrónicos",
    desc: "Smartphones, TVs, computadores",
    color: "from-secondary/40 to-secondary/5",
    baseRate: 0.24,
    bestRate: 0.18,
    maxMonths: 24,
    defaultValue: 60_000,
    defaultDownPct: 0.2,
  },
  {
    id: "equipamentos",
    icon: Building2,
    label: "Equipamentos",
    desc: "Para empresas e profissionais",
    color: "from-primary/30 to-accent/5",
    baseRate: 0.2,
    bestRate: 0.15,
    maxMonths: 48,
    defaultValue: 250_000,
    defaultDownPct: 0.2,
  },
];

const sections = [
  { id: "categorias", label: "Categorias" },
  { id: "simulador", label: "Simulador" },
  { id: "como-funciona", label: "Como funciona" },
  { id: "interesse", label: "Lista de espera" },
];

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getCategory(id: string) {
  return categories.find((c) => c.id === id) ?? categories[0];
}

// Per-category indicative annual rate that decreases with amount
function annualRateFor(categoryId: string, amount: number) {
  const cat = getCategory(categoryId);
  // anchor amount where the "best" rate is reached
  const anchor =
    cat.id === "imoveis"
      ? 5_000_000
      : cat.id === "viaturas"
        ? 2_000_000
        : cat.id === "equipamentos"
          ? 1_000_000
          : 200_000; // eletrónicos
  const t = Math.min(1, Math.max(0, amount / anchor));
  // linear interpolation base → best rate
  return cat.baseRate + (cat.bestRate - cat.baseRate) * t;
}

function simulate(categoryId: string, value: number, downPayment: number, months: number) {
  const principal = Math.max(0, value - downPayment);
  const annualRate = annualRateFor(categoryId, value);
  const monthlyRate = annualRate / 12;
  const monthly =
    monthlyRate === 0 || months === 0
      ? principal / Math.max(1, months)
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  const total = monthly * months + downPayment;
  const interest = total - value;
  return { principal, monthly, total, interest, annualRate };
}

export default function Prestacoes() {
  const { toast } = useToast();

  // Simulator state
  const [productType, setProductType] = useState<CategoryId>("viaturas");
  const [value, setValue] = useState<number>(800_000);
  const [downPayment, setDownPayment] = useState<number>(160_000);
  const [months, setMonths] = useState<number>(24);

  // Switch defaults when category changes
  const handleCategoryChange = (id: string) => {
    const cat = getCategory(id);
    setProductType(cat.id);
    setValue(cat.defaultValue);
    setDownPayment(Math.round(cat.defaultValue * cat.defaultDownPct));
    if (months > cat.maxMonths) setMonths(cat.maxMonths);
  };

  const currentCat = getCategory(productType);
  const sim = useMemo(
    () => simulate(productType, value, Math.min(downPayment, value), months),
    [productType, value, downPayment, months],
  );

  // Lead form state
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const buildShareMessage = () =>
    [
      `Olá! Estou interessado/a em comprar a prestações via Bateu:`,
      ``,
      `📦 Categoria: ${currentCat.label}`,
      `💰 Valor do bem: ${formatMZN(value)}`,
      `💵 Entrada: ${formatMZN(Math.min(downPayment, value))}`,
      `📅 Prazo: ${months} meses`,
      `📈 Mensalidade estimada: ${formatMZN(sim.monthly)}`,
      `   (taxa indicativa ${(sim.annualRate * 100).toFixed(1)}%/ano)`,
      ``,
      name ? `Sou ${name}.` : `Gostaria de mais informações.`,
      notes ? `\nNotas: ${notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

  const openWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(buildShareMessage())}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      toast({ title: "Nome inválido", description: "Indique o seu nome completo.", variant: "destructive" });
      return;
    }
    const phoneDigits = whatsapp.replace(/\D/g, "");
    if (phoneDigits.length < 9) {
      toast({ title: "WhatsApp inválido", description: "Indique um número válido (mínimo 9 dígitos).", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const principal = Math.max(0, value - Math.min(downPayment, value));
    const { error } = await supabase.from("prestacao_product_leads").insert({
      product_id: null,
      business_user_id: null,
      visitor_name: name.trim().slice(0, 120),
      visitor_whatsapp: phoneDigits.slice(0, 20),
      total_price: value,
      down_payment: Math.min(downPayment, value),
      months,
      monthly_estimate: sim.monthly,
      source: "waitlist",
      category: productType,
      notes: notes.trim().slice(0, 500) || null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 200) : null,
    });
    void principal;
    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Inscrição registada!", description: "A nossa equipa entra em contacto em breve." });
  };


  const resetForm = () => {
    setSubmitted(false);
    setName("");
    setWhatsapp("");
    setNotes("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 pt-4 lg:pt-24 pb-24 lg:pb-16">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] sm:text-xs font-semibold text-accent">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> EM BREVE • LISTA DE ESPERA ABERTA
          </div>
          <h1 className="mt-3 sm:mt-6 font-display text-2xl sm:text-4xl font-bold text-foreground md:text-6xl leading-tight">
            Vendas a <span className="text-accent">Prestações</span>
          </h1>
          <p className="mt-2 sm:mt-4 text-sm sm:text-base md:text-lg text-muted-foreground px-2">
            Compre viaturas, imóveis e eletrónicos em até 60 prestações,
            das melhores empresas de Moçambique.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:hidden">
            <a href="/prestacoes/catalogo">
              <Button className="w-full gap-1 h-11 text-sm">
                Ver catálogo <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </a>
            <Button variant="outline" onClick={() => scrollToId("simulador")} className="w-full gap-1 h-11 text-sm">
              <Calculator className="h-3.5 w-3.5" /> Simular
            </Button>
          </div>

          <div className="mt-6 hidden sm:flex flex-wrap justify-center gap-2">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToId(s.id)}
                className="rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="mt-4 sm:mt-6 hidden sm:flex flex-wrap justify-center gap-3">
            <a href="/prestacoes/catalogo">
              <Button className="gap-2">
                Ver catálogo de produtos <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Button variant="outline" onClick={() => scrollToId("simulador")} className="gap-2">
              <Calculator className="h-4 w-4" /> Abrir simulador
            </Button>
            <Button variant="ghost" onClick={() => scrollToId("interesse")} className="gap-2">
              Entrar na lista
            </Button>
          </div>
        </motion.section>

        <section id="categorias" className="mt-8 sm:mt-16 scroll-mt-24">
          <div className="mb-3 sm:mb-6 flex items-end justify-between">
            <h2 className="font-display text-lg sm:text-2xl font-bold text-foreground md:text-3xl">Categorias</h2>
            <button
              onClick={() => scrollToId("simulador")}
              className="text-xs sm:text-sm font-medium text-primary hover:underline"
            >
              Simular →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4">
            {categories.map((cat, i) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                onClick={() => {
                  handleCategoryChange(cat.id);
                  scrollToId("simulador");
                }}
                className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${cat.color} p-3 sm:p-6 text-left transition-all hover:scale-[1.02] hover:border-primary/50`}
              >
                <cat.icon className="h-7 w-7 sm:h-10 sm:w-10 text-foreground" />
                <p className="mt-2 sm:mt-3 font-display text-sm sm:text-lg font-semibold text-foreground">{cat.label}</p>
                <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-muted-foreground line-clamp-2">{cat.desc}</p>
                <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] font-medium text-primary">
                  {(cat.bestRate * 100).toFixed(1)}–{(cat.baseRate * 100).toFixed(1)}%/ano · {cat.maxMonths}m
                </p>
              </motion.button>
            ))}
          </div>
        </section>

        <section id="simulador" className="mt-16 scroll-mt-24">
          <div className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-6 md:p-10">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Simulador de Prestações</h2>
                <p className="text-sm text-muted-foreground">Estimativa indicativa — taxas reais serão confirmadas pela empresa parceira.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Tipo de produto</Label>
                  <Select value={productType} onValueChange={handleCategoryChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label} — {(c.bestRate * 100).toFixed(1)}–{(c.baseRate * 100).toFixed(1)}%/ano
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label>Valor do bem</Label>
                    <span className="text-sm font-semibold text-foreground">{formatMZN(value)}</span>
                  </div>
                  <Slider
                    value={[value]}
                    min={20_000}
                    max={5_000_000}
                    step={10_000}
                    onValueChange={(v) => {
                      const nv = v[0];
                      setValue(nv);
                      if (downPayment > nv) setDownPayment(Math.floor(nv * 0.2));
                    }}
                  />
                  <Input
                    type="number"
                    min={20_000}
                    value={value}
                    onChange={(e) => setValue(Math.max(0, Number(e.target.value) || 0))}
                    className="mt-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label>Entrada</Label>
                    <span className="text-sm font-semibold text-foreground">
                      {formatMZN(Math.min(downPayment, value))}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({value > 0 ? Math.round((Math.min(downPayment, value) / value) * 100) : 0}%)
                      </span>
                    </span>
                  </div>
                  <Slider
                    value={[Math.min(downPayment, value)]}
                    min={0}
                    max={value}
                    step={5_000}
                    onValueChange={(v) => setDownPayment(v[0])}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label>Prazo</Label>
                    <span className="text-sm font-semibold text-foreground">{months} meses</span>
                  </div>
                  <Slider
                    value={[months]}
                    min={3}
                    max={currentCat.maxMonths}
                    step={1}
                    onValueChange={(v) => setMonths(v[0])}
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[6, 12, 24, 36, 48, 60]
                      .filter((m) => m <= currentCat.maxMonths)
                      .map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMonths(m)}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            months === m
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {m}m
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prestação mensal estimada</p>
                <p className="mt-2 font-display text-4xl font-bold text-foreground">{formatMZN(sim.monthly)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {currentCat.label} · taxa indicativa {(sim.annualRate * 100).toFixed(1)}% / ano
                </p>

                <div className="mt-6 space-y-3 text-sm">
                  <Row label="Valor financiado" value={formatMZN(sim.principal)} />
                  <Row label="Juros totais" value={formatMZN(sim.interest)} muted />
                  <Row label="Total a pagar" value={formatMZN(sim.total)} bold />
                  <Row label="Prazo" value={`${months} meses`} muted />
                </div>

                <Button className="mt-6 w-full gap-2" onClick={() => scrollToId("interesse")}>
                  <ArrowRight className="h-4 w-4" /> Quero esta proposta
                </Button>
                <a href={`/prestacoes/catalogo?category=${productType}`} className="mt-3 block">
                  <Button variant="outline" className="w-full gap-2">
                    Ver {currentCat.label.toLowerCase()} disponíveis
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  className="mt-2 w-full gap-2 text-[hsl(142_70%_45%)] hover:text-[hsl(142_70%_40%)]"
                  onClick={openWhatsAppShare}
                >
                  <MessageCircle className="h-4 w-4" /> Partilhar no WhatsApp
                </Button>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Valores meramente indicativos. A proposta final depende de análise de crédito e
                  condições da empresa parceira.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="mt-16 scroll-mt-24">
          <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Como vai funcionar</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { icon: Calculator, title: "1. Simule", desc: "Use o simulador para escolher valor, entrada e prazo." },
              { icon: ShieldCheck, title: "2. Candidate-se", desc: "Submeta o pedido. As nossas empresas verificadas analisam." },
              { icon: Wallet, title: "3. Pague mês a mês", desc: "M-Pesa, e-Mola ou Multicaixa, com acompanhamento no seu painel." },
            ].map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <s.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Quando o catálogo abrir, cada empresa terá o seu próprio número de WhatsApp e receberá
            os pedidos diretamente.
          </p>
        </section>

        <section id="interesse" className="mt-16 scroll-mt-24">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="rounded-2xl sm:rounded-3xl border border-border bg-card p-4 sm:p-6 md:p-10"
          >
            <div className="grid gap-8 md:grid-cols-2 md:items-start">
              <div>
                <Calendar className="h-12 w-12 text-primary" />
                <h2 className="mt-4 font-display text-2xl font-bold text-foreground md:text-3xl">
                  Entre na lista de espera
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Preencha o formulário e seja dos primeiros a aceder ao serviço de Vendas a
                  Prestações. A nossa equipa entra em contacto via WhatsApp.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {[
                    "Simulador com taxas por categoria",
                    "Candidatura 100% online",
                    "Pagamentos via M-Pesa, e-Mola e Multicaixa",
                    "Acompanhamento em painel pessoal",
                    "Empresas verificadas e em conformidade",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {submitted ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-accent/40 bg-accent/5 p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-accent" />
                  <h3 className="mt-4 font-display text-xl font-semibold text-foreground">Inscrição registada!</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    A nossa equipa entrará em contacto em breve. Pode também partilhar a simulação
                    diretamente por WhatsApp ou explorar produtos já disponíveis no catálogo.
                  </p>
                  <Button
                    onClick={openWhatsAppShare}
                    className="mt-6 w-full gap-2 bg-[hsl(142_70%_45%)] text-white hover:bg-[hsl(142_70%_40%)]"
                  >
                    <MessageCircle className="h-4 w-4" /> Partilhar simulação no WhatsApp
                  </Button>
                  <a href={`/prestacoes/catalogo?category=${productType}`} className="mt-3 w-full">
                    <Button variant="outline" className="w-full gap-2">
                      Ver {currentCat.label.toLowerCase()} no catálogo <ArrowRight className="h-4 w-4" />
                    </Button>
                  </a>
                  <button
                    type="button"
                    className="mt-3 text-xs text-muted-foreground hover:text-foreground"
                    onClick={resetForm}
                  >
                    Submeter outro pedido
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-background/40 p-6">
                  <div className="space-y-2">
                    <Label htmlFor="lead-name">Nome completo *</Label>
                    <Input
                      id="lead-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="O seu nome"
                      maxLength={120}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-whatsapp">WhatsApp *</Label>
                    <Input
                      id="lead-whatsapp"
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+258 84 000 0000"
                      maxLength={20}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-product">Tipo de produto *</Label>
                    <Select value={productType} onValueChange={handleCategoryChange}>
                      <SelectTrigger id="lead-product"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    Da simulação: <strong className="text-foreground">{formatMZN(value)}</strong> em{" "}
                    <strong className="text-foreground">{months}m</strong> →{" "}
                    <strong className="text-foreground">{formatMZN(sim.monthly)}</strong>/mês
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-notes">Notas (opcional)</Label>
                    <Textarea
                      id="lead-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Conte-nos o que procura..."
                      maxLength={500}
                      rows={3}
                    />
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    {submitting ? "A enviar..." : "Entrar na lista de espera"}
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`${bold ? "font-display text-lg font-bold text-foreground" : muted ? "text-muted-foreground" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
