// =============================================================
// VITRINE DE TROFÉUS (v87 «TROFÉUS QUE SE MOSTRAM») — Perfil
// ─────────────────────────────────────────────────────────────
// Apresenta os troféus REAIS derivados pelo núcleo trofeus.ts:
// só campeonatos/ligas fechados com «eu» em 1.º lugar. Estado
// vazio honesto com caminho real para /tournaments. Os números
// (troféus · pódios · competições) vêm TODOS da store do aparelho
// — nada é inventado, nada finge servidor.
// =============================================================
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Building2, User, ChevronRight, Swords, CalendarDays } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trofeusDoAparelho, type TrofeuEsport } from "@/lib/trofeus";

export default function VitrineTrofeus() {
  const { t } = useLanguage();
  const resumo = useMemo(() => trofeusDoAparelho(), []);

  return (
    <Card className="glass border-amber-500/30 mb-8" data-testid="perfil-trofeus">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-sm font-black text-foreground flex items-center gap-2" data-testid="perfil-trofeus-titulo">
            <Trophy className="h-4 w-4 text-amber-400" />
            {t("perfil.trofeus.titulo")}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]" data-testid="perfil-trofeus-stats">
            <span className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-2 py-1 font-bold text-amber-200" data-testid="perfil-trofeus-chip-trofeus">
              {resumo.trofeus.length} {t("perfil.trofeus.chip.trofeus")}
            </span>
            <span className="rounded-lg border border-slate-400/40 bg-slate-400/10 px-2 py-1 font-bold text-slate-200" data-testid="perfil-trofeus-chip-podios">
              {resumo.podios} {t("perfil.trofeus.chip.podios")}
            </span>
            <span className="rounded-lg border border-sky-400/40 bg-sky-400/10 px-2 py-1 font-bold text-sky-200" data-testid="perfil-trofeus-chip-competicoes">
              {resumo.competicoes} {t("perfil.trofeus.chip.competicoes")}
            </span>
          </div>
        </div>

        {resumo.trofeus.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center space-y-2" data-testid="perfil-trofeus-vazio">
            <Trophy className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-bold text-foreground">{t("perfil.trofeus.vazio.titulo")}</p>
            <p className="text-xs text-muted-foreground">{t("perfil.trofeus.vazio.sub")}</p>
            <Link
              to="/tournaments"
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-500/30"
              data-testid="perfil-trofeus-cta"
            >
              {t("perfil.trofeus.vazio.cta")} <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2" data-testid="perfil-trofeus-lista">
            {resumo.trofeus.map((tf) => <CartaoTrofeu key={tf.id} tf={tf} />)}
          </div>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground flex items-start gap-1.5" data-testid="perfil-trofeus-nota">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {t("perfil.trofeus.nota")}
        </p>
      </CardContent>
    </Card>
  );
}

function CartaoTrofeu({ tf }: { tf: TrofeuEsport }) {
  const { t } = useLanguage();
  const data = new Date(tf.fechadoEm).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-transparent p-3"
      data-testid={`perfil-trofeus-cartao-${tf.id}`}
      data-trofeu-tipo={tf.tipo}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow" style={{ background: tf.organizador.cor }}>
        <span className="text-xs font-black text-white">{tf.organizador.iniciais}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="text-sm font-bold text-foreground truncate max-w-[16rem]">{tf.nome}</p>
          <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-black text-amber-200" data-testid="perfil-trofeus-selo-campeao">
            {t("perfil.trofeus.campeao")}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2">
          {tf.tipo === "liga" ? <Medal className="h-3 w-3" /> : <Swords className="h-3 w-3" />}
          {tf.jogoLabel}
          {tf.formato === "eliminatoria" && <>· {t("esport.criar.formato.eliminatoria")}</>}
          {tf.organizador.tipo === "empresa" && (
            <span className="inline-flex items-center gap-1 text-sky-300">
              <Building2 className="h-3 w-3" /> {tf.organizador.nome}
            </span>
          )}
          {tf.organizador.tipo !== "empresa" && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" /> {tf.organizador.nome}
            </span>
          )}
          · {data}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs font-black text-emerald-300" data-testid="perfil-trofeus-premio">{t("perfil.trofeus.premio", { n: String(tf.premioPontos) })}</p>
      </div>
    </div>
  );
}
