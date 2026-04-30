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
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trophy, Trash2, Check, X, Eye, ThumbsUp, Video, Users, Calendar, ArrowLeft, ArrowRight, Sparkles, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CONTEST_CATEGORIES, getCategory, PHASE_TEMPLATES } from "@/lib/contestCategories";
import ImageUploadField from "@/components/ImageUploadField";

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
  category: string;
  rules: any;
  submission_fields: any;
  requires_video: boolean;
  requires_photo: boolean;
  hashtag: string | null;
  min_age: number | null;
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

const initialForm = {
  title: "", description: "", prize_description: "", image_url: "",
  status: "draft", evaluation_type: "votes", start_date: "", end_date: "",
  max_submissions_per_user: 1, category: "", hashtag: "",
  requires_video: false, requires_photo: false, min_age: "",
  rules: [] as string[], submission_fields: [] as any[],
  contest_mode: "single" as "single" | "multi",
  phases: [] as { name: string; description: string; durationDays: number; type: string }[],
  sponsor_name: "", sponsor_logo_url: "",
  entry_fee: 0, max_participants: "",
};

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
  const [step, setStep] = useState<"category" | "details">("category");
  const [form, setForm] = useState(initialForm);

  const loadContests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("contests").select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setContests((data || []) as Contest[]);
    setLoading(false);
  };

  const loadSubmissions = async (contestId: string) => {
    setSelectedContest(contestId);
    const { data } = await supabase
      .from("contest_submissions").select("*")
      .eq("contest_id", contestId)
      .order("votes_count", { ascending: false });
    setSubmissions(data || []);
    setActiveTab("submissions");
  };

  useEffect(() => { loadContests(); }, [user]);

  const resetForm = () => { setForm(initialForm); setStep("category"); };

  const pickCategory = (catId: string) => {
    const cat = getCategory(catId);
    setForm((f) => ({
      ...f,
      category: catId,
      evaluation_type: cat.defaultEvaluation,
      requires_photo: cat.requiresPhoto,
      requires_video: cat.requiresVideo,
      rules: [...cat.defaultRules],
      submission_fields: [...cat.submissionFields],
      prize_description: f.prize_description || cat.prizeIdea,
    }));
    setStep("details");
  };

  const handleSave = async () => {
    if (!user || !form.title.trim() || !form.category) return;
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      prize_description: form.prize_description || null,
      image_url: form.image_url || null,
      status: form.status,
      evaluation_type: form.evaluation_type,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      max_submissions_per_user: form.max_submissions_per_user,
      category: form.category,
      hashtag: form.hashtag.trim().replace(/^#/, "") || null,
      requires_video: form.requires_video,
      requires_photo: form.requires_photo,
      min_age: form.min_age ? parseInt(form.min_age) : null,
      rules: form.rules,
      submission_fields: form.submission_fields,
      contest_mode: form.contest_mode,
      phases: form.phases,
      sponsor_name: form.sponsor_name || null,
      sponsor_logo_url: form.sponsor_logo_url || null,
      entry_fee: form.entry_fee || 0,
      max_participants: form.max_participants ? parseInt(form.max_participants as string) : null,
    };
    try {
      if (editContest) {
        await supabase.from("contests").update(payload).eq("id", editContest.id);
        toast({ title: "Concurso atualizado!" });
      } else {
        await supabase.from("contests").insert({ ...payload, created_by: user.id });
        toast({ title: "Concurso criado!", description: "Está disponível na secção /concursos" });
      }
      setShowCreate(false);
      setEditContest(null);
      resetForm();
      loadContests();
    } catch (e: any) {
      toast({ title: "Erro ao guardar", description: e.message, variant: "destructive" });
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
      category: c.category || "general",
      hashtag: c.hashtag || "",
      requires_photo: c.requires_photo || false,
      requires_video: c.requires_video || false,
      min_age: c.min_age?.toString() || "",
      rules: Array.isArray(c.rules) ? c.rules : [],
      submission_fields: Array.isArray(c.submission_fields) ? c.submission_fields : [],
      contest_mode: (c as any).contest_mode || "single",
      phases: Array.isArray((c as any).phases) ? (c as any).phases : [],
      sponsor_name: (c as any).sponsor_name || "",
      sponsor_logo_url: (c as any).sponsor_logo_url || "",
      entry_fee: (c as any).entry_fee || 0,
      max_participants: (c as any).max_participants?.toString() || "",
    });
    setStep("details");
    setShowCreate(true);
  };

  const updateRule = (i: number, val: string) => {
    const r = [...form.rules]; r[i] = val; setForm({ ...form, rules: r });
  };
  const addRule = () => setForm({ ...form, rules: [...form.rules, ""] });
  const removeRule = (i: number) => setForm({ ...form, rules: form.rules.filter((_, idx) => idx !== i) });

  const statusLabels: Record<string, string> = {
    draft: "Rascunho", active: "Ativo", voting: "Em Votação", completed: "Encerrado",
  };
  const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    draft: "secondary", active: "default", voting: "outline", completed: "destructive",
  };
  const activeContests = contests.filter(c => c.status === "active" || c.status === "voting").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus Concursos</h1>
          <p className="text-sm text-muted-foreground">Crie concursos por categoria com estrutura adaptada</p>
        </div>
        <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) { setEditContest(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Concurso</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editContest ? "Editar Concurso" : (
                  step === "category" ? <>Escolha o tipo de concurso <Sparkles className="h-4 w-4 text-primary" /></> : "Detalhes do Concurso"
                )}
              </DialogTitle>
            </DialogHeader>

            <AnimatePresence mode="wait">
              {!editContest && step === "category" && (
                <motion.div
                  key="cat"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                >
                  {CONTEST_CATEGORIES.map((cat, i) => {
                    const Icon = cat.icon;
                    return (
                      <motion.button
                        key={cat.id}
                        type="button"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        whileHover={{ scale: 1.03, y: -2 }}
                        onClick={() => pickCategory(cat.id)}
                        className={`text-left rounded-xl border border-border/50 hover:border-primary/50 p-3 bg-gradient-to-br ${cat.gradient} transition-all`}
                      >
                        <div className={`h-9 w-9 rounded-lg bg-background/60 backdrop-blur flex items-center justify-center mb-2 ${cat.iconColor}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className="font-semibold text-sm text-foreground">{cat.label}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{cat.description}</p>
                        <Badge variant="outline" className="mt-1.5 text-[9px] h-4 px-1.5 bg-background/60">
                          {cat.defaultEvaluation === "views" ? "👁️ Views" : "❤️ Votos"}
                        </Badge>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}

              {(editContest || step === "details") && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  {!editContest && (
                    <button type="button" onClick={() => setStep("category")} className="text-xs text-primary flex items-center gap-1 hover:underline">
                      <ArrowLeft className="h-3 w-3" /> Mudar categoria
                    </button>
                  )}

                  {form.category && (() => {
                    const cat = getCategory(form.category);
                    const Icon = cat.icon;
                    return (
                      <div className={`rounded-lg border border-border/50 p-3 bg-gradient-to-br ${cat.gradient} flex items-center gap-3`}>
                        <div className={`h-10 w-10 rounded-lg bg-background/60 flex items-center justify-center ${cat.iconColor}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{cat.label}</p>
                          <p className="text-[11px] text-muted-foreground">{cat.example}</p>
                        </div>
                      </div>
                    );
                  })()}

                  <div><Label>Título *</Label><Input maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Melhor receita tradicional 2026" /></div>
                  <div><Label>Descrição</Label><Textarea maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Prémio</Label><Input maxLength={200} value={form.prize_description} onChange={(e) => setForm({ ...form, prize_description: e.target.value })} /></div>
                    <div><Label>Hashtag oficial</Label><Input maxLength={40} value={form.hashtag} onChange={(e) => setForm({ ...form, hashtag: e.target.value })} placeholder="MeuConcurso2026" /></div>
                  </div>
                  <ImageUploadField
                    label="Imagem de capa"
                    bucket="contest-media"
                    pathPrefix={`covers/${user?.id || "anon"}`}
                    value={form.image_url}
                    onChange={(url) => setForm({ ...form, image_url: url })}
                    helper="Recomendado 1200×630. PNG ou JPG."
                  />

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
                      <Label>Avaliação</Label>
                      <Select value={form.evaluation_type} onValueChange={(v) => setForm({ ...form, evaluation_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="votes">❤️ Votos do público</SelectItem>
                          <SelectItem value="views">👁️ Visualizações de vídeo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Início</Label><Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
                    <div><Label>Fim</Label><Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Máx. submissões / utilizador</Label><Input type="number" min={1} value={form.max_submissions_per_user} onChange={(e) => setForm({ ...form, max_submissions_per_user: parseInt(e.target.value) || 1 })} /></div>
                    <div><Label>Idade mínima</Label><Input type="number" min={0} placeholder="opcional" value={form.min_age} onChange={(e) => setForm({ ...form, min_age: e.target.value })} /></div>
                  </div>

                  <div className="rounded-lg border border-border/50 p-3 space-y-3">
                    <p className="text-sm font-semibold">Requisitos da submissão</p>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">📷 Foto obrigatória</Label>
                      <Switch checked={form.requires_photo} onCheckedChange={(v) => setForm({ ...form, requires_photo: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">🎬 Vídeo obrigatório</Label>
                      <Switch checked={form.requires_video} onCheckedChange={(v) => setForm({ ...form, requires_video: v })} />
                    </div>
                  </div>

                  {/* Contest Mode: Single vs Multi-phase */}
                  <div className="rounded-lg border border-primary/20 p-3 space-y-3 bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold">Modo do Concurso</p>
                    </div>
                    <Select value={form.contest_mode} onValueChange={(v: "single" | "multi") => setForm({ ...form, contest_mode: v, phases: v === "single" ? [] : form.phases })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">🎯 Fase Única — submissão e votação simples</SelectItem>
                        <SelectItem value="multi">🏆 Multi-fases — eliminação progressiva</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.contest_mode === "multi" && (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground">Escolha um modelo de fases ou personalize:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {PHASE_TEMPLATES.map((tmpl, i) => (
                            <Button key={i} type="button" size="sm" variant={form.phases.length === tmpl.length ? "default" : "outline"} className="text-xs" onClick={() => setForm({ ...form, phases: [...tmpl] })}>
                              {tmpl.length} Fases
                            </Button>
                          ))}
                        </div>
                        {form.phases.length > 0 && (
                          <div className="space-y-2">
                            {form.phases.map((phase, i) => (
                              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-background/50">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                                <div className="flex-1 min-w-0">
                                  <Input value={phase.name} onChange={(e) => { const p = [...form.phases]; p[i] = { ...p[i], name: e.target.value }; setForm({ ...form, phases: p }); }} className="h-7 text-xs" />
                                </div>
                                <Input type="number" min={1} value={phase.durationDays} onChange={(e) => { const p = [...form.phases]; p[i] = { ...p[i], durationDays: parseInt(e.target.value) || 1 }; setForm({ ...form, phases: p }); }} className="h-7 w-16 text-xs" />
                                <span className="text-[10px] text-muted-foreground">dias</span>
                                <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => setForm({ ...form, phases: form.phases.filter((_, idx) => idx !== i) })}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sponsor & Entry Fee */}
                  <div className="rounded-lg border border-border/50 p-3 space-y-3">
                    <p className="text-sm font-semibold">💼 Patrocínio & Acesso</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label className="text-xs">Nome do patrocinador</Label><Input maxLength={80} value={form.sponsor_name} onChange={(e) => setForm({ ...form, sponsor_name: e.target.value })} placeholder="Opcional" /></div>
                      <ImageUploadField
                        label="Logo do patrocinador"
                        bucket="contest-media"
                        pathPrefix={`sponsors/${user?.id || "anon"}`}
                        value={form.sponsor_logo_url}
                        onChange={(url) => setForm({ ...form, sponsor_logo_url: url })}
                        maxSizeMB={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Taxa de inscrição (MZN)</Label><Input type="number" min={0} value={form.entry_fee} onChange={(e) => setForm({ ...form, entry_fee: parseFloat(e.target.value) || 0 })} /></div>
                      <div><Label className="text-xs">Máx. participantes</Label><Input type="number" min={0} placeholder="Ilimitado" value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: e.target.value })} /></div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Regras do concurso</p>
                      <Button type="button" size="sm" variant="outline" onClick={addRule}><Plus className="h-3 w-3 mr-1" />Regra</Button>
                    </div>
                    {form.rules.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma regra definida.</p>}
                    {form.rules.map((rule, i) => (
                      <div key={i} className="flex gap-2">
                        <Input value={rule} onChange={(e) => updateRule(i, e.target.value)} placeholder={`Regra ${i + 1}`} />
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeRule(i)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>

                  {form.submission_fields.length > 0 && (
                    <div className="rounded-lg border border-border/50 p-3 space-y-1">
                      <p className="text-sm font-semibold">Campos pedidos ao participante</p>
                      <p className="text-xs text-muted-foreground mb-2">Adaptados à categoria escolhida</p>
                      <div className="flex flex-wrap gap-1.5">
                        {form.submission_fields.map((f: any) => (
                          <Badge key={f.key} variant="outline" className="text-[10px]">
                            {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={handleSave} className="w-full" disabled={!form.title.trim() || !form.category}>
                    {editContest ? "Guardar Alterações" : <>Criar Concurso <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </DialogContent>
        </Dialog>
      </div>

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
                <p className="text-sm text-muted-foreground mb-4">Crie o seu primeiro concurso e escolha a categoria</p>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Criar Concurso
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {contests.map((c) => {
                const cat = getCategory(c.category || "general");
                const Icon = cat.icon;
                return (
                  <Card key={c.id} className="overflow-hidden">
                    <CardContent className="flex items-center justify-between p-4 gap-3">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {c.image_url ? (
                          <img src={c.image_url} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className={`h-14 w-14 rounded-lg flex items-center justify-center bg-gradient-to-br ${cat.gradient} shrink-0`}>
                            <Icon className={`h-6 w-6 ${cat.iconColor}`} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{c.title}</p>
                            <Badge variant="outline" className="text-[10px] shrink-0">{cat.label}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant={statusColors[c.status] || "outline"}>
                              {statusLabels[c.status] || c.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {c.evaluation_type === "views" ? "📹 Views" : "👍 Votos"}
                            </span>
                            {c.hashtag && <span className="text-xs text-primary">#{c.hashtag}</span>}
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
                );
              })}
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
