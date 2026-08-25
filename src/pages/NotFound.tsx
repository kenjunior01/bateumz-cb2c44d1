import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Search } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const NotFound = () => {
  useSEO({ title: 'Página Não Encontrada (404)', noindex: true });
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />

      {/* Floating orbs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,145,64,0.1) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)" }}
        animate={{ scale: [1.1, 0.8, 1.1], x: [0, -20, 0], y: [0, 25, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 text-center px-6">
        {/* Animated 404 */}
        <motion.div
          className="relative mb-6"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Glow behind 404 */}
          <motion.div
            className="absolute inset-0 blur-3xl rounded-full"
            style={{ background: "radial-gradient(circle, rgba(0,145,64,0.2) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.h1
            className="font-display text-8xl md:text-9xl font-black relative select-none"
            initial={{ y: -30 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <motion.span
              className="inline-block bg-gradient-to-br from-[#009140] via-[#FFD700] to-[#D7263D] bg-clip-text text-transparent bg-[length:200%_auto]"
              animate={{
                backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
                y: [0, -8, 0],
              }}
              transition={{
                backgroundPosition: { duration: 4, repeat: Infinity, ease: "linear" },
                y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              4
            </motion.span>
            <motion.span
              className="inline-block bg-gradient-to-br from-[#FFD700] via-[#D7263D] to-[#6366f1] bg-clip-text text-transparent bg-[length:200%_auto]"
              animate={{
                backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
                y: [0, -12, 0],
                rotate: [0, 3, -3, 0],
              }}
              transition={{
                backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" },
                y: { duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
                rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              0
            </motion.span>
            <motion.span
              className="inline-block bg-gradient-to-br from-[#D7263D] via-[#6366f1] to-[#009140] bg-clip-text text-transparent bg-[length:200%_auto]"
              animate={{
                backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
                y: [0, -8, 0],
              }}
              transition={{
                backgroundPosition: { duration: 5, repeat: Infinity, ease: "linear" },
                y: { duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 },
              }}
            >
              4
            </motion.span>
          </motion.h1>
        </motion.div>

        {/* Fun emoji mascot */}
        <motion.div
          className="mb-4 text-5xl"
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, duration: 0.6, type: "spring", stiffness: 200, damping: 12 }}
        >
          <motion.span
            className="inline-block"
            animate={{ y: [0, -6, 0], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            🎰
          </motion.span>
        </motion.div>

        {/* Text */}
        <motion.p
          className="text-xl text-muted-foreground mb-2 font-medium"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Página não encontrada
        </motion.p>
        <motion.p
          className="text-sm text-muted-foreground/70 mb-8 max-w-sm mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          A página que procuras não existe ou foi movida.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex items-center justify-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <motion.div
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 24px rgba(0,145,64,0.4), 0 0 48px rgba(0,145,64,0.15)",
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#009140] to-[#00b354] text-white font-semibold text-sm shadow-[0_0_16px_rgba(0,145,64,0.3)]"
            >
              <Home className="h-4 w-4" />
              Voltar ao Início
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, borderColor: "rgba(0,145,64,0.5)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Link
              to="/sorteios"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-border bg-card text-foreground font-semibold text-sm shadow-[0_0_15px_hsl(var(--primary)/0.08)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)] transition-shadow"
            >
              <Search className="h-4 w-4" />
              Explorar Sorteios
            </Link>
          </motion.div>
        </motion.div>

        {/* Decorative particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: ["#009140", "#FFD700", "#D7263D", "#6366f1", "#06b6d4", "#f59e0b"][i],
            }}
            initial={{
              opacity: 0,
              x: (i % 2 === 0 ? -1 : 1) * (100 + i * 40),
              y: (i % 3 === 0 ? -1 : 1) * (80 + i * 30),
            }}
            animate={{
              opacity: [0, 0.6, 0],
              x: (i % 2 === 0 ? -1 : 1) * (100 + i * 40 + 60),
              y: (i % 3 === 0 ? -1 : 1) * (80 + i * 30 - 40),
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default NotFound;