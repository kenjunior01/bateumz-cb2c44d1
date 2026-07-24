interface Props {
  count?: number;
  cols?: 2 | 3;
}

/** Skeleton em grid 2-col com brilho discreto (estilo Meituan). */
export default function MeituanSkeleton({ count = 6, cols = 2 }: Props) {
  return (
    <div className={`grid gap-3 ${cols === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden bg-card border border-border/40">
          <div className="aspect-square bg-muted animate-pulse" />
          <div className="p-2.5 space-y-2">
            <div className="h-3 rounded bg-muted animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
