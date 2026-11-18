#!/usr/bin/env python3
# v63 — i18n da ARENA DAS LENDAS (substitui o bloco rpg.* voxel apagado)
# Idempotente: só insere o que ainda não existe.
import re

P = "src/contexts/LanguageContext.tsx"
linhas = open(P).read().split("\n")

EN_DESC = "Top-view MMO arena, League-of-Legends style: shared world, real multiplayer, camps, Dragon and Baron!"
PT_DESC = "MMO de arena em vista de topo, estilo League of Legends: mundo partilhado, multi real, camps, Dragão e Barão!"
EN_LBL = "⚔️ BATEU RPG: Legends of the Arena"
PT_LBL = "⚔️ BATEU RPG: Lendas da Arena"

EN = {
    "arena.titulo": "BATEU RPG: LEGENDS OF THE ARENA",
    "arena.menu.sub": "Top-view MMO arena, in League of Legends style: pick your champion, fight over shared camps with everyone online and take on the Dragon and the Baron.",
    "arena.menu.mundo": "One shared world · server-authoritative monsters · up to 150 heroes at once · progress saved on this device",
    "arena.menu.nota": "No server reachable right now? You play SOLO — and the HUD says so honestly.",
    "arena.escolher": "CHOOSE YOUR CHAMPION",
    "arena.nome": "Hero name",
    "arena.entrar": "ENTER THE ARENA",
    "arena.papel.guerreiro": "Fighter · melee bruiser",
    "arena.papel.mago": "Mage · ranged area damage",
    "arena.papel.atirador": "Marksman · ranged DPS",
    "arena.papel.curandeira": "Healer · support",
    "arena.hist.kaimu": "Veteran of the Mafalala sands, fighting with the strength of ancient legends.",
    "arena.hist.lyra": "Guardian of the floating library, she weaves storms with ancient words.",
    "arena.hist.vex": "Scout of the bush — she never misses when her people depend on her.",
    "arena.hist.nara": "Priestess of the sacred river, bringing the waters' healing to the arena.",
    "arena.nivel": "Lv.",
    "arena.essencia": "Essence",
    "arena.abates": "Kills",
    "arena.online": "{n} heroes online",
    "arena.modoSolo": "Solo mode — no arena server found",
    "arena.aLigar": "Connecting to the arena…",
    "arena.sair": "Leave arena",
    "arena.loja": "Shop",
    "arena.loja.titulo": "Fountain Shop",
    "arena.loja.perto": "Stand at the base fountain to buy.",
    "arena.comprar": "Buy",
    "arena.loja.max": "MAX",
    "arena.loja.semEssencia": "Not enough essence",
    "arena.item.lamina": "Fierce Blade",
    "arena.item.cajado": "Arcane Staff",
    "arena.item.couraca": "Colossus Cuirass",
    "arena.item.botas": "Swift Boots",
    "arena.item.anel": "Mana Ring",
    "arena.item.talisma": "Vital Talisman",
    "arena.itemd.lamina": "+14 attack per stack",
    "arena.itemd.cajado": "+16 ability power per stack",
    "arena.itemd.couraca": "+190 health per stack",
    "arena.itemd.botas": "+0.9 speed per stack",
    "arena.itemd.anel": "+230 mana · +1.6 mana/s",
    "arena.itemd.talisma": "+3 health/s",
    "arena.morte": "YOU FELL",
    "arena.renascerEm": "Respawn at the fountain in {s}s",
    "arena.chat.dica": "Enter to chat",
    "arena.chat.placeholder": "Write to the arena…",
    "arena.controlos.titulo": "CONTROLS",
    "arena.controlos.mover": "Click / WASD — move · S — stop",
    "arena.controlos.habilidades": "Q W E R — abilities aimed at the cursor (+ F = shield)",
    "arena.controlos.atacar": "Auto-attack while standing near enemies",
    "arena.controlos.zoom": "Mouse wheel — camera zoom",
    "arena.controlos.loja": "B — shop, at the fountain",
    "arena.subiuNivel": "LEVEL {n}!",
    "arena.matou": "{mob} defeated!",
    "arena.mob.lobo": "Wolf", "arena.mob.raptor": "Raptor", "arena.mob.golem": "Golem",
    "arena.mob.espectro": "Spectre", "arena.mob.raposa": "Fox", "arena.mob.dragao": "Dragon",
    "arena.mob.barao": "Baron",
    "arena.erro.mana": "Not enough mana",
    "arena.erro.cd": "Ability is recharging",
    "arena.fonte": "Fountain — full regeneration",
    "arena.ping": "{ms} ms",
    "arena.corrigido": "Server adjusted: {motivo}",
    "arena.hab.kaimu.Q": "Crescent Cleave", "arena.hab.kaimu.W": "Stone Skin",
    "arena.hab.kaimu.E": "Charge", "arena.hab.kaimu.R": "Earthquake",
    "arena.hab.lyra.Q": "Arcane Bolt", "arena.hab.lyra.W": "Frost Nova",
    "arena.hab.lyra.E": "Ethereal Step", "arena.hab.lyra.R": "Arcane Storm",
    "arena.hab.vex.Q": "Piercing Shot", "arena.hab.vex.W": "Trap",
    "arena.hab.vex.E": "Tumble", "arena.hab.vex.R": "Arrow Rain",
    "arena.hab.nara.Q": "Light Lance", "arena.hab.nara.W": "Blessing",
    "arena.hab.nara.E": "Sacred Haste", "arena.hab.nara.R": "Restoring Aura",
    "arena.habd.kaimu.Q": "Arc slash ahead that wounds every enemy in the cone.",
    "arena.habd.kaimu.W": "Stone skin: shield that absorbs damage for 3 s.",
    "arena.habd.kaimu.E": "Charge: dash 7.5 u, wounding the first enemy on the way.",
    "arena.habd.kaimu.R": "Earthquake: massive area strike around you, slowing enemies.",
    "arena.habd.lyra.Q": "Arcane bolt: energy projectile that wounds the first enemy.",
    "arena.habd.lyra.W": "Frost nova: bursts at the target point and slows those hit.",
    "arena.habd.lyra.E": "Ethereal step: teleports to the target point.",
    "arena.habd.lyra.R": "Arcane storm: massive devastation on the target area.",
    "arena.habd.vex.Q": "Piercing shot: arrow that goes through enemies in a line.",
    "arena.habd.vex.W": "Trap: zone that slows enemies for 3 s.",
    "arena.habd.vex.E": "Tumble: roll in your movement direction.",
    "arena.habd.vex.R": "Arrow rain: bombards the target area for 2 s.",
    "arena.habd.nara.Q": "Light lance: sacred projectile that wounds the first enemy.",
    "arena.habd.nara.W": "Blessing: instantly restores your health.",
    "arena.habd.nara.E": "Sacred haste: +45 % speed for 3 s.",
    "arena.habd.nara.R": "Restoring aura: heals you and nearby allies.",
    "arena.minimapa": "MAP",
    "arena.pausa.titulo": "PAUSED",
    "arena.pausa.continuar": "Back to the fight",
    "arena.pausa.sair": "Leave the arena (progress is kept on this device)",
}
PT = {
    "arena.titulo": "BATEU RPG: LENDAS DA ARENA",
    "arena.menu.sub": "MMO de arena em vista de topo, estilo League of Legends: escolhe o teu campeão, disputa os camps partilhados com todos os online e enfrenta o Dragão e o Barão.",
    "arena.menu.mundo": "Um mundo partilhado · monstros autoritativos do servidor · até 150 heróis em simultâneo · progresso guardado neste aparelho",
    "arena.menu.nota": "Sem servidor ao alcance agora? Jogas SOLO — e o HUD diz-no com honestidade.",
    "arena.escolher": "ESCOLHE O TEU CAMPEÃO",
    "arena.nome": "Nome do herói",
    "arena.entrar": "ENTRAR NA ARENA",
    "arena.papel.guerreiro": "Guerreiro · bruiser corpo a corpo",
    "arena.papel.mago": "Maga · dano em área à distância",
    "arena.papel.atirador": "Atiradora · DPS à distância",
    "arena.papel.curandeira": "Curandeira · suporte",
    "arena.hist.kaimu": "Veterano das areias de Mafalala, luta com a força das lendas antigas.",
    "arena.hist.lyra": "Guardiã da biblioteca suspensa, tece tempestades com palavras antigas.",
    "arena.hist.vex": "Batedora do mato — nunca erra um tiro quando o povo depende dela.",
    "arena.hist.nara": "Sacerdotisa do rio sagrado, traz a cura das águas para a arena.",
    "arena.nivel": "Nv.",
    "arena.essencia": "Essência",
    "arena.abates": "Abates",
    "arena.online": "{n} heróis online",
    "arena.modoSolo": "Modo solo — servidor da arena não encontrado",
    "arena.aLigar": "A ligar à arena…",
    "arena.sair": "Sair da arena",
    "arena.loja": "Loja",
    "arena.loja.titulo": "Loja da Fonte",
    "arena.loja.perto": "Fica na fonte da base para comprar.",
    "arena.comprar": "Comprar",
    "arena.loja.max": "MÁX",
    "arena.loja.semEssencia": "Essência insuficiente",
    "arena.item.lamina": "Lâmina Feroz",
    "arena.item.cajado": "Cajado Arcano",
    "arena.item.couraca": "Couraça do Colosso",
    "arena.item.botas": "Botas da Celeridade",
    "arena.item.anel": "Anel de Mana",
    "arena.item.talisma": "Talismã Vital",
    "arena.itemd.lamina": "+14 de ataque por compra",
    "arena.itemd.cajado": "+16 de poder de habilidade por compra",
    "arena.itemd.couraca": "+190 de vida por compra",
    "arena.itemd.botas": "+0,9 de velocidade por compra",
    "arena.itemd.anel": "+230 de mana · +1,6 mana/s",
    "arena.itemd.talisma": "+3 vida/s",
    "arena.morte": "CAÍSTE",
    "arena.renascerEm": "Renasces na fonte em {s}s",
    "arena.chat.dica": "Enter para conversar",
    "arena.chat.placeholder": "Escreve à arena…",
    "arena.controlos.titulo": "CONTROLOS",
    "arena.controlos.mover": "Clique / WASD — mover · S — parar",
    "arena.controlos.habilidades": "Q W E R — habilidades no cursor (+ F = escudo)",
    "arena.controlos.atacar": "Ataque automático parado perto de inimigos",
    "arena.controlos.zoom": "Roda do rato — zoom da câmara",
    "arena.controlos.loja": "B — loja, junto à fonte",
    "arena.subiuNivel": "NÍVEL {n}!",
    "arena.matou": "{mob} abatido!",
    "arena.mob.lobo": "Lobo", "arena.mob.raptor": "Raptor", "arena.mob.golem": "Golem",
    "arena.mob.espectro": "Espectro", "arena.mob.raposa": "Raposa", "arena.mob.dragao": "Dragão",
    "arena.mob.barao": "Barão",
    "arena.erro.mana": "Mana insuficiente",
    "arena.erro.cd": "Habilidade em recarga",
    "arena.fonte": "Fonte — regeneração total",
    "arena.ping": "{ms} ms",
    "arena.corrigido": "Servidor corrigiu: {motivo}",
    "arena.hab.kaimu.Q": "Corte Crescente", "arena.hab.kaimu.W": "Pele de Pedra",
    "arena.hab.kaimu.E": "Investida", "arena.hab.kaimu.R": "Terremoto",
    "arena.hab.lyra.Q": "Raio Arcano", "arena.hab.lyra.W": "Nova de Gelo",
    "arena.hab.lyra.E": "Passo Etéreo", "arena.hab.lyra.R": "Tempestade Arcana",
    "arena.hab.vex.Q": "Tiro Perfurante", "arena.hab.vex.W": "Armadilha",
    "arena.hab.vex.E": "Cambalhota", "arena.hab.vex.R": "Chuva de Flechas",
    "arena.hab.nara.Q": "Lança de Luz", "arena.hab.nara.W": "Bênção",
    "arena.hab.nara.E": "Haste Sagrada", "arena.hab.nara.R": "Aura Restauradora",
    "arena.habd.kaimu.Q": "Corte em arco à frente que fere todos os inimigos no cone.",
    "arena.habd.kaimu.W": "Pele de pedra: escudo que absorve dano durante 3 s.",
    "arena.habd.kaimu.E": "Investida: avança 7,5 u e fere o primeiro inimigo no caminho.",
    "arena.habd.kaimu.R": "Terremoto: golpe massivo em área à tua volta, abranda os inimigos.",
    "arena.habd.lyra.Q": "Raio arcano: projétil de energia que fere o primeiro inimigo.",
    "arena.habd.lyra.W": "Nova de gelo: explode no ponto-alvo e abranda quem for atingido.",
    "arena.habd.lyra.E": "Passo etéreo: teleporta para o ponto-alvo.",
    "arena.habd.lyra.R": "Tempestade arcana: devastação massiva na área-alvo.",
    "arena.habd.vex.Q": "Tiro perfurante: flecha que atravessa os inimigos em linha.",
    "arena.habd.vex.W": "Armadilha: zona que abranda inimigos durante 3 s.",
    "arena.habd.vex.E": "Cambalhota: rola na direção do movimento.",
    "arena.habd.vex.R": "Chuva de flechas: bombardeia a área-alvo durante 2 s.",
    "arena.habd.nara.Q": "Lança de luz: projétil sagrado que fere o primeiro inimigo.",
    "arena.habd.nara.W": "Bênção: restaura a tua vida instantaneamente.",
    "arena.habd.nara.E": "Haste sagrada: +45 % de velocidade durante 3 s.",
    "arena.habd.nara.R": "Aura restauradora: cura tu e os aliados à tua volta.",
    "arena.minimapa": "MAPA",
    "arena.pausa.titulo": "EM PAUSA",
    "arena.pausa.continuar": "Voltar à luta",
    "arena.pausa.sair": "Sair da arena (o progresso fica neste aparelho)",
}

# passo 1 — atualizar rótulos mmorpg por bloco de idioma
idioma = None
ja = {"lbl": set(), "desc": set()}
for i, l in enumerate(linhas):
    m = re.match(r"^  (en|pt|es|fr|hi): \{", l)
    if m:
        idioma = m.group(1)
        continue
    if '"livehub.game.mmorpg"' in l and idioma:
        novo = PT_LBL if idioma == "pt" else EN_LBL
        if idioma not in ja["lbl"]:
            linhas[i] = re.sub(r'"livehub\.game\.mmorpg": "[^"]*"', f'"livehub.game.mmorpg": "{novo}"', l)
            ja["lbl"].add(idioma)
    if '"livehub.game.mmorpg.desc"' in l and idioma:
        novo = PT_DESC if idioma == "pt" else EN_DESC
        if idioma not in ja["desc"]:
            linhas[i] = re.sub(r'"livehub\.game\.mmorpg\.desc": "[^"]*"', f'"livehub.game.mmorpg.desc": "{novo}"', l)
            ja["desc"].add(idioma)

# passo 2 — inserir chaves arena.* logo APÓS o rótulo mmorpg.desc do bloco
def inserir_bloco(bloco, chaves):
    idioma = None
    for i, l in enumerate(linhas):
        m = re.match(r"^  (en|pt|es|fr|hi): \{", l)
        if m:
            idioma = m.group(1)
            continue
        if idioma == bloco and '"livehub.game.mmorpg.desc"' in l:
            extra = [f'    "{k}": "{v}",' for k, v in chaves.items()]
            linhas[i + 1:i + 1] = extra
            return len(extra)
    return 0

n1 = inserir_bloco("en", EN)
n2 = inserir_bloco("pt", PT)

open(P, "w").write("\n".join(linhas))
print(f"inseridas: en={n1} pt={n2} · rótulos: lbl={sorted(ja['lbl'])} desc={sorted(ja['desc'])}")
