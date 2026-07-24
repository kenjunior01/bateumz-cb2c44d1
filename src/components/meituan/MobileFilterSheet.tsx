import { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  onApply?: () => void;
  onReset?: () => void;
  applyLabel?: string;
  resetLabel?: string;
  resultCount?: number;
}

/** Bottom sheet com filtros e CTAs Aplicar / Limpar (estilo Meituan / DiDi). */
export default function MobileFilterSheet({
  open,
  onOpenChange,
  title = "Filtros",
  children,
  onApply,
  onReset,
  applyLabel,
  resetLabel = "Limpar",
  resultCount,
}: Props) {
  const cta = applyLabel ?? (typeof resultCount === "number" ? `Ver ${resultCount} resultados` : "Aplicar");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto p-0 flex flex-col">
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <SheetHeader className="px-5 pt-2 pb-3 border-b border-border/40">
          <SheetTitle className="text-left text-base">{title}</SheetTitle>
        </SheetHeader>

        <div className="px-5 py-4 space-y-5 flex-1 overflow-y-auto">{children}</div>

        <SheetFooter className="px-5 py-3 border-t border-border/40 flex-row gap-2 sm:flex-row">
          {onReset && (
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-full"
              onClick={() => onReset()}
            >
              {resetLabel}
            </Button>
          )}
          <Button
            className="flex-1 h-11 rounded-full"
            onClick={() => {
              onApply?.();
              onOpenChange(false);
            }}
          >
            {cta}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
