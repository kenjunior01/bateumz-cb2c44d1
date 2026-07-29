import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Sparkles, Copy, Check, Gamepad2, Timer, Zap, Target, Dices, Flame, Puzzle, Shuffle, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'physical' | 'talent' | 'trivia' | 'dare' | 'puzzle' | 'speed' | 'custom';
  points: number;
  timeLimit: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  is_active: boolean;
  order: number;
  options?: string[];
  correctAnswer?: string;
}

interface ChallengeCreatorProps {
 liveCode?: string;
 onChallengeCreated?: (challenge: Challenge) => void;
 compact?: boolean;
}

const TYPE_CONFIG: Record<string, { icon: typeof Gamepad2; color: string; label: string }> = {
  quiz: { icon: Target, color: 'from-blue-500 to-cyan-500', label: 'Quiz' },
  physical: { icon: Zap, color: 'from-red-500 to-orange-500', label: 'Fisico' },
  talent: { icon: Sparkles, color: 'from-purple-500 to-pink-500', label: 'Talento' },
  trivia: { icon: Gamepad2, color: 'from-amber-500 to-yellow-500', label: 'Trivia' },
  dare: { icon: Flame, color: 'from-rose-500 to-red-600', label: 'Desafio' },
  puzzle: { icon: Puzzle, color: 'from-emerald-500 to-teal-500', label: 'Puzzle' },
  speed: { icon: Timer, color: 'from-cyan-500 to-blue-600', label: 'Velocidade' },
  custom: { icon: Dices, color: 'from-violet-500 to-fuchsia-500', label: 'Personalizado' },
};

const EMPTY_CHALLENGE = (): Challenge => ({
  id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  title: '',
  description: '',
  type: 'quiz',
  points: 100,
  timeLimit: 30,
  difficulty: 'medium',
  is_active: true,
  order: 0,
});

const ChallengeCreator = ({ liveCode, onChallengeCreated, compact = false }: ChallengeCreatorProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const addChallenge = () => {
    const ch = EMPTY_CHALLENGE();
    ch.order = challenges.length;
    setChallenges((prev) => [...prev, ch]);
    setEditingId(ch.id);
  };

  const updateChallenge = (id: string, patch: Partial<Challenge>) => {
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeChallenge = (id: string) => {
    setChallenges((prev) => prev.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const moveChallenge = (id: string, dir: -1 | 1) => {
    setChallenges((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((c, i) => ({ ...c, order: i }));
    });
  };

  const duplicateChallenge = (id: string) => {
    const orig = challenges.find((c) => c.id === id);
    if (!orig) return;
    const dup: Challenge = { ...orig, id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: `${orig.title} (copia)` };
    setChallenges((prev) => [...prev, dup]);
  };

  const saveAll = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from('live_challenges').upsert(
        challenges.map((c) => ({
          user_id: user.id,
          challenge_id: c.id,
          live_code: liveCode || null,
          title: c.title,
          description: c.description,
          type: c.type,
          points: c.points,
          time_limit: c.timeLimit,
          difficulty: c.difficulty,
          is_active: c.is_active,
          sort_order: c.order,
          options: c.options || null,
          correct_answer: c.correctAnswer || null,
        })),
        { onConflict: 'user_id,challenge_id' }
      );
      if (error) throw error;
      toast({ title: 'Desafios guardados com sucesso!' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const exportJSON = async () => {
    const json = JSON.stringify(challenges, null, 2);
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const loadSaved = async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase as any)
        .from('live_challenges')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        setChallenges(
          data.map((d: any) => ({
            id: d.challenge_id,
            title: d.title,
            description: d.description,
            type: d.type,
            points: d.points,
            timeLimit: d.time_limit,
            difficulty: d.difficulty,
            is_active: d.is_active,
            order: d.sort_order,
            options: d.options || undefined,
            correctAnswer: d.correct_answer || undefined,
          }))
        );
        toast({ title: `${data.length} desafios carregados` });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalPoints = challenges.reduce((a, c) => a + c.points, 0);

  if (compact) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Criar Desafios
          </h3>
          <Badge variant="secondary" className="text-[10px]">
            {challenges.length} desafios
          </Badge>
        </div>
        <Button onClick={addChallenge} size="sm" className="w-full gap-1">
          <Plus className="h-3 w-3" /> Novo Desafio
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Criador de Desafios
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Crie desafios personalizados para as suas lives. Configure tipo, pontos, tempo e dificuldade.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadSaved} className="gap-1">
            Carregar
          </Button>
          <Button variant="outline" size="sm" onClick={exportJSON} className="gap-1">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copiado!' : 'Exportar'}
          </Button>
          <Button size="sm" onClick={saveAll} disabled={saving} className="gap-1">
            {saving ? 'A guardar...' : 'Guardar Todos'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Desafios', value: challenges.length, color: 'text-blue-500' },
          { label: 'Pontos Totais', value: totalPoints, color: 'text-amber-500' },
          { label: 'Ativos', value: challenges.filter((c) => c.is_active).length, color: 'text-emerald-500' },
          { label: 'Extremos', value: challenges.filter((c) => c.difficulty === 'extreme').length, color: 'text-red-500' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card/50 p-3 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {challenges.map((ch, idx) => {
          const tc = TYPE_CONFIG[ch.type] || TYPE_CONFIG.custom;
          const isEditing = editingId === ch.id;
          const Icon = tc.icon;
          return (
            <motion.div
              key={ch.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => setEditingId(isEditing ? null : ch.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/50 transition-colors"
              >
                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${tc.color} flex items-center justify-center text-white shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold truncate">{ch.title || 'Sem titulo'}</span>
                    <Badge variant={ch.is_active ? 'default' : 'secondary'} className="text-[9px]">
                      {ch.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{tc.label}</span>
                    <span>{ch.points}pts</span>
                    <span>{ch.timeLimit}s</span>
                    <span className="capitalize">{ch.difficulty}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveChallenge(ch.id, -1); }}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-secondary disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveChallenge(ch.id, 1); }}
                    disabled={idx === challenges.length - 1}
                    className="p-1 rounded hover:bg-secondary disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {isEditing ? <ChevronUp className="h-4 w-4 rotate-180 text-primary" /> : null}
                </div>
              </button>

              <AnimatePresence>
                {isEditing && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Titulo do Desafio</Label>
                          <Input
                            value={ch.title}
                            onChange={(e) => updateChallenge(ch.id, { title: e.target.value })}
                            placeholder="Ex: Pergunta surpresa..."
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <Select
                            value={ch.type}
                            onValueChange={(v) => updateChallenge(ch.id, { type: v as Challenge['type'] })}
                          >
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Descricao</Label>
                        <Textarea
                          value={ch.description}
                          onChange={(e) => updateChallenge(ch.id, { description: e.target.value })}
                          placeholder="Descreva o desafio em detalhe..."
                          className="mt-1"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs">Pontos: {ch.points}</Label>
                          <Slider
                            min={10} max={1000} step={10}
                            value={[ch.points]}
                            onValueChange={([v]) => updateChallenge(ch.id, { points: v })}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tempo: {ch.timeLimit}s</Label>
                          <Slider
                            min={5} max={180} step={5}
                            value={[ch.timeLimit]}
                            onValueChange={([v]) => updateChallenge(ch.id, { timeLimit: v })}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Dificuldade</Label>
                          <Select
                            value={ch.difficulty}
                            onValueChange={(v) => updateChallenge(ch.id, { difficulty: v as Challenge['difficulty'] })}
                          >
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Facil</SelectItem>
                              <SelectItem value="medium">Medio</SelectItem>
                              <SelectItem value="hard">Dificil</SelectItem>
                              <SelectItem value="extreme">Extremo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end pb-1">
                          <div className="flex items-center justify-between w-full">
                            <Label className="text-xs">Ativo</Label>
                            <Switch
                              checked={ch.is_active}
                              onCheckedChange={(v) => updateChallenge(ch.id, { is_active: v })}
                            />
                          </div>
                        </div>
                      </div>

                      {ch.type === 'quiz' && (
                        <div>
                          <Label className="text-xs mb-2 block">Opcoes (uma por linha)</Label>
                          <Textarea
                            value={(ch.options || []).join('\n')}
                            onChange={(e) =>
                              updateChallenge(ch.id, {
                                options: e.target.value.split('\n').filter(Boolean),
                              })
                            }
                            placeholder="Opcao A\nOpcao B\nOpcao C\nOpcao D"
                            rows={4}
                          />
                          <div className="mt-2">
                            <Label className="text-xs">Resposta Correta</Label>
                            <Input
                              value={ch.correctAnswer || ''}
                              onChange={(e) => updateChallenge(ch.id, { correctAnswer: e.target.value })}
                              placeholder="Texto da resposta correta"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Button
                          variant="outline" size="sm"
                          onClick={() => duplicateChallenge(ch.id)}
                          className="gap-1"
                        >
                          <Copy className="h-3 w-3" /> Duplicar
                        </Button>
                        <Button
                          variant="destructive" size="sm"
                          onClick={() => removeChallenge(ch.id)}
                          className="gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Eliminar
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {challenges.length === 0 && (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-card/30">
          <Gamepad2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhum desafio criado ainda.</p>
          <Button onClick={addChallenge} className="gap-1">
            <Plus className="h-4 w-4" /> Criar Primeiro Desafio
          </Button>
        </div>
      )}

      <Button onClick={addChallenge} size="lg" className="w-full gap-2" variant="outline">
        <Plus className="h-4 w-4" /> Adicionar Desafio
      </Button>
    </div>
  );
};

export default ChallengeCreator;
