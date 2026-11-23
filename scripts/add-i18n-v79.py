#!/usr/bin/env python3
# v79 — TODAS as chaves novas do dicionário, inseridas nos 6 idiomas:
#   tab.games/tab.sort · nav79.* · home79.* (âncora: linha "desporto.real")
#   ia.persona.{jogos,suporte}.* · ia.v79.* (âncora: "ia.persona.assistente.desc")
#   + renome do modo principal para «Ajuda Bateu» + ia.subtitle sem modelo técnico
PATH = "src/contexts/LanguageContext.tsx"

NAV = [
    # (en, pt, pt-BR, es, fr, hi)
    ("tab.games", ["Games", "Jogos", "Jogos", "Juegos", "Jeux", "गेम्स"]),
    ("tab.sport", ["Sports", "Desporto", "Esportes", "Deportes", "Sport", "खेल"]),
]
NAV79 = {
    "nav79.jogos": ["Games", "Jogos", "Jogos", "Juegos", "Jeux", "गेम्स"],
    "nav79.live": ["Live", "Ao vivo", "Ao Vivo", "En vivo", "En direct", "लाइव"],
    "nav79.desporto": ["Sports", "Desporto", "Esportes", "Deportes", "Sport", "खेल"],
    "nav79.mercado": ["Bateu Market", "Mercado Bateu", "Mercado Bateu", "Mercado Bateu", "Marché Bateu", "बातेउ बाज़ार"],
    "nav79.mais": ["More", "Mais", "Mais", "Más", "Plus", "और"],
    "nav79.historico": ["History", "Histórico", "Histórico", "Historial", "Historique", "इतिहास"],
    "nav79.protecao": ["Player protection", "Protecção do jogador", "Proteção do jogador", "Protección del jugador", "Protection du joueur", "खिलाड़ी सुरक्षा"],
    "nav79.privacidade": ["Privacy", "Privacidade", "Privacidade", "Privacidad", "Confidentialité", "गोपनीयता"],
    "nav79.negocios": ["Business", "Negócios", "Negócios", "Negocios", "Business", "व्यापार"],
    "nav79.leiloes": ["Auctions & goods", "Leilões e bens", "Leilões e bens", "Subastas y bienes", "Enchères et biens", "नीलामी और सामान"],
    "nav79.prestacoes": ["Installments", "Prestações", "Prestações", "Cuotas", "Paiements échelonnés", "किस्तें"],
}
HOME79 = {
    "home79.frase": ["Play, follow and participate with transparency.", "Joga, acompanha e participa com transparência.", "Jogue, acompanhe e participe com transparência.", "Juega, sigue y participa con transparencia.", "Jouez, suivez et participez en toute transparence.", "पारदर्शिता के साथ खेलें, देखें और भाग लें।"],
    "home79.sub": ["Free games, live raffles and real sports — all in one place.", "Jogos grátis, sorteios ao vivo e desporto real — tudo num só lugar.", "Jogos grátis, sorteios ao vivo e esportes reais — tudo em um só lugar.", "Juegos gratis, rifas en vivo y deporte real — todo en un solo lugar.", "Jeux gratuits, tirages en direct et sport réel — tout au même endroit.", "मुफ़्त गेम, लाइव लॉटरी और असली खेल — सब एक जगह।"],
    "home79.ctaJogos": ["Explore games", "Explorar jogos", "Explorar jogos", "Explorar juegos", "Explorer les jeux", "गेम्स देखें"],
    "home79.ctaLive": ["Watch live", "Ver ao vivo", "Ver ao vivo", "Ver en vivo", "Voir en direct", "लाइव देखें"],
    "home79.garantia": ["Verifiable results · 18+ · Responsible gaming", "Resultados verificáveis · +18 · Jogo responsável", "Resultados verificáveis · +18 · Jogo responsável", "Resultados verificables · +18 · Juego responsable", "Résultats vérifiables · 18+ · Jeu responsable", "प्रमाणित परिणाम · 18+ · ज़िम्मेदार गेमिंग"],
    "home79.descoberta.label": ["Discovery", "Descoberta", "Descoberta", "Descubrimiento", "Découverte", "खोज"],
    "home79.jogosCard.titulo": ["Popular games", "Jogos populares", "Jogos populares", "Juegos populares", "Jeux populaires", "लोकप्रिय गेम"],
    "home79.jogosCard.estado": ["Free · no sign-up", "Grátis · sem registo", "Grátis · sem cadastro", "Gratis · sin registro", "Gratuit · sans inscription", "मुफ़्त · पंजीकरण नहीं"],
    "home79.jogosCard.info": ["BATEU KART + {n} games — points, missions and tournaments", "BATEU KART + {n} jogos — pontos, missões e torneios", "BATEU KART + {n} jogos — pontos, missões e torneios", "BATEU KART + {n} juegos — puntos, misiones y torneos", "BATEU KART + {n} jeux — points, missions et tournois", "BATEU KART + {n} गेम — पॉइंट, मिशन और टूर्नामेंट"],
    "home79.jogosCard.botao": ["Play now", "Jogar agora", "Jogar agora", "Jugar ahora", "Jouer maintenant", "अभी खेलें"],
    "home79.livesCard.titulo": ["Upcoming lives", "Lives próximas", "Lives próximas", "Próximas lives", "Prochains directs", "आने वाली लाइव्स"],
    "home79.livesCard.estado.erro": ["Streams temporarily unavailable", "Transmissões temporariamente indisponíveis", "Transmissões temporariamente indisponíveis", "Transmisiones temporalmente no disponibles", "Streams temporairement indisponibles", "स्ट्रीम अस्थायी रूप से उपलब्ध नहीं"],
    "home79.livesCard.estado.agora": ["{n} live now", "{n} ao vivo agora", "{n} ao vivo agora", "{n} en vivo ahora", "{n} en direct maintenant", "{n} लाइव अभी"],
    "home79.livesCard.estado.vazia": ["No streams right now", "Sem transmissões neste momento", "Sem transmissões neste momento", "Sin transmisiones en este momento", "Aucun stream pour le moment", "अभी कोई स्ट्रीम नहीं"],
    "home79.livesCard.info": ["Raffles and matches with live commentary", "Sorteios e partidas comentadas em directo", "Sorteios e partidas comentadas ao vivo", "Rifas y partidas comentadas en directo", "Tirages et matchs commentés en direct", "लॉटरी और मैच लाइव कमेंट्री के साथ"],
    "home79.livesCard.botao": ["Watch live", "Ver ao vivo", "Ver ao vivo", "Ver en vivo", "Voir en direct", "लाइव देखें"],
    "home79.desportoCard.titulo": ["Sports highlights", "Desporto em destaque", "Esportes em destaque", "Deportes destacados", "Sport à la une", "मुख्य खेल"],
    "home79.desportoCard.estado": ["Real results and standings", "Resultados e classificação reais", "Resultados e classificação reais", "Resultados y clasificación reales", "Résultats et classements réels", "असली परिणाम और रैंकिंग"],
    "home79.desportoCard.info": ["Top-league fixtures + player-to-player predictions", "Jornadas das grandes ligas + palpites entre jogadores", "Rodadas das grandes ligas + palpites entre jogadores", "Jornadas de las grandes ligas + pronósticos entre jugadores", "Journées des grandes ligues + pronostics entre joueurs", "बड़ी लीग के मैच + खिलाड़ियों के बीच भविष्यवाणियाँ"],
    "home79.desportoCard.botao": ["Follow", "Acompanhar", "Acompanhar", "Seguir", "Suivre", "देखें"],
    "home79.kart.destaque": ["Featured in Games", "Destaque em Jogos", "Destaque em Jogos", "Destacado en Juegos", "À la une dans Jeux", "गेम्स में विशेष"],
    "home79.kart.info": ["Free, no sign-up — shared online races. Up to {pontos} points per race", "Grátis, sem registo — corridas online partilhadas. Até {pontos} pontos por corrida", "Grátis, sem cadastro — corridas online compartilhadas. Até {pontos} pontos por corrida", "Gratis, sin registro — carreras online compartidas. Hasta {puntos} puntos por carrera", "Gratuit, sans inscription — courses en ligne partagées. Jusqu'à {pontos} points par course", "मुफ़्त, पंजीकरण नहीं — साझा ऑनलाइन रेस। प्रति रेस {pontos} पॉइंट तक"],
    "home79.atividade.titulo": ["Real activity", "Actividade real", "Atividade real", "Actividad real", "Activité réelle", "वास्तविक गतिविधि"],
    "home79.atividade.sub": ["Real platform data — if there is none, we say so.", "Dados reais da plataforma — se não houver, dizemos.", "Dados reais da plataforma — se não houver, dizemos.", "Datos reales de la plataforma — si no hay, lo decimos.", "Données réelles de la plateforme — s'il n'y en a pas, on le dit.", "प्लेटफ़ॉर्म का वास्तविक डेटा — न होने पर हम कहते हैं।"],
    "home79.atividade.proximaLive": ["Next live", "Próxima live", "Próxima live", "Próxima live", "Prochain direct", "अगली लाइव"],
    "home79.atividade.proximaLive.agora": ["{n} streams happening now", "{n} transmissões a decorrer agora", "{n} transmissões acontecendo agora", "{n} transmisiones en curso", "{n} streams en cours", "{n} स्ट्रीम चल रही हैं"],
    "home79.atividade.proximaLive.vazia": ["The next stream will be announced here", "A próxima transmissão será anunciada aqui", "A próxima transmissão será anunciada aqui", "La próxima transmisión se anunciará aquí", "Le prochain stream sera annoncé ici", "अगली स्ट्रीम यहाँ घोषित होगी"],
    "home79.atividade.aCarregar": ["Loading…", "A carregar…", "Carregando…", "Cargando…", "Chargement…", "लोड हो रहा है…"],
    "home79.atividade.vencedor": ["Last verified winner", "Último vencedor verificado", "Último vencedor verificado", "Último ganador verificado", "Dernier gagnant vérifié", "अंतिम सत्यापित विजेता"],
    "home79.atividade.vencedor.vazia": ["No verified winners yet", "Ainda sem vencedores verificados", "Ainda sem vencedores verificados", "Aún sin ganadores verificados", "Pas encore de gagnants vérifiés", "अभी कोई सत्यापित विजेता नहीं"],
    "home79.atividade.verVencedores": ["See winners", "Ver vencedores", "Ver vencedores", "Ver ganadores", "Voir les gagnants", "विजेता देखें"],
    "home79.atividade.jogoTop": ["Featured of the week", "Destaque da semana", "Destaque da semana", "Destacado de la semana", "À la une cette semaine", "सप्ताह का विशेष"],
    "home79.atividade.jogoTop.valor": ["BATEU KART — up to {pontos} points per race", "BATEU KART — até {pontos} pontos por corrida", "BATEU KART — até {pontos} pontos por corrida", "BATEU KART — hasta {puntos} puntos por carrera", "BATEU KART — jusqu'à {pontos} points par course", "BATEU KART — प्रति रेस {pontos} पॉइंट तक"],
    "home79.atividade.partida": ["Featured match", "Partida em destaque", "Partida em destaque", "Partida destacada", "Match à la une", "विशेष मैच"],
    "home79.atividade.partida.vazia": ["No featured match now — see real fixtures", "Sem partida em destaque agora — vê as jornadas reais", "Sem partida em destaque agora — veja as rodadas reais", "Sin partida destacada ahora — ve las jornadas reales", "Aucun match à la une — voyez les journées réelles", "अभी कोई विशेष मैच नहीं — असली मैच देखें"],
    "home79.atividade.verDesporto": ["See sports", "Ver desporto", "Ver esportes", "Ver deportes", "Voir le sport", "खेल देखें"],
    "home79.conf.label": ["Trust", "Confiança", "Confiança", "Confianza", "Confiance", "भरोसा"],
    "home79.conf.como": ["How it works", "Como funciona", "Como funciona", "Cómo funciona", "Comment ça marche", "कैसे काम करता है"],
    "home79.conf.verificavel": ["Verifiable results", "Resultados verificáveis", "Resultados verificáveis", "Resultados verificables", "Résultats vérifiables", "प्रमाणित परिणाम"],
    "home79.conf.responsavel": ["Responsible gaming", "Jogo responsável", "Jogo responsável", "Juego responsable", "Jeu responsable", "ज़िम्मेदार गेमिंग"],
    "home79.conf.suporte": ["Support", "Suporte", "Suporte", "Soporte", "Support", "सहायता"],
}
IA = {
    "ia.persona.jogos.nome": ["Games", "Jogos", "Jogos", "Juegos", "Jeux", "गेम्स"],
    "ia.persona.jogos.desc": ["How to play, points, daily missions, levels and prizes.", "Como jogar, pontos, missões diárias, níveis e prémios.", "Como jogar, pontos, missões diárias, níveis e prêmios.", "Cómo jugar, puntos, misiones diarias, niveles y premios.", "Comment jouer, points, missions quotidiennes, niveaux et prix.", "कैसे खेलें, पॉइंट, दैनिक मिशन, स्तर और पुरस्कार।"],
    "ia.persona.jogos.s1": ["How do I earn points in BATEU KART?", "Como ganho pontos no BATEU KART?", "Como ganho pontos no BATEU KART?", "¿Cómo gano puntos en BATEU KART?", "Comment gagner des points au BATEU KART ?", "BATEU KART में पॉइंट कैसे कमाएँ?"],
    "ia.persona.jogos.s2": ["How do daily missions work?", "Como funcionam as missões diárias?", "Como funcionam as missões diárias?", "¿Cómo funcionan las misiones diarias?", "Comment fonctionnent les missions quotidiennes ?", "दैनिक मिशन कैसे काम करते हैं?"],
    "ia.persona.jogos.s3": ["Which games can I play without registering?", "Que jogos posso jogar sem registo?", "Quais jogos posso jogar sem cadastro?", "¿Qué juegos puedo jugar sin registrarme?", "Quels jeux puis-je jouer sans inscription ?", "पंजीकरण के बिना कौन से गेम खेल सकते हैं?"],
    "ia.persona.suporte.nome": ["Support", "Suporte", "Suporte", "Soporte", "Support", "सहायता"],
    "ia.persona.suporte.desc": ["Wallet, withdrawals, tickets and limits — solved with you.", "Carteira, levantamentos, bilhetes e limites — resolvo contigo.", "Carteira, saques, bilhetes e limites — resolvo com você.", "Cartera, retiros, boletos y límites — resueltos contigo.", "Portefeuille, retraits, billets et limites — résolus avec vous.", "वॉलेट, निकासी, टिकट और सीमाएँ — आपके साथ समाधान।"],
    "ia.persona.suporte.s1": ["How do I withdraw my prize?", "Como levanto o meu prémio?", "Como saco o meu prêmio?", "¿Cómo retiro mi premio?", "Comment retirer mon prix ?", "मैं अपना पुरस्कार कैसे निकालूँ?"],
    "ia.persona.suporte.s2": ["How does the wallet work?", "Como funciona a carteira?", "Como funciona a carteira?", "¿Cómo funciona la cartera?", "Comment fonctionne le portefeuille ?", "वॉलेट कैसे काम करता है?"],
    "ia.persona.suporte.s3": ["How do I activate a pause?", "Como activo uma pausa?", "Como ativo uma pausa?", "¿Cómo activo una pausa?", "Comment activer une pause ?", "पॉज़ कैसे चालू करें?"],
    "ia.v79.modo": ["Current mode", "Modo actual", "Modo atual", "Modo actual", "Mode actuel", "वर्तमान मोड"],
    "ia.v79.modo.desc": ["Bateu AI is the platform's assistant: it answers about the Bateu, not about everything. No technical settings are needed to use it.", "A Bateu IA é a assistente da plataforma: responde sobre a Bateu, não sobre tudo. Não precisas de configurações técnicas para usar.", "A Bateu IA é a assistente da plataforma: responde sobre a Bateu, não sobre tudo. Não precisa de configurações técnicas para usar.", "La IA de Bateu es la asistente de la plataforma: responde sobre la Bateu, no sobre todo. No necesitas ajustes técnicos para usarla.", "L'IA de Bateu est l'assistante de la plateforme : elle répond sur la Bateu, pas sur tout. Aucun réglage technique n'est nécessaire.", "Bateu AI प्लेटफ़ॉर्म की सहायक है: यह Bateu के बारे में जवाब देती है, सब कुछ नहीं। इस्तेमाल के लिए तकनीकी सेटिंग की ज़रूरत नहीं।"],
    "ia.v79.rodape": ["The AI never decides results, prizes or rewards — the rules decide. The AI only helps, explains and marks suspicious behaviour.", "A IA nunca decide resultados, prémios ou recompensas — as regras decidem. A IA apenas ajuda, explica e marca comportamento suspeito.", "A IA nunca decide resultados, prêmios ou recompensas — as regras decidem. A IA apenas ajuda, explica e marca comportamento suspeito.", "La IA nunca decide resultados, premios ni recompensas — las reglas deciden. La IA solo ayuda, explica y marca comportamiento sospechoso.", "L'IA ne décide jamais des résultats, des prix ou des récompenses — les règles décident. L'IA aide, explique et signale les comportements suspects.", "AI कभी भी परिणाम, पुरस्कार या इनाम नहीं तय करती — नियम तय करते हैं। AI केवल मदद करती है और संदिग्ध व्यवहार पर निशान लगाती है।"],
}
NOME_NOVO = ["Bateu Help", "Ajuda Bateu", "Ajuda Bateu", "Ayuda Bateu", "Aide Bateu", "बातेउ सहायता"]
SUBS = [
    ('"ia.subtitle": "NVIDIA nemotron-3-ultra-550b-a55b · real streaming · visible thinking"',
     '"ia.subtitle": "The Bateu assistant · real-time answers"'),
    ('"ia.subtitle": "NVIDIA nemotron-3-ultra-550b-a55b · streaming real · pensamento visível"',
     '"ia.subtitle": "A assistente da Bateu · respostas em directo"'),
    ('"ia.subtitle": "NVIDIA nemotron-3-ultra-550b-a55b · streaming real · pensamiento visible"',
     '"ia.subtitle": "La asistente de Bateu · respuestas en directo"'),
    ('"ia.subtitle": "NVIDIA nemotron-3-ultra-550b-a55b · streaming réel · pensée visible"',
     "\"ia.subtitle\": \"L'assistante de Bateu · réponses en direct\""),
    ('"ia.subtitle": "NVIDIA nemotron-3-ultra-550b-a55b · रीयल स्ट्रीमिंग · दिखने वाली सोच"',
     '"ia.subtitle": "बातेउ सहायक · तुरंत उत्तर"'),
]

with open(PATH, encoding="utf-8") as f:
    lines = f.read().split("\n")

anchors_d = [i for i, l in enumerate(lines) if '"desporto.real":' in l]
anchors_ia = [i for i, l in enumerate(lines) if '"ia.persona.assistente.desc"' in l]
assert len(anchors_d) == 6, anchors_d
assert len(anchors_ia) == 6, anchors_ia

def inserir(line_no, pares):
    """Insere as linhas a seguir a line_no (pares já na língua certa)."""
    global lines
    bloco = []
    for k, v in pares:
        vv = v.replace('"', '\\"')
        bloco.append(f'    "{k}": "{vv}",')
    lines[line_no] = lines[line_no] + "\n" + "\n".join(bloco)

def montar(dicionario, idx):
    return [(k, vals[idx]) for k, vals in dicionario.items()]

# por idioma: todas as inserções + renome + subtitle
inserted = 0
for idx in range(6):
    a_d = anchors_d[idx]
    a_i = anchors_ia[idx]
    inserir(a_d, [("tab.games", NAV[0][1][idx]), ("tab.sport", NAV[1][1][idx])] + montar(NAV79, idx) + montar(HOME79, idx))
    inserir(a_i, montar(IA, idx))
    # renome do modo principal (linha do .nome antes da âncora ia)
    for j in range(a_i, max(0, a_i - 6), -1):
        if '"ia.persona.assistente.nome"' in lines[j]:
            lines[j] = lines[j].split(":")[0] + f': "{NOME_NOVO[idx]}",'
            break
    inserted += 1

src = "\n".join(lines)
for old, new in SUBS:
    if old in src:
        src = src.replace(old, new)
with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

final = src
ok = all(final.count(f'"{k}"') == 6 for k in ["tab.games", "nav79.mais", "home79.frase", "ia.v79.modo", "ia.persona.jogos.nome", "ia.persona.suporte.nome"])
print("idiomas:", inserted, "| 6×cada:", ok, "| modelo fora:", "NVIDIA nemotron" not in final,
      "| ajuda-bateu:", final.count('": "Ajuda Bateu"'))
