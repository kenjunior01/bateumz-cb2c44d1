// =============================================================
// CRIAR TORNEIO (v86 E-SPORT) — /tournaments/criar
// ─────────────────────────────────────────────────────────────
// Qualquer jogador CRIA um torneio real: nome, jogo, formato
// (campeonato de pontos OU eliminatória com rondas), tamanho,
// prémio em Pontos Bateu, janela — e EMPRESAS também podem
// criar (marca própria: nome + sector → cartão de marca).
//
// HONESTO: o torneio vive NO APARELHO (`bateu_esport_v1`), os
// resultados entram SÓ por partidas reais reportadas pelo jogo
// (bus `bateu:partida`) — nada finge backend.
// =============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trophy, ArrowLeft, Building2, User, Swords, Zap, Coins, CalendarDays, Flag,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import {
  criarTorneio, validaTorneio, JOGOS_ESPORT, jogoEsport,
  PREMIO_MIN, PREMIO_MAX, JANELA_MIN_DIAS, JANELA_MAX_DIAS,
  type FormatoTorneio, type PistaTorneio, type InputTorneio,
} from "@/lib/esport";

const PISTAS_TORNEIO: PistaTorneio[] = ["praia", "deserto", "vulcao", "qualquer"];

export default function CriarTorneio() {
  useSEO({ title: "Criar Torneio", description: "Cria um torneio de e-sport no Bateu: campeonato de pontos ou eliminatória, para jogadores ou empresas.", canonicalPath: "/tournaments/criar" });
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [jogo, setJogo] = useState("kart");
  const [formato, setFormato] = useState<FormatoTorneio>("campeonato");
  const [tamanho, setTamanho] = useState(8);
  const [premioPontos, setPremioPontos] = useState(500);
  const [pista, setPista] = useState<PistaTorneio>("praia");
  const [voltas, setVoltas] = useState(4);
  const [janelaDias, setJanelaDias] = useState(7);
  const [orgEmpresa, setOrgEmpresa] = useState(false);
  const [empresaNome, setEmpresaNome] = useState("");
  const [empresaSector, setEmpresaSector] = useState("");
  const [erro, setErro] = useState("");

  const ehKart = jogo === "kart";
  const formatoDisponivel = (f: FormatoTorneio) => f === "campeonato" || ehKart;

  const submeter = () => {
    const input: InputTorneio = {
      nome, jogo, formato, tamanho, premioPontos: Number(premioPontos),
      pista, voltas: Number(voltas), janelaDias: Number(janelaDias),
      organizadorEmpresa: orgEmpresa, empresaNome, empresaSector,
    };
    const v = validaTorneio(input);
    if (!v.sim) {
      setErro(t("esport.criar.erro", { motivo: v.motivo }));
      return;
    }
    const { t: torneio } = criarTorneio(input);
    if (!torneio) {
      setErro(t("esport.criar.erro", { motivo: "—" }));
      return;
    }
    navigate(`/tournaments/${torneio.id}`);
  };

  const chip = (ativo: boolean, extra = "") =>
    `rounded-xl px-3 py-2 text-xs font-bold transition-all ${ativo ? "bg-amber-500 text-black" : "bg-white/10 text-slate-200 hover:bg-white/20"} ${extra}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/tournaments")} data-testid="torneio-criar-voltar">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          {t("tournament.backToList")}
        </Button>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold">{t("esport.criar.titulo")}</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-5">{t("esport.criar.sub")}</p>

          <Card>
            <CardContent className="space-y-5 pt-5">
              {/* nome */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block" htmlFor="torneio-nome">{t("esport.criar.nome")}</label>
                <Input id="torneio-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t("esport.criar.nome.falt")} maxLength={40} data-testid="torneio-form-nome" />
              </div>

              {/* jogo */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block">{t("esport.criar.jogo")}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {JOGOS_ESPORT.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => { setJogo(j.id); if (!formatoDisponivel(formato)) setFormato("campeonato"); }}
                      className={chip(jogo === j.id, "text-left truncate")}
                      data-testid={`torneio-form-jogo-${j.id}`}
                    >
                      {j.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* formato */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block">{t("esport.criar.formato")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormato("campeonato")}
                    disabled={!formatoDisponivel("campeonato")}
                    className={`rounded-xl border-2 p-3 text-left transition-all disabled:opacity-50 ${formato === "campeonato" ? "border-amber-400 bg-amber-400/10" : "border-white/10 hover:border-white/30"}`}
                    data-testid="torneio-form-formato-campeonato"
                  >
                    <div className="flex items-center gap-1.5 text-sm font-black"><Zap className="h-4 w-4 text-amber-400" /> {t("esport.criar.formato.campeonato")}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{t("esport.criar.formato.campeonato.desc")}</div>
                  </button>
                  <button
                    onClick={() => formatoDisponivel("eliminatoria") && setFormato("eliminatoria")}
                    disabled={!formatoDisponivel("eliminatoria")}
                    className={`rounded-xl border-2 p-3 text-left transition-all disabled:opacity-50 ${formato === "eliminatoria" ? "border-amber-400 bg-amber-400/10" : "border-white/10 hover:border-white/30"}`}
                    data-testid="torneio-form-formato-eliminatoria"
                  >
                    <div className="flex items-center gap-1.5 text-sm font-black"><Swords className="h-4 w-4 text-rose-400" /> {t("esport.criar.formato.eliminatoria")}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{ehKart ? t("esport.criar.formato.eliminatoria.desc") : t("esport.criar.formato.sokart")}</div>
                  </button>
                </div>
              </div>

              {/* tamanho */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block">{t("esport.criar.tamanho")}</label>
                <div className="flex gap-2">
                  {(formato === "eliminatoria" ? [4, 8] : [4, 8, 12]).map((n) => (
                    <button key={n} onClick={() => setTamanho(n)} className={chip(tamanho === n, "flex-1")} data-testid={`torneio-form-tamanho-${n}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* pista + voltas (kart) */}
              {ehKart && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block flex items-center gap-1"><Flag className="h-3.5 w-3.5" /> {t("esport.criar.pista")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PISTAS_TORNEIO.map((p) => (
                        <button key={p} onClick={() => setPista(p)} className={chip(pista === p)} data-testid={`torneio-form-pista-${p}`}>
                          {t(`esport.criar.pista.${p}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1.5 block">{t("esport.criar.voltas")}</label>
                    <div className="flex gap-2">
                      {[3, 4, 5].map((v) => (
                        <button key={v} onClick={() => setVoltas(v)} className={chip(voltas === v, "flex-1")} data-testid={`torneio-form-voltas-${v}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* prémio */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-amber-400" /> {t("esport.criar.premio")}</label>
                <Input
                  type="number" min={PREMIO_MIN} max={PREMIO_MAX} value={premioPontos}
                  onChange={(e) => setPremioPontos(Number(e.target.value))}
                  data-testid="torneio-form-premio"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">{t("esport.criar.premio.nota", { min: String(PREMIO_MIN), max: String(PREMIO_MAX) })}</p>
              </div>

              {/* janela */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {t("esport.criar.janela")}</label>
                <Input
                  type="number" min={JANELA_MIN_DIAS} max={JANELA_MAX_DIAS} value={janelaDias}
                  onChange={(e) => setJanelaDias(Number(e.target.value))}
                  data-testid="torneio-form-janela"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">{t("esport.criar.janela.nota", { min: String(JANELA_MIN_DIAS), max: String(JANELA_MAX_DIAS) })}</p>
              </div>

              {/* organizador: jogador OU empresa */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block">{t("esport.criar.org")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setOrgEmpresa(false)} className={`rounded-xl border-2 p-3 text-left transition-all ${!orgEmpresa ? "border-amber-400 bg-amber-400/10" : "border-white/10"}`} data-testid="torneio-form-org-jogador">
                    <div className="flex items-center gap-1.5 text-sm font-black"><User className="h-4 w-4 text-orange-400" /> {t("esport.criar.org.jogador")}</div>
                  </button>
                  <button onClick={() => setOrgEmpresa(true)} className={`rounded-xl border-2 p-3 text-left transition-all ${orgEmpresa ? "border-amber-400 bg-amber-400/10" : "border-white/10"}`} data-testid="torneio-form-org-empresa">
                    <div className="flex items-center gap-1.5 text-sm font-black"><Building2 className="h-4 w-4 text-sky-400" /> {t("esport.criar.org.empresa")}</div>
                  </button>
                </div>
                {orgEmpresa && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} placeholder={t("esport.criar.empresa.nome")} maxLength={24} data-testid="torneio-form-empresa-nome" />
                    <Input value={empresaSector} onChange={(e) => setEmpresaSector(e.target.value)} placeholder={t("esport.criar.empresa.sector")} maxLength={24} data-testid="torneio-form-empresa-sector" />
                  </div>
                )}
              </div>

              {erro && <p className="text-xs font-bold text-red-500" data-testid="torneio-criar-erro">{erro}</p>}

              <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700" onClick={submeter} data-testid="torneio-criar-submit">
                <Trophy className="h-4 w-4 mr-2" /> {t("esport.criar.submit")}
              </Button>

              <p className="text-[11px] text-muted-foreground" data-testid="torneio-criar-nota">
                {t("esport.nota.aparelho", { jogo: jogoEsport(jogo)?.label ?? jogo })}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
