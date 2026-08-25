import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Ticket, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const MobileActionButtons = () => {
  const { t } = useLanguage();
  return (
    <motion.div
      className="flex gap-2 px-4 pb-4 lg:hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link to="/marketplace" className="flex-1">
        <Button className="w-full gap-2 h-11 shadow-[0_0_10px_hsl(var(--primary)/0.1)]" variant="default">
          <Ticket className="h-4 w-4" /> {t("mobile.viewAll")}
        </Button>
      </Link>
      <Link to="/my-tickets" className="flex-1">
        <Button className="w-full gap-2 h-11 shadow-[0_0_10px_hsl(var(--primary)/0.1)]" variant="outline">
          <Star className="h-4 w-4" /> {t("mobile.myTickets")}
        </Button>
      </Link>
    </motion.div>
  );
};

export default MobileActionButtons;
