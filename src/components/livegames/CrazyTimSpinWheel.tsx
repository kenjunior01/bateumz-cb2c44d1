import { useEffect, useRef, useState, useCallback } from 'react';
import { PrizeWheel as Wheel } from 'spin-wheel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, Settings2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface Prize {
  id: string;
  label: string;
  color: string;
  textColor?: string;
  weight: number;
  rewardType?: string;
  rewardValue?: string;
}

interface Props {
  prizes?: Prize[];
  onWin?: (prize: Prize) => void;
  editable?: boolean;
  companyLogoUrl?: string;
  backgroundColor?: string;
  overlayColor?: string;
}

const DEFAULT_PRIZES: Prize[] = [
  { id: '1', label: 'Prêmio 1', color: '#22c55e', weight: 30 },
  { id: '2', label: 'Prêmio 2', color: '#eab308', weight: 25 },
  { id: '3', label: 'Tente de novo', color: '#334155', textColor: '#fff', weight: 30 },
  { id: '4', label: 'Grande Prêmio', color: '#8b5cf6', weight: 15 },
];

export default function CrazyTimSpinWheel({ 
  prizes: initialPrizes = DEFAULT_PRIZES, 
  onWin, 
  editable = true,
  companyLogoUrl,
  backgroundColor,
  overlayColor
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wheelRef = useRef<Wheel | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>(initialPrizes);
  const [isSpinning, setIsSpinning] = useState(false);

  // Initialize the wheel
  useEffect(() => {
    if (!canvasRef.current) return;

    const wheel = new Wheel(canvasRef.current, {
      items: prizes.map(p => ({
        label: p.label,
        background: p.color,
        color: p.textColor || '#000',
        weight: p.weight
      })),
      itemLabelRadius: 0.75,
      itemLabelAlign: 'center',
      itemLabelBaselineOffset: -0.05,
      itemLabelFont: '16px Inter, sans-serif',
      itemLabelColor: '#fff',
      radius: 0.9,
      lineWidth: 4,
      lineColor: backgroundColor || '#fff',
      isInteractive: !isSpinning,
      onSpinEnd: (index) => {
        setIsSpinning(false);
        const wonPrize = prizes[index];
        if (wonPrize) {
          toast.success(`Ganhou: ${wonPrize.rewardValue || wonPrize.label}!`);
          confetti({ particleCount: 100, spread: 70 });
          onWin?.(wonPrize);
        }
      }
    });

    wheelRef.current = wheel;

    return () => {
      wheel.destroy();
    };
  }, [prizes, isSpinning]);

  const spinWheel = useCallback(() => {
    if (!wheelRef.current || isSpinning) return;
    setIsSpinning(true);

    // Spin to a random prize (can be server-determined)
    const randomIndex = Math.floor(Math.random() * prizes.length);
    wheelRef.current.spinToItem(randomIndex, 5, true);
  }, [isSpinning, prizes]);

  const addPrize = () => {
    const newId = Date.now().toString();
    const newColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    setPrizes([
      ...prizes,
      { id: newId, label: 'Novo Prêmio', color: newColor, weight: 10 }
    ]);
  };

  const removePrize = (id: string) => {
    if (prizes.length <= 2) return;
    setPrizes(prizes.filter(p => p.id !== id));
  };

  const updatePrize = (id: string, updates: Partial<Prize>) => {
    setPrizes(prizes.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const totalWeight = prizes.reduce((sum, p) => sum + Math.max(0, p.weight), 0) || 1;

  return (
    <div 
      className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4"
      style={{ backgroundColor }}
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-white mb-2">Roda da Sorte</h1>
        {companyLogoUrl && (
          <img 
            src={companyLogoUrl} 
            alt="Logo" 
            className="h-16 mx-auto rounded-full border-2 border-yellow-500" 
          />
        )}
      </div>

      <div className="relative mb-8">
        <canvas 
          ref={canvasRef} 
          width="500" 
          height="500" 
          className="w-full max-w-md" 
        />
        
        <button
          onClick={spinWheel}
          disabled={isSpinning}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                   w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-600 
                   hover:from-yellow-500 hover:to-orange-700 text-white font-bold text-lg 
                   shadow-lg transform transition-transform hover:scale-105 active:scale-95
                   disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSpinning ? 'Girando...' : 'Girar!'}
        </button>
        
        {/* Pointer */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 
                      border-l-[15px] border-l-transparent 
                      border-r-[15px] border-r-transparent 
                      border-t-[25px] border-t-yellow-500" />
      </div>

      {/* Controls */}
      {editable && (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="default" className="mb-4 flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Configurar Prêmios
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full max-w-lg">
            <SheetHeader className="mb-6">
              <SheetTitle>Configurar Prêmios</SheetTitle>
            </SheetHeader>
            <Card>
              <CardContent className="p-4 space-y-4">
                {prizes.map((prize, index) => {
                  const percentage = ((prize.weight / totalWeight) * 100).toFixed(1);
                  return (
                    <div key={prize.id} className="flex gap-3 items-center">
                      <input
                        type="color"
                        value={prize.color}
                        onChange={(e) => updatePrize(prize.id, { color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <div className="flex-1 space-y-2">
                        <Input
                          value={prize.label}
                          onChange={(e) => updatePrize(prize.id, { label: e.target.value })}
                          placeholder="Nome do prêmio"
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            value={prize.weight}
                            onChange={(e) => updatePrize(prize.id, { weight: Number(e.target.value) })}
                            className="text-xs flex-1"
                            placeholder="Peso"
                          />
                          <span className="text-xs text-gray-400 py-2">{percentage}%</span>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => removePrize(prize.id)}
                        disabled={prizes.length <= 2}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Button
              className="w-full mt-4 flex items-center justify-center gap-2"
              onClick={addPrize}
            >
              <Plus className="w-4 h-4" />
              Adicionar Prêmio
            </Button>
          </SheetContent>
        </Sheet>
      )}

      {/* Show current prizes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-4xl w-full">
        {prizes.map((prize) => (
          <div 
            key={prize.id}
            className="flex items-center gap-2 p-3 rounded-lg border border-gray-700"
            style={{ backgroundColor: prize.color + '20' }}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: prize.color }} />
            <span className="text-white text-sm">{prize.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
