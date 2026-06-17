import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, ExternalLink, Save, RotateCcw, Plus, Trash2, Sparkles, Trophy, Users, Eye, Sliders, Search, Vote, Zap, Brain, Package, Loader2, Gamepad2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_CONFIG, LiveGameConfig } from "@/components/livegames/LiveGameSettings";
import { DEFAULT_WHEEL_PRIZES, WheelPrize } from "@/components/livegames/PrizeWheel";
import { publish } from "@/lib/liveBus";
import { supabase } from "@/integrations/supabase/client";

const GAME_OPTIONS: { id: string; label: string; emoji: string }[] = [
  { id: "wheel", label: "Roda de Prémios", emoji: "🎰" },
  { id: "keyword", label: "Caça à Palavra", emoji: "🔎" },
  { id: "emoji", label: "Batalha de Emojis", emoji: "💥" },
  { id: "tap", label: "Tap Battle", emoji: "⚡" },
  { id: "quiz", label: "Quiz Battle", emoji: "🧠" },
  { id: "mystery", label: "Caixa Misteriosa", emoji: "🎁" },
  { id: "football", label: "Fantasy Football", emoji: "⚽" },
  { id: "penalty", label: "Penalty Shootout", emoji: "🎯" },
  { id: "worldcup", label: "World Cup Predictor", emoji: "🌍" },
  { id: "millionaire", label: "Quem Quer Ser Milionário", emoji: "🤑" },
];

type EmojiOpt = { id: string; emoji: string; label: string };
type KeywordCfg = { keyword: string; clue: string; points: number };

interface MillionaireGame {
  id: string;
  name: string;
  is_published: boolean;
  created_at: string;
}

interface SpinWheelGame {
  id: string;
  name: string;
  is_published: boolean;
  created_at: string;
}

const DEFAULT_EMOJI: EmojiOpt[] = [
  { id: "a", emoji: "🔥", label: "Opção A" },
  { id: "b", emoji: "❤️", label: "Opção B" },
  { id: "c", emoji: "⭐", label: "Opção C" },
];
const DEFAULT_KEYWORD: KeywordCfg = { keyword: "BATEU", clue: "Sinónimo de 'acertou' em moçambicano 😉", points: 100 };

const readJSON = <T,>(key: string, fallback: T): T => {
  try { const s = localStorage.getItem(key); return s ? { ...(fallback as any), ...JSON.parse(s) } as T : fallback; }
  catch { return fallback; }
};
const readArr = <T,>(key: string, fallback: T[]): T[] => {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; }
  catch { return fallback; }
};

const DashboardLiveGames = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<LiveGameConfig>(() => readJSON("liveGameConfig", DEFAULT_CONFIG));
  const [wheel, setWheel] = useState<WheelPrize[]>(() => readArr("liveWheelPrizes", DEFAULT_WHEEL_PRIZES));
  const [emojis, setEmojis] = useState<EmojiOpt[]>(() => readArr("liveEmojiOptions", DEFAULT_EMOJI));
  const [keyword, setKeyword] = useState<KeywordCfg>(() => readJSON("liveKeywordConfig", DEFAULT_KEYWORD));
  const [activeGame, setActiveGame] = useState<string>(() => {
    try { return localStorage.getItem("liveActiveGame") || "wheel"; } catch { return "wheel"; }
  });
  const [millionaireGames, setMillionaireGames] = useState<MillionaireGame[]>([]);
  const [spinWheelGames, setSpinWheelGames] = useState<SpinWheelGame[]>([]);
  const [loadingDbGames, setLoadingDbGames] = useState(false);

  const totalWeight = useMemo(() => wheel.reduce((s, p) => s + Math.max(0, p.weight || 0), 0), [wheel]);

  const persist = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

  const setAndBroadcastActive = (id: string) => {
    setActiveGame(id);
    try { localStorage.setItem("liveActiveGame", id); } catch {}
    publish({ type: "activeGame", payload: id });
    toast({ title: "Jogo ativo aplicado", description: `O Live Hub vai mudar para ${GAME_OPTIONS.find(g => g.id === id)?.label}.` });
  };

  const saveAll = () => {
    persist("liveGameConfig", config);
    persist("liveWheelPrizes", wheel);
    persist("liveEmojiOptions", emojis);
    persist("liveKeywordConfig", keyword);
    toast({ title: "Configurações guardadas", description: "Os jogos da próxima live já vão usar estas regras." });
  };

  const resetAll = () => {
    setConfig(DEFAULT_CONFIG);
    setWheel(DEFAULT_WHEEL_PRIZES);
    setEmojis(DEFAULT_EMOJI);
    setKeyword(DEFAULT_KEYWORD);
    toast({ title: "Padrões repostos" });
  };

  // Auto-persist incrementally so other tabs (Live Hub) get the latest
  useEffect(() => persist("liveGameConfig", config), [config]);
  useEffect(() => persist("liveWheelPrizes", wheel), [wheel]);
  useEffect(() => persist("liveEmojiOptions", emojis), [emojis]);
  useEffect(() => persist("liveKeywordConfig", keyword), [keyword]);

  const addWheelPrize = () => setWheel((p) => [...p, { id: Math.random().toString(36).slice(2, 7), label: "Novo prémio", color: "#22c55e", weight: 10 }]);
  const updWheel = (id: string, patch: Partial<WheelPrize>) => setWheel((p) => p.map((x) => x.id === id ? { ...x, ...patch } : x));
  const rmWheel = (id: string) => setWheel((p) => p.filter((x) => x.id !== id));

  const addEmoji = () => emojis.length < 6 && setEmojis((p) => [...p, { id: Math.random().toString(36).slice(2, 6), emoji: "✨", label: `Opção ${String.fromCharCode(65 + p.length)}` }]);
  const updEmoji = (id: string, patch: Partial<EmojiOpt>) => setEmojis((p) => p.map((x) => x.id === id ? { ...x, ...patch } : x));
  const rmEmoji = (id: string) => setEmojis((p) => p.filter((x) => x.id !== id));

  // Load DB-backed games
  useEffect(() => {
    const loadDbGames = async () => {
      setLoadingDbGames(true);
      try {
        const [millRes, spinRes] = await Promise.all([
          supabase
            .from("millionaire_games")
            .select("id, name, is_published, created_at")
            .eq("is_published", true)
            .order("created_at", { ascending: false }),
          supabase
            .from("spin_wheel_games")
            .select("id, name, is_published, created_at")
            .eq("is_published", true)
            .order("created_at", { ascending: false }),
        ]);

        setMillionaireGames(millRes.data || []);
        setSpinWheelGames(spinRes.data || []);
      } catch (error) {
        console.error("Error loading DB games:", error);
        toast({ title: "Erro ao carregar jogos", description: "Nao foi possivel carregar os jogos de base de dados.", variant: "destructive" });
      } finally {
        setLoadingDbGames(false);
      }
    };

    loadDbGames();
  }, [toast]);

  useEffect(() => { document.title = "Jogos da Live · Dashboard | Bateu"; }, []);

  return (
    <div className="space-y-6">

      {/* Header */}
      <header className="rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/5 p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold mb-2">
              <Radio className="h-3.5 w-3.5 animate-pulse" /> JOGOS DE LIVE
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Configurar Jogos da sua Live</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Personalize cada jogo como faria num concurso ou sorteio. As regras são aplicadas automaticamente ao iniciar uma live no Live Hub.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/millionaire-manager" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Gerenciar Milionário
            </Link>
            <Link to="/admin/spin-wheel-manager" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Gerenciar Roda
            </Link>
            <button onClick={saveAll} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm font-medium hover:bg-secondary">
              <Save className="h-4 w-4" /> Guardar tudo
            </button>
            <button onClick={resetAll} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium">
              <RotateCcw className="h-4 w-4" /> Repor padrões
            </button>
            <Link to="/lives" target="_blank" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm font-medium hover:bg-secondary">
              <ExternalLink className="h-4 w-4" /> Abrir Live Hub
            </Link>
          </div>
        </div>
      </header>

      {/* Quick stats — feels like a contest dashboard */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Trophy, label: "Jogos disponíveis", value: GAME_OPTIONS.length + millionaireGames.length + spinWheelGames.length, hint: `${GAME_OPTIONS.length} locais + ${millionaireGames.length} Millionaire + ${spinWheelGames.length} Roda` },
          { icon: Sparkles, label: "Prémios na roda", value: wheel.length, hint: `${totalWeight} pts peso total` },
          { icon: Vote, label: "Opções de emoji", value: emojis.length, hint: "Máx. 6" },
          { icon: Users, label: "Modo multi-jogador", value: "✓", hint: "Tap & Quiz" },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <s.icon className="h-4 w-4 text-primary mb-2" />
            <p className="font-display text-xl font-bold">{s.value}</p>
            <p className="text-[11px] text-muted-foreground">{s.label}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{s.hint}</p>
          </div>
        ))}
      </section>

      {/* Jogo ativo no momento — aplica imediatamente no Live Hub */}
      <section className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-card p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
              <Radio className="h-3 w-3 animate-pulse" /> Ao vivo agora
            </div>
            <h3 className="font-display text-lg font-bold">Jogo ativo no momento</h3>
            <p className="text-xs text-muted-foreground">
              O Live Hub e o overlay vão mudar automaticamente para este jogo. Resumo visível para o anfitrião.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold whitespace-nowrap">
            {GAME_OPTIONS.find(g => g.id === activeGame)?.emoji} {GAME_OPTIONS.find(g => g.id === activeGame)?.label}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {GAME_OPTIONS.map((g) => (
            <button
              key={g.id}
              onClick={() => setAndBroadcastActive(g.id)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                activeGame === g.id
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="text-2xl mb-1">{g.emoji}</div>
              <p className="text-[10px] font-bold leading-tight">{g.label}</p>
            </button>
          ))}
        </div>
      </section>

      {/* DB-Backed Games Section */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-wider mb-1">
              <Gamepad2 className="h-3 w-3" /> Jogos de Base de Dados
            </div>
            <h3 className="font-display text-lg font-bold">Jogos Publicados</h3>
            <p className="text-xs text-muted-foreground">
              Acesse os jogos criados no painel de administracao. Clique para jogar.
            </p>
          </div>
        </div>

        {loadingDbGames ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Millionaire Games */}
            <div className="rounded-xl border border-border/50 bg-background/50 p-4">
              <h4 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
                <span className="text-lg">🤑</span> Millionaire ({millionaireGames.length})
              </h4>
              {millionaireGames.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum jogo publicado</p>
              ) : (
                <div className="space-y-2">
                  {millionaireGames.map((game) => (
                    <Link
                      key={game.id}
                      to={`/games/millionaire/${game.id}`}
                      target="_blank"
                      className="block p-3 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors text-sm font-medium text-foreground"
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{game.name}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 ml-2 text-primary" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Spin Wheel Games */}
            <div className="rounded-xl border border-border/50 bg-background/50 p-4">
              <h4 className="font-display font-bold text-sm mb-3 flex items-center gap-2">
                <span className="text-lg">🎡</span> Roda da Sorte ({spinWheelGames.length})
              </h4>
              {spinWheelGames.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum jogo publicado</p>
              ) : (
                <div className="space-y-2">
                  {spinWheelGames.map((game) => (
                    <Link
                      key={game.id}
                      to={`/games/spin-wheel/${game.id}`}
                      target="_blank"
                      className="block p-3 rounded-lg bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors text-sm font-medium text-foreground"
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{game.name}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 ml-2 text-accent" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-2">
          <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Apenas jogos <strong>publicados</strong> aparecem aqui. Gerencie-os no{" "}
            <Link to="/admin/millionaire-manager" className="text-primary hover:underline">
              Painel Millionaire
            </Link>
            {" "}ou{" "}
            <Link to="/admin/spin-wheel-manager" className="text-primary hover:underline">
              Painel Roda
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Tabs per game */}
      <Tabs defaultValue="wheel" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1 bg-secondary">
          <TabsTrigger value="wheel" className="text-xs"><Sliders className="h-3.5 w-3.5 mr-1.5" />Roda</TabsTrigger>
          <TabsTrigger value="keyword" className="text-xs"><Search className="h-3.5 w-3.5 mr-1.5" />Palavra</TabsTrigger>
          <TabsTrigger value="emoji" className="text-xs"><Vote className="h-3.5 w-3.5 mr-1.5" />Emojis</TabsTrigger>
          <TabsTrigger value="tap" className="text-xs"><Zap className="h-3.5 w-3.5 mr-1.5" />Tap</TabsTrigger>
          <TabsTrigger value="quiz" className="text-xs"><Brain className="h-3.5 w-3.5 mr-1.5" />Quiz</TabsTrigger>
          <TabsTrigger value="mystery" className="text-xs"><Package className="h-3.5 w-3.5 mr-1.5" />Caixa</TabsTrigger>
        </TabsList>

        {/* Roda */}
        <TabsContent value="wheel" className="mt-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">Roda de Prémios</h3>
                <p className="text-xs text-muted-foreground">Defina prémios e o peso (probabilidade relativa) de cada um.</p>
              </div>
              <button onClick={addWheelPrize} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                <Plus className="h-3.5 w-3.5" /> Adicionar prémio
              </button>
            </div>

            <div className="space-y-2">
              {wheel.map((p) => {
                const pct = totalWeight ? (Math.max(0, p.weight) / totalWeight) * 100 : 0;
                return (
                  <div key={p.id} className="grid grid-cols-12 gap-2 items-center rounded-xl border border-border p-2.5 bg-background/50">
                    <input type="color" value={p.color} onChange={(e) => updWheel(p.id, { color: e.target.value })}
                      className="col-span-1 h-9 w-9 rounded-md border border-border bg-transparent cursor-pointer" />
                    <Input value={p.label} onChange={(e) => updWheel(p.id, { label: e.target.value.slice(0, 40) })}
                      maxLength={40} placeholder="Nome do prémio" className="col-span-5 h-9 text-xs" />
                    <Input type="number" min={0} max={1000} value={p.weight}
                      onChange={(e) => updWheel(p.id, { weight: Math.max(0, Number(e.target.value) || 0) })}
                      className="col-span-2 h-9 text-xs" />
                    <span className="col-span-3 text-[11px] text-muted-foreground text-right">{pct.toFixed(1)}% chance</span>
                    <button onClick={() => rmWheel(p.id)} className="col-span-1 p-2 rounded-md text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Palavra-chave */}
        <TabsContent value="keyword" className="mt-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold">Caça à Palavra-Chave</h3>
              <p className="text-xs text-muted-foreground">A audiência adivinha a palavra com base na pista. O primeiro a acertar vence.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Palavra-chave secreta</Label>
                <Input value={keyword.keyword} maxLength={40}
                  onChange={(e) => setKeyword({ ...keyword, keyword: e.target.value.slice(0, 40) })}
                  className="mt-1" placeholder="Ex: BATEU" />
              </div>
              <div>
                <Label className="text-xs">Pontos para o vencedor: {keyword.points}</Label>
                <Slider min={10} max={500} step={10} value={[keyword.points]}
                  onValueChange={([v]) => setKeyword({ ...keyword, points: v })} className="mt-3" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Pista para a audiência</Label>
                <Textarea value={keyword.clue} maxLength={240} rows={3}
                  onChange={(e) => setKeyword({ ...keyword, clue: e.target.value.slice(0, 240) })}
                  className="mt-1" />
                <p className="text-[10px] text-muted-foreground mt-1">{keyword.clue.length}/240 caracteres</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Emojis */}
        <TabsContent value="emoji" className="mt-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">Batalha de Emojis</h3>
                <p className="text-xs text-muted-foreground">Defina até 6 opções de votação. Os votantes do vencedor entram no sorteio.</p>
              </div>
              <button onClick={addEmoji} disabled={emojis.length >= 6}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" /> Adicionar opção
              </button>
            </div>
            <div className="space-y-2">
              {emojis.map((o) => (
                <div key={o.id} className="flex items-center gap-2 rounded-xl border border-border p-2.5 bg-background/50">
                  <Input value={o.emoji} maxLength={4} onChange={(e) => updEmoji(o.id, { emoji: e.target.value })}
                    className="w-16 h-9 text-center text-lg" />
                  <Input value={o.label} maxLength={40} onChange={(e) => updEmoji(o.id, { label: e.target.value.slice(0, 40) })}
                    className="flex-1 h-9 text-xs" placeholder="Etiqueta" />
                  <button onClick={() => rmEmoji(o.id)} className="p-2 rounded-md text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tap */}
        <TabsContent value="tap" className="mt-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-display text-lg font-bold">Tap Battle</h3>
            <div>
              <Label className="text-xs">Duração da rodada: {config.tapDuration}s</Label>
              <Slider min={3} max={15} step={1} value={[config.tapDuration]}
                onValueChange={([v]) => setConfig({ ...config, tapDuration: v })} className="mt-2" />
            </div>
          </div>
        </TabsContent>

        {/* Quiz */}
        <TabsContent value="quiz" className="mt-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-display text-lg font-bold">Quiz Battle</h3>
            <div>
              <Label className="text-xs">Número de perguntas: {config.quizQuestions}</Label>
              <Slider min={3} max={10} step={1} value={[config.quizQuestions]}
                onValueChange={([v]) => setConfig({ ...config, quizQuestions: v })} className="mt-2" />
            </div>
            <div>
              <Label className="text-xs">Tempo por pergunta: {config.quizTimePerQ}s</Label>
              <Slider min={5} max={20} step={1} value={[config.quizTimePerQ]}
                onValueChange={([v]) => setConfig({ ...config, quizTimePerQ: v })} className="mt-2" />
            </div>
          </div>
        </TabsContent>

        {/* Mystery */}
        <TabsContent value="mystery" className="mt-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h3 className="font-display text-lg font-bold">Caixa Misteriosa — Probabilidades</h3>
            <p className="text-[11px] text-muted-foreground">A soma é normalizada automaticamente.</p>
            <div>
              <Label className="text-xs">Prémio Alto: {(config.mysteryHigh * 100).toFixed(0)}%</Label>
              <Slider min={0} max={1} step={0.05} value={[config.mysteryHigh]}
                onValueChange={([v]) => setConfig({ ...config, mysteryHigh: v })} className="mt-2" />
            </div>
            <div>
              <Label className="text-xs">Prémio Baixo: {(config.mysteryLow * 100).toFixed(0)}%</Label>
              <Slider min={0} max={1} step={0.05} value={[config.mysteryLow]}
                onValueChange={([v]) => setConfig({ ...config, mysteryLow: v })} className="mt-2" />
            </div>
            <div>
              <Label className="text-xs">Sem Prémio: {(config.mysteryNone * 100).toFixed(0)}%</Label>
              <Slider min={0} max={1} step={0.05} value={[config.mysteryNone]}
                onValueChange={([v]) => setConfig({ ...config, mysteryNone: v })} className="mt-2" />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Tip */}
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-4 flex items-start gap-3">
        <Eye className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Depois de guardar, abra o <strong>Live Hub</strong> para iniciar uma live com o código gerado e use o overlay como Browser Source no OBS.
        </p>
      </div>
    </div>
  );
};

export default DashboardLiveGames;
