import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Eye } from "lucide-react";

export interface ProductCardMeituanProps {
  to: string;
  image?: string | null;
  imageFallback?: ReactNode;
  title: string;
  subtitle?: string | null;
  /** Top-left coloured tag (ex.: "Destaque") */
  topLeftBadge?: { label: string; tone?: "primary" | "accent" | "danger" } | null;
  /** Top-right small chip (category) */
  topRightChip?: string | null;
  /** Bottom-left small badge over image (ex.: "Sem stock") */
  bottomLeftBadge?: { label: string; tone?: "danger" | "muted" } | null;
  /** Big featured price line (ex.: "12.500 MT/mês") */
  priceLine: ReactNode;
  /** Strikethrough or smaller secondary price (ex.: "Total: 320.000 MT") */
  secondaryPriceLine?: ReactNode;
  /** Right side stat next to secondary line (ex.: "24x") */
  rightStat?: ReactNode;
  location?: string | null;
  views?: number | null;
  /** Extra small footer row */
  footer?: ReactNode;
  index?: number;
}

const toneToBadge = {
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
  danger: "bg-destructive text-destructive-foreground",
  muted: "bg-foreground/70 text-background",
};

/** Cartão denso 2-col estilo Meituan: imagem 1:1 com tags, info compacta abaixo. */
export default function ProductCardMeituan({
  to,
  image,
  imageFallback,
  title,
  subtitle,
  topLeftBadge,
  topRightChip,
  bottomLeftBadge,
  priceLine,
  secondaryPriceLine,
  rightStat,
  location,
  views,
  footer,
  index = 0,
}: ProductCardMeituanProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.015, 0.25), duration: 0.25 }}
    >
      <Link to={to} className="block">
        <div className="rounded-2xl overflow-hidden bg-card border border-border/50 active:scale-[0.99] transition group">
          {/* Image */}
          <div className="relative aspect-square bg-muted overflow-hidden">
            {image ? (
              <img
                src={image}
                alt={title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                {imageFallback}
              </div>
            )}

            {topLeftBadge && (
              <span
                className={`absolute top-1.5 left-1.5 ${toneToBadge[topLeftBadge.tone ?? "primary"]} text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm`}
              >
                {topLeftBadge.label}
              </span>
            )}

            {topRightChip && (
              <span className="absolute top-1.5 right-1.5 bg-background/85 backdrop-blur text-foreground text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                {topRightChip}
              </span>
            )}

            {bottomLeftBadge && (
              <span
                className={`absolute bottom-1.5 left-1.5 ${toneToBadge[bottomLeftBadge.tone ?? "muted"]} text-[10px] font-medium px-1.5 py-0.5 rounded-md`}
              >
                {bottomLeftBadge.label}
              </span>
            )}
          </div>

          {/* Body */}
          <div className="p-2.5 space-y-1">
            <h3 className="text-[13px] font-semibold leading-tight line-clamp-2 min-h-[34px]">
              {title}
            </h3>

            {subtitle && (
              <p className="text-[11px] text-muted-foreground line-clamp-1">{subtitle}</p>
            )}

            <div className="flex items-baseline justify-between gap-1 pt-0.5">
              <div className="text-primary font-bold text-[15px] leading-none truncate">
                {priceLine}
              </div>
              {rightStat && (
                <span className="text-[10px] text-muted-foreground shrink-0">{rightStat}</span>
              )}
            </div>

            {secondaryPriceLine && (
              <p className="text-[10.5px] text-muted-foreground line-clamp-1">{secondaryPriceLine}</p>
            )}

            {(location || typeof views === "number") && (
              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                {location ? (
                  <span className="inline-flex items-center gap-0.5 truncate max-w-[70%]">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{location}</span>
                  </span>
                ) : <span />}
                {typeof views === "number" && (
                  <span className="inline-flex items-center gap-0.5 shrink-0">
                    <Eye className="h-2.5 w-2.5" />
                    {views}
                  </span>
                )}
              </div>
            )}

            {footer}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
