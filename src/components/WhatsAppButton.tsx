import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_NUMBER = "258840000000";
const WHATSAPP_MESSAGE = "Olá! Preciso de ajuda com a plataforma Bateu.";

export default function WhatsAppButton() {
  const [number, setNumber] = useState(DEFAULT_NUMBER);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "general")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && (data.value as any).whatsappNumber) {
          setNumber((data.value as any).whatsappNumber);
        }
      });
  }, []);

  const url = `https://wa.me/${number}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-shadow hover:shadow-xl hover:shadow-[#25D366]/40 md:bottom-6 md:right-6"
      aria-label="Contactar via WhatsApp"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="absolute -top-1 -right-1 flex h-4 w-4">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-75" />
        <span className="relative inline-flex h-4 w-4 rounded-full bg-[#25D366]" />
      </span>
    </motion.a>
  );
}
