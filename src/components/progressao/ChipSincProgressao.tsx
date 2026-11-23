// ============================================================
// CHIP DE SINCRONIZAÇÃO DA PROGRESSÃO (v84) — «O PROGRESSO SEGUE A CONTA»
// ────────────────────────────────────────────────────────────
// Estados honestos (padrão ia-sinc v58): nada finge. O CONVIDADO não
// vê nada aqui (a mensagem honesta de convidado vive nos próprios
// painéis); registado vê EXATAMENTE o que aconteceu:
//   · sincronizado  → o progresso está na conta (segue entre dispositivos)
//   · aSincronizar  → a guardar agora
//   · migracao      → a tabela ainda não existe no servidor (PGRST205
//                     declarado — a migração v84 ainda não foi aplicada)
//   · erro          → motivo real; o aparelho é a fonte por agora
// Variante "chip" (uma palavra) ou "linha" (frase honesta completa).
// ============================================================
import { CloudOff, CloudUpload, Cloud, TriangleAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProgressaoSinc } from "@/lib/progressaoStore";

const ChipSincProgressao = ({ variante = "chip" }: { variante?: "chip" | "linha" }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { sinc, motivo } = useProgressaoSinc();

  if (!user) return null; // convidado → os painéis têm as próprias linhas honestas

  if (variante === "linha") {
    const texto = sinc === "sincronizado"
      ? t("reten.sinc.linha.conta")
      : sinc === "aSincronizar"
        ? t("reten.sinc.linha.aguardar")
        : sinc === "migracao"
          ? t("reten.sinc.linha.migracao")
          : sinc === "erro"
            ? t("reten.sinc.linha.erro", { motivo: motivo || "—" })
            : t("reten.missao.aparelho");
    return (
      <p data-testid="reten-sinc-linha" className="mt-1.5 text-[10px] text-muted-foreground/70">
        {texto}
      </p>
    );
  }

  // chip curto
  const conteudo = sinc === "sincronizado"
    ? { icon: Cloud, cls: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300", rotulo: t("reten.sinc.chip.conta") }
    : sinc === "aSincronizar"
      ? { icon: CloudUpload, cls: "border-amber-500/50 bg-amber-500/10 text-amber-300 animate-pulse", rotulo: t("reten.sinc.chip.aguardar") }
      : sinc === "migracao"
        ? { icon: CloudOff, cls: "border-border bg-muted text-muted-foreground", rotulo: t("reten.sinc.chip.migracao") }
        : sinc === "erro"
          ? { icon: TriangleAlert, cls: "border-border bg-muted text-muted-foreground", rotulo: t("reten.sinc.chip.erro") }
          : null;
  if (!conteudo) return null;
  const Icone = conteudo.icon;
  return (
    <span
      data-testid="reten-sinc"
      data-sinc={sinc}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${conteudo.cls}`}
    >
      <Icone className="h-3 w-3" aria-hidden="true" />
      {conteudo.rotulo}
    </span>
  );
};

export default ChipSincProgressao;
