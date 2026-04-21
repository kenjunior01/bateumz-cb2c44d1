import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trophy, Trash2, Check, X, Eye, ThumbsUp, Video } from "lucide-react";

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
  created_by: string;
  created_at: string;
}

interface Submission {
  id: string;
  contest_id: string;
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

export default function AdminContests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contests, setContests] = useState<Contest[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedContest, setSelectedContest] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editContest, setEditContest] = useState<Contest | null>(null);

  // Form
  const [form, setForm] = useState({
    title: "", description: "", prize_description: "", image_url: "",
    status: "draft", evaluation_type: "votes", start_date: "", end_date: "",
    max_submissions_per_user: 1,
  });

  const loadContests = async () => {
    const { data } = await supabase.from("contests").select("*").order("created_at", { ascending: false });
    setContests(data || []);
    setLoading(false);
  };

  const loadSubmissions = async (contestId: string) => {
    setSelectedContest(contestId);
    const { data } = await supabase.from("contest_submissions").select("*").eq("contest_id", contestId).order("votes_count", { ascending: false });
    setSubmissions(data || []);
  };

  useEffect(() => { loadContests(); }, []);

  const resetForm = () => setForm({ title: "", description: "", prize_description: "", image_url: "", status: "draft", evaluation_type: "votes", start_date: "", end_date: "", max_submissions_per_user: 1 });

  const handleSave = async () => {
    if (!user || !form.title.trim()) return;
    try {
      if (editContest) {
        await supabase.from("contests").update({
          title: form.title, description: form.description || null, prize_description: form.prize_description || null,
          image_url: form.image_url || null, status: form.status, evaluation_type: form.evaluation_type,
          start_date: form.start_date || null, end_date: form.end_date || null,
          max_submissions_per_user: form.max_submissions_per_user,
        }).eq("id", editContest.id);
        toast({ title: "Concurso atualizado!" });
      } else {
        await supabase.from("contests").insert({
          title: form.title, description: form.description || null, prize_description: form.prize_description || null,
          image_url: form.image_url || null, status: form.status, evaluation_type: form.evaluation_type,
          start_date: form.start_date || null, end_date: form.end_date || null,
          max_submissions_per_user: form.max_submissions_per_user, created_by: user.id,
        });
        toast({ title: "Concurso criado!" });
      }
      setShowCreate(false);
      setEditContest(null);
      resetForm();
      loadContests();
    } catch {
      toast({ title: "Erro ao guardar", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja eliminar este concurso?")) return;
    await supabase.from("contests").delete().eq("id", id);
    toast({ title: "Concurso eliminado" });
    loadContests();
  };

  const handleSubStatus = async (subId: string, status: string) => {
    await supabase.from("contest_submissions").update({ status }).eq("id", subId);
    if (selectedContest) loadSubmissions(selectedContest);
    toast({ title: `Submissão ${status === "approved" ? "aprovada" : "rejeitada"}` });
  };

  const handleToggleWinner = async (sub: Submission) => {
    await supabase.from("contest_submissions").update({ is_winner: !sub.is_winner }).eq("id", sub.id);
    if (selectedContest) loadSubmissions(selectedContest);
    toast({ title: sub.is_winner ? "Vencedor removido" : "Vencedor definido!" });
  };

  const openEdit = (c: Contest) => {
    setEditContest(c);
    setForm({
      title: c.title, description: c.description || "", prize_description: c.prize_description || "",
      image_url: c.image_url || "", status: c.status, evaluation_type: c.evaluation_type,
      start_date: c.start_date?.slice(0, 16) || "", end_date: c.end_date?.slice(0, 16) || "",
      max_submissions_per_user: c.max_submissions_per_user,
    });
    setShowCreate(true);
  };

  const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    draft: "secondary", active: "default", voting: "outline", completed: "destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestão de Concursos</h1>
        <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) { setEditContest(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Concurso</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editContest ? "Editar Concurso" : "Criar Concurso"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div><Label>Prémio</Label><Input value={form.prize_description} onChange={(e) => setForm({ ...form, prize_description: e.target.value })} placeholder="Ex: Voucher + 5000 MT" /></div>
              <div><Label>URL da imagem de capa</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estado</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="voting">Em Votação</SelectItem>
                      <SelectItem value="completed">Encerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de Avaliação</Label>
                  <Select value={form.evaluation_type} onValueChange={(v) => setForm({ ...form, evaluation_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="votes">Votos</SelectItem>
                      <SelectItem value="views">Visualizações de Vídeo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Início</Label><Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                <div><Label>Fim</Label><Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              </div>
              <div><Label>Máx. submissões por utilizador</Label><Input type="number" min={1} value={form.max_submissions_per_user} onChange={(e) => setForm({ ...form, max_submissions_per_user: parseInt(e.target.value) || 1 })} /></div>
              <Button onClick={handleSave} className="w-full" disabled={!form.title.trim()}>{editContest ? "Guardar Alterações" : "Criar Concurso"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="contests">
        <TabsList>
          <TabsTrigger value="contests">Concursos ({contests.length})</TabsTrigger>
          <TabsTrigger value="submissions" disabled={!selectedContest}>Submissões ({submissions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="contests">
          {loading ? (
            <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : contests.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nenhum concurso criado.</p>
          ) : (
            <div className="grid gap-4">
              {contests.map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {c.image_url && <img src={c.image_url} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{c.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={statusColors[c.status] || "outline"}>{c.status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {c.evaluation_type === "views" ? "📹 Visualizações" : "👍 Votos"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => loadSubmissions(c.id)}>
                        <Eye className="mr-1 h-4 w-4" /> Submissões
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Edit className="h-4 w-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions">
          {submissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nenhuma submissão neste concurso.</p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participante</TableHead>
                    <TableHead>Media</TableHead>
                    <TableHead>Votos</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((s) => (
                    <TableRow key={s.id} className={s.is_winner ? "bg-yellow-500/10" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{s.participant_name}</p>
                          {s.description && <p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {s.photo_url && <a href={s.photo_url} target="_blank" rel="noopener noreferrer"><Badge variant="outline"><Eye className="h-3 w-3 mr-1" />Foto</Badge></a>}
                          {s.video_url && <a href={s.video_url} target="_blank" rel="noopener noreferrer"><Badge variant="outline"><Video className="h-3 w-3 mr-1" />Vídeo</Badge></a>}
                        </div>
                      </TableCell>
                      <TableCell><ThumbsUp className="h-3 w-3 inline mr-1" />{s.votes_count}</TableCell>
                      <TableCell><Eye className="h-3 w-3 inline mr-1" />{s.views_count}</TableCell>
                      <TableCell><Badge variant={s.status === "approved" ? "default" : s.status === "pending" ? "secondary" : "destructive"}>{s.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {s.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleSubStatus(s.id, "approved")}><Check className="h-4 w-4 text-green-500" /></Button>
                              <Button size="sm" variant="outline" onClick={() => handleSubStatus(s.id, "rejected")}><X className="h-4 w-4 text-red-500" /></Button>
                            </>
                          )}
                          <Button size="sm" variant={s.is_winner ? "default" : "outline"} onClick={() => handleToggleWinner(s)}>
                            <Trophy className={`h-4 w-4 ${s.is_winner ? "text-yellow-300" : ""}`} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
