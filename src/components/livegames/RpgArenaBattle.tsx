"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Swords,
  Shield,
  Zap,
  Heart,
  Star,
  Crown,
  RotateCcw,
  Play,
  Trophy,
  Skull,
  Flame,
  Sparkles,
  ChevronDown,
  Target,
  Ghost,
} from "lucide-react";

// ===== TYPES =====

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

type ClassName = "guerreiro" | "mago" | "arqueiro" | "ladino";
type Difficulty = "facil" | "medio" | "dificil";
type Phase = "menu" | "battle" | "roundEnd" | "matchEnd";
type AbilityType = "ataque" | "cura" | "buff" | "especial";

type Ability = {
  name: string;
  icon: string;
  type: AbilityType;
  power: number;
  manaCost: number;
  desc: string;
};

type CharacterClass = {
  id: ClassName;
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  mana: number;
  color: string;
  gradient: string;
  abilities: Ability[];
};

type Fighter = {
  className: ClassName;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  mana: number;
  maxMana: number;
  level: number;
  xp: number;
  xpToNext: number;
};

type BattleLogEntry = {
  text: string;
  type: "player" | "bot" | "system";
  isCrit?: boolean;
  isDodge?: boolean;
};

type FloatingNumber = {
  id: number;
  value: number;
  type: "damage" | "heal" | "dodge" | "crit";
  side: "player" | "bot";
};

type MatchStats = {
  damageDealt: number;
  damageTaken: number;
  critsLanded: number;
  critsReceived: number;
  abilitiesUsed: number;
  roundsWon: number;
  roundsLost: number;
  dodges: number;
  heals: number;
};

// ===== CONSTANTS =====

const CLASS_DEFS: CharacterClass[] = [
  {
    id: "guerreiro",
    name: "Guerreiro",
    emoji: "\u2694\uFE0F",
    hp: 120,
    atk: 18,
    def: 14,
    spd: 8,
    mana: 60,
    color: "text-red-500",
    gradient: "from-red-600 to-orange-600",
    abilities: [
      { name: "Golpe Poderoso", icon: "\uD83D\uDC4A", type: "ataque", power: 100, manaCost: 10, desc: "Um golpe devastador" },
      { name: "Escudo de Ferro", icon: "\uD83D\uDEE1\uFE0F", type: "buff", power: 8, manaCost: 15, desc: "Aumenta DEF tempor\u00E1rio" },
      { name: "Grito de Guerra", icon: "\uD83C\uDF0A", type: "buff", power: 6, manaCost: 12, desc: "Aumenta ATK" },
      { name: "Investida", icon: "\uD83D\uDCA5", type: "especial", power: 140, manaCost: 25, desc: "Carga devastadora" },
    ],
  },
  {
    id: "mago",
    name: "Mago",
    emoji: "\uD83E\uDDD9",
    hp: 80,
    atk: 22,
    def: 6,
    spd: 12,
    mana: 100,
    color: "text-purple-500",
    gradient: "from-purple-600 to-blue-600",
    abilities: [
      { name: "Bola de Fogo", icon: "\uD83D\uDD25", type: "ataque", power: 110, manaCost: 15, desc: "Bola ardente" },
      { name: "Raio de Gelo", icon: "\u2744\uFE0F", type: "ataque", power: 85, manaCost: 12, desc: "Congela o inimigo" },
      { name: "Cura Arcana", icon: "\u2728", type: "cura", power: 40, manaCost: 20, desc: "Restaura vida" },
      { name: "Meteoro", icon: "\uD83C\uDF0D", type: "especial", power: 170, manaCost: 35, desc: "Destrui\u00E7\u00E3o celestial" },
    ],
  },
  {
    id: "arqueiro",
    name: "Arqueiro",
    emoji: "\uD83C\uDFF9",
    hp: 95,
    atk: 16,
    def: 8,
    spd: 15,
    mana: 70,
    color: "text-green-500",
    gradient: "from-green-600 to-emerald-600",
    abilities: [
      { name: "Tiro Preciso", icon: "\uD83C\uDFAF", type: "ataque", power: 95, manaCost: 10, desc: "Alvo certeiro" },
      { name: "Chuva de Flechas", icon: "\uD83C\uDF27\uFE0F", type: "especial", power: 130, manaCost: 25, desc: "Flechas por toda parte" },
      { name: "Flecha Venenosa", icon: "\uD83D\uDC0D", type: "ataque", power: 80, manaCost: 12, desc: "Veneno lento" },
      { name: "Tiro Cr\u00EDtico", icon: "\uD83D\uDCB0", type: "ataque", power: 120, manaCost: 18, desc: "Alta chance de cr\u00EDtico" },
    ],
  },
  {
    id: "ladino",
    name: "Ladino",
    emoji: "\uD83D\uDD77\uFE0F",
    hp: 85,
    atk: 15,
    def: 10,
    spd: 18,
    mana: 75,
    color: "text-amber-500",
    gradient: "from-amber-600 to-yellow-600",
    abilities: [
      { name: "Punhalada", icon: "\uD83D\uDD2E", type: "ataque", power: 90, manaCost: 8, desc: "R\u00E1pida e letal" },
      { name: "Ataque Furtivo", icon: "\uD83D\uDC7E", type: "ataque", power: 130, manaCost: 20, desc: "Golpe nas costas" },
      { name: "Evas\u00E3o", icon: "\uD83D\uDD39", type: "buff", power: 0, manaCost: 10, desc: "Aumenta esquiva" },
      { name: "Golpe Sombrio", icon: "\uD83D\uDD34", type: "especial", power: 155, manaCost: 30, desc: "Trevas devoradoras" },
    ],
  },
];

const BOT_NAMES = ["Drakthar", "Morgana", "Sombra", "Valqu\u00EDria", "Necromante", "F\u00EAnix"];

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  facil: 0.8,
  medio: 1.0,
  dificil: 1.3,
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  facil: "F\u00E1cil",
  medio: "M\u00E9dio",
  dificil: "Dif\u00EDcil",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  facil: "from-green-500 to-emerald-500",
  medio: "from-yellow-500 to-orange-500",
  dificil: "from-red-500 to-rose-500",
};

const ROUNDS_TO_WIN = 2;
const BASE_XP = 50;
const MANA_REGEN = 8;

// ===== HELPERS =====

function hpBarColor(pct: number): string {
  if (pct > 60) return "from-green-500 to-emerald-400";
  if (pct > 30) return "from-yellow-500 to-amber-400";
  return "from-red-500 to-rose-400";
}

function hpBarGlow(pct: number): string {
  if (pct > 60) return "shadow-green-500/40";
  if (pct > 30) return "shadow-yellow-500/40";
  return "shadow-red-500/50";
}

function hpBarBorder(pct: number): string {
  if (pct > 60) return "border-green-500/30";
  if (pct > 30) return "border-yellow-500/30";
  return "border-red-500/40";
}

function createFighter(classDef: CharacterClass, level: number, name: string): Fighter {
  const hpBonus = (level - 1) * 5;
  const atkBonus = (level - 1) * 2;
  const defBonus = (level - 1) * 1;
  const spdBonus = (level - 1) * 1;
  return {
    className: classDef.id,
    name,
    hp: classDef.hp + hpBonus,
    maxHp: classDef.hp + hpBonus,
    atk: classDef.atk + atkBonus,
    def: classDef.def + defBonus,
    spd: classDef.spd + spdBonus,
    mana: classDef.mana,
    maxMana: classDef.mana,
    level,
    xp: 0,
    xpToNext: level * 100,
  };
}

function getClassDef(id: ClassName): CharacterClass {
  return CLASS_DEFS.find((c) => c.id === id)!;
}

function calcDamage(
  attacker: Fighter,
  defender: Fighter,
  ability: Ability,
  isPlayer: boolean,
  difficulty: Difficulty,
): { damage: number; isCrit: boolean; isDodge: boolean } {
  const dodgeChance = (defender.spd * 0.8) / 100;
  const isDodge = Math.random() < dodgeChance;
  if (isDodge) return { damage: 0, isCrit: false, isDodge: true };

  const critChance = (attacker.spd * 0.6) / 100 + (ability.name.includes("Cr\u00EDtic") ? 0.25 : 0);
  const isCrit = Math.random() < critChance;

  const baseDmg = (attacker.atk * (ability.power / 100)) - (defender.def * 0.3);
  const diffMult = isPlayer ? 1 : DIFFICULTY_MULTIPLIER[difficulty];
  const damage = Math.max(1, Math.floor(baseDmg * diffMult * (isCrit ? 1.75 : 1) * (0.9 + Math.random() * 0.2)));

  return { damage, isCrit, isDodge: false };
}

// ===== FLOATING NUMBER COMPONENT =====

function FloatingDmgNumber({ num }: { num: FloatingNumber }) {
  const isLeft = num.side === "player";
  return (
    <motion.div
      key={num.id}
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -60, scale: 1.2 }}
      exit={{ opacity: 0, y: -80 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className={cn(
        "absolute bottom-12 pointer-events-none z-30 font-black text-2xl drop-shadow-lg",
        isLeft ? "left-6" : "right-6",
        num.type === "damage" && "text-white",
        num.type === "crit" && "text-yellow-300",
        num.type === "heal" && "text-green-300",
        num.type === "dodge" && "text-blue-300",
      )}
    >
      <motion.span
        animate={num.type === "crit" ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.3, repeat: 2 }}
      >
        {num.type === "dodge" ? "MISS!" : num.type === "heal" ? `+${num.value}` : `-${num.value}`}
      </motion.span>
      {num.type === "crit" && (
        <motion.span
          initial={{ opacity: 0, x: 0 }}
          animate={{ opacity: [0, 1, 1, 0], x: [0, -20, -20, -30] }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="absolute -top-1 -right-8 text-xs font-bold text-orange-400"
        >
          CRIT!
        </motion.span>
      )}
    </motion.div>
  );
}

// ===== CONFETTI PARTICLE =====

function ConfettiParticle({ delay, color, x }: { delay: number; color: string; x: number }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: -20, x, rotate: 0 }}
      animate={{ opacity: 0, y: 200, x: x + (Math.random() - 0.5) * 80, rotate: 360 }}
      transition={{ duration: 2 + Math.random(), delay, ease: "easeIn" }}
      className={cn("absolute top-0 w-2 h-2 rounded-sm", color)}
    />
  );
}

// ===== MAIN COMPONENT =====

const RpgArenaBattle = ({ onScore, liveCode }: Props) => {
  const [phase, setPhase] = useState<Phase>("menu");
  const [selectedClass, setSelectedClass] = useState<ClassName | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medio");

  const [player, setPlayer] = useState<Fighter | null>(null);
  const [bot, setBot] = useState<Fighter | null>(null);
  const [botClassId, setBotClassId] = useState<ClassName>("guerreiro");
  const [botName, setBotName] = useState("");

  const [playerTurn, setPlayerTurn] = useState(true);
  const [turnAnim, setTurnAnim] = useState(false);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [round, setRound] = useState(1);
  const [playerRounds, setPlayerRounds] = useState(0);
  const [botRounds, setBotRounds] = useState(0);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [xpGained, setXpGained] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [playerBuff, setPlayerBuff] = useState({ atk: 0, def: 0 });
  const [botBuff, setBotBuff] = useState({ atk: 0, def: 0 });

  const [stats, setStats] = useState<MatchStats>({
    damageDealt: 0,
    damageTaken: 0,
    critsLanded: 0,
    critsReceived: 0,
    abilitiesUsed: 0,
    roundsWon: 0,
    roundsLost: 0,
    dodges: 0,
    heals: 0,
  });

  // Visual effects state
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [shake, setShake] = useState(false);
  const [hitFlash, setHitFlash] = useState<"player" | "bot" | null>(null);
  const floatIdRef = useRef(0);

  const logRef = useRef<HTMLDivElement>(null);
  const botActing = useRef(false);

  // Auto-scroll battle log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [battleLog]);

  const resetStats = useCallback(() => {
    setStats({
      damageDealt: 0,
      damageTaken: 0,
      critsLanded: 0,
      critsReceived: 0,
      abilitiesUsed: 0,
      roundsWon: 0,
      roundsLost: 0,
      dodges: 0,
      heals: 0,
    });
  }, []);

  const addFloatingNumber = useCallback((value: number, type: FloatingNumber["type"], side: "player" | "bot") => {
    const id = floatIdRef.current++;
    setFloatingNumbers((prev) => [...prev, { id, value, type, side }]);
    setTimeout(() => {
      setFloatingNumbers((prev) => prev.filter((n) => n.id !== id));
    }, 1400);
  }, []);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  }, []);

  const triggerHitFlash = useCallback((side: "player" | "bot") => {
    setHitFlash(side);
    setTimeout(() => setHitFlash(null), 300);
  }, []);

  const initBattle = useCallback(
    (pClass: ClassName, pLevel: number, diff: Difficulty) => {
      const pDef = getClassDef(pClass);
      const bClassIdx = Math.floor(Math.random() * CLASS_DEFS.length);
      const bDef = CLASS_DEFS[bClassIdx];
      const bName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const bLevel = diff === "facil" ? Math.max(1, pLevel - 1) : diff === "medio" ? pLevel : pLevel + 1;

      setBotClassId(bDef.id);
      setBotName(bName);
      setPlayer(createFighter(pDef, pLevel, "Jogador"));
      setBot(createFighter(bDef, bLevel, bName));
      setBattleLog([{ text: `\u2694\uFE0F ${bName} (${bDef.name} Nv.${bLevel}) apareceu!`, type: "system" }]);
      setPlayerTurn(true);
      setRound(1);
      setPlayerRounds(0);
      setBotRounds(0);
      setXpGained(0);
      setLeveledUp(false);
      setPlayerBuff({ atk: 0, def: 0 });
      setBotBuff({ atk: 0, def: 0 });
      setFloatingNumbers([]);
      setHitFlash(null);
      setShake(false);
      resetStats();
      setPhase("battle");
    },
    [resetStats],
  );

  const startMatch = () => {
    if (!selectedClass) return;
    initBattle(selectedClass, playerLevel, difficulty);
  };

  const endRound = useCallback(
    (winner: "player" | "bot") => {
      const newPR = winner === "player" ? playerRounds + 1 : playerRounds;
      const newBR = winner === "bot" ? botRounds + 1 : botRounds;
      setPlayerRounds(newPR);
      setBotRounds(newBR);

      if (newPR >= ROUNDS_TO_WIN) {
        const xp = Math.floor(BASE_XP * DIFFICULTY_MULTIPLIER[difficulty] * round);
        setXpGained(xp);
        const newTotalXp = (playerLevel - 1) * 100 + xp;
        const newLvl = Math.floor(newTotalXp / 100) + 1;
        if (newLvl > playerLevel) {
          setLeveledUp(true);
          setPlayerLevel(newLvl);
        }
        setStats((s) => ({ ...s, roundsWon: s.roundsWon + 1 }));
        setPhase("matchEnd");
        onScore?.("Jogador", 100 * round);
        return;
      }
      if (newBR >= ROUNDS_TO_WIN) {
        setStats((s) => ({ ...s, roundsLost: s.roundsLost + 1 }));
        setPhase("matchEnd");
        onScore?.("Jogador", 20 * round);
        return;
      }

      setPhase("roundEnd");
      setTimeout(() => {
        if (player && bot) {
          const pDef = getClassDef(player.className);
          const bDef = getClassDef(bot.className);
          setPlayer((p) => (p ? { ...p, hp: p.maxHp, mana: p.maxMana } : p));
          setBot((b) => (b ? { ...b, hp: b.maxHp, mana: b.maxMana } : b));
          setPlayerBuff({ atk: 0, def: 0 });
          setBotBuff({ atk: 0, def: 0 });
          setBattleLog([
            { text: `\uD83D\uDCAA Rodada ${round + 1} come\u00E7ou!`, type: "system" },
          ]);
          setRound((r) => r + 1);
          setPlayerTurn(true);
          setPhase("battle");
        }
      }, 2500);
    },
    [playerRounds, botRounds, player, bot, playerLevel, difficulty, round, onScore],
  );

  const botActRef = useRef<(b: Fighter, p: Fighter) => void>(() => {});

  const executeAbility = useCallback(
    (attacker: Fighter, defender: Fighter, ability: Ability, isPlayer: boolean) => {
      setTurnAnim(true);
      setTimeout(() => setTurnAnim(false), 500);

      if (isPlayer) {
        setPlayer((p) => (p ? { ...p, mana: Math.max(0, p.mana - ability.manaCost) } : p));
        setStats((s) => ({ ...s, abilitiesUsed: s.abilitiesUsed + 1 }));
      } else {
        setBot((b) => (b ? { ...b, mana: Math.max(0, b.mana - ability.manaCost) } : b));
      }

      if (ability.type === "cura") {
        const healAmt = Math.floor(ability.power + attacker.atk * 0.3);
        const actualHeal = Math.min(healAmt, attacker.maxHp - attacker.hp);
        if (isPlayer) {
          setPlayer((p) => (p ? { ...p, hp: Math.min(p.maxHp, p.hp + actualHeal) } : p));
          setStats((s) => ({ ...s, heals: s.heals + 1 }));
        } else {
          setBot((b) => (b ? { ...b, hp: Math.min(b.maxHp, b.hp + actualHeal) } : b));
        }
        addFloatingNumber(actualHeal, "heal", isPlayer ? "player" : "bot");
        setBattleLog((log) => [
          ...log,
          { text: `${attacker.name} usou ${ability.icon} ${ability.name} e recuperou ${actualHeal} HP!`, type: isPlayer ? "player" : "bot" },
        ]);
      } else if (ability.type === "buff") {
        if (isPlayer) {
          if (ability.name.includes("Escudo")) {
            setPlayerBuff((buf) => ({ ...buf, def: buf.def + ability.power }));
            setBattleLog((log) => [...log, { text: `${attacker.name} usou ${ability.icon} ${ability.name}! DEF +${ability.power}`, type: "player" }]);
          } else {
            setPlayerBuff((buf) => ({ ...buf, atk: buf.atk + ability.power }));
            setBattleLog((log) => [...log, { text: `${attacker.name} usou ${ability.icon} ${ability.name}! ATK +${ability.power}`, type: "player" }]);
          }
        } else {
          if (ability.name.includes("Escudo")) {
            setBotBuff((buf) => ({ ...buf, def: buf.def + ability.power }));
            setBattleLog((log) => [...log, { text: `${attacker.name} usou ${ability.icon} ${ability.name}! DEF +${ability.power}`, type: "bot" }]);
          } else {
            setBotBuff((buf) => ({ ...buf, atk: buf.atk + ability.power }));
            setBattleLog((log) => [...log, { text: `${attacker.name} usou ${ability.icon} ${ability.name}! ATK +${ability.power}`, type: "bot" }]);
          }
        }
        // Visual feedback for buffs
        addFloatingNumber(ability.power, "heal", isPlayer ? "player" : "bot");
      } else {
        const effectiveAtk = isPlayer
          ? { ...attacker, atk: attacker.atk + playerBuff.atk }
          : { ...attacker, atk: attacker.atk + botBuff.atk };
        const effectiveDef = isPlayer
          ? { ...defender, def: defender.def + botBuff.def }
          : { ...defender, def: defender.def + playerBuff.def };

        const { damage, isCrit, isDodge } = calcDamage(effectiveAtk, effectiveDef, ability, isPlayer, difficulty);

        if (isDodge) {
          addFloatingNumber(0, "dodge", isPlayer ? "bot" : "player");
          setBattleLog((log) => [
            ...log,
            { text: `${defender.name} esquivou do ${ability.name}!`, type: isPlayer ? "player" : "bot", isDodge: true },
          ]);
          if (isPlayer) {
            setStats((s) => ({ ...s, dodges: s.dodges + 1 }));
          }
        } else {
          // Floating damage number
          addFloatingNumber(damage, isCrit ? "crit" : "damage", isPlayer ? "bot" : "player");
          // Screen shake on hit
          triggerShake();
          // Hit flash on the target
          triggerHitFlash(isPlayer ? "bot" : "player");

          const critText = isCrit ? " \u2B50 CR\u00CDTICO!" : "";
          if (isPlayer) {
            setBot((b) => (b ? { ...b, hp: Math.max(0, b.hp - damage) } : b));
            setStats((s) => ({ ...s, damageDealt: s.damageDealt + damage, critsLanded: s.critsLanded + (isCrit ? 1 : 0) }));
          } else {
            setPlayer((p) => (p ? { ...p, hp: Math.max(0, p.hp - damage) } : p));
            setStats((s) => ({ ...s, damageTaken: s.damageTaken + damage, critsReceived: s.critsReceived + (isCrit ? 1 : 0) }));
          }
          setBattleLog((log) => [
            ...log,
            {
              text: `${attacker.name} usou ${ability.icon} ${ability.name} e causou ${damage} de dano!${critText}`,
              type: isPlayer ? "player" : "bot",
              isCrit,
            },
          ]);
        }
      }

      setTimeout(() => {
        setBot((currentBot) => {
          setPlayer((currentPlayer) => {
            const defHp = isPlayer ? currentBot?.hp ?? 0 : currentPlayer?.hp ?? 0;
            if (defHp <= 0) {
              setBattleLog((log) => [...log, { text: `${isPlayer ? currentBot?.name : currentPlayer?.name} foi derrotado!`, type: "system" }]);
              endRound(isPlayer ? "player" : "bot");
            } else if (isPlayer) {
              setPlayerTurn(false);
              if (currentBot) {
                setBot((b) => (b ? { ...b, mana: Math.min(b.maxMana, b.mana + MANA_REGEN) } : b));
                botActRef.current({ ...currentBot, mana: Math.min(currentBot.maxMana, currentBot.mana + MANA_REGEN) }, currentPlayer!);
              }
            } else {
              setPlayerTurn(true);
              if (currentPlayer) {
                setPlayer((p) => (p ? { ...p, mana: Math.min(p.maxMana, p.mana + MANA_REGEN) } : p));
              }
            }
            return currentPlayer;
          });
          return currentBot;
        });
      }, 800);
    },
    [playerBuff, botBuff, difficulty, endRound, addFloatingNumber, triggerShake, triggerHitFlash],
  );

  // Bot AI
  const botAct = useCallback(
    (b: Fighter, p: Fighter) => {
      if (botActing.current) return;
      botActing.current = true;

      const bDef = getClassDef(b.className);
      const hpPct = b.hp / b.maxHp;
      let chosenAbility: Ability;

      if (difficulty === "facil") {
        const usable = bDef.abilities.filter((a) => b.mana >= a.manaCost);
        chosenAbility = usable.length ? usable[Math.floor(Math.random() * usable.length)] : bDef.abilities[0];
      } else if (difficulty === "medio") {
        if (hpPct < 0.35) {
          const healAbility = bDef.abilities.find((a) => a.type === "cura");
          const buffAbilities = bDef.abilities.filter((a) => a.type === "buff");
          if (healAbility && b.mana >= healAbility.manaCost) {
            chosenAbility = healAbility;
          } else if (buffAbilities.length && b.mana >= buffAbilities[0].manaCost) {
            chosenAbility = buffAbilities[Math.floor(Math.random() * buffAbilities.length)];
          } else {
            const usable = bDef.abilities.filter((a) => b.mana >= a.manaCost);
            chosenAbility = usable.length ? usable[Math.floor(Math.random() * usable.length)] : bDef.abilities[0];
          }
        } else {
          const attacks = bDef.abilities.filter((a) => a.type === "ataque" || a.type === "especial");
          const usable = attacks.filter((a) => b.mana >= a.manaCost);
          chosenAbility = usable.length ? usable[Math.floor(Math.random() * usable.length)] : bDef.abilities[0];
        }
      } else {
        if (hpPct < 0.4) {
          const healAbility = bDef.abilities.find((a) => a.type === "cura");
          if (healAbility && b.mana >= healAbility.manaCost) {
            chosenAbility = healAbility;
          } else {
            const usable = bDef.abilities.filter((a) => (a.type === "ataque" || a.type === "especial") && b.mana >= a.manaCost);
            chosenAbility = usable.length ? usable.reduce((best, a) => (a.power > best.power ? a : best)) : bDef.abilities[0];
          }
        } else if (p.hp / p.maxHp < 0.3) {
          const specials = bDef.abilities.filter((a) => a.type === "especial" && b.mana >= a.manaCost);
          chosenAbility = specials.length ? specials[0] : bDef.abilities[0];
        } else {
          const usable = bDef.abilities.filter((a) => (a.type === "ataque" || a.type === "especial") && b.mana >= a.manaCost);
          chosenAbility = usable.length ? usable.reduce((best, a) => (a.power > best.power ? a : best)) : bDef.abilities[0];
        }
      }

      setTimeout(() => {
        executeAbility(b, p, chosenAbility, false);
        botActing.current = false;
      }, 1200);
    },
    [difficulty, executeAbility],
  );

  botActRef.current = botAct;

  const handleAbility = useCallback(
    (abilityIdx: number) => {
      if (!playerTurn || !player || !bot) return;
      const pDef = getClassDef(player.className);
      const ability = pDef.abilities[abilityIdx];
      if (player.mana < ability.manaCost) return;

      setPlayerTurn(false);
      executeAbility(player, bot, ability, true);
    },
    [player, bot, playerTurn, executeAbility],
  );

  // ===== RENDER: MENU =====
  if (phase === "menu") {
    return (
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-5xl mb-3"
          >
            \u2694\uFE0F
          </motion.div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent">
            RPG Arena Battle
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Escolha sua classe e enfrente o bot!</p>
        </div>

        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Dificuldade
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["facil", "medio", "dificil"] as Difficulty[]).map((d) => (
              <motion.button
                key={d}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDifficulty(d)}
                className={cn(
                  "py-2 px-3 rounded-xl text-sm font-bold transition-all border-2",
                  difficulty === d
                    ? "border-transparent text-white shadow-lg bg-gradient-to-r " + DIFFICULTY_COLORS[d]
                    : "border-border bg-card text-muted-foreground hover:border-primary/30",
                )}
              >
                {DIFFICULTY_LABELS[d]}
              </motion.button>
            ))}
          </div>
        </div>

        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
          Escolha sua Classe
        </p>
        <div className="grid grid-cols-2 gap-3">
          {CLASS_DEFS.map((cls) => (
            <motion.div
              key={cls.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedClass(cls.id)}
              className={cn(
                "relative cursor-pointer rounded-2xl p-4 border-2 transition-all overflow-hidden",
                selectedClass === cls.id
                  ? "border-primary shadow-lg shadow-primary/20"
                  : "border-border bg-card hover:border-primary/30",
              )}
            >
              {selectedClass === cls.id && (
                <motion.div
                  layoutId="selectedClass"
                  className={cn("absolute inset-0 bg-gradient-to-br opacity-10", cls.gradient)}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <div className="relative z-10">
                <div className="text-3xl mb-1">{cls.emoji}</div>
                <h3 className={cn("font-bold text-sm", cls.color)}>{cls.name}</h3>
                <div className="grid grid-cols-2 gap-1 mt-2 text-[10px] text-muted-foreground">
                  <span>\u2764\uFE0F {cls.hp}</span>
                  <span>\u2694\uFE0F {cls.atk}</span>
                  <span>\uD83D\uDEE1\uFE0F {cls.def}</span>
                  <span>\u26A1 {cls.spd}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {playerLevel > 1 && (
          <div className="mt-4 text-center">
            <Badge variant="outline" className="gap-1">
              <Star className="h-3 w-3" /> N\u00EDvel {playerLevel}
            </Badge>
          </div>
        )}

        <div className="mt-6">
          <Button
            onClick={startMatch}
            disabled={!selectedClass}
            className={cn(
              "w-full py-6 text-lg font-bold text-white shadow-lg hover:shadow-xl transition-all",
              "bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <Swords className="mr-2 h-5 w-5" />
            Iniciar Batalha
          </Button>
        </div>
      </div>
    );
  }

  // ===== RENDER: BATTLE =====
  if (phase === "battle" && player && bot) {
    const pClass = getClassDef(player.className);
    const bClass = getClassDef(bot.className);
    const pHpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    const bHpPct = Math.max(0, (bot.hp / bot.maxHp) * 100);
    const pMpPct = Math.max(0, (player.mana / player.maxMana) * 100);
    const bMpPct = Math.max(0, (bot.mana / bot.maxMana) * 100);

    return (
      <motion.div
        className="max-w-lg mx-auto"
        animate={
          shake
            ? { x: [0, -6, 6, -4, 4, -2, 2, 0], y: [0, -2, 2, -1, 1, 0, 0, 0] }
            : { x: 0, y: 0 }
        }
        transition={{ duration: 0.45 }}
      >
        {/* Round indicator */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-xs">
            Rodada {round} \u2022 Melhor de 3
          </Badge>
          <div className="flex gap-1">
            {Array.from({ length: ROUNDS_TO_WIN }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  i < playerRounds ? "bg-green-500 shadow-sm shadow-green-500/50" : "bg-muted",
                )}
              />
            ))}
            <span className="text-xs text-muted-foreground mx-1">vs</span>
            {Array.from({ length: ROUNDS_TO_WIN }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  i < botRounds ? "bg-red-500 shadow-sm shadow-red-500/50" : "bg-muted",
                )}
              />
            ))}
          </div>
          <Badge variant="outline" className="text-xs">
            Nv.{playerLevel}
          </Badge>
        </div>

        {/* Fighter cards */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Player card */}
          <motion.div
            animate={turnAnim && playerTurn ? { x: [0, 10, 0] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Card className={cn(
              "overflow-hidden border-2 transition-all duration-300",
              playerTurn
                ? "border-green-500/60 shadow-lg shadow-green-500/20"
                : "border-border",
              hitFlash === "player" && "ring-2 ring-red-500/80 ring-offset-1 ring-offset-transparent",
            )}>
              <CardContent className={cn("p-3 bg-gradient-to-br relative", pClass.gradient, "bg-opacity-15")}>
                <motion.div
                  animate={hitFlash === "player" ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <motion.span
                      className="text-2xl drop-shadow-lg"
                      animate={playerTurn ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {pClass.emoji}
                    </motion.span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{player.name}</p>
                      <p className="text-[10px] text-white/70">{pClass.name} Nv.{playerLevel}</p>
                    </div>
                    {playerBuff.atk > 0 && (
                      <motion.div
                        initial={{ scale: 0, x: 10 }}
                        animate={{ scale: 1, x: 0 }}
                      >
                        <Badge className="text-[9px] bg-red-500/80 text-white border-0 px-1 py-0">
                          ATK+{playerBuff.atk}
                        </Badge>
                      </motion.div>
                    )}
                    {playerBuff.def > 0 && (
                      <motion.div
                        initial={{ scale: 0, x: 10 }}
                        animate={{ scale: 1, x: 0 }}
                      >
                        <Badge className="text-[9px] bg-blue-500/80 text-white border-0 px-1 py-0">
                          DEF+{playerBuff.def}
                        </Badge>
                      </motion.div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Heart className="h-3 w-3 text-red-400 shrink-0" />
                      <div className="flex-1 h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                        <motion.div
                          className={cn("h-full bg-gradient-to-r rounded-full", hpBarColor(pHpPct))}
                          style={{ boxShadow: `0 0 8px ${pHpPct > 60 ? 'rgba(34,197,94,0.5)' : pHpPct > 30 ? 'rgba(234,179,8,0.5)' : 'rgba(239,68,68,0.6)'}` }}
                          animate={{ width: `${pHpPct}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                      <motion.span
                        key={player.hp}
                        initial={{ scale: 1.3, color: pHpPct < 30 ? "#f87171" : "#fff" }}
                        animate={{ scale: 1, color: pHpPct < 30 ? "#fca5a5" : "rgba(255,255,255,0.8)" }}
                        transition={{ duration: 0.3 }}
                        className="text-[10px] w-12 text-right font-mono"
                      >
                        {player.hp}/{player.maxHp}
                      </motion.span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-blue-400 shrink-0" />
                      <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                          style={{ boxShadow: "0 0 6px rgba(59,130,246,0.4)" }}
                          animate={{ width: `${pMpPct}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-[10px] text-white/80 w-12 text-right font-mono">{player.mana}/{player.maxMana}</span>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Bot card */}
          <motion.div
            animate={turnAnim && !playerTurn ? { x: [0, -10, 0] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Card className={cn(
              "overflow-hidden border-2 transition-all duration-300",
              !playerTurn
                ? "border-red-500/60 shadow-lg shadow-red-500/20"
                : "border-border",
              hitFlash === "bot" && "ring-2 ring-red-500/80 ring-offset-1 ring-offset-transparent",
            )}>
              <CardContent className={cn("p-3 bg-gradient-to-br relative", bClass.gradient, "bg-opacity-15")}>
                <motion.div
                  animate={hitFlash === "bot" ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <motion.span
                      className="text-2xl drop-shadow-lg"
                      animate={!playerTurn ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {bClass.emoji}
                    </motion.span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{bot.name}</p>
                      <p className="text-[10px] text-white/70">{bClass.name} Nv.{bot.level}</p>
                    </div>
                    {botBuff.atk > 0 && (
                      <motion.div initial={{ scale: 0, x: 10 }} animate={{ scale: 1, x: 0 }}>
                        <Badge className="text-[9px] bg-red-500/80 text-white border-0 px-1 py-0">
                          ATK+{botBuff.atk}
                        </Badge>
                      </motion.div>
                    )}
                    {botBuff.def > 0 && (
                      <motion.div initial={{ scale: 0, x: 10 }} animate={{ scale: 1, x: 0 }}>
                        <Badge className="text-[9px] bg-blue-500/80 text-white border-0 px-1 py-0">
                          DEF+{botBuff.def}
                        </Badge>
                      </motion.div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Heart className="h-3 w-3 text-red-400 shrink-0" />
                      <div className="flex-1 h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                        <motion.div
                          className={cn("h-full bg-gradient-to-r rounded-full", hpBarColor(bHpPct))}
                          style={{ boxShadow: `0 0 8px ${bHpPct > 60 ? 'rgba(34,197,94,0.5)' : bHpPct > 30 ? 'rgba(234,179,8,0.5)' : 'rgba(239,68,68,0.6)'}` }}
                          animate={{ width: `${bHpPct}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                      <motion.span
                        key={bot.hp}
                        initial={{ scale: 1.3, color: bHpPct < 30 ? "#f87171" : "#fff" }}
                        animate={{ scale: 1, color: bHpPct < 30 ? "#fca5a5" : "rgba(255,255,255,0.8)" }}
                        transition={{ duration: 0.3 }}
                        className="text-[10px] w-12 text-right font-mono"
                      >
                        {bot.hp}/{bot.maxHp}
                      </motion.span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-blue-400 shrink-0" />
                      <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                          style={{ boxShadow: "0 0 6px rgba(59,130,246,0.4)" }}
                          animate={{ width: `${bMpPct}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-[10px] text-white/80 w-12 text-right font-mono">{bot.mana}/{bot.maxMana}</span>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Battle arena visual */}
        <div className="relative h-36 rounded-2xl bg-gradient-to-b from-indigo-950/50 to-purple-950/60 border border-white/5 mb-3 overflow-hidden">
          {/* Ground gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(120,80,255,0.12),transparent_70%)]" />
          {/* Grid lines for depth */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }} />

          {/* Player character aura */}
          <motion.div
            className="absolute left-8 bottom-6"
            animate={turnAnim && playerTurn ? { x: [0, 30, 0], y: [0, -12, 0] } : { y: [0, -2, 0] }}
            transition={{ duration: turnAnim && playerTurn ? 0.4 : 2, repeat: turnAnim && playerTurn ? 0 : Infinity }}
          >
            <div className="relative">
              <div className={cn(
                "absolute -inset-4 rounded-full blur-xl opacity-40 bg-gradient-to-br",
                pClass.gradient,
              )} />
              <motion.span
                className="text-5xl relative z-10 drop-shadow-lg"
                animate={playerTurn ? { filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {pClass.emoji}
              </motion.span>
              {/* Idle glow pulse */}
              <motion.div
                className={cn("absolute -inset-2 rounded-full border-2 opacity-0", `border-green-500/40`)}
                animate={playerTurn ? { opacity: [0, 0.6, 0], scale: [0.8, 1.3, 0.8] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </motion.div>

          {/* Bot character aura */}
          <motion.div
            className="absolute right-8 bottom-6"
            animate={turnAnim && !playerTurn ? { x: [0, -30, 0], y: [0, -12, 0] } : { y: [0, -2, 0] }}
            transition={{ duration: turnAnim && !playerTurn ? 0.4 : 2, repeat: turnAnim && !playerTurn ? 0 : Infinity, delay: 0.5 }}
          >
            <div className="relative">
              <div className={cn(
                "absolute -inset-4 rounded-full blur-xl opacity-40 bg-gradient-to-br",
                bClass.gradient,
              )} />
              <motion.span
                className="text-5xl relative z-10 drop-shadow-lg"
                animate={!playerTurn ? { filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {bClass.emoji}
              </motion.span>
              <motion.div
                className="absolute -inset-2 rounded-full border-2 opacity-0 border-red-500/40"
                animate={!playerTurn ? { opacity: [0, 0.6, 0], scale: [0.8, 1.3, 0.8] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </motion.div>

          {/* VS text */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-black text-white/10 select-none"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            VS
          </motion.div>

          {/* Clash effect on attack */}
          <AnimatePresence>
            {turnAnim && (
              <motion.div
                className="absolute top-4 left-1/2 -translate-x-1/2"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 1, 0], scale: [0, 1.2, 1.5, 2] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="relative">
                  <Sparkles className="h-8 w-8 text-yellow-400" />
                  <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: 180 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Sparkles className="h-8 w-8 text-orange-400" />
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enemy acting indicator */}
          <AnimatePresence>
            {!playerTurn && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-2 right-3 text-[10px] text-red-400 font-bold flex items-center gap-1"
              >
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-red-500"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
                INIMIGO AGINDO...
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating damage numbers */}
          <AnimatePresence>
            {floatingNumbers.map((num) => (
              <FloatingDmgNumber key={num.id} num={num} />
            ))}
          </AnimatePresence>
        </div>

        {/* Abilities */}
        <div className="mb-3">
          <motion.p
            className={cn(
              "text-[10px] font-semibold mb-2 uppercase tracking-wider flex items-center gap-1.5",
              playerTurn ? "text-green-400" : "text-muted-foreground",
            )}
            animate={playerTurn ? { opacity: [0.6, 1, 0.6] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {playerTurn ? "\u2705 Sua vez!" : "\u23F3 Aguarde..."}
          </motion.p>
          <div className="grid grid-cols-2 gap-2">
            {pClass.abilities.map((ab, idx) => {
              const canUse = playerTurn && player.mana >= ab.manaCost;
              const manaPct = player.maxMana > 0 ? player.mana / player.maxMana : 0;
              const affordablePct = player.maxMana > 0 ? Math.min(1, player.mana / ab.manaCost) : 0;
              return (
                <motion.button
                  key={ab.name}
                  whileHover={canUse ? { scale: 1.04, y: -2 } : {}}
                  whileTap={canUse ? { scale: 0.96 } : {}}
                  disabled={!canUse}
                  onClick={() => handleAbility(idx)}
                  className={cn(
                    "relative rounded-xl p-2.5 text-left border-2 transition-all overflow-hidden",
                    canUse
                      ? "border-primary/40 bg-card hover:border-primary hover:shadow-lg hover:shadow-primary/20 cursor-pointer"
                      : "border-border bg-card/50 cursor-not-allowed",
                  )}
                >
                  {/* Cooldown overlay when not player turn */}
                  {!playerTurn && (
                    <motion.div
                      className="absolute inset-0 bg-black/40 z-20 flex items-center justify-center rounded-xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap className="h-4 w-4 text-yellow-500/60" />
                      </motion.div>
                    </motion.div>
                  )}
                  {/* Mana-insufficient overlay */}
                  {playerTurn && player.mana < ab.manaCost && (
                    <div className="absolute inset-0 bg-black/30 z-20 rounded-xl flex items-center justify-center">
                      <span className="text-[10px] text-red-400 font-bold">Sem mana</span>
                    </div>
                  )}
                  {/* Mana cost radial indicator */}
                  {canUse && (
                    <svg className="absolute bottom-0 right-0 w-6 h-6 z-10 opacity-40" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500/30" />
                      <circle
                        cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"
                        className="text-blue-400"
                        strokeDasharray={`${affordablePct * 62.83} 62.83`}
                        transform="rotate(-90 12 12)"
                      />
                    </svg>
                  )}
                  <div className={cn("relative z-10", !canUse && "opacity-50")}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <motion.span
                        className="text-lg"
                        animate={canUse ? { y: [0, -1, 0] } : {}}
                        transition={{ duration: 2, repeat: Infinity, delay: idx * 0.3 }}
                      >
                        {ab.icon}
                      </motion.span>
                      <span className="text-xs font-bold truncate">{ab.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={cn(
                        "font-semibold",
                        ab.type === "cura" && "text-green-500",
                        ab.type === "buff" && "text-blue-500",
                        ab.type === "especial" && "text-amber-500",
                        ab.type === "ataque" && "text-red-500",
                      )}>
                        {ab.type === "ataque" ? "ATK" : ab.type === "cura" ? "HEAL" : ab.type === "buff" ? "BUFF" : "SPEC"}
                      </span>
                      <span className="text-muted-foreground">\uD83D\uDD36 {ab.manaCost}</span>
                      <span className="text-muted-foreground/60 ml-auto">PWR {ab.power}</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Battle log */}
        <Card className={cn(
          "border-border/50 overflow-hidden",
        )}>
          <div className={cn(
            "h-1.5 bg-gradient-to-r",
            battleLog.length > 0 && battleLog[battleLog.length - 1].type === "player"
              ? "from-green-500/60 to-transparent"
              : battleLog.length > 0 && battleLog[battleLog.length - 1].type === "bot"
              ? "from-red-500/60 to-transparent"
              : "from-purple-500/40 to-transparent",
          )} />
          <CardContent className="p-2">
            <div ref={logRef} className="h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              <AnimatePresence initial={false}>
                {battleLog.map((entry, i) => {
                  const isLast = i === battleLog.length - 1;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: entry.type === "player" ? -20 : entry.type === "bot" ? 20 : 0, height: 0 }}
                      animate={{ opacity: isLast ? 1 : 0.7, x: 0, height: "auto" }}
                      className={cn(
                        "text-[11px] px-2.5 py-1.5 rounded-lg backdrop-blur-sm border transition-all",
                        entry.type === "player" && "bg-green-500/10 text-green-300 border-green-500/10",
                        entry.type === "bot" && "bg-red-500/10 text-red-300 border-red-500/10",
                        entry.type === "system" && "bg-white/5 text-muted-foreground italic border-white/5",
                        entry.isCrit && "font-bold !text-yellow-400 !bg-yellow-500/10 !border-yellow-500/20",
                        entry.isDodge && "font-bold !text-blue-400 !bg-blue-500/10 !border-blue-500/20",
                        isLast && "shadow-sm",
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        {entry.type === "player" && <Swords className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />}
                        {entry.type === "bot" && <Skull className="h-3 w-3 mt-0.5 text-red-500 shrink-0" />}
                        {entry.type === "system" && <Sparkles className="h-3 w-3 mt-0.5 text-purple-500 shrink-0" />}
                        <span className="leading-tight">{entry.text}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ===== RENDER: ROUND END =====
  if (phase === "roundEnd" && player && bot) {
    const roundWinner = playerRounds > (round > 1 ? playerRounds - 1 : 0);
    const pClass = getClassDef(player.className);
    const bClass = getClassDef(bot.className);
    return (
      <div className="max-w-lg mx-auto text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
          className="mb-4"
        >
          <div className="relative inline-block">
            <motion.div
              animate={roundWinner ? { scale: [1, 1.2, 1] } : { y: [0, -5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-6xl mb-2"
            >
              {roundWinner ? "\uD83C\uDFC6" : "\uD83D\uDE1E"}
            </motion.div>
            {/* Glow behind icon */}
            <motion.div
              className={cn(
                "absolute inset-0 rounded-full blur-2xl -z-10",
                roundWinner ? "bg-amber-400/30" : "bg-red-500/20",
              )}
              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <motion.h3
            className={cn("text-2xl font-black mb-2", roundWinner ? "text-green-400" : "text-red-400")}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {roundWinner ? "Vit\u00F3ria na Rodada!" : "Derrota na Rodada!"}
          </motion.h3>
          <motion.p
            className="text-sm text-muted-foreground mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Placar: {playerRounds} - {botRounds}
          </motion.p>
        </motion.div>

        {/* Score display */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
          className="flex justify-center items-center gap-8 mb-6"
        >
          <motion.div
            className={cn("text-center p-3 rounded-xl", roundWinner && "bg-green-500/10 border border-green-500/20")}
            animate={roundWinner ? { y: [0, -4, 0] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <div className="text-4xl mb-2">{pClass.emoji}</div>
            <p className="text-lg font-black text-green-400">{playerRounds}</p>
          </motion.div>
          <motion.div
            className="text-3xl font-black text-muted-foreground"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            \u00D7
          </motion.div>
          <motion.div
            className={cn("text-center p-3 rounded-xl", !roundWinner && "bg-red-500/10 border border-red-500/20")}
            animate={!roundWinner ? { y: [0, -4, 0] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <div className="text-4xl mb-2">{bClass.emoji}</div>
            <p className="text-lg font-black text-red-400">{botRounds}</p>
          </motion.div>
        </motion.div>

        <motion.p
          className="text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.8 }}
        >
          Pr\u00F3xima rodada em breve...
        </motion.p>
      </div>
    );
  }

  // ===== RENDER: MATCH END =====
  if (phase === "matchEnd" && player) {
    const won = playerRounds >= ROUNDS_TO_WIN;
    const pClass = getClassDef(player.className);
    const confettiColors = ["bg-amber-400", "bg-green-400", "bg-blue-400", "bg-pink-400", "bg-purple-400", "bg-red-400", "bg-yellow-300"];
    return (
      <div className="max-w-lg mx-auto relative overflow-hidden">
        {/* Confetti for victory */}
        {won && (
          <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <ConfettiParticle
                key={i}
                delay={Math.random() * 1.5}
                color={confettiColors[i % confettiColors.length]}
                x={Math.random() * 100}
              />
            ))}
          </div>
        )}

        {/* Dark vignette for defeat */}
        {!won && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{
              background: "radial-gradient(ellipse at center, transparent 30%, rgba(127,29,29,0.3) 100%)",
            }}
          />
        )}

        <div className="relative z-10">
          <motion.div
            initial={{ scale: 0, rotate: won ? -180 : 0 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
            className="text-center mb-6"
          >
            <motion.div
              animate={won
                ? { y: [0, -10, 0], rotate: [0, -5, 5, -5, 0] }
                : { y: [0, 3, 0], opacity: [0.8, 1, 0.8] }
              }
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              className="relative inline-block"
            >
              <div className="text-7xl mb-3">{won ? "\uD83C\uDFC6" : "\uD83D\uDC80"}</div>
              {/* Glow behind trophy/skull */}
              <motion.div
                className={cn(
                  "absolute inset-0 rounded-full blur-3xl -z-10",
                  won ? "bg-amber-400/40" : "bg-red-600/30",
                )}
                animate={{ scale: [0.7, 1.3, 0.7], opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </motion.div>
            <motion.h2
              className={cn(
                "text-3xl font-black mb-1",
                won
                  ? "bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent"
                  : "text-red-400",
              )}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {won ? "VIT\u00D3RIA!" : "DERROTA"}
            </motion.h2>
            <motion.p
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {won ? "Voc\u00EA dominou a arena!" : "O inimigo foi mais forte..."}
            </motion.p>
          </motion.div>

          {/* Level up banner */}
          {leveledUp && (
            <motion.div
              initial={{ opacity: 0, y: -30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.8, type: "spring", bounce: 0.5 }}
              className="mb-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 p-4 text-center relative overflow-hidden"
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative z-10">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <motion.span
                    animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.6, delay: 1 }}
                  >
                    <Star className="h-6 w-6 text-amber-400" />
                  </motion.span>
                  <span className="font-black text-xl text-amber-300 tracking-wider">LEVEL UP!</span>
                  <motion.span
                    animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.6, delay: 1 }}
                  >
                    <Star className="h-6 w-6 text-amber-400" />
                  </motion.span>
                </div>
                <motion.p
                  className="text-amber-200"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  N\u00EDvel {playerLevel - 1} \u2192{" "}
                  <span className="font-black text-2xl text-amber-100">{playerLevel}</span>
                </motion.p>
                <p className="text-[10px] text-amber-300/70 mt-2 tracking-wide">
                  HP +5 \u2022 ATK +2 \u2022 DEF +1 \u2022 SPD +1
                </p>
              </div>
            </motion.div>
          )}

          {/* Stats grid */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="rounded-xl bg-gradient-to-br from-card to-card/50 border border-border p-4 mb-4"
          >
            <h3 className="text-sm font-bold text-center mb-3 text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-2">
              <Trophy className="h-4 w-4" />
              Estat\u00EDsticas da Partida
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={<Flame className="h-4 w-4 text-red-500" />} label="Dano Causado" value={stats.damageDealt.toString()} />
              <StatCard icon={<Shield className="h-4 w-4 text-blue-500" />} label="Dano Recebido" value={stats.damageTaken.toString()} />
              <StatCard icon={<Star className="h-4 w-4 text-amber-500" />} label="Cr\u00EDticos" value={`${stats.critsLanded} landed / ${stats.critsReceived} recv`} />
              <StatCard icon={<Target className="h-4 w-4 text-purple-500" />} label="Habilidades" value={stats.abilitiesUsed.toString()} />
              <StatCard icon={<Ghost className="h-4 w-4 text-blue-400" />} label="Esquivas" value={stats.dodges.toString()} />
              <StatCard icon={<Heart className="h-4 w-4 text-green-500" />} label="Curas" value={stats.heals.toString()} />
            </div>
            <div className="mt-3 pt-3 border-t border-border/50 flex justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" /> XP: +{xpGained}</span>
              <span>\u2022</span>
              <span>Rodadas: {playerRounds}/{round}</span>
            </div>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            className="flex gap-3"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0 }}
          >
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => {
                  resetStats();
                  setPhase("menu");
                }}
                variant="outline"
                className="w-full h-12"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Menu
              </Button>
            </motion.div>
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => {
                  resetStats();
                  initBattle(player.className, playerLevel, difficulty);
                }}
                className={cn(
                  "w-full h-12 text-white font-bold bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700 shadow-lg shadow-amber-500/20",
                )}
              >
                <Play className="mr-2 h-4 w-4" />
                Jogar Novamente
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
};

// ===== STAT CARD SUB-COMPONENT =====

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="flex items-center gap-2 rounded-lg bg-background/50 p-2.5 border border-border/30 hover:border-border/60 transition-colors"
    >
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-bold truncate">{value}</p>
      </div>
    </motion.div>
  );
}

export default RpgArenaBattle;
