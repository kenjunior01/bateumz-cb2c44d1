import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { applyVoucher, type DiscountInfo } from "@/lib/vouchers";
import { CheckCircle2, XCircle, Loader2, Tag } from "lucide-react";

interface VoucherInputProps {
  onApplied: (discount: DiscountInfo) => void;
  raffleId: string;
}

type FeedbackState = "idle" | "loading" | "success" | "error";

export default function VoucherInput({ onApplied, raffleId }: VoucherInputProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [state, setState] = useState<FeedbackState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleApply = async () => {
    if (!code.trim() || !user) return;

    setState("loading");
    setErrorMsg("");

    const result = await applyVoucher(code.trim(), user.id, raffleId);

    if (result.success) {
      setState("success");
      const discountLabel =
        result.discount.type === "percentage"
          ? `${result.discount.value}%`
          : `${result.discount.value} MZN`;
      onApplied(result.discount);
    } else {
      setState("error");
      setErrorMsg(t(result.reason, { value: "0" }));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (state !== "idle") setState("idle");
            }}
            placeholder={t("voucher.placeholder")}
            className="pl-9 font-mono uppercase tracking-wider"
            disabled={state === "loading"}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={!code.trim() || state === "loading"}
          size="sm"
          className="shrink-0"
        >
          {state === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("voucher.apply")
          )}
        </Button>
      </div>

      <AnimatePresence>
        {state === "success" && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{t("voucher.applied")}</span>
          </motion.div>
        )}
        {state === "error" && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
