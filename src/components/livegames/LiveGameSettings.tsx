import { Settings2, Save, RefreshCw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type LiveGameConfig = {
  // Tap Battle
  tapDuration: number; // seconds
  // Quiz
  quizQuestions: number;
  quizTimePerQ: number;
  // Mystery Box probabilities (must sum ~1)
  mysteryHigh: number;
  mysteryLow: number;
  mysteryNone: number;
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

  const updateBranding = (patch: Partial<CompanyBranding>) => {
    onBrandingChange?.({ ...branding, ...patch });
  };

  const saveToSupabase = async () => {
    if (!user) return;
    try {
      // First save game config
      const { error: configError } = await supabase
        .from('live_game_configs')
        .upsert({
          user_id: user.id,
          tap_duration: config.tapDuration,
          quiz_questions: config.quizQuestions,
          quiz_time_per_q: config.quizTimePerQ,
          mystery_high: config.mysteryHigh,
          mystery_low: config.mysteryLow,
          mystery_none: config.mysteryNone,
          is_active: true,
        }, {
          onConflict: 'user_id'
        });
      
      if (configError) throw configError;

      // Then save branding
      const { error: brandingError } = await supabase
        .from('company_branding')
        .upsert({
          user_id: user.id,
          company_name: branding.companyName,
          company_slogan: branding.companySlogan,
          company_logo_url: branding.companyLogoUrl,
          primary_color: branding.primaryColor,
          secondary_color: branding.secondaryColor,
          accent_color: branding.accentColor,
          background_color: branding.backgroundColor,
          text_color: branding.textColor,
          background_image_url: branding.backgroundImageUrl,
        }, {
          onConflict: 'user_id'
        });
      
      if (brandingError) throw brandingError;

      toast({ title: "Configurações Guardadas!" });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao guardar configurações", variant: "destructive" });
    }
  };

  const loadFromSupabase = async () => {
    if (!user) return;
    try {
      // Load game config
      const { data: configData, error: configError } = await supabase
        .from('live_game_configs')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (!configError && configData) {
        onChange({
          tapDuration: configData.tap_duration,
          quizQuestions: configData.quiz_questions,
          quizTimePerQ: configData.quiz_time_per_q,
          mysteryHigh: configData.mystery_high,
          mysteryLow: configData.mystery_low,
          mysteryNone: configData.mystery_none,
        });
      }

      // Load branding
      const { data: brandingData, error: brandingError } = await supabase
        .from('company_branding')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (!brandingError && brandingData) {
        updateBranding({
          companyName: brandingData.company_name,
          companySlogan: brandingData.company_slogan,
          companyLogoUrl: brandingData.company_logo_url,
          primaryColor: brandingData.primary_color,
          secondaryColor: brandingData.secondary_color,
          accentColor: brandingData.accent_color,
          backgroundColor: brandingData.background_color,
          textColor: brandingData.text_color,
          backgroundImageUrl: brandingData.background_image_url,
        });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao carregar configurações", variant: "destructive" });
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-xs font-medium hover:bg-secondary">
          <Settings2 className="h-3.5 w-3.5" />
          Configurações da Live
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex justify-between items-center">
            <SheetTitle>Configurações dos Jogos</SheetTitle>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={loadFromSupabase} className="gap-1">
                <RefreshCw className="h-3 w-3" />
                Carregar
              </Button>
              <Button size="sm" onClick={saveToSupabase} className="gap-1">
                <Save className="h-3 w-3" />
                Guardar
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="games">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="games">Jogos</TabsTrigger>
            <TabsTrigger value="branding">Marca/Design</TabsTrigger>
          </TabsList>
          
          <TabsContent value="games" className="space-y-6 pb-6">
            <section>
              <h4 className="font-bold text-sm mb-3">⚡ Tap Battle</h4>
              <Label className="text-xs">Duração: {config.tapDuration}s</Label>
              <Slider
                min={3} max={15} step={1}
                value={[config.tapDuration]}
                onValueChange={([v]) => update({ tapDuration: v })}
                className="mt-2"
              />
            </section>

            <section>
              <h4 className="font-bold text-sm mb-3">🧠 Quiz Battle</h4>
              <Label className="text-xs">Número de perguntas: {config.quizQuestions}</Label>
              <Slider
                min={3} max={10} step={1}
                value={[config.quizQuestions]}
                onValueChange={([v]) => update({ quizQuestions: v })}
                className="mt-2 mb-4"
              />
              <Label className="text-xs">Tempo por pergunta: {config.quizTimePerQ}s</Label>
              <Slider
                min={5} max={20} step={1}
                value={[config.quizTimePerQ]}
                onValueChange={([v]) => update({ quizTimePerQ: v })}
                className="mt-2"
              />
            </section>

            <section>
              <h4 className="font-bold text-sm mb-3">🎁 Caixa Misteriosa — Probabilidades</h4>
              <p className="text-[11px] text-muted-foreground mb-3">
                As 4 caixas são distribuídas com base nestas probabilidades.
              </p>
              <Label className="text-xs">Prémio Alto: {(config.mysteryHigh * 100).toFixed(0)}%</Label>
              <Slider
                min={0} max={1} step={0.05}
                value={[config.mysteryHigh]}
                onValueChange={([v]) => update({ mysteryHigh: v })}
                className="mt-2 mb-4"
              />
              <Label className="text-xs">Prémio Baixo: {(config.mysteryLow * 100).toFixed(0)}%</Label>
              <Slider
                min={0} max={1} step={0.05}
                value={[config.mysteryLow]}
                onValueChange={([v]) => update({ mysteryLow: v })}
                className="mt-2 mb-4"
              />
              <Label className="text-xs">Sem Prémio: {(config.mysteryNone * 100).toFixed(0)}%</Label>
              <Slider
                min={0} max={1} step={0.05}
                value={[config.mysteryNone]}
                onValueChange={([v]) => update({ mysteryNone: v })}
                className="mt-2"
              />
              <p className="text-[10px] text-muted-foreground mt-2">
                Soma atual: {((config.mysteryHigh + config.mysteryLow + config.mysteryNone) * 100).toFixed(0)}% (será normalizado)
              </p>
            </section>

            <Button
              variant="destructive"
              onClick={() => onChange(DEFAULT_CONFIG)}
              className="w-full"
            >
              Repor padrão
            </Button>
          </TabsContent>
          
          <TabsContent value="branding" className="space-y-6 pb-6">
            <section>
              <h4 className="font-bold text-sm mb-3">ℹ️ Dados da Empresa</h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Nome da Empresa</Label>
                  <Input 
                    value={branding.companyName || ""}
                    onChange={(e) => updateBranding({ companyName: e.target.value })}
                    placeholder="Nome da tua empresa..."
                  />
                </div>
                <div>
                  <Label className="text-xs">Slogan</Label>
                  <Input 
                    value={branding.companySlogan || ""}
                    onChange={(e) => updateBranding({ companySlogan: e.target.value })}
                    placeholder="Slogan..."
                  />
                </div>
                <div>
                  <Label className="text-xs">URL do Logo</Label>
                  <Input 
                    value={branding.companyLogoUrl || ""}
                    onChange={(e) => updateBranding({ companyLogoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>
            </section>

            <section>
              <h4 className="font-bold text-sm mb-3">🎨 Cores</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Cor Principal</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) => updateBranding({ primaryColor: e.target.value })}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer"
                    />
                    <Input 
                      value={branding.primaryColor}
                      onChange={(e) => updateBranding({ primaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={branding.secondaryColor}
                      onChange={(e) => updateBranding({ secondaryColor: e.target.value })}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer"
                    />
                    <Input 
                      value={branding.secondaryColor}
                      onChange={(e) => updateBranding({ secondaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Cor de Acento</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={branding.accentColor}
                      onChange={(e) => updateBranding({ accentColor: e.target.value })}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer"
                    />
                    <Input 
                      value={branding.accentColor}
                      onChange={(e) => updateBranding({ accentColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Cor de Fundo</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={branding.backgroundColor}
                      onChange={(e) => updateBranding({ backgroundColor: e.target.value })}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer"
                    />
                    <Input 
                      value={branding.backgroundColor}
                      onChange={(e) => updateBranding({ backgroundColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs">Cor do Texto</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={branding.textColor}
                      onChange={(e) => updateBranding({ textColor: e.target.value })}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer"
                    />
                    <Input 
                      value={branding.textColor}
                      onChange={(e) => updateBranding({ textColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h4 className="font-bold text-sm mb-3">🖼️ Imagem de Fundo</h4>
              <Label className="text-xs">URL da Imagem de Fundo</Label>
              <Input 
                value={branding.backgroundImageUrl || ""}
                onChange={(e) => updateBranding({ backgroundImageUrl: e.target.value })}
                placeholder="https://example.com/background.png"
              />
            </section>

            <Button
              variant="destructive"
              onClick={() => onBrandingChange?.(DEFAULT_BRANDING)}
              className="w-full"
            >
              Repor Marca Padrão
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default LiveGameSettings;
