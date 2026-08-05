import { useState, useRef, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize, Minimize, X } from "lucide-react";

interface Props {
  children: ReactNode;
  gameName: string;
}

const GameFullscreenWrapper = ({ children, gameName }: Props) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("[fullscreen] error:", err);
    }
  }, []);

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useState(() => {
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  });

  return (
    <div ref={containerRef} className="relative">
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white/80 hover:text-white text-xs font-semibold transition-colors"
          title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
        >
          {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{isFullscreen ? "Sair" : "Tela Cheia"}</span>
        </motion.button>
      </div>
      {children}
    </div>
  );
};

export default GameFullscreenWrapper;
