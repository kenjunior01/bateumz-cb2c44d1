import { motion } from "framer-motion";
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
        <motion.span
          className="inline-flex items-center gap-1 text-primary cursor-help shadow-[0_0_10px_hsl(var(--primary)/0.1)] rounded-sm"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          whileHover={{ scale: 1.1 }}
        >
          <ShieldCheck className={iconSize} />
          {size === "md" && <span className="text-[10px] font-semibold">Verified</span>}
        </motion.span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Verified business — has delivered prizes successfully</p>
      </TooltipContent>
    </Tooltip>
  );
}
