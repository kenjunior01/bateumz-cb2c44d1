'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Coins,
  PauseCircle,
  ShieldAlert,
  Activity,
  ChevronDown,
  ChevronUp,
  Timer,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Lock,
  CalendarX,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ============================================================
// TIPOS
// ============================================================

type TimeLimit = 30 | 60 | 120 | 240 | null;
type CoinLimit = 100 | 500 | 1000 | 5000 | null;
type BreakDuration = '24h' | '48h' | '7d' | '30d';

interface ActivitySummary {
  timeSpentToday: number; // minutes
  coinsUsedThisWeek: number;
}

// ============================================================
// DADOS MOCK
// ============================================================

const TIME_LIMIT_OPTIONS: { value: TimeLimit; label: string }[] = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
  { value: 240, label: '4 horas' },
  { value: null, label: 'Sem limite' },
];

const COIN_LIMIT_OPTIONS: { value: CoinLimit; label: string }[] = [
  { value: 100, label: '100' },
  { value: 500, label: '500' },
  { value: 1000, label: '1.000' },
  { value: 5000, label: '5.000' },
  { value: null, label: 'Sem limite' },
];

const BREAK_OPTIONS: { value: BreakDuration; label: string; description: string }[] = [
  { value: '24h', label: '24 horas', description: 'Pausa curta para descansar' },
  { value: '48h', label: '48 horas', description: 'Pausa de dois dias' },
  { value: '7d', label: '7 dias', description: 'Pausa de uma semana' },
  { value: '30d', label: '30 dias', description: 'Pausa de um mês' },
];

const MOCK_ACTIVITY: ActivitySummary = {
  timeSpentToday: 47,
  coinsUsedThisWeek: 820,
};

// ============================================================
// HELPERS
// ============================================================

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const hours = Math.floor(min / 60);
  const remaining = min % 60;
  return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`;
}

function getLimitIndex<T>(value: T | null, options: { value: T | null }[]): number {
  const idx = options.findIndex(o => o.value === value);
  return idx >= 0 ? idx : options.length - 1;
}

function getSliderPosition(index: number, total: number): number {
  if (total <= 1) return 0;
  return (index / (total - 1)) * 100;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ResponsibleGaming() {
  // Estado local
  const [timeLimit, setTimeLimit] = useState<TimeLimit>(60);
  const [coinLimit, setCoinLimit] = useState<CoinLimit>(1000);
  const [breakDialogOpen, setBreakDialogOpen] = useState(false);
  const [exclusionDialogOpen, setExclusionDialogOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['time-limit', 'coin-limit', 'activity'])
  );
  const [confirmingBreak, setConfirmingBreak] = useState<BreakDuration | null>(null);
  const [breakApplied, setBreakApplied] = useState(false);
  const [exclusionApplied, setExclusionApplied] = useState(false);

  // Helpers para sliders
  const timeIndex = getLimitIndex(timeLimit, TIME_LIMIT_OPTIONS);
  const coinIndex = getLimitIndex(coinLimit, COIN_LIMIT_OPTIONS);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleBreakConfirm = (duration: BreakDuration) => {
    setConfirmingBreak(duration);
  };

  const handleBreakApply = () => {
    if (!confirmingBreak) return;
    setBreakApplied(true);
    setBreakDialogOpen(false);
    setConfirmingBreak(null);
    // Em produção: chamar API para aplicar a pausa
  };

  const handleExclusionApply = () => {
    setExclusionApplied(true);
    setExclusionDialogOpen(false);
    // Em produção: chamar API para auto-exclusão
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full space-y-4"
    >
      {/* ---- Limite de Tempo Diário ---- */}
      <Card
        className="border-sky-500/15"
        style={{ background: 'rgba(14, 165, 233, 0.04)' }}
      >
        <button
          onClick={() => toggleSection('time-limit')}
          className="w-full text-left"
        >
          <CardHeader className="pb-2 cursor-pointer">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-white">
              <span className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-sky-400" />
                Limite de Tempo Diário
              </span>
              {expandedSections.has('time-limit') ? (
                <ChevronUp className="h-4 w-4 text-white/30" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/30" />
              )}
            </CardTitle>
          </CardHeader>
        </button>

        <AnimatePresence>
          {expandedSections.has('time-limit') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 pb-4 space-y-4">
                <p className="text-xs text-white/40">
                  Define um limite de tempo diário para jogar. Quando atingires o limite, serás notificado.
                </p>

                <div className="space-y-2">
                  <Slider
                    value={[getSliderPosition(timeIndex, TIME_LIMIT_OPTIONS.length)]}
                    onValueChange={([val]) => {
                      const index = Math.round((val / 100) * (TIME_LIMIT_OPTIONS.length - 1));
                      setTimeLimit(TIME_LIMIT_OPTIONS[Math.min(index, TIME_LIMIT_OPTIONS.length - 1)].value);
                    }}
                    max={100}
                    step={25}
                    className="w-full [&_[role=slider]]:bg-sky-400 [&_[role=slider]]:border-sky-300 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=track]]:bg-sky-500/20"
                  />
                  <div className="flex justify-between text-[10px] text-white/25 font-medium">
                    {TIME_LIMIT_OPTIONS.map((opt) => (
                      <span
                        key={opt.label}
                        className={
                          timeLimit === opt.value
                            ? 'text-sky-400 font-bold'
                            : ''
                        }
                      >
                        {opt.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-sky-400/50" />
                  <span className="text-xs text-white/50">
                    Limite actual:{' '}
                    <span className="text-sky-400 font-semibold">
                      {timeLimit ? formatMinutes(timeLimit) : 'Sem limite'}
                    </span>
                  </span>
                </div>

                {MOCK_ACTIVITY.timeSpentToday > 0 && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <Activity className="h-3 w-3 text-sky-400/40" />
                    <span className="text-white/30">
                      Hoje já usaste{' '}
                      <span className="text-white/50 font-medium">
                        {formatMinutes(MOCK_ACTIVITY.timeSpentToday)}
                      </span>
                    </span>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ---- Limite de Moedas Semanal ---- */}
      <Card
        className="border-sky-500/15"
        style={{ background: 'rgba(14, 165, 233, 0.04)' }}
      >
        <button
          onClick={() => toggleSection('coin-limit')}
          className="w-full text-left"
        >
          <CardHeader className="pb-2 cursor-pointer">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-white">
              <span className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-sky-400" />
                Limite de Moedas Semanal
              </span>
              {expandedSections.has('coin-limit') ? (
                <ChevronUp className="h-4 w-4 text-white/30" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/30" />
              )}
            </CardTitle>
          </CardHeader>
        </button>

        <AnimatePresence>
          {expandedSections.has('coin-limit') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 pb-4 space-y-4">
                <p className="text-xs text-white/40">
                  Define um limite semanal para as moedas virtuais que podes usar em previsões.
                </p>

                <div className="space-y-2">
                  <Slider
                    value={[getSliderPosition(coinIndex, COIN_LIMIT_OPTIONS.length)]}
                    onValueChange={([val]) => {
                      const index = Math.round((val / 100) * (COIN_LIMIT_OPTIONS.length - 1));
                      setCoinLimit(COIN_LIMIT_OPTIONS[Math.min(index, COIN_LIMIT_OPTIONS.length - 1)].value);
                    }}
                    max={100}
                    step={25}
                    className="w-full [&_[role=slider]]:bg-sky-400 [&_[role=slider]]:border-sky-300 [&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=track]]:bg-sky-500/20"
                  />
                  <div className="flex justify-between text-[10px] text-white/25 font-medium">
                    {COIN_LIMIT_OPTIONS.map((opt) => (
                      <span
                        key={opt.label}
                        className={
                          coinLimit === opt.value
                            ? 'text-sky-400 font-bold'
                            : ''
                        }
                      >
                        {opt.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingDown className="h-3.5 w-3.5 text-sky-400/50" />
                  <span className="text-xs text-white/50">
                    Limite actual:{' '}
                    <span className="text-sky-400 font-semibold">
                      {coinLimit ? `${coinLimit.toLocaleString('pt-BR')} moedas` : 'Sem limite'}
                    </span>
                  </span>
                </div>

                {MOCK_ACTIVITY.coinsUsedThisWeek > 0 && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <Activity className="h-3 w-3 text-sky-400/40" />
                    <span className="text-white/30">
                      Esta semana usaste{' '}
                      <span className="text-white/50 font-medium">
                        {MOCK_ACTIVITY.coinsUsedThisWeek.toLocaleString('pt-BR')}
                      </span>{' '}
                      moedas
                    </span>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ---- Fazer Pausa ---- */}
      <Card
        className="border-amber-500/15"
        style={{ background: 'rgba(245, 158, 11, 0.04)' }}
      >
        <button
          onClick={() => toggleSection('break')}
          className="w-full text-left"
        >
          <CardHeader className="pb-2 cursor-pointer">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-white">
              <span className="flex items-center gap-2">
                <PauseCircle className="h-4 w-4 text-amber-400" />
                Fazer Pausa
              </span>
              {expandedSections.has('break') ? (
                <ChevronUp className="h-4 w-4 text-white/30" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/30" />
              )}
            </CardTitle>
          </CardHeader>
        </button>

        <AnimatePresence>
          {expandedSections.has('break') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 pb-4 space-y-4">
                <p className="text-xs text-white/40">
                  Precisas de um descanso? Activa uma pausa temporária. Durante a pausa, não poderás aceder às previsões.
                </p>

                {breakApplied ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
                  >
                    <CheckCircle className="h-5 w-5 text-amber-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-300">
                        Pausa activada com sucesso
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        A tua pausa está activa. Podes voltar quando quiseres.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {BREAK_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant="outline"
                        onClick={() => {
                          setBreakDialogOpen(true);
                          setConfirmingBreak(option.value);
                        }}
                        className="border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500/30 rounded-lg text-xs h-auto py-3 flex-col gap-1"
                      >
                        <PauseCircle className="h-4 w-4" />
                        <span className="font-semibold">{option.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ---- Auto-Exclusão ---- */}
      <Card
        className="border-red-500/15"
        style={{ background: 'rgba(239, 68, 68, 0.04)' }}
      >
        <button
          onClick={() => toggleSection('exclusion')}
          className="w-full text-left"
        >
          <CardHeader className="pb-2 cursor-pointer">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-white">
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-400" />
                Auto-Exclusão
              </span>
              {expandedSections.has('exclusion') ? (
                <ChevronUp className="h-4 w-4 text-white/30" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/30" />
              )}
            </CardTitle>
          </CardHeader>
        </button>

        <AnimatePresence>
          {expandedSections.has('exclusion') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 pb-4 space-y-4">
                <p className="text-xs text-white/40">
                  Se sentes que precisas de uma pausa mais longa, podes auto-excluir-te. A tua conta será desactivada temporariamente.
                </p>

                {exclusionApplied ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
                  >
                    <Lock className="h-5 w-5 text-red-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-300">
                        Auto-exclusão activada
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">
                        A tua conta foi desactivada. Contacta o suporte para reactivar.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setExclusionDialogOpen(true)}
                    className="w-full border-red-500/25 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/35 rounded-lg text-xs h-auto py-3 gap-2"
                  >
                    <CalendarX className="h-4 w-4" />
                    <span>Activar Auto-Exclusão</span>
                  </Button>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ---- Resumo de Actividade ---- */}
      <Card
        className="border-sky-500/15"
        style={{ background: 'rgba(14, 165, 233, 0.04)' }}
      >
        <button
          onClick={() => toggleSection('activity')}
          className="w-full text-left"
        >
          <CardHeader className="pb-2 cursor-pointer">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-white">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-sky-400" />
                Resumo de Actividade
              </span>
              {expandedSections.has('activity') ? (
                <ChevronUp className="h-4 w-4 text-white/30" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/30" />
              )}
            </CardTitle>
          </CardHeader>
        </button>

        <AnimatePresence>
          {expandedSections.has('activity') && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(14, 165, 233, 0.06)' }}>
                    <Clock className="h-5 w-5 text-sky-400/50 mx-auto mb-2" />
                    <p className="text-lg font-bold text-white">
                      {formatMinutes(MOCK_ACTIVITY.timeSpentToday)}
                    </p>
                    <p className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">
                      Tempo hoje
                    </p>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(14, 165, 233, 0.06)' }}>
                    <Coins className="h-5 w-5 text-sky-400/50 mx-auto mb-2" />
                    <p className="text-lg font-bold text-white">
                      {MOCK_ACTIVITY.coinsUsedThisWeek.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[10px] text-white/35 uppercase tracking-wider mt-0.5">
                      Moedas esta semana
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'rgba(14, 165, 233, 0.05)' }}>
                  <Badge
                    variant="outline"
                    className="border-sky-500/20 text-sky-400 text-[10px] bg-sky-500/10"
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    Resumo local
                  </Badge>
                  <span className="text-[10px] text-white/30">
                    Dados calculados neste dispositivo
                  </span>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ---- Dialog de Confirmação de Pausa ---- */}
      <Dialog open={breakDialogOpen} onOpenChange={setBreakDialogOpen}>
        <DialogContent className="bg-emerald-950/95 backdrop-blur-xl border-amber-500/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-amber-300">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Pausa
            </DialogTitle>
            <DialogDescription className="text-white/50 text-sm">
              Tens a certeza que queres fazer uma pausa?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {confirmingBreak && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <PauseCircle className="h-8 w-8 text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold text-amber-300">
                      Pausa de {BREAK_OPTIONS.find(b => b.value === confirmingBreak)?.label}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {BREAK_OPTIONS.find(b => b.value === confirmingBreak)?.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setBreakDialogOpen(false);
                  setConfirmingBreak(null);
                }}
                className="flex-1 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleBreakApply}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/25"
              >
                <PauseCircle className="h-4 w-4 mr-2" />
                Confirmar Pausa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Dialog de Confirmação de Auto-Exclusão ---- */}
      <Dialog open={exclusionDialogOpen} onOpenChange={setExclusionDialogOpen}>
        <DialogContent className="bg-emerald-950/95 backdrop-blur-xl border-red-500/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-red-300">
              <ShieldAlert className="h-5 w-5" />
              Auto-Exclusão
            </DialogTitle>
            <DialogDescription className="text-white/50 text-sm">
              Esta acção é irreversível e requer contacto com o suporte para reactivar a conta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-300">
                    Atenção: Acção Permanente
                  </p>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">
                    Ao activares a auto-exclusão, a tua conta será desactivada imediatamente. Não poderás
                    fazer previsões, ver mercados ou aceder a funcionalidades de competição até que
                    contactes o suporte para reactivar.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={() => setExclusionDialogOpen(false)}
                className="flex-1 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExclusionApply}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/25"
              >
                <Lock className="h-4 w-4 mr-2" />
                Auto-Excluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
