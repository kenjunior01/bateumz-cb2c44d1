import { useState } from "react";
import { Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  url: string;
  className?: string;
}

function getEmbedInfo(url: string): { type: "youtube" | "instagram" | "tiktok" | "direct"; embedUrl: string } | null {
  try {
    const u = new URL(url);
    // YouTube
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let videoId = "";
      if (u.hostname.includes("youtu.be")) {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get("v") || "";
      }
      if (videoId) {
        return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1` };
      }
    }
    // Instagram
    if (u.hostname.includes("instagram.com")) {
      const match = u.pathname.match(/\/(reel|p)\/([^/]+)/);
      if (match) {
        return { type: "instagram", embedUrl: `https://www.instagram.com/${match[1]}/${match[2]}/embed` };
      }
    }
    // TikTok
    if (u.hostname.includes("tiktok.com")) {
      const match = u.pathname.match(/\/video\/(\d+)/);
      if (match) {
        return { type: "tiktok", embedUrl: `https://www.tiktok.com/embed/v2/${match[1]}` };
      }
      // vm.tiktok.com short links — open externally
      return { type: "tiktok", embedUrl: url };
    }
    // Direct video file
    if (/\.(mp4|webm|mov|ogg)(\?|$)/i.test(u.pathname)) {
      return { type: "direct", embedUrl: url };
    }
  } catch {
    // invalid URL
  }
  return null;
}

export default function SocialVideoEmbed({ url, className = "" }: Props) {
  const [playing, setPlaying] = useState(false);
  const info = getEmbedInfo(url);

  if (!info) {
    // Fallback: try as direct video
    return (
      <video src={url} controls className={`w-full rounded-lg ${className}`} />
    );
  }

  if (info.type === "direct") {
    return (
      <video src={info.embedUrl} controls autoPlay className={`w-full rounded-lg ${className}`} />
    );
  }

  if (!playing) {
    return (
      <div
        className={`relative aspect-video bg-secondary rounded-lg flex items-center justify-center cursor-pointer group ${className}`}
        onClick={() => setPlaying(true)}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-lg" />
        <div className="z-10 flex flex-col items-center gap-2">
          <div className="h-14 w-14 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
            <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
          </div>
          <span className="text-xs text-white/80 capitalize">{info.type}</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2 right-2 z-10"
        >
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-white/70 hover:text-white text-xs">
            <ExternalLink className="h-3 w-3" /> Abrir
          </Button>
        </a>
      </div>
    );
  }

  return (
    <div className={`aspect-video rounded-lg overflow-hidden ${className}`}>
      <iframe
        src={info.embedUrl}
        className="w-full h-full border-0"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        title="Video embed"
      />
    </div>
  );
}

export { getEmbedInfo };
