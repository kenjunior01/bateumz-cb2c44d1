import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit2, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface PrizeLevel {
  level: number;
  amount: number;
  currency: string;
  is_safe_haven?: boolean;
}

interface Game {
  id: string;
  name: string;
  description?: string;
  background_image_url?: string;
  background_color?: string;
  primary_color?: string;
  company_logo_url?: string;
  company_slogan?: string;
  total_questions: number;
  time_per_question: number;
  prize_structure?: PrizeLevel[];
  lifelines?: Record<string, boolean>;
  is_active?: boolean;
  is_published?: boolean;
  created_at: string;
  created_by?: string;
  region_id?: string;
}

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation?: string;
}

const DEFAULT_PRIZE_STRUCTURE: PrizeLevel[] = [
  { level: 1, amount: 100, currency: "MZN" },
  { level: 2, amount: 200, currency: "MZN" },
  { level: 3, amount: 300, currency: "MZN" },
  { level: 4, amount: 500, currency: "MZN" },
  { level: 5, amount: 1000, currency: "MZN", is_safe_haven: true },
  { level: 6, amount: 2000, currency: "MZN" },
  { level: 7, amount: 4000, currency: "MZN" },
  { level: 8, amount: 8000, currency: "MZN" },
  { level: 9, amount: 16000, currency: "MZN" },
  { level: 10, amount: 32000, currency: "MZN", is_safe_haven: true },
  { level: 11, amount: 64000, currency: "MZN" },
  { level: 12, amount: 125000, currency: "MZN" },
  { level: 13, amount: 250000, currency: "MZN" },
  { level: 14, amount: 500000, currency: "MZN" },
  { level: 15, amount: 1000000, currency: "MZN" },
];

export default function AdminMillionaireManager() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  // Form states
  const [gameName, setGameName] = useState("");
  const [gameDescription, setGameDescription] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(15);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [primaryColor, setPrimaryColor] = useState("#fbbf24");
  const [backgroundColor, setBackgroundColor] = useState("#0a0e17");
  const [backgroundImage, setBackgroundImage] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [companySlogan, setCompanySlogan] = useState("");
  const [currency, setCurrency] = useState("MZN");
  const [prizeStructure, setPrizeStructure] = useState<PrizeLevel[]>(DEFAULT_PRIZE_STRUCTURE);
  const [lifelines, setLifelines] = useState({ fiftyFifty: true, askAudience: false, phoneFriend: false });

  // Question form
  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [explanation, setExplanation] = useState("");

  useEffect(() => {
    if (!user || (role !== "admin" && role !== "superadmin")) return;
    loadGames();
  }, [user, role]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("millionaire_games")
        .select("*")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error("Error loading games:", error);
      toast.error("Erro ao carregar jogos");
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from("millionaire_questions")
        .select("*")
        .eq("game_id", gameId)
        .order("question_number");

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("Erro ao carregar perguntas");
    }
  };

  const selectGameForEdit = (game: Game) => {
    setSelectedGame(game);
    setGameName(game.name);
    setGameDescription(game.description || "");
    setTotalQuestions(game.total_questions);
    setTimePerQuestion(game.time_per_question);
    setPrimaryColor(game.primary_color || "#fbbf24");
    setBackgroundColor(game.background_color || "#0a0e17");
    setBackgroundImage(game.background_image_url || "");
    setCompanyLogoUrl(game.company_logo_url || "");
    setCompanySlogan(game.company_slogan || "");
    setPrizeStructure(game.prize_structure || DEFAULT_PRIZE_STRUCTURE);
    setLifelines(game.lifelines || { fiftyFifty: true, askAudience: false, phoneFriend: false });
    loadQuestions(game.id);
  };

  const createGame = async () => {
    if (!gameName.trim()) {
      toast.error("Nome do jogo é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const { data: regions } = await supabase.from("regions").select("id").limit(1);
      const regionId = regions?.[0]?.id;

      if (!regionId) {
        toast.error("Erro: Nenhuma região encontrada.");
        setSaving(false);
        return;
      }

      // Adjust prize structure to match total questions
      const adjustedPrizeStructure = prizeStructure.slice(0, totalQuestions);
      
      const { data, error } = await supabase
        .from("millionaire_games")
        .insert({
          name: gameName,
          description: gameDescription,
          total_questions: totalQuestions,
          time_per_question: timePerQuestion,
          primary_color: primaryColor,
          background_color: backgroundColor,
          background_image_url: backgroundImage,
          company_logo_url: companyLogoUrl,
          company_slogan: companySlogan,
          prize_structure: adjustedPrizeStructure,
          lifelines: {
            '50_50': lifelines.fiftyFifty,
            'ask_audience': lifelines.askAudience,
            'phone_friend': lifelines.phoneFriend
          },
          created_by: user!.id,
          region_id: regionId,
          is_active: true,
          is_published: false
        })
        .select()
        .single();

      if (error) throw error;

      setGames([data, ...games]);
      setSelectedGame(data);
      resetGameForm();
      toast.success("Jogo criado com sucesso!");
    } catch (error) {
      console.error("Error creating game:", error);
      toast.error("Erro ao criar jogo");
    } finally {
      setSaving(false);
    }
  };

  const updateGame = async () => {
    if (!selectedGame || !gameName.trim()) {
      toast.error("Nome do jogo é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const adjustedPrizeStructure = prizeStructure.slice(0, totalQuestions);
      
      const { error } = await supabase
        .from("millionaire_games")
        .update({
          name: gameName,
          description: gameDescription,
          total_questions: totalQuestions,
          time_per_question: timePerQuestion,
          primary_color: primaryColor,
          background_color: backgroundColor,
          background_image_url: backgroundImage,
          company_logo_url: companyLogoUrl,
          company_slogan: companySlogan,
          prize_structure: adjustedPrizeStructure,
          lifelines: {
            '50_50': lifelines.fiftyFifty,
            'ask_audience': lifelines.askAudience,
            'phone_friend': lifelines.phoneFriend
          }
        })
        .eq("id", selectedGame.id);

      if (error) throw error;

      setGames(games.map(g => g.id === selectedGame.id ? { ...g, name: gameName } : g));
      toast.success("Jogo atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating game:", error);
      toast.error("Erro ao atualizar jogo");
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = async () => {
    if (!selectedGame || !questionText.trim()) {
      toast.error("Pergunta e opções são obrigatórias");
      return;
    }

    setSaving(true);
    try {
      const questionNumber = questions.length + 1;

      const { data, error } = await supabase
        .from("millionaire_questions")
        .insert({
          game_id: selectedGame.id,
          question_number: questionNumber,
          question_text: questionText,
          option_a: optionA,
          option_b: optionB,
          option_c: optionC,
          option_d: optionD,
          correct_answer: correctAnswer,
          explanation: explanation,
        })
        .select()
        .single();

      if (error) throw error;

      setQuestions([...questions, data]);
      resetQuestionForm();
      toast.success("Pergunta adicionada!");
    } catch (error) {
      console.error("Error adding question:", error);
      toast.error("Erro ao adicionar pergunta");
    } finally {
      setSaving(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from("millionaire_questions")
        .delete()
        .eq("id", questionId);

      if (error) throw error;

      setQuestions(questions.filter((q) => q.id !== questionId));
      toast.success("Pergunta removida");
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Erro ao remover pergunta");
    }
  };

  const publishGame = async (gameId: string) => {
    try {
      const { error } = await supabase
        .from("millionaire_games")
        .update({ is_published: true })
        .eq("id", gameId);

      if (error) throw error;

      setGames(
        games.map((g) =>
          g.id === gameId ? { ...g, is_published: true } : g
        )
      );
      toast.success("Jogo publicado!");
    } catch (error) {
      console.error("Error publishing game:", error);
      toast.error("Erro ao publicar jogo");
    }
  };

  const resetGameForm = () => {
    setGameName("");
    setGameDescription("");
    setTotalQuestions(15);
    setTimePerQuestion(30);
    setPrimaryColor("#fbbf24");
    setBackgroundColor("#0a0e17");
    setBackgroundImage("");
    setCompanyLogoUrl("");
    setCompanySlogan("");
    setPrizeStructure(DEFAULT_PRIZE_STRUCTURE);
    setLifelines({ fiftyFifty: true, askAudience: false, phoneFriend: false });
  };

  const resetQuestionForm = () => {
    setQuestionText("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectAnswer("A");
    setExplanation("");
  };

  const updatePrizeLevel = (index: number, updates: Partial<PrizeLevel>) => {
    setPrizeStructure(prev => prev.map((level, i) => 
      i === index ? { ...level, ...updates } : level
    ));
  };

  if (role !== "admin" && role !== "superadmin" && role !== "business") {
    return <Navigate to="/admin" replace />;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Gerenciar Quem Quer Ser Milionário</h1>

      <Tabs defaultValue="games" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="games">Meus Jogos</TabsTrigger>
          <TabsTrigger value="create">{selectedGame ? "Editar Jogo" : "Criar Novo Jogo"}</TabsTrigger>
        </TabsList>

        <TabsContent value="games" className="space-y-4">
          {games.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum jogo criado ainda
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {games.map((game) => (
                <Card
                  key={game.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => selectGameForEdit(game)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{game.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-2">
                          {game.description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={game.is_published ? "default" : "outline"}>
                          {game.is_published ? "Publicado" : "Rascunho"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {game.total_questions} perguntas
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={(e) => {
                          e.stopPropagation();
                          selectGameForEdit(game);
                        }}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        {!game.is_published && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              publishGame(game.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Publicar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{selectedGame ? "Editar Jogo" : "Criar Novo Jogo"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nome do Jogo</Label>
                <Input
                  placeholder="Ex: Quem Quer Ser Milionário - Edição 2026"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreve o teu jogo..."
                  value={gameDescription}
                  onChange={(e) => setGameDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Total de Perguntas</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(parseInt(e.target.value) || 15)}
                  />
                </div>

                <div>
                  <Label>Tempo por Pergunta (segundos)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="300"
                    value={timePerQuestion}
                    onChange={(e) => setTimePerQuestion(parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Cor Primária</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Cor de Fundo</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Imagem de Fundo (URL)</Label>
                <Input
                  placeholder="https://..."
                  value={backgroundImage}
                  onChange={(e) => setBackgroundImage(e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Logo da Empresa (URL)</Label>
                  <Input
                    placeholder="https://..."
                    value={companyLogoUrl}
                    onChange={(e) => setCompanyLogoUrl(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Slogan da Empresa</Label>
                  <Input
                    placeholder="Slogan..."
                    value={companySlogan}
                    onChange={(e) => setCompanySlogan(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Moeda</Label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="MZN"
                />
              </div>

              <div>
                <Label>Pirâmide de Prémios</Label>
                <div className="mt-2 max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3">
                  {prizeStructure.slice(0, totalQuestions).map((prize, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <span className="w-8 text-sm font-bold">{prize.level}</span>
                      <Input
                        type="number"
                        value={prize.amount}
                        onChange={(e) => updatePrizeLevel(index, { amount: parseInt(e.target.value) || 0 })}
                        className="flex-1"
                      />
                      <Switch
                        checked={prize.is_safe_haven}
                        onCheckedChange={(checked) => updatePrizeLevel(index, { is_safe_haven: checked })}
                      />
                      <span className="text-xs text-muted-foreground">Seguro</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Ajudas</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>50/50</span>
                    <Switch
                      checked={lifelines.fiftyFifty}
                      onCheckedChange={(checked) => setLifelines(prev => ({ ...prev, fiftyFifty: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pedir ajuda ao público</span>
                    <Switch
                      checked={lifelines.askAudience}
                      onCheckedChange={(checked) => setLifelines(prev => ({ ...prev, askAudience: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Ligar para um amigo</span>
                    <Switch
                      checked={lifelines.phoneFriend}
                      onCheckedChange={(checked) => setLifelines(prev => ({ ...prev, phoneFriend: checked }))}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={selectedGame ? updateGame : createGame}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {selectedGame ? "Atualizar Jogo" : "Criar Jogo"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedGame && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Perguntas - {selectedGame.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-t pt-6">
              <h3 className="font-bold mb-4">Adicionar Pergunta</h3>
              <div className="space-y-4">
                <div>
                  <Label>Pergunta</Label>
                  <Textarea
                    placeholder="Digite a pergunta..."
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input placeholder="Opção A" value={optionA} onChange={(e) => setOptionA(e.target.value)} />
                  <Input placeholder="Opção B" value={optionB} onChange={(e) => setOptionB(e.target.value)} />
                  <Input placeholder="Opção C" value={optionC} onChange={(e) => setOptionC(e.target.value)} />
                  <Input placeholder="Opção D" value={optionD} onChange={(e) => setOptionD(e.target.value)} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Resposta Correta</Label>
                    <select
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                </div>

                <Button
                  onClick={addQuestion}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Adicionar Pergunta
                </Button>
              </div>
            </div>

            {questions.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="font-bold mb-4">Perguntas Adicionadas ({questions.length})</h3>
                <div className="space-y-3">
                  {questions.map((q) => (
                    <div key={q.id} className="p-4 border rounded-lg flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{q.question_number}. {q.question_text}</p>
                        <p className="text-sm text-green-600 font-bold">Resposta: {q.correct_answer}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}