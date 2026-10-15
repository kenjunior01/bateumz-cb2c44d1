import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Wallet, Zap, Trophy, Crown, Plus, Trash2, Check, TrendingUp,
  Shield, Sparkles, Info, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSEO } from "@/hooks/useSEO";
import { useToast } from "@/hooks/use-toast";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import {
  getJogadoresFantasy, getPapeisFantasy, carregarTimeFantasy, guardarTimeFantasy,
  apagarTimeFantasy, custoTime, pontuarTime, getPontosRondaAoVivo, getLigaFantasy,
  FANTASY_ORCAMENTO, FANTASY_SLOTS, type FantasyJogador, type MeuTimeFantasy,
} from "@/lib/esports-features";
import { formatMZN } from "@/lib/currency";

/**
 * FantasyPage — Fantasy Esports da Bateu.
 * Draft de 5 jogadores com orçamento de 100 créditos fantasy,
 * capitão (x1.5 pontos), pontuação ao vivo da ronda e liga
 * privada contra a comunidade.
 */

const ACCENT = "#00d4ff";
const ACCENT2 = "#7b2ff7";
const GOLD = "#fbbf24";

const PAPEL_COR: Record<string, string> = {
  capitao: GOLD,
  entry: "#ff4655",
  sniper: ACCENT,
  igl: ACCENT2,
  support: "#2ea043",
};

export default function FantasyPage() {
  useSEO({ title: "Fantasy Esports — Bateu", description: "Monta o teu time fantasy da Bateu Pro League: draft com orçamento, capitão x1.5, pontuação ao vivo e liga da comunidade.", canonicalPath: "/esports/fantasy" });
  const { toast } = useToast();
  const { sfx } = useSoundEffects();
  const [, tickState] = useState(0);
  const [aba, setAba] = useState<"draft" | "meu-time" | "liga">("meu-time");

  const [meuTime, setMeuTime] = useState<MeuTimeFantasy | null>(null);
  const [nomeTime, setNomeTime] = useState("");
  const [filtroPapel, setFiltroPapel] = useState<string>("todos");
  const [pesquisa, setPesquisa] = useState("");

  useEffect(() => {
    setMeuTime(carregarTimeFantasy());
    // pontuação ao vivo: tick a cada 30s
    const id = setInterval(() => tickState((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const jogadores = useMemo(() => getJogadoresFantasy(), []);
  const pontos = useMemo(() => getPontosRondaAoVivo(), [tickState]);
  const liga = useMemo(() => getLigaFantasy(), [meuTime, tickState]);

  const selecionados = meuTime?.jogadorIds ?? [];
  const gasto = custoTime(selecionados);
  const restante = FANTASY_ORCAMENTO - gasto;
  const capitao = meuTime?.capitaoId ?? null;
  const pontuacaoAtual = meuTime ? pontuarTime(meuTime, pontos) : null;

  const jogadoresFiltrados = useMemo(() => {
    let base = filtroPapel === "todos" ? jogadores : jogadores.filter((j) => j.papel === filtroPapel);
    const q = pesquisa.trim().toLowerCase();
    if (q) base = base.filter((j) => j.nome.toLowerCase().includes(q) || j.equipa.toLowerCase().includes(q));
    return base;
  }, [jogadores, filtroPapel, pesquisa]);

  const addJogador = (j: FantasyJogador) => {
    if (!meuTime) {
      toast({ title: "Dá primeiro um nome ao teu time ✨", variant: "destructive" });
      return;
    }
    if (selecionados.length >= FANTASY_SLOTS) {
      toast({ title: "Time cheio", description: `Máximo de ${FANTASY_SLOTS} jogadores. Remove um para trocar.`, variant: "destructive" });
      return;
    }
    if (selecionados.includes(j.id)) return;
    if (j.preco > restante) {
      toast({ title: "Orçamento insuficiente", description: `Só tens ${restante.toFixed(1)} disponível.`, variant: "destructive" });
      return;
    }
    if (selecionados.some((id) => jogadores.find((x) => x.id === id)?.equipa === j.equipa && jogadores.find((x) => x.id === id)?.papel === j.papel)) {
      // permitido — sem restrição de equipa, mantém simples
    }
    const novo: MeuTimeFantasy = {
      ...meuTime,
      jogadorIds: [...selecionados, j.id],
      capitaoId: capitao ?? j.id,
    };
    setMeuTime(novo);
    guardarTimeFantasy(novo.nome, novo.jogadorIds, novo.capitaoId);
    sfx.click();
  };

  const removeJogador = (id: string) => {
    if (!meuTime) return;
    const jogadorIds = selecionados.filter((x) => x !== id);
    const capitaoId = capitao === id ? (jogadorIds[0] ?? null) : capitao;
    const novo: MeuTimeFantasy = { ...meuTime, jogadorIds, capitaoId };
    setMeuTime(novo);
    guardarTimeFantasy(novo.nome, novo.jogadorIds, novo.capitaoId);
  };

  const setCapitao = (id: string) => {
    if (!meuTime) return;
    const novo: MeuTimeFantasy = { ...meuTime, capitaoId: id };
    setMeuTime(novo);
    guardarTimeFantasy(novo.nome, novo.jogadorIds, novo.capitaoId);
    toast({ title: "Capitão definido 👑", description: "Este jogador vale x1.5 pontos." });
  };

  const criarTime = () => {
    const nome = nomeTime.trim() || "Time de " + new Date().toLocaleDateString("pt-PT");
    const t = guardarTimeFantasy(nome, [], null);
    setMeuTime(t);
    sfx.success();
    toast({ title: "Time criado! 🎉", description: "Agora faz o teu draft com o orçamento de 100." });
    setAba("draft");
  };

  const guardarFinal = () => {
    if (!meuTime) return;
    if (selecionados.length < FANTASY_SLOTS) {
      toast({ title: "Faltam jogadores", description: `Seleciona ${FANTASY_SLOTS - selecionados.length} mais.`, variant: "destructive" });
      return;
    }
    sfx.win();
    toast({ title: "Time confirmado! 🏆", description: "Boa sorte na ronda — pontua ao vivo nos playoffs." });
    setAba("meu-time");
  };

  const minhaPosicao = liga.findIndex((u) => u.e_eu) + 1;

  return (
    <div className="min-h-screen text-white" style={{ background: "var(--area-bg)" }} data-testid="fantasy-page">
      {/* hero */}
      <section className="px-4 sm:px-6 pt-8 pb-5" style={{ background: `radial-gradient(ellipse 60% 80% at 50% -10%, ${ACCENT2}18, transparent 60%)` }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4" style={{ color: ACCENT2 }} />
            <span className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: ACCENT2 }}>Fantasy · Bateu Pro League</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Fantasy <span style={{ color: ACCENT }}>Esports</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
            Monta o teu time de 5 estrelas com 100 de orçamento, escolhe o capitão (vale x1.5) e acompanha
            os pontos ao vivo durante os playoffs. Sem apostas — estratégia pura.
          </p>

          {/* tabs */}
          <div className="mt-5 flex gap-1.5">
            {[
              { id: "meu-time" as const, label: "O Meu Time" },
              { id: "draft" as const, label: "Draft" },
              { id: "liga" as const, label: "Liga" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => { setAba(t.id); sfx.tabClick(); }}
                className="px-4 py-2 rounded-xl text-xs font-black transition-all"
                style={{
                  background: aba === t.id ? `${ACCENT}1a` : "rgba(255,255,255,0.04)",
                  color: aba === t.id ? ACCENT : "#a1a1aa",
                  border: `1px solid ${aba === t.id ? `${ACCENT}55` : "rgba(255,255,255,0.08)"}`,
                }}
                data-testid={`tab-${t.id}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        {/* ═══ ABA MEU TIME ═══ */}
        {aba === "meu-time" && (
          <div className="space-y-4" data-testid="aba-meu-time">
            {!meuTime ? (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl p-6 sm:p-10 text-center"
                style={{ background: "linear-gradient(160deg, rgba(12,16,28,0.9), rgba(8,10,18,0.9))", border: `1px dashed ${ACCENT}44` }}
              >
                <Users className="h-12 w-12 mx-auto mb-3" style={{ color: ACCENT }} />
                <h2 className="text-xl font-black">Cria o teu time fantasy</h2>
                <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
                  Dá um nome, faz o draft de 5 jogadores e entra na liga da comunidade. Grátis, para sempre.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
                  <Input
                    value={nomeTime}
                    onChange={(e) => setNomeTime(e.target.value)}
                    placeholder="Nome do time (ex.: Guerreiros do Índico)"
                    className="bg-white/5 border-white/10 text-sm text-center"
                    aria-label="Nome do time"
                    data-testid="input-nome-time"
                  />
                  <Button onClick={criarTime} className="font-black shrink-0" style={{ background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, border: "none" }} data-testid="btn-criar-time">
                    <Plus className="h-4 w-4 mr-1" /> Criar time
                  </Button>
                </div>
              </motion.div>
            ) : (
              <>
                {/* cartão do time */}
                <div className="rounded-3xl p-5" style={{ background: "linear-gradient(160deg, rgba(12,16,28,0.95), rgba(8,10,18,0.95))", border: `1px solid ${ACCENT}2e` }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">O teu time</div>
                      <h2 className="text-xl font-black" style={{ color: ACCENT }}>{meuTime.nome}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                      {pontuacaoAtual && (
                        <div className="text-right">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase">Pontos da ronda</div>
                          <div className="text-2xl font-black" style={{ color: GOLD }} data-testid="pontos-ronda">{pontuacaoAtual.total}</div>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { apagarTimeFantasy(); setMeuTime(null); toast({ title: "Time apagado. Podes criar outro." }); }}
                        className="text-zinc-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* barra de orçamento */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] font-bold mb-1.5">
                      <span className="text-zinc-500 inline-flex items-center gap-1"><Wallet className="h-3 w-3" /> {gasto.toFixed(1)} gasto de {FANTASY_ORCAMENTO}</span>
                      <span style={{ color: restante >= 0 ? "#2ea043" : "#ff4655" }}>{restante.toFixed(1)} restante</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (gasto / FANTASY_ORCAMENTO) * 100)}%`, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})` }} />
                    </div>
                  </div>

                  {/* slots */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-2" data-testid="slots-time">
                    {Array.from({ length: FANTASY_SLOTS }).map((_, i) => {
                      const id = selecionados[i];
                      const j = id ? jogadores.find((x) => x.id === id) : null;
                      if (!j) {
                        return (
                          <button
                            key={i}
                            onClick={() => setAba("draft")}
                            className="rounded-xl p-3 text-center border border-dashed border-white/15 hover:border-white/30 transition-colors"
                            style={{ background: "rgba(255,255,255,0.02)", minHeight: 96 }}
                          >
                            <Plus className="h-5 w-5 mx-auto text-zinc-600 mb-1" />
                            <div className="text-[10px] text-zinc-600 font-bold">Slot {i + 1}</div>
                          </button>
                        );
                      }
                      const p = pontuacaoAtual?.detalhe.find((d) => d.id === j.id);
                      const ehCap = capitao === j.id;
                      return (
                        <div
                          key={i}
                          className="rounded-xl p-3 relative"
                          style={{ background: `${PAPEL_COR[j.papel]}0c`, border: `1px solid ${PAPEL_COR[j.papel]}3a` }}
                          data-testid="slot-jogador"
                        >
                          {ehCap && (
                            <span className="absolute -top-2 -right-1 text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: GOLD, color: "#1c1004" }}>
                              CAP x1.5
                            </span>
                          )}
                          <div className="text-2xl text-center">{j.emoji}</div>
                          <div className="text-[11px] font-black text-center truncate mt-1">{j.nome}</div>
                          <div className="text-[9px] text-zinc-500 text-center truncate">{j.equipa}</div>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-sm font-black tabular-nums" style={{ color: GOLD }}>{p?.pontos ?? 0}</span>
                            <div className="flex gap-1">
                              {!ehCap && (
                                <button onClick={() => setCapitao(j.id)} className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: "rgba(251,191,36,0.12)" }} title="Tornar capitão" aria-label={`Capitão ${j.nome}`}>
                                  <Crown className="h-3 w-3" style={{ color: GOLD }} />
                                </button>
                              )}
                              <button onClick={() => removeJogador(j.id)} className="h-6 w-6 rounded-md flex items-center justify-center bg-white/5" title="Remover" aria-label={`Remover ${j.nome}`}>
                                <Trash2 className="h-3 w-3 text-zinc-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selecionados.length === FANTASY_SLOTS && (
                    <Button onClick={guardarFinal} className="mt-4 w-full font-black h-11" style={{ background: "linear-gradient(135deg, #2ea043, #1a7f2e)", border: "none" }}>
                      <Check className="h-4 w-4 mr-1" /> Confirmar time da ronda
                    </Button>
                  )}
                </div>

                {/* pontuação detalhada */}
                {pontuacaoAtual && pontuacaoAtual.detalhe.length > 0 && (
                  <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="px-4 py-3 flex items-center gap-2 text-xs font-black" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <Zap className="h-4 w-4" style={{ color: GOLD }} /> Pontuação ao vivo da ronda
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-zinc-500 font-bold">
                        <RefreshCw className="h-3 w-3" /> atualiza a cada 30s
                      </span>
                    </div>
                    {pontuacaoAtual.detalhe.map((d) => (
                      <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-white/4 text-sm">
                        <span className="font-bold flex-1 truncate">
                          {d.nome} {d.capitao && <Crown className="inline h-3 w-3 -mt-0.5" style={{ color: GOLD }} />}
                        </span>
                        <span className="font-black tabular-nums" style={{ color: GOLD }}>{d.pontos} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ ABA DRAFT ═══ */}
        {aba === "draft" && (
          <div className="space-y-4" data-testid="aba-draft">
            {/* filtros */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <button onClick={() => setFiltroPapel("todos")} className="shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black" style={{ background: filtroPapel === "todos" ? `${ACCENT}1a` : "rgba(255,255,255,0.04)", color: filtroPapel === "todos" ? ACCENT : "#a1a1aa" }}>
                  Todos os papéis
                </button>
                {getPapeisFantasy().map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setFiltroPapel(p.id)}
                    className="shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap"
                    style={{ background: filtroPapel === p.id ? `${PAPEL_COR[p.id]}1a` : "rgba(255,255,255,0.04)", color: filtroPapel === p.id ? PAPEL_COR[p.id] : "#a1a1aa" }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Input value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} placeholder="Procurar jogador…" className="sm:max-w-xs bg-white/5 border-white/10 text-sm" aria-label="Procurar jogador" />
            </div>

            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-zinc-500 inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> {selecionados.length}/{FANTASY_SLOTS} escolhidos
              </span>
              <span className="font-bold" style={{ color: restante >= 0 ? "#2ea043" : "#ff4655" }}>
                Orçamento: {restante.toFixed(1)} restante
              </span>
            </div>

            {/* lista de jogadores */}
            <div className="grid gap-2 sm:grid-cols-2">
              {jogadoresFiltrados.map((j) => {
                const escolhido = selecionados.includes(j.id);
                const ehCap = capitao === j.id;
                const cara = j.preco > restante && !escolhido;
                return (
                  <motion.div
                    key={j.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={"rounded-2xl p-3.5 flex items-center gap-3 " + (escolhido ? "opacity-90" : "")}
                    style={{
                      background: escolhido ? `${PAPEL_COR[j.papel]}0c` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${escolhido ? PAPEL_COR[j.papel] + "55" : "rgba(255,255,255,0.07)"}`,
                    }}
                    data-testid="card-jogador"
                  >
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${PAPEL_COR[j.papel]}14` }}>
                      {j.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black truncate">{j.nome}</span>
                        {ehCap && <Crown className="h-3 w-3 shrink-0" style={{ color: GOLD }} />}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">{j.equipa} · {getPapeisFantasy().find((p) => p.id === j.papel)?.label}</div>
                      <div className="mt-1 flex items-center gap-2 text-[10px]">
                        <span className="inline-flex items-center gap-0.5 text-zinc-500">
                          <TrendingUp className="h-3 w-3" /> média {j.media_pontos.toFixed(1)}
                        </span>
                        <span className="text-zinc-600">pick {Math.round(j.pick_rate * 100)}%</span>
                      </div>
                      {/* mini forma */}
                      <div className="mt-1.5 flex gap-0.5">
                        {j.forma.map((f, i) => {
                          const max = 100;
                          const h = Math.max(3, (f / max) * 14);
                          return <span key={i} className="w-1.5 rounded-sm" style={{ height: h, background: f >= 70 ? "#2ea043" : f >= 55 ? GOLD : "#ff4655" }} />;
                        })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black" style={{ color: cara ? "#ff4655" : ACCENT }}>{j.preco.toFixed(1)}</div>
                      <button
                        onClick={() => (escolhido ? removeJogador(j.id) : addJogador(j))}
                        disabled={cara}
                        className="mt-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-transform active:scale-95 disabled:opacity-40"
                        style={{
                          background: escolhido ? "rgba(255,70,85,0.12)" : `${ACCENT}18`,
                          color: escolhido ? "#ff4655" : ACCENT,
                          border: `1px solid ${escolhido ? "rgba(255,70,85,0.3)" : `${ACCENT}33`}`,
                        }}
                      >
                        {escolhido ? "Remover" : "Recrutar"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="rounded-xl p-3.5 text-[11px] text-zinc-500 flex items-start gap-2" style={{ background: "rgba(255,255,255,0.02)" }}>
              <Info className="h-4 w-4 text-cyan-500 shrink-0" />
              Dica: o capitão vale 1.5× pontos. Equilíbrio entre uma estrela cara e boas opções baratas costuma vencer a liga.
            </div>
          </div>
        )}

        {/* ═══ ABA LIGA ═══ */}
        {aba === "liga" && (
          <div className="space-y-3" data-testid="aba-liga">
            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Trophy className="h-8 w-8" style={{ color: GOLD }} />
              <div>
                <div className="font-black">Liga da Comunidade Bateu</div>
                <div className="text-xs text-zinc-500">
                  {meuTime ? (minhaPosicao > 0 ? `Estás em ${minhaPosicao}º lugar · ${liga.length} gestores` : "A pontuar…") : "Cria o teu time para entrar na liga"}
                </div>
              </div>
              <div className="ml-auto text-right hidden sm:block">
                <div className="text-[10px] text-zinc-500 font-bold uppercase">Prémio do líder</div>
                <div className="text-sm font-black" style={{ color: GOLD }}>{formatMZN(5000)}</div>
              </div>
            </div>

            {liga.map((u, i) => (
              <div
                key={u.id}
                className="rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{
                  background: u.e_eu ? "rgba(0,212,255,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${u.e_eu ? `${ACCENT}44` : "rgba(255,255,255,0.06)"}`,
                }}
                data-testid="linha-liga"
              >
                <span
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
                  style={{
                    background: i === 0 ? GOLD : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.05)",
                    color: i < 3 ? "#1c1004" : "#a1a1aa",
                  }}
                >
                  {i + 1}
                </span>
                <span className="text-xl shrink-0">{u.emblema}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">{u.nome} {u.e_eu && <span className="text-[9px] font-black px-1.5 py-0.5 rounded ml-1" style={{ background: `${ACCENT}22`, color: ACCENT }}>TU</span>}</div>
                  <div className="text-[10px] text-zinc-500">+{u.pontos_ronda} pts na ronda</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-black tabular-nums" style={{ color: i < 3 ? GOLD : "#e4e4e7" }}>{u.pontos.toLocaleString("pt-PT")}</div>
                  <div className="text-[9px] text-zinc-600 font-bold">PTS TOTAIS</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
