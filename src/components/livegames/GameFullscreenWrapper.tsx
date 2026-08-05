import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize, Minimize, X, Monitor } from "lucide-react";

interface Props {
  children: ReactNode;
  gameName: string;
}

const GameFullscreenWrapper = ({ children, gameName }: Props) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [autoHideTimer, setAutoHideTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (isFullscreen) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("[fullscreen] error:", err);
    }
  }, []);

  const handleFullscreenChange = useCallback(() => {
    const nowFs = !!document.fullscreenElement;
    setIsFullscreen(nowFs);
    if (nowFs) {
      setShowControls(true);
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    } else {
      setShowControls(true);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [handleFullscreenChange]);

  useEffect(() => {
    if (!isFullscreen || !containerRef.current) return;
    const handleMove = () => showControlsTemporarily();
    containerRef.current.addEventListener("mousemove", handleMove);
    containerRef.current.addEventListener("touchstart", handleMove);
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener("mousemove", handleMove);
        containerRef.current.removeEventListener("touchstart", handleMove);
      }
    };
  }, [isFullscreen, showControlsTemporarily]);

  return (
    <div
      ref={containerRef}
      className={"relative" + (isFullscreen ? " bg-black flex items-center justify-center" : "")}
      onMouseMove={isFullscreen ? showControlsTemporarily : undefined}
    >
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-2 right-2 z-20 flex items-center gap-1.5"
          >
            {isFullscreen && gameName && (
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
              className={
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-xl border text-xs font-semibold transition-all " +
                (isFullscreen
                  ? "bg-white/10 hover:bg-white/20 border-white/20 text-white/90 hover:text-white"
                  : "bg-black/40 hover:bg-black/60 border-white/10 text-white/80 hover:text-white")
              }
              title={isFullscreen ? "Sair da tela cheia (Esc)" : "Tela cheia"}
            >
              {isFullscreen
                ? <Minimize className="h-3.5 w-3.5" />
                : <Maximize className="h-3.5 w-3.5" />
              }
              <span className="hidden sm:inline">{isFullscreen ? "Sair" : "Tela Cheia"}</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
};

export default GameFullscreenWrapper;
