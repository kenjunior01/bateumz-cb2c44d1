import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Edit, Trophy, Trash2, Check, X, Eye, ThumbsUp, Video, Users, Calendar } from "lucide-react";

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

export default function DashboardContests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [contests, setContests] = useState<Contest[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedContest, setSelectedContest] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editContest, setEditContest] = useState<Contest | null>(null);
  const [activeTab, setActiveTab] = useState("contests");

  const [form, setForm] = useState({
    title: "", description: "", prize_description: "", image_url: "",
    status: "draft", evaluation_type: "votes", start_date: "", end_date: "",
    max_submissions_per_user: 1,
  });

  const loadContests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("contests")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setContests(data || []);
    setLoading(false);
  };

  const loadSubmissions = async (contestId: string) => {
    setSelectedContest(contestId);
    const { data } = await supabase
      .from("contest_submissions")
      .select("*")
      .eq("contest_id", contestId)
      .order("votes_count", { ascending: false });
    setSubmissions(data || []);
    setActiveTab("submissions");
  };

  useEffect(() => { loadContests(); }, [user]);

  const resetForm = () => setForm({
    title: "", description: "", prize_description: "", image_url: "",
    status: "draft", evaluation_type: "votes", start_date: "", end_date: "",
    max_submissions_per_user: 1,
  });

  const handleSave = async () => {
    if (!user || !form.title.trim()) return;
    try {
      if (editContest) {
        await supabase.from("contests").update({
          title: form.title, description: form.description || null,
          prize_description: form.prize_description || null,
          image_url: form.image_url || null, status: form.status,
          evaluation_type: form.evaluation_type,
          start_date: form.start_date || null, end_date: form.end_date || null,
          max_submissions_per_user: form.max_submissions_per_user,
        }).eq("id", editContest.id);
        toast({ title: "Concurso atualizado!" });
      } else {
        await supabase.from("contests").insert({
          title: form.title, description: form.description || null,
          prize_description: form.prize_description || null,
          image_url: form.image_url || null, status: form.status,
          evaluation_type: form.evaluation_type,
          start_date: form.start_date || null, end_date: form.end_date || null,
          max_submissions_per_user: form.max_submissions_per_user,
          created_by: user.id,
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
      title: c.title, description: c.description || "",
      prize_description: c.prize_description || "",
      image_url: c.image_url || "", status: c.status,
      evaluation_type: c.evaluation_type,
      start_date: c.start_date?.slice(0, 16) || "",
      end_date: c.end_date?.slice(0, 16) || "",
      max_submissions_per_user: c.max_submissions_per_user,
    });
    setShowCreate(true);
  };

  const statusLabels: Record<string, string> = {
    draft: "Rascunho", active: "Ativo", voting: "Em Votação", completed: "Encerrado",
  };

  const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    draft: "secondary", active: "default", voting: "outline", completed: "destructive",
  };

  const totalSubmissions = contests.reduce((acc, c) => acc, 0);
  const activeContests = contests.filter(c => c.status === "active" || c.status === "voting").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus Concursos</h1>
          <p className="text-sm text-muted-foreground">Crie e gerencie concursos para a sua audiência</p>
        </div>
        <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) { setEditContest(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Concurso</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editContest ? "Editar Concurso" : "Criar Concurso"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <div><Label>Prémio</Label><Input value={form.prize_description} onChange={(e) => setForm({ ...form, prize_description: e.target.value })} placeholder="Ex: Cesta Benny + 5000 MT" /></div>
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
              <Button onClick={handleSave} className="w-full" disabled={!form.title.trim()}>
                {editContest ? "Guardar Alterações" : "Criar Concurso"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{contests.length}</p>
          <p className="text-xs text-muted-foreground">Total Concursos</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{activeContests}</p>
          <p className="text-xs text-muted-foreground">Ativos</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{submissions.length}</p>
          <p className="text-xs text-muted-foreground">Submissões</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">{submissions.filter(s => s.is_winner).length}</p>
          <p className="text-xs text-muted-foreground">Vencedores</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="contests">Concursos ({contests.length})</TabsTrigger>
          <TabsTrigger value="submissions" disabled={!selectedContest}>
            Submissões ({submissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contests">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : contests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Nenhum concurso criado</p>
                <p className="text-sm text-muted-foreground mb-4">Crie o seu primeiro concurso para engajar a sua audiência</p>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Criar Concurso
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {contests.map((c) => (
                <Card key={c.id} className="overflow-hidden">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {c.image_url && (
                        <img src={c.image_url} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{c.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant={statusColors[c.status] || "outline"}>
                            {statusLabels[c.status] || c.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {c.evaluation_type === "views" ? "📹 Visualizações" : "👍 Votos"}
                          </span>
                          {c.end_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(c.end_date).toLocaleDateString("pt-MZ")}
                            </span>
                          )}
                        </div>
                        {c.prize_description && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">🏆 {c.prize_description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => loadSubmissions(c.id)}>
                        <Users className="mr-1 h-4 w-4" /> Submissões
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions">
          {submissions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma submissão neste concurso.</p>
              </CardContent>
            </Card>
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
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((s) => (
                    <TableRow key={s.id} className={s.is_winner ? "bg-yellow-500/10" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{s.participant_name}</p>
                          {s.description && <p className="text-xs text-muted-foreground line-clamp-2">{s.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {s.photo_url && (
                            <a href={s.photo_url} target="_blank" rel="noopener noreferrer">
                              <Badge variant="outline"><Eye className="h-3 w-3 mr-1" />Foto</Badge>
                            </a>
                          )}
                          {s.video_url && (
                            <a href={s.video_url} target="_blank" rel="noopener noreferrer">
                              <Badge variant="outline"><Video className="h-3 w-3 mr-1" />Vídeo</Badge>
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><ThumbsUp className="h-3 w-3 inline mr-1" />{s.votes_count}</TableCell>
                      <TableCell><Eye className="h-3 w-3 inline mr-1" />{s.views_count}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "approved" ? "default" : s.status === "pending" ? "secondary" : "destructive"}>
                          {s.status === "approved" ? "Aprovado" : s.status === "pending" ? "Pendente" : "Rejeitado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("pt-MZ")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {s.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleSubStatus(s.id, "approved")}>
                                <Check className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleSubStatus(s.id, "rejected")}>
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
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
