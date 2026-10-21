// ═══════════════════════════════════════════════════════════════════
// HORDAS DE BATEU — dados do mundo (paridade REA hordes.io, original)
// Números extraídos por engenharia reversa do cliente oficial:
//   • +8 HP por nível; GCD 1.5s; graceRange = range*1.2
//   • dano = base + roll*(coef + nv*incr) — ex. 5 + roll*(0.38+nv*0.39)
//   • progressão de mobs lv1→lv50 (larva→raposa→javali→lobo→…→boss)
//   • quests em cadeia: 150xp/50g + arma → 350xp/100g + livro → …
// ═══════════════════════════════════════════════════════════════════

export const NIVEL_MAX = 50;

// ── Facções (REA: Vanguard=verde/ordem vs Bloodlust=vermelho/caos + neutra) ──
export interface FaccaoDef { id: number; nome: string; lore: string; cor: string; corEscura: string; }
export const FACCOES: FaccaoDef[] = [
  { id: 0, nome: "Vanguarda de Aurora", lore: "Ordem, estrutura e tradição. O castelo ergue-se numa região verdejante junto à Pedra da Guarda. Quem serve a Aurora protege as aldeias e caça as hordas selvagens.", cor: "#3ecf6e", corEscura: "#14532d" },
  { id: 1, nome: "Horda de Brasa", lore: "Liberdade, lealdade e caos criativo. As defesas ficam num reino desértico chamado Desembarque Sem Cabeça. Quem serve a Brasa vive pelo roubo, glória e fogo.", cor: "#f0563e", corEscura: "#7f1d1d" },
  { id: 2, nome: "Neutro", lore: "Mercadores, errantes e aventureiros que não juram a ninguém. Neutros negociam com ambas as facções e exploram o mundo sem guerras.", cor: "#f4c95d", corEscura: "#78350f" },
];

// ── Classes (REA: base HP100/MP100, +8 HP/nível, atributos por classe) ──
export interface SkillDef {
  id: string; nome: string; classe: number; nivel: number;
  cd: number; custoMP: number; alcance: number; castLen: number;
  alvo: "inimigo" | "auto" | "area"; tipo: "dano" | "cura" | "buff" | "aoe" | "dot" | "summon";
  desc: string; emoji: string;
  coef: number; incr: number; base: number; // dano = base + roll*(coef + nivel*incr)
}
export interface ClasseDef {
  id: number; nome: string; emoji: string; arma: string; desc: string;
  cor: string; hp: number; mp: number; atq: number; def: number; crit: number;
  skillInicial: string; atributos: { chave: string; valor: number }[];
  skills: string[]; // ids por ordem de aprendizagem (1º = básico)
}
export const CLASSES: ClasseDef[] = [
  {
    id: 0, nome: "Guerreiro", emoji: "⚔️", arma: "Espada", cor: "#f59e0b",
    desc: "Tanque de linha da frente. Golpes pesados, provocação e gritos que endurecem o grupo. Mais HP do campo de batalha.",
    hp: 130, mp: 60, atq: 12, def: 14, crit: 8, skillInicial: "golpe",
    atributos: [{ chave: "ATQ", valor: 12 }, { chave: "DEF", valor: 14 }, { chave: "HP", valor: 130 }],
    skills: ["golpe", "grito", "investida", "peleferro", "provocar", "cortecrescente", "redemoinho", "furia"],
  },
  {
    id: 1, nome: "Mago", emoji: "🔮", arma: "Cajado", cor: "#38bdf8",
    desc: "Canaliza o gelo antigo. Dano à distância devastador, novas de área e Bloco de Gelo para escapar à morte.",
    hp: 90, mp: 140, atq: 16, def: 6, crit: 10, skillInicial: "dardogelo",
    atributos: [{ chave: "ATQ", valor: 16 }, { chave: "MAG", valor: 18 }, { chave: "HP", valor: 90 }],
    skills: ["dardogelo", "estilhacar", "escudogelo", "auraglacial", "novagelo", "teleporte", "chuvacristais", "blocoGelo"],
  },
  {
    id: 2, nome: "Arqueiro", emoji: "🏹", arma: "Arco", cor: "#34d399",
    desc: "Precisão mortal a distância. Flechas venenosas, tiros certeiros e passos ligeiros que ninguém apanha.",
    hp: 100, mp: 90, atq: 14, def: 8, crit: 18, skillInicial: "tiropreciso",
    atributos: [{ chave: "ATQ", valor: 14 }, { chave: "CRIT", valor: 18 }, { chave: "HP", valor: 100 }],
    skills: ["tiropreciso", "flechavenenosa", "passoligeiro", "rajada", "flechavampirica", "tirocegante", "tirocerteiro", "perfuracao"],
  },
  {
    id: 3, nome: "Clérigo", emoji: "✨", arma: "Martelo", cor: "#c084fc",
    desc: "Voz dos antigos. Cura o grupo, colhe almas inimigas e invoca totens. Nenhuma party sobrevive sem um.",
    hp: 105, mp: 130, atq: 11, def: 10, crit: 6, skillInicial: "curar",
    atributos: [{ chave: "ATQ", valor: 11 }, { chave: "CURA", valor: 16 }, { chave: "HP", valor: 105 }],
    skills: ["curar", "palavravigor", "colheitaalmas", "praga", "totemcura", "invocarloboluz", "agonizar", "limparespiritual"],
  },
];

// ── Skills (REA: cd/custo/alcance/castLen espelhados; dano = base+roll*(coef+nv*incr)) ──
export const SKILLS: Record<string, SkillDef> = {
  // Guerreiro
  golpe: { id: "golpe", nome: "Golpe", classe: 0, nivel: 1, cd: 1, custoMP: 2, alcance: 3, castLen: 0, alvo: "inimigo", tipo: "dano", emoji: "🗡️", coef: 0.38, incr: 0.39, base: 5, desc: "Golpe firme que às vezes atordoa o alvo por 3s." },
  grito: { id: "grito", nome: "Grito de Guerra", classe: 0, nivel: 1, cd: 150, custoMP: 10, alcance: 0, castLen: 0, alvo: "auto", tipo: "buff", emoji: "📣", coef: 0, incr: 0, base: 0, desc: "Aumenta o dano de todos os aliados próximos durante 300s." },
  investida: { id: "investida", nome: "Investida", classe: 0, nivel: 11, cd: 15, custoMP: 12, alcance: 25, castLen: 0, alvo: "inimigo", tipo: "dano", emoji: "💥", coef: 0.5, incr: 0.3, base: 10, desc: "Avança até o alvo e o atordoa por 0.7–1.7s." },
  peleferro: { id: "peleferro", nome: "Pele de Ferro", classe: 0, nivel: 8, cd: 45, custoMP: 20, alcance: 0, castLen: 0, alvo: "auto", tipo: "buff", emoji: "🛡️", coef: 0, incr: 0, base: 0, desc: "+40% defesa durante 12s." },
  provocar: { id: "provocar", nome: "Provocar", classe: 0, nivel: 6, cd: 15, custoMP: 8, alcance: 10, castLen: 0, alvo: "inimigo", tipo: "aoe", emoji: "😡", coef: 0, incr: 0, base: 0, desc: "Força os inimigos próximos a mirar-te." },
  cortecrescente: { id: "cortecrescente", nome: "Corte Crescente", classe: 0, nivel: 3, cd: 6, custoMP: 6, alcance: 4, castLen: 0, alvo: "area", tipo: "aoe", emoji: "🌙", coef: 1.18, incr: 0.18, base: 5, desc: "Arco de lâmina que fere todos os inimigos à frente." },
  redemoinho: { id: "redemoinho", nome: "Redemoinho", classe: 0, nivel: 4, cd: 30, custoMP: 16, alcance: 5, castLen: 0, alvo: "area", tipo: "aoe", emoji: "🌀", coef: 0.9, incr: 0.25, base: 8, desc: "Rodopio de aço que atinge tudo à volta." },
  furia: { id: "furia", nome: "Fúria", classe: 0, nivel: 13, cd: 50, custoMP: 24, alcance: 0, castLen: 0, alvo: "auto", tipo: "buff", emoji: "🔥", coef: 0, incr: 0, base: 0, desc: "+35% velocidade de ataque e dano durante 17s." },
  // Mago
  dardogelo: { id: "dardogelo", nome: "Dardo de Gelo", classe: 1, nivel: 1, cd: 0, custoMP: 3, alcance: 28, castLen: 1.5, alvo: "inimigo", tipo: "dano", emoji: "❄️", coef: 0.3, incr: 0.32, base: 5, desc: "Projétil de gelo que congela levemente o alvo." },
  estilhacar: { id: "estilhacar", nome: "Estilhaçar", classe: 1, nivel: 3, cd: 8, custoMP: 10, alcance: 28, castLen: 1.5, alvo: "inimigo", tipo: "dano", emoji: "🧊", coef: 0.53, incr: 0.45, base: 5, desc: "Rasga alvos congelados por dano brutal." },
  escudogelo: { id: "escudogelo", nome: "Escudo de Gelo", classe: 1, nivel: 5, cd: 60, custoMP: 25, alcance: 0, castLen: 0, alvo: "auto", tipo: "buff", emoji: "🛡️", coef: 0, incr: 0, base: 0, desc: "Bloqueia os próximos ataques durante 60s." },
  auraglacial: { id: "auraglacial", nome: "Aura Glacial", classe: 1, nivel: 17, cd: 120, custoMP: 45, alcance: 0, castLen: 0, alvo: "area", tipo: "buff", emoji: "🌬️", coef: 0, incr: 0, base: 0, desc: "Congela lentamente quem se aproxima durante 300s." },
  novagelo: { id: "novagelo", nome: "Nova de Gelo", classe: 1, nivel: 3, cd: 25, custoMP: 16, alcance: 8, castLen: 0, alvo: "area", tipo: "aoe", emoji: "💠", coef: 0.25, incr: 0.4, base: 4, desc: "Explosão de gelo que fere e trava inimigos à volta." },
  teleporte: { id: "teleporte", nome: "Teleporte", classe: 1, nivel: 15, cd: 45, custoMP: 40, alcance: 30, castLen: 0, alvo: "inimigo", tipo: "dano", emoji: "🌌", coef: 0.8, incr: 0.3, base: 10, desc: "Relâmpago místico que atravessa o espaço." },
  chuvacristais: { id: "chuvacristais", nome: "Chuva de Cristais", classe: 1, nivel: 8, cd: 8, custoMP: 20, alcance: 28, castLen: 1.5, alvo: "area", tipo: "aoe", emoji: "☄️", coef: 0.56, incr: 0.6, base: 10, desc: "Chuva de estilhaços no alvo e arredores." },
  blocoGelo: { id: "blocoGelo", nome: "Bloco de Gelo", classe: 1, nivel: 9, cd: 80, custoMP: 25, alcance: 0, castLen: 0, alvo: "auto", tipo: "buff", emoji: "🧱", coef: 0, incr: 0, base: 0, desc: "Encerra-te em gelo impenetrável por 5s (imune, não te moves)." },
  // Arqueiro
  tiropreciso: { id: "tiropreciso", nome: "Tiro Preciso", classe: 2, nivel: 1, cd: 0, custoMP: 2, alcance: 30, castLen: 0, alvo: "inimigo", tipo: "dano", emoji: "🎯", coef: 0.36, incr: 0.35, base: 5, desc: "Flecha rápida e certeira." },
  flechavenenosa: { id: "flechavenenosa", nome: "Flechas Venenosas", classe: 2, nivel: 5, cd: 40, custoMP: 16, alcance: 0, castLen: 0, alvo: "auto", tipo: "buff", emoji: "☠️", coef: 0, incr: 0, base: 0, desc: "Durante 12s as flechas envenenam (dano contínuo)." },
  passoligeiro: { id: "passoligeiro", nome: "Passo Ligeiro", classe: 2, nivel: 6, cd: 45, custoMP: 14, alcance: 0, castLen: 0, alvo: "auto", tipo: "buff", emoji: "👟", coef: 0, incr: 0, base: 0, desc: "+45% velocidade de movimento durante 10s." },
  rajada: { id: "rajada", nome: "Rajada", classe: 2, nivel: 7, cd: 10, custoMP: 14, alcance: 30, castLen: 0, alvo: "area", tipo: "aoe", emoji: "🏹", coef: 0.45, incr: 0.3, base: 5, desc: "Chuva de flechas sobre a zona do alvo." },
  flechavampirica: { id: "flechavampirica", nome: "Flecha Vampírica", classe: 2, nivel: 9, cd: 14, custoMP: 18, alcance: 30, castLen: 0, alvo: "inimigo", tipo: "dano", emoji: "🩸", coef: 0.5, incr: 0.4, base: 5, desc: "Rouba vida do alvo para ti." },
  tirocegante: { id: "tirocegante", nome: "Tiro Cegante", classe: 2, nivel: 11, cd: 20, custoMP: 20, alcance: 30, castLen: 0, alvo: "inimigo", tipo: "dano", emoji: "🙈", coef: 0.4, incr: 0.3, base: 5, desc: "Areia nos olhos: o alvo erra os próximos golpes." },
  tirocerteiro: { id: "tirocerteiro", nome: "Tiro Certeiro", classe: 2, nivel: 13, cd: 25, custoMP: 26, alcance: 34, castLen: 2, alvo: "inimigo", tipo: "dano", emoji: "🎯", coef: 1.25, incr: 1.33, base: 5, desc: "Respira fundo… e perfura tudo o que está à frente." },
  perfuracao: { id: "perfuracao", nome: "Perfuração Craniana", classe: 2, nivel: 15, cd: 18, custoMP: 22, alcance: 30, castLen: 0, alvo: "inimigo", tipo: "dano", emoji: "⚡", coef: 0.24, incr: 0.25, base: 5, desc: "Flecha no ponto fraco — ignora parte da defesa." },
  // Clérigo
  curar: { id: "curar", nome: "Curar", classe: 3, nivel: 1, cd: 0, custoMP: 10, alcance: 30, castLen: 1.5, alvo: "inimigo", tipo: "cura", emoji: "💚", coef: 0.2, incr: 0.18, base: 15, desc: "Cura luminosa (usa no alvo hostil = dano sagrado leve)." },
  palavravigor: { id: "palavravigor", nome: "Palavra de Vigor", classe: 3, nivel: 1, cd: 150, custoMP: 20, alcance: 0, castLen: 0, alvo: "auto", tipo: "buff", emoji: "📜", coef: 0, incr: 0, base: 0, desc: "Bênção que aumenta a vida máxima do grupo por 300s." },
  colheitaalmas: { id: "colheitaalmas", nome: "Colheita de Almas", classe: 3, nivel: 3, cd: 6, custoMP: 8, alcance: 26, castLen: 0, alvo: "inimigo", tipo: "dano", emoji: "🌾", coef: 0.24, incr: 0.25, base: 4, desc: "Fere o alvo e cura-te por parte do dano." },
  praga: { id: "praga", nome: "Praga Espalhadora", classe: 3, nivel: 7, cd: 12, custoMP: 15, alcance: 24, castLen: 0, alvo: "area", tipo: "dot", emoji: "🦠", coef: 0.14, incr: 0.2, base: 4, desc: "Doença que se espalha entre inimigos próximos." },
  totemcura: { id: "totemcura", nome: "Totem de Cura", classe: 3, nivel: 9, cd: 30, custoMP: 30, alcance: 0, castLen: 0, alvo: "area", tipo: "cura", emoji: "🗿", coef: 0.08, incr: 0.05, base: 10, desc: "Invoca um totem que regenera aliados próximos." },
  invocarloboluz: { id: "invocarloboluz", nome: "Lobo de Luz", classe: 3, nivel: 11, cd: 60, custoMP: 35, alcance: 0, castLen: 2, alvo: "auto", tipo: "summon", emoji: "🐺", coef: 0, incr: 0, base: 0, desc: "Chama um lobo espiritual que luta ao teu lado." },
  agonizar: { id: "agonizar", nome: "Agonizar", classe: 3, nivel: 5, cd: 10, custoMP: 12, alcance: 26, castLen: 0, alvo: "inimigo", tipo: "dot", emoji: "😭", coef: 0.18, incr: 0.22, base: 4, desc: "Sofrimento que corrói a alma do alvo ao longo do tempo." },
  limparespiritual: { id: "limparespiritual", nome: "Limpeza Espiritual", classe: 3, nivel: 13, cd: 30, custoMP: 20, alcance: 30, castLen: 0, alvo: "auto", tipo: "cura", emoji: "🫧", coef: 0.3, incr: 0.2, base: 15, desc: "Purifica venenos e regenera vida rapidamente." },
};

// ── Mobs (REA: progressão real lv1→50; 0 passivo/1 agressivo; raridade 0-3) ──
export interface MobDef {
  id: string; nome: string; nivel: number; forma: "larva" | "raposa" | "mariposa" | "javali" | "aranha" | "lobo" | "abelha" | "humanoide" | "cogumelo" | "golem" | "tartaruga" | "beetle" | "lagarto" | "verme" | "abutre" | "hiena" | "crocodilo" | "leao" | "urso" | "corvo" | "mumia" | "orc" | "boss";
  cor: string; cor2: string; hpMult: number; danoMult: number; xp: number; ouro: number;
  agressivo: boolean; raridade: 0 | 1 | 2 | 3; escala: number;
}
const m = (
  id: string, nome: string, nivel: number, forma: MobDef["forma"], cor: string, cor2: string,
  hpMult: number, danoMult: number, xp: number, ouro: number, agressivo: boolean,
  raridade: 0 | 1 | 2 | 3 = 0, escala = 1,
): MobDef => ({ id, nome, nivel, forma, cor, cor2, hpMult, danoMult, xp, ouro, agressivo, raridade, escala });

export const MOBS: MobDef[] = [
  // Aldeia + Floresta da Guarda (lv 1–8) — REA: grubs/raposas/mariposas/javali/aranha
  m("larva1", "Larva Jovem", 1, "larva", "#8bc34a", "#558b2f", 1, 0.6, 18, 4, false),
  m("larva2", "Larva Madura", 2, "larva", "#7cb342", "#33691e", 1.2, 0.7, 26, 6, false),
  m("raposa", "Raposa", 3, "raposa", "#fb923c", "#c2410c", 1.3, 0.8, 34, 8, false),
  m("raposaR", "Raposa Raivosa", 4, "raposa", "#f97316", "#9a3412", 1.5, 0.9, 44, 10, true),
  m("mariposa", "Mariposa Lunar", 5, "mariposa", "#e2e8f0", "#94a3b8", 1.2, 0.7, 52, 12, false),
  m("bandidoA", "Bandido Arqueiro", 5, "humanoide", "#a16207", "#713f12", 1.8, 1.1, 60, 18, true),
  m("bandidoE", "Bandido Errante", 6, "humanoide", "#854d0e", "#4d2c05", 2, 1.2, 70, 20, true),
  m("mariposaA", "Mariposa Atlas", 6, "mariposa", "#c084fc", "#6b21a8", 1.6, 0.9, 78, 15, false),
  m("javali", "Javali Selvagem", 7, "javali", "#78350f", "#451a03", 2.4, 1.3, 92, 22, true),
  m("chefeB", "Chefe Bandido", 7, "humanoide", "#1c1917", "#0c0a09", 3, 1.5, 110, 40, true, 1),
  m("aranhaF", "Aranha da Floresta", 8, "aranha", "#4d7c0f", "#1a2e05", 2.6, 1.4, 125, 25, true),
  m("javaliB", "Javali Bruto", 8, "javali", "#57534e", "#292524", 3, 1.5, 135, 28, true, 1),
  // Trilha do Alce (lv 9–15) — REA: lobos/abelhas/mineiros/cogumelo
  m("lobo", "Lobo", 9, "lobo", "#9ca3af", "#374151", 3.2, 1.5, 150, 30, true),
  m("loboC", "Lobo Cinzento", 10, "lobo", "#6b7280", "#1f2937", 3.6, 1.6, 170, 34, true),
  m("loboR", "Lobo Ermo", 12, "lobo", "#57534e", "#1c1917", 4, 1.7, 230, 42, true),
  m("abelhaV", "Abelha Venenosa", 14, "abelha", "#f59e0b", "#92400e", 3.2, 1.7, 290, 50, true),
  m("abelha", "Abelha", 13, "abelha", "#fbbf24", "#b45309", 2.8, 1.6, 260, 45, false),
  m("catador", "Catador da Mina", 14, "humanoide", "#44403c", "#1c1917", 3.8, 1.7, 300, 52, true),
  m("cogumelo", "Cogumelo Saltante", 15, "cogumelo", "#f87171", "#b91c1c", 4, 1.6, 340, 50, false),
  m("mineiro", "Trabalhador da Mina", 15, "humanoide", "#525252", "#262626", 4.4, 1.8, 330, 55, true),
  m("boneco", "Boneco de Treino", 15, "golem", "#a16207", "#53340a", 6, 0, 20, 5, false),
  // Mina de Carvão (lv 14–18) — REA: coal golem/mine workers
  m("golemC", "Golem de Carvão", 16, "golem", "#292524", "#0c0a09", 5.5, 2, 400, 65, true, 1),
  // Colinas dos Pinheiros (lv 17–24) — REA: tartarugas/beetles/lagartos/verme
  m("tartaruga", "Tartaruga", 18, "tartaruga", "#0d9488", "#134e4a", 5.5, 1.6, 460, 70, false),
  m("tartarugaP", "Tartaruga Dorsopedra", 19, "tartaruga", "#0f766e", "#115e59", 6, 1.7, 510, 75, false),
  m("beetle", "Escaravelho", 20, "beetle", "#3f6212", "#1a2e05", 6.2, 1.9, 560, 80, true),
  m("beetleO", "Escaravelho Sombrio", 21, "beetle", "#4a044e", "#2e1065", 6.8, 2, 620, 88, true),
  m("lagarto", "Lagarto Espinhoso", 22, "lagarto", "#65a30d", "#365314", 7.2, 2.1, 680, 95, true),
  m("iguana", "Iguana do Deserto", 23, "lagarto", "#ca8a04", "#713f12", 7.8, 2.2, 740, 100, true),
  m("verme", "Verme de Areia", 24, "verme", "#eab308", "#a16207", 8.5, 2.4, 820, 115, true, 1),
  // Dunas Escaldantes (lv 25–32) — REA: undead/hyenas/vultures/croc
  m("mumia", "Múmia Antiga", 25, "mumia", "#e7e5e4", "#a8a29e", 9, 2.5, 900, 125, true),
  m("mumiaG", "Guarda Múmia", 25, "mumia", "#d6d3d1", "#78716c", 10, 2.7, 980, 140, true, 1),
  m("necromante", "Necromante", 26, "humanoide", "#4c1d95", "#1e1b4b", 9.5, 2.9, 1050, 160, true),
  m("abutre", "Abutre Quebradiço", 27, "abutre", "#a8a29e", "#44403c", 8.8, 2.8, 1120, 150, true),
  m("hiena", "Hiena", 28, "hiena", "#a16207", "#451a03", 9.6, 3, 1220, 165, true),
  m("hienaR", "Hiena Risonha", 29, "hiena", "#854d0e", "#1c1917", 10.4, 3.2, 1330, 180, true),
  m("croc", "Crocodilo do Rio", 30, "crocodilo", "#166534", "#052e16", 12, 3.3, 1450, 200, true),
  m("crocO", "Crocodilo Ossudo", 31, "crocodilo", "#3f6212", "#14260a", 13, 3.5, 1580, 220, true, 1),
  m("pirataA", "Pirata Arqueiro", 32, "humanoide", "#0e7490", "#083344", 12.5, 3.6, 1700, 240, true),
  // Ruínas Sem Cabeça (lv 32–40) — REA: pirates/lion/recluses
  m("reclusa", "Reclusa da Areia", 33, "aranha", "#713f12", "#271705", 13.5, 3.8, 1850, 270, true),
  m("pirataG", "Capitão Pirata", 34, "humanoide", "#155e75", "#082f49", 14, 4, 1900, 300, true, 1),
  m("leao", "Leão", 34, "leao", "#d97706", "#7c2d12", 14.5, 4.1, 1950, 290, true),
  m("raiderW", "Salteador Guerreiro", 38, "humanoide", "#b91c1c", "#450a0a", 17, 4.6, 2400, 360, true),
  m("raiderA", "Salteador Arqueiro", 39, "humanoide", "#991b1b", "#7f1d1d", 16, 4.4, 2500, 380, true),
  // Bosque Sussurrante (lv 35–45) — REA: bears/tarantula/moose/elfs/orcs
  m("urso", "Urso Primordial", 35, "urso", "#57534e", "#1c1917", 18, 4.5, 2600, 400, true),
  m("ursoN", "Urso Cara-Preta", 36, "urso", "#292524", "#0c0a09", 19, 4.7, 2800, 430, true),
  m("elfoP", "Sacerdote do Lago", 39, "humanoide", "#7dd3fc", "#0369a1", 19, 5, 3200, 480, true),
  m("elfoG", "Guerreiro do Lago", 41, "humanoide", "#0ea5e9", "#0c4a6e", 21, 5.5, 3500, 500, true),
  m("orcW", "Orc Guerreiro", 42, "orc", "#166534", "#052e16", 23, 5.7, 3800, 540, true),
  m("tarantula", "Tarântula", 41, "aranha", "#3f3f46", "#18181b", 22, 5.4, 3400, 520, true),
  m("tarantulaS", "Tarântula Crescida", 42, "aranha", "#27272a", "#09090b", 24, 5.8, 3700, 560, true, 1),
  m("loboS", "Lobo Uivador", 42, "lobo", "#312e81", "#1e1b4b", 22, 5.6, 3900, 550, true),
  m("alce", "Alce", 43, "urso", "#78350f", "#292524", 25, 6, 4000, 600, false),
  m("corvo", "Corvo Sombrio", 44, "corvo", "#1e1b4b", "#020617", 24, 6.2, 4300, 620, true),
  // Cripta do Eclipse (lv 45–50) — REA: Gloomfury rarity 3 + bosses lv50
  m("sombraA", "Sombra Agourenta", 45, "mumia", "#6d28d9", "#2e1065", 28, 6.5, 5000, 750, true, 2),
  m("galho", "Galho Cintilante", 45, "golem", "#a3e635", "#3f6212", 27, 6.4, 4800, 700, true, 2),
  m("bossSombra", "Devorador da Cripta", 48, "boss", "#7f1d1d", "#1a0505", 40, 8, 9000, 1500, true, 3, 1.8),
  m("bossGuarda", "Guardião Aurora", 50, "boss", "#facc15", "#78350f", 46, 8.5, 12000, 2500, true, 3, 1.9),
  m("bossColosso", "Colosso de Brasa", 50, "boss", "#dc2626", "#450a0a", 46, 8.5, 12000, 2500, true, 3, 1.9),
];

export const mobPorId = (id: string): MobDef => MOBS.find(x => x.id === id) ?? MOBS[0];

// ── Zonas (REA: 27 áreas → 10 zonas jogáveis com faixas de nível reais) ──
export interface ZonaDef {
  id: string; nome: string; niveis: [number, number];
  centro: [number, number]; raio: number;
  bioma: "grama" | "floresta" | "mina" | "deserto" | "ruinas" | "cripta";
  cor: number; mobs: string[];
}
export const ZONAS: ZonaDef[] = [
  { id: "aldeia", nome: "Aldeia Aurora", niveis: [1, 1], centro: [0, 0], raio: 60, bioma: "grama", cor: 0x4f9e4f, mobs: [] },
  { id: "floresta", nome: "Floresta da Guarda", niveis: [1, 8], centro: [90, -40], raio: 90, bioma: "floresta", cor: 0x2d6a2d, mobs: ["larva1", "larva2", "raposa", "raposaR", "mariposa", "mariposaA", "javali", "aranhaF", "javaliB"] },
  { id: "bandidos", nome: "Acampamento dos Bandidos", niveis: [5, 8], centro: [-120, 60], raio: 55, bioma: "grama", cor: 0x6b7233, mobs: ["bandidoA", "bandidoE", "chefeB"] },
  { id: "trilha", nome: "Trilha do Alce", niveis: [9, 15], centro: [-160, -120], raio: 95, bioma: "floresta", cor: 0x24522d, mobs: ["lobo", "loboC", "loboR", "abelha", "abelhaV", "cogumelo", "mineiro", "boneco"] },
  { id: "mina", nome: "Mina de Carvão", niveis: [14, 17], centro: [40, -200], raio: 60, bioma: "mina", cor: 0x3f3f46, mobs: ["catador", "golemC", "mineiro"] },
  { id: "colinas", nome: "Colinas dos Pinheiros-Lua", niveis: [17, 24], centro: [220, -220], raio: 110, bioma: "floresta", cor: 0x1d4227, mobs: ["tartaruga", "tartarugaP", "beetle", "beetleO", "lagarto", "iguana", "verme"] },
  { id: "dunas", nome: "Dunas Escaldantes", niveis: [24, 32], centro: [420, 40], raio: 130, bioma: "deserto", cor: 0xd4a860, mobs: ["mumia", "mumiaG", "necromante", "abutre", "hiena", "hienaR", "croc", "crocO", "pirataA"] },
  { id: "ruinas", nome: "Ruínas Sem Cabeça", niveis: [32, 40], centro: [560, 200], raio: 110, bioma: "ruinas", cor: 0x8a7a6a, mobs: ["pirataG", "leao", "reclusa", "raiderW", "raiderA"] },
  { id: "bosque", nome: "Bosque Sussurrante", niveis: [35, 45], centro: [-260, 260], raio: 130, bioma: "floresta", cor: 0x173a1f, mobs: ["urso", "ursoN", "tarantula", "tarantulaS", "alce", "orcW", "elfoP", "elfoG", "corvo", "loboS"] },
  { id: "cripta", nome: "Cripta do Eclipse", niveis: [45, 50], centro: [-80, 420], raio: 90, bioma: "cripta", cor: 0x2e1065, mobs: ["sombraA", "galho", "bossSombra", "bossGuarda", "bossColosso"] },
];
export const zonaEm = (x: number, z: number): ZonaDef => {
  let melhor = ZONAS[0], melhorD = Infinity;
  for (const z2 of ZONAS) {
    const dx = x - z2.centro[0], dz = z - z2.centro[1];
    const d = Math.hypot(dx, dz) - z2.raio;
    if (d < melhorD) { melhorD = d; melhor = z2; }
  }
  return melhor;
};

// ── Curva de XP (REA: grind duro; nível 50 leva semanas — regra "difícil") ──
export const xpParaNivel = (nivel: number): number =>
  Math.round(90 * Math.pow(nivel, 1.75) + 60 * nivel);

// ── Quests (REA: cadeia real com pré-requisitos e recompensas por classe) ──
export interface QuestObjetivo { mob: string; quantos: number; }
export interface QuestDef {
  id: string; titulo: string; npc: string; npcEmoji: string;
  minNivel: number; preRequisito?: string;
  objetivos: QuestObjetivo[];
  xp: number; ouro: number; recompensaArma?: boolean; recompensaLivro?: string; recompensaPeca?: string;
}
export const QUESTS: QuestDef[] = [
  {
    id: "q1", titulo: "Larvas na horta", npc: "Guarda-Túmulos Vitor", npcEmoji: "🧙", minNivel: 1,
    objetivos: [{ mob: "larva1", quantos: 3 }, { mob: "larva2", quantos: 2 }],
    xp: 150, ouro: 50, recompensaArma: true,
  },
  {
    id: "q2", titulo: "Fala com o Pescador", npc: "Guarda-Túmulos Vitor", npcEmoji: "🧙", minNivel: 1, preRequisito: "q1",
    objetivos: [], xp: 75, ouro: 25,
  },
  {
    id: "q3", titulo: "Raposas famintas", npc: "Pescador Kosme", npcEmoji: "🎣", minNivel: 2, preRequisito: "q2",
    objetivos: [{ mob: "raposa", quantos: 4 }, { mob: "raposaR", quantos: 2 }],
    xp: 350, ouro: 100, recompensaLivro: "skill",
  },
  {
    id: "q4", titulo: "Mariposas brilhantes", npc: "Pescador Kosme", npcEmoji: "🎣", minNivel: 3, preRequisito: "q3",
    objetivos: [{ mob: "mariposa", quantos: 4 }, { mob: "mariposaA", quantos: 2 }],
    xp: 425, ouro: 125, recompensaPeca: "botas",
  },
  {
    id: "q5", titulo: "Limpar os bandidos", npc: "Campista Liam", npcEmoji: "🏕️", minNivel: 4, preRequisito: "q4",
    objetivos: [{ mob: "bandidoA", quantos: 5 }, { mob: "bandidoE", quantos: 5 }],
    xp: 500, ouro: 250, recompensaPeca: "luvas",
  },
  {
    id: "q6", titulo: "Javalis na estrada", npc: "Campista Liam", npcEmoji: "🏕️", minNivel: 6, preRequisito: "q5",
    objetivos: [{ mob: "javali", quantos: 6 }, { mob: "aranhaF", quantos: 4 }],
    xp: 800, ouro: 320, recompensaArma: true,
  },
  {
    id: "q7", titulo: "Lobos da trilha", npc: "Silvicultor Roque", npcEmoji: "🌲", minNivel: 9, preRequisito: "q6",
    objetivos: [{ mob: "lobo", quantos: 6 }, { mob: "loboC", quantos: 4 }],
    xp: 1400, ouro: 450, recompensaLivro: "skill",
  },
  {
    id: "q8", titulo: "Carvão vivo", npc: "Alquimista Miro", npcEmoji: "⚗️", minNivel: 14, preRequisito: "q7",
    objetivos: [{ mob: "golemC", quantos: 4 }, { mob: "catador", quantos: 5 }],
    xp: 2600, ouro: 700, recompensaPeca: "peito",
  },
  {
    id: "q9", titulo: "Areia movediça", npc: "Alquimista Miro", npcEmoji: "⚗️", minNivel: 24, preRequisito: "q8",
    objetivos: [{ mob: "mumia", quantos: 8 }, { mob: "abutre", quantos: 6 }],
    xp: 6500, ouro: 1400, recompensaArma: true,
  },
  {
    id: "q10", titulo: "O Devorador", npc: "Sábio Ancião Zed", npcEmoji: "🔮", minNivel: 46, preRequisito: "q9",
    objetivos: [{ mob: "bossSombra", quantos: 1 }],
    xp: 30000, ouro: 8000, recompensaPeca: "lendario",
  },
];

// ── Nomes de bots (REA: gerador silábico real → nomes originais) ──
const SILABAS1 = ["ka", "ze", "mor", "lu", "xa", "bru", "ta", "vex", "ni", "gro", "pa", "rul", "ki", "du", "fen"];
const SILABAS2 = ["ru", "lak", "mir", "do", "zar", "tul", "nex", "vi", "gash", "pol", "ren", "dor", "mi", "sol"];
export const nomeAleatorio = (): string => {
  const n = SILABAS1[Math.floor(Math.random() * SILABAS1.length)] +
    SILABAS2[Math.floor(Math.random() * SILABAS2.length)];
  return n.charAt(0).toUpperCase() + n.slice(1) + (Math.random() < 0.25 ? String(Math.floor(Math.random() * 90 + 10)) : "");
};

// ── Loot (REA: raridades por cor; ouro + peças) ──
export const RARIDADES = [
  { nome: "Comum", cor: "#d4d4d8", peso: 70 },
  { nome: "Bom", cor: "#4ade80", peso: 20 },
  { nome: "Raro", cor: "#60a5fa", peso: 8 },
  { nome: "Épico", cor: "#c084fc", peso: 2 },
];
export const rollRaridade = (): number => {
  const r = Math.random() * 100;
  let acc = 0;
  for (let i = 0; i < RARIDADES.length; i++) { acc += RARIDADES[i].peso; if (r < acc) return i; }
  return 0;
};
export const PECAS = ["arma", "peito", "botas", "luvas", "amuleto"] as const;
export const nomePeca = (classe: ClasseDef, peca: string, raridade: number): string => {
  const nomes: Record<string, string> = {
    arma: `${classe.arma} ${["Gasta", "de Caçador", "do Vigilante", "Astral"][raridade]}`,
    peito: `Peitoral ${["de Couro", "Reforçado", "do Guardião", "Épico"][raridade]}`,
    botas: `Botas ${["Surradas", "Ligeiras", "da Celeridade", "do Vento"][raridade]}`,
    luvas: `Luvas ${["Rasgadas", "de Agarrão", "da Força", "do Titã"][raridade]}`,
    amuleto: `Amuleto ${["Simples", "Encantado", "da Sabedoria", "do Eclipse"][raridade]}`,
    lendario: `Relíquia do Eclipse`,
  };
  return nomes[peca] ?? "Item";
};
