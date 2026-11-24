#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v87 TROFÉUS: insere as chaves i18n novas ×6 (esport.bracket.* + perfil.trofeus.*) no LanguageContext.
Âncora: abertura de cada dicionário (mesmo padrão add-i18n-v86.py)."""
import io

CTX = "/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx"

PT = '''
    // ===== v87 TROFÉUS QUE SE MOSTRAM: vitrine no perfil + caminho da eliminatória =====
    "esport.bracket.titulo": "Caminho na eliminatória",
    "esport.bracket.ronda": "Ronda {n}",
    "esport.bracket.corte": "corte top {n}",
    "esport.bracket.final": "Final",
    "esport.bracket.passou": "Passaste",
    "esport.bracket.emCurso": "É agora",
    "esport.bracket.eliminado": "Eliminado aqui",
    "esport.bracket.campeao": "CAMPEÃO",
    "esport.bracket.pendente": "À espera",
    "esport.bracket.nota": "O caminho é o TEU: o corte é a TUA posição real em cada corrida — os rivais IA da grelha não são eliminados ronda a ronda.",
    "perfil.trofeus.titulo": "Vitrine de troféus",
    "perfil.trofeus.chip.trofeus": "troféus",
    "perfil.trofeus.chip.podios": "pódios (2.º/3.º)",
    "perfil.trofeus.chip.competicoes": "competições",
    "perfil.trofeus.campeao": "Campeão",
    "perfil.trofeus.premio": "{n} Pontos Bateu",
    "perfil.trofeus.vazio.titulo": "Ainda sem troféus",
    "perfil.trofeus.vazio.sub": "Só vitórias REAIS entram aqui: fecha um torneio ou uma liga como 1.º classificado.",
    "perfil.trofeus.vazio.cta": "Ver torneios e ligas",
    "perfil.trofeus.nota": "Troféus do aparelho — vivem neste dispositivo, como todo o e-sport do Bateu.",
'''

EN = '''
    // ===== v87 TROPHIES ON SHOW: profile showcase + knockout path =====
    "esport.bracket.titulo": "Knockout path",
    "esport.bracket.ronda": "Round {n}",
    "esport.bracket.corte": "top {n} cut",
    "esport.bracket.final": "Final",
    "esport.bracket.passou": "Through",
    "esport.bracket.emCurso": "It's now",
    "esport.bracket.eliminado": "Eliminated here",
    "esport.bracket.campeao": "CHAMPION",
    "esport.bracket.pendente": "Waiting",
    "esport.bracket.nota": "This path is YOURS: the cut is YOUR real position in every race — the AI rivals on the grid are not eliminated round by round.",
    "perfil.trofeus.titulo": "Trophy cabinet",
    "perfil.trofeus.chip.trofeus": "trophies",
    "perfil.trofeus.chip.podios": "podiums (2nd/3rd)",
    "perfil.trofeus.chip.competicoes": "competitions",
    "perfil.trofeus.campeao": "Champion",
    "perfil.trofeus.premio": "{n} Bateu Points",
    "perfil.trofeus.vazio.titulo": "No trophies yet",
    "perfil.trofeus.vazio.sub": "Only REAL wins belong here: close a tournament or a league as the 1st placed.",
    "perfil.trofeus.vazio.cta": "See tournaments and leagues",
    "perfil.trofeus.nota": "Trophies live on this device — like all Bateu e-sport.",
'''

PTBR = '''
    // ===== v87 TROFÉUS EM DESTAQUE: vitrine no perfil + caminho da eliminatória =====
    "esport.bracket.titulo": "Caminho na eliminatória",
    "esport.bracket.ronda": "Rodada {n}",
    "esport.bracket.corte": "corte top {n}",
    "esport.bracket.final": "Final",
    "esport.bracket.passou": "Passou",
    "esport.bracket.emCurso": "É agora",
    "esport.bracket.eliminado": "Eliminado aqui",
    "esport.bracket.campeao": "CAMPEÃO",
    "esport.bracket.pendente": "Aguardando",
    "esport.bracket.nota": "O caminho é SEU: o corte é a SUA posição real em cada corrida — os rivais IA da grade não são eliminados rodada a rodada.",
    "perfil.trofeus.titulo": "Vitrine de troféus",
    "perfil.trofeus.chip.trofeus": "troféus",
    "perfil.trofeus.chip.podios": "pódios (2.º/3.º)",
    "perfil.trofeus.chip.competicoes": "competições",
    "perfil.trofeus.campeao": "Campeão",
    "perfil.trofeus.premio": "{n} Pontos Bateu",
    "perfil.trofeus.vazio.titulo": "Ainda sem troféus",
    "perfil.trofeus.vazio.sub": "Só vitórias REAIS entram aqui: feche um torneio ou uma liga como 1.º colocado.",
    "perfil.trofeus.vazio.cta": "Ver torneios e ligas",
    "perfil.trofeus.nota": "Troféus do aparelho — vivem neste dispositivo, como todo o e-sport do Bateu.",
'''

ES = '''
    // ===== v87 TROFEOS EN VITRINA: escaparate en el perfil + camino de la eliminatoria =====
    "esport.bracket.titulo": "Camino en la eliminatoria",
    "esport.bracket.ronda": "Ronda {n}",
    "esport.bracket.corte": "corte top {n}",
    "esport.bracket.final": "Final",
    "esport.bracket.passou": "Pasaste",
    "esport.bracket.emCurso": "Es ahora",
    "esport.bracket.eliminado": "Eliminado aquí",
    "esport.bracket.campeao": "CAMPEÓN",
    "esport.bracket.pendente": "En espera",
    "esport.bracket.nota": "El camino es TUYO: el corte es TU posición real en cada carrera — los rivales IA de la parrilla no se eliminan ronda a ronda.",
    "perfil.trofeus.titulo": "Vitrina de trofeos",
    "perfil.trofeus.chip.trofeus": "trofeos",
    "perfil.trofeus.chip.podios": "podios (2.º/3.º)",
    "perfil.trofeus.chip.competicoes": "competencias",
    "perfil.trofeus.campeao": "Campeón",
    "perfil.trofeus.premio": "{n} Puntos Bateu",
    "perfil.trofeus.vazio.titulo": "Aún sin trofeos",
    "perfil.trofeus.vazio.sub": "Solo las victorias REALES entran aquí: cierra un torneo o una liga como 1.º clasificado.",
    "perfil.trofeus.vazio.cta": "Ver torneos y ligas",
    "perfil.trofeus.nota": "Trofeos del aparato — viven en este dispositivo, como todo el e-sport de Bateu.",
'''

FR = '''
    // ===== v87 TROPHÉES EN VITRINE : vitrine du profil + parcours de l'éliminatoire =====
    "esport.bracket.titulo": "Parcours en éliminatoire",
    "esport.bracket.ronda": "Manche {n}",
    "esport.bracket.corte": "coupe top {n}",
    "esport.bracket.final": "Finale",
    "esport.bracket.passou": "Qualifié",
    "esport.bracket.emCurso": "C'est maintenant",
    "esport.bracket.eliminado": "Éliminé ici",
    "esport.bracket.campeao": "CHAMPION",
    "esport.bracket.pendente": "En attente",
    "esport.bracket.nota": "Le parcours est le TIEN : la coupe est TA position réelle à chaque course — les rivaux IA de la grille ne sont pas éliminés manche par manche.",
    "perfil.trofeus.titulo": "Vitrine de trophées",
    "perfil.trofeus.chip.trofeus": "trophées",
    "perfil.trofeus.chip.podios": "podiums (2ᵉ/3ᵉ)",
    "perfil.trofeus.chip.competicoes": "compétitions",
    "perfil.trofeus.campeao": "Champion",
    "perfil.trofeus.premio": "{n} Points Bateu",
    "perfil.trofeus.vazio.titulo": "Pas encore de trophées",
    "perfil.trofeus.vazio.sub": "Seules les victoires RÉELLES entrent ici : termine un tournoi ou une ligue en 1ʳᵉ place.",
    "perfil.trofeus.vazio.cta": "Voir tournois et ligues",
    "perfil.trofeus.nota": "Trophées de l'appareil — ils vivent sur cet appareil, comme tout l'e-sport du Bateu.",
'''

HI = '''
    // ===== v87 ट्रॉफ़ी प्रदर्शन: प्रोफ़ाइल शोकेस + नॉकआउट पथ =====
    "esport.bracket.titulo": "नॉकआउट में रास्ता",
    "esport.bracket.ronda": "राउंड {n}",
    "esport.bracket.corte": "टॉप {n} कट",
    "esport.bracket.final": "फ़ाइनल",
    "esport.bracket.passou": "आगे बढ़े",
    "esport.bracket.emCurso": "अब ही है",
    "esport.bracket.eliminado": "यहीं बाहर",
    "esport.bracket.campeao": "चैंपियन",
    "esport.bracket.pendente": "इंतज़ार में",
    "esport.bracket.nota": "यह रास्ता आपका है: कट आपकी असली स्थिति है हर रेस में — ग्रिड के AI प्रतिद्वंद्वी राउंड दर राउंड बाहर नहीं होते।",
    "perfil.trofeus.titulo": "ट्रॉफ़ी कैबिनेट",
    "perfil.trofeus.chip.trofeus": "ट्रॉफ़ी",
    "perfil.trofeus.chip.podios": "पोडियम (2nd/3rd)",
    "perfil.trofeus.chip.competicoes": "प्रतियोगिताएँ",
    "perfil.trofeus.campeao": "चैंपियन",
    "perfil.trofeus.premio": "{n} बतेउ अंक",
    "perfil.trofeus.vazio.titulo": "अभी कोई ट्रॉफ़ी नहीं",
    "perfil.trofeus.vazio.sub": "यहाँ केवल असली जीत आती है: कोई टूर्नामेंट या लीग पहली रैंक पर बंद करें।",
    "perfil.trofeus.vazio.cta": "टूर्नामेंट और लीग देखें",
    "perfil.trofeus.nota": "ट्रॉफ़ी इस डिवाइस पर रहते हैं — जैसे बतेउ का सारा ई-स्पोर्ट।",
'''

BLOCOS = [
    ("  en: {", EN),
    ("  pt: {", PT),
    ('  "pt-BR": {', PTBR),
    ("  es: {", ES),
    ("  fr: {", FR),
    ("  hi: {", HI),
]

with io.open(CTX, "r", encoding="utf-8") as f:
    conteudo = f.read()

total = 0
for marcador, bloco in BLOCOS:
    idx = conteudo.find(marcador)
    assert idx >= 0, f"marcador não encontrado: {marcador}"
    ponto = idx + len(marcador)
    conteudo = conteudo[:ponto] + bloco + conteudo[ponto:]
    total += bloco.count('": "')

with io.open(CTX, "w", encoding="utf-8") as f:
    f.write(conteudo)

print(f"OK — {total} linhas de tradução inseridas ×6 dicionários")
