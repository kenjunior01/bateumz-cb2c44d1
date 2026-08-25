import { motion } from "framer-motion";
import { Facebook, Twitter, Send, Linkedin, Link2, Share2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shareTo, type ShareData } from "@/lib/share";

interface Props {
  data: ShareData;
  size?: "sm" | "default";
}

const buttons = [
  { p: "whatsapp" as const, icon: MessageCircle, label: "WhatsApp", cls: "hover:text-[#25d366]" },
  { p: "facebook" as const, icon: Facebook, label: "Facebook", cls: "hover:text-[#1877f2]" },
  { p: "twitter" as const, icon: Twitter, label: "X / Twitter", cls: "hover:text-foreground" },
  { p: "telegram" as const, icon: Send, label: "Telegram", cls: "hover:text-[#0088cc]" },
  { p: "linkedin" as const, icon: Linkedin, label: "LinkedIn", cls: "hover:text-[#0a66c2]" },
  { p: "copy" as const, icon: Link2, label: "Copiar link", cls: "hover:text-primary" },
];

export default function ShareButtons({ data, size = "default" }: Props) {
  const canNative = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1">
        <Share2 className="h-3 w-3 inline mr-1" /> Partilhar
      </span>
      {buttons.map((b, i) => (
        <motion.div key={b.p} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Button
            variant="outline"
            size={size === "sm" ? "icon" : "icon"}
            className={`h-9 w-9 glass border-border transition-all duration-200 hover:shadow-[0_0_12px_hsl(var(--primary)/0.2)] ${b.cls}`}
            onClick={() => shareTo(b.p, data)}
            aria-label={b.label}
          >
            <b.icon className="h-4 w-4" />
          </Button>
        </motion.div>
      ))}
      {canNative && (
        <Button variant="outline" size="icon" className="h-9 w-9 glass border-border hover:text-primary hover:shadow-[0_0_12px_hsl(var(--primary)/0.2)]" onClick={() => shareTo("native", data)} aria-label="Partilhar">
          <Share2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
