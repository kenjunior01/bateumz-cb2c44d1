import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Coins, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { playSfx, haptic, unlockAudio } from "@/components/games/kit";
// v73: ESQUIVA — núcleo puro da IA que desvia das balas (testável em Node)
import { decidirEsquiva, ESQUIVA_SKILL, ESQUIVA_DURACAO, ESQUIVA_VEL } from "@/game/space/ia";

interface Props {
  onScore?: (name: string, score: number) => void;
  liveCode?: string;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  brightness: number;
  layer: number;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  phase: number;
}

interface Bullet {
  x: number;
  y: number;
  speed: number;
  owner: 1 | 2;
  trail: Array<{ x: number; y: number }>;
}

interface Enemy {
  x: number;
  y: number;
  speed: number;
  size: number;
  type: "triangle" | "diamond";
  color: string;
  hp: number;
  bonus: boolean;
  rotation: number;
  rotSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  prevX: number;
  prevY: number;
  // v72: TIPOS DE INIMIGO com comportamentos (a IA da guerra espacial)
  kind: EnemyKind;
  hitFlash: number;         // flash branco quando levam dano mas não morrem
  fireCd: number;           // fighter: cadência de tiro
  strafeDir: number;        // fighter: direção de strafe
  targetY: number;          // fighter: altitude de combate
  leaveAt: number;          // fighter: frame em que foge
  dodgeCd: number;          // v73: frames de merger de esquiva restantes
  dodgeDir: number;         // v73: direção de esquiva decidida (-1|0|1)
}

type EnemyKind = "normal" | "scout" | "fighter" | "tank" | "kamikaze" | "splitter";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface PlayerState {
  x: number;
  y: number;
  score: number;
  lives: number;
  color: string;
  bulletColor: string;
  shootCooldown: number;
  invincible: number;
  name: string;
  damageFlash: number;
}

const CANVAS_W = 600;
const CANVAS_H = 500;
const SHIP_SIZE = 18;
const BULLET_SPEED = 7;
const BULLET_COOLDOWN = 12;
const PLAYER_SPEED = 5;
const STAR_COUNT = 180;
const INITIAL_ENEMY_INTERVAL = 60;
const MIN_ENEMY_INTERVAL = 15;
const INITIAL_ENEMY_SPEED = 1.5;
const MAX_ENEMY_SPEED = 4.5;
const BONUS_CHANCE = 0.08;
const WAVE_DURATION = 900;
const POINTS_NORMAL = 10;
const POINTS_BONUS = 30;

// ── v20 PRO: chefes + power-ups (padrão arcade avançado dos líderes) ──
const BOSS_EVERY_WAVES = 4;
const BOSS_Y = 90;
const POWERUP_CHANCE = 0.12;

// ── v72: GUERRA ESPACIAL AVANÇADA — IA, drones, laser, combos ──
const COMBO_JANELA = 120;          // frames para manter o combo vivo
const COMBO_MULT_MAX = 4;          // ×4 no pico
const LASER_DURACAO = 480;         // frames com laser ativo
const LASER_CD = 16;               // cadência do raio
const LASER_LARGURA = 13;          // meia-largura do feixe
const HYPERJUMP_FRAMES = 45;       // estrelas a hiper-velocidade na troca de onda

interface Boss {
  x: number; y: number; hp: number; maxHp: number;
  dir: number; speed: number; fireCd: number; phase: number; entering: boolean;
}
interface PowerUp { x: number; y: number; vy: number; kind: "shield" | "rapid" | "life" | "laser" | "drone"; phase: number; }
interface BossBullet { x: number; y: number; vx: number; vy: number; }
// v72: balas dos FIGHTERS (a IA atira de volta!) + DRONES aliados
interface EnemyBullet { x: number; y: number; vx: number; vy: number; color: string; }
interface Drone { owner: 1 | 2; phase: number; fireCd: number; }

const createStars = (): Star[] => {
  const stars: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const layer = i < 60 ? 0 : i < 120 ? 1 : 2;
    stars.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      speed: (0.1 + Math.random() * 0.4) + layer * 0.5,
      size: 0.3 + layer * 0.5 + Math.random() * (0.5 + layer * 0.4),
      brightness: 0.2 + layer * 0.2 + Math.random() * (0.4 + layer * 0.15),
      layer,
    });
  }
  return stars;
};

const createNebulae = (): Nebula[] => [
  { x: CANVAS_W * 0.2, y: CANVAS_H * 0.3, radius: 120, color: "30, 64, 175", speed: 0.15, phase: 0 },
  { x: CANVAS_W * 0.75, y: CANVAS_H * 0.6, radius: 100, color: "147, 51, 234", speed: 0.1, phase: 2 },
  { x: CANVAS_W * 0.5, y: CANVAS_H * 0.15, radius: 80, color: "6, 182, 212", speed: 0.12, phase: 4 },
];

interface FloatingText {
  x: number; y: number; text: string; color: string; life: number; maxLife: number; vy: number; }

const createExplosion = (x: number, y: number, color: string, isBonus: boolean = false): Particle[] => {
  const count = isBonus ? 40 : 18;
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = (isBonus ? 2 : 1) + Math.random() * (isBonus ? 5 : 3.5);
    const isSpark = Math.random() < 0.3;
    return {
      x, y,
      vx: Math.cos(angle) * speed * (isSpark ? 1.5 : 1),
      vy: Math.sin(angle) * speed * (isSpark ? 1.5 : 1),
      life: (isBonus ? 35 : 20) + Math.random() * 25,
      maxLife: isBonus ? 60 : 45,
      color: isBonus
        ? ["#fbbf24", "#fef08a", "#f59e0b", "#ffffff"][Math.floor(Math.random() * 4)]
        : isSpark
          ? "#ffffff"
          : color,
      size: isSpark ? 1 : (isBonus ? 2 : 1.5) + Math.random() * (isBonus ? 4 : 2.5),
    };
  });
};

const createShockwave = (x: number, y: number, color: string, isBonus: boolean): Shockwave => ({
  x, y,
  radius: 0,
  maxRadius: isBonus ? 60 : 35,
  life: isBonus ? 25 : 15,
  maxLife: isBonus ? 25 : 15,
  color,
});

const createScoreText = (x: number, y: number, points: number, isBonus: boolean): FloatingText => ({
  x, y, text: `+${points}`, color: isBonus ? '#fbbf24' : '#ffffff', life: 40, maxLife: 40, vy: -1.5,
});

interface GameState {
  players: PlayerState[];
  bullets: Bullet[];
  enemies: Enemy[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  shockwaves: Shockwave[];
  stars: Star[];
  nebulae: Nebula[];
  keys: Set<string>;
  frame: number;
  wave: number;
  waveFrame: number;
  running: boolean;
  screenFlash: number;
  killStreaks: [number, number];
  animId: number;
  shakeX: number;
  shakeY: number;
  shakeMagnitude: number;
  vignettePulse: number;
  boss: Boss | null;
  bossBullets: BossBullet[];
  powerUps: PowerUp[];
  rapidUntil: [number, number];
  // v72: nova guerra
  enemyBullets: EnemyBullet[];
  drones: Drone[];
  laserUntil: [number, number];
  laserCd: [number, number];
  comboCount: [number, number];
  comboUntil: [number, number];
  hyperJump: number;
}

const SpaceShooter = ({ onScore, liveCode }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const touchRef = useRef<Record<string, boolean>>({});

  const [gameStatus, setGameStatus] = useState<"idle" | "playing" | "over">("idle");
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [lives, setLives] = useState({ p1: 3, p2: 3 });
  const [wave, setWave] = useState(1);
  const [combo, setCombo] = useState({ p1: 0, p2: 0 });
  const [winner, setWinner] = useState<string | null>(null);
  const [forceTick, setForceTick] = useState(0);
  const [shakeStyle, setShakeStyle] = useState({ x: 0, y: 0 });

  const triggerUI = () => setForceTick((t) => t + 1);

  const endGame = useCallback(
    (p1Score: number, p2Score: number) => {
      setGameStatus("over");
      setScores({ p1: p1Score, p2: p2Score });
      const w = p1Score > p2Score ? "Jogador 1" : p2Score > p1Score ? "Jogador 2" : null;
      setWinner(w);
      onScore?.("Jogador 1", p1Score);
      onScore?.("Jogador 2", p2Score);
      setShakeStyle({ x: 0, y: 0 });
      playSfx(w ? "win" : "lose");
      haptic(w ? [30, 50, 30] : 60);
    },
    [onScore]
  );

  const spawnEnemy = useCallback((g: GameState) => {
    const waveMultiplier = 1 + (g.wave - 1) * 0.15;
    const speed = Math.min(INITIAL_ENEMY_SPEED * waveMultiplier + Math.random() * 0.8, MAX_ENEMY_SPEED);
    const isBonus = Math.random() < BONUS_CHANCE + g.wave * 0.005;
    const type = Math.random() < 0.5 ? ("triangle" as const) : ("diamond" as const);

    // v72: IA da guerra — cada tipo tem um COMPORTAMENTO real:
    // · scout    — rápido, zigue-zague forte (chega antes)
    // · fighter  — desce até a altitude de combate, strafa e ATIRA nos jogadores
    // · tank     — lento, 3 de vida, morte GRANDE + power-up garantido ao morrer
    // · kamikaze — trava no jogador mais perto e mergulha acelerando
    // · splitter — ao morrer divide-se em dois mini-inimigos
    const w = g.wave;
    const roleta: Array<[EnemyKind, number]> = [
      ["normal", 10],
      ["scout", w >= 2 ? 4 + Math.min(3, w) : 0],
      ["fighter", w >= 3 ? 3 + w * 0.3 : 0],
      ["tank", w >= 3 ? 2 + w * 0.2 : 0],
      ["kamikaze", w >= 4 ? 2.5 + w * 0.25 : 0],
      ["splitter", w >= 5 ? 2 + w * 0.2 : 0],
    ];
    const total = roleta.reduce((s, [, p]) => s + p, 0);
    let roll = Math.random() * total;
    let kind: EnemyKind = "normal";
    for (const [k, p] of roleta) {
      roll -= p;
      if (roll <= 0) { kind = k; break; }
    }

    const base: Enemy = {
      x: 30 + Math.random() * (CANVAS_W - 60),
      y: -20,
      speed,
      size: isBonus ? 16 : 12 + Math.random() * 6,
      type,
      color: isBonus ? "#fbbf24" : Math.random() < 0.5 ? "#ef4444" : "#f97316",
      hp: 1,
      bonus: isBonus,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.06,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.03,
      prevX: 30 + Math.random() * (CANVAS_W - 60),
      prevY: -20,
      kind: isBonus ? "normal" : kind,
      hitFlash: 0,
      fireCd: 80 + Math.floor(Math.random() * 60),
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      targetY: 90 + Math.random() * 110,
      leaveAt: 540 + Math.floor(Math.random() * 160),
      dodgeCd: 0,   // v73: a esquiva nasce desligada (o núcleo decide)
      dodgeDir: 0,
    };

    switch (base.kind) {
      case "scout":
        base.size = 10; base.speed = Math.min(speed * 1.75, MAX_ENEMY_SPEED + 1.5);
        base.wobbleSpeed = 0.09; base.color = "#fb7185"; base.type = "triangle";
        base.rotSpeed = 0.12;
        break;
      case "fighter":
        base.size = 13; base.hp = 2; base.speed = 1.6;
        base.color = "#a3e635"; base.type = "diamond";
        break;
      case "tank":
        base.size = 24; base.hp = 3; base.speed = Math.max(0.7, speed * 0.45);
        base.color = "#a855f7"; base.type = "diamond";
        break;
      case "kamikaze":
        base.size = 11; base.speed = 2.2;
        base.color = "#ef4444"; base.type = "triangle"; base.rotSpeed = 0.22;
        break;
      case "splitter":
        base.size = 14; base.hp = 2; base.speed = speed * 0.8;
        base.color = "#38bdf8"; base.type = "diamond";
        break;
    }

    g.enemies.push(base);
  }, []);

  const gameLoop = useCallback(
    (g: GameState) => {
      const canvas = canvasRef.current;
      if (!canvas || !g.running) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      g.frame++;
      g.waveFrame++;

      if (g.waveFrame >= WAVE_DURATION) {
        g.wave++;
        g.waveFrame = 0;
        setWave(g.wave);
        playSfx("powerup");
        // v72: HIPERSALTO — as estrelas disparam e o banner da onda entra
        g.hyperJump = HYPERJUMP_FRAMES;
        g.floatingTexts.push({
          x: CANVAS_W / 2, y: CANVAS_H * 0.4, text: `ONDA ${g.wave}`,
          color: "#fbbf24", life: 70, maxLife: 70, vy: -0.4,
        });
        g.screenFlash = Math.max(g.screenFlash, 8);
      }

      const p1 = g.players[0];
      const p2 = g.players[1];

      // ── v20 PRO: CHEFE a cada 4 ondas — entrada dramática + barra de vida ──
      if (g.wave % BOSS_EVERY_WAVES === 0 && g.waveFrame === 2 && !g.boss) {
        const maxHp = 26 + g.wave * 4;
        g.boss = { x: CANVAS_W / 2, y: -60, hp: maxHp, maxHp, dir: Math.random() < 0.5 ? 1 : -1, speed: 1.1 + g.wave * 0.06, fireCd: 90, phase: 0, entering: true };
        g.screenFlash = 14;
        playSfx("explosion", { volume: 0.7 });
        haptic([25, 40, 25]);
      }

      if (g.boss) {
        const b = g.boss;
        if (b.entering) {
          b.y += 1.6;
          if (b.y >= BOSS_Y) { b.y = BOSS_Y; b.entering = false; }
        } else {
          b.phase += 0.02;
          b.x += b.dir * b.speed;
          if (b.x > CANVAS_W - 70) { b.x = CANVAS_W - 70; b.dir = -1; }
          if (b.x < 70) { b.x = 70; b.dir = 1; }
          // padrão de tiro: leque em direcção às metades dos jogadores
          if (--b.fireCd <= 0) {
            const enraged = b.hp / b.maxHp < 0.4;
            const shots = enraged ? 3 : 2;
            for (let s = 0; s < shots; s++) {
              const target = s === 0 ? p1 : s === 1 ? p2 : { x: b.x + (Math.random() - 0.5) * 300, y: CANVAS_H };
              const dx = target.x - b.x, dy = (CANVAS_H - b.y);
              const len = Math.hypot(dx, dy) || 1;
              g.bossBullets.push({ x: b.x, y: b.y + 26, vx: (dx / len) * 2.2, vy: Math.max(1.6, (dy / len) * 2.6) });
            }
            b.fireCd = enraged ? 55 : 85;
            playSfx("shoot", { volume: 0.5, pitch: 0.5 });
          }
        }
      }

      const spawnInterval = Math.max(MIN_ENEMY_INTERVAL, INITIAL_ENEMY_INTERVAL - (g.wave - 1) * 5);
      if (g.frame % Math.round(spawnInterval) === 0) {
        const count = g.wave >= 5 ? 2 : 1;
        for (let i = 0; i < count; i++) spawnEnemy(g);
      }

      const keys = new Set(g.keys);
      for (const [k, v] of Object.entries(touchRef.current)) {
        if (v) keys.add(k);
      }

      const p1Rapid = g.frame < g.rapidUntil[0];
      const p2Rapid = g.frame < g.rapidUntil[1];

      if (keys.has("a") || keys.has("A")) p1.x = Math.max(SHIP_SIZE, p1.x - PLAYER_SPEED);
      if (keys.has("d") || keys.has("D")) p1.x = Math.min(CANVAS_W - SHIP_SIZE, p1.x + PLAYER_SPEED);
      if (p1.shootCooldown > 0) p1.shootCooldown--;
      if (
        (keys.has("w") || keys.has("W") || keys.has("p1shoot")) &&
        p1.shootCooldown <= 0 &&
        p1.lives > 0
      ) {
        // v72: LASER ativo → o toque dispara o RAIO (não bala)
        if (g.frame < g.laserUntil[0]) {
          // (o raio é processado no bloco do laser mais abaixo)
        } else {
          g.bullets.push({ x: p1.x, y: p1.y - SHIP_SIZE, speed: BULLET_SPEED, owner: 1, trail: [] });
          // v72: flash de cano no momento do disparo
          g.particles.push({ x: p1.x, y: p1.y - SHIP_SIZE, vx: 0, vy: -0.6, life: 5, maxLife: 5, color: "#a5f3fc", size: 4 });
          playSfx("shoot", { volume: 0.25 });
        }
        p1.shootCooldown = p1Rapid ? 5 : BULLET_COOLDOWN;
      }
      if (p1.invincible > 0) p1.invincible--;
      if (p1.damageFlash > 0) p1.damageFlash--;

      if (keys.has("ArrowLeft")) p2.x = Math.max(SHIP_SIZE, p2.x - PLAYER_SPEED);
      if (keys.has("ArrowRight")) p2.x = Math.min(CANVAS_W - SHIP_SIZE, p2.x + PLAYER_SPEED);
      if (p2.shootCooldown > 0) p2.shootCooldown--;
      if (
        (keys.has("ArrowUp") || keys.has("p2shoot")) &&
        p2.shootCooldown <= 0 &&
        p2.lives > 0
      ) {
        // v72: LASER ativo → o toque dispara o RAIO (não bala)
        if (g.frame < g.laserUntil[1]) {
          // (o raio é processado no bloco do laser mais abaixo)
        } else {
          g.bullets.push({ x: p2.x, y: p2.y - SHIP_SIZE, speed: BULLET_SPEED, owner: 2, trail: [] });
          g.particles.push({ x: p2.x, y: p2.y - SHIP_SIZE, vx: 0, vy: -0.6, life: 5, maxLife: 5, color: "#f9a8d4", size: 4 });
          playSfx("shoot", { volume: 0.25, pitch: 1.15 });
        }
        p2.shootCooldown = p2Rapid ? 5 : BULLET_COOLDOWN;
      }
      if (p2.invincible > 0) p2.invincible--;
      if (p2.damageFlash > 0) p2.damageFlash--;

      // Screen shake decay
      if (g.shakeMagnitude > 0.3) {
        g.shakeX = (Math.random() - 0.5) * g.shakeMagnitude * 2;
        g.shakeY = (Math.random() - 0.5) * g.shakeMagnitude * 2;
        g.shakeMagnitude *= 0.88;
      } else {
        g.shakeX = 0;
        g.shakeY = 0;
        g.shakeMagnitude = 0;
      }
      if (g.shakeMagnitude > 0.5) {
        setShakeStyle({ x: g.shakeX, y: g.shakeY });
      }

      g.bullets = g.bullets.filter((b) => {
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 5) b.trail.shift();
        b.y -= b.speed;
        return b.y > -10;
      });

      g.enemies = g.enemies.filter((e) => {
        e.prevX = e.x;
        e.prevY = e.y;
        if (e.hitFlash > 0) e.hitFlash--;
        e.rotation += e.rotSpeed;
        e.wobble += e.wobbleSpeed;

        // ── v73: ESQUIVA — os vivos desviam-se das balas do jogador ──
        // decidirEsquiva é PURO e DETERMINÍSTICO (src/game/space/ia.ts):
        // bala a subir dentro do alcance → merger para LONGE dela; o tank
        // (skill 0) NUNCA desvia — é um tanque. O merger dura 12 frames.
        if (e.dodgeCd > 0) {
          e.dodgeCd--;
          e.x += e.dodgeDir * ESQUIVA_VEL * (ESQUIVA_SKILL[e.kind as keyof typeof ESQUIVA_SKILL] ?? 0);
        } else {
          const dir = decidirEsquiva(e, g.bullets, CANVAS_W);
          if (dir !== 0) { e.dodgeDir = dir; e.dodgeCd = ESQUIVA_DURACAO; }
        }

        // ── v72: IA POR TIPO ──
        if (e.kind === "fighter") {
          // desce até a altitude de combate, strafa e ATIRA
          if (e.y < e.targetY) {
            e.y += e.speed;
          } else {
            e.y += Math.sin(e.wobble * 0.5) * 0.3;
            e.x += e.strafeDir * 1.15;
            if (e.x < e.size + 6) { e.x = e.size + 6; e.strafeDir = 1; }
            if (e.x > CANVAS_W - e.size - 6) { e.x = CANVAS_W - e.size - 6; e.strafeDir = -1; }
            // tiro MIRADO no jogador vivo mais próximo (a IA ataca)
            if (--e.fireCd <= 0) {
              const alvos = [p1, p2].filter((p) => p.lives > 0);
              if (alvos.length > 0) {
                const alvo = alvos[Math.floor(Math.random() * alvos.length)];
                const dx = alvo.x - e.x, dy = alvo.y - e.y;
                const len = Math.hypot(dx, dy) || 1;
                g.enemyBullets.push({ x: e.x, y: e.y + e.size, vx: (dx / len) * 2.4, vy: (dy / len) * 2.4, color: "#a3e635" });
                playSfx("shoot", { volume: 0.18, pitch: 0.7 });
              }
              e.fireCd = 100 + Math.floor(Math.random() * 60);
            }
            if (g.frame > e.leaveAt) e.y += 1.4; // cumpriu a missão → foge
          }
        } else if (e.kind === "kamikaze") {
          // MERGULHO: trava no jogador vivo mais perto e acelera
          const vivos = [p1, p2].filter((p) => p.lives > 0);
          if (vivos.length > 0) {
            const alvo = vivos[Math.floor(Math.random() * vivos.length)];
            e.x += Math.max(-0.5, Math.min(0.5, (alvo.x - e.x) * 0.045));
          }
          e.speed = Math.min(e.speed + 0.045, 5.2);
          e.y += e.speed;
        } else if (e.kind === "scout") {
          // zigue-zague forte (muito mais vivo que o wobble normal)
          e.y += e.speed;
          e.x += Math.sin(e.wobble) * 2.1;
        } else {
          e.y += e.speed;
          e.x += Math.sin(e.wobble) * 0.5;
        }
        e.x = Math.max(e.size, Math.min(CANVAS_W - e.size, e.x));

        if (e.y > CANVAS_H + 10) {
          const midX = CANVAS_W / 2;
          if (e.x < midX) {
            if (p1.lives > 0 && p1.invincible <= 0) {
              p1.lives--;
              p1.invincible = 60;
              p1.damageFlash = 12;
              g.shakeMagnitude = 6;
              setLives({ p1: p1.lives, p2: p2.lives });
            }
          } else {
            if (p2.lives > 0 && p2.invincible <= 0) {
              p2.lives--;
              p2.invincible = 60;
              p2.damageFlash = 12;
              g.shakeMagnitude = 6;
              setLives({ p1: p1.lives, p2: p2.lives });
            }
          }
          return false;
        }
        return true;
      });

      const bulletsToRemove = new Set<number>();
      const enemiesToRemove = new Set<number>();
      let scoreChanged = false;

      for (let bi = 0; bi < g.bullets.length; bi++) {
        const b = g.bullets[bi];
        for (let ei = 0; ei < g.enemies.length; ei++) {
          if (enemiesToRemove.has(ei)) continue;
          const e = g.enemies[ei];
          const dx = b.x - e.x;
          const dy = b.y - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < e.size + 4) {
            e.hp--;
            bulletsToRemove.add(bi);
            if (e.hp <= 0) {
              enemiesToRemove.add(ei);
              const isBonus = e.bonus;
              const basePts = isBonus ? POINTS_BONUS : POINTS_NORMAL;
              // pontos por TIPO (a guerra é mais rica)
              const ptsPorTipo: Partial<Record<EnemyKind, number>> = {
                scout: 15, fighter: 25, tank: 45, kamikaze: 20, splitter: 20,
              };
              const baseTipo = ptsPorTipo[e.kind] ?? basePts;

              // v72: COMBO — matar rápido em série multiplica (até ×4)
              const idx = b.owner === 1 ? 0 : 1;
              if (g.frame <= g.comboUntil[idx]) g.comboCount[idx]++;
              else g.comboCount[idx] = 1;
              g.comboUntil[idx] = g.frame + COMBO_JANELA;
              const mult = Math.min(1 + (g.comboCount[idx] - 1) * 0.25, COMBO_MULT_MAX);
              const comboN = g.comboCount[idx];

              const streak = (() => { g.killStreaks[idx]++; return g.killStreaks[idx]; })();
              const streakBonus = streak >= 10 ? 3 : streak >= 5 ? 2 : 0;
              const totalPts = Math.round(baseTipo * mult) + streakBonus * 5;
              if (b.owner === 1) p1.score += totalPts; else p2.score += totalPts;

              g.particles.push(...createExplosion(e.x, e.y, e.color, isBonus || e.kind === "tank"));
              g.shockwaves.push(createShockwave(e.x, e.y, e.color, isBonus || e.kind === "tank"));
              g.floatingTexts.push({
                ...createScoreText(e.x, e.y - 10, totalPts, isBonus || e.kind === "tank"),
                text: comboN >= 2 ? `+${totalPts} ×${comboN}` : `+${totalPts}`,
                color: comboN >= 3 ? "#f0abfc" : comboN >= 2 ? "#fbbf24" : (isBonus ? "#fbbf24" : "#ffffff"),
              });
              // v72: queda de power-up — TANK GARANTE um; normal por chance
              const chanceDrop = e.kind === "tank" ? 1 : POWERUP_CHANCE;
              if (Math.random() < chanceDrop && g.powerUps.length < 3) {
                const kinds = ["shield", "rapid", "life", "laser", "drone"] as const;
                const kind = kinds[Math.floor(Math.random() * kinds.length)];
                g.powerUps.push({ x: e.x, y: e.y, vy: 1.6, kind, phase: 0 });
              }
              // v72: SPLITTER divide-se em dois mini-inimigos ao morrer
              if (e.kind === "splitter") {
                for (const sinal of [-1, 1]) {
                  g.enemies.push({
                    ...e,
                    kind: "normal", hp: 1, size: 8, bonus: false,
                    x: Math.max(e.size, Math.min(CANVAS_W - e.size, e.x + sinal * 14)),
                    y: e.y, speed: e.speed * 1.15, color: "#7dd3fc",
                    wobble: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.12,
                    prevX: e.x, prevY: e.y,
                  });
                }
              }
              if (e.kind === "tank") { g.shakeMagnitude = Math.max(g.shakeMagnitude, 6); }
              playSfx(isBonus || e.kind === "tank" ? "coin" : "hit", { volume: isBonus ? 0.6 : 0.4, pitch: isBonus ? 1.2 : 1 });
              if (isBonus || e.kind === "tank") {
                g.screenFlash = 10;
                g.vignettePulse = 15;
                haptic(12);
              }
              scoreChanged = true;
            } else {
              // v72: dano SEM morte → flash branco no inimigo
              e.hitFlash = 6;
              playSfx("hit", { volume: 0.2, pitch: 1.4 });
            }
            break;
          }
        }
      }

      if (scoreChanged) {
        setScores({ p1: p1.score, p2: p2.score });
        // v72: combo visível no HUD (espelho do estado do jogo)
        setCombo({
          p1: g.frame <= g.comboUntil[0] ? g.comboCount[0] : 0,
          p2: g.frame <= g.comboUntil[1] ? g.comboCount[1] : 0,
        });
      }

      g.bullets = g.bullets.filter((_, i) => !bulletsToRemove.has(i));
      g.enemies = g.enemies.filter((_, i) => !enemiesToRemove.has(i));

      // ── v20 PRO: balas dos jogadores acertam o CHEFE ──
      if (g.boss && !g.boss.entering) {
        const bs = g.boss;
        for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
          const bu = g.bullets[bi];
          if (Math.hypot(bu.x - bs.x, bu.y - bs.y) < 36) {
            g.bullets.splice(bi, 1);
            bs.hp--;
            g.particles.push(...createExplosion(bu.x, bu.y, "#f43f5e", false));
            g.shakeMagnitude = Math.max(g.shakeMagnitude, 2.5);
            playSfx("hit", { volume: 0.35, pitch: 0.7 });
            if (bs.hp <= 0) {
              const pts = 150 + g.wave * 10;
              if (bu.owner === 1) p1.score += pts; else p2.score += pts;
              scoreChanged = true;
              g.floatingTexts.push(createScoreText(bs.x, bs.y - 20, pts, true));
              g.particles.push(...createExplosion(bs.x, bs.y, "#fb923c", true));
              g.particles.push(...createExplosion(bs.x - 20, bs.y + 10, "#f43f5e", true));
              g.particles.push(...createExplosion(bs.x + 20, bs.y + 10, "#fde047", true));
              g.shockwaves.push(createShockwave(bs.x, bs.y, "#fb923c", true));
              g.shockwaves.push(createShockwave(bs.x, bs.y, "#ffffff", false));
              g.screenFlash = 16;
              g.shakeMagnitude = 14;
              g.boss = null;
              playSfx("explosion");
              haptic([40, 60, 40]);
              break;
            }
          }
        }
      }

      // ── v20 PRO: balas do chefe — esquiva obrigatória ──
      g.bossBullets = g.bossBullets.filter((bb) => {
        bb.x += bb.vx; bb.y += bb.vy;
        if (bb.y > CANVAS_H + 10 || bb.x < -10 || bb.x > CANVAS_W + 10) return false;
        for (const p of [p1, p2]) {
          if (p.lives <= 0 || p.invincible > 0) continue;
          if (Math.hypot(p.x - bb.x, p.y - bb.y) < SHIP_SIZE + 5) {
            p.lives--;
            p.invincible = 60;
            p.damageFlash = 12;
            g.shakeMagnitude = 8;
            setLives({ p1: p1.lives, p2: p2.lives });
            playSfx("explosion", { volume: 0.55 });
            haptic(35);
            return false;
          }
        }
        return true;
      });

      // ── v72: BALAS DOS FIGHTERS — a guerra volta a tiro contra tiro ──
      g.enemyBullets = g.enemyBullets.filter((eb) => {
        eb.x += eb.vx; eb.y += eb.vy;
        if (eb.y > CANVAS_H + 10 || eb.x < -10 || eb.x > CANVAS_W + 10) return false;
        for (const p of [p1, p2]) {
          if (p.lives <= 0 || p.invincible > 0) continue;
          if (Math.hypot(p.x - eb.x, p.y - eb.y) < SHIP_SIZE + 4) {
            p.lives--;
            p.invincible = 60;
            p.damageFlash = 12;
            g.shakeMagnitude = 7;
            setLives({ p1: p1.lives, p2: p2.lives });
            playSfx("explosion", { volume: 0.45, pitch: 1.3 });
            haptic(30);
            return false;
          }
        }
        return true;
      });

      // ── v72: DRONES ALIADOS — orbitam e abatem sozinhos ──
      for (const d of g.drones) {
        const dono = d.owner === 1 ? p1 : p2;
        if (dono.lives <= 0) continue;
        d.phase += 0.06;
        if (--d.fireCd > 0) continue;
        // mira o inimigo mais próximo que esteja por CIMA do dono
        let maisPerto: Enemy | null = null;
        let menor = Infinity;
        for (const e of g.enemies) {
          if (e.y >= dono.y - 10) continue;
          const dist = Math.hypot(e.x - dono.x, e.y - dono.y);
          if (dist < menor) { menor = dist; maisPerto = e; }
        }
        if (maisPerto && Math.abs(maisPerto.x - dono.x) < 46) {
          g.bullets.push({
            x: dono.x + Math.cos(d.phase) * 34,
            y: dono.y + Math.sin(d.phase) * 16 - 8,
            speed: BULLET_SPEED, owner: d.owner, trail: [],
          });
          playSfx("shoot", { volume: 0.12, pitch: 1.5 });
          d.fireCd = 42;
        } else {
          d.fireCd = 8; // sem alvo → tenta logo a seguir
        }
      }

      // ── v72: LASER — o raio da coluna fura TODOS os inimigos no caminho ──
      for (const pi of [0, 1] as const) {
        const p = g.players[pi];
        if (p.lives <= 0) continue;
        const laserAtivo = g.frame < g.laserUntil[pi];
        if (!laserAtivo) continue;
        if (g.laserCd[pi] > 0) g.laserCd[pi]--;
        const dispara = (pi === 0 ? keys.has("w") || keys.has("W") || keys.has("p1shoot") : keys.has("ArrowUp") || keys.has("p2shoot"));
        if (dispara && g.laserCd[pi] <= 0) {
          g.laserCd[pi] = LASER_CD;
          const coluna = p.x;
          const atingidos = g.enemies.filter((e) => Math.abs(e.x - coluna) < LASER_LARGURA + e.size * 0.4 && e.y < p.y);
          for (const e of atingidos) {
            e.hp -= 2;
            e.hitFlash = 5;
            g.particles.push(...createExplosion(e.x, e.y, "#67e8f9", false));
            if (e.hp <= 0) {
              const idxL = pi;
              if (g.frame <= g.comboUntil[idxL]) g.comboCount[idxL]++; else g.comboCount[idxL] = 1;
              g.comboUntil[idxL] = g.frame + COMBO_JANELA;
              const multL = Math.min(1 + (g.comboCount[idxL] - 1) * 0.25, COMBO_MULT_MAX);
              const ptsL = Math.round((e.kind === "tank" ? 45 : 12) * multL);
              p.score += ptsL;
              scoreChanged = true;
              g.floatingTexts.push(createScoreText(e.x, e.y - 8, ptsL, false));
              if (e.kind === "splitter") {
                for (const sinal of [-1, 1]) {
                  g.enemies.push({ ...e, kind: "normal", hp: 1, size: 8, bonus: false, x: Math.max(e.size, Math.min(CANVAS_W - e.size, e.x + sinal * 14)), speed: e.speed * 1.15, color: "#7dd3fc", wobble: Math.random() * Math.PI * 2, prevX: e.x, prevY: e.y });
                }
              }
            }
          }
          g.enemies = g.enemies.filter((e) => e.hp > 0);
          playSfx("shoot", { volume: 0.3, pitch: 2.2 });
          haptic(8);
        }
      }
      if (scoreChanged) {
        setScores({ p1: p1.score, p2: p2.score });
        setCombo({
          p1: g.frame <= g.comboUntil[0] ? g.comboCount[0] : 0,
          p2: g.frame <= g.comboUntil[1] ? g.comboCount[1] : 0,
        });
      }

      // ── v20 PRO: power-ups caem e são apanhados ──
      g.powerUps = g.powerUps.filter((pu) => {
        pu.y += pu.vy;
        pu.phase += 0.1;
        if (pu.y > CANVAS_H + 10) return false;
        for (const p of [p1, p2]) {
          if (p.lives <= 0) continue;
          if (Math.hypot(p.x - pu.x, p.y - pu.y) < SHIP_SIZE + 12) {
            if (pu.kind === "shield") p.invincible = Math.max(p.invincible, 240);
            else if (pu.kind === "rapid") g.rapidUntil[p === p1 ? 0 : 1] = g.frame + 300;
            else if (pu.kind === "laser") {
              const idxL = p === p1 ? 0 : 1;
              g.laserUntil[idxL] = g.frame + LASER_DURACAO;
              g.floatingTexts.push({ x: p.x, y: p.y - 26, text: "LASER!", color: "#67e8f9", life: 45, maxLife: 45, vy: -1 });
            } else if (pu.kind === "drone") {
              const idxD = p === p1 ? 0 : 1;
              if (!g.drones.some((d) => d.owner === (p === p1 ? 1 : 2))) {
                g.drones.push({ owner: p === p1 ? 1 : 2, phase: idxD * Math.PI, fireCd: 20 });
                g.floatingTexts.push({ x: p.x, y: p.y - 26, text: "DRONE!", color: "#a78bfa", life: 45, maxLife: 45, vy: -1 });
              }
            }
            else if (p.lives < 5) p.lives += 1;
            setLives({ p1: p1.lives, p2: p2.lives });
            playSfx("powerup");
            haptic(15);
            return false;
          }
        }
        return true;
      });

      g.particles = g.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.vx *= 0.98;
        p.life--;
        return p.life > 0;
      });

      g.shockwaves = g.shockwaves.filter((sw) => {
        sw.radius += (sw.maxRadius - sw.radius) * 0.15;
        sw.life--;
        return sw.life > 0;
      });

      g.floatingTexts = g.floatingTexts.filter((ft) => {
        ft.y += ft.vy;
        ft.life--;
        return ft.life > 0;
      });

      if (g.screenFlash > 0) g.screenFlash--;
      if (g.vignettePulse > 0) g.vignettePulse--;

      // v72: HIPERSALTO — estrelas em velocidade warp durante a troca de onda
      const warpMul = g.hyperJump > 0 ? 7 - (g.hyperJump / HYPERJUMP_FRAMES) * 4 : 1;
      if (g.hyperJump > 0) g.hyperJump--;
      g.stars.forEach((s) => {
        s.y += s.speed * warpMul;
        if (s.y > CANVAS_H) {
          s.y = -2;
          s.x = Math.random() * CANVAS_W;
        }
      });

      g.nebulae.forEach((n) => {
        n.y += n.speed;
        n.phase += 0.005;
        if (n.y > CANVAS_H + n.radius) {
          n.y = -n.radius;
          n.x = Math.random() * CANVAS_W;
        }
      });

      if (p1.lives <= 0 && p2.lives <= 0) {
        g.running = false;
        endGame(p1.score, p2.score);
        return;
      }

      // === RENDERING ===
      ctx.save();
      ctx.translate(g.shakeX, g.shakeY);

      // Background
      ctx.fillStyle = "#030712";
      ctx.fillRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);

      // Nebulae
      g.nebulae.forEach((n) => {
        const pulseFactor = 1 + Math.sin(n.phase) * 0.15;
        const r = n.radius * pulseFactor;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r);
        grad.addColorStop(0, `rgba(${n.color}, 0.06)`);
        grad.addColorStop(0.5, `rgba(${n.color}, 0.03)`);
        grad.addColorStop(1, `rgba(${n.color}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Stars with parallax layers
      const layerColors = ["#94a3b8", "#cbd5e1", "#ffffff"];
      g.stars.forEach((s) => {
        // v72: HIPERSALTO — as estrelas viram RISCOS luminosos em warp
        if (warpMul > 1.5) {
          ctx.globalAlpha = Math.min(0.9, s.brightness + 0.3);
          ctx.strokeStyle = layerColors[s.layer];
          ctx.lineWidth = s.size * 1.4;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x, s.y - s.speed * warpMul * 1.8);
          ctx.stroke();
          return;
        }
        const twinkle = 0.6 + 0.4 * Math.sin(g.frame * 0.02 * (s.layer + 1) + s.x * 0.1);
        const alpha = s.brightness * twinkle;
        const col = layerColors[s.layer];
        ctx.fillStyle = col;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
        // Star glow for brighter/larger stars
        if (s.size > 1.2 && s.layer === 2) {
          ctx.globalAlpha = alpha * 0.15;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // Center divider
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.setLineDash([4, 12]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2, 0);
      ctx.lineTo(CANVAS_W / 2, CANVAS_H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Enemy afterimage trails + enemies
      g.enemies.forEach((e) => {
        ctx.save();
        // Afterimage trail
        ctx.globalAlpha = 0.12;
        ctx.translate(e.prevX, e.prevY);
        ctx.rotate(e.rotation);
        ctx.fillStyle = e.color;
        drawEnemyShape(ctx, e);
        ctx.restore();

        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rotation);

        if (e.bonus) {
          const glowSize = e.size + 8 + Math.sin(g.frame * 0.1) * 4;
          const glow = ctx.createRadialGradient(0, 0, e.size * 0.2, 0, 0, glowSize);
          glow.addColorStop(0, "rgba(251, 191, 36, 0.5)");
          glow.addColorStop(0.5, "rgba(251, 191, 36, 0.15)");
          glow.addColorStop(1, "rgba(251, 191, 36, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
          ctx.fill();

          // Rotating sparkle ring
          const sparkleAngle = g.frame * 0.15;
          for (let i = 0; i < 6; i++) {
            const a = sparkleAngle + (i * Math.PI) / 3;
            const dist = e.size + 10 + Math.sin(g.frame * 0.2 + i) * 3;
            const sx = Math.cos(a) * dist;
            const sy = Math.sin(a) * dist;
            const sparkSize = 1 + Math.sin(g.frame * 0.3 + i * 1.5) * 0.5;
            ctx.fillStyle = "rgba(255, 255, 200, 0.9)";
            ctx.beginPath();
            ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Subtle inner glow for normal enemies
          const innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, e.size * 1.2);
          innerGlow.addColorStop(0, e.color + "30");
          innerGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = innerGlow;
          ctx.beginPath();
          ctx.arc(0, 0, e.size * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = e.color;
        ctx.strokeStyle = e.bonus ? "#fef08a" : "rgba(255,200,200,0.6)";
        ctx.lineWidth = 1.5;
        drawEnemyShape(ctx, e);

        // v72: FLASH DE DANO — o inimigo fica branco quando leva dano sem morrer
        if (e.hitFlash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${0.35 + (e.hitFlash / 6) * 0.45})`;
          drawEnemyShape(ctx, e);
        }

        // v72: barra de vida nos resistentes (tank/fighter/splitter)
        if (e.hp > 1 && e.kind !== "normal") {
          const pct = e.hp / 3;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(-e.size, -e.size - 7, e.size * 2, 3);
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(-e.size, -e.size - 7, e.size * 2 * Math.max(0, Math.min(1, pct)), 3);
        }

        // Inner highlight
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.beginPath();
        ctx.arc(-e.size * 0.2, -e.size * 0.2, e.size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Shockwaves
      g.shockwaves.forEach((sw) => {
        const alpha = sw.life / sw.maxLife;
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = alpha * 0.6;
        ctx.lineWidth = 2 * alpha;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        // Inner ring
        ctx.globalAlpha = alpha * 0.2;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // ── v20 PRO: CHEFE — corpo, aura e barra de vida ──
      if (g.boss) {
        const b = g.boss;
        ctx.save();
        ctx.translate(b.x, b.y);
        const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, 64);
        aura.addColorStop(0, "rgba(244,63,94,0.35)");
        aura.addColorStop(1, "rgba(244,63,94,0)");
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.arc(0, 0, 64, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#7f1d1d";
        ctx.strokeStyle = "#fb7185";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 30);
        ctx.lineTo(-34, 6);
        ctx.lineTo(-46, -14);
        ctx.lineTo(-18, -22);
        ctx.lineTo(0, -12);
        ctx.lineTo(18, -22);
        ctx.lineTo(46, -14);
        ctx.lineTo(34, 6);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        const coreR = 10 + Math.sin(b.phase * 3) * 2.5;
        const core = ctx.createRadialGradient(0, 4, 1, 0, 4, coreR);
        core.addColorStop(0, "#fff");
        core.addColorStop(0.4, "#f43f5e");
        core.addColorStop(1, "rgba(244,63,94,0)");
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(0, 4, coreR, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        const pct = Math.max(0, b.hp / b.maxHp);
        const barW = 180, barX = (CANVAS_W - barW) / 2, barY = 14;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(barX - 2, barY - 2, barW + 4, 12);
        ctx.fillStyle = pct > 0.4 ? "#f43f5e" : "#ef4444";
        ctx.fillRect(barX, barY, barW * pct, 8);
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 2, barY - 2, barW + 4, 12);
        ctx.fillStyle = "#fecdd3";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("⚠ CHEFE DA GALÁXIA", CANVAS_W / 2, barY + 22);
      }

      // balas do chefe
      g.bossBullets.forEach((bb) => {
        const gl = ctx.createRadialGradient(bb.x, bb.y, 0, bb.x, bb.y, 9);
        gl.addColorStop(0, "#fff");
        gl.addColorStop(0.3, "#f43f5e");
        gl.addColorStop(1, "rgba(244,63,94,0)");
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(bb.x, bb.y, 9, 0, Math.PI * 2); ctx.fill();
      });

      // v72: balas dos FIGHTERS (verde-lima — a IA atira de volta)
      g.enemyBullets.forEach((eb) => {
        const gl = ctx.createRadialGradient(eb.x, eb.y, 0, eb.x, eb.y, 7);
        gl.addColorStop(0, "#fff");
        gl.addColorStop(0.35, eb.color);
        gl.addColorStop(1, "rgba(163,230,53,0)");
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(eb.x, eb.y, 7, 0, Math.PI * 2); ctx.fill();
      });

      // v72: FEIXES DO LASER — colunas luminosas dos jogadores com laser ativo
      g.players.forEach((p, pi) => {
        if (p.lives <= 0) return;
        if (g.frame >= g.laserUntil[pi]) return;
        const fade = Math.min(1, (g.laserUntil[pi] - g.frame) / 40);
        const core = ctx.createLinearGradient(p.x, p.y, p.x, 0);
        core.addColorStop(0, `rgba(103,232,249,${0.5 * fade})`);
        core.addColorStop(1, `rgba(103,232,249,${0.08 * fade})`);
        ctx.fillStyle = core;
        ctx.fillRect(p.x - LASER_LARGURA / 2, 0, LASER_LARGURA, p.y - SHIP_SIZE);
        // núcleo branco fino
        ctx.fillStyle = `rgba(255,255,255,${0.55 * fade})`;
        ctx.fillRect(p.x - 1.5, 0, 3, p.y - SHIP_SIZE);
        // orbes no topo do feixe
        const orbY = (g.frame * 8) % (p.y - SHIP_SIZE);
        ctx.fillStyle = `rgba(255,255,255,${0.8 * fade})`;
        ctx.beginPath(); ctx.arc(p.x, orbY, 3, 0, Math.PI * 2); ctx.fill();
      });

      // power-ups
      const PU_STYLE = { shield: { g: "S", color: "#22d3ee" }, rapid: { g: "R", color: "#a78bfa" }, life: { g: "+", color: "#34d399" }, laser: { g: "L", color: "#67e8f9" }, drone: { g: "D", color: "#c084fc" } } as const;
      g.powerUps.forEach((pu) => {
        const s = PU_STYLE[pu.kind];
        const bob = Math.sin(pu.phase) * 3;
        ctx.save();
        ctx.translate(pu.x, pu.y + bob);
        const gl = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
        gl.addColorStop(0, s.color + "aa");
        gl.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(2,6,23,0.85)";
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        (ctx as any).roundRect ? (ctx as any).roundRect(-9, -9, 18, 18, 5) : ctx.rect(-9, -9, 18, 18);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = s.color;
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(s.g, 0, 1);
        ctx.restore();
      });

      // Bullets with trails
      g.bullets.forEach((b) => {
        const player = b.owner === 1 ? p1 : p2;
        // Trail
        b.trail.forEach((t, i) => {
          const a = (i / b.trail.length) * 0.3;
          ctx.globalAlpha = a;
          ctx.fillStyle = player.bulletColor;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Outer glow
        const bGlow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 8);
        bGlow.addColorStop(0, player.bulletColor + "80");
        bGlow.addColorStop(0.5, player.bulletColor + "20");
        bGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = bGlow;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Elongated bullet core
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, 1.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = player.bulletColor;
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, 2.5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      const drawShip = (p: PlayerState) => {
        if (p.lives <= 0) return;
        if (p.invincible > 0 && Math.floor(p.invincible / 3) % 2 === 0) return;

        ctx.save();
        ctx.translate(p.x, p.y);

        // Damage flash overlay
        const isFlashing = p.damageFlash > 0;

        // Shield bubble when invincible
        if (p.invincible > 0) {
          const shieldAlpha = 0.15 + Math.sin(g.frame * 0.3) * 0.1;
          const shieldGrad = ctx.createRadialGradient(0, 0, SHIP_SIZE * 0.5, 0, 0, SHIP_SIZE * 1.6);
          shieldGrad.addColorStop(0, p.color + "00");
          shieldGrad.addColorStop(0.7, p.color + "00");
          shieldGrad.addColorStop(0.85, p.color + Math.round(shieldAlpha * 255).toString(16).padStart(2, "0"));
          shieldGrad.addColorStop(1, p.color + "00");
          ctx.fillStyle = shieldGrad;
          ctx.beginPath();
          ctx.arc(0, 0, SHIP_SIZE * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Engine glow
        const engineGlow = ctx.createRadialGradient(0, SHIP_SIZE * 0.5, 0, 0, SHIP_SIZE * 0.5, SHIP_SIZE * 1.2);
        engineGlow.addColorStop(0, p.color + (isFlashing ? "a0" : "60"));
        engineGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = engineGlow;
        ctx.beginPath();
        ctx.arc(0, SHIP_SIZE * 0.5, SHIP_SIZE * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Dual engine flames
        const flameH1 = 10 + Math.sin(g.frame * 0.5) * 5;
        const flameH2 = 8 + Math.cos(g.frame * 0.6 + 1) * 4;
        [-4, 4].forEach((offsetX, idx) => {
          const fh = idx === 0 ? flameH1 : flameH2;
          // Outer flame
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.moveTo(offsetX - 3, SHIP_SIZE * 0.35);
          ctx.quadraticCurveTo(offsetX, SHIP_SIZE * 0.35 + fh * 1.1, offsetX + 3, SHIP_SIZE * 0.35);
          ctx.closePath();
          ctx.fill();
          // Inner flame (white-hot)
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.moveTo(offsetX - 1.5, SHIP_SIZE * 0.35);
          ctx.quadraticCurveTo(offsetX, SHIP_SIZE * 0.35 + fh * 0.6, offsetX + 1.5, SHIP_SIZE * 0.35);
          ctx.closePath();
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Ship body
        ctx.fillStyle = isFlashing ? "#ff4444" : p.color;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -SHIP_SIZE);
        ctx.lineTo(-SHIP_SIZE * 0.85, SHIP_SIZE * 0.5);
        ctx.lineTo(-SHIP_SIZE * 0.3, SHIP_SIZE * 0.3);
        ctx.lineTo(0, SHIP_SIZE * 0.45);
        ctx.lineTo(SHIP_SIZE * 0.3, SHIP_SIZE * 0.3);
        ctx.lineTo(SHIP_SIZE * 0.85, SHIP_SIZE * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wing detail lines
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-SHIP_SIZE * 0.1, -SHIP_SIZE * 0.5);
        ctx.lineTo(-SHIP_SIZE * 0.6, SHIP_SIZE * 0.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(SHIP_SIZE * 0.1, -SHIP_SIZE * 0.5);
        ctx.lineTo(SHIP_SIZE * 0.6, SHIP_SIZE * 0.35);
        ctx.stroke();

        // Cockpit glow
        const cockpitGrad = ctx.createRadialGradient(0, -SHIP_SIZE * 0.2, 0, 0, -SHIP_SIZE * 0.2, 5);
        cockpitGrad.addColorStop(0, "rgba(255,255,255,0.8)");
        cockpitGrad.addColorStop(0.5, p.color + "aa");
        cockpitGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = cockpitGrad;
        ctx.beginPath();
        ctx.arc(0, -SHIP_SIZE * 0.2, 5, 0, Math.PI * 2);
        ctx.fill();

        // Cockpit center
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(0, -SHIP_SIZE * 0.2, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Wing tip lights
        const wingTipAlpha = 0.5 + Math.sin(g.frame * 0.15) * 0.5;
        ctx.fillStyle = `rgba(255,255,255,${wingTipAlpha})`;
        ctx.beginPath();
        ctx.arc(-SHIP_SIZE * 0.8, SHIP_SIZE * 0.45, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(SHIP_SIZE * 0.8, SHIP_SIZE * 0.45, 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      drawShip(p1);
      drawShip(p2);

      // v72: DRONES ALIADOS — pequenos caças orbitando o dono
      g.drones.forEach((d) => {
        const dono = d.owner === 1 ? p1 : p2;
        if (dono.lives <= 0) return;
        const dx = dono.x + Math.cos(d.phase) * 34;
        const dy = dono.y + Math.sin(d.phase) * 16 - 8;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(Math.cos(d.phase) * 0.4);
        const aura = ctx.createRadialGradient(0, 0, 1, 0, 0, 12);
        aura.addColorStop(0, "rgba(192,132,252,0.5)");
        aura.addColorStop(1, "rgba(192,132,252,0)");
        ctx.fillStyle = aura;
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#c084fc";
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, 7); ctx.lineTo(-6, -5); ctx.lineTo(0, -2); ctx.lineTo(6, -5);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      // Particles with glow
      g.particles.forEach((pt) => {
        const alpha = pt.life / pt.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pt.color;
        const sz = pt.size * alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, sz, 0, Math.PI * 2);
        ctx.fill();
        // Glow for larger particles
        if (pt.size > 2.5) {
          ctx.globalAlpha = alpha * 0.25;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, sz * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // Floating score texts
      g.floatingTexts.forEach((ft) => {
        const alpha = ft.life / ft.maxLife;
        const scale = 0.8 + (1 - alpha) * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(0,0,0,0.9)";
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });

      // Danger zone indicators
      const drawDangerZone = (leftX: number, rightX: number, color: string, player: PlayerState) => {
        const grad = ctx.createLinearGradient(leftX, CANVAS_H - 40, leftX, CANVAS_H);
        const baseAlpha = player.lives <= 1 ? "25" : "12";
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, color + baseAlpha);
        ctx.fillStyle = grad;
        ctx.fillRect(leftX, CANVAS_H - 40, rightX - leftX, 40);
        // Critical warning pulse
        if (player.lives <= 1 && player.lives > 0) {
          const pulse = Math.sin(g.frame * 0.15) * 0.5 + 0.5;
          ctx.globalAlpha = pulse * 0.08;
          ctx.fillStyle = color;
          ctx.fillRect(leftX, 0, rightX - leftX, CANVAS_H);
          ctx.globalAlpha = 1;
        }
      };
      drawDangerZone(0, CANVAS_W / 2, "#22d3ee", p1);
      drawDangerZone(CANVAS_W / 2, CANVAS_W, "#f472b6", p2);

      // Screen flash
      if (g.screenFlash > 0) {
        ctx.fillStyle = `rgba(251, 191, 36, ${g.screenFlash * 0.025})`;
        ctx.fillRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);
      }

      // Vignette
      const vignetteIntensity = g.vignettePulse > 0 ? 0.4 + (g.vignettePulse / 15) * 0.3 : 0.3;
      const vignette = ctx.createRadialGradient(
        CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.3,
        CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.75
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, `rgba(0,0,0,${vignetteIntensity})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(-10, -10, CANVAS_W + 20, CANVAS_H + 20);

      // Scanlines (subtle)
      ctx.globalAlpha = 0.015;
      ctx.fillStyle = "#000";
      for (let y = 0; y < CANVAS_H; y += 3) {
        ctx.fillRect(0, y, CANVAS_W, 1);
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      g.animId = requestAnimationFrame(() => gameLoop(g));
    },
    [endGame, spawnEnemy]
  );

  const initGame = useCallback(
    (carryScores: { p1: number; p2: number }, startWave: number) => {
      const g: GameState = {
        players: [
          {
            x: CANVAS_W * 0.3,
            y: CANVAS_H - 40,
            score: carryScores.p1,
            lives: 3,
            color: "#22d3ee",
            bulletColor: "#67e8f9",
            shootCooldown: 0,
            invincible: 0,
            name: "Jogador 1",
            damageFlash: 0,
          },
          {
            x: CANVAS_W * 0.7,
            y: CANVAS_H - 40,
            score: carryScores.p2,
            lives: 3,
            color: "#f472b6",
            bulletColor: "#f9a8d4",
            shootCooldown: 0,
            invincible: 0,
            name: "Jogador 2",
            damageFlash: 0,
          },
        ],
        bullets: [],
        enemies: [],
        particles: [],
        floatingTexts: [],
        shockwaves: [],
        stars: createStars(),
        nebulae: createNebulae(),
        keys: new Set<string>(),
        frame: 0,
        wave: startWave,
        waveFrame: 0,
        running: true,
        screenFlash: 0,
        killStreaks: [0, 0],
        animId: 0,
        shakeX: 0,
        shakeY: 0,
        shakeMagnitude: 0,
        vignettePulse: 0,
        boss: null,
        bossBullets: [],
        powerUps: [],
        rapidUntil: [0, 0],
        enemyBullets: [],
        drones: [],
        laserUntil: [0, 0],
        laserCd: [0, 0],
        comboCount: [0, 0],
        comboUntil: [0, 0],
        hyperJump: 0,
      };
      gameRef.current = g;
      setLives({ p1: 3, p2: 3 });
      setWave(startWave);
      setGameStatus("playing");
      setShakeStyle({ x: 0, y: 0 });
      return g;
    },
    []
  );

  const startGame = useCallback(() => {
    unlockAudio();
    playSfx("click");
    if (gameRef.current) cancelAnimationFrame(gameRef.current.animId);
    const g = initGame({ p1: 0, p2: 0 }, 1);
    g.animId = requestAnimationFrame(() => gameLoop(g));
  }, [initGame, gameLoop]);

  const nextRound = useCallback(() => {
    if (gameRef.current) cancelAnimationFrame(gameRef.current.animId);
    const newWave = wave + 1;
    const g = initGame({ p1: scores.p1, p2: scores.p2 }, newWave);
    g.animId = requestAnimationFrame(() => gameLoop(g));
  }, [initGame, gameLoop, wave, scores]);

  const resetAll = useCallback(() => {
    if (gameRef.current) {
      cancelAnimationFrame(gameRef.current.animId);
      gameRef.current = null;
    }
    setScores({ p1: 0, p2: 0 });
    setLives({ p1: 3, p2: 3 });
    setWave(1);
    setWinner(null);
    setGameStatus("idle");
    setShakeStyle({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (gameRef.current) gameRef.current.keys.add(e.key);
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (gameRef.current) gameRef.current.keys.delete(e.key);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (gameRef.current) cancelAnimationFrame(gameRef.current.animId);
    };
  }, []);

  const renderLives = (count: number, color: "cyan" | "pink") =>
    Array.from({ length: Math.max(3, count) }, (_, i) => (
      <motion.span
        key={i}
        initial={i < count ? { scale: 0 } : { scale: 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 25, delay: i * 0.05 }}
        className={cn(
          "inline-block w-3.5 h-3.5 rounded-full border-2 transition-colors duration-300",
          i < count
            ? cn(
                "border-transparent",
                color === "cyan"
                  ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                  : "bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.7)]"
              )
            : "border-zinc-700 bg-zinc-900/50"
        )}
      />
    ));

  const handleTouch = (key: string, pressed: boolean) => {
    touchRef.current[key] = pressed;
    triggerUI();
  };

  void forceTick;
  void liveCode;

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[620px] mx-auto">
      {/* v74 DESKTOP: legenda ≥lg — controlos dos 2 canos + power-ups + IA dos
          inimigos (v72/v73) num só golpe de vista; telemóvel não muda nada */}
      <div className="hidden lg:grid grid-cols-3 gap-3 w-full" data-testid="espaco-legenda-desktop">
        <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-3.5 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-cyan-400 mb-1.5">Controlos</p>
          <p className="text-[10px] leading-relaxed text-zinc-400">
            <b className="text-cyan-300">P1</b> A/D mover · W atirar<br />
            <b className="text-pink-300">P2</b> ←/→ mover · ↑ atirar
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-1.5">Power-ups</p>
          <p className="text-[10px] leading-relaxed text-zinc-400">
            M escudo · S duplo · L laser · D drone aliado — o tanque GARANTE um
          </p>
        </div>
        <div className="rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/5 px-3.5 py-2.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-fuchsia-400 mb-1.5">IA dos inimigos</p>
          <p className="text-[10px] leading-relaxed text-zinc-400">
            scout zigue-zague · fighter ATIRA e desvia · tank aguenta 3 · kamikaze mergulha · splitter divide-se
          </p>
        </div>
      </div>
      {/* Score Panel */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full rounded-2xl bg-gradient-to-r from-cyan-950/50 via-zinc-900/80 to-pink-950/50 border border-white/[0.08] p-4 shadow-xl shadow-black/30 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between">
          {/* Player 1 */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
              <span className="text-cyan-400 text-sm font-bold tracking-wider uppercase">Jogador 1</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-cyan-400" />
              <motion.span
                key={scores.p1}
                initial={{ scale: 1.3, color: "#fff" }}
                animate={{ scale: 1, color: "#a5f3fc" }}
                transition={{ duration: 0.3 }}
                className="text-cyan-300 text-2xl font-mono font-bold tabular-nums"
              >
                {scores.p1}
              </motion.span>
            </div>
            <div className="flex gap-1.5 mt-0.5">{renderLives(lives.p1, "cyan")}</div>
            {/* v72: COMBO visível — matar rápido multiplica os pontos */}
            <motion.div
              key={`c1-${combo.p1}`}
              initial={combo.p1 >= 2 ? { scale: 0.6, opacity: 0 } : false}
              animate={{ scale: combo.p1 >= 2 ? 1 : 0.85, opacity: combo.p1 >= 2 ? 1 : 0.35 }}
              className={cn(
                "mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide",
                combo.p1 >= 2 ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-zinc-600"
              )}
              data-testid="combo-p1"
            >
              {combo.p1 >= 2 ? `COMBO ×${combo.p1}` : "combo ×1"}
            </motion.div>
            <span className="text-[10px] text-zinc-500 font-mono">A/D mover · W atirar</span>
          </div>

          {/* Wave Center */}
          <div className="flex flex-col items-center gap-1.5 px-4">
            <motion.div
              key={wave}
              initial={{ scale: 1.4, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Badge
                variant="outline"
                className="border-amber-500/40 text-amber-400 text-xs bg-amber-500/10 px-3 py-0.5 font-bold tracking-wide"
              >
                <Zap className="w-3 h-3 mr-1" />
                Onda {wave}
              </Badge>
            </motion.div>
            <div className="w-20 h-1.5 bg-zinc-800/80 rounded-full mt-1 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: WAVE_DURATION / 60, ease: "linear", repeat: Infinity }}
                style={{ width: "50%" }}
              />
            </div>
            {gameStatus === "playing" && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1 text-[10px] text-zinc-500"
              >
                <Shield className="w-2.5 h-2.5" />
                Co-op
              </motion.div>
            )}
          </div>

          {/* Player 2 */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-pink-400 text-sm font-bold tracking-wider uppercase">Jogador 2</span>
              <div className="w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_6px_rgba(244,114,182,0.8)]" />
            </div>
            <div className="flex items-center gap-2">
              <motion.span
                key={scores.p2}
                initial={{ scale: 1.3, color: "#fff" }}
                animate={{ scale: 1, color: "#f9a8d4" }}
                transition={{ duration: 0.3 }}
                className="text-pink-300 text-2xl font-mono font-bold tabular-nums"
              >
                {scores.p2}
              </motion.span>
              <Coins className="w-4 h-4 text-pink-400" />
            </div>
            <div className="flex gap-1.5 mt-0.5">{renderLives(lives.p2, "pink")}</div>
            <motion.div
              key={`c2-${combo.p2}`}
              initial={combo.p2 >= 2 ? { scale: 0.6, opacity: 0 } : false}
              animate={{ scale: combo.p2 >= 2 ? 1 : 0.85, opacity: combo.p2 >= 2 ? 1 : 0.35 }}
              className={cn(
                "mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-black tracking-wide",
                combo.p2 >= 2 ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "text-zinc-600"
              )}
              data-testid="combo-p2"
            >
              {combo.p2 >= 2 ? `COMBO ×${combo.p2}` : "combo ×1"}
            </motion.div>
            <span className="text-[10px] text-zinc-500 font-mono">
              {"←"}{"→"} mover · {"↑"} atirar
            </span>
          </div>
        </div>
      </motion.div>

      {/* Canvas Container */}
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          x: shakeStyle.x, 
          y: shakeStyle.y 
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
        className="relative rounded-2xl overflow-hidden border border-white/[0.06] shadow-2xl shadow-black/60"
        style={{ maxWidth: CANVAS_W, width: "100%" }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full h-auto block"
          style={{ imageRendering: "auto" }}
        />

        {/* Idle Overlay */}
        <AnimatePresence mode="wait">
          {gameStatus === "idle" && (
            <motion.div
              key="idle-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  className="mb-4 text-center"
                >
                  <span className="text-6xl">{"🚀"}</span>
                </motion.div>
              </motion.div>
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25, type: "spring", stiffness: 200 }}
                className="text-white text-2xl font-bold mb-1 tracking-tight"
              >
                Space Shooter
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35, type: "spring", stiffness: 200 }}
                className="text-zinc-400 text-sm mb-6 text-center px-8 leading-relaxed"
              >
                Destrua os inimigos e acumule pontos!{"\n"}
                Inimigos dourados valem mais!
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45, type: "spring", stiffness: 200 }}
              >
                <Button
                  onClick={startGame}
                  className="bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold px-10 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-shadow duration-300"
                >
                  Iniciar Jogo
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence mode="wait">
          {gameStatus === "over" && (
            <motion.div
              key="over-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-lg"
            >
              {/* Trophy */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 15 }}
                className="mb-3"
              >
                <span className="text-5xl">{"🏆"}</span>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 20 }}
                className="text-white text-3xl font-bold mb-2 tracking-tight"
              >
                Fim de Jogo!
              </motion.h2>

              {/* Winner text */}
              <AnimatePresence>
                {winner && (
                  <motion.p
                    initial={{ y: 20, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.55, type: "spring", stiffness: 300 }}
                    className={cn(
                      "text-xl font-bold mb-4 px-4 py-1 rounded-full",
                      winner === "Jogador 1"
                        ? "text-cyan-300 bg-cyan-500/10 border border-cyan-500/20"
                        : "text-pink-300 bg-pink-500/10 border border-pink-500/20"
                    )}
                  >
                    {winner} venceu!
                  </motion.p>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {!winner && (
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.55 }}
                    className="text-amber-400 text-xl font-bold mb-4"
                  >
                    Empate!
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Score Cards */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, type: "spring", stiffness: 200, damping: 20 }}
                className="flex gap-4 mb-6"
              >
                <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-xl px-6 py-3 text-center min-w-[110px]">
                  <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">Jogador 1</p>
                  <motion.p
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.9, type: "spring", stiffness: 400, damping: 15 }}
                    className="text-white text-3xl font-mono font-bold"
                  >
                    {scores.p1}
                  </motion.p>
                </div>

                <div className="flex items-center">
                  <span className="text-zinc-600 text-lg font-light italic">vs</span>
                </div>

                <div className="bg-pink-950/30 border border-pink-500/20 rounded-xl px-6 py-3 text-center min-w-[110px]">
                  <p className="text-pink-400 text-xs font-bold uppercase tracking-wider mb-1">Jogador 2</p>
                  <motion.p
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.0, type: "spring", stiffness: 400, damping: 15 }}
                    className="text-white text-3xl font-mono font-bold"
                  >
                    {scores.p2}
                  </motion.p>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.1, type: "spring", stiffness: 200 }}
                className="flex gap-3"
              >
                <Button
                  onClick={nextRound}
                  variant="outline"
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50 rounded-xl px-5 transition-all duration-200"
                >
                  Próximo Round
                </Button>
                <Button
                  onClick={resetAll}
                  variant="outline"
                  className="border-zinc-600/50 text-zinc-400 hover:bg-zinc-700/50 hover:border-zinc-500/50 rounded-xl px-5 transition-all duration-200"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Reiniciar Tudo
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Touch Controls */}
      <AnimatePresence>
        {gameStatus === "playing" && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="w-full max-w-[620px] grid grid-cols-2 gap-4 mt-1"
          >
            <div className="flex items-center justify-center gap-2.5">
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("a", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("a", false); }}
                onMouseDown={() => handleTouch("a", true)}
                onMouseUp={() => handleTouch("a", false)}
                onMouseLeave={() => handleTouch("a", false)}
                className="w-14 h-14 rounded-2xl bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 text-xl font-bold active:bg-cyan-800/50 active:border-cyan-500/40 active:scale-95 select-none touch-none transition-all duration-100"
              >
                {"◀"}
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("p1shoot", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("p1shoot", false); }}
                onMouseDown={() => handleTouch("p1shoot", true)}
                onMouseUp={() => handleTouch("p1shoot", false)}
                onMouseLeave={() => handleTouch("p1shoot", false)}
                className="w-14 h-14 rounded-2xl bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 text-xl font-bold active:bg-cyan-800/50 active:border-cyan-500/40 active:scale-95 select-none touch-none transition-all duration-100"
              >
                {"🔫"}
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("d", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("d", false); }}
                onMouseDown={() => handleTouch("d", true)}
                onMouseUp={() => handleTouch("d", false)}
                onMouseLeave={() => handleTouch("d", false)}
                className="w-14 h-14 rounded-2xl bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 text-xl font-bold active:bg-cyan-800/50 active:border-cyan-500/40 active:scale-95 select-none touch-none transition-all duration-100"
              >
                {"▶"}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2.5">
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("ArrowLeft", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("ArrowLeft", false); }}
                onMouseDown={() => handleTouch("ArrowLeft", true)}
                onMouseUp={() => handleTouch("ArrowLeft", false)}
                onMouseLeave={() => handleTouch("ArrowLeft", false)}
                className="w-14 h-14 rounded-2xl bg-pink-950/50 border border-pink-500/20 text-pink-400 text-xl font-bold active:bg-pink-800/50 active:border-pink-500/40 active:scale-95 select-none touch-none transition-all duration-100"
              >
                {"◀"}
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("p2shoot", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("p2shoot", false); }}
                onMouseDown={() => handleTouch("p2shoot", true)}
                onMouseUp={() => handleTouch("p2shoot", false)}
                onMouseLeave={() => handleTouch("p2shoot", false)}
                className="w-14 h-14 rounded-2xl bg-pink-950/50 border border-pink-500/20 text-pink-400 text-xl font-bold active:bg-pink-800/50 active:border-pink-500/40 active:scale-95 select-none touch-none transition-all duration-100"
              >
                {"🔫"}
              </button>
              <button
                onTouchStart={(e) => { e.preventDefault(); handleTouch("ArrowRight", true); }}
                onTouchEnd={(e) => { e.preventDefault(); handleTouch("ArrowRight", false); }}
                onMouseDown={() => handleTouch("ArrowRight", true)}
                onMouseUp={() => handleTouch("ArrowRight", false)}
                onMouseLeave={() => handleTouch("ArrowRight", false)}
                className="w-14 h-14 rounded-2xl bg-pink-950/50 border border-pink-500/20 text-pink-400 text-xl font-bold active:bg-pink-800/50 active:border-pink-500/40 active:scale-95 select-none touch-none transition-all duration-100"
              >
                {"▶"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      <AnimatePresence>
        {gameStatus === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center text-zinc-500 text-xs space-y-1.5 mt-1"
          >
            <p>
              <span className="inline-block w-2.5 h-2.5 bg-cyan-400 rounded-sm mr-1.5 opacity-70" />
              Triângulos / Diamantes = {POINTS_NORMAL} pts
            </p>
            <p>
              <span className="inline-block w-2.5 h-2.5 bg-amber-400 rounded-sm mr-1.5 opacity-70" />
              Inimigo Dourado = {POINTS_BONUS} pts
            </p>
            <p className="flex items-center justify-center gap-1 flex-wrap">
              <span className="text-rose-400 font-bold">scouts</span> ·
              <span className="text-lime-400 font-bold">fighters (atiram e ESQUIVAM!)</span> ·
              <span className="text-purple-400 font-bold">tanques</span> ·
              <span className="text-red-500 font-bold">kamikazes</span> ·
              <span className="text-sky-400 font-bold">divisores</span>
            </p>
            <p className="flex items-center justify-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded bg-cyan-500/30 border border-cyan-400 text-cyan-300 text-[9px] font-black flex items-center justify-center">L</span> LASER</span>
              <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded bg-purple-500/30 border border-purple-400 text-purple-300 text-[9px] font-black flex items-center justify-center">D</span> DRONE aliado</span>
              <span className="text-amber-400">combo ×4 no pico!</span>
            </p>
            <p className="text-zinc-600">
              Inimigos que passam roubam uma vida do jogador daquele lado
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function drawEnemyShape(ctx: CanvasRenderingContext2D, e: Enemy) {
  if (e.type === "triangle") {
    ctx.beginPath();
    ctx.moveTo(0, -e.size);
    ctx.lineTo(-e.size * 0.8, e.size * 0.7);
    ctx.lineTo(e.size * 0.8, e.size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -e.size);
    ctx.lineTo(e.size * 0.7, 0);
    ctx.lineTo(0, e.size);
    ctx.lineTo(-e.size * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

export default SpaceShooter;
