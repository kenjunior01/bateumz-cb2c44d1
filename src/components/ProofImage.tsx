import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a social-proof reference to a viewable URL.
 * Legacy entries store an absolute URL; new entries store the private
 * storage path in the `social-proofs` bucket, which needs a signed URL.
 */
export function useProofUrl(ref: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!ref) {
      setUrl(null);
      return;
    }
    if (/^https?:\/\//i.test(ref)) {
      setUrl(ref);
      return;
    }
    supabase.storage
      .from("social-proofs")
      .createSignedUrl(ref, 60 * 60)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [ref]);

  return url;
}

interface ProofImageProps {
  proofRef: string;
  alt: string;
  className?: string;
}

export function ProofImage({ proofRef, alt, className }: ProofImageProps) {
  const url = useProofUrl(proofRef);
  if (!url) {
    return <div className={`bg-muted animate-pulse ${className ?? ""}`} />;
  }
  return (
    <motion.img
      src={url}
      alt={alt}
      className={`${className ?? ""} shadow-[0_0_10px_hsl(var(--primary)/0.1)]`}
      loading="lazy"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    />
  );
}
