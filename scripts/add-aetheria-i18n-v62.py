#!/usr/bin/env python3
# v62 — chaves i18n do AETHERIA (roadmap item 3) nos dicionários pt/en.
import json, sys

CAMINHO = "src/contexts/LanguageContext.tsx"

PT = {
  "aeth.intro.overline": "UM NOVO HORIZONTE",
  "aeth.intro.ilhas": "Ilhas de",
  "aeth.intro.corpo": "Um mundo aberto entre as nuvens. Escolhe o teu caminho, conhece as ilhas e escreve a tua própria aventura.",
  "aeth.intro.escolherClasse": "Escolhe uma classe",
  "aeth.classe.sentinel.nome": "Sentinela",
  "aeth.classe.sentinel.role": "Defesa e combate próximo",
  "aeth.classe.arcanist.nome": "Arcanista",
  "aeth.classe.arcanist.role": "Magia e energia elemental",
  "aeth.classe.ranger.nome": "Batedora",
  "aeth.classe.ranger.role": "Agilidade e ataques precisos",
  "aeth.intro.entrar": "Explorar Aetheria",
  "aeth.intro.controlos": "WASD para andar · F para voar · 1 para atacar · 2 para curar",
  "aeth.intro.voltar": "Voltar aos jogos",
  "aeth.mundo.canvas": "Mundo 3D de Aetheria",
  "aeth.mundo.titulo": "Ilhas do Alvorecer",
  "aeth.mundo.sub": "Região segura · Céu limpo",
  "aeth.mundo.viajante": "Viajante",
  "aeth.mundo.sair": "Sair do mundo",
  "aeth.mundo.saude": "SAÚDE",
  "aeth.mundo.energia": "ENERGIA",
  "aeth.mundo.regiao": "PLANÍCIE DAS BRISAS",
  "aeth.mundo.diario": "DIÁRIO DE VIAGEM",
  "aeth.quest.nova.titulo": "Uma nova jornada",
  "aeth.quest.nova.corpo": "Fala com a guia para descobrir o que ameaça a ilha.",
  "aeth.quest.aceite.titulo": "Ecos na pradaria",
  "aeth.quest.aceite.corpo": "Afasta as criaturas que rondam a ilha.",
  "aeth.quest.feita.titulo": "A guardiã das brisas",
  "aeth.quest.feita.corpo": "As criaturas acalmaram. A ilha está em paz.",
  "aeth.quest.criaturas": "Criaturas",
  "aeth.quest.concluida": "✓ Jornada concluída",
  "aeth.quest.falar": "Falar com Nara",
  "aeth.minimapa.aria": "Mapa da região",
  "aeth.minimapa.rotulo": "BRISAS",
  "aeth.atacar.aria": "Ataque básico",
  "aeth.atacar.rotulo": "Ataque",
  "aeth.restaurar.aria": "Luz restauradora",
  "aeth.restaurar.rotulo": "Restaurar",
  "aeth.voo.aria": "Alternar voo",
  "aeth.voo.planar": "Planar",
  "aeth.voo.voar": "Voar",
  "aeth.mochila.abrir": "Abrir mochila",
  "aeth.mochila.rotulo": "Mochila",
  "aeth.mochila.fechar": "Fechar mochila",
  "aeth.mochila.titulo": "Mochila de viagem",
  "aeth.mochila.corpo": "Os teus achados acompanham-te pelas ilhas.",
  "aeth.mochila.item1": "Fragmento de brisa",
  "aeth.mochila.item2": "Moedas de Aetheria",
  "aeth.controlos.hint": "WASD mover · SHIFT correr · F planar · 1 atacar · 2 restaurar",
  "aeth.target.nome": "Faísca errante",
  "aeth.target.sub": "Criatura das nuvens · Nv. 1",
  "aeth.nota.aproximar": "Aproxima-te de uma criatura para atacar.",
  "aeth.nota.ataque": "Ataque certeiro · a criatura perdeu energia.",
  "aeth.nota.missao": "Missão concluída! Recebeste 100 EXP e 80 moedas.",
  "aeth.nota.kill": "Criatura derrotada · +35 EXP",
  "aeth.nota.mana": "Precisas de pelo menos 20 de energia para usar esta habilidade.",
  "aeth.nota.curar": "Luz restauradora · recuperaste saúde.",
  "aeth.nota.missaoComecou": "A missão começou: derrota três criaturas nas ilhas.",
}

EN = {
  "aeth.intro.overline": "A NEW HORIZON",
  "aeth.intro.ilhas": "Isles of",
  "aeth.intro.corpo": "An open world between the clouds. Pick your path, get to know the isles and write your own adventure.",
  "aeth.intro.escolherClasse": "Choose a class",
  "aeth.classe.sentinel.nome": "Sentinel",
  "aeth.classe.sentinel.role": "Defense and close combat",
  "aeth.classe.arcanist.nome": "Arcanist",
  "aeth.classe.arcanist.role": "Magic and elemental energy",
  "aeth.classe.ranger.nome": "Scout",
  "aeth.classe.ranger.role": "Agility and precise strikes",
  "aeth.intro.entrar": "Explore Aetheria",
  "aeth.intro.controlos": "WASD to walk · F to fly · 1 to attack · 2 to heal",
  "aeth.intro.voltar": "Back to the games",
  "aeth.mundo.canvas": "Aetheria 3D world",
  "aeth.mundo.titulo": "Dawn Isles",
  "aeth.mundo.sub": "Safe region · Clear sky",
  "aeth.mundo.viajante": "Traveler",
  "aeth.mundo.sair": "Leave the world",
  "aeth.mundo.saude": "HEALTH",
  "aeth.mundo.energia": "ENERGY",
  "aeth.mundo.regiao": "BREEZE PLAINS",
  "aeth.mundo.diario": "TRAVEL JOURNAL",
  "aeth.quest.nova.titulo": "A new journey",
  "aeth.quest.nova.corpo": "Talk to the guide to find out what threatens the isle.",
  "aeth.quest.aceite.titulo": "Echoes in the meadow",
  "aeth.quest.aceite.corpo": "Drive away the creatures prowling the isle.",
  "aeth.quest.feita.titulo": "The keeper of the breezes",
  "aeth.quest.feita.corpo": "The creatures have calmed. The isle is at peace.",
  "aeth.quest.criaturas": "Creatures",
  "aeth.quest.concluida": "✓ Journey complete",
  "aeth.quest.falar": "Talk to Nara",
  "aeth.minimapa.aria": "Region map",
  "aeth.minimapa.rotulo": "BREEZE",
  "aeth.atacar.aria": "Basic attack",
  "aeth.atacar.rotulo": "Attack",
  "aeth.restaurar.aria": "Restoring light",
  "aeth.restaurar.rotulo": "Restore",
  "aeth.voo.aria": "Toggle flight",
  "aeth.voo.planar": "Glide",
  "aeth.voo.voar": "Fly",
  "aeth.mochila.abrir": "Open backpack",
  "aeth.mochila.rotulo": "Backpack",
  "aeth.mochila.fechar": "Close backpack",
  "aeth.mochila.titulo": "Travel backpack",
  "aeth.mochila.corpo": "Your findings travel with you across the isles.",
  "aeth.mochila.item1": "Breeze fragment",
  "aeth.mochila.item2": "Aetheria coins",
  "aeth.controlos.hint": "WASD move · SHIFT run · F glide · 1 attack · 2 restore",
  "aeth.target.nome": "Wandering Spark",
  "aeth.target.sub": "Cloud creature · Lv. 1",
  "aeth.nota.aproximar": "Get close to a creature to attack.",
  "aeth.nota.ataque": "Precise hit · the creature lost energy.",
  "aeth.nota.missao": "Quest complete! You earned 100 EXP and 80 coins.",
  "aeth.nota.kill": "Creature defeated · +35 EXP",
  "aeth.nota.mana": "You need at least 20 energy to use this ability.",
  "aeth.nota.curar": "Restoring light · you recovered health.",
  "aeth.nota.missaoComecou": "The quest began: defeat three creatures on the isles.",
}

BLOCOS = [("en", EN), ("pt", PT)]

with open(CAMINHO, "r", encoding="utf-8") as f:
    linhas = f.readlines()

total = 0
for chave_dict, pares in BLOCOS:
    ancora = f'  "{chave_dict}": {{' if "-" in chave_dict else f"  {chave_dict}: {{"
    idx = None
    for i, linha in enumerate(linhas):
        if linha.rstrip("\n").rstrip() == ancora:
            idx = i
            break
    if idx is None:
        print(f"ÂNCORA NÃO ENCONTRADA: {ancora}")
        sys.exit(1)
    bloco = "".join(f'    {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)},\n' for k, v in pares.items())
    linhas.insert(idx + 1, bloco)
    total += len(pares)
    print(f"  {chave_dict}: +{len(pares)} chaves")

with open(CAMINHO, "w", encoding="utf-8") as f:
    f.writelines(linhas)
print(f"TOTAL: {total}")
