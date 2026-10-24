// ═══════════════════════════════════════════════════════════════
// ActivityFeed — atualizações de atividades REAIS da plataforma.
// Fonte única: activityBus (server view + ações locais em tempo real).
// Novos: ligas, leilões, marketplace, jogos e créditos entram no feed.
// Sem dados falsos — se não há nada, diz a verdade.
// ═══════════════════════════════════════════════════════════════
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Activity, Award, Gift, Store, Swords, Trophy, Gavel, ShoppingBag, Gamepad2, Coins, Shield, Radio } from "lucide-react";
import { timeAgo } from "@/lib/stories";
import { useActivityFeed, type ActivityType } from "@/lib/activityBus";

const TYPE_META: Record<string, { icon: typeof Gift; cls: string; label: string }> = {
  raffle: { icon: Gift, cls: "bg-violet-500/15 text-violet-300 border-violet-400/25", label: "Sorteio" },
  winner: { icon: Trophy, cls: "bg-amber-500/15 text-amber-300 border-amber-400/25", label: "Vitória" },
  contest: { icon: Award, cls: "bg-sky-500/15 text-sky-300 border-sky-400/25", label: "Concurso" },
  tournament: { icon: Swords, cls: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25", label: "Torneio" },
  business: { icon: Store, cls: "bg-rose-500/15 text-rose-300 border-rose-400/25", label: "Empresa" },
  live: { icon: Radio, cls: "bg-red-500/15 text-red-300 border-red-400/25", label: "Palco" },
  league: { icon: Shield, cls: "bg-cyan-500/15 text-cyan-300 border-cyan-400/25", label: "Liga" },
  auction: { icon: Gavel, cls: "bg-orange-500/15 text-orange-300 border-orange-400/25", label: "Leilão" },
  market: { icon: ShoppingBag, cls: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/25", label: "Mercado" },
  game: { icon: Gamepad2, cls: "bg-lime-500/15 text-lime-300 border-lime-400/25", label: "Jogo" },
  credit: { icon: Coins, cls: "bg-yellow-500/15 text-yellow-300 border-yellow-400/25", label: "Créditos" },
};

interface Props {
  /** máximo de eventos visíveis */
  limit?: number;
  /** variante compacta para o home mobile */
  compact?: boolean;
  /** testid override */
  testId?: string;
}

export default function ActivityFeed({ limit = 6, compact = false, testId }: Props) {
  const navigate = useNavigate();
  const { items, loaded } = useActivityFeed(limit);

  const visible = items.slice(0, limit);

  return (
    <section className={compact ? "px-4" : "mx-auto max-w-6xl px-4"} data-testid={testId ?? (compact ? "mh-activity" : "activity-feed")}>
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <h2 className={`font-display font-extrabold tracking-tight text-white ${compact ? "text-[17px]" : "text-2xl md:text-3xl"}`}>
          Atividade ao vivo
        </h2>
        <span className="text-[11px] text-zinc-500">· o que está a acontecer agora</span>
      </div>

      {!loaded ? (
        <div className="space-y-2">
          {Array.from({ length: compact ? 3 : 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
          A plataforma está a aquecer — assim que houver sorteios, lances, inscrições em torneios ou empresas novas, aparecem aqui em tempo real.
        </p>
      ) : (
        <div className={compact ? "space-y-2" : "grid gap-3 md:grid-cols-2"}>
          <AnimatePresence initial={false}>
            {visible.map((a, i) => {
              const meta = TYPE_META[a.type as ActivityType] || TYPE_META.raffle;
              const Icon = meta.icon;
              return (
                <motion.button
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.4) }}
                  whileHover={{ y: -2 }}
                  onClick={() => a.href && navigate(a.href)}
                  className={`flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left backdrop-blur transition-colors hover:border-white/25 ${compact ? "" : "md:p-4"}`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${meta.cls}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">{meta.label}</span>
                      <span className="text-[10px] text-zinc-600">{timeAgo(a.created_at)}</span>
                    </span>
                    <span className={`block truncate font-bold text-white ${compact ? "text-[13px]" : "text-sm"}`}>{a.title}</span>
                    {a.detail && !compact && (
                      <span className="mt-0.5 block truncate text-xs text-zinc-400">{a.detail}</span>
                    )}
                  </span>
                  <Activity className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
