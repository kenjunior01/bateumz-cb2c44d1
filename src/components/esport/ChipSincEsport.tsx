// ============================================================
// CHIP DE SINCRONIZAÇÃO DO E-SPORT (v91) — «E-SPORT SEGUE A CONTA»
// ────────────────────────────────────────────────────────────
// Estados honestos (padrão reten-sinc v84): nada finge. O CONVIDADO não
// vê nada aqui (a nota honesta do aparelho já vive nos painéis);
// registado vê EXATAMENTE o que aconteceu:
//   · sincronizado  → torneios/ligas guardados na conta (seguem entre dispositivos)
//   · aSincronizar  → a guardar agora
//   · migracao      → a tabela ainda não existe no servidor (PGRST205
//                     declarado — a migração v91 ainda não foi aplicada)
//   · erro          → motivo real; o aparelho é a fonte por agora
// Variante "chip" (uma palavra) ou "linha" (frase honesta completa).
// ============================================================
import { CloudOff, CloudUpload, Cloud, TriangleAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEsportSinc } from "@/lib/esportStore";

const ChipSincEsport = ({ variante = "chip" }: { variante?: "chip" | "linha" }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { sinc, motivo } = useEsportSinc();

  if (!user) return null; // convidado → os painéis têm a própria nota honesta

  if (variante === "linha") {
    const texto = sinc === "sincronizado"
      ? t("esport.sinc.linha.conta")
      : sinc === "aSincronizar"
        ? t("esport.sinc.linha.aguardar")
        : sinc === "migracao"
          ? t("esport.sinc.linha.migracao")
          : sinc === "erro"
            ? t("esport.sinc.linha.erro", { motivo: motivo || "—" })
            : t("esport.nota.aparelho", { jogo: "BATEU KART" });
    return (
      <p data-testid="esport-sinc-linha" className="mt-1.5 text-[10px] text-muted-foreground/70">
        {texto}
      </p>
    );
  }

  // chip curto
  const conteudo = sinc === "sincronizado"
    ? { icon: Cloud, cls: "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300", rotulo: t("esport.sinc.chip.conta") }
    : sinc === "aSincronizar"
      ? { icon: CloudUpload, cls: "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-300 animate-pulse", rotulo: t("esport.sinc.chip.aguardar") }
      : sinc === "migracao"
        ? { icon: CloudOff, cls: "border-border bg-muted text-muted-foreground", rotulo: t("esport.sinc.chip.migracao") }
        : sinc === "erro"
          ? { icon: TriangleAlert, cls: "border-border bg-muted text-muted-foreground", rotulo: t("esport.sinc.chip.erro") }
          : null;
  if (!conteudo) return null;
  const Icone = conteudo.icon;
  return (
    <span
      data-testid="esport-sinc"
      data-sinc={sinc}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${conteudo.cls}`}
    >
      <Icone className="h-3 w-3" aria-hidden="true" />
      {conteudo.rotulo}
    </span>
  );
};

export default ChipSincEsport;
