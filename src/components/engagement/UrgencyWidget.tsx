import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Zap, Eye } from "lucide-react";

export default function UrgencyWidget({ className = "" }: { className?: string }) {
  const [playerCount, setPlayerCount] = useState(1247);
  const [viewerCount, setViewerCount] = useState(3891);

  useEffect(() => {
    const update = () => {
      setPlayerCount(prev => prev + Math.floor(Math.random() * 21) - 8);
      setViewerCount(prev => prev + Math.floor(Math.random() * 51) - 20);
    };
    const interval = window.setInterval(update, 4000 + Math.random() * 3000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className={"flex items-center gap-3 flex-wrap " + className}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
          {playerCount.toLocaleString()} a jogar
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, type: "spring", stiffness: 300 }}
        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20"
      >
        <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
          {viewerCount.toLocaleString()} online
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9, type: "spring", stiffness: 300 }}
        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-amber-500/10 border border-amber-500/20"
      >
        <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
          {Math.floor(Math.random() * 20) + 5} batalhas activas
        </span>
      </motion.div>
    </div>
  );
}
