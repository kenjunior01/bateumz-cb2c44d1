import { ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  size?: "sm" | "md";
}

export default function VerifiedBadge({ size = "sm" }: VerifiedBadgeProps) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-primary cursor-help">
          <ShieldCheck className={iconSize} />
          {size === "md" && <span className="text-[10px] font-semibold">Verificada</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Empresa verificada — entregou prémios com sucesso</p>
      </TooltipContent>
    </Tooltip>
  );
}
