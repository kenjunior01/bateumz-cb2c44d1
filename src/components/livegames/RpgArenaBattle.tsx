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

const BOT_NAMES = ["Drakthar", "Morgana", "Sombra", "Valqu\u00EDria", "Necromante", "Fênix"];

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
      } else {
        const effectiveAtk = isPlayer
          ? { ...attacker, atk: attacker.atk + playerBuff.atk }
          : { ...attacker, atk: attacker.atk + botBuff.atk };
        const effectiveDef = isPlayer
          ? { ...defender, def: defender.def + botBuff.def }
          : { ...defender, def: defender.def + playerBuff.def };

        const { damage, isCrit, isDodge } = calcDamage(effectiveAtk, effectiveDef, ability, isPlayer, difficulty);

        if (isDodge) {
          setBattleLog((log) => [
            ...log,
            { text: `${defender.name} esquivou do ${ability.name}!`, type: isPlayer ? "player" : "bot", isDodge: true },
          ]);
          if (isPlayer) {
            setStats((s) => ({ ...s, dodges: s.dodges + 1 }));
          }
        } else {
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
    [playerBuff, botBuff, difficulty, endRound],
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
      <div className="max-w-lg mx-auto">
        // Round indicator
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="text-xs">
            Rodada {round} \u2022 Melhor de 3
          </Badge>
          <div className="flex gap-1">
            {Array.from({ length: ROUNDS_TO_WIN }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  i < playerRounds ? "bg-green-500" : "bg-muted",
                )}
              />
            ))}
            <span className="text-xs text-muted-foreground mx-1">vs</span>
            {Array.from({ length: ROUNDS_TO_WIN }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  i < botRounds ? "bg-red-500" : "bg-muted",
                )}
              />
            ))}
          </div>
          <Badge variant="outline" className="text-xs">
            Nv.{playerLevel}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          // Player card
          <motion.div
            animate={turnAnim && playerTurn ? { x: [0, 10, 0] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Card className={cn("overflow-hidden border-2", playerTurn ? "border-green-500/60" : "border-border")}>
              <CardContent className={cn("p-3 bg-gradient-to-br", pClass.gradient, "bg-opacity-10")}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{pClass.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{player.name}</p>
                    <p className="text-[10px] text-white/70">{pClass.name} Nv.{playerLevel}</p>
                  </div>
                  {playerBuff.atk > 0 && (
                    <Badge className="text-[9px] bg-red-500/80 text-white border-0 px-1 py-0">
                      ATK+{playerBuff.atk}
                    </Badge>
                  )}
                  {playerBuff.def > 0 && (
                    <Badge className="text-[9px] bg-blue-500/80 text-white border-0 px-1 py-0">
                      DEF+{playerBuff.def}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Heart className="h-3 w-3 text-red-400 shrink-0" />
                    <div className="flex-1 h-2.5 bg-black/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                        animate={{ width: `${pHpPct}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="text-[10px] text-white/80 w-12 text-right">{player.hp}/{player.maxHp}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-blue-400 shrink-0" />
                    <div className="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                        animate={{ width: `${pMpPct}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="text-[10px] text-white/80 w-12 text-right">{player.mana}/{player.maxMana}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          // Bot card
          <motion.div
            animate={turnAnim && !playerTurn ? { x: [0, -10, 0] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Card className={cn("overflow-hidden border-2", !playerTurn ? "border-red-500/60" : "border-border")}>
              <CardContent className={cn("p-3 bg-gradient-to-br", bClass.gradient, "bg-opacity-10")}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{bClass.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{bot.name}</p>
                    <p className="text-[10px] text-white/70">{bClass.name} Nv.{bot.level}</p>
                  </div>
                  {botBuff.atk > 0 && (
                    <Badge className="text-[9px] bg-red-500/80 text-white border-0 px-1 py-0">
                      ATK+{botBuff.atk}
                    </Badge>
                  )}
                  {botBuff.def > 0 && (
                    <Badge className="text-[9px] bg-blue-500/80 text-white border-0 px-1 py-0">
                      DEF+{botBuff.def}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Heart className="h-3 w-3 text-red-400 shrink-0" />
                    <div className="flex-1 h-2.5 bg-black/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                        animate={{ width: `${bHpPct}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="text-[10px] text-white/80 w-12 text-right">{bot.hp}/{bot.maxHp}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-blue-400 shrink-0" />
                    <div className="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                        animate={{ width: `${bMpPct}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="text-[10px] text-white/80 w-12 text-right">{bot.mana}/{bot.maxMana}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        // Battle arena visual
        <div className="relative h-28 rounded-2xl bg-gradient-to-b from-indigo-950/40 to-purple-950/40 border border-white/5 mb-3 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(120,80,255,0.15),transparent_70%)]" />
          <motion.div
            className="absolute left-8 bottom-4 text-4xl"
            animate={turnAnim && playerTurn ? { x: [0, 30, 0], y: [0, -10, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            {pClass.emoji}
          </motion.div>
          <motion.div
            className="absolute right-8 bottom-4 text-4xl"
            animate={turnAnim && !playerTurn ? { x: [0, -30, 0], y: [0, -10, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
            {bClass.emoji}
          </motion.div>
          {turnAnim && (
            <motion.div
              className="absolute top-4 left-1/2 -translate-x-1/2"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 2] }}
              transition={{ duration: 0.5 }}
            >
              <Sparkles className="h-6 w-6 text-yellow-400" />
            </motion.div>
          )}
          <AnimatePresence>
            {!playerTurn && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-2 right-2 text-[10px] text-red-400 font-bold"
              >
                INIMIGO AGINDO...
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        // Abilities
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground font-semibold mb-1.5 uppercase tracking-wider">
            {playerTurn ? "\u2705 Sua vez!" : "\u23F3 Aguarde..."}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {pClass.abilities.map((ab, idx) => {
              const canUse = playerTurn && player.mana >= ab.manaCost;
              return (
                <motion.button
                  key={ab.name}
                  whileHover={canUse ? { scale: 1.04 } : {}}
                  whileTap={canUse ? { scale: 0.96 } : {}}
                  disabled={!canUse}
                  onClick={() => handleAbility(idx)}
                  className={cn(
                    "relative rounded-xl p-2.5 text-left border-2 transition-all",
                    canUse
                      ? "border-primary/40 bg-card hover:border-primary hover:shadow-md hover:shadow-primary/10 cursor-pointer"
                      : "border-border bg-card/50 opacity-40 cursor-not-allowed",
                  )}
                >
                  {canUse && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent" />
                  )}
                  <div className="relative z-10">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-lg">{ab.icon}</span>
                      <span className="text-xs font-bold truncate">{ab.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className={cn(ab.type === "cura" ? "text-green-500" : ab.type === "buff" ? "text-blue-500" : ab.type === "especial" ? "text-amber-500" : "text-red-500")}>
                        {ab.type === "ataque" ? "Ataque" : ab.type === "cura" ? "Cura" : ab.type === "buff" ? "Buff" : "Especial"}
                      </span>
                      <span>\uD83D\uDD36 {ab.manaCost}</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        // Battle log
        <Card className="border-border/50">
          <CardContent className="p-2">
            <div ref={logRef} className="h-32 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
              <AnimatePresence initial={false}>
                {battleLog.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: entry.type === "player" ? -20 : entry.type === "bot" ? 20 : 0 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "text-[11px] px-2 py-1 rounded-lg",
                      entry.type === "player" && "bg-green-500/10 text-green-300",
                      entry.type === "bot" && "bg-red-500/10 text-red-300",
                      entry.type === "system" && "bg-white/5 text-muted-foreground italic",
                      entry.isCrit && "font-bold text-yellow-400",
                      entry.isDodge && "font-bold text-blue-400",
                    )}
                  >
                    {entry.text}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== RENDER: ROUND END =====
  if (phase === "roundEnd" && player && bot) {
    const roundWinner = playerRounds > (round > 1 ? playerRounds - 1 : 0);
    return (
      <div className="max-w-lg mx-auto text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
          <div className="text-5xl mb-3">{roundWinner ? "\uD83C\uDFC6" : "\uD83D\uDE1E"}</div>
          <h3 className={cn("text-xl font-bold mb-2", roundWinner ? "text-green-400" : "text-red-400")}>
            {roundWinner ? "Vit\u00F3ria na Rodada!" : "Derrota na Rodada!"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Placar: {playerRounds} - {botRounds}
          </p>
          <div className="flex justify-center gap-6">
            <div className="text-center">
              <div className="text-3xl mb-1">{getClassDef(player.className).emoji}</div>
              <p className="text-xs font-bold">{playerRounds}</p>
            </div>
            <div className="text-2xl font-bold text-muted-foreground self-center">\u00D7</div>
            <div className="text-center">
              <div className="text-3xl mb-1">{getClassDef(bot.className).emoji}</div>
              <p className="text-xs font-bold">{botRounds}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 animate-pulse">Pr\u00F3xima rodada em breve...</p>
        </motion.div>
      </div>
    );
  }

  // ===== RENDER: MATCH END =====
  if (phase === "matchEnd" && player) {
    const won = playerRounds >= ROUNDS_TO_WIN;
    const pClass = getClassDef(player.className);
    return (
      <div className="max-w-lg mx-auto">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center mb-6">
          <motion.div
            animate={won ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-6xl mb-3"
          >
            {won ? "\uD83C\uDFC6" : "\uD83D\uDC80"}
          </motion.div>
          <h2 className={cn("text-2xl font-bold mb-1", won ? "bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent" : "text-red-400")}>
            {won ? "VIT\u00D3RIA!" : "DERROTA"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {won ? "Voc\u00EA dominou a arena!" : "O inimigo foi mais forte..."}
          </p>
        </motion.div>

        {leveledUp && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 p-3 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Star className="h-5 w-5 text-amber-400" />
              <span className="font-bold text-amber-300">LEVEL UP!</span>
              <Star className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-sm text-amber-200">
              N\u00EDvel {playerLevel - 1} \u2192 <span className="font-bold text-lg">{playerLevel}</span>
            </p>
            <p className="text-[10px] text-amber-300/70 mt-1">HP +5 \u2022 ATK +2 \u2022 DEF +1 \u2022 SPD +1</p>
          </motion.div>
        )}

        <div className="rounded-xl bg-gradient-to-br from-card to-card/50 border border-border p-4 mb-4">
          <h3 className="text-sm font-bold text-center mb-3 text-muted-foreground uppercase tracking-wider">
            Estat\u00EDsticas da Partida
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={<Flame className="h-4 w-4 text-red-500" />} label="Dano Causado" value={stats.damageDealt.toString()} />
            <StatCard icon={<Shield className="h-4 w-4 text-blue-500" />} label="Dano Recebido" value={stats.damageTaken.toString()} />
            <StatCard icon={<Star className="h-4 w-4 text-amber-500" />} label="Cr\u00EDticos" value={stats.critsLanded.toString()} />
            <StatCard icon={<Target className="h-4 w-4 text-purple-500" />} label="Habilidades" value={stats.abilitiesUsed.toString()} />
            <StatCard icon={<Ghost className="h-4 w-4 text-blue-400" />} label="Esquivas" value={stats.dodges.toString()} />
            <StatCard icon={<Heart className="h-4 w-4 text-green-500" />} label="Curas" value={stats.heals.toString()} />
          </div>
          <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground">
            <span>XP: +{xpGained}</span>
            <span>\u2022</span>
            <span>Rodadas: {playerRounds}/{round}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => {
              resetStats();
              setPhase("menu");
            }}
            variant="outline"
            className="flex-1"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Menu
          </Button>
          <Button
            onClick={() => {
              resetStats();
              initBattle(player.className, playerLevel, difficulty);
            }}
            className={cn(
              "flex-1 text-white bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-600 hover:to-red-700",
            )}
          >
            <Play className="mr-2 h-4 w-4" />
            Jogar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

// ===== STAT CARD SUB-COMPONENT =====

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-background/50 p-2">
      {icon}
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}

export default RpgArenaBattle;
