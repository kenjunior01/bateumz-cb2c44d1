import { Globe, MapPin } from "lucide-react";
import { COUNTRIES, getRegions } from "@/lib/regions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  country: string;
  region: string;
  onCountry: (c: string) => void;
  onRegion: (r: string) => void;
  compact?: boolean;
}

export default function CountryRegionFilter({ country, region, onCountry, onRegion, compact }: Props) {
  const regions = country && country !== "all" ? getRegions(country) : [];

  return (
    <div className={`flex gap-2 ${compact ? "" : "flex-wrap"}`}>
      <Select value={country || "all"} onValueChange={(v) => { onCountry(v === "all" ? "" : v); onRegion(""); }}>
        <SelectTrigger className={`${compact ? "h-9 w-[150px]" : "h-10 min-w-[170px]"} glass border-border`}>
          <Globe className="h-4 w-4 mr-1 text-primary" />
          <SelectValue placeholder="País" />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          <SelectItem value="all">🌍 Todos países</SelectItem>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.flag} {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {regions.length > 0 && (
        <Select value={region || "all"} onValueChange={(v) => onRegion(v === "all" ? "" : v)}>
          <SelectTrigger className={`${compact ? "h-9 w-[160px]" : "h-10 min-w-[180px]"} glass border-border`}>
            <MapPin className="h-4 w-4 mr-1 text-primary" />
            <SelectValue placeholder="Região" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50 max-h-[300px]">
            <SelectItem value="all">📍 Todas regiões</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
