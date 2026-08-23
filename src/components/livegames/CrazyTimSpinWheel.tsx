import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings2, Plus, Trash2, Trophy, Sparkles, 
  PartyPopper, Star, Zap, Gift, Image as ImageIcon,
  Palette, Type, Layout, Save, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ImageUpload } from '@/components/ImageUpload';
import { useLanguage } from '@/contexts/LanguageContext';
import { playWinSound, playTickSound } from '@/lib/sounds';
import confetti from 'canvas-confetti';

interface Prize {
  id: string;
  label: string;
  color: string;
  weight: number;
  reward_type?: string;
  reward_value?: string;
}

interface WheelCustomization {
  backgroundColor: string;
  title: string;
  titleColor: string;
  companyLogoUrl: string;
  backgroundImageUrl: string;
  pointerColor: string;
  centerButtonColor: string;
  centerButtonTextColor: string;
  spinDuration: number;
}

interface CrazyTimSpinWheelProps {
  initialPrizes?: Prize[];
  initialCustomization?: Partial<WheelCustomization>;
  onWin?: (prize: Prize) => void;
  editable?: boolean;
  onSave?: (prizes: Prize[], customization: WheelCustomization) => void;
}

const DEFAULT_PRIZES: Prize[] = [
  { id: '1', label: '100 MZN', color: '#FFD700', weight: 10 },
  { id: '2', label: 'Tente de Novo', color: '#333333', weight: 30 },
  { id: '3', label: '500 MZN', color: '#C0C0C0', weight: 5 },
  { id: '4', label: 'Bónus 2x', color: '#CD7F32', weight: 15 },
  { id: '5', label: 'Grátis', color: '#1a1a1a', weight: 20 },
  { id: '6', label: 'Jackpot', color: '#E52E2E', weight: 2 },
];

const DEFAULT_CUSTOMIZATION: WheelCustomization = {
  backgroundColor: '#0a0a0f',
  title: 'RODA DA SORTE PREMIUM',
  titleColor: '#ffffff',
  companyLogoUrl: '',
  backgroundImageUrl: '',
  pointerColor: '#FFD700',
  centerButtonColor: '#FFD700',
  centerButtonTextColor: '#000000',
  spinDuration: 5,
};

const CrazyTimSpinWheel: React.FC<CrazyTimSpinWheelProps> = ({
  initialPrizes = DEFAULT_PRIZES,
  initialCustomization = {},
  onWin,
  editable = true,
  onSave
}) => {
  const { t } = useLanguage();
  const [prizes, setPrizes] = useState<Prize[]>(initialPrizes);
  const [custom, setCustom] = useState<WheelCustomization>({
    ...DEFAULT_CUSTOMIZATION,
    ...initialCustomization
  });
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<Prize | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);

  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let startAngle = 0;
    prizes.forEach((prize) => {
      const sliceAngle = (prize.weight / totalWeight) * 2 * Math.PI;
      
      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.fillText(prize.label, radius - 30, 5);
      ctx.restore();

      startAngle += sliceAngle;
    });

    // Outer ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = custom.pointerColor;
    ctx.lineWidth = 8;
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
    ctx.fillStyle = custom.centerButtonColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 4;
    ctx.stroke();

  }, [prizes, totalWeight, custom]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const spinWheel = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setWinner(null);
    
    const extraSpins = 5 + Math.random() * 5;
    const newRotation = rotation + extraSpins * 360;
    setRotation(newRotation);

    playTickSound();

    setTimeout(() => {
      setIsSpinning(false);
      
      // Calculate winner
      const actualRotation = newRotation % 360;
      const pointerAngle = (360 - actualRotation + 270) % 360;
      let currentAngle = 0;
      let foundWinner = prizes[0];

      for (const prize of prizes) {
        const sliceAngle = (prize.weight / totalWeight) * 360;
        if (pointerAngle >= currentAngle && pointerAngle < currentAngle + sliceAngle) {
          foundWinner = prize;
          break;
        }
        currentAngle += sliceAngle;
      }

      setWinner(foundWinner);
      playWinSound();
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: [custom.centerButtonColor, '#ffffff', '#ffd700']
      });

      if (onWin) onWin(foundWinner);
    }, custom.spinDuration * 1000);
  };

  const updatePrize = (id: string, updates: Partial<Prize>) => {
    setPrizes(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const addPrize = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setPrizes([...prizes, { id: newId, label: 'Novo Prémio', color: '#555555', weight: 10 }]);
  };

  const removePrize = (id: string) => {
    if (prizes.length > 2) {
      setPrizes(prizes.filter(p => p.id !== id));
    }
  };

  const handleSave = () => {
    if (onSave) onSave(prizes, custom);
  };

  return (
    <div 
      className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden"
      style={{ 
        backgroundColor: custom.backgroundColor,
        backgroundImage: custom.backgroundImageUrl ? `url(${custom.backgroundImageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      <div className="relative z-10 text-center mb-12">
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl md:text-7xl font-black mb-4 tracking-tighter italic"
          style={{ color: custom.titleColor, textShadow: '0 0 20px rgba(0,0,0,0.5)' }}
        >
          {custom.title}
        </motion.h1>
        
        {custom.companyLogoUrl && (
          <motion.img 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            src={custom.companyLogoUrl} 
            alt="Logo" 
            className="h-20 mx-auto rounded-full border-4 border-white/20 shadow-2xl mb-4" 
          />
        )}
      </div>

      <div className="relative z-10 mb-12">
        <div 
          className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 w-0 h-0 
                    border-l-[20px] border-l-transparent 
                    border-r-[20px] border-r-transparent 
                    border-t-[35px] drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"
          style={{ borderTopColor: custom.pointerColor }}
        />

        <motion.div
          animate={{ rotate: rotation }}
          transition={{
            duration: custom.spinDuration,
            ease: [0.15, 0, 0.15, 1],
          }}
          className="relative"
        >
          <canvas 
            ref={canvasRef} 
            width="600" 
            height="600" 
            className="w-full max-w-lg drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]" 
          />
          
          <motion.button
            onClick={spinWheel}
            disabled={isSpinning}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                     w-28 h-28 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)]
                     flex items-center justify-center z-20 transition-transform 
                     disabled:opacity-80 group"
            style={{ 
              backgroundColor: custom.centerButtonColor,
              color: custom.centerButtonTextColor,
              transform: 'translate(-50%, -50%) rotate(' + (-rotation) + 'deg)'
            }}
          >
            <div className="text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-1 animate-pulse" />
              <span className="font-black text-lg tracking-tighter uppercase">
                {isSpinning ? '...' : 'GIRAR'}
              </span>
            </div>
          </button>
        </motion.div>
      </div>

      <AnimatePresence>
        {winner && !isSpinning && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <Card className="w-full max-w-md bg-gradient-to-br from-gray-900 to-black border-white/10 overflow-hidden rounded-[2rem]">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-yellow-400 rounded-full mx-auto flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(250,204,21,0.5)]">
                  <Trophy className="w-12 h-12 text-black" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">PARABÉNS!</h2>
                <p className="text-gray-400 mb-6">Você ganhou:</p>
                <div 
                  className="text-5xl font-black mb-8 p-6 rounded-2xl border-2 border-white/10"
                  style={{ color: winner.color }}
                >
                  {winner.label}
                </div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button 
                    size="lg" 
                    className="w-full rounded-full h-14 font-bold text-lg"
                    onClick={() => setWinner(null)}
                    style={{ boxShadow: '0 0 25px rgba(250,204,21,0.3)' }}
                  >
                    FECHAR
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {editable && (
        <div className="fixed bottom-8 right-8 z-40">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="lg" className="rounded-full h-16 w-16 shadow-2xl hover:scale-110 transition-transform">
                <Settings2 className="w-8 h-8" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto bg-background/95 backdrop-blur-xl">
              <SheetHeader className="mb-8">
                <SheetTitle className="text-2xl font-black italic">ESTÚDIO DE PERSONALIZAÇÃO</SheetTitle>
              </SheetHeader>

              <Tabs defaultValue="prizes" className="space-y-6">
                <TabsList className="grid grid-cols-3 rounded-full bg-secondary">
                  <TabsTrigger value="prizes" className="rounded-full"><Gift className="w-4 h-4 mr-2"/> Prêmios</TabsTrigger>
                  <TabsTrigger value="visual" className="rounded-full"><Palette className="w-4 h-4 mr-2"/> Visual</TabsTrigger>
                  <TabsTrigger value="layout" className="rounded-full"><Layout className="w-4 h-4 mr-2"/> Layout</TabsTrigger>
                </TabsList>

                <TabsContent value="prizes" className="space-y-4">
                  <div className="grid gap-4">
                    {prizes.map((prize) => (
                      <Card key={prize.id} className="border-white/5 bg-white/5">
                        <CardContent className="p-4 flex gap-4 items-center">
                          <input
                            type="color"
                            value={prize.color}
                            onChange={(e) => updatePrize(prize.id, { color: e.target.value })}
                            className="w-12 h-12 rounded-lg cursor-pointer border-none"
                          />
                          <div className="flex-1 space-y-2">
                            <Input
                              value={prize.label}
                              onChange={(e) => updatePrize(prize.id, { label: e.target.value })}
                              placeholder="Nome do prêmio"
                              className="font-bold"
                            />
                            <div className="flex items-center gap-2">
                              <Label className="text-[10px] uppercase opacity-50">Peso:</Label>
                              <Slider
                                value={[prize.weight]}
                                max={100}
                                step={1}
                                onValueChange={([val]) => updatePrize(prize.id, { weight: val })}
                                className="flex-1"
                              />
                              <span className="text-xs font-mono w-8">{prize.weight}</span>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => removePrize(prize.id)}
                            disabled={prizes.length <= 2}
                            className="rounded-full"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                    <Button onClick={addPrize} variant="outline" className="w-full border-dashed rounded-xl h-12">
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Novo Segmento
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="visual" className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Título da Roda</Label>
                      <Input 
                        value={custom.title} 
                        onChange={(e) => setCustom({...custom, title: e.target.value})} 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Cor do Fundo</Label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={custom.backgroundColor} 
                            onChange={(e) => setCustom({...custom, backgroundColor: e.target.value})}
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                          <Input value={custom.backgroundColor} onChange={(e) => setCustom({...custom, backgroundColor: e.target.value})} />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Cor do Título</Label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={custom.titleColor} 
                            onChange={(e) => setCustom({...custom, titleColor: e.target.value})}
                            className="w-10 h-10 rounded cursor-pointer"
                          />
                          <Input value={custom.titleColor} onChange={(e) => setCustom({...custom, titleColor: e.target.value})} />
                        </div>
                      </div>
                    </div>
                    
                    <ImageUpload 
                      label="Logo da Empresa"
                      value={custom.companyLogoUrl}
                      onChange={(url) => setCustom({...custom, companyLogoUrl: url})}
                      bucketName="game-images"
                    />

                    <ImageUpload 
                      label="Imagem de Fundo"
                      value={custom.backgroundImageUrl}
                      onChange={(url) => setCustom({...custom, backgroundImageUrl: url})}
                      bucketName="game-images"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="layout" className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>Duração do Giro (segundos): {custom.spinDuration}s</Label>
                      <Slider
                        value={[custom.spinDuration]}
                        min={2}
                        max={15}
                        step={1}
                        onValueChange={([val]) => setCustom({...custom, spinDuration: val})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Cor do Ponteiro</Label>
                        <input 
                          type="color" 
                          value={custom.pointerColor} 
                          onChange={(e) => setCustom({...custom, pointerColor: e.target.value})}
                          className="w-full h-10 rounded cursor-pointer"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Botão Central</Label>
                        <input 
                          type="color" 
                          value={custom.centerButtonColor} 
                          onChange={(e) => setCustom({...custom, centerButtonColor: e.target.value})}
                          className="w-full h-10 rounded cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-12 pt-6 border-t border-white/10">
                <motion.div whileHover={{ scale: 1.03 }}>
                  <Button onClick={handleSave} className="w-full h-14 rounded-full font-black text-lg gap-2" style={{ boxShadow: '0 0 20px rgba(250,204,21,0.2)' }}>
                    <Save className="w-5 h-5" /> SALVAR CONFIGURAÇÕES
                  </Button>
                </motion.div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
};

export default CrazyTimSpinWheel;
