import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Gavel, Timer, TrendingUp, Eye, Heart, Search, ShieldCheck, MapPin,
  Flame, CalendarClock, CheckCircle2, Wallet, Zap, Users, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSEO } from "@/hooks/useSEO";
import {
  listLeiloes, subscribeLeiloes, tempoRestante, corStatus, getMeuSaldo,
  LEILAO_CATEGORIAS, LEILAO_STATUS_LABEL, categoriaEmoji, categoriaLabel,
  type Leilao, type LeilaoStatus, type LeilaoCategoria,
} from "@/lib/leiloes";
import { formatMZN } from "@/lib/currency";

/**
 * Leilões — Casa de Leilões ao Vivo da Bateu.
 * Itens raros do mundo, créditos, pacotes de dados, bens de empresas
 * e exclusivos. Lances em tempo real, anti-snipe e compra imediata.
 * Jogável sem registo (saldo demo), como nos jogos da plataforma.
 */

const ACCENT = "#ff7b00";
const ACCENT2 = "#fbbf24";

type Aba = "ao_vivo" | "terminando" | "agendados" | "terminados";

function CardLeilao({ l, index, navigate }: { l: Leilao; index: number; navigate: (p: string) => void }) {
  const cor = corStatus(l.status);
  const terminado = l.status === "terminado";
  const ehMeu = l.maior_licitador !== null && l.lances[0]?.is_minha === true;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24), duration: 0.35 }}
      onClick={() => navigate(`/leiloes/${l.slug || l.id}`)}
      className="relative rounded-2xl overflow-hidden cursor-pointer group"
      style={{
        background: "linear-gradient(160deg, #100a04 0%, #150d06 55%, #0d0803 100%)",
        border: `1px solid ${l.destaque ? "rgba(255,123,0,0.45)" : "rgba(255,123,0,0.18)"}`,
        boxShadow: l.destaque ? "0 10px 40px rgba(255,123,0,0.12)" : "0 8px 30px rgba(0,0,0,0.45)",
        minHeight: 210,
      }}
      role="link"
      aria-label={l.titulo}
      data-testid="leilao-card"
    >
      {/* faixa de estado */}
      <div className="absolute top-0 left-0 right-0 h-0.5 z-10" style={{ background: `linear-gradient(90deg, transparent, ${cor}, transparent)` }} />

      <div className="p-4 flex gap-4">
        {/* emoji de capa */}
        <div
          className="shrink-0 h-16 w-16 rounded-2xl flex items-center justify-center text-3xl"
          style={{ background: "rgba(255,123,0,0.08)", border: "1px solid rgba(255,123,0,0.22)" }}
        >
          {l.imagem_emoji}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span
              className="text-[9px] font-black uppercase tracking-[0.14em] px-2 py-0.5 rounded-md flex items-center gap-1"
              style={{ color: cor, background: `${cor}14`, border: `1px solid ${cor}44` }}
              data-testid="leilao-status"
            >
              {l.status === "terminando" && <Flame className="h-2.5 w-2.5" />}
              {l.status === "agendado" && <CalendarClock className="h-2.5 w-2.5" />}
              {LEILAO_STATUS_LABEL[l.status]}
            </span>
            <span className="text-[10px] text-zinc-500">{categoriaEmoji(l.categoria)} {categoriaLabel(l.categoria)}</span>
            {l.destaque && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ color: ACCENT2, background: "rgba(251,191,36,0.1)" }}>
                ★ DESTAQUE
              </span>
            )}
          </div>

          <h3 className="text-[15px] font-black text-white leading-snug line-clamp-2 group-hover:text-orange-300 transition-colors">
            {l.titulo}
          </h3>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                {terminado ? "Vendido por" : "Lance atual"}
              </div>
              <div className="text-lg font-black" style={{ color: ACCENT }}>
                {formatMZN(l.lance_atual)}
              </div>
            </div>
            {!terminado && (
              <div className="text-right">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Termina em</div>
                <div className="text-sm font-black font-mono tabular-nums" style={{ color: cor }} data-testid="leilao-timer">
                  <Timer className="inline h-3 w-3 mr-1 -mt-0.5" />
                  {l.status === "agendado" ? "—" : tempoRestante(l.ends_at)}
                </div>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1"><Gavel className="h-3 w-3" /> {l.lances.length} lances</span>
            <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {l.visualizacoes}</span>
            <span className="inline-flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" /> {l.localizacao}</span>
            {ehMeu && (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-400 ml-auto shrink-0">
                <CheckCircle2 className="h-3 w-3" /> É teu lance!
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function Leiloes() {
  useSEO({ title: "Leilões ao Vivo — Bateu", description: "Licita em itens raros do mundo, créditos, pacotes de dados e bens de empresas. Leilões ao vivo com lances em tempo real na Bateu.", canonicalPath: "/leiloes" });
  const navigate = useNavigate();
  const [, force] = useState(0);
  useEffect(() => subscribeLeiloes(() => force((n) => n + 1)), []);
  const leiloes = useMemo(() => listLeiloes(), [force]);
  const [aba, setAba] = useState<Aba>("ao_vivo");
  const [pesquisa, setPesquisa] = useState("");
  const [cat, setCat] = useState<LeilaoCategoria | "todas">("todas");

  const saldo = getMeuSaldo();

  const porAba = useMemo(() => {
    const grupos: Record<Aba, Leilao[]> = { ao_vivo: [], terminando: [], agendados: [], terminados: [] };
    for (const l of leiloes) {
      if (l.status === "terminando") grupos.terminando.push(l);
      else if (l.status === "ao_vivo") grupos.ao_vivo.push(l);
      else if (l.status === "agendado") grupos.agendados.push(l);
      else if (l.status === "terminado") grupos.terminados.push(l);
    }
    return grupos;
  }, [leiloes]);

  const filtrados = useMemo(() => {
    let base = porAba[aba];
    if (cat !== "todas") base = base.filter((l) => l.categoria === cat);
    const q = pesquisa.trim().toLowerCase();
    if (q) base = base.filter((l) => l.titulo.toLowerCase().includes(q) || l.tags.some((t) => t.includes(q)));
    return base;
  }, [porAba, aba, cat, pesquisa]);

  const totalLances = leiloes.reduce((acc, l) => acc + l.lances.length, 0);
  const aoVivoCount = porAba.ao_vivo.length + porAba.terminando.length;

  const abas: { id: Aba; label: string; n: number }[] = [
    { id: "terminando", label: "Termina já", n: porAba.terminando.length },
    { id: "ao_vivo", label: "Ao Vivo", n: porAba.ao_vivo.length },
    { id: "agendados", label: "Agendados", n: porAba.agendados.length },
    { id: "terminados", label: "Terminados", n: porAba.terminados.length },
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: "var(--area-bg, #060608)" }}>
      {/* ─── HERO ─── */}
      <section
        className="relative overflow-hidden pt-10 pb-8 px-4 sm:px-6"
        style={{ background: `radial-gradient(ellipse 70% 90% at 50% -10%, ${ACCENT}1f, transparent 60%), linear-gradient(180deg, #0a0705, #060608)` }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2.5 w-2.5">
              {aoVivoCount > 0 && <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: "#2ea043" }} />}
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: aoVivoCount > 0 ? "#2ea043" : "#71717a" }} />
            </span>
            <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
              Casa de Leilões · {aoVivoCount} ao vivo agora
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Leilões <span style={{ color: ACCENT }}>ao Vivo</span> ⚡
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-400 max-w-2xl">
            Itens raros do Bateu World, pacotes de dados de qualquer operadora, créditos e bens de empresas.
            Lances em tempo real, <strong className="text-white">anti-snipe</strong> de 15s e <strong className="text-white">compra imediata</strong>.
          </p>

          {/* stats */}
          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 max-w-lg">
            {[
              { icon: Gavel, label: "Lances hoje", v: totalLances },
              { icon: Users, label: "Licitadores", v: 14 },
              { icon: Wallet, label: "Teu saldo", v: saldo, money: true },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <s.icon className="h-4 w-4 mb-1" style={{ color: ACCENT }} />
                <div className="text-base sm:text-lg font-black leading-none">{s.money ? formatMZN(s.v) : s.v}</div>
                <div className="text-[10px] text-zinc-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FILTROS ─── */}
      <div className="sticky top-0 z-30 px-4 sm:px-6 py-3 backdrop-blur-xl" style={{ background: "rgba(6,6,8,0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                placeholder="Procurar leilão…"
                className="pl-9 bg-white/5 border-white/10 text-sm"
                aria-label="Procurar leilão"
              />
            </div>
            <div className="ml-auto hidden sm:flex items-center gap-1.5 text-xs text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Lances protegidos por anti-snipe
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {abas.map((a) => (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className="shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: aba === a.id ? `${ACCENT}1f` : "rgba(255,255,255,0.04)",
                  color: aba === a.id ? ACCENT : "#a1a1aa",
                  border: `1px solid ${aba === a.id ? `${ACCENT}55` : "rgba(255,255,255,0.08)"}`,
                }}
                data-testid={`aba-${a.id}`}
              >
                {a.label} ({a.n})
              </button>
            ))}
            <span className="w-px bg-white/10 mx-1 shrink-0" />
            <button
              onClick={() => setCat("todas")}
              className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ background: cat === "todas" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)", color: cat === "todas" ? "#fff" : "#a1a1aa" }}
            >
              Todas
            </button>
            {LEILAO_CATEGORIAS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap"
                style={{
                  background: cat === c.id ? `${ACCENT}1f` : "rgba(255,255,255,0.04)",
                  color: cat === c.id ? ACCENT : "#a1a1aa",
                  border: `1px solid ${cat === c.id ? `${ACCENT}55` : "rgba(255,255,255,0.08)"}`,
                }}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── LISTA ─── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24">
        {filtrados.length === 0 ? (
          <div className="text-center py-20">
            <Gavel className="h-12 w-12 mx-auto text-zinc-700 mb-4" />
            <h3 className="text-lg font-black text-zinc-400">Sem leilões nesta secção</h3>
            <p className="text-sm text-zinc-600 mt-1">Volta em breve — novos leilões abrem todos os dias às 12h e 19h.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="lista-leiloes">
            {filtrados.map((l, i) => (
              <CardLeilao key={l.id} l={l} index={i} navigate={navigate} />
            ))}
          </div>
        )}

        {/* como funciona */}
        <section className="mt-10 rounded-2xl p-5 sm:p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-lg font-black mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5" style={{ color: ACCENT2 }} /> Como funciona
          </h2>
          <div className="grid sm:grid-cols-4 gap-4 text-sm">
            {[
              { n: "1", t: "Licita", d: "Toca em um leilão ao vivo e faz o teu lance com um toque — ou define um auto-bid máximo e deixa o sistema lutar por ti." },
              { n: "2", t: "Anti-snipe", d: "Se alguém licitar nos últimos 30 segundos, o leilão estende 15s. Sem roubar na finalização." },
              { n: "3", t: "Compra imediata", d: "Nem queres arriscar? Paga o preço fixo e leva o item na hora, terminando o leilão." },
              { n: "4", t: "Recebe", d: "Itens digitais em minutos na tua conta; pacotes de dados vão direto para o teu número; bens combinados com o vendedor." },
            ].map((s) => (
              <div key={s.n} className="flex gap-3">
                <div className="shrink-0 h-8 w-8 rounded-xl flex items-center justify-center font-black" style={{ background: `${ACCENT}18`, color: ACCENT }}>{s.n}</div>
                <div>
                  <div className="font-bold text-white">{s.t}</div>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
