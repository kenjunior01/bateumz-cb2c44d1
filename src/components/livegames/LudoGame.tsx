import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Trophy, Star, Crown, Zap, Shield, Target, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

const PC = ["#EF4444", "#22C55E", "#3B82F6", "#F59E0B"];
const PL = ["#FCA5A5", "#86EFAC", "#93C5FD", "#FCD34D"];
const PG = ["0 0 12px rgba(239,68,68,0.6)", "0 0 12px rgba(34,197,94,0.6)", "0 0 12px rgba(59,130,246,0.6)", "0 0 12px rgba(245,158,11,0.6)"];
const PG_STRONG = ["0 0 18px rgba(239,68,68,0.8), 0 0 40px rgba(239,68,68,0.3)", "0 0 18px rgba(34,197,94,0.8), 0 0 40px rgba(34,197,94,0.3)", "0 0 18px rgba(59,130,246,0.8), 0 0 40px rgba(59,130,246,0.3)", "0 0 18px rgba(245,158,11,0.8), 0 0 40px rgba(245,158,11,0.3)"];
const PN = ["Vermelho", "Verde", "Azul", "Amarelo"];
const CELL = 24;

const MT: [number,number][] = [
  [6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],
  [9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],
  [13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14],
  [6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6],
  [1,6],[2,6],[3,6],[4,6],[5,6],
];

const HS: [number,number][][] = [
  [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
];

const SO = [0, 13, 26, 39];
const HE = [51, 12, 25, 38];
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const BP: [number,number][][] = [
  [[2,2],[2,3],[3,2],[3,3]],
  [[2,11],[2,12],[3,11],[3,12]],
  [[11,11],[11,12],[12,11],[12,12]],
  [[11,2],[11,3],[12,2],[12,3]],
];

type Pos = number;
const PLAYERS = [0, 1, 2, 3];
const springCfg = { type: "spring" as const, stiffness: 350, damping: 25 };

function trackIdx(player: number, steps: number): number { return (SO[player] + steps) % 52; }

function cellCoord(player: number, pos: Pos): [number, number] | null {
  if (pos >= 0 && pos <= 51) return MT[trackIdx(player, pos)];
  if (pos >= 52 && pos <= 57) return HS[player][pos - 52];
  return null;
}

const LudoGame = ({ onScore, liveCode }: Props) => {
  const [pieces, setPieces] = useState<Pos[][]>(() => Array.from({ length: 4 }, () => [-1,-1,-1,-1] as Pos[]));
  const [cur, setCur] = useState(0);
  const [dice, setDice] = useState(1);
  const [rolled, setRolled] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [sixCnt, setSixCnt] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [mode, setMode] = useState<"2p" | "4p">("2p");
  const [sparks, setSparks] = useState<{id:number;x:number;y:number;c:string;vx:number;vy:number}[]>([]);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
  const [confetti, setConfetti] = useState<{id:number;x:number;y:number;c:string;r:number;d:number}[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  const ap = mode === "2p" ? [0, 2] : [0, 1, 2, 3];
  const apI = ap.indexOf(cur);

  const canMove = useCallback((p: number, i: number, d: number): Pos | null => {
    const pos = pieces[p][i];
    if (pos === 58) return null;
    if (pos === -1) return d === 6 ? 0 : null;
    const np = pos + d;
    if (pos >= 52) return np <= 58 ? np : null;
    if (pos <= HE[p] && pos + d > HE[p]) {
      const hp = 52 + (pos + d - HE[p] - 1);
      return hp <= 58 ? hp : null;
    }
    if (np > 51) return null;
    return np;
  }, [pieces]);

  const spawnCaptureSparks = useCallback((r: number, c: number, color: string) => {
    const newSparks = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: c * CELL + CELL / 2,
      y: r * CELL + CELL / 2,
      c: color,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
    }));
    setSparks(prev => [...prev, ...newSparks]);
    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 300);
    setTimeout(() => setSparks(prev => prev.filter(s => !newSparks.find(ns => ns.id === s.id))), 600);
  }, []);

  const movePiece = (idx: number) => {
    if (!rolled || gameOver) return;
    const target = canMove(cur, idx, dice);
    if (target === null) { toast.error("Movimento invalido!"); return; }
    const np = pieces.map(p => [...p]) as Pos[][];
    const old = np[cur][idx];
    np[cur][idx] = target;
    if (target >= 0 && target <= 51 && old !== -1) {
      const myT = trackIdx(cur, target);
      const [tr, tc] = MT[myT];
      for (let p = 0; p < 4; p++) { if (p === cur) continue;
        for (let i = 0; i < 4; i++) { const op = np[p][i];
          if (op >= 0 && op <= 51 && trackIdx(p, op) === myT && !SAFE.has(myT)) {
            np[p][i] = -1;
            spawnCaptureSparks(tr, tc, PC[p]);
            toast.success(`${PN[cur]} capturou ${PN[p]}!`);
          }
        }
      }
    }
    setPieces(np); setAnimKey(k => k + 1); setRolled(false);
    if (np[cur].every(p => p === 58)) {
      setGameOver(true); setWinner(cur); onScore?.(PN[cur], 200);
      // Spawn victory confetti
      const cols = [PC[cur], PL[cur], "#FFD700", "#FF69B4", "#00FFFF", "#FFFFFF"];
      const newConfetti = Array.from({ length: 40 }, (_, i) => ({
        id: Date.now() + i,
        x: 50 + (Math.random() - 0.5) * 80,
        y: 50,
        c: cols[Math.floor(Math.random() * cols.length)],
        r: Math.random() * 360,
        d: Math.random() * 2 + 1,
      }));
      setConfetti(newConfetti);
      setTimeout(() => setConfetti([]), 4000);
      return;
    }
    if (dice === 6 && sixCnt < 3) return;
    setSixCnt(0); setCur(ap[(apI + 1) % ap.length]);
  };

  const hasMove = () => { for (let i = 0; i < 4; i++) if (canMove(cur, i, dice) !== null) return true; return false; };

  useEffect(() => {
    if (rolled && !hasMove()) {
      const t = setTimeout(() => { setRolled(false); setSixCnt(0); setCur(ap[(apI + 1) % ap.length]); }, 800);
      return () => clearTimeout(t);
    }
  }, [rolled, dice, cur, pieces, ap, apI]);

  const rollDice = () => {
    if (rolled || gameOver) return;
    setDiceRolling(true);
    const v = Math.floor(Math.random()*6)+1;
    setDice(v); setRolled(true); setSixCnt(p => v===6 ? p+1 : 0);
    setTimeout(() => setDiceRolling(false), 400);
  };
  const reset = () => { setPieces(Array.from({length:4},()=>[-1,-1,-1,-1] as Pos[])); setCur(0); setDice(1); setRolled(false); setGameOver(false); setWinner(null); setSixCnt(0); setSparks([]); setConfetti([]); setCaptureFlash(false); setDiceRolling(false); };

  const cellMap = useMemo(() => {
    const m = new Map<string, {type:string;player?:number}>();
    MT.forEach(([r,c],i) => { let pl: number|undefined; for(let p=0;p<4;p++) if(SO[p]===i) pl=p; m.set(`${r},${c}`,{type:SAFE.has(i)?"safe":"track",player:pl}); });
    HS.forEach((cells,p) => cells.forEach(([r,c],i) => m.set(`${r},${c}`,{type:"home",player:p})));
    m.set("7,7",{type:"center"});
    [["7,6",0],["6,7",1],["7,8",2],["8,7",3]].forEach(([k,p]) => m.set(String(k),{type:"home",player:p as number}));
    return m;
  }, []);

  const piecePosMap = useMemo(() => {
    const m = new Map<string, {player:number;idx:number}[]>();
    pieces.forEach((pp,p) => pp.forEach((pos,i) => {
      let c: [number,number]|null = pos===-1 ? BP[p][i] : cellCoord(p,pos);
      if (c && pos !== 58) { const k=`${c[0]},${c[1]}`; if(!m.has(k)) m.set(k,[]); m.get(k)!.push({player:p,idx:i}); }
    })); return m;
  }, [pieces, animKey]);

  const diceDots: Record<number,number[][]> = { 1:[[1,1]], 2:[[0,2],[2,0]], 3:[[0,2],[1,1],[2,0]], 4:[[0,0],[0,2],[2,0],[2,2]], 5:[[0,0],[0,2],[1,1],[2,0],[2,2]], 6:[[0,0],[0,1],[0,2],[2,0],[2,1],[2,2]] };
  const bs = 15 * CELL;

  return (
    <div className="space-y-4 relative">
      {/* Victory confetti overlay */}
      <AnimatePresence>
        {confetti.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {confetti.map(c => (
              <motion.div
                key={c.id}
                initial={{ x: `${c.x}%`, y: `-10%`, opacity: 1, rotate: 0, scale: 1 }}
                animate={{ y: "110%", opacity: [1, 1, 0.5, 0], rotate: c.r, scale: [1, 1.2, 0.8] }}
                transition={{ duration: c.d + 1.5, ease: "easeIn" }}
                className="absolute w-3 h-3 rounded-sm"
                style={{ background: c.c, left: `${c.x}%` }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Player indicators with progress bars */}
      <div className="grid grid-cols-2 gap-2">
        {ap.map(p => {
          const homeCount = pieces[p].filter(x => x === 58).length;
          const isActive = cur === p && !gameOver;
          return (
            <motion.div
              key={p}
              animate={isActive ? { scale: [1, 1.02, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={cn("p-3 rounded-2xl border-2 backdrop-blur transition-all relative overflow-hidden")}
              style={{
                borderColor: isActive ? PC[p] : `${PC[p]}20`,
                background: isActive
                  ? `linear-gradient(135deg,${PC[p]}18,${PC[p]}06)`
                  : "rgba(255,255,255,0.03)",
                boxShadow: isActive ? `0 0 20px ${PC[p]}15, inset 0 1px 0 ${PC[p]}20` : "none",
              }}
            >
              {/* Animated accent line at top */}
              {isActive && (
                <motion.div
                  className="absolute top-0 left-0 right-0 h-0.5"
                  style={{ background: `linear-gradient(90deg, transparent, ${PC[p]}, transparent)` }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <motion.div
                    className="w-6 h-6 rounded-full"
                    style={{
                      background: `radial-gradient(circle at 35% 35%, ${PL[p]}, ${PC[p]})`,
                      boxShadow: isActive ? PG_STRONG[p] : PG[p],
                      border: "2px solid rgba(255,255,255,0.3)",
                    }}
                    animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                  {isActive && (
                    <motion.div
                      className="absolute inset-[-3px] rounded-full"
                      style={{ border: `2px solid ${PC[p]}` }}
                      animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                  )}
                </div>
                <span className="text-xs font-bold" style={{ color: PL[p] }}>{PN[p]}</span>
                {isActive && <Crown className="h-3 w-3 ml-auto" style={{ color: PC[p] }} />}
                {!isActive && !gameOver && <span className="text-[9px] text-muted-foreground ml-auto">{homeCount}/4</span>}
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: `${PC[p]}15` }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${PC[p]}90, ${PL[p]})`,
                    boxShadow: homeCount > 0 ? `0 0 8px ${PC[p]}60` : "none",
                  }}
                  animate={{ width: `${(homeCount / 4) * 100}%` }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              </div>
              <div className="flex gap-1.5 mt-1.5">
                {pieces[p].map((pos, i) => (
                  <div key={i} className={cn(
                    "w-3.5 h-3.5 rounded-full transition-all relative",
                    pos === -1 && "opacity-30",
                    pos === 58 && "",
                    pos >= 0 && pos < 58 && "opacity-90"
                  )} style={{
                    background: pos === 58 ? `radial-gradient(circle at 35% 35%, white, ${PC[p]})` : PC[p],
                    boxShadow: pos === 58 ? `0 0 6px ${PC[p]}80` : "none",
                    border: pos === 58 ? "1.5px solid rgba(255,255,255,0.6)" : "none",
                  }}>
                    {pos === 58 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Star className="absolute inset-0 m-auto w-2 h-2 text-white" />
                      </motion.div>
                    )}
                  </div>
                ))}
                <span className="text-[9px] text-muted-foreground ml-1 self-center font-medium">{homeCount}/4</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-center gap-2">
        <Button size="sm" variant={mode==="2p"?"default":"outline"} className={cn("rounded-xl text-xs",mode==="2p"&&"bg-gradient-to-r from-red-500 to-blue-500")} onClick={()=>{setMode("2p");reset();}}>2J</Button>
        <Button size="sm" variant={mode==="4p"?"default":"outline"} className={cn("rounded-xl text-xs",mode==="4p"&&"bg-gradient-to-r from-red-500 via-green-500 via-blue-500 to-amber-500")} onClick={()=>{setMode("4p");reset();}}>4J</Button>
      </div>

      <div className="flex justify-center">
        <div ref={boardRef} className="relative rounded-2xl overflow-hidden" style={{width:bs,height:bs,background:"#1a1a2e", boxShadow: "0 0 40px rgba(0,0,0,0.5), 0 0 80px rgba(100,100,200,0.05)"}}>
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-10" style={{backgroundImage:`linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)`,backgroundSize:`${CELL}px ${CELL}px`}} />
          {/* Vignette overlay */}
          <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)"}} />
          {/* Capture flash overlay */}
          <AnimatePresence>
            {captureFlash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 pointer-events-none z-40"
                style={{ background: `radial-gradient(circle, rgba(255,100,100,0.4), transparent 70%)` }}
              />
            )}
          </AnimatePresence>

          {/* Player bases with enhanced styling */}
          {PLAYERS.map(p => {
            const [br,bc] = p===0?[0,0]:p===1?[0,9]:p===2?[9,9]:[9,0];
            return (
              <div key={`b${p}`} className="absolute rounded-xl" style={{
                top: br*CELL, left: bc*CELL, width: 6*CELL, height: 6*CELL,
                background: `linear-gradient(145deg, ${PC[p]}18, ${PC[p]}06)`,
                border: `2px solid ${PC[p]}30`,
                boxShadow: cur===p ? `inset 0 0 20px ${PC[p]}10, 0 0 15px ${PC[p]}10` : `inset 0 0 10px ${PC[p]}05`,
              }}>
                {/* Base corner icon */}
                <div className="absolute top-1 left-1.5 opacity-20">
                  <Shield className="w-4 h-4" style={{ color: PC[p] }} />
                </div>
                {BP[p].map(([r,c],i)=>{
                  const pieceHere = pieces[p][i];
                  const isEmpty = pieceHere === -1;
                  return (
                    <div key={i} className="absolute rounded-full" style={{
                      top: (r-br)*CELL+4, left: (c-bc)*CELL+4, width: CELL-8, height: CELL-8,
                      background: isEmpty ? `${PC[p]}10` : `${PC[p]}25`,
                      border: isEmpty ? `2px dashed ${PC[p]}30` : `2px solid ${PC[p]}50`,
                      boxShadow: isEmpty ? "none" : `0 0 8px ${PC[p]}30`,
                      transition: "all 0.3s ease",
                    }}/>
                  );
                })}
              </div>
            );
          })}

          {/* Track cells with enhanced styling */}
          {MT.map(([r,c],i)=>{
            const info=cellMap.get(`${r},${c}`); const isS=SAFE.has(i); const isSt=info?.player!==undefined;
            const isStartOfCur = isSt && info.player === cur && !gameOver;
            return (
              <motion.div
                key={`t${i}`}
                className="absolute rounded-sm"
                animate={isStartOfCur ? { boxShadow: [`0 0 0 ${PC[info.player!]}00`, `0 0 8px ${PC[info.player!]}40`, `0 0 0 ${PC[info.player!]}00`] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                style={{
                  top: r*CELL+1, left: c*CELL+1, width: CELL-2, height: CELL-2,
                  background: isS
                    ? `linear-gradient(135deg, ${(isSt?PC[info.player!]:"#fff")}35, ${(isSt?PC[info.player!]:"#fff")}15)`
                    : "rgba(255,255,255,0.06)",
                  border: isS
                    ? `1.5px solid ${(isSt?PC[info.player!]:"#fff")}50`
                    : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: isS ? `inset 0 1px 0 rgba(255,255,255,0.1)` : "none",
                }}
              >
                {isS && <Star className="absolute inset-0 m-auto w-3 h-3 opacity-40" style={{color:isSt?PC[info.player!]:"white"}}/>}
              </motion.div>
            );
          })}

          {/* Home stretch cells with gradient intensity */}
          {HS.flatMap((cells,p)=>cells.map(([r,c],i)=>(
            <motion.div
              key={`h${p}${i}`}
              className="absolute rounded-sm"
              animate={cur===p && !gameOver ? {
                borderColor: [`${PC[p]}40`, `${PC[p]}80`, `${PC[p]}40`],
              } : {}}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.1 }}
              style={{
                top: r*CELL+1, left: c*CELL+1, width: CELL-2, height: CELL-2,
                background: `linear-gradient(135deg, ${PC[p]}${15 + i * 5}, ${PC[p]}${10 + i * 3})`,
                border: `1px solid ${PC[p]}40`,
                boxShadow: i === 5 ? `0 0 10px ${PC[p]}40, inset 0 0 8px ${PC[p]}20` : "none",
              }}
            >
              {i===5 && (
                <motion.div
                  className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full"
                  style={{ background: `radial-gradient(circle at 35% 35%, ${PL[p]}, ${PC[p]})`, boxShadow: PG[p] }}
                  animate={cur===p && !gameOver ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}
            </motion.div>
          )))}

          {/* Enhanced center design */}
          <div className="absolute rounded-full z-20" style={{top:6*CELL-4,left:6*CELL-4,width:3*CELL+8,height:3*CELL+8,background:"conic-gradient(from 0deg,#EF444450,#22C55E50,#3B82F650,#F59E0B50,#EF444450)",border:"2px solid rgba(255,255,255,0.2)",boxShadow:"0 0 30px rgba(255,255,255,0.05), inset 0 0 20px rgba(0,0,0,0.3)"}}>
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: "conic-gradient(from 180deg,#EF444420,#22C55E20,#3B82F620,#F59E0B20,#EF444420)" }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            />
            <div className="absolute inset-2 rounded-full bg-[#1a1a2e] flex items-center justify-center" style={{ boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)" }}>
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
              >
                <Trophy className="w-6 h-6 text-yellow-400" style={{ filter: "drop-shadow(0 0 6px rgba(250,204,21,0.5))" }} />
              </motion.div>
            </div>
          </div>

          {/* Capture sparks */}
          <AnimatePresence>
            {sparks.map(s => (
              <motion.div
                key={s.id}
                initial={{ x: s.x, y: s.y, opacity: 1, scale: 1 }}
                animate={{ x: s.x + s.vx * 15, y: s.y + s.vy * 15, opacity: 0, scale: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute w-2 h-2 rounded-full pointer-events-none z-30"
                style={{ background: s.c, boxShadow: `0 0 6px ${s.c}` }}
              />
            ))}
          </AnimatePresence>

          {/* Enhanced pieces/tokens */}
          {pieces.flatMap((pp,p)=>pp.map((pos,i)=>{
            let coord: [number,number]|null = pos===-1?BP[p][i]:pos>=0&&pos<=57?cellCoord(p,pos):null;
            if(!coord||pos===58) return null;
            const [r,c]=coord; const sibs=piecePosMap.get(`${r},${c}`)||[];
            const mi=sibs.findIndex(s=>s.player===p&&s.idx===i); const tot=sibs.length;
            const ox=tot>1?(mi%2)*8-4:0; const oy=tot>1?Math.floor(mi/2)*8-4:0;
            const canClick = cur===p&&!gameOver&&((!rolled&&pos===-1&&dice===6)||(rolled&&pos>=0&&pos<58&&canMove(p,i,dice)!==null));
            const isInHomeStretch = pos >= 52;
            return (
              <motion.div
                key={`${p}${i}${animKey}`}
                className={cn("absolute rounded-full flex items-center justify-center font-black text-white z-10", isInHomeStretch ? "text-[8px]" : "text-[10px]")}
                style={{
                  top: r*CELL+3+oy,
                  left: c*CELL+3+ox,
                  width: CELL-6,
                  height: CELL-6,
                  background: `radial-gradient(circle at 30% 30%, ${PL[p]}, ${PC[p]}cc, ${PC[p]})`,
                  boxShadow: canClick
                    ? `${PG_STRONG[p]}, 0 2px 8px rgba(0,0,0,0.5)`
                    : `0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)`,
                  border: canClick ? "2.5px solid rgba(255,255,255,0.7)" : "2px solid rgba(255,255,255,0.35)",
                  cursor: canClick ? "pointer" : "default",
                }}
                animate={canClick ? {
                  boxShadow: [
                    `${PG_STRONG[p]}, 0 2px 8px rgba(0,0,0,0.5)`,
                    `${PG[p]}, 0 2px 8px rgba(0,0,0,0.5)`,
                    `${PG_STRONG[p]}, 0 2px 8px rgba(0,0,0,0.5)`,
                  ],
                } : {}}
                transition={canClick ? { repeat: Infinity, duration: 1.2 } : springCfg}
                whileHover={canClick ? { scale: 1.2, y: -2 } : { scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={()=>{if(canClick)movePiece(i);}}
              >
                {/* Inner shine highlight */}
                <div className="absolute top-0.5 left-1 w-2 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.4)", filter: "blur(1px)" }} />
                <span className="relative z-10 drop-shadow-sm">{i+1}</span>
                {/* Movable indicator ring */}
                {canClick && (
                  <motion.div
                    className="absolute inset-[-3px] rounded-full pointer-events-none"
                    style={{ border: `2px solid ${PL[p]}` }}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                )}
              </motion.div>
            );
          }))}
        </div>
      </div>

      {/* Enhanced dice area */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {/* Dice glow background */}
          <motion.div
            className="absolute inset-[-12px] rounded-3xl blur-xl"
            style={{ background: PC[cur] }}
            animate={diceRolling ? { opacity: [0.1, 0.3, 0.1] } : { opacity: 0.1 }}
            transition={diceRolling ? { repeat: 2, duration: 0.2 } : {}}
          />
          <motion.div
            key={dice}
            initial={diceRolling ? { rotateX: 0, rotateY: 0, scale: 0.6 } : { rotateX: 0, scale: 0.7 }}
            animate={diceRolling
              ? { rotateX: [0, 180, 360], rotateY: [0, 90, 0], scale: [0.6, 1.1, 1] }
              : { rotateX: 0, scale: 1 }
            }
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center z-10"
            style={{
              background: "linear-gradient(145deg, #ffffff, #e8e8e8)",
              boxShadow: `0 8px 32px ${PC[cur]}40, 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)`,
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <div className="grid grid-cols-3 grid-rows-3 w-12 h-12 sm:w-14 sm:h-14 gap-1 p-1">
              {Array.from({length:9}).map((_,i)=>{
                const r=Math.floor(i/3),c=i%3;
                const hd=(diceDots[dice]||[]).some(([dr,dc])=>dr===r&&dc===c);
                return(
                  <div key={i} className="flex items-center justify-center">
                    {hd && (
                      <motion.div
                        initial={diceRolling ? { scale: 0, rotate: -180 } : { scale: 0 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          delay: diceRolling ? 0.2 : 0.15,
                          type: "spring",
                          stiffness: 500,
                          damping: 15,
                        }}
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                        style={{
                          background: `radial-gradient(circle at 35% 35%, ${PL[cur]}, ${PC[cur]})`,
                          boxShadow: `0 1px 3px rgba(0,0,0,0.2)`,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Six indicator flame */}
            {dice === 6 && rolled && (
              <motion.div
                className="absolute -top-2 -right-2"
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: [1, 1.2, 1], rotate: [-30, 10, -30] }}
                transition={{ repeat: Infinity, duration: 0.6 }}
              >
                <Flame className="w-5 h-5" style={{ color: PC[cur], filter: `drop-shadow(0 0 4px ${PC[cur]})` }} />
              </motion.div>
            )}
          </motion.div>
        </div>
        {!rolled ? (
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: `0 6px 30px ${PC[cur]}50` }}
            whileTap={{ scale: 0.95 }}
            onClick={rollDice}
            disabled={gameOver}
            className="px-8 py-3 rounded-2xl text-white font-bold text-base disabled:opacity-50 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${PC[cur]}, ${PC[cur]}bb)`,
              boxShadow: `0 4px 20px ${PC[cur]}40`,
            }}
          >
            {/* Button shimmer effect */}
            <motion.div
              className="absolute inset-0"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" }}
              animate={{ x: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            />
            <span className="relative z-10 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Rolar Dado
            </span>
          </motion.button>
        ) : (
          <div className="text-sm text-muted-foreground flex items-center gap-1.5">
            {hasMove()
              ? <><Zap className="w-3.5 h-3.5" style={{ color: PC[cur] }} /> Escolha uma peca ({dice})</>
              : <span>Sem movimentos...</span>
            }
          </div>
        )}
        {rolled && pieces[cur].map((pos,i)=>{if(canMove(cur,i,dice)===null) return null;return(
          <motion.button
            key={i}
            initial={{opacity:0,y:10}}
            animate={{opacity:1,y:0}}
            whileHover={{scale:1.05,x:4}}
            whileTap={{scale:0.95}}
            onClick={()=>movePiece(i)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${PC[cur]}, ${PC[cur]}cc)`,
              boxShadow: `0 2px 10px ${PC[cur]}30`,
            }}
          >
            <div className="w-4 h-4 rounded-full" style={{background:`radial-gradient(circle at 35% 35%, ${PL[cur]}, ${PC[cur]})`,border:`2px solid rgba(255,255,255,0.4)`,boxShadow:PG[cur]}}/>
            Peca {i+1} {pos===-1?"(sair)":`(${pos})`}
          </motion.button>
        );})}
      </div>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" className="rounded-xl" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5 mr-1"/>Novo Jogo
        </Button>
      </div>

      {/* Enhanced game over / victory screen */}
      <AnimatePresence>
        {gameOver && winner !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative"
          >
            {/* Glowing backdrop */}
            <motion.div
              className="absolute inset-0 -m-6 rounded-3xl blur-2xl"
              style={{ background: PC[winner] }}
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="relative text-center space-y-4 py-6 px-4 rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${PC[winner]}12, ${PC[winner]}05, transparent)`,
                border: `2px solid ${PC[winner]}40`,
                boxShadow: `0 0 40px ${PC[winner]}15, inset 0 1px 0 ${PC[winner]}20`,
              }}
            >
              {/* Animated trophy with glow ring */}
              <div className="relative inline-block">
                <motion.div
                  className="absolute inset-[-8px] rounded-full"
                  style={{ border: `3px solid ${PC[winner]}` }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5], rotate: [0, 180, 360] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-[-4px] rounded-full"
                  style={{ border: `2px solid ${PL[winner]}` }}
                  animate={{ scale: [1.1, 1.3, 1.1], opacity: [0.3, 0.1, 0.3], rotate: [360, 180, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                />
                <motion.div
                  animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Trophy
                    className="w-14 h-14 mx-auto"
                    style={{
                      color: PC[winner],
                      filter: `drop-shadow(0 0 12px ${PC[winner]}80) drop-shadow(0 0 24px ${PC[winner]}40)`,
                    }}
                  />
                </motion.div>
              </div>
              {/* Winner name with gradient text effect */}
              <div className="space-y-1">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-xs font-medium uppercase tracking-widest" style={{ color: `${PL[winner]}90` }}>Vencedor</span>
                </motion.div>
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-black"
                  style={{
                    color: PL[winner],
                    textShadow: `0 0 20px ${PC[winner]}60, 0 0 40px ${PC[winner]}30`,
                  }}
                >
                  {PN[winner]} Venceu!
                </motion.h3>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-center gap-1"
                >
                  {Array.from({ length: 4 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.6 + i * 0.15, type: "spring", stiffness: 400 }}
                    >
                      <Star className="w-4 h-4" style={{ color: PC[winner], filter: `drop-shadow(0 0 4px ${PC[winner]})` }} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Button
                  onClick={reset}
                  className="rounded-xl px-6 py-2.5 font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${PC[winner]}, ${PC[winner]}bb)`,
                    boxShadow: `0 4px 20px ${PC[winner]}40`,
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2"/>Jogar Novamente
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LudoGame;
