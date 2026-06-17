import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { validateImageFile, ACCEPT_IMAGES, DEFAULT_MAX_UPLOAD_MB } from "@/lib/upload-utils";

const GRADIENTS = [
  "from-primary to-emerald-400",
  "from-orange-500 via-red-500 to-pink-600",
  "from-yellow-400 via-amber-500 to-orange-600",
  "from-violet-500 via-purple-600 to-fuchsia-600",
  "from-sky-500 via-blue-500 to-indigo-600",
  "from-rose-500 to-pink-500",
  "from-slate-700 to-slate-900",
];

const schema = z.object({
  content: z.string().trim().max(280, "Máximo 280 caracteres").optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

const CreateStoryDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [bg, setBg] = useState(GRADIENTS[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setContent("");
    setBg(GRADIENTS[0]);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    const err = validateImageFile(f, DEFAULT_MAX_UPLOAD_MB);
    if (err) {
      toast.error(err);
      return;
    }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!user) {
      toast.error("Inicie sessão para publicar status");
      return;
    }
    const parsed = schema.safeParse({ content });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (!content.trim() && !imageFile) {
      toast.error("Adicione texto ou imagem");
      return;
    }

    setLoading(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("user-stories")
          .upload(path, imageFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("user-stories").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }

      const { error } = await supabase.from("user_stories").insert({
        user_id: user.id,
        content: content.trim() || null,
        image_url: imageUrl,
        background: bg,
      });
      if (error) throw error;

      toast.success("Status publicado! 🎉");
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message || "Erro ao publicar status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publicar Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className={`relative aspect-[9/12] rounded-2xl bg-gradient-to-br ${bg} overflow-hidden flex items-center justify-center p-6 text-center`}>
            {imagePreview && (
              <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            {imagePreview && <div className="absolute inset-0 bg-black/30" />}
            <p className="relative z-10 text-white font-display text-lg font-bold whitespace-pre-wrap drop-shadow">
              {content || "O seu status aparece aqui..."}
            </p>
            {imagePreview && (
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 text-white"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Text */}
          <div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 280))}
              placeholder="O que está a acontecer?"
              rows={3}
              maxLength={280}
            />
            <p className="text-[11px] text-muted-foreground text-right mt-1">{content.length}/280</p>
          </div>

          {/* Gradient picker */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {GRADIENTS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setBg(g)}
                className={`shrink-0 h-9 w-9 rounded-full bg-gradient-to-br ${g} ring-2 transition-all ${
                  bg === g ? "ring-primary scale-110" : "ring-transparent"
                }`}
                aria-label="Cor de fundo"
              />
            ))}
          </div>

          {/* Image upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_IMAGES}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            {imageFile ? "Trocar imagem" : "Adicionar imagem"}
          </Button>

          <Button onClick={submit} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Publicar (expira em 24h)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStoryDialog;
