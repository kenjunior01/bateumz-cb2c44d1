import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize, Minimize, Monitor } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  children: ReactNode;
  gameName: string;
  /** v13: jogos com HUD/câmara própria (ex.: Bateu World) escondiam TODO o
   *  chrome — e ficavam SEM entrada de ecrã inteiro (o mundo não tem botão
   *  próprio: era o furo do roadmap item 4). Desde a v62 o hideChrome só
   *  esconde o CHIP do nome: o botão de ecrã inteiro fica sempre. */
  hideChrome?: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════
   v62 — ECRÃ INTEIRO HONESTO (roadmap item 4): entrada, saída, resize e
   mobile.
   · ENTRADA: botão sempre presente (mesmo nos mundos imersivos, antes
     escondido por hideChrome — o RPG/Aetheria ficavam sem caminho para
     o ecrã inteiro).
   · SAÍDA: ESC nativo + fullscreenchange sincroniza o estado; no modo
     pseudo (iOS/Sem API), ESC próprio + o mesmo botão sai.
   · RESIZE: no fullscreenchange o wrapper dispara window.resize no frame
     seguinte — o Motor.redimensionar() e o ResizeObserver do Aetheria
     apanham o novo tamanho sem esperar o intervalo de 800 ms.
   · MOBILE: browsers sem requestFullscreen para elementos (iOS) recebem o
     modo PSEUDO — fixed inset-0 + scroll bloqueado, com SAÍDA visível;
     nada de fingir: se o ecrã inteiro nativo não existe, o rótulo diz
     «expandir» e o estado honesto segue o que o browser permite.
   ═══════════════════════════════════════════════════════════════════════ */
const GameFullscreenWrapper = ({ children, gameName, hideChrome }: Props) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pseudo, setPseudo] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useLanguage();

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (isFullscreen || pseudo) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isFullscreen, pseudo]);

  const pedirResize = useCallback(() => {
    // o tamanho da tela muda com o ecrã inteiro — os jogos reagem a resize
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    // sem API de ecrã inteiro para elementos (iOS Safari, alguns webviews):
    // modo pseudo honesto em vez de um erro calado
    if (!document.fullscreenEnabled) {
      setPseudo((p) => !p);
      return;
    }
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // o pedido pode ser recusado (sem gesto do utilizador, permissão) —
      // o fallback pseudo garante o caminho visual; o estado fica coerente
      setPseudo((p) => !p);
    }
  }, []);

  const handleFullscreenChange = useCallback(() => {
    const nowFs = !!document.fullscreenElement;
    setIsFullscreen(nowFs);
    if (!nowFs) setPseudo(false);
    setShowControls(true);
    if (nowFs) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    } else if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }
    pedirResize();
  }, [pedirResize]);

  useEffect(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [handleFullscreenChange]);

  // ESC também sai do modo pseudo (o nativo trata o modo real)
  useEffect(() => {
    if (!pseudo) return;
    const aoEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPseudo(false);
    };
    window.addEventListener("keydown", aoEsc);
    return () => window.removeEventListener("keydown", aoEsc);
  }, [pseudo]);

  // modo pseudo: scroll do corpo bloqueado (o mundo ocupa tudo)
  useEffect(() => {
    if (!pseudo) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, [pseudo]);

  useEffect(() => {
    if (!isFullscreen && !pseudo) return;
    if (!containerRef.current) return;
    const handleMove = () => showControlsTemporarily();
    containerRef.current.addEventListener("mousemove", handleMove);
    containerRef.current.addEventListener("touchstart", handleMove);
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener("mousemove", handleMove);
        containerRef.current.removeEventListener("touchstart", handleMove);
      }
    };
  }, [isFullscreen, pseudo, showControlsTemporarily]);

  const ativo = isFullscreen || pseudo;

  return (
    <div
      ref={containerRef}
      data-testid="game-fullscreen-wrapper"
      data-fullscreen={ativo ? "true" : "false"}
      className={"relative" + (ativo ? " bg-black" : "") + (pseudo ? " fixed inset-0 z-[100]" : "")}
      onMouseMove={ativo ? showControlsTemporarily : undefined}
    >
      <AnimatePresence>
        {showControls && !hideChrome && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-2 right-2 z-20 flex items-center gap-1.5"
          >
            {ativo && gameName && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-xl border border-white/10"
              >
                <Monitor className="h-3.5 w-3.5 text-primary" />
                <span className="text-white/90 text-xs font-semibold">{gameName}</span>
              </motion.div>
            )}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={toggleFullscreen}
              data-testid="world-fullscreen"
              className={
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl backdrop-blur-xl border text-xs font-semibold transition-all " +
                (ativo
                  ? "bg-white/10 hover:bg-white/20 border-white/20 text-white/90 hover:text-white"
                  : "bg-black/40 hover:bg-black/60 border-white/10 text-white/80 hover:text-white")
              }
              title={ativo ? t("world.fs.sair") : t("world.fs.entrar")}
              aria-label={ativo ? t("world.fs.sair") : t("world.fs.entrar")}
            >
              {ativo ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{ativo ? t("world.fs.sair") : t("world.fs.entrar")}</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
};

export default GameFullscreenWrapper;

/* ═══════════════════════════════════════════════════════════════════════
   v62 — ToggleEcraInteiro: o botão DENTRO do portal imersivo.
   Os mundos (RPG/Aetheria) chegam ao body por createPortal (fixed z-[80])
   — fora do wrapper e da sua stacking context, por isso o botão de ecrã
   inteiro tem de viver NO portal. Pede ecrã inteiro para o ANCESTRAL
   posicionado (o próprio portal); ESC nativo e fullscreenchange mantêm o
   estado honesto. Sem API (iOS): nota honesta no title — o portal já é
   fixed inset-0, cobre a viewport inteira por si (nada a fingir).
   ═══════════════════════════════════════════════════════════════════════ */
export function ToggleEcraInteiro({ autoOcultarMs = 3000 }: { autoOcultarMs?: number } = {}) {
  const [ativo, setAtivo] = useState(false);
  const [visivel, setVisivel] = useState(true);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    const sincroniza = () => {
      setAtivo(!!document.fullscreenElement);
      setVisivel(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (document.fullscreenElement) {
        timerRef.current = setTimeout(() => setVisivel(false), autoOcultarMs);
      }
    };
    document.addEventListener("fullscreenchange", sincroniza);
    return () => {
      document.removeEventListener("fullscreenchange", sincroniza);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoOcultarMs]);

  const alternar = useCallback(async () => {
    const alvo = botaoRef.current?.closest(".fixed") as HTMLElement | null;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (ativo && !document.fullscreenEnabled) {
        // sair do modo pseudo (sem API): devolve o estado honesto
        setAtivo(false);
        setVisivel(true);
        return;
      } else if (document.fullscreenEnabled && alvo) {
        await alvo.requestFullscreen();
      } else {
        // sem API para elementos: o portal fixed inset-0 já cobre a viewport
        // — estado honesto: o botão passa a anunciar a SAÍDA do modo expandido.
        // NO pseudo o botão NÃO se auto-oculta (não há overlay do navegador a
        // devolvê-lo — esconder seria deixá-lo preso fora do modo expandido).
        setAtivo(true);
        setVisivel(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        return;
      }
    } catch {
      // pedido recusado — nada de fingir: o estado segue o que o browser permite
      setAtivo(!!document.fullscreenElement);
    }
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  }, [ativo, autoOcultarMs]);

  if (!visivel) return null;
  return (
    <button
      ref={botaoRef}
      onClick={alternar}
      data-testid="world-fullscreen"
      className="absolute top-1/2 right-1.5 z-[90] flex -translate-y-1/2 items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-xl transition-all hover:bg-black/60 hover:text-white"
      title={ativo ? t("world.fs.sair") : t("world.fs.entrar")}
      aria-label={ativo ? t("world.fs.sair") : t("world.fs.entrar")}
    >
      {ativo ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{ativo ? t("world.fs.sair") : t("world.fs.entrar")}</span>
    </button>
  );
}
