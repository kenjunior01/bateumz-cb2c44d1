// =============================================================
// DETALHE DO TORNEIO LOCAL (v86 E-SPORT) — ids «local-*»
// ─────────────────────────────────────────────────────────────
// A superfície de TORNEIOS QUE FUNCIONAM AGORA: inscrição,
// arranque (grelha com rivais IA honestos), rondas reais da
// eliminatória («Jogar ronda» → o jogo reporta a posição real
// pelo bus), classificação ao vivo do campeonato, campeão e
// CLAIM do prémio em Pontos Bateu (1×, pela store da progressão).
// HONESTO: tudo no aparelho; rivais IA etiquetados; nada finge
// servidor.
// =============================================================
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy, Users, Gift, ArrowLeft, Building2, Medal, Play, Zap,
  Swords, CheckCircle2, Coins, History, Crown,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { useProgressao } from "@/lib/progressaoStore";
import {
  torneioPorId, inscreverTorneio, iniciarTorneio, classificacaoTorneio,
  podeClamarTorneio, clamarPremioTorneio, corteRonda, jogoEsport,
  type TorneioEsport,
} from "@/lib/esport";

const EU_ID = "eu";

export default function TorneioLocalDetalhe({ id }: { id: string }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [agora, setAgora] = useState(() => Date.now());
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState("");
  const { pontosDeJogo } = useProgressao(agora);

  useEffect(() => {
    const iv = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(iv);
  }, []);

  const torneio = useMemo(() => torneioPorId(id), [id, tick, agora]);
  useSEO({
    title: torneio ? `${torneio.nome} — Torneio Bateu` : "Torneio",
    description: torneio ? `Torneio de e-sport de ${jogoEsport(torneio.jogo)?.label ?? torneio.jogo}. Prémio: ${torneio.premioPontos} Pontos Bateu.` : "Torneio de e-sport no Bateu.",
    canonicalPath: `/tournaments/${id}`,
  });

  if (!torneio) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Trophy className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <p className="text-sm text-muted-foreground mb-4">{t("esport.local.naoEncontrado")}</p>
        <Button variant="outline" onClick={() => navigate("/tournaments")} data-testid="torneio-local-voltar">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t("tournament.backToList")}
        </Button>
      </div>
    );
  }

  const inscritos = torneio.participantes.length;
  const euInscrito = torneio.participantes.some((p) => p.id === EU_ID);
  const ordem = classificacaoTorneio(torneio);
  const vencedor = torneio.participantes.find((p) => p.id === torneio.vencedorId);
  const podeClamar = podeClamarTorneio(torneio.id);
  const atualizado = () => { setTick((k) => k + 1); setMsg(""); };

  const agir = (fn: () => { ok: boolean; motivo: string }) => {
    const r = fn();
    if (!r.ok) setMsg(t("esport.local.erroAcao", { motivo: r.motivo }));
    atualizado();
  };

  const EstadoChip = () => {
    const map: Record<TorneioEsport["estado"], string> = {
      inscricao: "bg-sky-500/20 text-sky-600 dark:text-sky-300",
      ativo: "bg-amber-500/20 text-amber-600 dark:text-amber-300",
      terminado: "bg-slate-500/20 text-slate-500 dark:text-slate-300",
    };
    return <Badge className={`border-0 ${map[torneio.estado]}`} data-testid="torneio-local-estado">{t(`esport.estado.${torneio.estado}`)}</Badge>;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/tournaments")} data-testid="torneio-local-voltar-lista">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> {t("tournament.backToList")}
      </Button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${torneio.organizador.cor}, transparent)` }} />
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <CardTitle className="text-xl leading-tight" data-testid="torneio-local-nome">{torneio.nome}</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <EstadoChip />
                  <Badge variant="outline" className="text-[11px]" data-testid="torneio-local-jogo">{jogoEsport(torneio.jogo)?.label ?? torneio.jogo}</Badge>
                  {torneio.formato === "eliminatoria" && (
                    <Badge variant="outline" className="text-[11px] gap-1"><Swords className="h-3 w-3" /> {t("esport.criar.formato.eliminatoria")}</Badge>
                  )}
                  {torneio.organizador.tipo === "empresa" && (
                    <Badge variant="outline" className="text-[11px] gap-1 border-sky-400/50 text-sky-600 dark:text-sky-300" data-testid="torneio-local-empresa">
                      <Building2 className="h-3 w-3" /> {torneio.organizador.nome}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-md" style={{ background: torneio.organizador.cor }}>
                <span className="text-sm font-black text-white">{torneio.organizador.iniciais}</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoMini label={t("esport.local.competidores")} value={`${inscritos}/${torneio.tamanho}`} testid="torneio-local-inscritos" />
              <InfoMini label={t("esport.local.premio")} value={String(torneio.premioPontos)} testid="torneio-local-premio" />
              <InfoMini label={t("esport.local.formato")} value={torneio.formato === "eliminatoria" ? `${torneio.ronda}/${torneio.rondasTotal}` : t("esport.criar.formato.campeonato")} testid="torneio-local-formato" />
              <InfoMini
                label={t("esport.local.fim")}
                value={new Date(torneio.terminaEm).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })}
                testid="torneio-local-fim"
              />
            </div>

            {/* eliminatória: ronda atual e corte */}
            {torneio.formato === "eliminatoria" && torneio.estado === "ativo" && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-3 text-sm flex items-center gap-2" data-testid="torneio-local-ronda">
                <Swords className="h-4 w-4 text-rose-400" />
                <span>
                  <b>{t("esport.local.ronda", { n: String(torneio.ronda), total: String(torneio.rondasTotal) })}</b>
                  {" — "}
                  {t("esport.local.corte", { n: String(corteRonda(torneio)) })}
                </span>
              </div>
            )}

            {/* terminado: campeão + claim */}
            {torneio.estado === "terminado" && (
              <div className="rounded-xl border border-amber-500/50 bg-amber-500/5 p-4 space-y-2" data-testid="torneio-local-fim-painel">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Crown className="h-4 w-4 text-amber-400" />
                  {vencedor ? t("esport.local.campeao", { nome: vencedor.nome }) : t("esport.local.semCampeao")}
                </div>
                {podeClamar && (
                  <Button
                    className="w-full bg-gradient-to-r from-emerald-500 to-lime-500 text-white hover:from-emerald-600 hover:to-lime-600"
                    onClick={() => {
                      const premio = clamarPremioTorneio(torneio.id);
                      if (premio) {
                        pontosDeJogo("esport-premio", premio.pontos, premio.pontos);
                        atualizado();
                      }
                    }}
                    data-testid="torneio-local-clamar"
                  >
                    <Coins className="h-4 w-4 mr-2" /> {t("esport.local.clamar", { n: String(torneio.premioPontos) })}
                  </Button>
                )}
                {torneio.premioReclamado && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500" data-testid="torneio-local-reclamado"><CheckCircle2 className="h-3.5 w-3.5" /> {t("esport.local.reclamado")}</div>
                )}
              </div>
            )}

            {/* acções */}
            {torneio.estado === "inscricao" && (
              <div className="flex flex-col gap-2">
                {!euInscrito ? (
                  <Button className="w-full" onClick={() => agir(() => inscreverTorneio(torneio.id))} data-testid="torneio-local-inscrever">
                    <Users className="h-4 w-4 mr-2" /> {t("esport.local.inscrever")}
                  </Button>
                ) : (
                  <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700" onClick={() => agir(() => iniciarTorneio(torneio.id))} data-testid="torneio-local-iniciar">
                    <Play className="h-4 w-4 mr-2" /> {t("esport.local.iniciar")}
                  </Button>
                )}
              </div>
            )}
            {torneio.estado === "ativo" && (
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700"
                onClick={() => navigate(`/lives?game=${torneio.jogo}`)}
                data-testid="torneio-local-jogar"
              >
                <Zap className="h-4 w-4 mr-2" /> {t("esport.local.jogar", { jogo: jogoEsport(torneio.jogo)?.label ?? torneio.jogo })}
              </Button>
            )}
            {msg && <p className="text-xs font-bold text-red-500" data-testid="torneio-local-msg">{msg}</p>}

            {/* classificação */}
            <Card className="border-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Medal className="h-4 w-4 text-amber-500" /> {t("esport.local.classificacao")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {torneio.participantes.length === 0 ? (
                  <p className="text-xs text-muted-foreground" data-testid="torneio-local-sem-participantes">{t("esport.local.semParticipantes")}</p>
                ) : (
                  <div className="rounded-xl border border-white/10 overflow-hidden" data-testid="torneio-local-classificacao">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/40 text-muted-foreground">
                          <th className="px-3 py-2 text-left w-8">#</th>
                          <th className="px-2 py-2 text-left">{t("esport.local.piloto")}</th>
                          <th className="px-2 py-2 text-right">{t("esport.local.pontosCol")}</th>
                          <th className="px-2 py-2 text-right">{t("esport.local.vitoriasCol")}</th>
                          <th className="px-3 py-2 text-right">{t("esport.local.partidasCol")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordem.map((p, idx) => {
                          const eliminado = p.rondaEliminado != null;
                          return (
                            <tr
                              key={p.id}
                              className={`${p.id === EU_ID ? "bg-amber-400/15 text-amber-600 dark:text-amber-200 font-bold" : "text-foreground"} border-b border-white/5 ${eliminado ? "opacity-45" : ""}`}
                              data-testid={`torneio-local-linha-${p.id}`}
                            >
                              <td className="px-3 py-1.5">{idx + 1}º</td>
                              <td className="px-2 py-1.5">
                                {p.nome}
                                {p.eBot && <span className="ml-1.5 px-1 py-0.5 rounded bg-slate-500/25 text-[9px] font-black" data-testid="torneio-local-badge-ia">{t("esport.local.ia")}</span>}
                                {eliminado && <span className="ml-1.5 text-[9px] font-bold text-red-400">{t("esport.local.eliminado", { n: String(p.rondaEliminado) })}</span>}
                                {p.id === torneio.vencedorId && <Crown className="inline h-3 w-3 ml-1 text-amber-400" />}
                              </td>
                              <td className="px-2 py-1.5 text-right font-bold">{p.pontos}</td>
                              <td className="px-2 py-1.5 text-right">{p.vitorias}</td>
                              <td className="px-3 py-1.5 text-right">{p.partidas}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* histórico */}
            {torneio.historico.length > 0 && (
              <div className="rounded-xl border border-white/10 p-3" data-testid="torneio-local-historico">
                <div className="flex items-center gap-1.5 text-xs font-bold mb-1.5"><History className="h-3.5 w-3.5 text-muted-foreground" /> {t("esport.local.historico")}</div>
                <ul className="space-y-1 text-[11px] text-muted-foreground">
                  {torneio.historico.slice(-6).reverse().map((h, i) => (
                    <li key={i}>• {h.texto}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5" data-testid="torneio-local-nota">
              <Gift className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {t("esport.nota.aparelho", { jogo: jogoEsport(torneio.jogo)?.label ?? torneio.jogo })}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function InfoMini({ label, value, testid }: { label: string; value: string; testid: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2.5" data-testid={testid}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xs font-bold truncate">{value}</p>
    </div>
  );
}
