#!/usr/bin/env python3
# v82 — chaves i18n do CONTEXTO DA IA (chip + banner + perguntas por tipo)
# 19 chaves × 6 línguas (en, pt, pt-BR, es, fr, hi) — inseridas no topo de
# cada bloco do objeto translations em LanguageContext.tsx.
import re

CAMINHO = "src/contexts/LanguageContext.tsx"

# ── valores por língua ────────────────────────────────────────────────────
VALS = {
    "ia.ctx.banner": {
        "en": "Coming from the page:", "pt": "Vindo da página:", "pt-BR": "Vindo da página:",
        "es": "Procedente de la página:", "fr": "Venant de la page :", "hi": "इस पेज से:",
    },
    "ia.ctx.chip": {
        "en": "Context:", "pt": "Contexto:", "pt-BR": "Contexto:",
        "es": "Contexto:", "fr": "Contexte :", "hi": "संदर्भ:",
    },
    "ia.ctx.abrir": {
        "en": "open page", "pt": "abrir página", "pt-BR": "abrir página",
        "es": "abrir página", "fr": "ouvrir la page", "hi": "पेज खोलें",
    },
    "ia.ctx.limpar": {
        "en": "clear context", "pt": "limpar contexto", "pt-BR": "limpar contexto",
        "es": "limpiar contexto", "fr": "effacer le contexte", "hi": "संदर्भ हटाएं",
    },
    # ── perguntas sugeridas: sorteio ──
    "ia.ctx.q.sorteio.1": {
        "en": "How do I join this raffle?", "pt": "Como participo neste sorteio?", "pt-BR": "Como participo deste sorteio?",
        "es": "¿Cómo participo en este sorteo?", "fr": "Comment participer à ce tirage ?", "hi": "मैं इस रैफल में कैसे भाग लूँ?",
    },
    "ia.ctx.q.sorteio.2": {
        "en": "How many tickets have been sold?", "pt": "Quantos bilhetes já foram vendidos?", "pt-BR": "Quantos bilhetes já foram vendidos?",
        "es": "¿Cuántos billetes se han vendido?", "fr": "Combien de billets ont été vendus ?", "hi": "कितने टिकट बिक गए हैं?",
    },
    "ia.ctx.q.sorteio.3": {
        "en": "What can I win here?", "pt": "O que posso ganhar aqui?", "pt-BR": "O que posso ganhar aqui?",
        "es": "¿Qué puedo ganar aquí?", "fr": "Que puis-je gagner ici ?", "hi": "मैं यहाँ क्या जीत सकता हूँ?",
    },
    # ── leilão ──
    "ia.ctx.q.leilao.1": {
        "en": "How do bids work in this auction?", "pt": "Como funcionam os lances neste leilão?", "pt-BR": "Como funcionam os lances neste leilão?",
        "es": "¿Cómo funcionan las pujas en esta subasta?", "fr": "Comment fonctionnent les enchères ici ?", "hi": "इस नीलामी में बिड कैसे काम करते हैं?",
    },
    "ia.ctx.q.leilao.2": {
        "en": "What is the next minimum bid?", "pt": "Qual é o próximo lance mínimo?", "pt-BR": "Qual é o próximo lance mínimo?",
        "es": "¿Cuál es la próxima puja mínima?", "fr": "Quelle est la prochaine enchère minimale ?", "hi": "अगला न्यूनतम बिड क्या है?",
    },
    "ia.ctx.q.leilao.3": {
        "en": "Is the seller verified?", "pt": "O vendedor é verificado?", "pt-BR": "O vendedor é verificado?",
        "es": "¿El vendedor está verificado?", "fr": "Le vendeur est-il vérifié ?", "hi": "क्या विक्रेता सत्यापित है?",
    },
    # ── concurso ──
    "ia.ctx.q.concurso.1": {
        "en": "How do I enter this contest?", "pt": "Como participo neste concurso?", "pt-BR": "Como participo deste concurso?",
        "es": "¿Cómo participo en este concurso?", "fr": "Comment participer à ce concours ?", "hi": "मैं इस प्रतियोगिता में कैसे भाग लूँ?",
    },
    "ia.ctx.q.concurso.2": {
        "en": "Who is leading the votes?", "pt": "Quem está a liderar as votações?", "pt-BR": "Quem está liderando as votações?",
        "es": "¿Quién lidera las votaciones?", "fr": "Qui mène les votes ?", "hi": "वोट में कौन आगे है?",
    },
    "ia.ctx.q.concurso.3": {
        "en": "When does the deadline end?", "pt": "Quando termina o prazo?", "pt-BR": "Quando termina o prazo?",
        "es": "¿Cuándo termina el plazo?", "fr": "Quand se termine le délai ?", "hi": "समय-सीमा कब खत्म होती है?",
    },
    # ── jogo ──
    "ia.ctx.q.jogo.1": {
        "en": "How do I play this game?", "pt": "Como se joga este jogo?", "pt-BR": "Como se joga este jogo?",
        "es": "¿Cómo se juega este juego?", "fr": "Comment jouer à ce jeu ?", "hi": "यह गेम कैसे खेलते हैं?",
    },
    "ia.ctx.q.jogo.2": {
        "en": "How do I improve my score?", "pt": "Como melhoro a minha pontuação?", "pt-BR": "Como melhoro minha pontuação?",
        "es": "¿Cómo mejoro mi puntuación?", "fr": "Comment améliorer mon score ?", "hi": "मैं अपना स्कोर कैसे बढ़ाऊँ?",
    },
    "ia.ctx.q.jogo.3": {
        "en": "Does this game have a bot mode?", "pt": "Este jogo tem modo contra a IA?", "pt-BR": "Este jogo tem modo contra a IA?",
        "es": "¿Este juego tiene modo contra la IA?", "fr": "Ce jeu a-t-il un mode contre l'IA ?", "hi": "इस गेम में AI के खिलाफ मोड है?",
    },
    # ── desporto ──
    "ia.ctx.q.desporto.1": {
        "en": "Analyse this round's matches", "pt": "Analisa as partidas desta jornada", "pt-BR": "Analise as partidas desta rodada",
        "es": "Analiza los partidos de esta jornada", "fr": "Analyse les matchs de cette journée", "hi": "इस राउंड के मैचों का विश्लेषण करें",
    },
    "ia.ctx.q.desporto.2": {
        "en": "Which teams are in good form?", "pt": "Que equipas estão em boa forma?", "pt-BR": "Que equipes estão em boa forma?",
        "es": "¿Qué equipos están en buena forma?", "fr": "Quelles équipes sont en bonne forme ?", "hi": "कौन सी टीमें अच्छी फॉर्म में हैं?",
    },
    "ia.ctx.q.desporto.3": {
        "en": "How does the social prediction work?", "pt": "Como funciona o palpite social?", "pt-BR": "Como funciona o palpite social?",
        "es": "¿Cómo funciona la predicción social?", "fr": "Comment fonctionne le pronostic social ?", "hi": "सोशल प्रेडिक्शन कैसे काम करता है?",
    },
}

ORDEM = ["en", "pt", "pt-BR", "es", "fr", "hi"]

with open(CAMINHO, encoding="utf-8") as f:
    texto = f.read()

linhas = texto.split("\n")
insercoes = []  # (índice_linha, bloco_texto)

padrao = re.compile(r'^  (en|pt|"pt-BR"|es|fr|hi): \{$')
for i, linha in enumerate(linhas):
    m = padrao.match(linha)
    if not m:
        continue
    lang = m.group(1).strip('"')
    bloco = [f'    // ===== v82 — CONTEXTO DA IA (chip + perguntas da página de origem) =====']
    for chave, por_lang in VALS.items():
        bloco.append(f'    "{chave}": {por_lang[lang]!r},'.replace("'", '"') if False else f'    "{chave}": "{por_lang[lang]}",')
    insercoes.append((i, "\n".join(bloco)))

assert len(insercoes) == 6, f"esperava 6 blocos, achei {len(insercoes)}"

# inserir de baixo para cima (índices estáveis)
for i, bloco in reversed(insercoes):
    linhas[i + 1:i + 1] = bloco.split("\n")

with open(CAMINHO, "w", encoding="utf-8") as f:
    f.write("\n".join(linhas))

total = len(VALS) * 6
print(f"OK — {len(VALS)} chaves × 6 línguas = {total} entradas inseridas")
