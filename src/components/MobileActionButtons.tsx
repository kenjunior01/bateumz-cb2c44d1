import { Link } from "react-router-dom";
import { Ticket, Star, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const MobileActionButtons = () => {
  return (
    <div className="flex gap-2 px-4 pb-4 lg:hidden">
      <Link to="/marketplace" className="flex-1">
        <Button className="w-full gap-2 h-11" variant="default">
          <Ticket className="h-4 w-4" /> Ver Todos
        </Button>
      </Link>
      <Link to="/dashboard" className="flex-1">
        <Button className="w-full gap-2 h-11" variant="outline">
          <Star className="h-4 w-4" /> Meus Bilhetes
        </Button>
      </Link>
    </div>
  );
};

export default MobileActionButtons;
