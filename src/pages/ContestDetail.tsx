import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trophy, ThumbsUp, Eye, Calendar, Upload, Send, Video, Image as ImageIcon, Heart } from "lucide-react";

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
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: "photo" | "video" } | null>(null);

  // Form state
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

      // Notify admin
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

      toast({ title: "Participação enviada!", description: "A sua submissão foi registada com sucesso." });
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
    const hasVoted = myVotes.has(submissionId);
    if (hasVoted) {
      await supabase.from("contest_votes").delete().eq("submission_id", submissionId).eq("user_id", user.id);
      setMyVotes((prev) => { const n = new Set(prev); n.delete(submissionId); return n; });
    } else {
      await supabase.from("contest_votes").insert({ submission_id: submissionId, user_id: user.id });
      setMyVotes((prev) => new Set(prev).add(submissionId));
    }
    loadData();
  };

  const handleViewVideo = async (sub: Submission) => {
    setSelectedMedia({ url: sub.video_url!, type: "video" });
    // Increment views
    await supabase.from("contest_submissions").update({ views_count: sub.views_count + 1 }).eq("id", sub.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center pt-32"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center pt-32"><p className="text-muted-foreground">Concurso não encontrado.</p></div>
      </div>
    );
  }

  const isOpen = contest.status === "active";
  const isVoting = contest.status === "voting";
  const sorted = [...submissions].sort((a, b) =>
    contest.evaluation_type === "views" ? b.views_count - a.views_count : b.votes_count - a.votes_count
  );
  const winners = sorted.filter((s) => s.is_winner);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <Link to="/concursos" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">← Voltar aos concursos</Link>
          {contest.image_url && (
            <div className="aspect-[3/1] rounded-xl overflow-hidden mb-6">
              <img src={contest.image_url} alt={contest.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{contest.title}</h1>
              {contest.description && <p className="text-muted-foreground mt-2 max-w-2xl">{contest.description}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isOpen ? "default" : isVoting ? "secondary" : "outline"}>
                {isOpen ? "Aberto" : isVoting ? "Em Votação" : "Encerrado"}
              </Badge>
              {isOpen && user && (
                <Dialog open={showForm} onOpenChange={setShowForm}>
                  <DialogTrigger asChild>
                    <Button><Send className="mr-2 h-4 w-4" /> Participar</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Submeter Participação</DialogTitle></DialogHeader>
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
                      <Button onClick={handleSubmit} disabled={submitting || !name.trim()} className="w-full">
                        {submitting ? "A enviar..." : "Enviar Participação"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              {!user && isOpen && (
                <Link to="/login"><Button variant="outline">Entrar para Participar</Button></Link>
              )}
            </div>
          </div>
          <div className="flex gap-6 mt-4 text-sm text-muted-foreground">
            {contest.prize_description && (
              <span className="flex items-center gap-1 text-primary font-medium"><Trophy className="h-4 w-4" /> {contest.prize_description}</span>
            )}
            {contest.end_date && (
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Termina: {new Date(contest.end_date).toLocaleDateString("pt-MZ")}</span>
            )}
            <span className="flex items-center gap-1">
              {contest.evaluation_type === "views" ? <><Eye className="h-4 w-4" /> Avaliação por visualizações</> : <><ThumbsUp className="h-4 w-4" /> Avaliação por votos</>}
            </span>
          </div>
        </div>

        {/* Winners Section */}
        {winners.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Trophy className="h-6 w-6 text-yellow-500" /> Vencedores</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {winners.map((w) => (
                <Card key={w.id} className="border-yellow-500/50 bg-yellow-500/5">
                  {w.photo_url && <img src={w.photo_url} alt={w.participant_name} className="w-full aspect-video object-cover rounded-t-lg" />}
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
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        <h2 className="text-2xl font-bold mb-4">Participações ({sorted.length})</h2>
        {sorted.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">Ainda não há participações neste concurso.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((sub) => (
              <Card key={sub.id} className={`overflow-hidden ${sub.is_winner ? "ring-2 ring-yellow-500" : ""}`}>
                {sub.photo_url && (
                  <div className="aspect-video overflow-hidden cursor-pointer" onClick={() => setSelectedMedia({ url: sub.photo_url!, type: "photo" })}>
                    <img src={sub.photo_url} alt={sub.participant_name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </div>
                )}
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{sub.participant_name}</span>
                    {sub.is_winner && <Badge className="bg-yellow-500 text-black">🏆 Vencedor</Badge>}
                  </div>
                  {sub.description && <p className="text-sm text-muted-foreground line-clamp-3">{sub.description}</p>}

                  {sub.video_url && (
                    <Button variant="outline" size="sm" onClick={() => handleViewVideo(sub)} className="w-full">
                      <Video className="mr-2 h-4 w-4" /> Ver Vídeo ({sub.views_count} views)
                    </Button>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart className="h-4 w-4" /> {sub.votes_count}</span>
                      <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {sub.views_count}</span>
                    </div>
                    {(isOpen || isVoting) && contest.evaluation_type === "votes" && (
                      <Button
                        size="sm"
                        variant={myVotes.has(sub.id) ? "default" : "outline"}
                        onClick={() => handleVote(sub.id)}
                      >
                        <ThumbsUp className="mr-1 h-4 w-4" />
                        {myVotes.has(sub.id) ? "Votado" : "Votar"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Media Lightbox */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-3xl">
          {selectedMedia?.type === "photo" ? (
            <img src={selectedMedia.url} alt="Submissão" className="w-full rounded-lg" />
          ) : selectedMedia?.type === "video" ? (
            <video src={selectedMedia.url} controls autoPlay className="w-full rounded-lg" />
          ) : null}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
