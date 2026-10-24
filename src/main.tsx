import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { initBootSelfHeal } from "./lib/self-heal";
import App from "./App.tsx";
import LoadingScreen from "./components/LoadingScreen.tsx";
import "./index.css";
import "./micro-interactions.css";

// PWA self-heal: deteta deploys novos e purga caches de chunks obsoletos
initBootSelfHeal();

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
    if (isStageTool) return;
    const timer = setTimeout(() => setLoading(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {loading ? <LoadingScreen key="loading" /> : <App key="app" />}
    </AnimatePresence>
  );
};

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found – cannot mount app");
createRoot(rootEl).render(<Root />);
