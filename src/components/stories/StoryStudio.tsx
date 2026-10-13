// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Type, Image as ImageIcon, Video, Smile, BarChart3, Brain, Zap, Link as LinkIcon,
  Music2, Palette, Loader2, X, Sparkles, Clock, AlignLeft, AlignCenter, AlignRight,
  Wand2, Store,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { validateImageFile, DEFAULT_MAX_UPLOAD_MB } from "@/lib/upload-utils";
import {
  STORY_FILTERS, STORY_GRADIENTS, STORY_FONTS, STICKER_PACKS, MUSIC_VIBES,
  type StorySticker, type StoryPoll, type StoryQuiz, type StoryFlashDeal,
} from "@/lib/stories";

const CAPTION_COLORS = ["#ffffff", "#0a0a0f", "#fbbf24", "#22d3ee", "#f472b6", "#4ade80", "#a78bfa", "#fb923c"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

type TabId = "media" | "text" | "stickers" | "interactive" | "extras";

const StoryStudio = ({ open, onOpenChange, onCreated }: Props) => {
  const { user, role } = useAuth();
  const [tab, setTab] = useState<TabId>("media");
  const [saving, setSaving] = useState(false);
  const isBusiness = role === "business";
  const [myRaffles, setMyRaffles] = useState<{ id: string; title: string }[]>([]);
  const [raffleId, setRaffleId] = useState<string>("");

  // Mídia
  const [mediaType, setMediaType] = useState<"text" | "image" | "video">("text");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [filter, setFilter] = useState("none");
  const [bg, setBg] = useState(STORY_GRADIENTS[0]);

  // Texto
  const [content, setContent] = useState("");
  const [font, setFont] = useState(STORY_FONTS[0].id);
  const [captionColor, setCaptionColor] = useState("#ffffff");
  const [captionSize, setCaptionSize] = useState<"sm" | "md" | "lg" | "xl">("xl");
  const [captionAlign, setCaptionAlign] = useState<"top" | "center" | "bottom">("center");

  // Stickers
  const [stickers, setStickers] = useState<StorySticker[]>([]);
  const [pendingSticker, setPendingSticker] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Interações
  const [poll, setPoll] = useState<StoryPoll | null>(null);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["", ""]);
  const [quiz, setQuiz] = useState<StoryQuiz | null>(null);
  const [quizQ, setQuizQ] = useState("");
  const [quizOpts, setQuizOpts] = useState(["", ""]);
  const [quizCorrect, setQuizCorrect] = useState(0);
  const [quizReward, setQuizReward] = useState(25);
  const [deal, setDeal] = useState<StoryFlashDeal | null>(null);
  const [dealLabel, setDealLabel] = useState("");
  const [dealPct, setDealPct] = useState(20);
  const [dealCode, setDealCode] = useState("");

  // Extras
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("Ver mais");
  const [music, setMusic] = useState<{ title: string; vibe: string } | null>(null);
  const [duration, setDuration] = useState(5);

  // Ao abrir: empresas carregam os seus sorteios ativos (story promocional)
  useEffect(() => {
    if (!open || !user || !isBusiness) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("raffles")
          .select("id, title, prize_title")
          .eq("business_user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(20);
        setMyRaffles(((data || []) as any[]).map((r) => ({ id: r.id, title: r.prize_title || r.title })));
      } catch { /* silencioso */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reset = () => {
    setTab("media");
    setMediaType("text");
    setImageFile(null); setImagePreview(null);
    setVideoFile(null); setVideoPreview(null);
    setFilter("none"); setBg(STORY_GRADIENTS[0]);
    setContent(""); setFont(STORY_FONTS[0].id);
    setCaptionColor("#ffffff"); setCaptionSize("xl"); setCaptionAlign("center");
    setStickers([]); setPendingSticker(null);
    setPoll(null); setPollQ(""); setPollOpts(["", ""]);
    setQuiz(null); setQuizQ(""); setQuizOpts(["", ""]); setQuizCorrect(0); setQuizReward(25);
    setDeal(null); setDealLabel(""); setDealPct(20); setDealCode("");
    setLinkUrl(""); setLinkLabel("Ver mais");
    setMusic(null); setDuration(5);
    setRaffleId("");
  };

  const handleImage = (f: File | undefined) => {
    if (!f) return;
    const err = validateImageFile(f, DEFAULT_MAX_UPLOAD_MB);
    if (err) return toast.error(err);
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
    setMediaType("image");
    setVideoFile(null); setVideoPreview(null);
  };

  const handleVideo = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) return toast.error("Ficheiro tem de ser vídeo");
    if (f.size > 50 * 1024 * 1024) return toast.error("Vídeo máximo: 50MB");
    setVideoFile(f);
    setVideoPreview(URL.createObjectURL(f));
    setMediaType("video");
    setImageFile(null); setImagePreview(null);
  };

  const addSticker = (emoji: string) => {
    setPendingSticker(emoji);
    toast.info("Toque no preview para posicionar o sticker");
  };

  const placeSticker = (e: React.MouseEvent) => {
    if (!pendingSticker || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setStickers((s) => [...s, {
      emoji: pendingSticker,
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
      size: 36,
      rotate: Math.round(Math.random() * 30 - 15),
    }]);
    setPendingSticker(null);
  };

  const applyPoll = () => {
    if (!pollQ.trim() || pollOpts.filter((o) => o.trim()).length < 2) {
      return toast.error("Pergunta + 2 opções mínimas");
    }
    setPoll({
      question: pollQ.trim(),
      options: pollOpts.filter((o) => o.trim()),
    });
    // enquete e quiz são exclusivos (não se sobrepõem no ecrã)
    setQuiz(null);
    toast.success("Enquete adicionada ✅");
  };

  const applyQuiz = () => {
    const opts = quizOpts
      .map((o, i) => ({ text: o.trim(), i }))
      .filter((x) => x.text);
    if (!quizQ.trim() || opts.length < 2) {
      return toast.error("Pergunta + 2 opções mínimas");
    }
    // o índice da certa é remapeado depois de filtrar opções vazias
    const correctIdx = opts.findIndex((x) => x.i === quizCorrect);
    if (correctIdx < 0) {
      return toast.error("Marque qual opção é a resposta certa");
    }
    setQuiz({
      question: quizQ.trim(),
      options: opts.map((x) => x.text),
      correct: correctIdx,
      reward: quizReward,
    });
    setPoll(null); // exclusivo com a enquete
    toast.success("Quiz adicionado 🎯");
  };

  const applyDeal = () => {
    if (!dealLabel.trim() || !dealCode.trim()) {
      return toast.error("Preencha descrição e código");
    }
    setDeal({
      label: dealLabel.trim(),
      discountPct: dealPct,
      code: dealCode.trim().toUpperCase(),
      expiresAt: new Date(Date.now() + 24 * 3600e3).toISOString(),
    });
    toast.success("Oferta relâmpago adicionada ⚡");
  };

  const canPublish = () => {
    if (mediaType === "image" && !imageFile) return false;
    if (mediaType === "video" && !videoFile) return false;
    if (mediaType === "text" && !content.trim()) return false;
    return true;
  };

  const uploadFile = async (bucket: string, file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const publish = async () => {
    if (!user) return toast.error("Inicie sessão para publicar");
    if (!canPublish()) return toast.error("Adicione texto, imagem ou vídeo");
    setSaving(true);
    try {
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;

      if (mediaType === "image" && imageFile) {
        imageUrl = await uploadFile("user-stories", imageFile);
      }
      if (mediaType === "video" && videoFile) {
        videoUrl = await uploadFile("user-stories-video", videoFile);
      }

      // link sempre com protocolo/rota válida
      let safeLink = linkUrl.trim();
      if (safeLink && !safeLink.startsWith("/") && !/^https?:\/\//i.test(safeLink)) {
        safeLink = `https://${safeLink}`;
      }

      const { error } = await supabase.from("user_stories").insert({
        user_id: user.id,
        content: content.trim() || null,
        image_url: imageUrl,
        video_url: videoUrl,
        media_type: mediaType,
        background: mediaType === "text" ? bg : null,
        filter: filter !== "none" ? filter : null,
        stickers: stickers.length > 0 ? stickers : null,
        caption_style: {
          color: captionColor,
          size: captionSize,
          align: captionAlign,
        },
        font_family: font,
        poll,
        quiz,
        flash_deal: deal,
        link_url: safeLink || null,
        link_label: linkLabel.trim() || null,
        music_track: music,
        duration_seconds: duration,
        business_id: isBusiness ? user.id : null,
        raffle_id: raffleId || null,
      });
      if (error) throw error;

      toast.success("Story publicado no ar! 🎉");
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao publicar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const filterCss = STORY_FILTERS.find((f) => f.id === filter)?.css || "none";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Criar Story — Studio Completo
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[280px_1fr] gap-5">
          {/* PREVIEW */}
          <div className="order-1 md:order-2">
            <div
              ref={previewRef}
              onClick={placeSticker}
              className={`relative aspect-[9/16] w-full max-w-[260px] mx-auto rounded-2xl overflow-hidden border-2 border-border bg-gradient-to-br ${bg} ${pendingSticker ? "cursor-crosshair ring-2 ring-primary" : ""}`}
            >
              {mediaType === "video" && videoPreview ? (
                <video src={videoPreview} className="absolute inset-0 w-full h-full object-cover" style={{ filter: filterCss }} autoPlay muted loop playsInline />
              ) : mediaType === "image" && imagePreview ? (
                <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: filterCss }} />
              ) : null}

              {stickers.map((st, i) => (
                <span
                  key={i}
                  className="absolute select-none drop-shadow-lg"
                  style={{ left: `${st.x}%`, top: `${st.y}%`, fontSize: st.size, transform: `rotate(${st.rotate}deg)` }}
                >
                  {st.emoji}
                </span>
              ))}

              {content && (
                <div
                  className={`absolute left-3 right-3 text-center ${
                    captionAlign === "top" ? "top-8" : captionAlign === "bottom" ? "bottom-24" : "top-1/2 -translate-y-1/2"
                  }`}
                >
                  <p
                    className={`${captionSize === "xl" ? "text-2xl" : captionSize === "lg" ? "text-xl" : captionSize === "sm" ? "text-sm" : "text-base"} font-bold whitespace-pre-wrap leading-snug drop-shadow ${font}`}
                    style={{ color: captionColor }}
                  >
                    {content}
                  </p>
                </div>
              )}

              {deal && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[85%] rounded-xl bg-gradient-to-r from-orange-500 to-red-600 p-2 text-center">
                  <p className="text-white text-[9px] font-bold uppercase">⚡ Oferta</p>
                  <p className="text-white font-black text-lg">-{deal.discountPct}%</p>
                  <p className="text-white/90 text-[10px]">{deal.label}</p>
                </div>
              )}

              {poll && (
                <div className="absolute bottom-20 left-2 right-2 space-y-1.5">
                  <p className="text-white text-xs font-semibold text-center drop-shadow">{poll.question}</p>
                  {poll.options.map((o, i) => (
                    <div key={i} className="rounded-lg border border-white/50 bg-white/20 backdrop-blur px-2 py-1.5 text-[11px] text-white text-center">{o}</div>
                  ))}
                </div>
              )}
              {quiz && !poll && (
                <div className="absolute bottom-20 left-2 right-2 space-y-1.5">
                  <p className="text-white text-xs font-semibold text-center drop-shadow">{quiz.question}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {quiz.options.map((o, i) => (
                      <div key={i} className={`rounded-lg px-1.5 py-1.5 text-[10px] text-white text-center border ${i === quiz.correct ? "border-emerald-300 bg-emerald-500/40" : "border-white/50 bg-white/20"}`}>{o}</div>
                    ))}
                  </div>
                </div>
              )}

              {music && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 text-white text-[9px]">
                  <Music2 className="h-2.5 w-2.5" /> {music.title}
                </div>
              )}
              {linkUrl && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-black text-[10px] font-bold">
                  🔗 {linkLabel}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <Slider value={[duration]} min={3} max={30} step={1} onValueChange={(v) => setDuration(v[0])} className="w-24" />
              {duration}s
            </div>

            <Button onClick={publish} disabled={saving || !canPublish()} className="w-full mt-3">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Publicar Story
            </Button>
          </div>

          {/* EDITOR */}
          <div className="order-2 md:order-1">
            <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
              <TabsList className="w-full flex-wrap h-auto gap-1">
                <TabsTrigger value="media" className="text-[11px]"><ImageIcon className="h-3 w-3 mr-1" />Mídia</TabsTrigger>
                <TabsTrigger value="text" className="text-[11px]"><Type className="h-3 w-3 mr-1" />Texto</TabsTrigger>
                <TabsTrigger value="stickers" className="text-[11px]"><Smile className="h-3 w-3 mr-1" />Stickers</TabsTrigger>
                <TabsTrigger value="interactive" className="text-[11px]"><BarChart3 className="h-3 w-3 mr-1" />Interação</TabsTrigger>
                <TabsTrigger value="extras" className="text-[11px]"><LinkIcon className="h-3 w-3 mr-1" />Extras</TabsTrigger>
              </TabsList>

              {/* MÍDIA */}
              <TabsContent value="media" className="space-y-3 mt-3">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "text", icon: Type, label: "Texto" },
                    { id: "image", icon: ImageIcon, label: "Imagem" },
                    { id: "video", icon: Video, label: "Vídeo" },
                  ] as const).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMediaType(m.id)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${
                        mediaType === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <m.icon className="h-4 w-4" />
                      <span className="text-[11px] font-medium">{m.label}</span>
                    </button>
                  ))}
                </div>

                {mediaType === "image" && (
                  <>
                    <input type="file" accept="image/*" className="hidden" id="story-img" onChange={(e) => handleImage(e.target.files?.[0])} />
                    <Button variant="outline" className="w-full" onClick={() => document.getElementById("story-img")?.click()}>
                      <ImageIcon className="h-4 w-4 mr-2" /> {imageFile ? "Trocar imagem" : "Escolher imagem"}
                    </Button>
                    <div>
                      <Label className="text-xs flex items-center gap-1"><Palette className="h-3 w-3" /> Filtro</Label>
                      <div className="flex gap-1.5 overflow-x-auto mt-1.5 pb-1">
                        {STORY_FILTERS.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                              filter === f.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {mediaType === "video" && (
                  <input type="file" accept="video/*" className="hidden" id="story-video" onChange={(e) => handleVideo(e.target.files?.[0])} />
                )}
                {mediaType === "video" && (
                  <Button variant="outline" className="w-full" onClick={() => document.getElementById("story-video")?.click()}>
                    <Video className="h-4 w-4 mr-2" /> {videoFile ? "Trocar vídeo" : "Escolher vídeo (máx 50MB)"}
                  </Button>
                )}

                {mediaType === "text" && (
                  <div>
                    <Label className="text-xs">Fundo</Label>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {STORY_GRADIENTS.map((g) => (
                        <button
                          key={g}
                          onClick={() => setBg(g)}
                          className={`h-8 w-8 rounded-full bg-gradient-to-br ${g} ring-2 transition-all ${bg === g ? "ring-primary scale-110" : "ring-transparent"}`}
                          aria-label="Fundo"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TEXTO */}
              <TabsContent value="text" className="space-y-3 mt-3">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 280))}
                  placeholder="Escreva algo incrível..."
                  rows={3}
                  maxLength={280}
                />
                <p className="text-[10px] text-muted-foreground text-right">{content.length}/280</p>

                <div>
                  <Label className="text-xs">Fonte</Label>
                  <div className="flex gap-1.5 mt-1.5">
                    {STORY_FONTS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFont(f.id)}
                        className={`px-3 py-1 rounded-full text-[11px] border ${font === f.id ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Cor do texto</Label>
                  <div className="flex gap-1.5 mt-1.5">
                    {CAPTION_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCaptionColor(c)}
                        className={`h-7 w-7 rounded-full border-2 ${captionColor === c ? "border-primary scale-110" : "border-border"}`}
                        style={{ backgroundColor: c }}
                        aria-label="Cor"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <div>
                    <Label className="text-xs">Tamanho</Label>
                    <div className="flex gap-1 mt-1.5">
                      {(["sm", "md", "lg", "xl"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setCaptionSize(s)}
                          className={`px-2.5 py-1 rounded-full text-[11px] border ${captionSize === s ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                        >
                          {s.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Posição</Label>
                    <div className="flex gap-1 mt-1.5">
                      {([
                        { id: "top", icon: AlignLeft },
                        { id: "center", icon: AlignCenter },
                        { id: "bottom", icon: AlignRight },
                      ] as const).map((a) => (
                        <button
                          key={a.id}
                          onClick={() => setCaptionAlign(a.id)}
                          className={`px-2.5 py-1 rounded-full border ${captionAlign === a.id ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                        >
                          <a.icon className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* STICKERS */}
              <TabsContent value="stickers" className="space-y-3 mt-3">
                {STICKER_PACKS.map((pack) => (
                  <div key={pack.name}>
                    <Label className="text-xs">{pack.name}</Label>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {pack.emojis.map((e) => (
                        <button
                          key={e}
                          onClick={() => addSticker(e)}
                          className="h-9 w-9 rounded-lg bg-card border border-border hover:border-primary/50 text-xl hover:scale-110 transition-transform"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {stickers.length > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-muted p-2">
                    <span className="text-xs text-muted-foreground">{stickers.length} sticker(s) no story</span>
                    <Button size="sm" variant="ghost" onClick={() => setStickers([])}>
                      <X className="h-3.5 w-3.5 mr-1" /> Limpar
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* INTERAÇÃO */}
              <TabsContent value="interactive" className="space-y-4 mt-3">
                {/* ENQUETE */}
                <div className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> Enquete</Label>
                    {poll && <Button size="sm" variant="ghost" onClick={() => setPoll(null)}>Remover</Button>}
                  </div>
                  {!poll ? (
                    <>
                      <Input value={pollQ} onChange={(e) => setPollQ(e.target.value)} placeholder="Pergunta da enquete..." className="text-sm" />
                      {pollOpts.map((o, i) => (
                        <Input
                          key={i}
                          value={o}
                          onChange={(e) => setPollOpts((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                          placeholder={`Opção ${i + 1}`}
                          className="text-sm"
                        />
                      ))}
                      {pollOpts.length < 4 && (
                        <Button size="sm" variant="outline" onClick={() => setPollOpts((p) => [...p, ""])}>+ Opção</Button>
                      )}
                      <Button size="sm" onClick={applyPoll} className="w-full">Adicionar enquete</Button>
                    </>
                  ) : (
                    <p className="text-xs text-emerald-500">✓ {poll.question}</p>
                  )}
                </div>

                {/* QUIZ */}
                <div className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1"><Brain className="h-3.5 w-3.5" /> Quiz com prémio</Label>
                    {quiz && <Button size="sm" variant="ghost" onClick={() => setQuiz(null)}>Remover</Button>}
                  </div>
                  {!quiz ? (
                    <>
                      <Input value={quizQ} onChange={(e) => setQuizQ(e.target.value)} placeholder="Pergunta do quiz..." className="text-sm" />
                      {quizOpts.map((o, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <input
                            type="radio"
                            checked={quizCorrect === i}
                            onChange={() => setQuizCorrect(i)}
                            className="accent-primary"
                            title="Resposta certa"
                          />
                          <Input
                            value={o}
                            onChange={(e) => setQuizOpts((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                            placeholder={`Opção ${i + 1} ${quizCorrect === i ? "(certa ✓)" : ""}`}
                            className="text-sm"
                          />
                        </div>
                      ))}
                      {quizOpts.length < 4 && (
                        <Button size="sm" variant="outline" onClick={() => setQuizOpts((p) => [...p, ""])}>+ Opção</Button>
                      )}
                      <div className="flex items-center gap-2">
                        <Label className="text-xs shrink-0">Prémio:</Label>
                        <Slider value={[quizReward]} min={10} max={200} step={5} onValueChange={(v) => setQuizReward(v[0])} className="flex-1" />
                        <span className="text-xs font-bold text-primary">{quizReward} pts</span>
                      </div>
                      <Button size="sm" onClick={applyQuiz} className="w-full">Adicionar quiz</Button>
                    </>
                  ) : (
                    <p className="text-xs text-emerald-500">✓ {quiz.question} (+{quiz.reward} pts)</p>
                  )}
                </div>

                {/* OFERTA RELÂMPAGO */}
                <div className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Oferta relâmpago</Label>
                    {deal && <Button size="sm" variant="ghost" onClick={() => setDeal(null)}>Remover</Button>}
                  </div>
                  {!deal ? (
                    <>
                      <Input value={dealLabel} onChange={(e) => setDealLabel(e.target.value)} placeholder="Ex.: Roda da Sorte Premium" className="text-sm" />
                      <div className="flex items-center gap-2">
                        <Label className="text-xs shrink-0">Desconto:</Label>
                        <Slider value={[dealPct]} min={5} max={80} step={5} onValueChange={(v) => setDealPct(v[0])} className="flex-1" />
                        <span className="text-xs font-bold text-primary">{dealPct}%</span>
                      </div>
                      <Input value={dealCode} onChange={(e) => setDealCode(e.target.value.toUpperCase())} placeholder="CÓDIGO (ex.: BATEU20)" className="text-sm font-mono" />
                      <Button size="sm" onClick={applyDeal} className="w-full">Adicionar oferta</Button>
                    </>
                  ) : (
                    <p className="text-xs text-emerald-500">✓ -{deal.discountPct}% {deal.label} ({deal.code})</p>
                  )}
                </div>
              </TabsContent>

              {/* EXTRAS */}
              <TabsContent value="extras" className="space-y-4 mt-3">
                {isBusiness && (
                  <div className="rounded-xl border border-border p-3 space-y-2">
                    <Label className="text-xs flex items-center gap-1"><Store className="h-3.5 w-3.5" /> Promover sorteio da empresa</Label>
                    {myRaffles.length > 0 ? (
                      <select
                        value={raffleId}
                        onChange={(e) => setRaffleId(e.target.value)}
                        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                      >
                        <option value="">— Nenhum (story livre) —</option>
                        {myRaffles.map((r) => (
                          <option key={r.id} value={r.id}>{r.title}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Sem sorteios ativos — crie um no painel para o promover aqui.</p>
                    )}
                  </div>
                )}
                <div className="rounded-xl border border-border p-3 space-y-2">
                  <Label className="text-xs flex items-center gap-1"><LinkIcon className="h-3.5 w-3.5" /> Link CTA</Label>
                  <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://... ou /rota-interna" className="text-sm" />
                  <Input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="Texto do botão" className="text-sm" />
                </div>

                <div className="rounded-xl border border-border p-3 space-y-2">
                  <Label className="text-xs flex items-center gap-1"><Music2 className="h-3.5 w-3.5" /> Trilha sonora (visual)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {MUSIC_VIBES.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMusic(music?.title === m.title ? null : { title: m.title, vibe: m.vibe })}
                        className={`rounded-xl border p-2.5 text-left transition-all ${
                          music?.title === m.title ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <p className="text-xs font-bold flex items-center gap-1"><Music2 className="h-3 w-3" /> {m.title}</p>
                        <p className="text-[10px] text-muted-foreground">{m.vibe}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoryStudio;
