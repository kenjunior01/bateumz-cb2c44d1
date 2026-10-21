# -*- coding: utf-8 -*-
"""
v20 — CONVERSÃO OFICIAL HORDES.IO
Substitui os dados do MMO pelos dados OFICIAIS do hordes.io
(fonte: hordesio.wiki.gg/wiki/Monster_List + hordes.io/info/skills + wiki facções/regiões):
  · 4 classes × 12 habilidades oficiais (nomes PT, MP/CD oficiais)
  · 2 facções oficiais: VANGUARD (#458BD9) vs BLOODLUST (vermelho, 💀)
  · 83 criaturas oficiais nv.1-45 com HP/XP EXACTOS da wiki
  · Regiões reais: Guardstone (1-20), Deserto Headless (21-34), Faivel (35-45),
    Oásis dos Mortos, Marrowlands, Pinhal Lunar, Ruínas de Gloomfury
  · Espécies RARAS oficiais + chefe mundial GLOOMFURY
Mantém formas/exports para o motor e a UI não quebrarem.
"""
import re, sys

PATH = "src/components/livegames/world/mmo.ts"
src = open(PATH, encoding="utf-8").read()
orig = src

def swap_block(src, start_marker, end_marker, new_text):
    i = src.find(start_marker)
    j = src.find(end_marker, i)
    assert i != -1 and j != -1, f"marcadores não encontrados: {start_marker[:40]}"
    return src[:i] + new_text + src[j:]

# ── 1 · Interface MobType: campos oficiais extra ─────────────────────────
old_iface = """export interface MobType {
  id: string; name: string; tier: number; color: number; feature: string;
  scale: number; hp: number; atk: number; xp: number; aggro: number;
  speed: number; region: string; pack: number;
}"""
new_iface = """export interface MobType {
  id: string; name: string; tier: number; color: number; feature: string;
  scale: number; hp: number; atk: number; xp: number; aggro: number;
  speed: number; region: string; pack: number;
  ranged?: boolean; rare?: boolean; neutral?: boolean;
}"""
assert old_iface in src
src = src.replace(old_iface, new_iface)

# ── 2 · FACÇÕES OFICIAIS ────────────────────────────────────────────────
new_factions = """export const FACTIONS = [
  {
    id: 0, name: "VANGUARD", emoji: "🛡️", color: "#458BD9", hex: 0x458bd9,
    motto: "Tradição, estrutura e ordem",
    desc: "A horda da ordem. Castelo no verde exuberante de Guardstone, defensores leais do território.",
  },
  {
    id: 1, name: "BLOODLUST", emoji: "💀", color: "#dc2626", hex: 0xdc2626,
    motto: "O sangue alimenta a horda",
    desc: "Conquistadores sedentos. Território vermelho, pilhagem sem limites e glória eterna.",
  },
];

"""
src = swap_block(src, "export const FACTIONS = [", "export const FAME_PER_PVP_KILL", new_factions)

# ── 3 · REGIÕES OFICIAIS (posições originais mantidas) ──────────────────
new_regions = """export const REGIONS: RegionDef[] = [
  { id: "vila", name: "Guardstone", cx: 0, cz: 0, r: 60, color: "#fcd34d", lvl: [1, 99], desc: "Capital do mundo:banco, loja, feira e comerciantes das duas facções", danger: 0, hub: true },
  { id: "fortaleza", name: "Castelo Vanguarda", cx: -250, cz: -180, r: 46, color: "#458BD9", lvl: [1, 99], desc: "Capital da facção VANGUARD 🛡️ no verde de Guardstone", danger: 0, hub: true },
  { id: "bastiao", name: "Fortaleza Bloodlust", cx: 250, cz: 180, r: 46, color: "#dc2626", lvl: [1, 99], desc: "Capital da facção BLOODLUST 💀 — território vermelho", danger: 0, hub: true },
  { id: "planicie", name: "Campina de Guardstone", cx: -80, cz: 40, r: 110, color: "#a3e635", lvl: [1, 8], desc: "Larvas, raposas, mariposas e bandidos — os primeiros passos", danger: 1 },
  { id: "floresta", name: "Floresta Guardstone", cx: -190, cz: 140, r: 115, color: "#16a34a", lvl: [6, 19], desc: "Javalis, aranhas, lobos, abelhas e a Mina de Carvão", danger: 2 },
  { id: "dunas", name: "Deserto Headless", cx: 60, cz: -170, r: 115, color: "#f59e0b", lvl: [20, 30], desc: "Escaravelhos, lagartos, vermes, abutres e hienas das areias", danger: 3 },
  { id: "pantano", name: "Oásis dos Mortos", cx: 200, cz: 60, r: 110, color: "#65a30d", lvl: [23, 28], desc: "Guerreiros, arqueiros e magos mortos-vivos guardam as águas", danger: 4 },
  { id: "vulcao", name: "Terras Marrowlands", cx: -60, cz: -240, r: 110, color: "#b45309", lvl: [30, 45], desc: "Reclusas, piratas, leões e feras raras na costa queimada", danger: 5 },
  { id: "tundra", name: "Dell Alviverde · Faivel", cx: 280, cz: -80, r: 105, color: "#4ade80", lvl: [34, 40], desc: "Ursos primais, lobos uivantes e saqueadores de Faivel", danger: 6 },
  { id: "titas", name: "Pinhal Lunar · Faivel", cx: -280, cz: -40, r: 95, color: "#a8a29e", lvl: [39, 44], desc: "Tarântulas, alces, orcs e o culto do Lago Lunar", danger: 7, locked: true, lockLvl: 30, lockPop: 10 },
  { id: "escuro", name: "Ruínas de Gloomfury", cx: 120, cz: 250, r: 100, color: "#7c3aed", lvl: [42, 45], desc: "O fim do mundo:esqueletos sombrios e o CHEFE MUNDIAL Gloomfury", danger: 8, locked: true, lockLvl: 40, lockPop: 50 },
]

"""
src = swap_block(src, "export const REGIONS: RegionDef[] = [", "export const TOWERS", new_regions)

# ── 4 · 83 CRIATURAS OFICIAIS (nv · HP · XP exactos da wiki) ────────────
XP_T = {1:100,2:118,3:137,4:156,5:175,6:193,7:212,8:231,9:250,10:268,11:287,12:306,13:325,14:343,15:362,16:381,17:400,18:418,19:437,20:456,21:475,22:493,23:512,24:531,25:550,26:568,27:587,28:606,29:625,30:643,31:662,32:681,33:700,34:718,35:737,36:756,37:775,38:793,39:812,40:831,41:850,42:868,43:887,44:906,45:925}
# (id, PT nome, nv, HP, cor, feature, escala, aggro, vel, região, grupo, ranged, rare, neutro)
MOBS = [
 ("larva","Larva Jovem",1,50,0x8d6e63,"spikes",0.7,0,2.6,"planicie",2,0,0,1),
 ("larva2","Larva Adulta",2,70,0x78716c,"spikes",0.8,0,2.8,"planicie",2,0,0,1),
 ("tarta_mar","Tartaruga Marinha",3,90,0x0d9488,"horns",0.9,0,2.2,"planicie",1,0,0,1),
 ("raposa","Raposa",3,90,0xf97316,"ears",0.9,0,5.2,"planicie",1,0,0,1),
 ("raposa_raivosa","Raposa Raivosa",4,120,0xdc2626,"ears",0.95,10,5.4,"planicie",1,0,0,1),
 ("fantasma","Fantasma",5,230,0xa5b4fc,"wings",1.0,14,4.8,"planicie",1,0,1,0),
 ("mariposa","Mariposa Lunar",5,150,0xc4b5fd,"wings",0.85,0,5.0,"planicie",1,0,0,1),
 ("bandido_arq","Bandido Arqueiro",5,150,0x92400e,"horns",1.0,13,4.4,"planicie",2,1,0,0),
 ("mariposa_atlas","Mariposa Atlas",6,200,0xa78bfa,"wings",0.95,0,5.0,"planicie",1,0,0,1),
 ("bandido","Bandido Errante",6,200,0xa16207,"horns",1.05,13,4.4,"planicie",2,0,0,0),
 ("javali","Javali Selvagem",7,250,0x78350f,"tusks",1.1,12,4.6,"planicie",2,0,0,0),
 ("lider_bandido","Líder Bandido",7,380,0x451a03,"horns",1.2,15,4.6,"planicie",2,0,1,0),
 ("javali_furioso","Javali Furioso",8,300,0x92400e,"tusks",1.15,13,4.8,"planicie",2,0,0,0),
 ("aranha","Aranha da Floresta",9,350,0x3f3f46,"spikes",1.0,14,4.2,"floresta",2,0,0,0),
 ("tecela","Tecelã da Mata",10,400,0x27272a,"spikes",1.05,15,4.2,"floresta",2,0,0,0),
 ("javali_anciao","Javali Ancião",10,600,0x451a03,"tusks",1.35,15,4.6,"floresta",1,0,1,0),
 ("lobo","Lobo",11,480,0x6b7280,"ears",1.0,16,5.6,"floresta",3,0,0,0),
 ("lobo_rustico","Lobo Rústico",12,550,0x4b5563,"ears",1.05,16,5.6,"floresta",3,0,0,0),
 ("abelha","Abelha",13,650,0xfacc15,"wings",0.8,15,5.8,"floresta",3,0,0,0),
 ("abelha_pec","Abelha Peçonhenta",14,700,0xeab308,"wings",0.85,16,5.9,"floresta",3,0,0,0),
 ("saq_mina","Saqueador da Mina",14,700,0xa16207,"horns",1.05,15,4.4,"floresta",2,0,0,0),
 ("trab_mina","Trabalhador da Mina",15,800,0x854d0e,"horns",1.1,15,4.4,"floresta",2,0,0,0),
 ("cogumelito","Cogumelito",15,800,0xf472b6,"spikes",0.95,13,3.6,"floresta",2,0,0,0),
 ("formiga","Formiga",16,950,0x525252,"spikes",0.85,16,4.4,"floresta",3,0,0,0),
 ("golem_carvao","Golem de Carvão",16,1400,0x1c1917,"spikes",1.6,14,2.8,"floresta",1,0,1,0),
 ("formiga_vulc","Formiga Vulcânica",17,1100,0xb91c1c,"spikes",0.9,17,4.6,"floresta",3,0,0,0),
 ("tartaruga","Tartaruga",18,1200,0x14b8a6,"horns",1.1,12,2.3,"floresta",1,0,0,0),
 ("tarta_pedra","Tartaruga Pedregosa",19,1350,0x57534e,"horns",1.2,13,2.3,"floresta",1,0,0,0),
 ("escara_estrume","Escaravelho Estrumeiro",20,1500,0x7c2d12,"horns",1.0,15,3.6,"dunas",2,0,0,0),
 ("escara_sombrio","Escaravelho Sombrio",21,1650,0x292524,"horns",1.05,16,3.6,"dunas",2,0,0,0),
 ("mireshell","Mireshell",21,2500,0x5eead4,"horns",1.3,14,2.4,"dunas",1,0,1,0),
 ("lagarto","Lagarto Espinhoso",22,1800,0x84cc16,"tusks",1.05,16,4.8,"dunas",2,0,0,0),
 ("iguana","Iguana do Deserto",23,2000,0xa3e635,"tusks",1.1,16,4.8,"dunas",2,0,0,0),
 ("escara_deserto","Escaravelho do Deserto",23,3000,0xb45309,"horns",1.5,17,3.6,"dunas",1,0,1,0),
 ("verme_areia","Verme das Areias",24,2150,0xd97706,"spikes",1.3,16,3.2,"dunas",2,0,0,0),
 ("estrangulador","Estrangulador das Areias",25,2300,0xc2410c,"spikes",1.35,17,3.2,"dunas",2,0,0,0),
 ("abutre","Abutre Rústico",26,2450,0x78716c,"wings",1.0,16,6.0,"dunas",2,0,0,0),
 ("abutre_quebra","Abutre Quebradiço",27,2600,0x57534e,"wings",1.05,16,6.0,"dunas",2,0,0,0),
 ("verme_brilhante","Verme Brilhante",27,3900,0xa3e635,"spikes",1.4,17,3.2,"dunas",1,0,1,0),
 ("hiena","Hiena",28,2700,0xa8a29e,"ears",1.0,17,5.6,"dunas",3,0,0,0),
 ("hiena_caxiante","Hiena Caxiante",29,2900,0x8c8378,"ears",1.05,17,5.6,"dunas",3,0,0,0),
 ("crocodilo","Crocodilo do Rio",30,3000,0x166534,"tusks",1.4,18,3.6,"dunas",1,0,0,0),
 ("morto_arq","Arqueiro Morto-Vivo",23,2000,0xe7e5e4,"horns",1.05,15,3.4,"pantano",2,1,0,0),
 ("morto_guer","Guerreiro Morto-Vivo",24,2150,0xd6d3d1,"horns",1.1,16,3.4,"pantano",2,0,0,0),
 ("morto_mago","Mago Morto-Vivo",25,2300,0xc4b5fd,"horns",1.05,16,3.2,"pantano",2,1,0,0),
 ("mumia","Múmia Morta-Viva",25,2300,0xf5f5f4,"horns",1.15,16,3.2,"pantano",2,0,0,0),
 ("necromante","Necromante Morto-Vivo",26,3700,0x7c3aed,"horns",1.25,18,3.2,"pantano",1,0,1,0),
 ("croco_ossudo","Crocodilo Ossudo",31,3200,0x14532d,"tusks",1.45,18,3.6,"vulcao",1,0,0,0),
 ("reclusa_tormenta","Reclusa da Tormenta",32,3400,0x7f1d1d,"spikes",1.1,18,4.2,"vulcao",2,0,0,0),
 ("pirata_arq","Pirata Arqueiro",32,3400,0x0ea5e9,"horns",1.05,17,4.4,"vulcao",2,1,0,0),
 ("reclusa_pec","Reclusa Peçonhenta",33,3600,0x881337,"spikes",1.15,18,4.2,"vulcao",2,0,0,0),
 ("pirata_guer","Pirata Guerreiro",33,3600,0x0369a1,"horns",1.1,18,4.4,"vulcao",2,0,0,0),
 ("leao","Leão",34,3800,0xd97706,"tusks",1.4,19,6.0,"vulcao",1,0,0,0),
 ("capitao_pirata","Capitão Pirata",34,5700,0x1e3a8a,"horns",1.3,19,4.6,"vulcao",1,0,1,0),
 ("mae_osso","Mãe-Osso",35,6000,0xf5f5f4,"spikes",1.5,19,4.0,"vulcao",1,0,1,0),
 ("chicote_lodo","Chicoteador do Lodo",35,6000,0x3f6212,"tusks",1.5,19,3.8,"vulcao",1,0,1,0),
 ("pata_areia","Pata-de-Areia",36,6500,0xfbbf24,"tusks",1.45,19,6.0,"vulcao",1,0,1,0),
 ("croco_areavel","Crocodilo Areável",43,7100,0x365314,"tusks",1.5,20,3.6,"vulcao",1,0,0,0),
 ("tarta_areavel","Tartaruga Areável",43,7100,0x0f766e,"horns",1.3,18,2.4,"vulcao",1,0,0,0),
 ("urso_primal","Urso Primal",35,4000,0x92400e,"ears",1.6,18,5.0,"tundra",1,0,0,0),
 ("urso_negro","Urso Negrijuba",36,4300,0x1c1917,"ears",1.65,18,5.0,"tundra",1,0,0,0),
 ("lobo_sussurro","Lobo Sussurrante",37,4700,0x9ca3af,"ears",1.15,18,5.8,"tundra",3,0,0,0),
 ("lobo_putrido","Lobo Pútrido",38,5000,0x713f12,"ears",1.2,19,5.8,"tundra",3,0,0,0),
 ("saq_guerreiro","Saqueador Guerreiro",38,5000,0x7f1d1d,"horns",1.15,18,4.6,"tundra",2,0,0,0),
 ("carvalho_juba","Carvalho-juba",38,7500,0x365314,"horns",1.9,19,4.6,"tundra",1,0,1,0),
 ("saq_arqueiro","Saqueador Arqueiro",39,5400,0x991b1b,"horns",1.1,18,4.6,"tundra",2,1,0,0),
 ("corvo","Corvo",39,5400,0x111827,"wings",0.9,17,6.2,"tundra",2,0,0,0),
 ("corvo_sombrio","Corvo Garra-Sombria",40,5700,0x1f2937,"wings",0.95,18,6.2,"tundra",2,0,0,0),
 ("sacerdote_lunar","Sacerdote do Lago Lunar",39,5400,0x6366f1,"horns",1.15,18,4.4,"titas",2,0,0,0),
 ("lunar_arq","Arqueiro do Lago Lunar",40,5700,0x818cf8,"horns",1.1,18,4.4,"titas",2,1,0,0),
 ("lunar_guer","Guerreiro do Lago Lunar",41,6200,0x4f46e5,"horns",1.2,19,4.4,"titas",2,0,0,0),
 ("tarantula","Tarântula",41,6200,0x292524,"spikes",1.2,19,4.2,"titas",2,0,0,0),
 ("tarantula_crespa","Tarântula Crespa",42,6600,0x1c1917,"spikes",1.3,19,4.2,"titas",2,0,0,0),
 ("orc_guerreiro","Guerreiro Orc",42,6600,0x15803d,"horns",1.3,19,4.6,"titas",2,0,0,0),
 ("uivador_lunar","Uivador Lunar",42,9900,0x94a3b8,"ears",1.5,20,5.8,"titas",1,0,1,0),
 ("alce","Alce",43,7100,0x57534e,"horns",1.6,18,4.0,"titas",1,0,0,0),
 ("corredora_seda","Corredora de Seda",43,10600,0xf9a8d4,"spikes",1.5,20,4.4,"titas",1,0,1,0),
 ("alce_crespo","Alce Crespo",44,7500,0x44403c,"horns",1.7,18,4.0,"titas",1,0,0,0),
 ("sombrio_arq","Arqueiro Sombrio",43,7100,0x4c1d95,"horns",1.15,19,3.4,"escuro",2,1,0,0),
 ("sombrio_guer","Guerreiro Sombrio",44,7500,0x5b21b6,"horns",1.2,19,3.4,"escuro",2,0,0,0),
 ("sombrio_mago","Mago Sombrio",45,8000,0x6d28d9,"horns",1.15,19,3.2,"escuro",2,1,0,0),
 ("ramo_cintilante","Ramo Cintilante",45,12000,0x86efac,"horns",1.9,20,4.0,"escuro",1,0,1,0),
 ("visgo_noturno","Visgo Noturno",45,12000,0x14532d,"spikes",1.7,20,3.6,"escuro",1,0,1,0),
]
lines = []
for (mid, name, nv, hp, col, feat, sc, ag, sp, reg, pk, rng, rare, neu) in MOBS:
    atk = 3 + nv * 2
    flags = ""
    if rng: flags += ", ranged: true"
    if rare: flags += ", rare: true"
    if neu: flags += ", neutral: true"
    lines.append(f'  {{ id: "{mid}", name: "{name}", tier: {nv}, color: 0x{col:x}, feature: "{feat}", scale: {sc}, hp: {hp}, atk: {atk}, xp: {XP_T[nv]}, aggro: {ag}, speed: {sp}, region: "{reg}", pack: {pk}{flags} }},')
new_mobs = ("// ── CRIATURAS OFICIAIS DO HORDES.IO (nv · HP · XP da wiki) ──\n"
            f"// {len(MOBS)} espécies nv.1-45 · Neutras só reagem · Raras = elites\n"
            + "export const MOB_TYPES: MobType[] = [\n" + "\n".join(lines) + "\n];\n\n")
src = swap_block(src, "export const MOB_TYPES: MobType[] = [", "// ── Chefes de região", new_mobs)

# ── 5 · ESPÉCIES RARAS OFICIAIS (chefes de região) ──────────────────────
new_rare = """export const REGION_BOSSES: BossDef[] = [
  { name: "Fantasma Errante", region: "planicie", tier: 5, x: -110, z: 70, mech: "nova", title: "O Espectro da Campina" },
  { name: "Líder Bandido", region: "planicie", tier: 7, x: -60, z: 10, mech: "slam", title: "Terror dos Caminhos" },
  { name: "Javali Ancião", region: "floresta", tier: 10, x: -215, z: 165, mech: "slam", title: "Presas de Ferro" },
  { name: "Golem de Carvão", region: "floresta", tier: 16, x: -160, z: 180, mech: "enrage", title: "Coração de Carvão" },
  { name: "Necromante Morto-Vivo", region: "pantano", tier: 26, x: 225, z: 85, mech: "summon", title: "Senhor do Oásis" },
  { name: "Capitão Pirata", region: "vulcao", tier: 34, x: -85, z: -262, mech: "nova", title: "Flagelo dos Mares" },
  { name: "Mãe-Osso", region: "vulcao", tier: 35, x: -20, z: -200, mech: "summon", title: "Mãe da Trepadeira" },
  { name: "Carvalho-juba", region: "tundra", tier: 38, x: 300, z: -100, mech: "slam", title: "Colosso de Faivel" },
]

"""
src = swap_block(src, "export const REGION_BOSSES: BossDef[] = [", "// ── Chefes mundiais", new_rare)

# ── 6 · CHEFES MUNDIAIS OFICIAIS: GLOOMFURY + HELLSPAWN ─────────────────
new_world = """export const WORLD_BOSSES = [
  { name: "Gloomfury", region: "escuro", tier: 45, x: 140, z: 275, cycle: 420, emoji: "🗡️", title: "CHEFE MUNDIAL · Runefire" },
  { name: "Hellspawn", region: "vulcao", tier: 32, x: -60, z: -255, cycle: 420, emoji: "🔥", title: "CHEFE MUNDIAL · Infernal" },
]

"""
src = swap_block(src, "export const WORLD_BOSSES = [", "// ── Vilões da PLATAFORMA", new_world)

# ── 7 · 48 HABILIDADES OFICIAIS (hordes.io/info/skills) ────────────────
new_skills = """export const SKILLS: SkillDef[][] = [
  // GUERREIRO — linha da frente (oficial: Slash, Crescent Swipe, Whirlwind…)
  [
    { id: "g1", name: "Golpe", unlock: 1, cd: 1.0, mana: 2, dmg: 1.35, range: 3.2, kind: "golpe", color: "#ef4444", emoji: "🗡️", desc: "Golpe com força extra; cura 5% do dano causado" },
    { id: "g2", name: "Golpe Crescente", unlock: 1, cd: 6, mana: 4, dmg: 1.15, radius: 4.2, kind: "area", color: "#f87171", emoji: "🌀", desc: "Rodopia a espada, ferindo tudo à volta" },
    { id: "g3", name: "Redemoinho", unlock: 6, cd: 30, mana: 13, dmg: 1.6, radius: 6, kind: "area", color: "#dc2626", emoji: "🌪️", desc: "Gira sem parar e atinge todos; abranda-te enquanto dura" },
    { id: "g4", name: "Baluarte", unlock: 9, cd: 30, mana: 8, dmg: 0, kind: "buff", color: "#60a5fa", emoji: "🛡️", desc: "+34% de bloqueio; cada bloqueio cura-te" },
    { id: "g5", name: "Provocar", unlock: 11, cd: 15, mana: 4, dmg: 0, kind: "buff", color: "#fbbf24", emoji: "📣", desc: "Força os monstros à volta a atacar-te" },
    { id: "g6", name: "Grito Impiedoso", unlock: 13, cd: 30, mana: 4, dmg: 0, kind: "cura", color: "#fca5a5", emoji: "❤️", desc: "Recupera 25% da vida que te falta" },
    { id: "g7", name: "Investida", unlock: 15, cd: 15, mana: 12, dmg: 1.3, range: 26, speed: 26, kind: "dash", color: "#f97316", emoji: "💥", desc: "Avança até ao alvo e atordoa-o" },
    { id: "g8", name: "Enfurecer", unlock: 17, cd: 50, mana: 8, dmg: 0, kind: "buff", color: "#b91c1c", emoji: "🔥", desc: "+12% de dano durante 17s" },
    { id: "g9", name: "Coragem do Cruzado", unlock: 21, cd: 150, mana: 8, dmg: 0, kind: "buff", color: "#fbbf24", emoji: "⚔️", desc: "Tu e o grupo ganham defesa e mana" },
    { id: "g10", name: "Grito Profano", unlock: 25, cd: 150, mana: 8, dmg: 0, kind: "buff", color: "#7f1d1d", emoji: "☠️", desc: "Tu e o grupo causam dano extra" },
    { id: "g11", name: "Têmpera", unlock: 29, cd: 30, mana: 8, dmg: 0, kind: "buff", color: "#94a3b8", emoji: "⏳", desc: "Remove atordoamentos e prenções; acelera-te" },
    { id: "g12", name: "Reforço de Armadura", unlock: 1, cd: 0, mana: 0, dmg: 0, kind: "passiva", color: "#64748b", emoji: "🪖", desc: "+defesa permanente e gera mais aggro" },
  ],
  // MAGO — gelo arcano (oficial: Ice Bolt, Shatterfrost, Icicle Orb…)
  [
    { id: "m1", name: "Raio de Gelo", unlock: 1, cd: 1.5, mana: 3, dmg: 1.3, range: 26, speed: 24, kind: "projeto", color: "#38bdf8", emoji: "❄️", desc: "Sarcícula congelante; 5 acumulos atordoam" },
    { id: "m2", name: "Brilho Gélido", unlock: 4, cd: 25, mana: 4, dmg: 1.1, radius: 5.5, kind: "area", color: "#7dd3fc", emoji: "🧊", desc: "Onda de choque gélido congela à tua volta" },
    { id: "m3", name: "Estilhaço Gélido", unlock: 8, cd: 10, mana: 3, dmg: 2.3, range: 24, speed: 22, kind: "projeto", color: "#0ea5e9", emoji: "🗡️", desc: "Fragmento pesado; dano extra em congelados" },
    { id: "m4", name: "Teleporte", unlock: 11, cd: 12, mana: 4, dmg: 0, range: 12, speed: 30, kind: "dash", color: "#c084fc", emoji: "💫", desc: "Reaparece 12m adiante na direção em que olhas" },
    { id: "m5", name: "Escudo de Gelo", unlock: 14, cd: 60, mana: 5, dmg: 0, kind: "buff", color: "#bae6fd", emoji: "🛡️", desc: "Bloqueia os próximos ataques recebidos" },
    { id: "m6", name: "Chamado Gélido", unlock: 17, cd: 6, mana: 2, dmg: 1.2, radius: 6.5, kind: "area", color: "#22d3ee", emoji: "🌨️", desc: "Tempestade congelante numa área" },
    { id: "m7", name: "Orbe de Sarcículas", unlock: 20, cd: 8, mana: 10, dmg: 1.7, radius: 5.5, kind: "area", color: "#0284c7", emoji: "🔮", desc: "Orbe gigante cospe sarcículas no caminho", ult: true },
    { id: "m8", name: "Bloco de Gelo", unlock: 24, cd: 80, mana: 5, dmg: 0, kind: "cura", color: "#e0f2fe", emoji: "🧱", desc: "Invulnerável e a curar-te, mas imóvel" },
    { id: "m9", name: "Frenesi Hipotérmico", unlock: 28, cd: 45, mana: 0, dmg: 0, kind: "buff", color: "#67e8f9", emoji: "⚡", desc: "+pressa e +dano; reinicia o Orbe de Sarcículas" },
    { id: "m10", name: "Encantamento", unlock: 32, cd: 8, mana: 5, dmg: 0, kind: "buff", color: "#d8b4fe", emoji: "✨", desc: "Aumenta o dano de um aliado" },
    { id: "m11", name: "Aura Ártica", unlock: 36, cd: 120, mana: 15, dmg: 0, kind: "buff", color: "#38bdf8", emoji: "🌟", desc: "O teu grupo ganha crítico extra", ult: true },
    { id: "m12", name: "Coração Congelado", unlock: 1, cd: 0, mana: 0, dmg: 0, kind: "passiva", color: "#a5f3fc", emoji: "💠", desc: "Um Raio de Gelo instantâneo a cada 7s" },
  ],
  // ARQUEIRO — precisão (oficial: Swift Shot, Precise Shot, Volley…)
  [
    { id: "a1", name: "Tiro Rápido", unlock: 1, cd: 1.5, mana: 2, dmg: 1.3, range: 28, speed: 30, kind: "projeto", color: "#22c55e", emoji: "🏹", desc: "Flecha veloz; fica instantâneo após um Tiro Preciso" },
    { id: "a2", name: "Tiro Preciso", unlock: 3, cd: 6, mana: 5, dmg: 1.9, range: 28, speed: 34, kind: "projeto", color: "#4ade80", emoji: "🎯", desc: "Tiro forte; torna os Tiro Rápido instantâneos" },
    { id: "a3", name: "Salva", unlock: 4, cd: 25, mana: 21, dmg: 1.5, radius: 7, kind: "area", color: "#16a34a", emoji: "🌧️", desc: "Chuva de flechas em até 10 alvos" },
    { id: "a4", name: "Arranque", unlock: 5, cd: 10, mana: 6, dmg: 0, range: 10, speed: 28, kind: "dash", color: "#a3e635", emoji: "💨", desc: "Avança e reinicia o Tiro Preciso" },
    { id: "a5", name: "Flechas Serpente", unlock: 5, cd: 0, mana: 0, dmg: 0, kind: "passiva", color: "#86efac", emoji: "🐍", desc: "Os Tiro Preciso saltam para mais alvos" },
    { id: "a6", name: "Flecha Vampírica", unlock: 6, cd: 20, mana: 2, dmg: 1.4, range: 28, speed: 30, kind: "projeto", color: "#f87171", emoji: "🩸", desc: "Cura-te ao acertar; interrompe feitiços inimigos" },
    { id: "a7", name: "Reanimar", unlock: 7, cd: 50, mana: 0, dmg: 0, kind: "buff", color: "#fbbf24", emoji: "⚡", desc: "Recupera mana e aumenta o teu dano" },
    { id: "a8", name: "Tiro de Osso", unlock: 8, cd: 10, mana: 11, dmg: 2.3, range: 28, speed: 26, kind: "projeto", color: "#e7e5e4", emoji: "🦴", desc: "Flecha-fêmur; +50% de dano em alvos abaixo de metade", ult: true },
    { id: "a9", name: "Flechas Venenosas", unlock: 12, cd: 0, mana: 0, dmg: 0, kind: "passiva", color: "#84cc16", emoji: "☠️", desc: "Tiro Preciso envenena e abranda por 10s" },
    { id: "a10", name: "Sentido de Caminho", unlock: 16, cd: 80, mana: 12, dmg: 0, kind: "buff", color: "#a3e635", emoji: "🧭", desc: "+velocidade para ti e para o grupo" },
    { id: "a11", name: "Tiro Ofuscante", unlock: 21, cd: 25, mana: 2, dmg: 0.8, range: 28, speed: 30, kind: "projeto", color: "#fef08a", emoji: "🌫️", desc: "Cega o alvo, que vagueia sem rumo" },
    { id: "a12", name: "Perfurações Cranianas", unlock: 26, cd: 0, mana: 0, dmg: 0, kind: "passiva", color: "#fda4af", emoji: "💀", desc: "+3% de crítico permanente" },
  ],
  // XAMÃ — espíritos e pragas (oficial: Decay, Revitalize, Mimir's Well…)
  [
    { id: "x1", name: "Decadência", unlock: 1, cd: 3, mana: 6, dmg: 1.2, range: 22, speed: 22, kind: "projeto", color: "#14b8a6", emoji: "☠️", desc: "Maldição que corrói o alvo ao longo do tempo" },
    { id: "x2", name: "Espalha-praga", unlock: 4, cd: 0, mana: 0, dmg: 0, kind: "passiva", color: "#84cc16", emoji: "🦠", desc: "Decadência salta entre inimigos e dá-te pressa" },
    { id: "x3", name: "Revitalizar", unlock: 6, cd: 30, mana: 4, dmg: 0, kind: "cura", color: "#34d399", emoji: "💚", desc: "Cura ao longo do tempo; acumula até 3 vezes" },
    { id: "x4", name: "Tratamento", unlock: 8, cd: 2, mana: 6, dmg: 0, kind: "cura", color: "#4ade80", emoji: "➕", desc: "Cura direta poderosa" },
    { id: "x5", name: "Poço de Mimir", unlock: 11, cd: 90, mana: 0, dmg: 0, kind: "buff", color: "#2dd4bf", emoji: "🕳️", desc: "O teu grupo regenera mana rapidamente" },
    { id: "x6", name: "Totem de Cura", unlock: 14, cd: 20, mana: 10, dmg: 0, radius: 6, kind: "cura", color: "#fbbf24", emoji: "🗿", desc: "Totem que cura todos os aliados perto" },
    { id: "x7", name: "Uivo Canino", unlock: 17, cd: 25, mana: 8, dmg: 0, kind: "buff", color: "#94a3b8", emoji: "🐺", desc: "O teu grupo ganha pressa e cooldowns mais rápidos" },
    { id: "x8", name: "Convocar", unlock: 20, cd: 120, mana: 25, dmg: 0, kind: "buff", color: "#a78bfa", emoji: "🌀", desc: "Convoca o teu grupo para junto de ti" },
    { id: "x9", name: "Purificar", unlock: 24, cd: 12, mana: 8, dmg: 0, kind: "cura", color: "#a7f3d0", emoji: "🌿", desc: "Remove venenos e maldições" },
    { id: "x10", name: "Escudo Espiritual", unlock: 28, cd: 30, mana: 10, dmg: 0, kind: "buff", color: "#c4b5fd", emoji: "👻", desc: "Os espíritos absorvem parte do dano" },
    { id: "x11", name: "Corrente de Pragas", unlock: 32, cd: 7, mana: 8, dmg: 1.5, radius: 6, kind: "area", color: "#0d9488", emoji: "⛓️", desc: "A praga salta por toda a área", ult: true },
    { id: "x12", name: "Ira dos Anciãos", unlock: 36, cd: 45, mana: 30, dmg: 2.6, radius: 8, kind: "area", color: "#f97316", emoji: "🗿", desc: "Os anciãos esmagam tudo à tua volta", ult: true },
  ],
]

"""
src = swap_block(src, "export const SKILLS: SkillDef[][] = [", "export const SKILL_BOOK_XP", new_skills)

# ── 8 · CURVAS OFICIAIS: nível = tier · XP = tabela oficial ─────────────
i = src.find("export function mobXp")
j = src.find("// ── Zona segura")
assert i != -1 and j != -1
new_curves = """export function mobXp(_tier: number, charLvl: number, mobLvl: number): number {
  // Tabela oficial de XP do hordes.io (wiki): 100 no nv.1, +18.7 por nível
  const base = Math.round(100 + (mobLvl - 1) * 18.71);
  const diff = mobLvl - charLvl;
  const scale = diff >= -5 ? 1 : Math.max(0.1, 1 + diff * 0.07);
  return Math.max(1, Math.round(base * scale));
}
export function mobLevelForTier(tier: number): number {
  // Nível oficial = nível da espécie (wiki), sem aleatoriedade
  return tier;
}

"""
src = src[:i] + new_curves + src[j:]

# ── 9 · Textos: campanha, tutorial, miradouros, portais ────────────────
src = src.replace("Abate 5 criaturas na Planície Dourada", "Abate 5 criaturas na Campina de Guardstone")
src = src.replace("Fala com o Mestre de Montarias na Vila", "Fala com o Mestre de Montarias em Guardstone")
src = src.replace("Confirma a tua facção no teu bastião", "Confirma a tua facção no teu castelo")
src = src.replace("Abate 3 criaturas na Planície", "Abate 3 criaturas na Campina")
src = src.replace('name: "Portal Tempestade"', 'name: "Portal Bloodlust"')
src = src.replace("Teleporta ao Bastião Tempestade", "Teleporta à Fortaleza Bloodlust")
src = src.replace('name: "Portal Vanguarda"', 'name: "Portal Vanguard"')
src = src.replace("Teleporta à Fortaleza Vanguarda", "Teleporta ao Castelo Vanguard")

i = src.find("export const MIRADOUROS = [")
j = src.find("// ── EMOTES")
assert i != -1 and j != -1
new_mira = """export const MIRADOUROS = [
  { id: "mira_planicie", region: "planicie", x: -95, z: 25, name: "Miradouro da Campina" },
  { id: "mira_floresta", region: "floresta", x: -175, z: 120, name: "Miradouro da Floresta Guardstone" },
  { id: "mira_dunas", region: "dunas", x: 45, z: -155, name: "Miradouro do Deserto Headless" },
  { id: "mira_pantano", region: "pantano", x: 185, z: 45, name: "Miradouro do Oásis" },
  { id: "mira_vulcao", region: "vulcao", x: -45, z: -225, name: "Miradouro de Marrowlands" },
  { id: "mira_tundra", region: "tundra", x: 265, z: -65, name: "Miradouro de Faivel" },
  { id: "mira_titas", region: "titas", x: -265, z: -25, name: "Miradouro do Pinhal Lunar" },
  { id: "mira_escuro", region: "escuro", x: 105, z: 235, name: "Miradouro de Gloomfury" },
];

"""
src = src[:i] + new_mira + src[j:]

# ── 10 · BUFFS: chaves das novas habilidades ────────────────────────────
i = src.find("export const BUFFS: Record<string, { name: string; emoji: string; desc: string }> = {")
j = src.find("// ──Marcos com significado")
assert i != -1 and j != -1
new_buffs = """export const BUFFS: Record<string, { name: string; emoji: string; desc: string }> = {
  g4: { name: "Baluarte", emoji: "🛡️", desc: "+34% bloqueio" },
  g5: { name: "Provocar", emoji: "📣", desc: "Monstros atacam-te" },
  g8: { name: "Enfurecer", emoji: "🔥", desc: "+12% ATK" },
  g9: { name: "Coragem do Cruzado", emoji: "⚔️", desc: "Grupo +DEF/+mana" },
  g10: { name: "Grito Profano", emoji: "☠️", desc: "Grupo +ATK" },
  g11: { name: "Têmpera", emoji: "⏳", desc: "Limpa controlos" },
  m5: { name: "Escudo de Gelo", emoji: "🛡️", desc: "Bloqueia ataques" },
  m9: { name: "Frenesi Hipotérmico", emoji: "⚡", desc: "+pressa/+dano" },
  m10: { name: "Encantamento", emoji: "✨", desc: "+dano no alvo" },
  m11: { name: "Aura Ártica", emoji: "🌟", desc: "Grupo +crítico" },
  a7: { name: "Reanimar", emoji: "⚡", desc: "+mana/+dano" },
  a10: { name: "Sentido de Caminho", emoji: "🧭", desc: "Grupo +velocidade" },
  x5: { name: "Poço de Mimir", emoji: "🕳️", desc: "Grupo +mana" },
  x7: { name: "Uivo Canino", emoji: "🐺", desc: "Grupo +pressa" },
  x8: { name: "Convocar", emoji: "🌀", desc: "Grupo teleporta" },
  x10: { name: "Escudo Espiritual", emoji: "👻", desc: "Absorve dano" },
  territorio: { name: "Domínio de Facção", emoji: "🏳️", desc: "+10% XP (torre)" },
  descanso: { name: "Descanso em Casa", emoji: "🏠", desc: "+15% XP" },
  estrelas: { name: "Chuva de Estrelas", emoji: "🌟", desc: "XP ×2" },
  forcapocao: { name: "Elixir de Força", emoji: "💪", desc: "+40% ATK" },
  ventopocao: { name: "Poção do Vento", emoji: "🌪️", desc: "+35% VEL" },
  guardapocao: { name: "Óleo de Guarda", emoji: "🛡️", desc: "+40% DEF" },
  grupo: { name: "Bónus de Grupo", emoji: "🤝", desc: "+XP/+loot por membro perto" },
}

"""
src = src[:i] + new_buffs + src[j:]

# ── 11 · Cabeçalho ──────────────────────────────────────────────────────
src = src.replace(
  "// BATEU WORLD — ERA DAS LENDAS (v18) · DADOS DO MMO\n// Reconstrução total com REA de Hordes.io + superação em\n// TODOS os requisitos:",
  "// BATEU HORDES (v20) · DADOS OFICIAIS DO HORDES.IO\n// Conteúdo EXACTO das fontes oficiais (wiki.gg + hordes.io/info/skills):\n//  · 4 classes × 12 habilidades OFICIAIS com MP/CD reais\n//  · 2 facções oficiais: VANGUARD vs BLOODLUST\n//  · 83 criaturas oficiais nv.1-45 com HP/XP exactos da wiki\n//  · Regiões reais: Guardstone, Headless, Faivel, Oásis, Marrowlands\n//  · Espécies raras oficiais + CHEFE MUNDIAL GLOOMFURY",
)

open(PATH, "w", encoding="utf-8").write(src)
print(f"OK — mmo.ts convertido. Criaturas: {len(MOBS)} · bytes: {len(orig)} → {len(src)}")
