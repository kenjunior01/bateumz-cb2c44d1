import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import bateuLogo from "@/assets/bateu-logo.png";

const FloatingShape = ({ delay, duration, x, y, size, color }: {
  delay: number; duration: number; x: string; y: string; size: number; color: string;
}) => (
  <motion.div
    className="absolute rounded-full opacity-20"
    style={{ left: x, top: y, width: size, height: size, background: color }}
    animate={{
      y: [0, -30, 0, 20, 0],
      x: [0, 15, -10, 5, 0],
      scale: [1, 1.2, 0.9, 1.1, 1],
      rotate: [0, 90, 180, 270, 360],
    }}
    transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

const Ticket3D = ({ delay, x, y }: { delay: number; x: string; y: string }) => (
  <motion.div
    className="absolute"
    style={{ left: x, top: y }}
    animate={{
      y: [0, -40, 0],
      rotateY: [0, 180, 360],
      rotateZ: [-5, 5, -5],
    }}
    transition={{ duration: 4, delay, repeat: Infinity, ease: "easeInOut" }}
  >
    <div className="w-10 h-6 md:w-14 md:h-8 rounded-lg bg-gradient-to-r from-primary/30 to-accent/30 border border-primary/20 flex items-center justify-center backdrop-blur-sm">
      <div className="w-1.5 h-1.5 rounded-full bg-accent/60" />
    </div>
  </motion.div>
);

const StarEl = ({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) => (
  <motion.div
    className="absolute text-accent"
    style={{ left: x, top: y, fontSize: size }}
    animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5], rotate: [0, 180, 360] }}
    transition={{ duration: 2, delay, repeat: Infinity }}
  >
    ✦
  </motion.div>
);

const LoadingScreen = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 15, 100));
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <FloatingShape delay={0} duration={6} x="10%" y="20%" size={80} color="hsl(var(--primary))" />
        <FloatingShape delay={1} duration={8} x="80%" y="10%" size={120} color="hsl(var(--accent))" />
        <FloatingShape delay={2} duration={7} x="60%" y="70%" size={60} color="hsl(var(--primary))" />
        <FloatingShape delay={0.5} duration={9} x="20%" y="80%" size={100} color="hsl(var(--accent))" />
        <FloatingShape delay={3} duration={5} x="45%" y="40%" size={40} color="hsl(var(--primary))" />
        <Ticket3D delay={0} x="15%" y="30%" />
        <Ticket3D delay={1.5} x="75%" y="25%" />
        <Ticket3D delay={3} x="55%" y="65%" />
        <StarEl delay={0} x="25%" y="15%" size={16} />
        <StarEl delay={0.5} x="70%" y="45%" size={12} />
        <StarEl delay={1} x="40%" y="85%" size={14} />
        <motion.div
          className="absolute left-1/3 top-1/4 h-64 w-64 rounded-full bg-primary/10 blur-[100px]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <img src={bateuLogo} alt="Bateu" className="h-20 w-20 md:h-28 md:w-28 drop-shadow-2xl" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 font-display text-3xl md:text-4xl font-bold text-foreground"
        >
          Bateu
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-1 text-sm text-muted-foreground"
        >
          Real prizes. Verified winners.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 200 }}
          transition={{ delay: 0.6 }}
          className="mt-8 h-1 overflow-hidden rounded-full bg-secondary"
          style={{ width: 200 }}
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.15 }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;
