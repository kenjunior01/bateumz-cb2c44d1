#!/usr/bin/env python3
# v56 — insere as chaves i18n do RAG ("IA lê a plataforma") da BATEU IA nos
# 6 idiomas do LanguageContext. Padrão dos add-ia-i18n-v54/v55.py: inserção
# imediata a seguir à abertura de cada dicionário, indentação de 4 espaços.
import json, sys

CAMINHO = "src/contexts/LanguageContext.tsx"

def K(**kw):  # mantém a ordem de inserção
    return list(kw.items())

PT = K(
    **{"ia.rag.titulo": "Plataforma no índice (RAG)", "ia.rag.desc": "Lê os dados REAIS da plataforma (sorteios ativos, concursos ativos, blog publicado), transforma-os em passagens com vetores multimodais e deixa o chat responder com fontes citadas — pontuação cosseno real."},
    **{"ia.rag.indexar": "Indexar plataforma", "ia.rag.a.indexar": "A indexar plataforma…"},
    **{"ia.rag.ok": "Plataforma indexada", "ia.rag.parcial": "Indexado com avisos", "ia.rag.erro": "Não conseguiu ler a plataforma", "ia.rag.vazio": "Nada publicado para indexar agora"},
    **{"ia.rag.passagens": "passagens", "ia.rag.docs": "docs", "ia.rag.limpar": "Limpar índice", "ia.rag.fontes": "Fontes"},
    **{"ia.rag.toggle": "Contexto da plataforma (RAG)", "ia.rag.toggle.desc": "O chat procura no índice antes de responder"},
    **{"ia.rag.tipo.sorteio": "sorteios", "ia.rag.tipo.concurso": "concursos", "ia.rag.tipo.blog": "blog", "ia.rag.tipo.manual": "manuais"},
    **{"ia.rag.nota": "Fontes acima do limiar de cosseno entram no system do chat com citações [1][2]; sem fontes, o chat responde SEM contexto (honesto). Com o RAG ativo, se os embeddings falham o envio é bloqueado — nunca responde como se tivesse lido. O índice vive em memória (sessão); os teus itens manuais da aba Buscar também entram."},
)

EN = K(
    **{"ia.rag.titulo": "Platform in the index (RAG)", "ia.rag.desc": "Reads the platform's REAL data (active raffles, active contests, published blog), turns it into multimodal-vector passages and lets the chat answer with cited sources — real cosine score."},
    **{"ia.rag.indexar": "Index platform", "ia.rag.a.indexar": "Indexing platform…"},
    **{"ia.rag.ok": "Platform indexed", "ia.rag.parcial": "Indexed with warnings", "ia.rag.erro": "Could not read the platform", "ia.rag.vazio": "Nothing published to index right now"},
    **{"ia.rag.passagens": "passages", "ia.rag.docs": "docs", "ia.rag.limpar": "Clear index", "ia.rag.fontes": "Sources"},
    **{"ia.rag.toggle": "Platform context (RAG)", "ia.rag.toggle.desc": "The chat searches the index before answering"},
    **{"ia.rag.tipo.sorteio": "raffles", "ia.rag.tipo.concurso": "contests", "ia.rag.tipo.blog": "blog", "ia.rag.tipo.manual": "manual"},
    **{"ia.rag.nota": "Sources above the cosine threshold go into the chat system with [1][2] citations; with no sources, the chat answers WITHOUT context (honest). With RAG on, if embeddings fail the send is blocked — it never answers as if it had read the platform. The index lives in memory (session); your manual items from the Search tab also enter."},
)

PTBR = K(
    **{"ia.rag.titulo": "Plataforma no índice (RAG)", "ia.rag.desc": "Lê os dados REAIS da plataforma (sorteios ativos, concursos ativos, blog publicado), transforma-os em passagens com vetores multimodais e deixa o chat responder com fontes citadas — pontuação cosseno real."},
    **{"ia.rag.indexar": "Indexar plataforma", "ia.rag.a.indexar": "Indexando plataforma…"},
    **{"ia.rag.ok": "Plataforma indexada", "ia.rag.parcial": "Indexado com avisos", "ia.rag.erro": "Não conseguiu ler a plataforma", "ia.rag.vazio": "Nada publicado para indexar agora"},
    **{"ia.rag.passagens": "passagens", "ia.rag.docs": "docs", "ia.rag.limpar": "Limpar índice", "ia.rag.fontes": "Fontes"},
    **{"ia.rag.toggle": "Contexto da plataforma (RAG)", "ia.rag.toggle.desc": "O chat busca no índice antes de responder"},
    **{"ia.rag.tipo.sorteio": "sorteios", "ia.rag.tipo.concurso": "concursos", "ia.rag.tipo.blog": "blog", "ia.rag.tipo.manual": "manuais"},
    **{"ia.rag.nota": "Fontes acima do limiar de cosseno entram no system do chat com citações [1][2]; sem fontes, o chat responde SEM contexto (honesto). Com o RAG ativo, se os embeddings falham o envio é bloqueado — nunca responde como se tivesse lido. O índice vive em memória (sessão); seus itens manuais da aba Buscar também entram."},
)

ES = K(
    **{"ia.rag.titulo": "Plataforma en el índice (RAG)", "ia.rag.desc": "Lee los datos REALES de la plataforma (sorteos activos, concursos activos, blog publicado), los convierte en pasajes con vectores multimodales y deja que el chat responda con fuentes citadas — puntuación coseno real."},
    **{"ia.rag.indexar": "Indexar plataforma", "ia.rag.a.indexar": "Indexando plataforma…"},
    **{"ia.rag.ok": "Plataforma indexada", "ia.rag.parcial": "Indexado con avisos", "ia.rag.erro": "No se pudo leer la plataforma", "ia.rag.vazio": "Nada publicado para indexar ahora"},
    **{"ia.rag.passagens": "pasajes", "ia.rag.docs": "docs", "ia.rag.limpar": "Limpiar índice", "ia.rag.fontes": "Fuentes"},
    **{"ia.rag.toggle": "Contexto de la plataforma (RAG)", "ia.rag.toggle.desc": "El chat busca en el índice antes de responder"},
    **{"ia.rag.tipo.sorteio": "sorteos", "ia.rag.tipo.concurso": "concursos", "ia.rag.tipo.blog": "blog", "ia.rag.tipo.manual": "manuales"},
    **{"ia.rag.nota": "Las fuentes por encima del umbral de coseno entran en el system del chat con citas [1][2]; sin fuentes, el chat responde SIN contexto (honesto). Con el RAG activo, si los embeddings fallan el envío se bloquea — nunca responde como si hubiera leído. El índice vive en memoria (sesión); tus ítems manuales de la pestaña Buscar también entran."},
)

FR = K(
    **{"ia.rag.titulo": "Plateforme dans l'index (RAG)", "ia.rag.desc": "Lit les données RÉELLES de la plateforme (tirages actifs, concours actifs, blog publié), les transforme en passages avec vecteurs multimodaux et permet au chat de répondre avec sources citées — score cosinus réel."},
    **{"ia.rag.indexar": "Indexer la plateforme", "ia.rag.a.indexar": "Indexation de la plateforme…"},
    **{"ia.rag.ok": "Plateforme indexée", "ia.rag.parcial": "Indexé avec avertissements", "ia.rag.erro": "Impossible de lire la plateforme", "ia.rag.vazio": "Rien de publié à indexer pour le moment"},
    **{"ia.rag.passagens": "passages", "ia.rag.docs": "docs", "ia.rag.limpar": "Effacer l'index", "ia.rag.fontes": "Sources"},
    **{"ia.rag.toggle": "Contexte de la plateforme (RAG)", "ia.rag.toggle.desc": "Le chat cherche dans l'index avant de répondre"},
    **{"ia.rag.tipo.sorteio": "tirages", "ia.rag.tipo.concurso": "concours", "ia.rag.tipo.blog": "blog", "ia.rag.tipo.manual": "manuels"},
    **{"ia.rag.nota": "Les sources au-dessus du seuil de cosinus entrent dans le system du chat avec des citations [1][2] ; sans sources, le chat répond SANS contexte (honnête). Avec le RAG actif, si les embeddings échouent l'envoi est bloqué — il ne répond jamais comme s'il avait lu. L'index vit en mémoire (session) ; vos éléments manuels de l'onglet Chercher entrent aussi."},
)

HI = K(
    **{"ia.rag.titulo": "प्लेटफ़ॉर्म इंडेक्स में (RAG)", "ia.rag.desc": "प्लेटफ़ॉर्म का असली डेटा (सक्रिय सॉर्टी, सक्रिय कॉन्टेस्ट, प्रकाशित ब्लॉग) पढ़कर मल्टीमोडल वेक्टर पैसेज बनाता है और चैट सूत्र बताकर जवाब देता है — असली कोसाइन स्कोर।"},
    **{"ia.rag.indexar": "प्लेटफ़ॉर्म इंडेक्स करें", "ia.rag.a.indexar": "प्लेटफ़ॉर्म इंडेक्स हो रहा है…"},
    **{"ia.rag.ok": "प्लेटफ़ॉर्म इंडेक्स हुआ", "ia.rag.parcial": "चेतावनियों के साथ इंडेक्स हुआ", "ia.rag.erro": "प्लेटफ़ॉर्म नहीं पढ़ सका", "ia.rag.vazio": "अभी इंडेक्स करने के लिए कुछ प्रकाशित नहीं"},
    **{"ia.rag.passagens": "पैसेज", "ia.rag.docs": "docs", "ia.rag.limpar": "इंडेक्स साफ़ करें", "ia.rag.fontes": "स्रोत"},
    **{"ia.rag.toggle": "प्लेटफ़ॉर्म संदर्भ (RAG)", "ia.rag.toggle.desc": "जवाब से पहले चैट इंडेक्स में खोजता है"},
    **{"ia.rag.tipo.sorteio": "सॉर्टी", "ia.rag.tipo.concurso": "कॉन्टेस्ट", "ia.rag.tipo.blog": "ब्लॉग", "ia.rag.tipo.manual": "मैन्युअल"},
    **{"ia.rag.nota": "कोसाइन थ्रेशोल्ड से ऊपर के स्रोत चैट के system में [1][2] उद्धरणों के साथ जाते हैं; बिना स्रोत, चैट बिना संदर्भ जवाब देता है (ईमानदार)। RAG चालू होने पर embeddings फेल होने पर भेजना रुक जाता है — यह कभी ऐसा जवाब नहीं देता जैसे पढ़ चुका हो। इंडेक्स मेमोरी में रहता है (सेशन); Search टैब के आपके मैन्युअल आइटम भी आते हैं।"},
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
