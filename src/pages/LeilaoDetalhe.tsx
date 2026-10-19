import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel, Timer, ArrowLeft, ShieldCheck, Zap, Wallet, Crown, Eye, Heart,
  MapPin, Share2, TrendingUp, Bot, User, Flame, BadgeCheck, Info, Trophy, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSEO } from "@/hooks/useSEO";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useToast } from "@/hooks/use-toast";
import {
  getLeilao, listLeiloes, subscribeLeiloes, tempoRestante, corStatus, getMeuSaldo, getMeuNome,
  colocarLance, definirAutobid, cancelarAutobid, comprarAgora, getMeusLances,
  getAutobid, incrementoPara, categoriaLabel, categoriaEmoji,
  ANTI_SNIPE_JANELA_MS, ANTI_SNIPE_EXTENSAO_MS, type Leilao, type LanceResultado,
} from "@/lib/leiloes";
import { formatMZN } from "@/lib/currency";

/**
 * LeilaoDetalhe — sala de leilão ao vivo: contador regressivo,
 * lances em tempo real, auto-bid, compra imediata e histórico.
 */

const ACCENT = "#ff7b00";
const ACCENT2 = "#fbbf24";

function Parte({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  if (!ok) return null;
  return <>{children}</>;
}

export default function LeilaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sfx } = useSoundEffects();
  const { toast } = useToast();
  const [, force] = useState(0);
  const [valorCustom, setValorCustom] = useState("");
  const [autobidInput, setAutobidInput] = useState("");
  const [mostrarAutobid, setMostrarAutobid] = useState(false);
  const [favorito, setFavorito] = useState(false);
  const [flashVitoria, setFlashVitoria] = useState(false);

  useEffect(() => subscribeLeiloes(() => force((n) => n + 1)), []);

  const leilao: Leilao | null = useMemo(() => getLeilao(id || ""), [id, force]);
  const saldo = getMeuSaldo();
  const meuNome = getMeuNome();
  const meusLances = leilao ? getMeusLances(leilao.id) : [];
  const meuAutobid = leilao ? getAutobid(leilao.id) : null;

  const ativo = leilao && (leilao.status === "ao_vivo" || leilao.status === "terminando");
  const souMaior = leilao?.maior_licitador === meuNome;
  const restanteMs = leilao ? leilao.ends_at - Date.now() : 0;
  const zonaSnipe = ativo && restanteMs > 0 && restanteMs < ANTI_SNIPE_JANELA_MS;
  const minimo = leilao ? leilao.lance_atual + incrementoPara(leilao.lance_atual) : 0;

  const similares = useMemo(() => {
    if (!leilao) return [];
    return listLeiloes()
      .filter((l) => l.id !== leilao.id && l.categoria === leilao.categoria && l.status !== "terminado")
      .slice(0, 3);
  }, [leilao?.id, leilao?.categoria, force]);

  useSEO({ title: leilao ? `${leilao.titulo} — Leilão ao Vivo | Bateu` : "Leilão | Bateu", description: leilao?.descricao?.slice(0, 150), canonicalPath: `/leiloes/${id}` });

  if (!leilao) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white" style={{ background: "var(--area-bg, #060608)" }}>
        <Gavel className="h-12 w-12 text-zinc-700 mb-4" />
        <h1 className="text-xl font-black">Leilão não encontrado</h1>
        <Button className="mt-4" onClick={() => navigate("/leiloes")}>Voltar aos leilões</Button>
      </div>
    );
  }

  const cor = corStatus(leilao.status);

  const resultado = (r: LanceResultado, msgOk: string) => {
    if (r.ok) {
      sfx.win?.();
      toast({ title: msgOk, description: `Lance de ${formatMZN(r.leilao.lance_atual)} registado. Saldo: ${formatMZN(r.saldo)}` });
    } else {
      sfx.error?.();
      toast({ title: "Não foi possível", description: r.erro, variant: "destructive" });
    }
  };

  const handleLance = () => {
    const r = colocarLance(leilao.id);
    resultado(r, "Lance no ar! 🔨");
  };

  const handleLanceCustom = () => {
    const v = parseInt(valorCustom.replace(/[^\d]/g, ""), 10);
    if (!v) return;
    const r = colocarLance(leilao.id, v);
    resultado(r, "Lance personalizado aceite!");
    if (r.ok) setValorCustom("");
  };

  const handleAutobid = () => {
    const v = parseInt(autobidInput.replace(/[^\d]/g, ""), 10);
    if (!v) return;
    const r = definirAutobid(leilao.id, v);
    resultado(r, "Auto-bid ativado ⚡");
    if (r.ok) {
      setMostrarAutobid(false);
      setAutobidInput("");
    }
  };

  const handleComprar = () => {
    const r = comprarAgora(leilao.id);
    if (r.ok) {
      sfx.win?.();
      setFlashVitoria(true);
      toast({ title: "É teu! 🏆", description: `Compra imediata por ${formatMZN(leilao.comprar_agora || 0)} concluída.` });
      setTimeout(() => setFlashVitoria(false), 4000);
    } else {
      sfx.error?.();
      toast({ title: "Não foi possível", description: r.erro, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen text-white pb-32" style={{ background: "var(--area-bg, #060608)" }} data-testid="leilao-detalhe">
      {/* vitória */}
      <AnimatePresence>
        {flashVitoria && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #2ea043, #1a7f2e)", boxShadow: "0 10px 40px rgba(46,160,67,0.4)" }}
            data-testid="flash-vitoria"
          >
            <Trophy className="h-6 w-6 text-white" />
            <div>
              <div className="font-black">Ganhaste o leilão! 🎉</div>
              <div className="text-xs text-white/80">O item é teu — confirma os detalhes no teu perfil.</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* topo */}
      <div className="sticky top-0 z-30 px-4 py-3 backdrop-blur-xl flex items-center gap-3" style={{ background: "rgba(6,6,8,0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate("/leiloes")} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-white/5" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: ACCENT }}>Sala de Leilão</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setFavorito(!favorito)} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-white/5" aria-label="Favorito">
            <Heart className={"h-4 w-4 " + (favorito ? "fill-red-500 text-red-500" : "text-zinc-400")} />
          </button>
          <button className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-white/5" aria-label="Partilhar" onClick={() => navigator.share?.({ title: leilao.titulo, url: location.href }).catch(() => {})}>
            <Share2 className="h-4 w-4 text-zinc-400" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-5 gap-6">
        {/* ─── coluna principal ─── */}
        <div className="lg:col-span-3">
          {/* capa */}
          <div className="relative rounded-3xl overflow-hidden mb-4" style={{ background: `linear-gradient(150deg, ${ACCENT}14, rgba(255,255,255,0.02))`, border: "1px solid rgba(255,123,0,0.2)", height: 260 }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[110px] leading-none drop-shadow-2xl">{leilao.imagem_emoji}</span>
            </div>
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-lg" style={{ color: cor, background: "rgba(0,0,0,0.55)", border: `1px solid ${cor}55` }}>
                {leilao.status === "terminando" && <Flame className="inline h-3 w-3 mr-1 -mt-0.5" />}
                {leilao.status.toUpperCase()}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-zinc-300" style={{ background: "rgba(0,0,0,0.55)" }}>
                {categoriaEmoji(leilao.categoria)} {categoriaLabel(leilao.categoria)}
              </span>
            </div>
            {zonaSnipe && (
              <motion.div
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="absolute top-4 right-4 text-[10px] font-black px-2.5 py-1 rounded-lg text-red-300"
                style={{ background: "rgba(255,70,85,0.15)", border: "1px solid rgba(255,70,85,0.4)" }}
                data-testid="anti-snipe-ativo"
              >
                ⏱ ANTI-SNIPE ATIVO
              </motion.div>
            )}
          </div>

          {/* título + meta */}
          <h1 className="text-2xl sm:text-3xl font-black leading-tight">{leilao.titulo}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: "rgba(255,123,0,0.15)", color: ACCENT }}>
                {leilao.vendedor.slice(0, 2).toUpperCase()}
              </span>
              {leilao.vendedor}
              {leilao.vendedor_verificado && <BadgeCheck className="h-3.5 w-3.5 text-cyan-400" />}
            </span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {leilao.localizacao}</span>
            <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {leilao.visualizacoes} visualizações</span>
            <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {leilao.favoritos} favoritos</span>
            <span className="inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> {leilao.lances.length} lances</span>
          </div>

          <p className="mt-4 text-sm text-zinc-400 leading-relaxed">{leilao.descricao}</p>

          {/* tags */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {leilao.tags.map((t) => (
              <span key={t} className="text-[11px] px-2 py-1 rounded-lg text-zinc-400" style={{ background: "rgba(255,255,255,0.04)" }}>#{t}</span>
            ))}
          </div>

          {/* histórico de lances */}
          <section className="mt-6 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }} data-testid="historico-lances">
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Gavel className="h-4 w-4" style={{ color: ACCENT }} />
              <h2 className="text-sm font-black">Histórico de lances</h2>
              <span className="ml-auto text-[10px] text-zinc-500 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> tempo real
              </span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-white/4">
              {leilao.lances.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-zinc-500">Ainda sem lances — sê o primeiro!</div>
              )}
              {leilao.lances.map((lan, i) => (
                <motion.div
                  key={lan.id}
                  initial={i === 0 ? { opacity: 0, x: -12 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  className="px-4 py-2.5 flex items-center gap-3"
                  style={{ background: lan.is_minha ? "rgba(46,160,67,0.05)" : undefined }}
                >
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ background: lan.is_minha ? "rgba(46,160,67,0.15)" : "rgba(255,255,255,0.05)" }}>
                    {lan.is_bot ? <Bot className="h-4 w-4 text-zinc-400" /> : <User className="h-4 w-4 text-emerald-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate flex items-center gap-1.5">
                      {lan.is_minha ? `${meuNome} (tu)` : lan.bidder}
                      {lan.is_minha && <BadgeCheck className="h-3 w-3 text-emerald-400" />}
                    </div>
                    <div className="text-[10px] text-zinc-600">
                      {new Date(lan.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </div>
                  </div>
                  <div className="text-sm font-black tabular-nums" style={{ color: i === 0 ? ACCENT : "#d4d4d8" }}>
                    {formatMZN(lan.valor)}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        </div>

        {/* ─── painel de lances ─── */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* contador */}
            <div className="rounded-3xl p-5" style={{ background: "linear-gradient(160deg, #120b04, #0d0803)", border: `1px solid ${cor}44`, boxShadow: `0 8px 40px ${cor}12` }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
                  {leilao.status === "agendado" ? "Abre em" : leilao.status === "terminado" ? "Leilão terminado" : "Termina em"}
                </span>
                {leilao.extensao_snipe > 0 && (
                  <span className="text-[10px] text-red-400 font-bold">+{leilao.extensao_snipe}× anti-snipe</span>
                )}
              </div>
              <div
                className="mt-1 text-4xl font-black font-mono tabular-nums tracking-tight"
                style={{ color: cor }}
                data-testid="contador"
              >
                {leilao.status === "agendado" ? "—" : tempoRestante(leilao.ends_at)}
              </div>
              {zonaSnipe && (
                <div className="mt-1 text-[11px] text-red-400">
                  Cada novo lance adiciona {ANTI_SNIPE_EXTENSAO_MS / 1000}s ao relógio
                </div>
              )}

              {/* lance atual */}
              <div className="mt-4 pt-4 flex items-end justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Lance atual</div>
                  <div className="text-3xl font-black" style={{ color: ACCENT }} data-testid="lance-atual">{formatMZN(leilao.lance_atual)}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {souMaior ? (
                      <span className="text-emerald-400 font-bold inline-flex items-center gap-1"><Crown className="h-3 w-3" /> Estás a ganhar!</span>
                    ) : leilao.maior_licitador ? (
                      <>por <strong className="text-zinc-300">{leilao.maior_licitador}</strong></>
                    ) : "sem lances ainda"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">Próximo lance</div>
                  <div className="text-lg font-black text-zinc-200">{formatMZN(minimo)}</div>
                </div>
              </div>
            </div>

            {/* ações */}
            <Parte ok={!!ativo}>
              <div className="rounded-3xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }} data-testid="painel-lances">
                {/* saldo */}
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 text-zinc-400"><Wallet className="h-3.5 w-3.5" /> Teu saldo</span>
                  <strong className="text-white">{formatMZN(saldo)}</strong>
                </div>

                {souMaior && (
                  <div className="rounded-xl px-3 py-2 text-xs text-emerald-300 flex items-center gap-2" style={{ background: "rgba(46,160,67,0.1)" }}>
                    <Crown className="h-4 w-4 shrink-0" /> O maior lance é teu. Os bots vêm aí — mantém-te atento!
                  </div>
                )}

                {/* lance rápido */}
                <Button
                  onClick={handleLance}
                  disabled={saldo < minimo}
                  className="w-full h-12 text-base font-black rounded-xl"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}, #c2410c)`, border: "none" }}
                  data-testid="btn-lance"
                >
                  <Gavel className="h-5 w-5 mr-2" /> Licitar {formatMZN(minimo)}
                </Button>

                {/* lances rápidos +1..+3 */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((n) => {
                    const v = leilao.lance_atual + incrementoPara(leilao.lance_atual) * n;
                    return (
                      <button
                        key={n}
                        onClick={() => {
                          const r = colocarLance(leilao.id, v);
                          resultado(r, `Lance +${n} registado!`);
                        }}
                        className="py-2.5 rounded-xl text-xs font-black transition-transform active:scale-95"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#e4e4e7" }}
                      >
                        +{n} · {formatMZN(v).replace(" MT", "")}
                      </button>
                    );
                  })}
                </div>

                {/* lance personalizado */}
                <div className="flex gap-2">
                  <Input
                    value={valorCustom}
                    onChange={(e) => setValorCustom(e.target.value)}
                    placeholder="Valor personalizado…"
                    inputMode="numeric"
                    className="bg-white/5 border-white/10 text-sm"
                    aria-label="Valor personalizado"
                  />
                  <Button variant="secondary" onClick={handleLanceCustom} className="shrink-0 font-bold">Licitar</Button>
                </div>

                {/* auto-bid */}
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.2)" }}>
                  <button
                    onClick={() => setMostrarAutobid(!mostrarAutobid)}
                    className="w-full px-3.5 py-2.5 flex items-center gap-2 text-xs font-bold"
                    style={{ background: "rgba(0,212,255,0.06)", color: "#00d4ff" }}
                    data-testid="btn-autobid"
                  >
                    <Zap className="h-4 w-4" />
                    {meuAutobid ? `Auto-bid ativo até ${formatMZN(meuAutobid)}` : "Ativar Auto-bid (lance automático)"}
                    <span className="ml-auto">{meuAutobid ? "Desligar" : "Configurar"}</span>
                  </button>
                  {mostrarAutobid && !meuAutobid && (
                    <div className="p-3 space-y-2" style={{ background: "rgba(0,212,255,0.03)" }}>
                      <p className="text-[11px] text-zinc-500">Define o valor máximo. O sistema licita por ti automaticamente quando fores ultrapassado.</p>
                      <div className="flex gap-2">
                        <Input value={autobidInput} onChange={(e) => setAutobidInput(e.target.value)} placeholder="Ex.: 2000" inputMode="numeric" className="bg-white/5 border-white/10 text-sm" aria-label="Máximo do auto-bid" />
                        <Button onClick={handleAutobid} className="shrink-0 font-bold" style={{ background: "#00d4ff", color: "#000" }}>Ativar</Button>
                      </div>
                    </div>
                  )}
                  {meuAutobid && mostrarAutobid && (
                    <div className="p-3">
                      <Button variant="outline" className="w-full" onClick={() => { cancelarAutobid(leilao.id); toast({ title: "Auto-bid desligado" }); }}>
                        Desligar auto-bid
                      </Button>
                    </div>
                  )}
                </div>

                {/* comprar agora */}
                {leilao.comprar_agora != null && (
                  <Button
                    onClick={handleComprar}
                    disabled={saldo < leilao.comprar_agora}
                    className="w-full h-12 text-base font-black rounded-xl"
                    style={{ background: "linear-gradient(135deg, #fbbf24, #d97706)", color: "#1c1004", border: "none" }}
                    data-testid="btn-comprar-agora"
                  >
                    <Zap className="h-5 w-5 mr-2" /> Comprar Agora · {formatMZN(leilao.comprar_agora)}
                  </Button>
                )}
              </div>
            </Parte>

            {leilao.status === "terminado" && (
              <div className="rounded-3xl p-5 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Trophy className="h-8 w-8 mx-auto mb-2" style={{ color: ACCENT2 }} />
                <div className="font-black text-lg">Leilão terminado</div>
                <div className="text-sm text-zinc-400 mt-1">
                  Vendido por <strong style={{ color: ACCENT }}>{formatMZN(leilao.lance_atual)}</strong>
                  {souMaior ? " — e o vencedor és TU! 🎉" : ` para ${leilao.maior_licitador}`}
                </div>
              </div>
            )}

            {leilao.status === "agendado" && (
              <div className="rounded-3xl p-5 text-center" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.25)" }}>
                <Timer className="h-8 w-8 mx-auto mb-2 text-amber-400" />
                <div className="font-black text-lg">Abre em breve</div>
                <div className="text-sm text-zinc-400 mt-1">Prepara o teu saldo e ativa o auto-bid assim que abrir.</div>
              </div>
            )}

            {/* regras */}
            <div className="rounded-2xl p-4 text-[11px] text-zinc-500 space-y-2" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" /> Lances protegem-te com anti-snipe: lance nos últimos 30s estende 15s (máx. 10×).</div>
              <div className="flex items-start gap-2"><Info className="h-4 w-4 text-cyan-500 shrink-0" /> Só debita se ganharem. Itens digitais entregues em minutos; bens combinados com o vendedor.</div>
            </div>
          </div>
        </div>
      </div>

      {/* similares */}
      {similares.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-8">
          <h2 className="text-lg font-black mb-3 flex items-center gap-2">
            <Flame className="h-5 w-5" style={{ color: ACCENT }} /> Leilões semelhantes
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {similares.map((s) => (
              <Link
                key={s.id}
                to={`/leiloes/${s.slug || s.id}`}
                className="rounded-2xl p-4 flex items-center gap-3 group"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <span className="text-3xl">{s.imagem_emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate group-hover:text-orange-300">{s.titulo}</div>
                  <div className="text-xs font-black" style={{ color: ACCENT }}>{formatMZN(s.lance_atual)}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* barra fixa mobile */}
      {ativo && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 p-3 backdrop-blur-xl lg:hidden"
          style={{ background: "rgba(6,6,8,0.92)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <div className="text-[10px] text-zinc-500 font-bold uppercase">Atual</div>
              <div className="text-lg font-black leading-none" style={{ color: ACCENT }}>{formatMZN(leilao.lance_atual)}</div>
            </div>
            <Button
              onClick={handleLance}
              disabled={saldo < minimo}
              className="flex-1 h-11 font-black rounded-xl"
              style={{ background: `linear-gradient(135deg, ${ACCENT}, #c2410c)`, border: "none" }}
            >
              Licitar {formatMZN(minimo).replace(" MT", "")}
            </Button>
            {leilao.comprar_agora != null && (
              <Button
                onClick={handleComprar}
                disabled={saldo < leilao.comprar_agora}
                className="h-11 font-black rounded-xl"
                style={{ background: "linear-gradient(135deg, #fbbf24, #d97706)", color: "#1c1004", border: "none" }}
              >
                <Zap className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
