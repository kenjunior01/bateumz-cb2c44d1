import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Ticket, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TicketQRCodeProps {
  ticketId: string;
  raffleName: string;
  raffleSlug: string;
  status: string;
  ticketNumber: string;
}

export default function TicketQRCode({
  ticketId,
  raffleName,
  raffleSlug,
  status,
  ticketNumber,
}: TicketQRCodeProps) {
  const { t } = useLanguage();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [generating, setGenerating] = useState(true);

  // QR code data payload — encode ticket info for scanning/verification
  const qrPayload = JSON.stringify({
    tid: ticketId,
    slug: raffleSlug,
    num: ticketNumber,
    v: 1,
  });

  useEffect(() => {
    let cancelled = false;
    setGenerating(true);

    QRCode.toDataURL(qrPayload, {
      width: 240,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
          setGenerating(false);
        }
      })
      .catch((err) => {
        console.error("QR generation error:", err);
        setGenerating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [qrPayload]);

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.download = `ticket-${ticketNumber}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const statusColorMap: Record<string, string> = {
    active: "text-primary bg-primary/10",
    winner: "text-accent bg-accent/10",
    completed: "text-muted-foreground bg-muted/30",
    cancelled: "text-destructive bg-destructive/10",
    pending: "text-yellow-500 bg-yellow-500/10",
  };

  const statusLabelMap: Record<string, string> = {
    active: "Ativo",
    winner: "Vencedor",
    completed: "Concluído",
    cancelled: "Cancelado",
    pending: "Pendente",
  };

  return (
    <Card className="glass overflow-hidden">
      <CardContent className="p-6 flex flex-col items-center text-center gap-4">
        <h3 className="font-display text-lg font-bold text-foreground">
          {t("qr.title")}
        </h3>

        <div className="relative rounded-xl border-2 border-border p-3 bg-white">
          {generating ? (
            <div className="flex items-center justify-center w-[240px] h-[240px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <img
              src={qrDataUrl}
              alt={`QR Code - Bilhete ${ticketNumber}`}
              className="w-[240px] h-[240px]"
            />
          )}
        </div>

        <div className="space-y-1.5 w-full">
          <div className="flex items-center justify-center gap-2">
            <Ticket className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {t("qr.ticket", { number: ticketNumber })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{raffleName}</p>
          <Badge
            variant="outline"
            className={`text-xs ${statusColorMap[status] || statusColorMap.active}`}
          >
            {statusLabelMap[status] || status}
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={!qrDataUrl || generating}
          className="w-full max-w-xs"
        >
          <Download className="h-4 w-4 mr-2" />
          {t("qr.download")}
        </Button>
      </CardContent>
    </Card>
  );
}
