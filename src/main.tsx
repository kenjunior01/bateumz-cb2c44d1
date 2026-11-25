import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { initBootSelfHeal } from "./lib/self-heal";
import { warmRouteChunkFor } from "./lib/routePrefetch";
// v90 — MODO ALTO CONTRASTE: aplicado ANTES da React montar (zero FOUC):
// um atributo no <html> que o CSS §v90 da index.css chaveia.
import { aplicarContraste } from "./lib/contraste";
import App from "./App.tsx";
import LoadingScreen from "./components/LoadingScreen.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";
import "./micro-interactions.css";

// PWA self-heal: deteta deploys novos e purga caches de chunks obsoletos
initBootSelfHeal();

// v90: alto contraste — escolha EXPLÍCITA do utilizador; se nunca escolheu,
// o SO decide (prefers-contrast: more). Um atributo, aplicado no boot.
aplicarContraste({
  storage: localStorage,
  documentElement: document.documentElement,
  matchMedia: (q) => window.matchMedia(q),
});

// PWA: Unregister service workers in preview/iframe contexts
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");
if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}

const Root = () => {
  // Ferramentas de palco (jogos de palco/estúdio) arrancam SEM ecrã de loading:
  // a empresa abre a meio de uma live real — cada segundo conta.
  const isStageTool = /^\/(palco|estudio-jogos)/.test(window.location.pathname);
  const [loading, setLoading] = useState(!isStageTool);

  useEffect(() => {
    // v39 auditoria (P0 1): o shell HTML estático do index.html cumpriu o seu
    // papel (marca + barra + fallback navegável ANTES de qualquer JS). No
    // primeiro commit da React desarmamos o vigia e removemos o shell —
    // exactamente quando o ecrã de marca React assume. Se a React nunca
    // montar (bundle abortado / erro fatal), o vigia revela o painel de erro.
    (window as unknown as { __bateuMontado?: () => void }).__bateuMontado?.();
    document.getElementById("bateu-shell")?.remove();
    if (isStageTool) return;
    // v26 Web excellence: aquecer o chunk da home DURANTE o ecrã de marca —
    // quando o loading sai, a home já está descarregada (na rede, é puro
    // paralelismo; em dev, esconde a transformação on-demand do vite).
    import("./pages/Index.tsx").catch(() => {});
    // v26.2: deep-link? aquece TAMBÉM o chunk da rota actual em paralelo —
    // antes, o chunk só começava a descarregar DEPOIS do ecrã de marca.
    warmRouteChunkFor(window.location.pathname);
    // O ecrã de loading é marca, não prisão — 0.9s e a app arranca.
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {loading ? (
        <LoadingScreen key="loading" />
      ) : (
        <ErrorBoundary key="app">
          <App />
        </ErrorBoundary>
      )}
    </AnimatePresence>
  );
};

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found – cannot mount app");
createRoot(rootEl).render(<Root />);
