import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trophy, ThumbsUp, Eye, Calendar, Send, Video, Image as ImageIcon, Heart, ArrowLeft, Flame, Clock, Users, Share2, Crown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ContestCountdown from "@/components/ContestCountdown";
import ShareButtons from "@/components/ShareButtons";
import { fireConfetti, fireSideCannons } from "@/lib/celebrate";

interface Contest {
  id: string;
  title: string;
  description: string | null;
  prize_description: string | null;
  image_url: string | null;
  status: string;
  evaluation_type: string;
  start_date: string | null;
  end_date: string | null;
  max_submissions_per_user: number;
  winner_submission_id: string | null;
}

interface Submission {
  id: string;
  participant_name: string;
  description: string | null;
  photo_url: string | null;
  video_url: string | null;
  votes_count: number;
  views_count: number;
  status: string;
  is_winner: boolean;
  user_id: string;
  created_at: string;
}

export default function ContestDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [contest, setContest] = useState<Contest | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: "photo" | "video"; submissionId?: string } | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    const [{ data: c }, { data: subs }] = await Promise.all([
      supabase.from("contests").select("*").eq("id", id).single(),
      supabase.from("contest_submissions").select("*").eq("contest_id", id).eq("status", "approved").order("votes_count", { ascending: false }),
    ]);
    setContest(c);
    setSubmissions(subs || []);

    if (user) {
      const { data: votes } = await supabase
        .from("contest_votes")
        .select("submission_id")
        .eq("user_id", user.id);
      setMyVotes(new Set((votes || []).map((v: any) => v.submission_id)));
    }
    setLoading(false);
  }, [id, user]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async () => {
    if (!user || !contest || !name.trim()) return;
    setSubmitting(true);
    try {
      let photo_url: string | null = null;
      let video_url: string | null = null;

      if (photoFile) {
        const path = `${user.id}/${Date.now()}-${photoFile.name}`;
        const { error } = await supabase.storage.from("contest-media").upload(path, photoFile);
        if (!error) {
          const { data: urlData } = supabase.storage.from("contest-media").getPublicUrl(path);
          photo_url = urlData.publicUrl;
        }
      }

      if (videoFile) {
        const path = `${user.id}/${Date.now()}-${videoFile.name}`;
        const { error } = await supabase.storage.from("contest-media").upload(path, videoFile);
        if (!error) {
          const { data: urlData } = supabase.storage.from("contest-media").getPublicUrl(path);
          video_url = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from("contest_submissions").insert({
        contest_id: contest.id,
        user_id: user.id,
        participant_name: name.trim(),
        description: desc.trim() || null,
        photo_url,
        video_url,
        status: "approved",
      });

      if (error) throw error;

      // Notify admins and contest creator
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins) {
        const notifications = admins.map((a: any) => ({
          user_id: a.user_id,
          title: "Nova participação em concurso",
          message: `${name} submeteu uma participação no concurso "${contest.title}"`,
          type: "info",
        }));
        await supabase.from("notifications").insert(notifications);
      }

      toast({ title: "🎉 Participação enviada!", description: "A sua submissão foi registada com sucesso." });
      fireSideCannons();
      setShowForm(false);
      setName("");
      setDesc("");
      setPhotoFile(null);
      setVideoFile(null);
      loadData();
    } catch {
      toast({ title: "Erro", description: "Não foi possível enviar a participação.", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleVote = async (submissionId: string) => {
    if (!user) {
      toast({ title: "Inicie sessão", description: "Precisa de estar autenticado para votar.", variant: "destructive" });
      return;
    }
    setVotingId(submissionId);
    const hasVoted = myVotes.has(submissionId);
    if (hasVoted) {
      await supabase.from("contest_votes").delete().eq("submission_id", submissionId).eq("user_id", user.id);
      setMyVotes((prev) => { const n = new Set(prev); n.delete(submissionId); return n; });
    } else {
      await supabase.from("contest_votes").insert({ submission_id: submissionId, user_id: user.id });
      setMyVotes((prev) => new Set(prev).add(submissionId));
      fireConfetti({ intensity: "low" });
    }
    await loadData();
    setVotingId(null);
  };

  const handleViewVideo = (sub: Submission) => {
    setSelectedMedia({ url: sub.video_url!, type: "video", submissionId: sub.id });
  };

  const timeLeft = (date: string | null) => {
    if (!date) return null;
    const diff = new Date(date).getTime() - Date.now();
    if (diff <= 0) return "Encerrado";
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d restantes`;
    const hours = Math.floor(diff / 3600000);
    return `${hours}h restantes`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center pt-32">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center pt-32">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <Trophy className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          </motion.div>
          <p className="text-muted-foreground">Concurso não encontrado.</p>
        </div>
      </div>
    );
  }

  const isOpen = contest.status === "active";
  const isVoting = contest.status === "voting";
  const sorted = [...submissions].sort((a, b) =>
    contest.evaluation_type === "views" ? b.views_count - a.views_count : b.votes_count - a.votes_count
  );
  const winners = sorted.filter((s) => s.is_winner);
  const topScore = sorted.length > 0 ? (contest.evaluation_type === "views" ? sorted[0].views_count : sorted[0].votes_count) : 1;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link to="/concursos" className="text-sm text-muted-foreground hover:text-primary mb-4 inline-flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar aos concursos
          </Link>

          {contest.image_url && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="aspect-[3/1] rounded-2xl overflow-hidden mb-6 relative">
              <img src={contest.image_url} alt={contest.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <Badge className={isOpen ? "bg-primary text-primary-foreground" : isVoting ? "bg-accent text-accent-foreground" : "bg-muted"}>
                  {isOpen ? "🔥 Aberto" : isVoting ? "🗳️ Em Votação" : "✅ Encerrado"}
                </Badge>
              </div>
            </motion.div>
          )}

          <div className="flex items-start justify-between flex-wrap gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">{contest.title}</h1>
              {contest.description && <p className="text-muted-foreground mt-2 max-w-2xl">{contest.description}</p>}
              {contest.end_date && (isOpen || isVoting) && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">⏰ Termina em</p>
                  <ContestCountdown endDate={contest.end_date} />
                </div>
              )}
              <div className="mt-4">
                <ShareButtons data={{ title: contest.title, text: `${contest.title} — participa e ganha!`, url: typeof window !== "undefined" ? window.location.href : "" }} />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="flex items-center gap-3">
              {!contest.image_url && (
                <Badge className={isOpen ? "bg-primary text-primary-foreground" : isVoting ? "bg-accent text-accent-foreground" : "bg-muted"}>
                  {isOpen ? "🔥 Aberto" : isVoting ? "🗳️ Em Votação" : "✅ Encerrado"}
                </Badge>
              )}
              {isOpen && user && (
                <Dialog open={showForm} onOpenChange={setShowForm}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="gap-2 shadow-lg"><Send className="h-4 w-4" /> Participar</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Submeter Participação</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nome do participante *</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="O seu nome" />
                      </div>
                      <div>
                        <Label>Descrição da sua criação</Label>
                        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descreva a sua receita, criação..." rows={3} />
                      </div>
                      <div>
                        <Label className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Foto</Label>
                        <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                      </div>
                      <div>
                        <Label className="flex items-center gap-2"><Video className="h-4 w-4" /> Vídeo</Label>
                        <Input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                      </div>
                      <Button onClick={handleSubmit} disabled={submitting || !name.trim()} className="w-full gap-2">
                        {submitting ? "A enviar..." : <><Send className="h-4 w-4" /> Enviar Participação</>}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {!user && isOpen && (
                <Link to="/login"><Button variant="outline" size="lg">Entrar para Participar</Button></Link>
              )}
            </motion.div>
          </div>

          {/* Stats bar */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-wrap gap-4 mt-6 p-4 rounded-xl glass">
            {contest.prize_description && (
              <div className="flex items-center gap-2 text-sm">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><Trophy className="h-4 w-4 text-primary" /></div>
                <div><span className="text-muted-foreground text-xs">Prémio</span><p className="font-semibold text-foreground">{contest.prize_description}</p></div>
              </div>
            )}
            {contest.end_date && (
              <div className="flex items-center gap-2 text-sm">
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center"><Clock className="h-4 w-4 text-accent" /></div>
                <div><span className="text-muted-foreground text-xs">Prazo</span><p className="font-semibold text-foreground">{timeLeft(contest.end_date) || new Date(contest.end_date).toLocaleDateString("pt-MZ")}</p></div>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center"><Users className="h-4 w-4 text-foreground" /></div>
              <div><span className="text-muted-foreground text-xs">Participações</span><p className="font-semibold text-foreground">{sorted.length}</p></div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                {contest.evaluation_type === "views" ? <Eye className="h-4 w-4 text-foreground" /> : <ThumbsUp className="h-4 w-4 text-foreground" />}
              </div>
              <div><span className="text-muted-foreground text-xs">Avaliação</span><p className="font-semibold text-foreground">{contest.evaluation_type === "views" ? "Visualizações" : "Votos"}</p></div>
            </div>
          </motion.div>
        </motion.div>

        {/* Winners Section */}
        <AnimatePresence>
          {winners.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </motion.div>
                Vencedores
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {winners.map((w, i) => (
                  <motion.div key={w.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1, type: "spring" }}>
                    <Card className="border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-yellow-500/10 overflow-hidden">
                      {w.photo_url && (
                        <div className="relative">
                          <img src={w.photo_url} alt={w.participant_name} className="w-full aspect-video object-cover" />
                          <div className="absolute top-3 right-3">
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                              <Badge className="bg-yellow-500 text-black shadow-lg">🏆 Vencedor</Badge>
                            </motion.div>
                          </div>
                        </div>
                      )}
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="h-5 w-5 text-yellow-500" />
                          <span className="font-bold text-lg">{w.participant_name}</span>
                        </div>
                        {w.description && <p className="text-sm text-muted-foreground">{w.description}</p>}
                        <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {w.votes_count}</span>
                          <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {w.views_count}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Gallery */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            Participações ({sorted.length})
          </h2>

          {sorted.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 glass rounded-2xl">
              <Trophy className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">Ainda não há participações neste concurso.</p>
              {isOpen && <p className="text-sm text-muted-foreground mt-1">Seja o primeiro a participar!</p>}
            </motion.div>
          ) : (
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((sub, i) => {
                const score = contest.evaluation_type === "views" ? sub.views_count : sub.votes_count;
                const pct = topScore > 0 ? (score / topScore) * 100 : 0;
                const rank = i + 1;

                return (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 200 }}
                    whileHover={{ y: -4 }}
                  >
                    <Card className={`overflow-hidden glass transition-all ${sub.is_winner ? "ring-2 ring-yellow-500" : ""} ${rank <= 3 ? "border-primary/20" : ""}`}>
                      {sub.photo_url && (
                        <div className="aspect-video overflow-hidden cursor-pointer relative group" onClick={() => setSelectedMedia({ url: sub.photo_url!, type: "photo" })}>
                          <img src={sub.photo_url} alt={sub.participant_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          {rank <= 3 && (
                            <div className="absolute top-2 left-2">
                              <Badge className={rank === 1 ? "bg-yellow-500 text-black" : rank === 2 ? "bg-gray-400 text-black" : "bg-amber-700 text-white"}>
                                #{rank}
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{sub.participant_name}</span>
                          {sub.is_winner && <Badge className="bg-yellow-500 text-black">🏆</Badge>}
                        </div>
                        {sub.description && <p className="text-sm text-muted-foreground line-clamp-2">{sub.description}</p>}

                        {/* Score bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{contest.evaluation_type === "views" ? "Visualizações" : "Votos"}</span>
                            <span className="font-semibold text-foreground">{score}</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>

                        {sub.video_url && (
                          <Button variant="outline" size="sm" onClick={() => handleViewVideo(sub)} className="w-full gap-2">
                            <Video className="h-4 w-4" /> Ver Vídeo ({sub.views_count} views)
                          </Button>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {sub.votes_count}</span>
                            <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {sub.views_count}</span>
                          </div>
                          {(isOpen || isVoting) && contest.evaluation_type === "votes" && (
                            <motion.div whileTap={{ scale: 0.9 }}>
                              <Button
                                size="sm"
                                variant={myVotes.has(sub.id) ? "default" : "outline"}
                                onClick={() => handleVote(sub.id)}
                                disabled={votingId === sub.id}
                                className="gap-1"
                              >
                                <motion.div animate={myVotes.has(sub.id) ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
                                  <ThumbsUp className="h-4 w-4" />
                                </motion.div>
                                {myVotes.has(sub.id) ? "Votado" : "Votar"}
                              </Button>
                            </motion.div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Media Lightbox */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-4xl p-2">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            {selectedMedia?.type === "photo" ? (
              <img src={selectedMedia.url} alt="Submissão" className="w-full rounded-lg" />
            ) : selectedMedia?.type === "video" ? (
              <video
                src={selectedMedia.url}
                controls
                autoPlay
                className="w-full rounded-lg"
                onPlay={(e) => {
                  const video = e.currentTarget;
                  const subId = selectedMedia.submissionId;
                  if (!subId || (video as any)._viewTracked) return;
                  // Require 3 continuous seconds of playback
                  const startedAt = video.currentTime;
                  const timer = window.setTimeout(async () => {
                    if (!video.paused && video.currentTime - startedAt >= 2.5) {
                      (video as any)._viewTracked = true;
                      const sub = submissions.find((s) => s.id === subId);
                      if (sub) {
                        await supabase
                          .from("contest_submissions")
                          .update({ views_count: sub.views_count + 1 })
                          .eq("id", subId);
                        setSubmissions((prev) =>
                          prev.map((s) => (s.id === subId ? { ...s, views_count: s.views_count + 1 } : s))
                        );
                      }
                    }
                  }, 3000);
                  video.addEventListener("pause", () => window.clearTimeout(timer), { once: true });
                  video.addEventListener("ended", () => window.clearTimeout(timer), { once: true });
                }}
              />
            ) : null}
          </motion.div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
