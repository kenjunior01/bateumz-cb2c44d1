import { useEffect, useMemo, useState } from "react";
import { Smartphone, Wallet, CreditCard, Building2, QrCode, FileText, Copy, Check, AlertCircle } from "lucide-react";
import { formatMZN } from "@/lib/currency";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

export type PaymentMethodId =
  | "mpesa"
  | "emola"
  | "card"
  | "multicaixa"
  | "unitelMoney"
  | "africellMoney"
  | "baiTransfer"
  | "bfaTransfer"
  | "pix"
  | "boleto"
  | "cardBR"
  | "paypal";

interface PaymentInstructionsProps {
  method: PaymentMethodId;
  /** Override/explicit recipient identifier (number, IBAN, key). When omitted, falls back to platform settings. */
  number?: string | null;
  totalAmount: number;
  brandName?: string;
}

interface PlatformPayments {
  // Moçambique
  mpesaNumber?: string;
  emolaNumber?: string;
  // Angola
  multicaixaNumber?: string;
  unitelMoneyNumber?: string;
  africellMoneyNumber?: string;
  baiIban?: string;
  baiHolder?: string;
  bfaIban?: string;
  bfaHolder?: string;
  // Brasil
  pixKey?: string;
  pixHolder?: string;
  boletoInstructions?: string;
}

const PaymentInstructions = ({ method, number, totalAmount, brandName }: PaymentInstructionsProps) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [platformPayments, setPlatformPayments] = useState<PlatformPayments>({});

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("platform_settings_public")
        .select("value")
        .eq("key", "payments")
        .maybeSingle();
      if (data?.value) setPlatformPayments(data.value as PlatformPayments);
    })();
  }, []);

  const methodLabel = t(`pay.method.${method}`);

  // Resolve recipient identifier: explicit prop wins, else platform settings, else null
  const recipient = useMemo<string | null>(() => {
    if (number) return number;
    const map: Record<PaymentMethodId, string | undefined> = {
      mpesa: platformPayments.mpesaNumber,
      emola: platformPayments.emolaNumber,
      card: undefined,
      multicaixa: platformPayments.multicaixaNumber,
      unitelMoney: platformPayments.unitelMoneyNumber,
      africellMoney: platformPayments.africellMoneyNumber,
      baiTransfer: platformPayments.baiIban,
      bfaTransfer: platformPayments.bfaIban,
      pix: platformPayments.pixKey,
      boleto: platformPayments.boletoInstructions,
      cardBR: undefined,
      paypal: undefined,
    };
    return map[method] ?? null;
  }, [number, method, platformPayments]);

  const copyValue = () => {
    if (!recipient) return;
    navigator.clipboard.writeText(recipient.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Visual config per method
  const visual: Record<PaymentMethodId, { icon: typeof Smartphone; color: string; bg: string }> = {
    mpesa:         { icon: Smartphone, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
    emola:         { icon: Wallet,     color: "text-accent",      bg: "bg-accent/10 border-accent/20" },
    card:          { icon: CreditCard, color: "text-primary",     bg: "bg-primary/10 border-primary/20" },
    multicaixa:    { icon: Smartphone, color: "text-blue-600",    bg: "bg-blue-500/10 border-blue-500/20" },
    unitelMoney:   { icon: Wallet,     color: "text-red-600",     bg: "bg-red-500/10 border-red-500/20" },
    africellMoney: { icon: Wallet,     color: "text-pink-600",    bg: "bg-pink-500/10 border-pink-500/20" },
    baiTransfer:   { icon: Building2,  color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20" },
    bfaTransfer:   { icon: Building2,  color: "text-amber-600",   bg: "bg-amber-500/10 border-amber-500/20" },
    pix:           { icon: QrCode,     color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20" },
    boleto:        { icon: FileText,   color: "text-slate-600",   bg: "bg-slate-500/10 border-slate-500/20" },
    cardBR:        { icon: CreditCard, color: "text-primary",     bg: "bg-primary/10 border-primary/20" },
    paypal:        { icon: CreditCard, color: "text-blue-700",    bg: "bg-blue-500/10 border-blue-500/20" },
  };
  const v = visual[method];
  const Icon = v.icon;

  // Brazilian methods don't need a card-not-configured warning since most are processed online
  const requiresRecipient = !["card", "cardBR", "paypal", "boleto"].includes(method);

  if (requiresRecipient && !recipient) {
    return (
      <div className="rounded-xl border border-border bg-secondary/30 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{t("pay.notConfigured.title", { method: methodLabel })}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("pay.notConfigured.desc", { method: methodLabel })}</p>
          </div>
        </div>
      </div>
    );
  }

  // Step-by-step instructions per method (already i18n-friendly through inline translation)
  const stepsByMethod: Record<PaymentMethodId, string[]> = {
    mpesa: [
      "Abra a app M-Pesa ou marque *150#",
      'Selecione "Transferir Dinheiro"',
      `${t("pay.sendTo")} ${recipient}`,
      `${t("pay.amountToSend")}: ${formatMZN(totalAmount)}`,
      "Confirme com o seu PIN M-Pesa",
      "Guarde ou tire screenshot do comprovativo",
    ],
    emola: [
      "Abra a app e-Mola ou marque *898#",
      'Selecione "Enviar Dinheiro"',
      `${t("pay.sendTo")} ${recipient}`,
      `${t("pay.amountToSend")}: ${formatMZN(totalAmount)}`,
      "Confirme com o seu PIN e-Mola",
      "Guarde ou tire screenshot do comprovativo",
    ],
    card: [
      "Selecione cartão Visa ou Mastercard",
      "Será redirecionado para o gateway seguro",
      `Valor: ${formatMZN(totalAmount)}`,
      "Confirme o pagamento com o seu banco",
    ],
    multicaixa: [
      "Abra a app Multicaixa Express",
      'Escolha "Pagar Serviço" ou "Transferir"',
      `Número do comerciante: ${recipient}`,
      `Valor: ${formatMZN(totalAmount)} (em Kwanzas)`,
      "Confirme com o seu PIN Multicaixa",
      "Envie o comprovativo abaixo",
    ],
    unitelMoney: [
      "Abra a app Unitel Money ou marque *400#",
      'Escolha "Enviar Dinheiro"',
      `Número do comerciante: ${recipient}`,
      `Valor: ${formatMZN(totalAmount)}`,
      "Confirme com o seu PIN Unitel Money",
      "Envie o comprovativo abaixo",
    ],
    africellMoney: [
      "Abra a app Africell Money",
      'Escolha "Pagar / Transferir"',
      `Número do comerciante: ${recipient}`,
      `Valor: ${formatMZN(totalAmount)}`,
      "Confirme com o seu PIN Africell Money",
      "Envie o comprovativo abaixo",
    ],
    baiTransfer: [
      "Aceda ao app/internet banking BAI",
      'Selecione "Transferência IBAN"',
      `IBAN destino: ${recipient}`,
      platformPayments.baiHolder ? `${t("pay.bank.holder")}: ${platformPayments.baiHolder}` : "",
      `Valor: ${formatMZN(totalAmount)}`,
      t("pay.bank.includeRef"),
      "Envie o comprovativo abaixo",
    ].filter(Boolean) as string[],
    bfaTransfer: [
      "Aceda ao app/internet banking BFA Net",
      'Selecione "Transferência IBAN"',
      `IBAN destino: ${recipient}`,
      platformPayments.bfaHolder ? `${t("pay.bank.holder")}: ${platformPayments.bfaHolder}` : "",
      `Valor: ${formatMZN(totalAmount)}`,
      t("pay.bank.includeRef"),
      "Envie o comprovativo abaixo",
    ].filter(Boolean) as string[],
    pix: [
      "Abra o app do seu banco",
      'Escolha "Pix" → "Pagar com chave"',
      `${t("pay.pix.key")}: ${recipient}`,
      platformPayments.pixHolder ? `${t("pay.bank.holder")}: ${platformPayments.pixHolder}` : "",
      `Valor: R$ ${totalAmount.toFixed(2).replace(".", ",")}`,
      "Confirme o pagamento — é instantâneo",
      "Envie o comprovativo abaixo",
    ].filter(Boolean) as string[],
    boleto: [
      "Solicite o boleto após escolher este método",
      t("pay.boleto.payAt"),
      `Valor: R$ ${totalAmount.toFixed(2).replace(".", ",")}`,
      "Os bilhetes serão activados após compensação (1-3 dias úteis)",
    ],
    cardBR: [
      "Selecione crédito ou débito",
      "Pode parcelar (sujeito ao seu emissor)",
      `Valor total: R$ ${totalAmount.toFixed(2).replace(".", ",")}`,
      "Aprovação em segundos pelo gateway seguro",
    ],
    paypal: [
      "Será redirecionado para o PayPal",
      "Inicie sessão na sua conta PayPal",
      `Valor: ${formatMZN(totalAmount)}`,
      "Confirme e regresse à plataforma",
    ],
  };

  const steps = stepsByMethod[method];

  // Different recipient label per method type
  const recipientLabel = (() => {
    switch (method) {
      case "baiTransfer":
      case "bfaTransfer":
        return t("pay.bank.iban");
      case "pix":
        return t("pay.pix.key");
      case "boleto":
        return t("pay.boleto.barcode");
      default:
        return t("pay.sendTo");
    }
  })();

  return (
    <div className={`rounded-xl border ${v.bg} p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`h-5 w-5 ${v.color} shrink-0`} />
          <span className="text-sm font-semibold text-foreground truncate">
            {t("pay.payVia", { method: methodLabel })}
          </span>
        </div>
        {brandName && (
          <span className="text-xs text-muted-foreground shrink-0">🏢 {brandName}</span>
        )}
      </div>

      {/* Recipient identifier */}
      {recipient && (
        <div className="flex items-center gap-3 rounded-lg bg-card p-3 border border-border">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">{recipientLabel}</p>
            <p className="font-mono text-base sm:text-lg font-bold text-foreground tracking-wide break-all">{recipient}</p>
          </div>
          <button
            onClick={copyValue}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 transition"
            title={method === "pix" ? t("pay.pix.copyKey") : t("pay.copyNumber")}
            aria-label={t("pay.copyNumber")}
          >
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
      )}

      {/* Amount */}
      <div className="rounded-lg bg-primary/10 p-3 text-center">
        <p className="text-xs text-muted-foreground mb-0.5">{t("pay.amountToSend")}</p>
        <p className="font-display text-2xl font-bold text-primary">{formatMZN(totalAmount)}</p>
      </div>

      {/* Steps */}
      <div>
        <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">{t("pay.steps")}</p>
        <ol className="space-y-1.5">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-accent/5 p-2.5 border border-accent/10">
        <AlertCircle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {t("pay.afterPaymentNotice")}
        </p>
      </div>
    </div>
  );
};

export default PaymentInstructions;
