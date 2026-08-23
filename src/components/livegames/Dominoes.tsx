
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RotateCcw, ArrowDown, SkipForward, Bot } from 'lucide-react';

/* ═══════════════════════ Types ═══════════════════════ */

interface Tile {
  left: number;
  right: number;
  id: string;
}

interface ChainTile {
  left: number;
  right: number;
  id: string;
}

type Phase = 'dealing' | 'playing' | 'roundOver';
type End = 'left' | 'right';

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

/* ═══════════════════════ Constants ═══════════════════════ */

const PLAYER_NAMES = ['Jogador 1', 'Jogador 2'] as const;
const HAND_SIZE = 7;

const DOT_POSITIONS: Record<number, { top: string; left: string }> = {
  0: { top: '18%', left: '18%' },
  1: { top: '18%', left: '50%' },
  2: { top: '18%', left: '82%' },
  3: { top: '50%', left: '18%' },
  4: { top: '50%', left: '50%' },
  5: { top: '50%', left: '82%' },
  6: { top: '82%', left: '18%' },
  7: { top: '82%', left: '50%' },
  8: { top: '82%', left: '82%' },
};

const DOT_PATTERNS: Record<number, number[]> = {
  0: [],
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/* ═══════════════════════ Helpers ═══════════════════════ */

function generateTiles(): Tile[] {
  const tiles: Tile[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({ left: i, right: j, id: `${i}-${j}` });
    }
  }
  return tiles;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tilePips(t: Tile | ChainTile): number {
  return t.left + t.right;
}

function handPips(hand: (Tile | ChainTile)[]): number {
  return hand.reduce((s, t) => s + tilePips(t), 0);
}

function canMatch(value: number, tile: Tile): boolean {
  return tile.left === value || tile.right === value;
}

function validEndsForTile(
  tile: Tile,
  leftEnd: number | null,
  rightEnd: number | null,
  chainLen: number
): End[] {
  if (chainLen === 0) return ['left'];
  if (leftEnd === null || rightEnd === null) return [];
  const ends: End[] = [];
  if (canMatch(leftEnd, tile)) ends.push('left');
  if (canMatch(rightEnd, tile)) ends.push('right');
  return [...new Set(ends)];
}

/* ═══════════════════════ Sub-Components ═══════════════════════ */

function DotHalf({ value }: { value: number }) {
  const dots = DOT_PATTERNS[value] ?? [];
  return (
    <div className="relative w-full h-full">
      {dots.map((pos, i) => {
        const p = DOT_POSITIONS[pos];
        return (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-800"
            style={{
              top: p.top,
              left: p.left,
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      })}
    </div>
  );
}

function DominoTile({
  tile,
  faceDown = false,
  selected = false,
  playable = false,
  highlightEnd = false,
  onClick,
}: {
  tile?: Tile | ChainTile;
  faceDown?: boolean;
  selected?: boolean;
  playable?: boolean;
  highlightEnd?: boolean;
  onClick?: () => void;
}) {
  if (faceDown) {
    return (
      <div className="w-16 h-8 sm:w-20 sm:h-10 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0">
        <div className="w-3/4 h-3/4 rounded-sm bg-slate-600/40 border border-slate-500/30">
          <div className="w-full h-full rounded-sm bg-gradient-to-br from-slate-500/20 to-slate-700/20" />
        </div>
      </div>
    );
  }

  if (!tile) return null;

  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.08, y: -3 } : undefined}
      whileTap={onClick ? { scale: 0.93 } : undefined}
      className={cn(
        'w-16 h-8 sm:w-20 sm:h-10 rounded-lg bg-white dark:bg-slate-100 border border-slate-300 dark:border-slate-500 flex overflow-hidden shadow-sm shrink-0',
        selected && 'ring-2 ring-cyan-400 shadow-cyan-400/30 shadow-lg z-10',
        playable && !selected && 'ring-2 ring-amber-400/80 shadow-amber-400/20 shadow-md',
        highlightEnd && 'ring-2 ring-amber-400 shadow-amber-400/30 shadow-lg',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="w-1/2 h-full relative border-r border-slate-300 dark:border-slate-400">
        <DotHalf value={tile.left} />
      </div>
      <div className="w-1/2 h-full relative">
        <DotHalf value={tile.right} />
      </div>
    </motion.div>
  );
}

/* ═══════════════════════ Main Component ═══════════════════════ */

export default function Dominoes({ onScore, liveCode: _liveCode }: Props) {
  /* ─── state ─── */
  const [phase, setPhase] = useState<Phase>('dealing');
  const [hands, setHands] = useState<Tile[][]>([[], []]);
  const [chain, setChain] = useState<ChainTile[]>([]);
  const [boneyard, setBoneyard] = useState<Tile[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<0 | 1>(0);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [vsBot, setVsBot] = useState(false);
  const [roundResult, setRoundResult] = useState('');
  const [message, setMessage] = useState('');
  const [consecutivePasses, setConsecutivePasses] = useState(0);
  const [roundNum, setRoundNum] = useState(1);

  const chainRef = useRef<HTMLDivElement>(null);
  const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─── derived ─── */
  const leftEnd = chain.length > 0 ? chain[0].left : null;
  const rightEnd = chain.length > 0 ? chain[chain.length - 1].right : null;
  const oppIdx = (1 - currentPlayer) as 0 | 1;

  const currentHand = hands[currentPlayer];

  const hasValidMove = useMemo(() => {
    if (chain.length === 0) return currentHand.length > 0;
    if (leftEnd === null || rightEnd === null) return false;
    return currentHand.some((t) => canMatch(leftEnd, t) || canMatch(rightEnd, t));
  }, [currentHand, chain.length, leftEnd, rightEnd]);

  const canDraw = boneyard.length > 0 && !hasValidMove;
  const canPass = boneyard.length === 0 && !hasValidMove && chain.length > 0;

  const selectedTile = selectedTileId
    ? currentHand.find((t) => t.id === selectedTileId) ?? null
    : null;

  const selectedValidEnds: End[] = useMemo(() => {
    if (!selectedTile) return [];
    return validEndsForTile(selectedTile, leftEnd, rightEnd, chain.length);
  }, [selectedTile, leftEnd, rightEnd, chain.length]);

  const bottomIdx = vsBot ? 0 : currentPlayer;
  const topIdx = (1 - bottomIdx) as 0 | 1;
  const isHumanTurn = phase === 'playing' && bottomIdx === currentPlayer;

  /* ─── callbacks ─── */

  const endRoundBlocked = useCallback(() => {
    const p1 = handPips(hands[0]);
    const p2 = handPips(hands[1]);
    if (p1 < p2) {
      setScores((s) => [s[0] + p2, s[1]]);
      setRoundResult(`Venceu! ${PLAYER_NAMES[0]} (${p1} vs ${p2})`);
      onScore?.(PLAYER_NAMES[0], p2);
      if (vsBot) confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#22d3ee', '#f472b6', '#fbbf24'] });
    } else if (p2 < p1) {
      setScores((s) => [s[0], s[1] + p1]);
      setRoundResult(`Venceu! ${PLAYER_NAMES[1]} (${p2} vs ${p1})`);
      onScore?.(PLAYER_NAMES[1], p1);
    } else {
      setRoundResult('Empate!');
    }
    setPhase('roundOver');
  }, [hands, onScore]);

  const startRound = useCallback(() => {
    const all = shuffle(generateTiles());
    setHands([all.slice(0, HAND_SIZE), all.slice(HAND_SIZE, HAND_SIZE * 2)]);
    setChain([]);
    setBoneyard(all.slice(HAND_SIZE * 2));
    setCurrentPlayer(0);
    setSelectedTileId(null);
    setRoundResult('');
    setMessage('');
    setConsecutivePasses(0);
    setPhase('dealing');
  }, []);

  const restartAll = useCallback(() => {
    setScores([0, 0]);
    setRoundNum(1);
    startRound();
  }, [startRound]);

  const nextRound = useCallback(() => {
    setRoundNum((n) => n + 1);
    startRound();
  }, [startRound]);

  const placeTile = useCallback(
    (tileId: string, end: End) => {
      const hand = [...hands[currentPlayer]];
      const idx = hand.findIndex((t) => t.id === tileId);
      if (idx === -1) return;

      const tile = hand.splice(idx, 1)[0];
      let ct: ChainTile;

      if (chain.length === 0) {
        ct = { left: tile.left, right: tile.right, id: `${tile.id}-c0` };
        setChain([ct]);
      } else if (end === 'left') {
        ct =
          tile.right === leftEnd
            ? { left: tile.left, right: tile.right, id: `${tile.id}-L` }
            : { left: tile.right, right: tile.left, id: `${tile.id}-L` };
        setChain((prev) => [ct, ...prev]);
      } else {
        ct =
          tile.left === rightEnd
            ? { left: tile.left, right: tile.right, id: `${tile.id}-R` }
            : { left: tile.right, right: tile.left, id: `${tile.id}-R` };
        setChain((prev) => [...prev, ct]);
      }

      setHands((prev) => {
        const h: Tile[][] = [prev[0].slice(), prev[1].slice()];
        h[currentPlayer] = hand;
        return h;
      });
      setSelectedTileId(null);
      setConsecutivePasses(0);

      if (hand.length === 0) {
        const oppPips = handPips(hands[oppIdx]);
        setScores((s) => {
          const n: [number, number] = [s[0], s[1]];
          n[currentPlayer] += oppPips;
          return n;
        });
        setRoundResult(`Venceu! ${PLAYER_NAMES[currentPlayer]}`);
        onScore?.(PLAYER_NAMES[currentPlayer], oppPips);
        if (vsBot && currentPlayer === 0) {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#22d3ee', '#f472b6', '#fbbf24'] });
        }
        setPhase('roundOver');
        return;
      }

      setCurrentPlayer(oppIdx);
    },
    [hands, currentPlayer, chain, leftEnd, rightEnd, oppIdx, onScore]
  );

  const handleTileClick = useCallback(
    (tileId: string) => {
      if (phase !== 'playing' || !isHumanTurn) return;
      if (selectedTileId === tileId) {
        setSelectedTileId(null);
        return;
      }

      const tile = currentHand.find((t) => t.id === tileId);
      if (!tile) return;

      const ends = validEndsForTile(tile, leftEnd, rightEnd, chain.length);
      if (ends.length === 0) return;

      setSelectedTileId(tileId);

      if (ends.length === 1) {
        placeTile(tileId, ends[0]);
      }
    },
    [phase, isHumanTurn, selectedTileId, currentHand, leftEnd, rightEnd, chain.length, placeTile]
  );

  const handleEndClick = useCallback(
    (end: End) => {
      if (!selectedTileId || phase !== 'playing' || !isHumanTurn) return;
      if (selectedValidEnds.includes(end)) {
        placeTile(selectedTileId, end);
      }
    },
    [selectedTileId, phase, isHumanTurn, selectedValidEnds, placeTile]
  );

  const drawFromBoneyard = useCallback(() => {
    if (boneyard.length === 0 || hasValidMove) return;
    const newBy = [...boneyard];
    const drawn = newBy.pop()!;
    setBoneyard(newBy);
    setHands((prev) => {
      const h: Tile[][] = [prev[0].slice(), prev[1].slice()];
      h[currentPlayer] = [...h[currentPlayer], drawn];
      return h;
    });
    setMessage('Comprou uma pe\u00e7a');
  }, [boneyard, hasValidMove, currentPlayer]);

  const passTurn = useCallback(() => {
    if (!canPass) return;
    const np = consecutivePasses + 1;
    if (np >= 2) {
      endRoundBlocked();
      return;
    }
    setConsecutivePasses(np);
    setSelectedTileId(null);
    setCurrentPlayer(oppIdx);
    setMessage(`${PLAYER_NAMES[currentPlayer]} passou`);
  }, [canPass, consecutivePasses, oppIdx, endRoundBlocked, currentPlayer]);

  const toggleMode = useCallback(() => {
    setVsBot((v) => !v);
    startRound();
  }, [startRound]);

  /* ─── effects ─── */

  useEffect(() => {
    startRound();
  }, [startRound]);

  useEffect(() => {
    if (phase === 'dealing') {
      const t = setTimeout(() => setPhase('playing'), 1200);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (vsBot && currentPlayer === 1) {
      setMessage(`${PLAYER_NAMES[1]} est\u00e1 pensando...`);
    } else if (chain.length === 0) {
      setMessage('Coloque a primeira pe\u00e7a');
    } else if (hasValidMove) {
      setMessage(`Sua vez \u2014 ${PLAYER_NAMES[currentPlayer]}`);
    } else if (canDraw) {
      setMessage('Sem pe\u00e7as v\u00e1lidas \u2014 compre do osso');
    } else {
      setMessage('Bloqueado!');
    }
  }, [phase, vsBot, currentPlayer, chain.length, hasValidMove, canDraw]);

  useEffect(() => {
    if (phase !== 'playing' || !vsBot || currentPlayer !== 1) return;

    botTimer.current = setTimeout(() => {
      const botHand = hands[1];
      if (botHand.length === 0) return;

      if (chain.length === 0) {
        const sorted = [...botHand].sort((a, b) => tilePips(b) - tilePips(a));
        placeTile(sorted[0].id, 'left');
        return;
      }

      const moves = botHand
        .map((t) => ({
          tile: t,
          ends: validEndsForTile(t, leftEnd, rightEnd, chain.length),
        }))
        .filter((m) => m.ends.length > 0)
        .sort((a, b) => tilePips(b.tile) - tilePips(a.tile));

      if (moves.length > 0) {
        placeTile(moves[0].tile.id, moves[0].ends[0]);
      } else if (boneyard.length > 0) {
        drawFromBoneyard();
      } else {
        const np = consecutivePasses + 1;
        if (np >= 2) {
          endRoundBlocked();
        } else {
          setConsecutivePasses(np);
          setCurrentPlayer(0);
          setMessage(`${PLAYER_NAMES[1]} passou`);
        }
      }
    }, 700 + Math.random() * 500);

    return () => {
      if (botTimer.current) clearTimeout(botTimer.current);
    };
  }, [
    phase, vsBot, currentPlayer, hands, chain, leftEnd, rightEnd,
    boneyard, placeTile, drawFromBoneyard, consecutivePasses, endRoundBlocked,
  ]);

  /* ─── render helpers ─── */

  const colorClass = (idx: 0 | 1) => (idx === 0 ? 'text-cyan-400' : 'text-pink-400');
  const dotColor = (idx: 0 | 1) => (idx === 0 ? 'bg-cyan-400' : 'bg-pink-400');

  const isPlayableInHand = (tile: Tile): boolean => {
    if (phase !== 'playing' || !isHumanTurn) return false;
    return validEndsForTile(tile, leftEnd, rightEnd, chain.length).length > 0;
  };

  /* ═══════════════════════ JSX ═══════════════════════ */

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col gap-3 p-2 sm:p-4 select-none">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-cyan-900/30 to-pink-900/30 border border-cyan-500/20 rounded-xl p-3 flex items-center justify-between"
        style={{ boxShadow: '0 0 20px rgba(34,211,238,0.15), 0 0 20px rgba(244,114,182,0.15)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400" />
          <span className="text-cyan-400 font-bold text-xs sm:text-sm">{PLAYER_NAMES[0]}</span>
          <motion.span
            key={scores[0]}
            initial={{ scale: 1.6, color: '#22d3ee' }}
            animate={{ scale: 1, color: '#ffffff' }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="text-white font-mono text-lg sm:text-xl font-bold inline-block"
          >
            {scores[0]}
          </motion.span>
        </div>

        <div className="text-center">
          <h2 className="text-white font-bold text-base sm:text-2xl tracking-widest">DOMIN\u00d3</h2>
          <span className="text-slate-500 text-[10px]">Rodada {roundNum}</span>
        </div>

        <div className="flex items-center gap-2">
          <motion.span
            key={scores[1]}
            initial={{ scale: 1.6, color: '#f472b6' }}
            animate={{ scale: 1, color: '#ffffff' }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="text-white font-mono text-lg sm:text-xl font-bold inline-block"
          >
            {scores[1]}
          </motion.span>
          <span className="text-pink-400 font-bold text-xs sm:text-sm">{PLAYER_NAMES[1]}</span>
          <div className="w-3 h-3 rounded-full bg-pink-400" />
        </div>
      </motion.div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={vsBot ? 'default' : 'outline'}
            onClick={toggleMode}
            className={cn('text-xs gap-1', vsBot ? 'bg-pink-600 hover:bg-pink-700 text-white' : '')}
          >
            <Bot className="w-3 h-3" />
            VS Bot
          </Button>
          <Badge variant="outline" className="text-[10px] sm:text-xs text-slate-400 gap-1">
            <ArrowDown className="w-3 h-3" />
            Pecas no osso: {boneyard.length}
          </Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={restartAll} className="text-xs text-slate-400 gap-1">
          <RotateCcw className="w-3 h-3" />
          Reiniciar Tudo
        </Button>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className={cn('text-xs font-semibold flex items-center gap-1.5', colorClass(topIdx as 0 | 1))}>
          <div className={cn('w-2 h-2 rounded-full', dotColor(topIdx as 0 | 1))} />
          {PLAYER_NAMES[topIdx]} — {hands[topIdx].length} peça{hands[topIdx].length !== 1 ? 's' : ''}
          {phase === 'playing' && currentPlayer === topIdx && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="text-amber-400 ml-1"
            >
              \u25c6 pensando...
            </motion.span>
          )}
        </span>
        <div className="flex gap-1 justify-center flex-wrap max-w-md">
          <AnimatePresence>
            {hands[topIdx].map((tile, i) => (
              <motion.div
                key={tile.id}
                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ delay: phase === 'dealing' ? i * 0.06 : 0, duration: 0.3 }}
              >
                <DominoTile faceDown />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3 sm:p-4 min-h-[120px] sm:min-h-[140px] flex flex-col gap-2">
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center text-xs sm:text-sm text-slate-300 h-5"
          >
            {phase === 'dealing' ? 'Distribuindo pe\u00e7as...' : message}
          </motion.p>
        </AnimatePresence>

        <div ref={chainRef} className="overflow-x-auto flex-1 flex items-center">
          <div className="flex items-center gap-0.5 mx-auto">
            <AnimatePresence>
              {chain.length > 0 && selectedValidEnds.includes('left') && (
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  onClick={() => handleEndClick('left')}
                  className="flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-amber-400/20 border-2 border-amber-400 cursor-pointer shrink-0 mr-1.5"
                >
                  <span className="text-amber-400 text-[10px] font-bold leading-none">\u25c0</span>
                  <span className="text-amber-400 text-base sm:text-lg font-bold leading-none mt-0.5">{leftEnd}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {chain.length === 0 && phase === 'playing' && (
              <div className="text-slate-500 text-xs sm:text-sm italic">Coloque a primeira pe\u00e7a</div>
            )}

            <AnimatePresence>
              {chain.map((ct) => (
                <motion.div
                  key={ct.id}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                >
                  <DominoTile tile={ct} />
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {chain.length > 0 && selectedValidEnds.includes('right') && (
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  onClick={() => handleEndClick('right')}
                  className="flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-amber-400/20 border-2 border-amber-400 cursor-pointer shrink-0 ml-1.5"
                >
                  <span className="text-amber-400 text-[10px] font-bold leading-none">\u25b6</span>
                  <span className="text-amber-400 text-base sm:text-lg font-bold leading-none mt-0.5">{rightEnd}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {chain.length > 0 && (
          <div className="flex justify-between text-[10px] sm:text-xs text-slate-500 px-1">
            <span>\u25c4 Esquerda: {leftEnd}</span>
            <span>Direita: {rightEnd} \u25ba</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <span className={cn('text-xs font-semibold flex items-center gap-1.5', colorClass(bottomIdx as 0 | 1))}>
          <div className={cn('w-2 h-2 rounded-full', dotColor(bottomIdx as 0 | 1))} />
          {PLAYER_NAMES[bottomIdx]} — {hands[bottomIdx].length} peça{hands[bottomIdx].length !== 1 ? 's' : ''}
          {phase === 'playing' && currentPlayer === bottomIdx && (
            <span className="text-amber-400 ml-1">\u25c6 Sua vez</span>
          )}
          {phase === 'playing' && currentPlayer !== bottomIdx && (
            <span className="text-slate-500 ml-1">Aguardando...</span>
          )}
        </span>

        <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1 px-1">
          <AnimatePresence>
            {hands[bottomIdx].map((tile, i) => {
              const playable = isPlayableInHand(tile);
              return (
                <motion.div
                  key={tile.id}
                  initial={{ opacity: 0, y: 25, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7, y: 10 }}
                  transition={{
                    delay: phase === 'dealing' ? i * 0.06 : 0,
                    type: 'spring',
                    stiffness: 350,
                    damping: 25,
                  }}
                  layout
                >
                  <DominoTile
                    tile={tile}
                    selected={selectedTileId === tile.id}
                    playable={playable}
                    onClick={() => handleTileClick(tile.id)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {phase === 'playing' && isHumanTurn && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center justify-center gap-2"
          >
            <motion.div animate={canDraw ? { scale: [1, 1.04, 1] } : {}} transition={{ repeat: Infinity, duration: 1.5 }}>
              <Button
                size="sm"
                variant="outline"
                onClick={drawFromBoneyard}
                disabled={!canDraw}
                className={cn('text-xs gap-1', canDraw && 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10')}
              >
                <ArrowDown className="w-3 h-3" />
                Comprar
              </Button>
            </motion.div>

            <Button
              size="sm"
              variant="outline"
              onClick={passTurn}
              disabled={!canPass}
              className={cn('text-xs gap-1', canPass && 'border-red-500/50 text-red-400 hover:bg-red-500/10')}
            >
              <SkipForward className="w-3 h-3" />
              Passar
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'playing' && !hasValidMove && boneyard.length === 0 && isHumanTurn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-red-400 text-sm font-bold"
          >
            Bloqueado!
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'roundOver' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center max-w-sm mx-4 shadow-2xl"
            >
              {roundResult && !roundResult.includes('Empate') && (
                <div className="relative h-14 mb-3 overflow-hidden">
                  {['\ud83c\udf89', '\ud83c\udfc6', '\u2728', '\ud83c\udf8a', '\u2b50'].map((emoji, i) => (
                    <motion.span
                      key={i}
                      initial={{ y: 40, opacity: 0, scale: 0, x: (i - 2) * 16 }}
                      animate={{
                        y: [40, -5, 0],
                        opacity: [0, 1, 1],
                        scale: [0, 1.3, 1],
                        rotate: [0, (i % 2 === 0 ? 15 : -15), 0],
                      }}
                      transition={{ delay: i * 0.12, duration: 0.8, ease: 'easeOut' }}
                      className="absolute text-2xl"
                      style={{ left: `${(i + 0.5) * 20}%`, transform: 'translateX(-50%)' }}
                    >
                      {emoji}
                    </motion.span>
                  ))}
                </div>
              )}

              <h3
                className={cn(
                  'text-xl sm:text-2xl font-bold mb-3',
                  roundResult.includes(PLAYER_NAMES[0])
                    ? 'text-cyan-400'
                    : roundResult.includes(PLAYER_NAMES[1])
                      ? 'text-pink-400'
                      : 'text-amber-400'
                )}
              >
                {roundResult}
              </h3>

              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-6 mb-5 text-xs sm:text-sm">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-cyan-400 font-semibold">{PLAYER_NAMES[0]}</span>
                  <span className="text-slate-400">({handPips(hands[0])} pts)</span>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-pink-400" />
                  <span className="text-pink-400 font-semibold">{PLAYER_NAMES[1]}</span>
                  <span className="text-slate-400">({handPips(hands[1])} pts)</span>
                </div>
              </div>

              <div className="flex gap-2 justify-center flex-wrap">
                <motion.div whileHover={{ scale: 1.03 }}>
                  <Button size="sm" onClick={nextRound} className="text-xs gap-1" style={{ boxShadow: '0 0 16px rgba(34,211,238,0.35)' }}>
                    Pr\u00f3xima Rodada
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }}>
                  <Button size="sm" variant="outline" onClick={restartAll} className="text-xs gap-1">
                    <RotateCcw className="w-3 h-3" />
                    Reiniciar Tudo
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
