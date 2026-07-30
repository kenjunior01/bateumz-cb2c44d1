import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Trophy, Star, Crown } from "lucide-react";
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
  const [sparks, setSparks] = useState<{id:number;x:number;y:number;c:string}[]>([]);
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

  const movePiece = (idx: number) => {
    if (!rolled || gameOver) return;
    const target = canMove(cur, idx, dice);
    if (target === null) { toast.error("Movimento invalido!"); return; }
    const np = pieces.map(p => [...p]) as Pos[][];
    const old = np[cur][idx];
    np[cur][idx] = target;
    if (target >= 0 && target <= 51 && old !== -1) {
      const myT = trackIdx(cur, target);
      for (let p = 0; p < 4; p++) { if (p === cur) continue;
        for (let i = 0; i < 4; i++) { const op = np[p][i];
          if (op >= 0 && op <= 51 && trackIdx(p, op) === myT && !SAFE.has(myT)) {
            np[p][i] = -1; toast.success(`${PN[cur]} capturou ${PN[p]}!`);
          }
        }
      }
    }
    setPieces(np); setAnimKey(k => k + 1); setRolled(false);
    if (np[cur].every(p => p === 58)) { setGameOver(true); setWinner(cur); onScore?.(PN[cur], 200); return; }
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

  const rollDice = () => { if (rolled || gameOver) return; const v = Math.floor(Math.random()*6)+1; setDice(v); setRolled(true); setSixCnt(p => v===6 ? p+1 : 0); };
  const reset = () => { setPieces(Array.from({length:4},()=>[-1,-1,-1,-1] as Pos[])); setCur(0); setDice(1); setRolled(false); setGameOver(false); setWinner(null); setSixCnt(0); setSparks([]); };

  const cellMap = useMemo(() => {
    const m = new Map<string, {type:string;player?:number}>();
    MT.forEach(([r,c],i) => { let pl: number|undefined; for(let p=0;p<4;p++) if(SO[p]===i) pl=p; m.set(`${r},${c}`,{type:SAFE.has(i)?"safe":"track",player:pl}); });
    HS.forEach((cells,p) => cells.forEach(([r,c],i) => m.set(`${r},${c}`,{type:"home",player:p})));
    m.set("7,7",{type:"center"});
    [["7,6",0],["6,7",1],["7,8",2],["8,7",3]].forEach(([k,p]) => m.set(k,{type:"home",player:p as number}));
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {ap.map(p => (
          <motion.div key={p} animate={cur===p&&!gameOver?{scale:[1,1.03,1]}:{}} transition={{repeat:Infinity,duration:1.5}}
            className={cn("p-3 rounded-2xl border-2 backdrop-blur transition-all")}
            style={{borderColor:cur===p&&!gameOver?PC[p]:"transparent",background:cur===p&&!gameOver?`linear-gradient(135deg,${PC[p]}15,${PC[p]}05)`:"rgba(255,255,255,0.03)"}}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full" style={{background:PC[p],boxShadow:PG[p]}} />
              <span className="text-xs font-bold" style={{color:PL[p]}}>{PN[p]}</span>
              {cur===p&&!gameOver&&<Crown className="h-3 w-3 ml-auto" style={{color:PC[p]}}/>}
            </div>
            <div className="flex gap-1 mt-1.5">
              {pieces[p].map((pos,i)=>(
                <div key={i} className={cn("w-3.5 h-3.5 rounded-full transition-all",pos===-1?"opacity-30":pos===58?"ring-1 ring-white":"opacity-90")} style={{background:pos===58?"white":PC[p]}}/>
              ))}
              <span className="text-[9px] text-muted-foreground ml-1">{pieces[p].filter(x=>x===58).length}/4</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-center gap-2">
        <Button size="sm" variant={mode==="2p"?"default":"outline"} className={cn("rounded-xl text-xs",mode==="2p"&&"bg-gradient-to-r from-red-500 to-blue-500")} onClick={()=>{setMode("2p");reset();}}>2J</Button>
        <Button size="sm" variant={mode==="4p"?"default":"outline"} className={cn("rounded-xl text-xs",mode==="4p"&&"bg-gradient-to-r from-red-500 via-green-500 via-blue-500 to-amber-500")} onClick={()=>{setMode("4p");reset();}}>4J</Button>
      </div>

      <div className="flex justify-center">
        <div ref={boardRef} className="relative rounded-2xl overflow-hidden" style={{width:bs,height:bs,background:"#1a1a2e"}}>
          <div className="absolute inset-0 opacity-10" style={{backgroundImage:`linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)`,backgroundSize:`${CELL}px ${CELL}px`}} />

          {PLAYERS.map(p => {
            const [br,bc] = p===0?[0,0]:p===1?[0,9]:p===2?[9,9]:[9,0];
            return (
              <div key={`b${p}`} className="absolute rounded-xl" style={{top:br*CELL,left:bc*CELL,width:6*CELL,height:6*CELL,background:`linear-gradient(135deg,${PC[p]}20,${PC[p]}08)`,border:`2px solid ${PC[p]}30`}}>
                {BP[p].map(([r,c],i)=>(
                  <div key={i} className="absolute rounded-full" style={{top:(r-br)*CELL+4,left:(c-bc)*CELL+4,width:CELL-8,height:CELL-8,background:`${PC[p]}15`,border:`2px dashed ${PC[p]}40`}}/>
                ))}
              </div>
            );
          })}

          {MT.map(([r,c],i)=>{
            const info=cellMap.get(`${r},${c}`); const isS=SAFE.has(i); const isSt=info?.player!==undefined;
            return (
              <div key={`t${i}`} className="absolute rounded-sm" style={{top:r*CELL+1,left:c*CELL+1,width:CELL-2,height:CELL-2,background:isS?`${(isSt?PC[info.player!]:"#fff")}30`:"rgba(255,255,255,0.06)",border:isS?`1.5px solid ${(isSt?PC[info.player!]:"#fff")}50`:"1px solid rgba(255,255,255,0.08)"}}>
                {isS&&<Star className="absolute inset-0 m-auto w-3 h-3 opacity-40" style={{color:isSt?PC[info.player!]:"white"}}/>}
              </div>
            );
          })}

          {HS.flatMap((cells,p)=>cells.map(([r,c],i)=>(
            <div key={`h${p}${i}`} className="absolute rounded-sm" style={{top:r*CELL+1,left:c*CELL+1,width:CELL-2,height:CELL-2,background:`${PC[p]}25`,border:`1px solid ${PC[p]}40`}}>
              {i===5&&<div className="absolute inset-0 m-auto w-2.5 h-2.5 rounded-full" style={{background:PC[p]}}/>}
            </div>
          )))}

          <div className="absolute rounded-full" style={{top:6*CELL-4,left:6*CELL-4,width:3*CELL+8,height:3*CELL+8,background:"conic-gradient(from 0deg,#EF444440,#22C55E40,#3B82F640,#F59E0B40,#EF444440)",border:"2px solid rgba(255,255,255,0.2)"}}>
            <div className="absolute inset-2 rounded-full bg-[#1a1a2e] flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-400"/>
            </div>
          </div>

          {pieces.flatMap((pp,p)=>pp.map((pos,i)=>{
            let coord: [number,number]|null = pos===-1?BP[p][i]:pos>=0&&pos<=57?cellCoord(p,pos):null;
            if(!coord||pos===58) return null;
            const [r,c]=coord; const sibs=piecePosMap.get(`${r},${c}`)||[];
            const mi=sibs.findIndex(s=>s.player===p&&s.idx===i); const tot=sibs.length;
            const ox=tot>1?(mi%2)*8-4:0; const oy=tot>1?Math.floor(mi/2)*8-4:0;
            const canClick = cur===p&&!gameOver&&((!rolled&&pos===-1&&dice===6)||(rolled&&pos>=0&&pos<58&&canMove(p,i,dice)!==null));
            return (
              <motion.div key={`${p}${i}${animKey}`} className="absolute rounded-full flex items-center justify-center text-[10px] font-black text-white z-10" style={{top:r*CELL+3+oy,left:c*CELL+3+ox,width:CELL-6,height:CELL-6,background:`radial-gradient(circle at 35% 35%,${PL[p]},${PC[p]})`,boxShadow:canClick?PG[p]:"0 2px 6px rgba(0,0,0,0.4)",border:"2px solid rgba(255,255,255,0.4)",cursor:canClick?"pointer":"default"}} whileHover={{scale:1.15}} whileTap={{scale:0.9}} onClick={()=>{if(canClick)movePiece(i);}} transition={springCfg}>{i+1}</motion.div>
            );
          }))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <motion.div key={dice} initial={{rotateX:0,scale:0.7}} animate={{rotateX:[0,360],scale:1}} transition={{duration:0.4,ease:"easeOut"}} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center" style={{boxShadow:`0 8px 32px ${PC[cur]}50`}}>
          <div className="grid grid-cols-3 grid-rows-3 w-12 h-12 sm:w-14 sm:h-14 gap-1 p-1">
            {Array.from({length:9}).map((_,i)=>{const r=Math.floor(i/3),c=i%3;const hd=(diceDots[dice]||[]).some(([dr,dc])=>dr===r&&dc===c);return(<div key={i} className="flex items-center justify-center">{hd&&<motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.15,type:"spring",stiffness:500}} className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{background:PC[cur]}}/>}</div>);})}
          </div>
        </motion.div>
        {!rolled ? (
          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={rollDice} disabled={gameOver} className="px-8 py-3 rounded-2xl text-white font-bold text-base shadow-lg disabled:opacity-50" style={{background:`linear-gradient(135deg,${PC[cur]},${PC[cur]}cc)`,boxShadow:`0 4px 20px ${PC[cur]}40`}}>Rolar Dado</motion.button>
        ) : (
          <div className="text-sm text-muted-foreground">{hasMove()?`Escolha uma peca (${dice})`:"Sem movimentos..."}</div>
        )}
        {rolled && pieces[cur].map((pos,i)=>{if(canMove(cur,i,dice)===null) return null;return(
          <motion.button key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>movePiece(i)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{background:`linear-gradient(135deg,${PC[cur]},${PC[cur]}cc)`,boxShadow:`0 2px 10px ${PC[cur]}30`}}><div className="w-4 h-4 rounded-full" style={{background:PL[cur],border:`2px solid ${PC[cur]}`}}/>Peca {i+1} {pos===-1?"(sair)":`(${pos})`}</motion.button>
        );})}
      </div>

      <div className="flex justify-center"><Button variant="outline" size="sm" className="rounded-xl" onClick={reset}><RotateCcw className="h-3.5 w-3.5 mr-1"/>Novo Jogo</Button></div>

      <AnimatePresence>{gameOver&&winner!==null&&(
        <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} className="text-center space-y-3 py-4">
          <motion.div animate={{rotate:[0,-10,10,0]}} transition={{repeat:Infinity,duration:0.5}}><Trophy className="w-12 h-12 mx-auto" style={{color:PC[winner]}}/></motion.div>
          <h3 className="text-xl font-black" style={{color:PL[winner]}}>{PN[winner]} Venceu!</h3>
          <Button onClick={reset} className="rounded-xl" style={{background:`linear-gradient(135deg,${PC[winner]},${PC[winner]}cc)`}}><RotateCcw className="h-4 w-4 mr-1"/>Jogar Novamente</Button>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
};

export default LudoGame;
