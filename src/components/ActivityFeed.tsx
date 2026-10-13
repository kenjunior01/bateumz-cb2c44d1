// ═══════════════════════════════════════════════════════════════
// ActivityFeed — atualizações de atividades REAIS da plataforma.
// Sondagem viva (30s) sobre a view `platform_recent_activity`:
// novos sorteios, vencedores, concursos, campeonatos e empresas
// a entrar no ecossistema. Sem dados falsos — se não há nada,
// diz a verdade.
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Activity, Award, Gift, Store, Swords, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/stories";

interface ActivityRow {
  type: string;
  title: string;
  detail: string | null;
  href: string | null;
  created_at: string;
}

const TYPE_META: Record<string, { icon: typeof Gift; cls: string; label: string }> = {
  raffle: { icon: Gift, cls: "bg-violet-500/15 text-violet-300 border-violet-400/25", label: "Sorteio" },
  winner: { icon: Trophy, cls: "bg-amber-500/15 text-amber-300 border-amber-400/25", label: "Vitória" },
  contest: { icon: Award, cls: "bg-sky-500/15 text-sky-300 border-sky-400/25", label: "Concurso" },
  tournament: { icon: Swords, cls: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25", label: "Campeonato" },
  business: { icon: Store, cls: "bg-rose-500/15 text-rose-300 border-rose-400/25", label: "Empresa" },
};

interface Props {
  /** máximo de eventos visíveis */
  limit?: number;
  /** variante compacta para o home mobile */
  compact?: boolean;
}

export default function ActivityFeed({ limit = 6, compact = false }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        // v16: view criada por migration no Supabase — o gerador de tipos local
        // ainda não a conhece, por isso o acesso é feito sem tipagem estrita
        const { data, error } = await (supabase as any)
          .from("platform_recent_activity")
          .select("type, title, detail, href, created_at")
          .order("created_at", { ascending: false })
          .limit(20);
        if (alive) {
          setItems(error ? [] : ((data as ActivityRow[]) || []));
          setLoaded(true);
        }
      } catch {
        if (alive) setLoaded(true); // estado honesto mesmo sem BD
      }
    };
    load();
    const iv = setInterval(load, 30_000); // atualizações ao vivo
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const visible = items.slice(0, limit);

  return (
    <section className={compact ? "px-4" : "mx-auto max-w-6xl px-4"} data-testid={compact ? "mh-activity" : "activity-feed"}>
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
          A plataforma está a aquecer — assim que houver sorteios, vencedores ou empresas novas, aparecem aqui em tempo real.
        </p>
      ) : (
        <div className={compact ? "space-y-2" : "grid gap-3 md:grid-cols-2"}>
          <AnimatePresence initial={false}>
            {visible.map((a, i) => {
              const meta = TYPE_META[a.type] || TYPE_META.raffle;
              const Icon = meta.icon;
              return (
                <motion.button
                  key={`${a.type}-${a.href}-${a.created_at}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.4) }}
                  whileHover={{ y: -2 }}
                  onClick={() => a.href && navigate(a.href)}
                  className={`flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left backdrop-blur transition-colors hover:border-white/25 ${compact ? "" : "md:p-4"}`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${meta.cls}`}>
                    <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
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
