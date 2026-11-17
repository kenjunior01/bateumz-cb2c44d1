#!/usr/bin/env python3
# v57 — insere as chaves i18n do NPC IA NA PRAÇA ("Bateu IA na Cidade") nos
# 6 idiomas do LanguageContext. Padrão dos add-ia-i18n-v54/v55/v56.py:
# inserção imediata a seguir à abertura de cada dicionário, 4 espaços.
import json, sys

CAMINHO = "src/contexts/LanguageContext.tsx"

def K(**kw):  # mantém a ordem de inserção
    return list(kw.items())

PT = K(
    **{"cidade.npc.nome": "Bateu IA", "cidade.npc.cargo": "IA da plataforma · Nemotron"},
    **{"cidade.npc.falar": "Falar com a Bateu IA", "cidade.npc.ola": "Olá! Sou a Bateu IA e vivo nesta praça, à sombra do imbondeiro. Pergunta-me o que quiseres sobre a plataforma ou a cidade — respondo curtinho, estamos num jogo."},
    **{"cidade.npc.vazia": "Pergunta algo à Bateu IA — ela vive nesta praça!", "cidade.npc.pergunta": "Pergunta algo…"},
    **{"cidade.npc.enviar": "Enviar", "cidade.npc.parar": "Parar", "cidade.npc.pensamento": "Pensamento", "cidade.npc.limpar": "Limpar conversa"},
    **{"cidade.npc.parado": "Parado por ti — o resto da resposta não chegou.", "cidade.npc.erro": "A Bateu IA não respondeu", "cidade.npc.rate": "Muitas perguntas seguidas — espera um instante"},
    **{"cidade.npc.tokens": "tokens"},
    **{"cidade.npc.sug1": "O que é a plataforma Bateu?", "cidade.npc.sug2": "O que posso fazer nesta cidade?", "cidade.npc.sug3": "Como participo num sorteio com segurança?", "cidade.npc.sug4": "Dá-me uma dica para explorar a cidade"},
    **{"cidade.npc.nota": "IA real (Nemotron, NVIDIA) pelo proxy/edge da plataforma — a chave nunca vem para o browser. Respostas curtas para o HUD; a Bateu IA nunca inventa resultados de sorteios nem factos da cidade que não estejam medidos."},
)

EN = K(
    **{"cidade.npc.nome": "Bateu IA", "cidade.npc.cargo": "Platform AI · Nemotron"},
    **{"cidade.npc.falar": "Talk to Bateu IA", "cidade.npc.ola": "Hi! I'm Bateu IA and I live on this square, in the shade of the baobab. Ask me anything about the platform or the city — I answer briefly, we're in a game."},
    **{"cidade.npc.vazia": "Ask Bateu IA something — she lives on this square!", "cidade.npc.pergunta": "Ask something…"},
    **{"cidade.npc.enviar": "Send", "cidade.npc.parar": "Stop", "cidade.npc.pensamento": "Thinking", "cidade.npc.limpar": "Clear chat"},
    **{"cidade.npc.parado": "Stopped by you — the rest of the answer never arrived.", "cidade.npc.erro": "Bateu IA did not answer", "cidade.npc.rate": "Too many questions in a row — wait a moment"},
    **{"cidade.npc.tokens": "tokens"},
    **{"cidade.npc.sug1": "What is the Bateu platform?", "cidade.npc.sug2": "What can I do in this city?", "cidade.npc.sug3": "How do I join a raffle safely?", "cidade.npc.sug4": "Give me a tip to explore the city"},
    **{"cidade.npc.nota": "Real AI (Nemotron, NVIDIA) via the platform's proxy/edge — the key never reaches the browser. Short answers for the game HUD; Bateu IA never invents raffle results or city facts that aren't measured."},
)

PTBR = K(
    **{"cidade.npc.nome": "Bateu IA", "cidade.npc.cargo": "IA da plataforma · Nemotron"},
    **{"cidade.npc.falar": "Falar com a Bateu IA", "cidade.npc.ola": "Olá! Sou a Bateu IA e moro nesta praça, à sombra do imbondeiro. Me pergunte o que quiser sobre a plataforma ou a cidade — respondo curtinho, estamos num jogo."},
    **{"cidade.npc.vazia": "Pergunte algo à Bateu IA — ela mora nesta praça!", "cidade.npc.pergunta": "Pergunte algo…"},
    **{"cidade.npc.enviar": "Enviar", "cidade.npc.parar": "Parar", "cidade.npc.pensamento": "Pensamento", "cidade.npc.limpar": "Limpar conversa"},
    **{"cidade.npc.parado": "Parado por você — o resto da resposta não chegou.", "cidade.npc.erro": "A Bateu IA não respondeu", "cidade.npc.rate": "Muitas perguntas seguidas — espere um instante"},
    **{"cidade.npc.tokens": "tokens"},
    **{"cidade.npc.sug1": "O que é a plataforma Bateu?", "cidade.npc.sug2": "O que posso fazer nesta cidade?", "cidade.npc.sug3": "Como participo de um sorteio com segurança?", "cidade.npc.sug4": "Me dê uma dica para explorar a cidade"},
    **{"cidade.npc.nota": "IA real (Nemotron, NVIDIA) pelo proxy/edge da plataforma — a chave nunca vai para o browser. Respostas curtas para o HUD; a Bateu IA nunca inventa resultados de sorteios nem fatos da cidade que não estejam medidos."},
)

ES = K(
    **{"cidade.npc.nome": "Bateu IA", "cidade.npc.cargo": "IA de la plataforma · Nemotron"},
    **{"cidade.npc.falar": "Hablar con Bateu IA", "cidade.npc.ola": "¡Hola! Soy la Bateu IA y vivo en esta plaza, a la sombra del baobab. Pregúntame lo que quieras sobre la plataforma o la ciudad — respondo corto, estamos en un juego."},
    **{"cidade.npc.vazia": "¡Pregúntale algo a la Bateu IA — vive en esta plaza!", "cidade.npc.pergunta": "Pregunta algo…"},
    **{"cidade.npc.enviar": "Enviar", "cidade.npc.parar": "Parar", "cidade.npc.pensamento": "Pensamiento", "cidade.npc.limpar": "Limpiar chat"},
    **{"cidade.npc.parado": "Detenido por ti — el resto de la respuesta no llegó.", "cidade.npc.erro": "La Bateu IA no respondió", "cidade.npc.rate": "Demasiadas preguntas seguidas — espera un instante"},
    **{"cidade.npc.tokens": "tokens"},
    **{"cidade.npc.sug1": "¿Qué es la plataforma Bateu?", "cidade.npc.sug2": "¿Qué puedo hacer en esta ciudad?", "cidade.npc.sug3": "¿Cómo participo en un sorteo con seguridad?", "cidade.npc.sug4": "Dame un consejo para explorar la ciudad"},
    **{"cidade.npc.nota": "IA real (Nemotron, NVIDIA) por el proxy/edge de la plataforma — la clave nunca llega al navegador. Respuestas cortas para el HUD; la Bateu IA nunca inventa resultados de sorteos ni hechos de la ciudad que no estén medidos."},
)

FR = K(
    **{"cidade.npc.nome": "Bateu IA", "cidade.npc.cargo": "IA de la plateforme · Nemotron"},
    **{"cidade.npc.falar": "Parler à Bateu IA", "cidade.npc.ola": "Salut ! Je suis Bateu IA et je vis sur cette place, à l'ombre du baobab. Demande-moi ce que tu veux sur la plateforme ou la ville — je réponds court, on est dans un jeu."},
    **{"cidade.npc.vazia": "Demande quelque chose à Bateu IA — elle vit sur cette place !", "cidade.npc.pergunta": "Pose une question…"},
    **{"cidade.npc.enviar": "Envoyer", "cidade.npc.parar": "Arrêter", "cidade.npc.pensamento": "Réflexion", "cidade.npc.limpar": "Effacer la conversation"},
    **{"cidade.npc.parado": "Arrêté par toi — le reste de la réponse n'est pas arrivé.", "cidade.npc.erro": "Bateu IA n'a pas répondu", "cidade.npc.rate": "Trop de questions d'affilée — attends un instant"},
    **{"cidade.npc.tokens": "tokens"},
    **{"cidade.npc.sug1": "C'est quoi la plateforme Bateu ?", "cidade.npc.sug2": "Que puis-je faire dans cette ville ?", "cidade.npc.sug3": "Comment participer à un tirage en sécurité ?", "cidade.npc.sug4": "Donne-moi un conseil pour explorer la ville"},
    **{"cidade.npc.nota": "IA réelle (Nemotron, NVIDIA) via le proxy/edge de la plateforme — la clé n'atteint jamais le navigateur. Réponses courtes pour le HUD ; Bateu IA n'invente jamais de résultats de tirages ni de faits de la ville non mesurés."},
)

HI = K(
    **{"cidade.npc.nome": "बटू AI", "cidade.npc.cargo": "प्लेटफ़ॉर्म AI · Nemotron"},
    **{"cidade.npc.falar": "बटू AI से बात करें", "cidade.npc.ola": "नमस्ते! मैं बटू AI हूँ और इसी चौक पर बाओबाब की छाया में रहती हूँ। प्लेटफ़ॉर्म या शहर के बारे में कुछ भी पूछो — मैं छोटा जवाब देती हूँ, हम गेम में हैं।"},
    **{"cidade.npc.vazia": "बटू AI से कुछ पूछो — वह इसी चौक पर रहती है!", "cidade.npc.pergunta": "कुछ पूछें…"},
    **{"cidade.npc.enviar": "भेजें", "cidade.npc.parar": "रोकें", "cidade.npc.pensamento": "सोच", "cidade.npc.limpar": "चैट साफ़ करें"},
    **{"cidade.npc.parado": "आपने रोका — जवाब का बाकी हिस्सा नहीं आया।", "cidade.npc.erro": "बटू AI ने जवाब नहीं दिया", "cidade.npc.rate": "लगातार बहुत सवाल — एक पल रुकें"},
    **{"cidade.npc.tokens": "टोकन"},
    **{"cidade.npc.sug1": "बटू प्लेटफ़ॉर्म क्या है?", "cidade.npc.sug2": "मैं इस शहर में क्या कर सकता हूँ?", "cidade.npc.sug3": "सॉर्टी में सुरक्षित रूप से कैसे भाग लूँ?", "cidade.npc.sug4": "शहर घूमने के लिए एक सुझाव दो"},
    **{"cidade.npc.nota": "असली AI (Nemotron, NVIDIA) प्लेटफ़ॉर्म के proxy/edge से — की कभी ब्राउज़र तक नहीं आती। गेम HUD के लिए छोटे जवाब; बटू AI कभी सॉर्टी के नतीजे या बिना मापे शहर के तथ्य नहीं बनाती।"},
)

BLOCOS = [("en", EN), ("pt", PT), ("pt-BR", PTBR), ("es", ES), ("fr", FR), ("hi", HI)]

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
    bloco = "".join(f'    {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)},\n' for k, v in pares)
    linhas.insert(idx + 1, bloco)
    total += len(pares)
    print(f"  {chave_dict}: +{len(pares)} chaves")

with open(CAMINHO, "w", encoding="utf-8") as f:
    f.writelines(linhas)

print(f"TOTAL: {total} chaves inseridas")
