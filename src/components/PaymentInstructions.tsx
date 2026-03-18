import { Smartphone, Wallet, Copy, Check, AlertCircle } from "lucide-react";
import { useState } from "react";
import { formatMZN } from "@/lib/currency";

interface PaymentInstructionsProps {
  method: "mpesa" | "emola";
  number: string | null;
  totalAmount: number;
  brandName?: string;
}

const PaymentInstructions = ({ method, number, totalAmount, brandName }: PaymentInstructionsProps) => {
  const [copied, setCopied] = useState(false);

  const copyNumber = () => {
    if (!number) return;
    navigator.clipboard.writeText(number.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMpesa = method === "mpesa";
  const methodLabel = isMpesa ? "M-Pesa" : "e-Mola";
  const methodColor = isMpesa ? "text-destructive" : "text-accent";
  const methodBg = isMpesa ? "bg-destructive/10 border-destructive/20" : "bg-accent/10 border-accent/20";
  const Icon = isMpesa ? Smartphone : Wallet;

  if (!number) {
    return (
      <div className="rounded-xl border border-border bg-secondary/30 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Número {methodLabel} não configurado</p>
            <p className="text-xs text-muted-foreground mt-1">
              A empresa ainda não configurou o número de {methodLabel}. Contacte o organizador do sorteio.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const steps = isMpesa
    ? [
        "Abra a app M-Pesa ou marque *150#",
        "Selecione \"Transferir Dinheiro\"",
        `Digite o número: ${number}`,
        `Insira o valor: ${formatMZN(totalAmount)}`,
        "Confirme com o seu PIN M-Pesa",
        "Guarde ou tire screenshot do comprovativo",
      ]
    : [
        "Abra a app e-Mola ou marque *898#",
        "Selecione \"Enviar Dinheiro\"",
        `Digite o número: ${number}`,
        `Insira o valor: ${formatMZN(totalAmount)}`,
        "Confirme com o seu PIN e-Mola",
        "Guarde ou tire screenshot do comprovativo",
      ];

  return (
    <div className={`rounded-xl border ${methodBg} p-4 space-y-4`}>
      {/* Header with number */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${methodColor}`} />
          <span className="text-sm font-semibold text-foreground">Pagar via {methodLabel}</span>
        </div>
        {brandName && (
          <span className="text-xs text-muted-foreground">🏢 {brandName}</span>
        )}
      </div>

      {/* Payment number - prominent */}
      <div className="flex items-center gap-3 rounded-lg bg-card p-3 border border-border">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-0.5">Enviar para:</p>
          <p className="font-mono text-xl font-bold text-foreground tracking-wider">{number}</p>
        </div>
        <button
          onClick={copyNumber}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 transition"
          title="Copiar número"
        >
          {copied ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Amount */}
      <div className="rounded-lg bg-primary/10 p-3 text-center">
        <p className="text-xs text-muted-foreground mb-0.5">Valor a enviar</p>
        <p className="font-display text-2xl font-bold text-primary">{formatMZN(totalAmount)}</p>
      </div>

      {/* Step-by-step */}
      <div>
        <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Passos para transferência:</p>
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
          Após o pagamento, envie o comprovativo abaixo. A empresa confirmará o pagamento e os seus bilhetes serão ativados.
        </p>
      </div>
    </div>
  );
};

export default PaymentInstructions;
