import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Eye, EyeOff, ExternalLink, RotateCcw, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRegionalTheme } from "@/contexts/RegionalThemeContext";
import { COUNTRIES } from "@/lib/regions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Floating bar that lets admins/superadmins preview the public UI as if they
 * were browsing from another country. It switches the RegionalThemeContext
 * country (and therefore CSS variables + translations) without changing any
 * data or account. Visible only to admin/superadmin and never on admin or
 * dashboard pages, where it would distract from real work.
 */
export default function RegionalPreviewBar() {
  const { role } = useAuth();
  const { country, setCountry, region } = useRegionalTheme();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(true);
  const [original, setOriginal] = useState<string | null>(null);

  // Remember the country we started on so admins can quickly snap back.
  useEffect(() => {
    if (original === null) setOriginal(country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (role !== "admin" && role !== "superadmin") return null;
  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) return null;

  const previewing = original !== null && original !== country;

  return (
    <div className="fixed bottom-20 lg:bottom-4 right-3 z-[60] pointer-events-auto">
      {open ? (
        <div className="glass-strong rounded-2xl border border-border shadow-elegant p-2 flex items-center gap-2 backdrop-blur-md">
          <div className="flex items-center gap-1.5 px-2">
            <Globe className="h-4 w-4" style={{ color: "var(--region-primary, hsl(var(--primary)))" }} />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Preview as
            </span>
          </div>

          <Select value={country} onValueChange={(v) => setCountry(v)}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-[70]">
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code} className="text-xs">
                  {c.flag} {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {region?.default_language && (
            <span className="hidden sm:inline rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono uppercase text-muted-foreground">
              {region.default_language}
            </span>
          )}

          {previewing && original && (
            <button
              type="button"
              onClick={() => setCountry(original)}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-1 rounded transition-colors"
              title="Reset to original country"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}

          <Link
            to="/"
            className="hidden md:flex items-center gap-1 text-[11px] font-semibold rounded px-2 py-1 text-primary-foreground"
            style={{ background: "var(--region-primary, hsl(var(--primary)))" }}
          >
            <ExternalLink className="h-3 w-3" /> Home
          </Link>

          <button
            type="button"
            aria-label="Hide preview bar"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <EyeOff className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Show regional preview bar"
          className="glass-strong rounded-full border border-border shadow-elegant p-2 backdrop-blur-md"
          title="Regional preview"
        >
          <Eye className="h-4 w-4" style={{ color: "var(--region-primary, hsl(var(--primary)))" }} />
        </button>
      )}
    </div>
  );
}
