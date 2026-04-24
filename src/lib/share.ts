import { toast } from "@/hooks/use-toast";

export type SharePlatform = "facebook" | "twitter" | "telegram" | "linkedin" | "whatsapp" | "copy" | "native";

export interface ShareData {
  title: string;
  text?: string;
  url: string;
}

export const shareTo = async (platform: SharePlatform, data: ShareData) => {
  const url = encodeURIComponent(data.url);
  const text = encodeURIComponent(data.text || data.title);

  if (platform === "native" && navigator.share) {
    try {
      await navigator.share({ title: data.title, text: data.text, url: data.url });
      return;
    } catch {}
  }

  if (platform === "copy") {
    try {
      await navigator.clipboard.writeText(data.url);
      toast({ title: "Link copiado", description: "Partilha onde quiseres ✨" });
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar", variant: "destructive" });
    }
    return;
  }

  const urls: Record<Exclude<SharePlatform, "copy" | "native">, string> = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    whatsapp: `https://wa.me/?text=${text}%20${url}`,
  };
  window.open(urls[platform as keyof typeof urls], "_blank", "noopener,noreferrer,width=600,height=500");
};
