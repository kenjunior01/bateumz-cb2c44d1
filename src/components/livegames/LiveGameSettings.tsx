import { Settings2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

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

export const DEFAULT_CONFIG: LiveGameConfig = {
  tapDuration: 5,
  quizQuestions: 5,
  quizTimePerQ: 8,
  mysteryHigh: 0.25,
  mysteryLow: 0.4,
  mysteryNone: 0.35,
};

interface Props {
  config: LiveGameConfig;
  onChange: (c: LiveGameConfig) => void;
}

const LiveGameSettings = ({ config, onChange }: Props) => {
  const update = (patch: Partial<LiveGameConfig>) => onChange({ ...config, ...patch });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-xs font-medium hover:bg-secondary">
          <Settings2 className="h-3.5 w-3.5" />
          Configurações da Live
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Configurações dos Jogos da Live</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-6">
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

          <button
            onClick={() => onChange(DEFAULT_CONFIG)}
            className="w-full py-2.5 rounded-full bg-secondary text-foreground text-sm font-medium"
          >
            Repor padrão
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LiveGameSettings;
