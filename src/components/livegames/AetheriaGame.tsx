import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import {
  ArrowLeft, Backpack, Compass, Heart, Map, Shield, Sparkles, Sword, Wind, Zap,
} from "lucide-react";
import "./AetheriaGame.css";

interface Props {
  onScore?: (name: string, score: number) => void;
  onExit?: () => void;
}

const CLASSES = [
  { id: "sentinel", name: "Sentinela", role: "Defesa e combate próximo", color: "#f6c76b", icon: Shield },
  { id: "arcanist", name: "Arcanista", role: "Magia e energia elemental", color: "#8dc9ff", icon: Sparkles },
  { id: "ranger", name: "Batedora", role: "Agilidade e ataques precisos", color: "#a5e6ae", icon: Compass },
] as const;

type ClassId = typeof CLASSES[number]["id"];
type SavedCharacter = { classId: ClassId; totalXp: number; coins: number; kills: number; questAccepted: boolean; questComplete: boolean };

const SAVE_KEY = "bateu-aetheria-character";
const XP_PER_LEVEL = 100;

function loadCharacter(): SavedCharacter | null {
  try {
    const value = localStorage.getItem(SAVE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as SavedCharacter;
    if (!CLASSES.some((characterClass) => characterClass.id === parsed.classId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function addTree(scene: THREE.Scene, x: number, z: number, scale: number) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 2.2 * scale, 7),
    new THREE.MeshStandardMaterial({ color: "#77533d", roughness: 1 }),
  );
  trunk.position.set(x, 1.1 * scale, z);
  trunk.castShadow = true;
  scene.add(trunk);

  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1.05 * scale, 2.6 * scale, 7),
    new THREE.MeshStandardMaterial({ color: "#4d927c", roughness: 0.9 }),
  );
  leaves.position.set(x, 2.9 * scale, z);
  leaves.castShadow = true;
  scene.add(leaves);
}

function createAvatar(color: string) {
  const avatar = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.72 });
  const darkCloth = new THREE.MeshStandardMaterial({ color: "#263453", roughness: 0.8 });
  const skin = new THREE.MeshStandardMaterial({ color: "#e8bc96", roughness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: "#f2d38b", metalness: 0.25, roughness: 0.55 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.72, 4, 8), cloth);
  torso.position.y = 1.15;
  torso.castShadow = true;
  avatar.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), skin);
  head.position.y = 1.98;
  head.castShadow = true;
  avatar.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), darkCloth);
  hair.position.y = 2.07;
  avatar.add(hair);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.46, 3, 6), darkCloth);
    leg.position.set(side * 0.19, 0.4, 0);
    leg.castShadow = true;
    avatar.add(leg);

    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.48, 3, 6), cloth);
    arm.position.set(side * 0.51, 1.28, 0);
    arm.rotation.z = side * -0.15;
    arm.castShadow = true;
    avatar.add(arm);
  }

  const charm = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), gold);
  charm.position.set(0, 1.2, 0.42);
  avatar.add(charm);
  return avatar;
}

function addMob(scene: THREE.Scene, x: number, z: number, color: string, scale: number) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.65 * scale, 16, 12), material);
  body.scale.set(1, 0.8, 1.05);
  body.position.y = 0.72 * scale;
  body.castShadow = true;
  group.add(body);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.85 * scale, 16, 10),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12 }),
  );
  glow.position.y = 0.72 * scale;
  group.add(glow);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.08 * scale, 8, 6),
      new THREE.MeshBasicMaterial({ color: "#fff4d7" }),
    );
    eye.position.set(side * 0.2 * scale, 0.92 * scale, 0.51 * scale);
    group.add(eye);
  }
  group.position.set(x, 0, z);
  scene.add(group);
  return group;
}

function buildWorld(canvas: HTMLCanvasElement, color: string) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#9cc9e6");
  scene.fog = new THREE.Fog("#9cc9e6", 65, 190);
  scene.add(new THREE.HemisphereLight("#e5f3ff", "#6b927a", 2.1));

  const sun = new THREE.DirectionalLight("#fff3d7", 3.1);
  sun.position.set(-18, 35, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const island = new THREE.Mesh(
    new THREE.CylinderGeometry(20, 24, 5, 40),
    new THREE.MeshStandardMaterial({ color: "#6eaa83", roughness: 1 }),
  );
  island.position.y = -2.5;
  island.receiveShadow = true;
  island.castShadow = true;
  scene.add(island);

  const islandRock = new THREE.Mesh(
    new THREE.ConeGeometry(18, 13, 12),
    new THREE.MeshStandardMaterial({ color: "#626c7a", roughness: 1 }),
  );
  islandRock.position.set(0, -10.4, 0);
  islandRock.rotation.y = Math.PI / 12;
  islandRock.castShadow = true;
  scene.add(islandRock);

  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 35),
    new THREE.MeshStandardMaterial({ color: "#c5ae87", roughness: 1 }),
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.02, -4);
  scene.add(path);

  for (let index = 0; index < 12; index++) {
    const angle = (index / 12) * Math.PI * 2;
    addTree(scene, Math.cos(angle) * 13, Math.sin(angle) * 13, 0.75 + (index % 3) * 0.16);
  }

  const tower = new THREE.Group();
  const towerBase = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.7, 6, 8),
    new THREE.MeshStandardMaterial({ color: "#ead7b0", roughness: 0.85 }),
  );
  towerBase.position.y = 3;
  towerBase.castShadow = true;
  tower.add(towerBase);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.5, 3.5, 8),
    new THREE.MeshStandardMaterial({ color: "#4e7590", roughness: 0.8 }),
  );
  roof.position.y = 7.7;
  roof.castShadow = true;
  tower.add(roof);
  tower.position.set(-10, 0, -9);
  scene.add(tower);

  const portal = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.17, 10, 32),
    new THREE.MeshStandardMaterial({ color: "#9be6db", emissive: "#4fafa9", emissiveIntensity: 1.3 }),
  );
  portal.position.set(10, 1.8, -10);
  scene.add(portal);
  const portalBase = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.5, 0.45, 24),
    new THREE.MeshStandardMaterial({ color: "#7b7199", roughness: 0.6 }),
  );
  portalBase.position.set(10, 0.2, -10);
  scene.add(portalBase);

  const floatingIslands: THREE.Mesh[] = [];
  for (const [x, y, z, radius] of [[-27, 13, -24, 7], [28, 20, -32, 9], [37, 10, 8, 6]] as const) {
    const floater = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 0.72, 2.4, 18),
      new THREE.MeshStandardMaterial({ color: "#81b997", roughness: 0.9 }),
    );
    floater.position.set(x, y, z);
    floater.castShadow = true;
    scene.add(floater);
    floatingIslands.push(floater);
  }

  const clouds: THREE.Group[] = [];
  for (let index = 0; index < 8; index++) {
    const cloud = new THREE.Group();
    const cloudMaterial = new THREE.MeshStandardMaterial({ color: "#eef7fb", roughness: 1 });
    for (let puff = 0; puff < 4; puff++) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.8 - (puff % 2) * 0.25, 12, 8), cloudMaterial);
      mesh.position.set((puff - 1.5) * 1.8, (puff % 2) * 0.55, (puff % 3) * 0.35);
      cloud.add(mesh);
    }
    cloud.position.set((index - 3.5) * 18, 11 + (index % 3) * 4, -35 - (index % 4) * 13);
    scene.add(cloud);
    clouds.push(cloud);
  }

  const guide = new THREE.Group();
  const guideBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.38, 0.72, 4, 8),
    new THREE.MeshStandardMaterial({ color: "#df9b65", roughness: 0.8 }),
  );
  guideBody.position.y = 1.1;
  guide.add(guideBody);
  const guideHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.31, 12, 10),
    new THREE.MeshStandardMaterial({ color: "#efc7a5", roughness: 0.9 }),
  );
  guideHead.position.y = 1.93;
  guide.add(guideHead);
  guide.position.set(-5, 0, 5);
  scene.add(guide);

  const avatar = createAvatar(color);
  avatar.position.set(0, 0, 7);
  scene.add(avatar);

  const mobs = [
    addMob(scene, 2, -1, "#e89169", 1),
    addMob(scene, -7, -5, "#7c89bc", 1.15),
    addMob(scene, 8, 3, "#79b99e", 0.9),
  ];

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 250);
  camera.position.set(0, 7, 18);
  camera.lookAt(avatar.position);

  const resize = () => {
    const { clientWidth, clientHeight } = canvas.parentElement ?? canvas;
    if (!clientWidth || !clientHeight) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  if (canvas.parentElement) observer.observe(canvas.parentElement);
  resize();

  return { renderer, scene, camera, avatar, mobs, clouds, floatingIslands, observer };
}

export default function AetheriaGame({ onScore, onExit }: Props) {
  const saved = useRef(loadCharacter()).current;
  const [phase, setPhase] = useState<"intro" | "world">(saved ? "world" : "intro");
  const [classId, setClassId] = useState<ClassId>(saved?.classId ?? "sentinel");
  const [totalXp, setTotalXp] = useState(saved?.totalXp ?? 0);
  const [coins, setCoins] = useState(saved?.coins ?? 30);
  const [kills, setKills] = useState(saved?.kills ?? 0);
  const [questAccepted, setQuestAccepted] = useState(saved?.questAccepted ?? false);
  const [questComplete, setQuestComplete] = useState(saved?.questComplete ?? false);
  const [enemyHp, setEnemyHp] = useState(100);
  const [health, setHealth] = useState(100);
  const [mana, setMana] = useState(80);
  const [flying, setFlying] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReturnType<typeof buildWorld> | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const attackRef = useRef<() => void>(() => {});
  const restoreManaRef = useRef<() => void>(() => {});
  const lastAttackRef = useRef(0);
  const flyingRef = useRef(false);
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const selectedClass = CLASSES.find((item) => item.id === classId) ?? CLASSES[0];

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ classId, totalXp, coins, kills, questAccepted, questComplete }));
    } catch (error) {
      console.warn("Não foi possível guardar o progresso de Aetheria.", error);
    }
  }, [classId, totalXp, coins, kills, questAccepted, questComplete]);

  useEffect(() => {
    if (phase !== "world" || !canvasRef.current) return;
    const engine = buildWorld(canvasRef.current, selectedClass.color);
    engineRef.current = engine;
    let animationFrame = 0;
    let previousTime = performance.now();
    const direction = new THREE.Vector3();

    const animate = (time: number) => {
      animationFrame = requestAnimationFrame(animate);
      const delta = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      const keys = keysRef.current;
      direction.set(
        Number(keys.d || keys.arrowright) - Number(keys.a || keys.arrowleft),
        0,
        Number(keys.s || keys.arrowdown) - Number(keys.w || keys.arrowup),
      );
      if (direction.lengthSq() > 0) {
        direction.normalize();
        engine.avatar.position.addScaledVector(direction, delta * (keys.shift ? 11 : 7));
        engine.avatar.rotation.y = Math.atan2(direction.x, direction.z);
      }

      const limit = flyingRef.current ? 35 : 17;
      engine.avatar.position.x = THREE.MathUtils.clamp(engine.avatar.position.x, -limit, limit);
      engine.avatar.position.z = THREE.MathUtils.clamp(engine.avatar.position.z, -limit, limit);
      const heightTarget = flyingRef.current ? 3.7 + Math.sin(time / 260) * 0.35 : 0;
      engine.avatar.position.y = THREE.MathUtils.damp(engine.avatar.position.y, heightTarget, 5, delta);

      const cameraTarget = new THREE.Vector3(
        engine.avatar.position.x,
        engine.avatar.position.y + 5.5,
        engine.avatar.position.z + 13,
      );
      engine.camera.position.lerp(cameraTarget, Math.min(delta * 2.5, 1));
      engine.camera.lookAt(engine.avatar.position.x, engine.avatar.position.y + 1, engine.avatar.position.z - 1);
      engine.clouds.forEach((cloud, index) => {
        cloud.position.x += delta * (index % 2 === 0 ? 0.18 : -0.12);
        if (cloud.position.x > 95) cloud.position.x = -95;
        if (cloud.position.x < -95) cloud.position.x = 95;
      });
      engine.floatingIslands.forEach((island, index) => {
        island.position.y += Math.sin(time / 1200 + index) * delta * 0.12;
      });
      engine.renderer.render(engine.scene, engine.camera);

    };
    animationFrame = requestAnimationFrame(animate);

    const onKeyDown = (event: KeyboardEvent) => {
      if (/^(input|textarea)$/i.test((event.target as HTMLElement).tagName)) return;
      const key = event.key.toLowerCase();
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
      keysRef.current[key] = true;
      if (key === "f") setFlying((active) => {
        flyingRef.current = !active;
        return !active;
      });
      if (key === "1") attackRef.current();
      if (key === "2") restoreManaRef.current();
      if (key === "i") setInventoryOpen((open) => !open);
    };
    const onKeyUp = (event: KeyboardEvent) => { keysRef.current[event.key.toLowerCase()] = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      engine.observer.disconnect();
      engine.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      engine.renderer.dispose();
      engineRef.current = null;
    };
    // The scene is recreated when the player enters the world; controls read state through callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selectedClass.color]);

  const attack = useCallback(() => {
    if (phase !== "world" || performance.now() - lastAttackRef.current < 650) return;
    const engine = engineRef.current;
    const target = engine?.mobs.find((mob) => mob.visible);
    if (!engine || !target || engine.avatar.position.distanceTo(target.position) > 9) {
      setNotice("Aproxima-te de uma criatura para atacar.");
      return;
    }
    lastAttackRef.current = performance.now();
    if (enemyHp > 25) {
      setEnemyHp(enemyHp - 25);
      setNotice("Ataque certeiro · a criatura perdeu energia.");
      return;
    }
    target.visible = false;
    const nextKills = kills + 1;
    const earnsQuestReward = questAccepted && nextKills >= 3 && !questComplete;
    setKills(nextKills);
    setTotalXp((xp) => xp + 35 + (earnsQuestReward ? 100 : 0));
    setCoins((amount) => amount + (earnsQuestReward ? 80 : 8));
    setEnemyHp(100);
    onScore?.("Aetheria", earnsQuestReward ? 115 : 35);
    if (earnsQuestReward) {
      setQuestComplete(true);
      setNotice("Missão concluída! Recebeste 100 EXP e 80 moedas.");
    } else {
      setNotice("Criatura derrotada · +35 EXP");
    }
  }, [enemyHp, kills, onScore, phase, questAccepted, questComplete]);

  const restoreMana = useCallback(() => {
    if (mana < 20) {
      setNotice("Precisas de pelo menos 20 de energia para usar esta habilidade.");
      return;
    }
    setMana((value) => value - 20);
    setHealth((value) => Math.min(100, value + 28));
    setNotice("Luz restauradora · recuperaste saúde.");
  }, [mana]);

  const toggleFlight = () => {
    setFlying((active) => {
      flyingRef.current = !active;
      return !active;
    });
  };

  const acceptQuest = () => {
    setQuestAccepted(true);
    setNotice("A missão começou: derrota três criaturas nas ilhas.");
  };

  attackRef.current = attack;
  restoreManaRef.current = restoreMana;

  if (phase === "intro") {
    return (
      <main className="aetheria-intro" data-testid="aetheria-intro">
        <div className="aetheria-intro-sky" aria-hidden="true">
          <span className="aetheria-orbit aetheria-orbit-one" />
          <span className="aetheria-orbit aetheria-orbit-two" />
          <div className="aetheria-island-preview"><i /><b /><em /></div>
          <div className="aetheria-sun" />
        </div>
        <div className="aetheria-intro-content">
          <div className="aetheria-overline"><Sparkles size={14} /> UM NOVO HORIZONTE</div>
          <h1>Ilhas de <span>Aetheria</span></h1>
          <p>Um mundo aberto entre as nuvens. Escolhe o teu caminho, conhece as ilhas e escreve a tua própria aventura.</p>
          <div className="aetheria-class-picker" aria-label="Escolhe uma classe">
            {CLASSES.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`aetheria-class-card ${classId === item.id ? "is-selected" : ""}`}
                  onClick={() => setClassId(item.id)}
                  style={{ "--class-color": item.color } as CSSProperties}
                >
                  <Icon size={21} />
                  <span><strong>{item.name}</strong><small>{item.role}</small></span>
                </button>
              );
            })}
          </div>
          <button type="button" className="aetheria-enter" onClick={() => setPhase("world")}>
            Explorar Aetheria <Wind size={17} />
          </button>
          <div className="aetheria-intro-controls">WASD para andar · F para voar · 1 para atacar · 2 para curar</div>
        </div>
        {onExit && <button className="aetheria-back" type="button" onClick={onExit}><ArrowLeft size={16} /> Voltar aos jogos</button>}
      </main>
    );
  }

  return (
    <main className="aetheria-world" data-testid="aetheria-world">
      <div className="aetheria-scene">
        <canvas ref={canvasRef} aria-label="Mundo 3D de Aetheria" />
        <div className="aetheria-vignette" />
        <div className="aetheria-world-title"><span>🌤️</span><div><strong>Ilhas do Alvorecer</strong><small>Região segura · Céu limpo</small></div></div>

        <section className="aetheria-player-card">
          <div className="aetheria-player-avatar" style={{ "--class-color": selectedClass.color } as CSSProperties}>
            {selectedClass.id === "sentinel" ? <Shield size={20} /> : selectedClass.id === "arcanist" ? <Sparkles size={20} /> : <Compass size={20} />}
          </div>
          <div className="aetheria-player-info">
            <strong>Viajante <span>Nv. {level}</span></strong>
            <small>{selectedClass.name}</small>
            <div className="aetheria-xp-track"><i style={{ width: `${totalXp % XP_PER_LEVEL}%` }} /></div>
            <small className="aetheria-xp-caption">{totalXp % XP_PER_LEVEL} / {XP_PER_LEVEL} EXP</small>
          </div>
          {onExit && <button className="aetheria-exit" type="button" onClick={onExit} aria-label="Sair do mundo"><ArrowLeft size={16} /></button>}
        </section>

        <section className="aetheria-status-bars" aria-label="Estado do personagem">
          <div><Heart size={14} /><span>SAÚDE</span><i><b style={{ width: `${health}%`, background: "#f1797e" }} /></i><strong>{health}</strong></div>
          <div><Zap size={14} /><span>ENERGIA</span><i><b style={{ width: `${mana}%`, background: "#77c8ff" }} /></i><strong>{mana}</strong></div>
        </section>

        <div className="aetheria-region"><Compass size={13} /> PLANÍCIE DAS BRISAS <span>•</span> {coins} <span>✦</span></div>

        <section className="aetheria-quest-card">
          <div className="aetheria-quest-heading"><Map size={15} /><span>DIÁRIO DE VIAGEM</span></div>
          <strong>{questComplete ? "A guardiã das brisas" : questAccepted ? "Ecos na pradaria" : "Uma nova jornada"}</strong>
          <p>{questComplete ? "As criaturas acalmaram. A ilha está em paz." : questAccepted ? "Afasta as criaturas que rondam a ilha." : "Fala com a guia para descobrir o que ameaça a ilha."}</p>
          {questAccepted && !questComplete ? (
            <div className="aetheria-quest-progress"><span>Criaturas</span><b>{Math.min(kills, 3)} / 3</b><i><em style={{ width: `${Math.min(kills / 3, 1) * 100}%` }} /></i></div>
          ) : questComplete ? (
            <div className="aetheria-quest-done">✓ Jornada concluída</div>
          ) : (
            <button type="button" className="aetheria-quest-accept" onClick={acceptQuest}>Falar com Nara <span>›</span></button>
          )}
        </section>

        <section className="aetheria-minimap" aria-label="Mapa da região">
          <div className="aetheria-map-grid" />
          <span className="aetheria-map-island" />
          <span className="aetheria-map-marker" />
          <span className="aetheria-map-label">BRISAS</span>
          <span className="aetheria-map-compass">N</span>
        </section>

        {notice && <div className="aetheria-notice" role="status">{notice}<button type="button" onClick={() => setNotice("")}>×</button></div>}

        <div className="aetheria-hotbar">
          <button type="button" onClick={attack} aria-label="Ataque básico"><span className="aetheria-key">1</span><Sword size={19} /><small>Ataque</small></button>
          <button type="button" onClick={restoreMana} aria-label="Luz restauradora"><span className="aetheria-key">2</span><Heart size={19} /><small>Restaurar</small></button>
          <button type="button" onClick={toggleFlight} aria-label="Alternar voo" className={flying ? "is-active" : ""}><span className="aetheria-key">F</span><Wind size={19} /><small>{flying ? "Planar" : "Voar"}</small></button>
          <button type="button" onClick={() => setInventoryOpen((open) => !open)} aria-label="Abrir mochila"><span className="aetheria-key">I</span><Backpack size={19} /><small>Mochila</small></button>
        </div>

        <div className="aetheria-controls-hint">WASD mover <span>·</span> SHIFT correr <span>·</span> F planar <span>·</span> 1 atacar <span>·</span> 2 restaurar</div>

        {inventoryOpen && (
          <section className="aetheria-inventory">
            <div><strong><Backpack size={16} /> Mochila de viagem</strong><button type="button" onClick={() => setInventoryOpen(false)} aria-label="Fechar mochila">×</button></div>
            <p>Os teus achados acompanham-te pelas ilhas.</p>
            <span className="aetheria-item"><Sparkles size={17} /> Fragmento de brisa <b>{Math.max(kills, 0)}</b></span>
            <span className="aetheria-item"><span>✦</span> Moedas de Aetheria <b>{coins}</b></span>
          </section>
        )}

        <div className="aetheria-target" aria-live="polite">
          <span className="aetheria-target-dot" />
          <div><strong>Faísca errante</strong><small>Criatura das nuvens · Nv. 1</small></div>
          <i><b style={{ width: `${enemyHp}%` }} /></i>
        </div>
      </div>
    </main>
  );
}
