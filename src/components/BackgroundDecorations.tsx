import { memo } from "react";

/* REA / PERF — Decoração de fundo 100% ESTÁTICA em todos os dispositivos.
   O canvas O(n²) de partículas, os orbs com blur animado (framer-motion) e os
   SVGs flutuantes foram removidos: mantinham a app inteira numa layer de GPU
   com custo de render por frame, em todas as páginas — enchimento visual que
   custava performance no desktop e no WebView do APK.
   O clima visual (noise + grid + orbs fixos em CSS puro) fica igual. */

const BackgroundDecorations = memo(() => (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
    <div className="bg-noise-overlay" />
    <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.04]" />
    <div
      className="absolute rounded-full"
      style={{ top: "5%", left: "15%", width: 500, height: 500, background: "radial-gradient(circle, color-mix(in srgb, hsl(var(--primary)) 0.08, transparent) 0%, transparent 70%)", filter: "blur(60px)" }}
    />
    <div
      className="absolute rounded-full"
      style={{ top: "40%", left: "60%", width: 450, height: 450, background: "radial-gradient(circle, color-mix(in srgb, hsl(var(--accent)) 0.06, transparent) 0%, transparent 70%)", filter: "blur(50px)" }}
    />
    <div
      className="absolute rounded-full"
      style={{ top: "65%", left: "25%", width: 400, height: 400, background: "radial-gradient(circle, color-mix(in srgb, hsl(var(--primary)) 0.05, transparent) 0%, transparent 70%)", filter: "blur(55px)" }}
    />
    <div className="vignette-overlay" />
  </div>
));

BackgroundDecorations.displayName = "BackgroundDecorations";
export default BackgroundDecorations;
