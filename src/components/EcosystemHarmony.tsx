import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, HandCoins, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ECOSYSTEM_PILLARS,
  formatMZN,
  getEcosystemPulse,
  type EcosystemPulse,
} from "@/lib/monetization";

/** Posições dos 5 pilares numa roda (percentagens) — ordem: topo, direita-baixo, baixo-esquerda... */
const POSITIONS = [
  { x: 50, y: 6 },
  { x: 92, y: 38 },
  { x: 76, y: 88 },
  { x: 24, y: 88 },
  { x: 8, y: 38 },
];

const FALLBACK_PULSE: EcosystemPulse = {
  active_raffles: 0,
  active_contests: 0,
  active_tournaments: 0,
  prize_pool: 0,
  members: 0,
  businesses: 0,
  creators_net: 0,
  platform_commissions: 0,
  earnings_records: 0,
};

export default function EcosystemHarmony() {
  const [pulse, setPulse] = useState<EcosystemPulse>(FALLBACK_PULSE);

  useEffect(() => {
    let alive = true;
    getEcosystemPulse().then((p) => {
      if (alive && p) setPulse({ ...FALLBACK_PULSE, ...p });
    });
    return () => {
      alive = false;
    };
  }, []);

  const hasLife =
    pulse.active_raffles + pulse.active_contests + pulse.active_tournaments > 0;

  const stats = [
    { label: "Sorteios ativos", value: pulse.active_raffles },
    { label: "Concursos", value: pulse.active_contests },
    { label: "Campeonatos", value: pulse.active_tournaments },
    { label: "Empresas & criadores", value: pulse.businesses },
  ];

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-14 md:py-20">
      {/* brilho de fundo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="text-center">
        <Badge className="mb-4 border-emerald-400/40 bg-emerald-400/10 px-4 py-1.5 text-emerald-300">
          <HeartPulse className="mr-1.5 h-4 w-4" /> Ecossistema em harmonia
        </Badge>
        <h2 className="text-3xl font-black md:text-5xl">
          Tudo ligado. <span className="bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">Todos ganham.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-slate-300 md:text-base">
          Os pontos que ganha a jogar alimentam os sorteios; os sorteios dão palco às
          empresas; as empresas criam campeonatos e concursos; e cada transação sustenta
          a plataforma com uma comissão mínima e transparente.
        </p>
      </div>

      {/* ---------- RODA DE VALOR ---------- */}
      <div className="relative mx-auto mt-12 max-w-xl lg:max-w-2xl">
        <div className="relative aspect-square w-full">
          {/* anel */}
          <div className="absolute inset-[14%] rounded-full border border-dashed border-white/15" />
          <motion.div
            className="absolute inset-[14%] rounded-full border border-emerald-400/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
          </motion.div>

          {/* centro: Bateu */}
          <a
            href="/negocios"
            className="group absolute left-1/2 top-1/2 flex h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-slate-900 via-[#161030] to-slate-900 text-center shadow-2xl transition-transform hover:scale-105"
          >
            <HandCoins className="mb-1 h-6 w-6 text-emerald-300 md:h-8 md:w-8" />
            <span className="text-sm font-black tracking-wide md:text-base">BATEU</span>
            <span className="px-2 text-[10px] leading-tight text-slate-400 md:text-xs">
              comissão justa {`·`} tudo em equilíbrio
            </span>
          </a>

          {/* pilares à volta */}
          {ECOSYSTEM_PILLARS.map((p, i) => {
            const pos = POSITIONS[i % POSITIONS.length];
            return (
              <motion.a
                key={p.id}
                href={p.href}
                initial={{ opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.09, type: "spring", stiffness: 260, damping: 18 }}
                whileHover={{ scale: 1.1 }}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                className="absolute flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-center shadow-xl backdrop-blur transition-colors hover:border-emerald-300/50 md:h-24 md:w-24"
              >
                <span className="text-2xl md:text-3xl">{p.icon}</span>
                <span className="mt-1 px-1 text-[10px] font-bold leading-tight text-white md:text-xs">{p.name}</span>
              </motion.a>
            );
          })}
        </div>

        {/* pulso vivo */}
        <div
          className={`mx-auto mt-6 flex max-w-md items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${
            hasLife
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-white/10 bg-white/5 text-slate-400"
          }`}
        >
          <motion.span
            className={`h-2 w-2 rounded-full ${hasLife ? "bg-emerald-400" : "bg-slate-500"}`}
            animate={hasLife ? { scale: [1, 1.6, 1], opacity: [1, 0.6, 1] } : {}}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          {hasLife
            ? `${pulse.active_raffles + pulse.active_contests + pulse.active_tournaments} eventos ativos agora — o ecossistema está a pulsar`
            : "Aquecendo o ecossistema — os primeiros eventos chegam já"}
        </div>
      </div>

      {/* ---------- MÉTRICAS VIVAS ---------- */}
      <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center"
          >
            <div className="text-2xl font-extrabold md:text-3xl">{s.value.toLocaleString("pt-PT")}</div>
            <div className="mt-1 text-xs text-slate-400">{s.label}</div>
          </motion.div>
        ))}
      </div>
      {pulse.creators_net > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400">
          💚 {formatMZN(pulse.creators_net)} distribuídos a criadores e empresas até hoje
        </p>
      )}

      {/* ---------- CTA ---------- */}
      <div className="mt-10 text-center">
        <Button asChild size="lg" className="h-12 bg-gradient-to-r from-emerald-500 to-teal-500 px-8 text-base font-bold shadow-lg shadow-emerald-500/25">
          <a href="/negocios">
            Ganhe dinheiro com a Bateu <ArrowRight className="ml-2 h-5 w-5" />
          </a>
        </Button>
        <p className="mt-3 text-xs text-slate-400">Vendas · Concursos · Sorteios · Campeonatos · Desafios — tudo num só lugar</p>
      </div>
    </section>
  );
}
