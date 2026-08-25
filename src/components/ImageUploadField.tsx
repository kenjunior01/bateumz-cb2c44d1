import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Link2 } from "lucide-react";
import { validateImageFile, ACCEPT_IMAGES, DEFAULT_MAX_UPLOAD_MB, formatUploadHint } from "@/lib/upload-utils";
import { toast } from "sonner";

interface Props {
  label?: string;
  bucket: string;
  pathPrefix?: string;
  value: string;
  onChange: (url: string) => void;
  helper?: string;
  /** if true, also exposes a "paste URL" toggle */
  allowUrl?: boolean;
  maxSizeMB?: number;
}

/**
 * Reusable image upload field that uploads to a Supabase Storage bucket
 * and returns the public URL. Optionally allows pasting an external URL.
 */
export default function ImageUploadField({
  label = "Imagem",
  bucket,
  pathPrefix = "uploads",
  value,
  onChange,
  helper,
  allowUrl = true,
  maxSizeMB = DEFAULT_MAX_UPLOAD_MB,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const handleFile = async (file: File) => {
    const err = validateImageFile(file, maxSizeMB);
    if (err) {
      toast.error(err);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error("Erro ao enviar imagem: " + (e.message || "desconhecido"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {allowUrl && (
          <button
            type="button"
            onClick={() => setShowUrl((v) => !v)}
            className="text-[11px] text-primary hover:underline flex items-center gap-1"
          >
            <Link2 className="h-3 w-3" />
            {showUrl ? "Carregar ficheiro" : "Ou colar URL"}
          </button>
        )}
      </div>

      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border/60 bg-muted shadow-[0_0_10px_hsl(var(--primary)/0.1)]">
          <img src={value} alt="" className="w-full h-40 object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/90 hover:bg-background flex items-center justify-center shadow-md"
            aria-label="Remover imagem"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : showUrl && allowUrl ? (
        <Input
          placeholder="https://exemplo.com/imagem.jpg"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-border/60 rounded-lg p-6 hover:border-primary/40 hover:bg-secondary/30 transition-colors flex flex-col items-center justify-center text-muted-foreground gap-2"
        >
          {uploading ? (
            <>
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-xs">A enviar…</span>
            </>
          ) : (
            <>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs sm:text-sm">
                Toque para escolher imagem <ImageIcon className="inline h-3 w-3 ml-1" />
              </p>
              <p className="text-[10px]">{formatUploadHint(maxSizeMB)}</p>
            </>
          )}
        </button>
      )}

      {!value && (
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_IMAGES}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      )}
      {helper && <p className="text-[10px] text-muted-foreground">{helper}</p>}
    </motion.div>
  );
}

export function uploadImageToBucket(
  bucket: string,
  pathPrefix: string,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  return supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: "3600", upsert: false })
    .then(({ error }) => {
      if (error) throw error;
      return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    });
}
