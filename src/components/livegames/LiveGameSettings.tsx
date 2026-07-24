import { Settings2, Save, RefreshCw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type LiveGameConfig = {
 tapDuration: number;
 quizQuestions: number;
 quizTimePerQ: number;
 mysteryHigh: number;
 mysteryLow: number;
 mysteryNone: number;
 boardGameTimer: number;
 allowUndo: boolean;
 scoringSystem: 'cumulative' | 'per_round' | 'best_of_3';
 pointMultiplier: number;
 allowAudienceChallenges: boolean;
 challengeCooldown: number;
 enableParticles: boolean;
 enableConfetti: boolean;
 enableGlowEffects: boolean;
 animationSpeed: 'slow' | 'normal' | 'fast';
};

export interface CompanyBranding {
 companyName?: string;
 companySlogan?: string;
 companyLogoUrl?: string;
 primaryColor: string;
 secondaryColor: string;
 accentColor: string;
 backgroundColor: string;
 textColor: string;
 backgroundImageUrl?: string;
}

export const DEFAULT_CONFIG: LiveGameConfig = {
 tapDuration: 5,
 quizQuestions: 5,
 quizTimePerQ: 8,
 mysteryHigh: 0.25,
 mysteryLow: 0.4,
 mysteryNone: 0.35,
 boardGameTimer: 30,
 allowUndo: false,
 scoringSystem: 'cumulative',
 pointMultiplier: 1,
 allowAudienceChallenges: true,
 challengeCooldown: 30,
 enableParticles: true,
 enableConfetti: true,
 enableGlowEffects: true,
 animationSpeed: 'normal',
};

export const DEFAULT_BRANDING: CompanyBranding = {
 primaryColor: '#fbbf24',
 secondaryColor: '#3b82f6',
 accentColor: '#8b5cf6',
 backgroundColor: '#0a0e17',
 textColor: '#ffffff',
};

interface Props {
 config: LiveGameConfig;
 onChange: (c: LiveGameConfig) => void;
 branding?: CompanyBranding;
 onBrandingChange?: (b: CompanyBranding) => void;
}

const LiveGameSettings = ({ config, onChange, branding = DEFAULT_BRANDING, onBrandingChange }: Props) => {
 const { toast } = useToast();
 const { user } = useAuth();

 const update = (patch: Partial<LiveGameConfig>) => onChange({ ...config, ...patch });
 const updateBranding = (patch: Partial<CompanyBranding>) => onBrandingChange?.({ ...branding, ...patch });

 const saveToSupabase = async () => {
 if (!user) return;
 try {
 const { error: configError } = await (supabase as any).from('live_game_configs').upsert({
 user_id: user.id, tap_duration: config.tapDuration, quiz_questions: config.quizQuestions,
 quiz_time_per_q: config.quizTimePerQ, mystery_high: config.mysteryHigh,
 mystery_low: config.mysteryLow, mystery_none: config.mysteryNone,
 board_game_timer: config.boardGameTimer, allow_undo: config.allowUndo,
 scoring_system: config.scoringSystem, point_multiplier: config.pointMultiplier,
 allow_audience_challenges: config.allowAudienceChallenges,
 challenge_cooldown: config.challengeCooldown, enable_particles: config.enableParticles,
 enable_confetti: config.enableConfetti, enable_glow_effects: config.enableGlowEffects,
 animation_speed: config.animationSpeed, is_active: true,
 }, { onConflict: 'user_id' });
 if (configError) throw configError;

 const { error: brandingError } = await (supabase as any).from('company_branding').upsert({
 user_id: user.id, company_name: branding.companyName, company_slogan: branding.companySlogan,
 company_logo_url: branding.companyLogoUrl, primary_color: branding.primaryColor,
 secondary_color: branding.secondaryColor, accent_color: branding.accentColor,
 background_color: branding.backgroundColor, text_color: branding.textColor,
 background_image_url: branding.backgroundImageUrl,
 }, { onConflict: 'user_id' });
 if (brandingError) throw brandingError;
 toast({ title: "Configurações Guardadas!" });
 } catch (e) { console.error(e); toast({ title: "Erro ao guardar", variant: "destructive" }); }
 };

 const loadFromSupabase = async () => {
 if (!user) return;
 try {
 const { data: cd, error: ce } = await (supabase as any).from('live_game_configs').select('*').eq('user_id', user.id).single();
 if (!ce && cd) onChange({
 tapDuration: cd.tap_duration, quizQuestions: cd.quiz_questions, quizTimePerQ: cd.quiz_time_per_q,
 mysteryHigh: cd.mystery_high, mysteryLow: cd.mystery_low, mysteryNone: cd.mystery_none,
 boardGameTimer: cd.board_game_timer ?? 30, allowUndo: cd.allow_undo ?? false,
 scoringSystem: cd.scoring_system ?? 'cumulative', pointMultiplier: cd.point_multiplier ?? 1,
 allowAudienceChallenges: cd.allow_audience_challenges ?? true, challengeCooldown: cd.challenge_cooldown ?? 30,
 enableParticles: cd.enable_particles ?? true, enableConfetti: cd.enable_confetti ?? true,
 enableGlowEffects: cd.enable_glow_effects ?? true, animationSpeed: cd.animation_speed ?? 'normal',
 });
 const { data: bd, error: be } = await (supabase as any).from('company_branding').select('*').eq('user_id', user.id).single();
 if (!be && bd) updateBranding({
 companyName: bd.company_name, companySlogan: bd.company_slogan, companyLogoUrl: bd.company_logo_url,
 primaryColor: bd.primary_color, secondaryColor: bd.secondary_color, accentColor: bd.accent_color,
 backgroundColor: bd.background_color, textColor: bd.text_color, backgroundImageUrl: bd.background_image_url,
 });
 } catch (e) { console.error(e); toast({ title: "Erro ao carregar", variant: "destructive" }); }
 };

 return (
 <Sheet>
 <SheetTrigger asChild>
 <button className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-xs font-medium hover:bg-secondary">
 <Settings2 className="h-3.5 w-3.5" /> Configurações da Live
 </button>
 </SheetTrigger>
 <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
 <SheetHeader className="mb-4">
 <div className="flex justify-between items-center">
 <SheetTitle>Configurações dos Jogos</SheetTitle>
 <div className="flex gap-2">
 <Button variant="secondary" size="sm" onClick={loadFromSupabase} className="gap-1"><RefreshCw className="h-3 w-3" /> Carregar</Button>
 <Button size="sm" onClick={saveToSupabase} className="gap-1"><Save className="h-3 w-3" /> Guardar</Button>
 </div>
 </div>
 </SheetHeader>

 <Tabs defaultValue="games">
 <TabsList className="w-full mb-4">
 <TabsTrigger value="games">Jogos</TabsTrigger>
 <TabsTrigger value="rules">Regras</TabsTrigger>
 <TabsTrigger value="effects">Efeitos</TabsTrigger>
 <TabsTrigger value="branding">Marca</TabsTrigger>
 </TabsList>

 <TabsContent value="games" className="space-y-6 pb-6">
 <section><h4 className="font-bold text-sm mb-3">⚡ Tap Battle</h4><Label className="text-xs">Duração: {config.tapDuration}s</Label><Slider min={3} max={15} step={1} value={[config.tapDuration]} onValueChange={([v]) => update({ tapDuration: v })} className="mt-2" /></section>
 <section><h4 className="font-bold text-sm mb-3">🧠 Quiz Battle</h4><Label className="text-xs">Número de perguntas: {config.quizQuestions}</Label><Slider min={3} max={10} step={1} value={[config.quizQuestions]} onValueChange={([v]) => update({ quizQuestions: v })} className="mt-2 mb-4" /><Label className="text-xs">Tempo por pergunta: {config.quizTimePerQ}s</Label><Slider min={5} max={20} step={1} value={[config.quizTimePerQ]} onValueChange={([v]) => update({ quizTimePerQ: v })} className="mt-2" /></section>
 <section><h4 className="font-bold text-sm mb-3">🎁 Caixa Misteriosa — Probabilidades</h4><Label className="text-xs">Prémio Alto: {(config.mysteryHigh * 100).toFixed(0)}%</Label><Slider min={0} max={1} step={0.05} value={[config.mysteryHigh]} onValueChange={([v]) => update({ mysteryHigh: v })} className="mt-2 mb-4" /><Label className="text-xs">Prémio Baixo: {(config.mysteryLow * 100).toFixed(0)}%</Label><Slider min={0} max={1} step={0.05} value={[config.mysteryLow]} onValueChange={([v]) => update({ mysteryLow: v })} className="mt-2 mb-4" /><Label className="text-xs">Sem Prémio: {(config.mysteryNone * 100).toFixed(0)}%</Label><Slider min={0} max={1} step={0.05} value={[config.mysteryNone]} onValueChange={([v]) => update({ mysteryNone: v })} className="mt-2" /><p className="text-[10px] text-muted-foreground mt-2">Soma: {((config.mysteryHigh + config.mysteryLow + config.mysteryNone) * 100).toFixed(0)}%</p></section>
 <Button variant="destructive" onClick={() => onChange(DEFAULT_CONFIG)} className="w-full">Repor padrão</Button>
 </TabsContent>

 <TabsContent value="rules" className="space-y-6 pb-6">
 <section><h4 className="font-bold text-sm mb-3">♟️ Jogos de Tabuleiro</h4><Label className="text-xs">Tempo por jogada: {config.boardGameTimer}s</Label><Slider min={10} max={120} step={5} value={[config.boardGameTimer]} onValueChange={([v]) => update({ boardGameTimer: v })} className="mt-2 mb-4" /><div className="flex items-center justify-between"><Label className="text-xs">Permitir Desfazer</Label><Switch checked={config.allowUndo} onCheckedChange={(v) => update({ allowUndo: v })} /></div></section>
 <section><h4 className="font-bold text-sm mb-3">📊 Pontuação</h4><div className="space-y-3"><div><Label className="text-xs">Sistema de Pontuação</Label><Select value={config.scoringSystem} onValueChange={(v: any) => update({ scoringSystem: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cumulative">Acumulativa</SelectItem><SelectItem value="per_round">Por Ronda</SelectItem><SelectItem value="best_of_3">Melhor de 3</SelectItem></SelectContent></Select></div><div><Label className="text-xs">Multiplicador: {config.pointMultiplier}x</Label><Slider min={0.5} max={3} step={0.1} value={[config.pointMultiplier]} onValueChange={([v]) => update({ pointMultiplier: v })} className="mt-2" /></div></div></section>
 <section><h4 className="font-bold text-sm mb-3">🎯 Desafios</h4><div className="space-y-3"><div className="flex items-center justify-between"><Label className="text-xs">Desafios do Público</Label><Switch checked={config.allowAudienceChallenges} onCheckedChange={(v) => update({ allowAudienceChallenges: v })} /></div><div><Label className="text-xs">Intervalo: {config.challengeCooldown}s</Label><Slider min={10} max={120} step={5} value={[config.challengeCooldown]} onValueChange={([v]) => update({ challengeCooldown: v })} className="mt-2" /></div></div></section>
 <Button variant="destructive" onClick={() => onChange(DEFAULT_CONFIG)} className="w-full">Repor Padrão</Button>
 </TabsContent>

 <TabsContent value="effects" className="space-y-6 pb-6">
 <section><h4 className="font-bold text-sm mb-3">✨ Efeitos Visuais</h4><div className="space-y-4"><div className="flex items-center justify-between"><div><Label className="text-xs font-medium">Partículas</Label><p className="text-[10px] text-muted-foreground">Partículas animadas no fundo</p></div><Switch checked={config.enableParticles} onCheckedChange={(v) => update({ enableParticles: v })} /></div><div className="flex items-center justify-between"><div><Label className="text-xs font-medium">Confetti</Label><p className="text-[10px] text-muted-foreground">Celebrações com confetti</p></div><Switch checked={config.enableConfetti} onCheckedChange={(v) => update({ enableConfetti: v })} /></div><div className="flex items-center justify-between"><div><Label className="text-xs font-medium">Brilho</Label><p className="text-[10px] text-muted-foreground">Bordas e brilho animados</p></div><Switch checked={config.enableGlowEffects} onCheckedChange={(v) => update({ enableGlowEffects: v })} /></div><div><Label className="text-xs font-medium">Velocidade</Label><Select value={config.animationSpeed} onValueChange={(v: any) => update({ animationSpeed: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="slow">Lento</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="fast">Rápido</SelectItem></SelectContent></Select></div></div></section>
 </TabsContent>

 <TabsContent value="branding" className="space-y-6 pb-6">
 <section><h4 className="font-bold text-sm mb-3">ℹ️ Dados da Empresa</h4><div className="space-y-3"><div><Label className="text-xs">Nome da Empresa</Label><Input value={branding.companyName || ""} onChange={(e) => updateBranding({ companyName: e.target.value })} placeholder="Nome da tua empresa..." /></div><div><Label className="text-xs">Slogan</Label><Input value={branding.companySlogan || ""} onChange={(e) => updateBranding({ companySlogan: e.target.value })} placeholder="Slogan..." /></div><div><Label className="text-xs">URL do Logo</Label><Input value={branding.companyLogoUrl || ""} onChange={(e) => updateBranding({ companyLogoUrl: e.target.value })} placeholder="https://example.com/logo.png" /></div></div></section>
 <section><h4 className="font-bold text-sm mb-3">🎨 Cores</h4><div className="grid grid-cols-2 gap-3">
 {[['primaryColor','Cor Principal'],['secondaryColor','Cor Secundária'],['accentColor','Cor de Acento'],['backgroundColor','Cor de Fundo']].map(([k,l]) => (
 <div key={k} className="space-y-2"><Label className="text-xs">{l}</Label><div className="flex gap-2"><input type="color" value={branding[k as keyof CompanyBranding] as string} onChange={(e) => updateBranding({ [k]: e.target.value })} className="w-12 h-10 rounded-md border border-border cursor-pointer" /><Input value={branding[k as keyof CompanyBranding] as string} onChange={(e) => updateBranding({ [k]: e.target.value })} className="flex-1" /></div></div>
 ))}
 <div className="space-y-2 col-span-2"><Label className="text-xs">Cor do Texto</Label><div className="flex gap-2"><input type="color" value={branding.textColor} onChange={(e) => updateBranding({ textColor: e.target.value })} className="w-12 h-10 rounded-md border border-border cursor-pointer" /><Input value={branding.textColor} onChange={(e) => updateBranding({ textColor: e.target.value })} className="flex-1" /></div></div></div></section>
 <section><h4 className="font-bold text-sm mb-3">🖼️ Imagem de Fundo</h4><Label className="text-xs">URL</Label><Input value={branding.backgroundImageUrl || ""} onChange={(e) => updateBranding({ backgroundImageUrl: e.target.value })} placeholder="https://example.com/background.png" /></section>
 <Button variant="destructive" onClick={() => onBrandingChange?.(DEFAULT_BRANDING)} className="w-full">Repor Marca Padrão</Button>
 </TabsContent>
 </Tabs>
 </SheetContent>
 </Sheet>
 );
};

export default LiveGameSettings;
