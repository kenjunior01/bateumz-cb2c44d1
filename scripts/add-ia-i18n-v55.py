#!/usr/bin/env python3
# v55 — insere as chaves i18n das abas VER (visão) e BUSCAR (vetores) da
# BATEU IA nos 6 idiomas do LanguageContext. Padrão do add-ia-i18n-v54.py:
# inserção imediata a seguir à abertura de cada dicionário, indentação de
# 4 espaços, valores com JSON escaping.
import json, sys

CAMINHO = "src/contexts/LanguageContext.tsx"

def K(**kw):  # mantém a ordem de inserção
    return list(kw.items())

PT = K(
    **{"ia.tab.conversar": "Conversar", "ia.tab.ver": "Ver", "ia.tab.buscar": "Buscar"},
    **{"ia.ver.titulo": "IA que VÊ", "ia.ver.desc": "Envia uma imagem (URL ou ficheiro) e pergunta o que queres saber — o modelo omni analisa com orçamento de raciocínio real."},
    **{"ia.ver.pergunta": "Pergunta", "ia.ver.pergunta.placeholder": "O que há nesta imagem? Descreve os detalhes…"},
    **{"ia.ver.imagem": "Imagem", "ia.ver.imagem.ficheiro": "Ficheiro", "ia.ver.imagem.limpar": "Limpar imagem", "ia.ver.imagem.invalida": "Imagem inválida", "ia.ver.imagem.info": "Imagem"},
    **{"ia.ver.analisar": "Analisar imagem", "ia.ver.orcamento": "Orçamento de raciocínio", "ia.ver.orcamento.desc": "reasoning_budget — quantos tokens o modelo pode gastar a pensar antes de responder. 0 = omitido do pedido."},
    **{"ia.ver.vazio": "Escolhe uma imagem, faz a tua pergunta e a análise chega ao vivo — com o pensamento visível."},
    **{"ia.buscar.titulo": "Memória semântica", "ia.buscar.desc": "Indexa textos (e imagens por URL) como vetores multimodais e procura por SIGNIFICADO, não por palavras — pontuação cosseno real."},
    **{"ia.buscar.dim": "dimensão", "ia.buscar.itens": "itens", "ia.buscar.rotulo": "Etiqueta (ex.: Prémio do sorteio)", "ia.buscar.texto": "Texto a indexar", "ia.buscar.imagem": "Imagem https://… (opcional — é descarregada e base64ada como no snippet)"},
    **{"ia.buscar.imagem.nota": "As imagens https são descarregadas e convertidas em data URL base64 antes do envio — exatamente o caminho do snippet oficial."},
    **{"ia.buscar.indexar": "Indexar", "ia.buscar.a.indexar": "A indexar…", "ia.buscar.indexado": "Item indexado — vetor guardado"},
    **{"ia.buscar.query": "Procurar por significado", "ia.buscar.query.placeholder": "ex.: prémio para amantes de futebol"},
    **{"ia.buscar.sem.resultados": "Sem resultados — indexa itens primeiro.", "ia.buscar.sem.itens": "A loja está vazia — indexa itens primeiro."},
    **{"ia.buscar.limpar": "Limpar memória", "ia.buscar.quota": "Memória guardada em modo temporário — o limite do navegador chegou"},
    **{"ia.buscar.similaridade": "Similaridade entre dois textos", "ia.buscar.sim.a": "Primeiro texto", "ia.buscar.sim.b": "Segundo texto", "ia.buscar.sim.calcular": "Calcular similaridade"},
)

EN = K(
    **{"ia.tab.conversar": "Chat", "ia.tab.ver": "See", "ia.tab.buscar": "Search"},
    **{"ia.ver.titulo": "AI that SEES", "ia.ver.desc": "Send an image (URL or file) and ask what you want to know — the omni model analyses with a real reasoning budget."},
    **{"ia.ver.pergunta": "Question", "ia.ver.pergunta.placeholder": "What is in this image? Describe the details…"},
    **{"ia.ver.imagem": "Image", "ia.ver.imagem.ficheiro": "File", "ia.ver.imagem.limpar": "Clear image", "ia.ver.imagem.invalida": "Invalid image", "ia.ver.imagem.info": "Image"},
    **{"ia.ver.analisar": "Analyse image", "ia.ver.orcamento": "Reasoning budget", "ia.ver.orcamento.desc": "reasoning_budget — how many tokens the model may spend thinking before answering. 0 = omitted from the request."},
    **{"ia.ver.vazio": "Pick an image, ask your question and the analysis arrives live — with visible thinking."},
    **{"ia.buscar.titulo": "Semantic memory", "ia.buscar.desc": "Index texts (and images by URL) as multimodal vectors and search by MEANING, not words — real cosine score."},
    **{"ia.buscar.dim": "dimension", "ia.buscar.itens": "items", "ia.buscar.rotulo": "Label (e.g.: Raffle prize)", "ia.buscar.texto": "Text to index", "ia.buscar.imagem": "Image https://… (optional — downloaded and base64'd like the snippet)"},
    **{"ia.buscar.imagem.nota": "https images are downloaded and converted to a base64 data URL before sending — exactly the official snippet path."},
    **{"ia.buscar.indexar": "Index", "ia.buscar.a.indexar": "Indexing…", "ia.buscar.indexado": "Item indexed — vector stored"},
    **{"ia.buscar.query": "Search by meaning", "ia.buscar.query.placeholder": "e.g.: prize for football lovers"},
    **{"ia.buscar.sem.resultados": "No results — index items first.", "ia.buscar.sem.itens": "The store is empty — index items first."},
    **{"ia.buscar.limpar": "Clear memory", "ia.buscar.quota": "Memory kept in temporary mode — browser limit reached"},
    **{"ia.buscar.similaridade": "Similarity between two texts", "ia.buscar.sim.a": "First text", "ia.buscar.sim.b": "Second text", "ia.buscar.sim.calcular": "Compute similarity"},
)

PTBR = K(
    **{"ia.tab.conversar": "Conversar", "ia.tab.ver": "Ver", "ia.tab.buscar": "Buscar"},
    **{"ia.ver.titulo": "IA que VÊ", "ia.ver.desc": "Envie uma imagem (URL ou arquivo) e pergunte o que quer saber — o modelo omni analisa com orçamento de raciocínio real."},
    **{"ia.ver.pergunta": "Pergunta", "ia.ver.pergunta.placeholder": "O que há nesta imagem? Descreva os detalhes…"},
    **{"ia.ver.imagem": "Imagem", "ia.ver.imagem.ficheiro": "Arquivo", "ia.ver.imagem.limpar": "Limpar imagem", "ia.ver.imagem.invalida": "Imagem inválida", "ia.ver.imagem.info": "Imagem"},
    **{"ia.ver.analisar": "Analisar imagem", "ia.ver.orcamento": "Orçamento de raciocínio", "ia.ver.orcamento.desc": "reasoning_budget — quantos tokens o modelo pode gastar pensando antes de responder. 0 = omitido da requisição."},
    **{"ia.ver.vazio": "Escolha uma imagem, faça sua pergunta e a análise chega ao vivo — com o pensamento visível."},
    **{"ia.buscar.titulo": "Memória semântica", "ia.buscar.desc": "Indexe textos (e imagens por URL) como vetores multimodais e busque por SIGNIFICADO, não por palavras — pontuação cosseno real."},
    **{"ia.buscar.dim": "dimensão", "ia.buscar.itens": "itens", "ia.buscar.rotulo": "Etiqueta (ex.: Prêmio do sorteio)", "ia.buscar.texto": "Texto a indexar", "ia.buscar.imagem": "Imagem https://… (opcional — é baixada e base64ada como no snippet)"},
    **{"ia.buscar.imagem.nota": "Imagens https são baixadas e convertidas em data URL base64 antes do envio — exatamente o caminho do snippet oficial."},
    **{"ia.buscar.indexar": "Indexar", "ia.buscar.a.indexar": "Indexando…", "ia.buscar.indexado": "Item indexado — vetor guardado"},
    **{"ia.buscar.query": "Buscar por significado", "ia.buscar.query.placeholder": "ex.: prêmio para amantes de futebol"},
    **{"ia.buscar.sem.resultados": "Sem resultados — indexe itens primeiro.", "ia.buscar.sem.itens": "A loja está vazia — indexe itens primeiro."},
    **{"ia.buscar.limpar": "Limpar memória", "ia.buscar.quota": "Memória guardada em modo temporário — o limite do navegador chegou"},
    **{"ia.buscar.similaridade": "Similaridade entre dois textos", "ia.buscar.sim.a": "Primeiro texto", "ia.buscar.sim.b": "Segundo texto", "ia.buscar.sim.calcular": "Calcular similaridade"},
)

ES = K(
    **{"ia.tab.conversar": "Conversar", "ia.tab.ver": "Ver", "ia.tab.buscar": "Buscar"},
    **{"ia.ver.titulo": "IA que VE", "ia.ver.desc": "Envía una imagen (URL o archivo) y pregunta lo que quieres saber — el modelo omni analiza con presupuesto de razonamiento real."},
    **{"ia.ver.pergunta": "Pregunta", "ia.ver.pergunta.placeholder": "¿Qué hay en esta imagen? Describe los detalles…"},
    **{"ia.ver.imagem": "Imagen", "ia.ver.imagem.ficheiro": "Archivo", "ia.ver.imagem.limpar": "Limpiar imagen", "ia.ver.imagem.invalida": "Imagen inválida", "ia.ver.imagem.info": "Imagen"},
    **{"ia.ver.analisar": "Analizar imagen", "ia.ver.orcamento": "Presupuesto de razonamiento", "ia.ver.orcamento.desc": "reasoning_budget — cuántos tokens puede gastar el modelo pensando antes de responder. 0 = omitido de la petición."},
    **{"ia.ver.vazio": "Elige una imagen, haz tu pregunta y el análisis llega en vivo — con el pensamiento visible."},
    **{"ia.buscar.titulo": "Memoria semántica", "ia.buscar.desc": "Indexa textos (e imágenes por URL) como vectores multimodales y busca por SIGNIFICADO, no por palabras — puntuación coseno real."},
    **{"ia.buscar.dim": "dimensión", "ia.buscar.itens": "ítems", "ia.buscar.rotulo": "Etiqueta (ej.: Premio del sorteo)", "ia.buscar.texto": "Texto a indexar", "ia.buscar.imagem": "Imagen https://… (opcional — se descarga y se pasa a base64 como en el snippet)"},
    **{"ia.buscar.imagem.nota": "Las imágenes https se descargan y se convierten en data URL base64 antes de enviar — exactamente el camino del snippet oficial."},
    **{"ia.buscar.indexar": "Indexar", "ia.buscar.a.indexar": "Indexando…", "ia.buscar.indexado": "Ítem indexado — vector guardado"},
    **{"ia.buscar.query": "Buscar por significado", "ia.buscar.query.placeholder": "ej.: premio para amantes del fútbol"},
    **{"ia.buscar.sem.resultados": "Sin resultados — indexa ítems primero.", "ia.buscar.sem.itens": "La tienda está vacía — indexa ítems primero."},
    **{"ia.buscar.limpar": "Limpiar memoria", "ia.buscar.quota": "Memoria guardada en modo temporal — se alcanzó el límite del navegador"},
    **{"ia.buscar.similaridade": "Similitud entre dos textos", "ia.buscar.sim.a": "Primer texto", "ia.buscar.sim.b": "Segundo texto", "ia.buscar.sim.calcular": "Calcular similitud"},
)

FR = K(
    **{"ia.tab.conversar": "Discuter", "ia.tab.ver": "Voir", "ia.tab.buscar": "Chercher"},
    **{"ia.ver.titulo": "L'IA qui VOIT", "ia.ver.desc": "Envoyez une image (URL ou fichier) et posez votre question — le modèle omni analyse avec un vrai budget de raisonnement."},
    **{"ia.ver.pergunta": "Question", "ia.ver.pergunta.placeholder": "Qu'y a-t-il dans cette image ? Décris les détails…"},
    **{"ia.ver.imagem": "Image", "ia.ver.imagem.ficheiro": "Fichier", "ia.ver.imagem.limpar": "Effacer l'image", "ia.ver.imagem.invalida": "Image invalide", "ia.ver.imagem.info": "Image"},
    **{"ia.ver.analisar": "Analyser l'image", "ia.ver.orcamento": "Budget de raisonnement", "ia.ver.orcamento.desc": "reasoning_budget — combien de tokens le modèle peut dépenser pour réfléchir avant de répondre. 0 = omis de la requête."},
    **{"ia.ver.vazio": "Choisissez une image, posez votre question et l'analyse arrive en direct — avec la pensée visible."},
    **{"ia.buscar.titulo": "Mémoire sémantique", "ia.buscar.desc": "Indexez des textes (et des images par URL) comme vecteurs multimodaux et cherchez par SENS, pas par mots — score cosinus réel."},
    **{"ia.buscar.dim": "dimension", "ia.buscar.itens": "éléments", "ia.buscar.rotulo": "Étiquette (ex. : Prix du tirage)", "ia.buscar.texto": "Texte à indexer", "ia.buscar.imagem": "Image https://… (optionnelle — téléchargée et passée en base64 comme dans le snippet)"},
    **{"ia.buscar.imagem.nota": "Les images https sont téléchargées et converties en data URL base64 avant l'envoi — exactement le chemin du snippet officiel."},
    **{"ia.buscar.indexar": "Indexer", "ia.buscar.a.indexar": "Indexation…", "ia.buscar.indexado": "Élément indexé — vecteur enregistré"},
    **{"ia.buscar.query": "Chercher par sens", "ia.buscar.query.placeholder": "ex. : prix pour les amoureux du foot"},
    **{"ia.buscar.sem.resultados": "Aucun résultat — indexez d'abord des éléments.", "ia.buscar.sem.itens": "La mémoire est vide — indexez d'abord des éléments."},
    **{"ia.buscar.limpar": "Effacer la mémoire", "ia.buscar.quota": "Mémoire gardée en mode temporaire — limite du navigateur atteinte"},
    **{"ia.buscar.similaridade": "Similarité entre deux textes", "ia.buscar.sim.a": "Premier texte", "ia.buscar.sim.b": "Second texte", "ia.buscar.sim.calcular": "Calculer la similarité"},
)

HI = K(
    **{"ia.tab.conversar": "बातचीत", "ia.tab.ver": "देखें", "ia.tab.buscar": "खोजें"},
    **{"ia.ver.titulo": "देखने वाली AI", "ia.ver.desc": "एक इमेज (URL या फ़ाइल) भेजें और पूछें कि आप क्या जानना चाहते हैं — omni मॉडल असली रीज़निंग बजट के साथ विश्लेषण करता है।"},
    **{"ia.ver.pergunta": "सवाल", "ia.ver.pergunta.placeholder": "इस इमेज में क्या है? विवरण बताएँ…"},
    **{"ia.ver.imagem": "इमेज", "ia.ver.imagem.ficheiro": "फ़ाइल", "ia.ver.imagem.limpar": "इमेज हटाएँ", "ia.ver.imagem.invalida": "अमान्य इमेज", "ia.ver.imagem.info": "इमेज"},
    **{"ia.ver.analisar": "इमेज का विश्लेषण करें", "ia.ver.orcamento": "रीज़निंग बजट", "ia.ver.orcamento.desc": "reasoning_budget — जवाब से पहले मॉडल सोचने में कितने tokens खर्च कर सकता है। 0 = अनुरोध से हटाया गया।"},
    **{"ia.ver.vazio": "एक इमेज चुनें, अपना सवाल पूछें — विश्लेषण लाइव आता है, सोच दिखती है।"},
    **{"ia.buscar.titulo": "सिमैंटिक मेमोरी", "ia.buscar.desc": "टेक्स्ट (और URL से इमेज) को मल्टीमोडल वेक्टर के रूप में इंडेक्स करें और शब्दों नहीं, अर्थ से खोजें — असली कोसाइन स्कोर।"},
    **{"ia.buscar.dim": "डायमेंशन", "ia.buscar.itens": "आइटम", "ia.buscar.rotulo": "लेबल (जैसे: सॉर्टी का इनाम)", "ia.buscar.texto": "इंडेक्स करने का टेक्स्ट", "ia.buscar.imagem": "इमेज https://… (वैकल्पिक — snippet की तरह डाउनलोड कर base64 किया जाता है)"},
    **{"ia.buscar.imagem.nota": "https इमेज भेजने से पहले डाउनलोड होकर base64 data URL में बदलती है — बिल्कुल आधिकारिक snippet का रास्ता।"},
    **{"ia.buscar.indexar": "इंडेक्स करें", "ia.buscar.a.indexar": "इंडेक्स हो रहा है…", "ia.buscar.indexado": "आइटम इंडेक्स हुआ — वेक्टर सेव हुआ"},
    **{"ia.buscar.query": "अर्थ से खोजें", "ia.buscar.query.placeholder": "जैसे: फुटबॉल प्रेमियों के लिए इनाम"},
    **{"ia.buscar.sem.resultados": "कोई परिणाम नहीं — पहले आइटम इंडेक्स करें।", "ia.buscar.sem.itens": "स्टोर खाली है — पहले आइटम इंडेक्स करें।"},
    **{"ia.buscar.limpar": "मेमोरी साफ़ करें", "ia.buscar.quota": "मेमोरी अस्थायी मोड में — ब्राउज़र की सीमा पूरी हुई"},
    **{"ia.buscar.similaridade": "दो टेक्स्ट के बीच समानता", "ia.buscar.sim.a": "पहला टेक्स्ट", "ia.buscar.sim.b": "दूसरा टेक्स्ट", "ia.buscar.sim.calcular": "समानता निकालें"},
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
