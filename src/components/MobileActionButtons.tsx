import { Link } from "react-router-dom";
import { Ticket, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const MobileActionButtons = () => {
  const { t } = useLanguage();
  return (
    <div className="flex gap-2 px-4 pb-4 lg:hidden">
      <Link to="/marketplace" className="flex-1">
        <Button className="w-full gap-2 h-11" variant="default">
          <Ticket className="h-4 w-4" /> {t("mobile.viewAll")}
        </Button>
      </Link>
      <Link to="/my-tickets" className="flex-1">
        <Button className="w-full gap-2 h-11" variant="outline">
          <Star className="h-4 w-4" /> {t("mobile.myTickets")}
        </Button>
      </Link>
    </div>
  );
};

export default MobileActionButtons;
