import { Globe } from "lucide-react";
import { COUNTRIES } from "@/lib/regions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";

interface Props {
  compact?: boolean;
  className?: string;
}

/**
 * Header-level country switcher. Updates RegionalThemeContext so theme colors,
 * translations and catalog filters follow the chosen country.
 */
export default function RegionCountrySwitcher({ compact, className }: Props) {
  const { country, setCountry } = useRegionalTheme();
  return (
    <Select value={country} onValueChange={(v) => setCountry(v)}>
      <SelectTrigger
        className={`${compact ? "h-9 w-[110px]" : "h-9 w-[130px]"} glass border-border ${className ?? ""}`}
        aria-label="Select country"
      >
        <Globe className="h-4 w-4 mr-1 text-primary" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-popover z-50">
        {COUNTRIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            {c.flag} {compact ? c.code : c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
