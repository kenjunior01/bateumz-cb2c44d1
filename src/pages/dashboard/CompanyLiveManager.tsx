import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2, Plus, Settings2, Sparkles, Radio, Clock, Trophy, Users, Zap, Eye, EyeOff, Copy, Check, Save, Trash2, ChevronRight, BarChart3, Puzzle, Timer, Target, ListOrdered, Sliders, Palette, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ChallengeCreator, { Challenge } from '@/components/livegames/ChallengeCreator';

interface LiveTemplate {
  id: string;
  name: string;
  description: string;
  game_ids: string[];
  challenges: Challenge[];
  rules: LiveRules;
  branding: BrandingConfig;
  is_active: boolean;
  created_at: string;
}

interface LiveRules {
  startDelay: number;
  endDelay: number;
  maxPlayers: number;
  allowRejoin: boolean;
  autoStart: boolean;
  roundCount: number;
  breakBetweenRounds: number;
  showLeaderboardBetween: boolean;
  scoringSystem: 'cumulative' | 'per_round' | 'best_of_3';
  pointMultiplier: number;
  boardGameTimer: number;
  allowUndo: boolean;
}

interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  companyName: string;
  companySlogan: string;
  companyLogoUrl: string;
  backgroundImageUrl: string;
  enableParticles: boolean;
  enableConfetti: boolean;
  enableGlowEffects: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
}

const DEFAULT_RULES: LiveRules = {
  startDelay: 10,
  endDelay: 30,
  maxPlayers: 0,
  allowRejoin: true,
  autoStart: false,
  roundCount: 5,
  breakBetweenRounds: 15,
  showLeaderboardBetween: true,
  scoringSystem: 'cumulative',
  pointMultiplier: 1,
  boardGameTimer: 30,
  allowUndo: false,
};

const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: '#fbbf24',
  secondaryColor: '#3b82f6',
  accentColor: '#8b5cf6',
  backgroundColor: '#0a0e17',
  companyName: '',
  companySlogan: '',
  companyLogoUrl: '',
  backgroundImageUrl: '',
  enableParticles: true,
  enableConfetti: true,
  enableGlowEffects: true,
  animationSpeed: 'normal',
};

const AVAILABLE_GAMES = [
  { id: 'wheel', label: 'Roda de Premios', emoji: '🎰' },
  { id: 'tap', label: 'Tap Battle', emoji: '⚡' },
  { id: 'quiz', label: 'Quiz Battle', emoji: '🧠' },
  { id: 'mystery', label: 'Caixa Misteriosa', emoji: '🎁' },
  { id: 'keyword', label: 'Caca a Palavra', emoji: '🔎' },
  { id: 'emoji', label: 'Batalha de Emojis', emoji: '💥' },
  { id: 'millionaire', label: 'Quem Quer Ser Milionario', emoji: '💰' },
  { id: 'kahoot', label: 'Quiz ao Vivo', emoji: '🎯' },
  { id: 'bingo', label: 'Bingo ao Vivo', emoji: '🎱' },
  { id: 'challenge', label: 'Roleta de Desafios', emoji: '🎭' },
  { id: 'vsduel', label: 'Arena de Duelo VS', emoji: '⚔️' },
  { id: 'speed', label: 'Duelo de Velocidade', emoji: '⚡' },
  { id: 'truthordare', label: 'Verdade ou Desafio', emoji: '🔥' },
  { id: 'memory', label: 'Jogo da Memoria VS', emoji: '🧠' },
  { id: 'punishment', label: 'Roleta de Castigos', emoji: '💀' },
  { id: 'boknowledge', label: 'Batalha de Conhecimentos', emoji: '📚' },
  { id: 'guessEmoji', label: 'Adivinhe o Emoji', emoji: '😎' },
  { id: 'quickdraw', label: 'Desenho Rapido', emoji: '🎨' },
  { id: 'hotpotato', label: 'Batata Quente', emoji: '💣' },
  { id: 'numguess', label: 'Adivinha o Numero VS', emoji: '🔢' },
  { id: 'chaos', label: 'Desafio Caotico', emoji: '🌪️' },
  { id: 'checkers', label: 'Damas', emoji: '♟️' },
  { id: 'ludo', label: 'Ludo', emoji: '🎲' },
  { id: 'connect4', label: 'Ligar 4', emoji: '🔴' },
  { id: 'battleship', label: 'Batalha Naval', emoji: '🚢' },
  { id: 'tictactoe', label: 'Galo VS', emoji: '✕' },
  { id: 'uno', label: 'UNO Cartas', emoji: '🃏' },
];

const CompanyLiveManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<LiveTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('templates');

  const current = templates.find((t) => t.id === activeTemplate);

  useEffect(() => {
    if (user) loadTemplates();
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('live_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTemplates(
        (data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          description: d.description || '',
          game_ids: d.game_ids || [],
          challenges: d.challenges || [],
          rules: d.rules ? { ...DEFAULT_RULES, ...d.rules } : DEFAULT_RULES,
          branding: d.branding ? { ...DEFAULT_BRANDING, ...d.branding } : DEFAULT_BRANDING,
          is_active: d.is_active ?? true,
          created_at: d.created_at,
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    if (!user || !newName.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from('live_templates')
        .insert({
          user_id: user.id,
          name: newName.trim(),
          description: '',
          game_ids: [],
          challenges: [],
          rules: DEFAULT_RULES,
          branding: DEFAULT_BRANDING,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      const tpl: LiveTemplate = {
        id: data.id,
        name: data.name,
        description: '',
        game_ids: [],
        challenges: [],
        rules: DEFAULT_RULES,
        branding: DEFAULT_BRANDING,
        is_active: true,
        created_at: data.created_at,
      };
      setTemplates((p) => [tpl, ...p]);
      setActiveTemplate(tpl.id);
      setNewName('');
      setCreating(false);
      toast({ title: 'Template criado!' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao criar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveTemplate = async () => {
    if (!user || !current) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('live_templates')
        .update({
          name: current.name,
          description: current.description,
          game_ids: current.game_ids,
          challenges: current.challenges,
          rules: current.rules,
          branding: current.branding,
          is_active: current.is_active,
        })
        .eq('id', current.id);
      if (error) throw error;
      toast({ title: 'Template guardado!' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await (supabase as any).from('live_templates').delete().eq('id', id);
      if (error) throw error;
      setTemplates((p) => p.filter((t) => t.id !== id));
      if (activeTemplate === id) setActiveTemplate(null);
      toast({ title: 'Template eliminado' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao eliminar', variant: 'destructive' });
    }
  };

  const duplicateTemplate = async (id: string) => {
    const orig = templates.find((t) => t.id === id);
    if (!orig || !user) return;
    setSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from('live_templates')
        .insert({
          user_id: user.id,
          name: `${orig.name} (copia)`,
          description: orig.description,
          game_ids: orig.game_ids,
          challenges: orig.challenges,
          rules: orig.rules,
          branding: orig.branding,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      setTemplates((p) => [{
        id: data.id, name: data.name, description: data.description || '',
        game_ids: data.game_ids || [], challenges: data.challenges || [],
        rules: data.rules || DEFAULT_RULES, branding: data.branding || DEFAULT_BRANDING,
        is_active: true, created_at: data.created_at,
      }, ...p]);
      toast({ title: 'Template duplicado!' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleGame = (gameId: string) => {
    if (!current) return;
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === current.id
          ? {
              ...t,
              game_ids: t.game_ids.includes(gameId)
                ? t.game_ids.filter((g) => g !== gameId)
                : [...t.game_ids, gameId],
            }
          : t
      )
    );
  };

  const updateRules = (patch: Partial<LiveRules>) => {
    if (!current) return;
    setTemplates((prev) => prev.map((t) => (t.id === current.id ? { ...t, rules: { ...t.rules, ...patch } } : t)));
  };

  const updateBranding = (patch: Partial<BrandingConfig>) => {
    if (!current) return;
    setTemplates((prev) => prev.map((t) => (t.id === current.id ? { ...t, branding: { ...t.branding, ...patch } } : t)));
  };

  const updateTemplateField = (field: string, value: string) => {
    if (!current) return;
    setTemplates((prev) => prev.map((t) => (t.id === current.id ? { ...t, [field]: value } : t)));
  };

  const updateTemplateFieldDirect = (field: string, value: any) => {
    if (!current) return;
    setTemplates((prev) => prev.map((t) => (t.id === current.id ? { ...t, [field]: value } : t)));
  };

  const exportTemplate = () => {
    if (!current) return;
    navigator.clipboard.writeText(JSON.stringify(current, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white">
            <Radio className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Gestao de Lives</h1>
            <p className="text-sm text-muted-foreground">
              Crie templates de live com jogos, desafios e regras personalizados para a sua empresa.
            </p>
          </div>
        </div>
      </motion.div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid lg:grid-cols-4">
          <TabsTrigger value="templates" className="gap-1"><ListOrdered className="h-3.5 w-3.5" /> Templates</TabsTrigger>
          <TabsTrigger value="games" className="gap-1"><Gamepad2 className="h-3.5 w-3.5" /> Jogos</TabsTrigger>
          <TabsTrigger value="rules" className="gap-1"><Sliders className="h-3.5 w-3.5" /> Regras</TabsTrigger>
          <TabsTrigger value="design" className="gap-1"><Palette className="h-3.5 w-3.5" /> Design</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold">Templates de Live</h2>
            <div className="flex gap-2">
              {!creating ? (
                <Button size="sm" onClick={() => setCreating(true)} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Novo Template
                </Button>
              ) : (
                <div className="flex gap-2 items-center">
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do template..." className="w-48" onKeyDown={(e) => e.key === 'Enter' && createTemplate()} />
                  <Button size="sm" onClick={createTemplate} disabled={saving || !newName.trim()}>Criar</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setNewName(''); }}>Cancelar</Button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">A carregar...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Crie o seu primeiro template de live personalizado.</p>
              <Button onClick={() => setCreating(true)} className="gap-1">
                <Plus className="h-4 w-4" /> Criar Template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <motion.div
                  key={tpl.id}
                  layout
                  onClick={() => { setActiveTemplate(tpl.id); setTab('games'); }}
                  className={`rounded-2xl border-2 p-5 cursor-pointer transition-all hover:shadow-lg ${activeTemplate === tpl.id ? 'border-primary bg-primary/5 shadow-primary/10 shadow-lg' : 'border-border bg-card hover:border-primary/40'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-sm">{tpl.name}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{tpl.game_ids.length} jogos selecionados</p>
                    </div>
                    <Badge variant={tpl.is_active ? 'default' : 'secondary'} className="text-[9px]">
                      {tpl.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {tpl.game_ids.slice(0, 5).map((gid) => {
                      const g = AVAILABLE_GAMES.find((a) => a.id === gid);
                      return g ? <Badge key={gid} variant="outline" className="text-[9px]">{g.emoji} {g.label}</Badge> : null;
                    })}
                    {tpl.game_ids.length > 5 && <Badge variant="outline" className="text-[9px]">+{tpl.game_ids.length - 5}</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); duplicateTemplate(tpl.id); }}><Copy className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/live-hub?template=${tpl.id}`); }} className="text-emerald-500"><Play className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); deleteTemplate(tpl.id); }} className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="games" className="mt-6">
          {!current ? (
            <div className="text-center py-12 text-muted-foreground rounded-2xl border border-dashed border-border">
              <Gamepad2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p>Selecione um template para configurar os jogos.</p>
              <Button variant="link" onClick={() => setTab('templates')}>Ver templates</Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold">Jogos do Template: {current.name}</h2>
                  <p className="text-xs text-muted-foreground">Selecione os jogos que farao parte desta live.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportTemplate} className="gap-1">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copiado!' : 'Exportar'}
                  </Button>
                  <Button size="sm" onClick={saveTemplate} disabled={saving} className="gap-1">
                    <Save className="h-3 w-3" /> Guardar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {AVAILABLE_GAMES.map((g) => {
                  const isSelected = current.game_ids.includes(g.id);
                  return (
                    <motion.button
                      key={g.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleGame(g.id)}
                      className={`text-left rounded-2xl border-2 p-4 transition-all ${isSelected ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-border bg-card hover:border-primary/30'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{g.emoji}</span>
                        <div>
                          <p className="font-bold text-sm">{g.label}</p>
                          <p className="text-[10px] text-muted-foreground">{isSelected ? 'Selecionado' : 'Clique para ativar'}</p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary ml-auto" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <Separator />

              <div>
                <h3 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
                  <Puzzle className="h-5 w-5 text-primary" /> Desafios Personalizados
                </h3>
                <ChallengeCreator
                liveCode={undefined}
                externalChallenges={current?.challenges || []}
                onChallengesChange={(chs) => { if (current) updateTemplateFieldDirect('challenges', chs); }}
              />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          {!current ? (
            <div className="text-center py-12 text-muted-foreground rounded-2xl border border-dashed border-border">
              <Sliders className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p>Selecione um template para configurar as regras.</p>
              <Button variant="link" onClick={() => setTab('templates')}>Ver templates</Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Regras da Live: {current.name}</h2>
                <Button size="sm" onClick={saveTemplate} disabled={saving} className="gap-1">
                  <Save className="h-3 w-3" /> Guardar
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Temporizacao</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Atraso de inicio: {current.rules.startDelay}s</Label>
                    <Slider min={0} max={60} step={5} value={[current.rules.startDelay]} onValueChange={([v]) => updateRules({ startDelay: v })} className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-xs">Atraso de fim: {current.rules.endDelay}s</Label>
                    <Slider min={0} max={120} step={5} value={[current.rules.endDelay]} onValueChange={([v]) => updateRules({ endDelay: v })} className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-xs">Numero de rondas: {current.rules.roundCount}</Label>
                    <Slider min={1} max={20} step={1} value={[current.rules.roundCount]} onValueChange={([v]) => updateRules({ roundCount: v })} className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-xs">Pausa entre rondas: {current.rules.breakBetweenRounds}s</Label>
                    <Slider min={0} max={60} step={5} value={[current.rules.breakBetweenRounds]} onValueChange={([v]) => updateRules({ breakBetweenRounds: v })} className="mt-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Jogadores</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Maximo de jogadores (0 = sem limite): {current.rules.maxPlayers || 'Ilimitado'}</Label>
                    <Slider min={0} max={500} step={10} value={[current.rules.maxPlayers]} onValueChange={([v]) => updateRules({ maxPlayers: v })} className="mt-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><Label className="text-xs font-medium">Permitir reentrada</Label><p className="text-[10px] text-muted-foreground">Jogadores podem voltar apos sair</p></div>
                    <Switch checked={current.rules.allowRejoin} onCheckedChange={(v) => updateRules({ allowRejoin: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><Label className="text-xs font-medium">Inicio automatico</Label><p className="text-[10px] text-muted-foreground">Live comeca automaticamente com contagem</p></div>
                    <Switch checked={current.rules.autoStart} onCheckedChange={(v) => updateRules({ autoStart: v })} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4" /> Pontuacao</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Sistema de Pontuacao</Label>
                    <Select value={current.rules.scoringSystem} onValueChange={(v: any) => updateRules({ scoringSystem: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cumulative">Acumulativa</SelectItem>
                        <SelectItem value="per_round">Por Ronda</SelectItem>
                        <SelectItem value="best_of_3">Melhor de 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Multiplicador de pontos: {current.rules.pointMultiplier}x</Label>
                    <Slider min={0.5} max={3} step={0.1} value={[current.rules.pointMultiplier]} onValueChange={([v]) => updateRules({ pointMultiplier: v })} className="mt-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><Label className="text-xs font-medium">Leaderboard entre rondas</Label><p className="text-[10px] text-muted-foreground">Mostra ranking durante pausas</p></div>
                    <Switch checked={current.rules.showLeaderboardBetween} onCheckedChange={(v) => updateRules({ showLeaderboardBetween: v })} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Gamepad2 className="h-4 w-4" /> Jogos de Tabuleiro</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Tempo por jogada: {current.rules.boardGameTimer}s</Label>
                    <Slider min={10} max={120} step={5} value={[current.rules.boardGameTimer]} onValueChange={([v]) => updateRules({ boardGameTimer: v })} className="mt-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><Label className="text-xs font-medium">Permitir desfazer</Label><p className="text-[10px] text-muted-foreground">Jogadores podem desfazer ultima jogada</p></div>
                    <Switch checked={current.rules.allowUndo} onCheckedChange={(v) => updateRules({ allowUndo: v })} />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="design" className="mt-6">
          {!current ? (
            <div className="text-center py-12 text-muted-foreground rounded-2xl border border-dashed border-border">
              <Palette className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p>Selecione um template para configurar o design.</p>
              <Button variant="link" onClick={() => setTab('templates')}>Ver templates</Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Design da Live: {current.name}</h2>
                <Button size="sm" onClick={saveTemplate} disabled={saving} className="gap-1">
                  <Save className="h-3 w-3" /> Guardar
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Dados da Empresa</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label className="text-xs">Nome da Empresa</Label><Input value={current.branding.companyName} onChange={(e) => updateBranding({ companyName: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Slogan</Label><Input value={current.branding.companySlogan} onChange={(e) => updateBranding({ companySlogan: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">URL do Logo</Label><Input value={current.branding.companyLogoUrl} onChange={(e) => updateBranding({ companyLogoUrl: e.target.value })} className="mt-1" /></div>
                  <div><Label className="text-xs">Imagem de Fundo</Label><Input value={current.branding.backgroundImageUrl} onChange={(e) => updateBranding({ backgroundImageUrl: e.target.value })} className="mt-1" /></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Cores do Tema</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {(['primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor']).map((key) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs capitalize">{key.replace('Color', '').replace('background', 'Fundo')}</Label>
                        <div className="flex gap-2">
                          <input type="color" value={current.branding[key]} onChange={(e) => updateBranding({ [key]: e.target.value })} className="w-10 h-9 rounded border border-border cursor-pointer" />
                          <Input value={current.branding[key]} onChange={(e) => updateBranding({ [key]: e.target.value })} className="flex-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Preview do Overlay</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-[11px] text-muted-foreground">Veja como o overlay fica com as suas cores. Abra numa janela do OBS.</p>
                  <div className="flex gap-2">
                    {["leaderboard", "scoreboard", "minimal"].map((v: string) => (
                      <Button key={v} size="sm" variant="outline" onClick={() => window.open(`/overlay/pro?code=LIVE&layout=${v}`, "_blank", "width=1280,height=720")}>
                        {v}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4" /> Efeitos Visuais</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div><Label className="text-xs font-medium">Particulas animadas</Label><p className="text-[10px] text-muted-foreground">Efeitos de particulas no fundo</p></div>
                    <Switch checked={current.branding.enableParticles} onCheckedChange={(v) => updateBranding({ enableParticles: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><Label className="text-xs font-medium">Confetti</Label><p className="text-[10px] text-muted-foreground">Celebracoes com confetti</p></div>
                    <Switch checked={current.branding.enableConfetti} onCheckedChange={(v) => updateBranding({ enableConfetti: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div><Label className="text-xs font-medium">Efeitos de brilho</Label><p className="text-[10px] text-muted-foreground">Bordas e brilho animados</p></div>
                    <Switch checked={current.branding.enableGlowEffects} onCheckedChange={(v) => updateBranding({ enableGlowEffects: v })} />
                  </div>
                  <div>
                    <Label className="text-xs font-medium">Velocidade da animacao</Label>
                    <Select value={current.branding.animationSpeed} onValueChange={(v: any) => updateBranding({ animationSpeed: v })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slow">Lento</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="fast">Rapido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanyLiveManager;
