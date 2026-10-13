import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, BadgeCheck, Banknote, Calculator, Check, Gamepad2, Gift, HandCoins,
  LineChart, Loader2, ShieldCheck, Sparkles, Store, Swords, Trophy, Wallet, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DEFAULT_COMMISSIONS,
  ECOSYSTEM_PILLARS,
  computeSplit,
  formatMZN,
  getCommissionConfig,
  getEcosystemPulse,
  getMySubscription,
  getPlansConfig,
  isSubscriptionActive,
  subscribeCompany,
  type CommissionConfig,
  type CompanySubscription,
  type EcosystemPulse,
  type EarningSource,
  type PlatformPlan,
  type PlanKey,
} from "@/lib/monetization";
import { getWallet } from "@/lib/wallet";

const PILLAR_TABLE: { source: EarningSource; label: string; example: string }[] = [
  { source: "raffle", label: "Sorteios", example: "Bilhetes vendidos no seu sorteio" },
  { source: "contest", label: "Concursos", example: "Taxas de inscrição dos participantes" },
  { source: "tournament", label: "Campeonatos", example: "Inscrições nos torneios que criar" },
  { source: "sale", label: "Vendas & Prestações", example: "Vendas do seu catálogo e prestações" },
  { source: "esports", label: "Duelos & Esports", example: "Duelos P2P da sua marca" },
];

const STEPS = [
  { icon: BadgeCheck, title: "1 · Crie a conta", text: "O registo é grátis — pessoas usam a plataforma toda para os seus fins, sem pagar nada." },
  { icon: Store, title: "2 · Ative a mensalidade", text: "Só empresas pagam: escolha o plano Empresarial ou Corporativo e pague com o saldo da carteira." },
  { icon: Sparkles, title: "3 · Lance o evento", text: "Sorteios, concursos, campeonatos, loja e stories comerciais — 0% de comissão sobre tudo o que vende." },
  { icon: Banknote, title: "4 · Receba tudo", text: "O que vende é 100% seu. Levante por M-Pesa, e-Mola ou PayPal quando quiser." },
];

export default function BusinessEcosystem() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<CommissionConfig>({ ...DEFAULT_COMMISSIONS });
  const [pulse, setPulse] = useState<EcosystemPulse | null>(null);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [sub, setSub] = useState<CompanySubscription | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null);
  const [pillar, setPillar] = useState<EarningSource>("raffle");
  const [units, setUnits] = useState(500);
  const [unitPrice, setUnitPrice] = useState(50);

  useEffect(() => {
    getCommissionConfig().then(setCommissions);
    getEcosystemPulse().then(setPulse);
    getPlansConfig().then(setPlans);
  }, []);

  useEffect(() => {
    if (!user) return;
    getMySubscription(user.id).then(setSub);
    getWallet(user.id).then((w) => setBalance(w ? Number(w.balance) : null));
  }, [user]);

  const gross = useMemo(() => units * unitPrice, [units, unitPrice]);
  const split = useMemo(() => computeSplit(gross, pillar, commissions), [gross, pillar, commissions]);

  const handleSubscribe = async (plan: PlatformPlan) => {
    if (!user) {
      toast.info("Crie a sua conta grátis primeiro — a mensalidade é só para empresas");
      window.location.href = "/register";
      return;
    }
    if (plan.key === "free") {
      toast.success("O plano Grátis é automático — desfrute da plataforma!");
      return;
    }
    setBusyPlan(plan.key);
    const res = await subscribeCompany(plan.key);
    setBusyPlan(null);
    if (res.ok) {
      toast.success(`${plan.name} ativo! Renova a ${res.period_end ? new Date(res.period_end).toLocaleDateString("pt-PT") : "daqui a 30 dias"}`);
      const [s, w] = await Promise.all([getMySubscription(user.id), getWallet(user.id)]);
      setSub(s);
      setBalance(w ? Number(w.balance) : null);
    } else if ((res.error || "").includes("Saldo")) {
      toast.error("Saldo insuficiente — carregue a carteira para pagar a mensalidade");
      window.location.href = "/wallet";
    } else {
      toast.error(res.error || "Não foi possível subscrever");
    }
  };

  const stats = [
    { label: "Sorteios ativos", value: pulse ? pulse.active_raffles : 0, icon: Gift },
    { label: "Concursos ativos", value: pulse ? pulse.active_contests : 0, icon: Trophy },
    { label: "Campeonatos ativos", value: pulse ? pulse.active_tournaments : 0, icon: Swords },
    { label: "Empresas no ecossistema", value: pulse ? pulse.businesses : 0, icon: Store },
  ];

  const pillarMeta = ECOSYSTEM_PILLARS.find((p) => p.id === pillar);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#120b26] to-[#0b0a18] text-white">
      <Navbar />

      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden px-4 pt-28 pb-14 md:pt-36 md:pb-20">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -top-24 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-violet-600/30 blur-3xl" />
          <div className="absolute bottom-0 left-10 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge className="mb-5 border-emerald-400/40 bg-emerald-400/10 px-4 py-1.5 text-emerald-300">
              <HandCoins className="mr-1.5 h-4 w-4" /> Empresas pagam mensalidade · todos os outros usam grátis
            </Badge>
            <h1 className="text-4xl font-black leading-tight md:text-6xl">
              Venda sem dar{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
                um único porcento
              </span>{" "}
              do que ganha
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-slate-300 md:text-lg">
              A Bateu sustenta-se com uma mensalidade simples das empresas — e é só isso.
              Pessoas jogam, participam e criam de graça; empresas vendem, promovem e
              arrecadam 100% do que produzem, com 0% de comissão.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="h-12 bg-gradient-to-r from-emerald-500 to-teal-500 px-8 text-base font-bold text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400">
              <a href="#planos">
                Ver planos e mensalidades <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-white/20 bg-white/5 px-8 text-base text-white hover:bg-white/10">
              <a href="#calculadora"><Calculator className="mr-2 h-5 w-5" /> Simular os meus ganhos</a>
            </Button>
          </motion.div>

          {/* estado da assinatura */}
          {user && sub && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="mx-auto mt-8 flex max-w-md items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm"
              data-testid="sub-status"
            >
              <BadgeCheck className="h-4 w-4 text-emerald-300" />
              Plano atual: <strong className="text-emerald-300">{sub.plan_key === "free" ? "Grátis" : sub.plan_key === "business" ? "Empresarial" : "Corporativa"}</strong>
              {sub.plan_key !== "free" && isSubscriptionActive(sub) && (
                <span className="text-slate-300">· renova a {new Date(sub.current_period_end).toLocaleDateString("pt-PT")}</span>
              )}
            </motion.div>
          )}
          {user && balance !== null && (
            <p className="mt-2 text-xs text-slate-400" data-testid="wallet-balance-line">
              Saldo da carteira: <strong className="text-white">{formatMZN(balance)}</strong> — carregue em <a className="underline hover:text-emerald-300" href="/wallet">/wallet</a>
            </p>
          )}
        </div>
      </section>

      {/* ---------- PULSO DO ECOSSISTEMA ---------- */}
      <section className="px-4 pb-8">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.94 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur"
            >
              <s.icon className="mx-auto mb-2 h-5 w-5 text-emerald-300" />
              <div className="text-2xl font-extrabold md:text-3xl">{s.value.toLocaleString("pt-PT")}</div>
              <div className="mt-1 text-xs text-slate-400">{s.label}</div>
            </motion.div>
          ))}
        </div>
        {pulse && (pulse.creators_net > 0 || (pulse.business_subscribers ?? 0) > 0) && (
          <p className="mt-3 text-center text-xs text-slate-400" data-testid="pulse-line">
            💚 {formatMZN(pulse.creators_net)} já arrecadados por criadores e empresas
            {(pulse.business_subscribers ?? 0) > 0 && <> · {pulse.business_subscribers} empresa(s) subscritas sustentam o ecossistema</>}
          </p>
        )}
      </section>

      {/* ---------- PLANOS — A MENSALIDADE ---------- */}
      <section id="planos" className="scroll-mt-20 px-4 py-12" data-testid="plans-section">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-extrabold md:text-4xl">
            Uma mensalidade. <span className="text-emerald-300">Zero comissões.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-300 md:text-base">
            Pessoas não pagam nada — nunca. Empresas pagam uma mensalidade fixa e ficam com
            100% de tudo o que vendem: cada bilhete, cada inscrição, cada venda.
          </p>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {(plans.length ? plans : []).map((plan, i) => {
              const isCurrent = sub?.plan_key === plan.key && isSubscriptionActive(sub);
              const highlight = plan.key === "business";
              return (
                <motion.div
                  key={plan.key}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.45 }}
                  className={`relative flex flex-col rounded-3xl border p-6 backdrop-blur ${
                    highlight ? "border-emerald-400/40 bg-emerald-400/[0.07] shadow-lg shadow-emerald-500/10" : "border-white/10 bg-white/5"
                  }`}
                  data-testid={`plan-card-${plan.key}`}
                >
                  {highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
                      Mais escolhido
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black">{plan.name}</h3>
                    {isCurrent && <Badge className="bg-emerald-500/20 text-emerald-300">O seu plano</Badge>}
                  </div>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-4xl font-black">{plan.price === 0 ? "0 MT" : formatMZN(plan.price)}</span>
                    <span className="text-sm text-slate-400">/mês</span>
                  </div>
                  <p className="mt-1.5 min-h-[2.5rem] text-xs text-slate-400">{plan.tagline}</p>
                  <ul className="mt-4 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-200">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={busyPlan !== null || isCurrent}
                    className={`mt-6 h-11 w-full font-bold ${
                      highlight
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25"
                        : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                    data-testid={`plan-cta-${plan.key}`}
                  >
                    {busyPlan === plan.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      "Ativo ✓"
                    ) : plan.key === "free" ? (
                      "Grátis para sempre"
                    ) : (
                      <>Pagar com a carteira <Wallet className="ml-1.5 h-4 w-4" /></>
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            A mensalidade paga-se com o saldo da carteira Bateu e renoma a cada 30 dias — cancele quando quiser, sem multas.
          </p>
        </div>
      </section>

      {/* ---------- OS 5 PILARES EM HARMONIA ---------- */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-extrabold md:text-4xl">
            Cinco pilares, <span className="text-emerald-300">um só ecossistema</span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-300 md:text-base">
            Cada pilar alimenta os outros: quem joga ganha pontos, quem ganha pontos participa,
            quem participa dá visibilidade às empresas — e todos ganham em harmonia.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ECOSYSTEM_PILLARS.map((p, i) => (
              <motion.a
                key={p.id}
                href={p.href}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur transition-colors hover:border-emerald-300/40"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${p.color}`} />
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${p.color} text-2xl shadow-lg`}>
                  {p.icon}
                </div>
                <h3 className="text-lg font-bold">{p.name}</h3>
                <p className="mt-1.5 min-h-[3.5rem] text-sm text-slate-300">{p.tagline}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-300">
                  Aceder <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CALCULADORA DE GANHOS ---------- */}
      <section id="calculadora" className="scroll-mt-20 px-4 py-12">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
          <div className="grid lg:grid-cols-2">
            <div className="p-6 md:p-10">
              <Badge className="mb-4 bg-sky-400/10 text-sky-300"><Zap className="mr-1 h-3.5 w-3.5" /> Simulador transparente</Badge>
              <h2 className="text-2xl font-extrabold md:text-3xl">Quanto posso ganhar?</h2>
              <p className="mt-2 text-sm text-slate-300">
                Escolha o pilar, arraste os valores e veja quanto chega à sua carteira.
                Sem comissões escondidas: o que simula é o que recebe.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {PILLAR_TABLE.map((c) => (
                  <button
                    key={c.source}
                    onClick={() => setPillar(c.source)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                      pillar === c.source
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="mt-7 space-y-6">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">
                      {pillar === "raffle" ? "Bilhetes a vender" : pillar === "contest" || pillar === "tournament" ? "Inscrições" : "Unidades vendidas"}
                    </span>
                    <span className="font-bold text-white">{units}</span>
                  </div>
                  <input
                    type="range" min={10} max={5000} step={10} value={units}
                    onChange={(e) => setUnits(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-300">
                      {pillar === "raffle" ? "Preço por bilhete" : "Valor por inscrição / unidade"}
                    </span>
                    <span className="font-bold text-white">{formatMZN(unitPrice)}</span>
                  </div>
                  <input
                    type="range" min={5} max={2000} step={5} value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>
            </div>

            {/* Resultado */}
            <div className="flex flex-col justify-center border-t border-white/10 bg-gradient-to-br from-emerald-500/10 via-transparent to-sky-500/10 p-6 md:p-10 lg:border-l lg:border-t-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Arrecadação bruta</span>
                  <span className="text-xl font-bold text-white">{formatMZN(split.gross)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Comissão da plataforma ({split.percent}%)</span>
                  <span className="font-semibold text-emerald-300">0 MT — sempre</span>
                </div>
                <div className="my-2 border-t border-dashed border-white/15" />
                <div className="rounded-2xl bg-emerald-500/15 p-5 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Você fica com</div>
                  <div className="mt-1 text-4xl font-black text-emerald-300 md:text-5xl" data-testid="calc-net">{formatMZN(split.net)}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    via {pillarMeta?.name ?? "ecossistema"} · saque por M-Pesa, e-Mola ou PayPal
                  </div>
                </div>
                <Progress value={100} className="h-2" />
                <p className="text-center text-xs text-slate-400">
                  100% do valor criado é seu — quem sustenta a plataforma são as mensalidades das empresas, não o seu bolso.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- COMO FUNCIONA ---------- */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-extrabold md:text-4xl">Do zero ao primeiro ganho</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                className="relative rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg">
                  <s.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- TABELA DE CUSTOS ---------- */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-extrabold md:text-4xl">
            Custos <span className="text-emerald-300">100% transparentes</span>
          </h2>
          <p className="mt-3 text-center text-sm text-slate-300">
            Uma tabela, zero surpresas. Quem vende não paga comissão — a mensalidade é o único custo.
          </p>
          <div className="mt-8 overflow-hidden rounded-3xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/10 text-xs uppercase tracking-wide text-slate-300">
                <tr>
                  <th className="px-5 py-4">Pilar</th>
                  <th className="px-5 py-4">De onde vem o dinheiro</th>
                  <th className="px-5 py-4 text-right">Comissão Bateu</th>
                </tr>
              </thead>
              <tbody>
                {PILLAR_TABLE.map((c) => (
                  <tr key={c.source} className="border-t border-white/5 bg-white/[0.03]">
                    <td className="px-5 py-4 font-semibold">{c.label}</td>
                    <td className="px-5 py-4 text-slate-300">{c.example}</td>
                    <td className="px-5 py-4 text-right">
                      <Badge className="bg-emerald-500/15 text-emerald-300" data-testid={`fee-${c.source}`}>0%</Badge>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-white/5 bg-white/[0.03]">
                  <td className="px-5 py-4 font-semibold">Jogar & criar</td>
                  <td className="px-5 py-4 text-slate-300">Grátis para pessoas — jogos, stories, concursos e eventos gratuitos</td>
                  <td className="px-5 py-4 text-right"><Badge className="bg-sky-500/15 text-sky-300">0 MT</Badge></td>
                </tr>
                <tr className="border-t border-white/5 bg-white/[0.03]">
                  <td className="px-5 py-4 font-semibold">Empresas</td>
                  <td className="px-5 py-4 text-slate-300">Mensalidade fixa — Empresarial 1.500 MT/mês · Corporativa 4.500 MT/mês</td>
                  <td className="px-5 py-4 text-right"><Badge className="bg-amber-500/15 text-amber-300">mensal</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------- SAQUE & CONFIANÇA ---------- */}
      <section className="px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {[
            { icon: Wallet, t: "Carteira à vista", d: "Cada inscrição, bilhete ou venda entra na sua carteira por inteiro — consultável a qualquer momento." },
            { icon: ShieldCheck, t: "Pagamentos locais", d: "Levante por M-Pesa, e-Mola, PayPal ou transferência — métodos verificados e aprovação rápida pela equipa regional." },
            { icon: Gamepad2, t: "Tráfego incluído", d: "O feed, os stories, as lives e o Mundo 3D promovem os seus eventos automaticamente — não precisa de audiência própria para começar." },
          ].map((f, i) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <f.icon className="mb-4 h-8 w-8 text-emerald-300" />
              <h3 className="text-lg font-bold">{f.t}</h3>
              <p className="mt-2 text-sm text-slate-300">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------- CTA FINAL ---------- */}
      <section className="px-4 pb-20 pt-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-500/15 via-violet-500/10 to-sky-500/15 p-8 text-center md:p-14"
        >
          <h2 className="text-3xl font-black md:text-4xl">O ecossistema está vivo. Falta você.</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Jogue de graça, crie de graça — ou traga a sua empresa com uma mensalidade e fique
            com tudo o que ganhar, na plataforma mais equilibrada do país.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 bg-gradient-to-r from-emerald-500 to-teal-500 px-8 font-bold shadow-lg shadow-emerald-500/25">
              <a href={user ? "/dashboard" : "/register"}>
                {user ? "Ir para o painel" : "Criar conta grátis"} <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-white/20 bg-white/5 px-8 text-white hover:bg-white/10">
              <a href="/empresas">Ver empresas do ecossistema</a>
            </Button>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
