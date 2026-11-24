// =============================================================
// DETALHE DA LIGA LOCAL (v86 E-SPORT) — slugs «local-liga-*»
// ─────────────────────────────────────────────────────────────
// LIGAS PARA DIFERENTES JOGOS que funcionam AGORA: temporada com
// janela, classificação alimentada SÓ por partidas reais (bus
// `bateu:partida`), campeão no fecho e claim do prémio em Pontos
// Bateu (1×). HONESTO: no kart a liga pontua por POSIÇÃO REAL;
// nos outros jogos acumula os TEUS pontos reais (os rivais IA só
// correm posições no kart — declarado, nunca inventado).
// =============================================================
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy, Gift, ArrowLeft, Building2, Medal, Zap, Coins, History,
  Crown, CheckCircle2, UserPlus,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { useProgressao } from "@/lib/progressaoStore";
import {
  ligaPorId, inscreverLiga, classificacaoLiga, podeClamarLiga,
  clamarPremioLiga, jogoEsport, TETO_PONTOS_PARTIDA_SEM_CAMPO,
  type LigaEsport,
} from "@/lib/esport";

const EU_ID = "eu";

export default function LigaLocalDetalhe({ id }: { id: string }) {
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

  const liga = useMemo(() => ligaPorId(id), [id, tick, agora]);
  useSEO({
    title: liga ? `${liga.nome} — Liga Bateu` : "Liga",
    description: liga ? `Liga de ${jogoEsport(liga.jogo)?.label ?? liga.jogo} — ${liga.temporada}. Prémio: ${liga.premioPontos} Pontos Bateu.` : "Liga de e-sport no Bateu.",
    canonicalPath: `/ligas/${id}`,
  });

  if (!liga) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Trophy className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <p className="text-sm text-muted-foreground mb-4">{t("esport.local.naoEncontrado")}</p>
        <Button variant="outline" onClick={() => navigate("/ligas")} data-testid="liga-local-voltar">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t("ligas.voltarLista")}
        </Button>
      </div>
    );
  }

  const euInscrito = liga.pontuacao.some((p) => p.id === EU_ID);
  const ordem = classificacaoLiga(liga);
  const campeao = liga.pontuacao.find((p) => p.id === liga.campeaoId);
  const podeClamar = podeClamarLiga(liga.id);
  const temCampo = jogoEsport(liga.jogo)?.temCampo === true;
  const diasRestantes = Math.max(0, Math.ceil((liga.terminaEm - agora) / 86_400_000));
  const atualizado = () => { setTick((k) => k + 1); setMsg(""); };

  const EstadoChip = () => (
    <Badge className={`border-0 ${liga.estado === "ativo" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300" : "bg-slate-500/20 text-slate-500 dark:text-slate-300"}`} data-testid="liga-local-estado">
      {t(`esport.estado.${liga.estado}`)}
    </Badge>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/ligas")} data-testid="liga-local-voltar-lista">
        <ArrowLeft className="h-4 w-4 mr-1.5" /> {t("ligas.voltarLista")}
      </Button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${liga.organizador.cor}, transparent)` }} />
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <CardTitle className="text-xl leading-tight" data-testid="liga-local-nome">{liga.nome}</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <EstadoChip />
                  <Badge variant="outline" className="text-[11px]" data-testid="liga-local-jogo">{jogoEsport(liga.jogo)?.label ?? liga.jogo}</Badge>
                  <Badge variant="outline" className="text-[11px]">{liga.temporada}</Badge>
                  {liga.organizador.tipo === "empresa" && (
                    <Badge variant="outline" className="text-[11px] gap-1 border-sky-400/50 text-sky-600 dark:text-sky-300" data-testid="liga-local-empresa">
                      <Building2 className="h-3 w-3" /> {liga.organizador.nome}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-md" style={{ background: liga.organizador.cor }}>
                <span className="text-sm font-black text-white">{liga.organizador.iniciais}</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoMini label={t("esport.local.premio")} value={String(liga.premioPontos)} testid="liga-local-premio" />
              <InfoMini label={t("liga.local.jogadores")} value={String(liga.pontuacao.length)} testid="liga-local-jogadores" />
              <InfoMini label={t("esport.local.fim")} value={`${diasRestantes}d`} testid="liga-local-fim" />
              <InfoMini label={t("liga.local.porPartida")} value={temCampo ? t("liga.local.porPosicao") : `≤${TETO_PONTOS_PARTIDA_SEM_CAMPO}`} testid="liga-local-porpartida" />
            </div>

            {/* campeão + claim */}
            {liga.estado === "terminado" && (
              <div className="rounded-xl border border-amber-500/50 bg-amber-500/5 p-4 space-y-2" data-testid="liga-local-fim-painel">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Crown className="h-4 w-4 text-amber-400" />
                  {campeao ? t("esport.local.campeao", { nome: campeao.nome }) : t("esport.local.semCampeao")}
                </div>
                {podeClamar && (
                  <Button
                    className="w-full bg-gradient-to-r from-emerald-500 to-lime-500 text-white hover:from-emerald-600 hover:to-lime-600"
                    onClick={() => {
                      const premio = clamarPremioLiga(liga.id);
                      if (premio) {
                        pontosDeJogo("esport-premio", premio.pontos, premio.pontos);
                        atualizado();
                      }
                    }}
                    data-testid="liga-local-clamar"
                  >
                    <Coins className="h-4 w-4 mr-2" /> {t("esport.local.clamar", { n: String(liga.premioPontos) })}
                  </Button>
                )}
                {liga.premioReclamado && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500" data-testid="liga-local-reclamado"><CheckCircle2 className="h-3.5 w-3.5" /> {t("esport.local.reclamado")}</div>
                )}
              </div>
            )}

            {/* inscrição + jogar */}
            {liga.estado === "ativo" && (
              <div className="flex flex-col sm:flex-row gap-2">
                {!euInscrito ? (
                  <Button className="flex-1" onClick={() => { const r = inscreverLiga(liga.id); if (!r.ok) setMsg(t("esport.local.erroAcao", { motivo: r.motivo })); atualizado(); }} data-testid="liga-local-inscrever">
                    <UserPlus className="h-4 w-4 mr-2" /> {t("esport.local.inscrever")}
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700"
                    onClick={() => navigate(`/lives?game=${liga.jogo}`)}
                    data-testid="liga-local-jogar"
                  >
                    <Zap className="h-4 w-4 mr-2" /> {t("esport.local.jogar", { jogo: jogoEsport(liga.jogo)?.label ?? liga.jogo })}
                  </Button>
                )}
              </div>
            )}
            {msg && <p className="text-xs font-bold text-red-500" data-testid="liga-local-msg">{msg}</p>}

            {/* classificação */}
            <Card className="border-white/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Medal className="h-4 w-4 text-amber-500" /> {t("esport.local.classificacao")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {liga.pontuacao.length === 0 ? (
                  <p className="text-xs text-muted-foreground" data-testid="liga-local-sem-participantes">{t("esport.local.semParticipantes")}</p>
                ) : (
                  <div className="rounded-xl border border-white/10 overflow-hidden" data-testid="liga-local-classificacao">
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
                        {ordem.map((p, idx) => (
                          <tr key={p.id} className={`${p.id === EU_ID ? "bg-amber-400/15 text-amber-600 dark:text-amber-200 font-bold" : "text-foreground"} border-b border-white/5`} data-testid={`liga-local-linha-${p.id}`}>
                            <td className="px-3 py-1.5">{idx + 1}º</td>
                            <td className="px-2 py-1.5">
                              {p.nome}
                              {p.id === liga.campeaoId && <Crown className="inline h-3 w-3 ml-1 text-amber-400" />}
                            </td>
                            <td className="px-2 py-1.5 text-right font-bold">{p.pontos}</td>
                            <td className="px-2 py-1.5 text-right">{p.vitorias}</td>
                            <td className="px-3 py-1.5 text-right">{p.partidas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* histórico */}
            {liga.historico.length > 0 && (
              <div className="rounded-xl border border-white/10 p-3" data-testid="liga-local-historico">
                <div className="flex items-center gap-1.5 text-xs font-bold mb-1.5"><History className="h-3.5 w-3.5 text-muted-foreground" /> {t("esport.local.historico")}</div>
                <ul className="space-y-1 text-[11px] text-muted-foreground">
                  {liga.historico.slice(-6).reverse().map((h, i) => (
                    <li key={i}>• {h.texto}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5" data-testid="liga-local-nota">
              <Gift className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {t("esport.nota.aparelho", { jogo: jogoEsport(liga.jogo)?.label ?? liga.jogo })}
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
