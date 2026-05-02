import { Link, useNavigate } from "react-router-dom";
import { Bell, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import bateuLogo from "@/assets/bateu-logo.png";

const MobileTopBar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="lg:hidden sticky top-0 z-40 bg-background/85 backdrop-blur-xl border-b border-border/40"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <Link to="/" className="flex items-center gap-1.5">
          <img src={bateuLogo} alt="Bateu" className="h-7 w-7" />
          <span className="font-display text-base font-bold">Bateu</span>
        </Link>

        <div className="flex items-center gap-0.5">
          {user && (
            <button
              onClick={() => navigate("/my-points")}
              className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-1 text-[10.5px] font-bold text-accent"
              aria-label="Pontos"
            >
              <Star className="h-3 w-3 fill-accent" /> Pontos
            </button>
          )}
          <LanguageSwitcher />
          <ThemeToggle />
          <button
            onClick={() => navigate(user ? "/dashboard/notifications" : "/login")}
            className="relative p-1.5 text-foreground"
            aria-label="Notificações"
          >
            <Bell className="h-[18px] w-[18px]" />
            {user && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-destructive" />}
          </button>
        </div>
      </div>
    </motion.header>
  );
};

export default MobileTopBar;
