import { useState, useRef, useEffect, useCallback, Children } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

/**
 * RollUp — carrossel horizontal universal da Bateu (mobile + desktop).
 * - Snap por cartão, arrasto/swipe, setas no desktop, auto-avanço opcional
 * - Indicador de progresso (barrinha) + dots clicáveis
 * - Cabeçalho: kicker colorido + título + link "ver tudo"
 * ⭐ REA a11y: aria-roledescription="carousel", navegação por teclado (setas),
 *   respeito por prefers-reduced-motion, dots clicáveis com aria-label.
 */
export default function RollUp({
  kicker,
  title,
  subtitle,
  accent = "#00d4ff",
  viewAllHref,
  viewAllLabel = "Ver tudo",
  autoAdvanceMs = 0,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  accent?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  autoAdvanceMs?: number;
  children: React.ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);
  const pausedRef = useRef(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const count = Children.count(children);

  /* ⭐ REA: auto-avanço desligado se o utilizador prefere menos movimento */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const p = max > 0 ? el.scrollLeft / max : 0;
    setProgress(p);
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft < max - 8);
    const step = el.clientWidth * 0.85 || 1;
    setPage(Math.round(el.scrollLeft / step));
    setPages(Math.max(1, Math.ceil(max / step) + 1));
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [onScroll]);

  const scrollByCard = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  /* auto-avanço — pausa quando o utilizador interage; desligado com reduced-motion */
  useEffect(() => {
    if (!autoAdvanceMs || count < 2 || reducedMotion) return;
    const id = setInterval(() => {
      const el = scrollerRef.current;
      if (!el || pausedRef.current) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      if (el.scrollLeft >= max - 12) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: el.clientWidth * 0.8, behavior: "smooth" });
    }, autoAdvanceMs);
    return () => clearInterval(id);
  }, [autoAdvanceMs, count, reducedMotion]);

  const pause = () => { pausedRef.current = true; };
  const resume = () => { pausedRef.current = false; };

  /* ⭐ REA a11y: navegação por teclado no trilho */
  const onTrilhoKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); scrollByCard(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); scrollByCard(-1); }
  };

  const goToPage = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.85 || 1;
    el.scrollTo({ left: i * step, behavior: "smooth" });
  };

  return (
    <section
      className="relative py-8 sm:py-12"
      style={{ background: "linear-gradient(180deg, #050508 0%, #07060d 50%, #050508 100%)" }}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onTouchStart={pause}
      onTouchEnd={resume}
      aria-roledescription="carousel"
    >
      {/* brilho de fundo na cor do acento */}
      <div
        className="absolute inset-x-0 top-0 h-40 pointer-events-none opacity-60"
        style={{ background: `radial-gradient(ellipse 50% 80% at 50% 0%, ${accent}0d, transparent 70%)` }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* ─── Cabeçalho ─── */}
        <div className="flex items-end justify-between gap-3 mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: accent }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: accent }} />
              </span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.18em]" style={{ color: accent }}>
                {kicker}
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white leading-tight line-clamp-2">{title}</h2>
            {subtitle && <p className="text-xs sm:text-sm text-zinc-500 mt-1 line-clamp-1">{subtitle}</p>}
          </div>

          {viewAllHref && (
            <Link
              to={viewAllHref}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold px-3.5 py-2 rounded-xl transition-all duration-200 hover:scale-[1.03] active:scale-95"
              style={{ color: accent, background: `${accent}0f`, border: `1px solid ${accent}26` }}
            >
              {viewAllLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* ─── Trilho ─── */}
        <div className="relative group">
          {/* setas desktop */}
          <button
            aria-label="Anterior"
            onClick={() => scrollByCard(-1)}
            className={`hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${canPrev ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            style={{ background: "rgba(10,10,16,0.92)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <button
            aria-label="Seguinte"
            onClick={() => scrollByCard(1)}
            className={`hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${canNext ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            style={{ background: "rgba(10,10,16,0.92)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>

          {/* degradés nas bordas (desktop) */}
          <div className="hidden md:block absolute inset-y-0 left-0 w-10 z-10 pointer-events-none" style={{ background: "linear-gradient(90deg, #050508, transparent)" }} />
          <div className="hidden md:block absolute inset-y-0 right-0 w-10 z-10 pointer-events-none" style={{ background: "linear-gradient(-90deg, #050508, transparent)" }} />

          <div
            ref={scrollerRef}
            tabIndex={0}
            onKeyDown={onTrilhoKey}
            role="group"
            aria-label={title}
            className="flex gap-3.5 sm:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 focus-visible:ring-2 focus-visible:ring-white/30 focus:outline-none rounded-lg"
            style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
          >
            {children}
          </div>
        </div>

        {/* ─── Indicador de progresso ─── */}
        {pages > 1 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{ width: `${Math.max(12, progress * 100)}%`, background: `linear-gradient(90deg, ${accent}66, ${accent})`, boxShadow: `0 0 12px ${accent}55` }}
              />
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              {Array.from({ length: Math.min(pages, 8) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i)}
                  aria-label={`Ir para posição ${i + 1}`}
                  className="rounded-full transition-all duration-200 hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  style={{
                    width: i === Math.min(page, 7) ? 14 : 5,
                    height: 5,
                    background: i === Math.min(page, 7) ? accent : "rgba(255,255,255,0.15)",
                  }}
                />
              ))}
              <span className="ml-1 text-[10px] font-bold tabular-nums" style={{ color: accent }} aria-hidden>
                {Math.min(page, 7) + 1}/{Math.min(pages, 8)}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
