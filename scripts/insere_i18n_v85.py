#!/usr/bin/env python3
# v85 — insere as chaves i18n novas ×6 idiomas + interpola {n} no anúncio de lives.
# Padrão v84: âncora por bloco, inserção baixo→cima, idempotente (pode correr 2×).
import re, sys

F = "src/contexts/LanguageContext.tsx"
src = open(F, encoding="utf-8").read()
lines = src.split("\n")

# ── 1) localizar os 6 blocos pela linha "home79.frase" de cada idioma ──
frase_idx = [i for i, l in enumerate(lines) if '"home79.frase":' in l]
assert len(frase_idx) == 6, f"esperava 6 blocos, vi {len(frase_idx)}"

# chaves novas, na ordem de inserção (todas recebem a indentação do bloco)
NOVAS = [
    '"home79.jogosCard.recompensa": "Até {pontos} pontos por corrida",',
    '"home79.desportoCard.fonte": "Dados: TheSportsDB",',
    '"reten.painel.titulo": "O teu progresso",',
    '"reten.loop": "Joga hoje. Acumula pontos. Desbloqueia prémios.",',
    '"reten.painel.jogosGratis": "jogos grátis",',
    '"reten.painel.premios": "Prémios disponíveis",',
    '"reten.painel.premios.vazia": "Sem prémios activos agora",',
    '"reten.painel.verPremios": "Ver prémios",',
    '"reten.painel.jogarGratis": "Jogar grátis",',
    '"reten.painel.barraAria": "Progresso até ao próximo nível",',
]
NOVAS_EN = [
    '"home79.jogosCard.recompensa": "Up to {pontos} points per race",',
    '"home79.desportoCard.fonte": "Data: TheSportsDB",',
    '"reten.painel.titulo": "Your progress",',
    '"reten.loop": "Play today. Earn points. Unlock prizes.",',
    '"reten.painel.jogosGratis": "free games",',
    '"reten.painel.premios": "Prizes available",',
    '"reten.painel.premios.vazia": "No active prizes right now",',
    '"reten.painel.verPremios": "See prizes",',
    '"reten.painel.jogarGratis": "Play free",',
    '"reten.painel.barraAria": "Progress to the next level",',
]
NOVAS_PTBR = [
    '"home79.jogosCard.recompensa": "Até {pontos} pontos por corrida",',
    '"home79.desportoCard.fonte": "Dados: TheSportsDB",',
    '"reten.painel.titulo": "O seu progresso",',
    '"reten.loop": "Jogue hoje. Acumule pontos. Desbloqueie prêmios.",',
    '"reten.painel.jogosGratis": "jogos grátis",',
    '"reten.painel.premios": "Prêmios disponíveis",',
    '"reten.painel.premios.vazia": "Sem prêmios ativos agora",',
    '"reten.painel.verPremios": "Ver prêmios",',
    '"reten.painel.jogarGratis": "Jogar grátis",',
    '"reten.painel.barraAria": "Progresso até o próximo nível",',
]
NOVAS_ES = [
    '"home79.jogosCard.recompensa": "Hasta {pontos} puntos por carrera",',
    '"home79.desportoCard.fonte": "Datos: TheSportsDB",',
    '"reten.painel.titulo": "Tu progreso",',
    '"reten.loop": "Juega hoy. Acumula puntos. Desbloquea premios.",',
    '"reten.painel.jogosGratis": "juegos gratis",',
    '"reten.painel.premios": "Premios disponibles",',
    '"reten.painel.premios.vazia": "Sin premios activos ahora",',
    '"reten.painel.verPremios": "Ver premios",',
    '"reten.painel.jogarGratis": "Jugar gratis",',
    '"reten.painel.barraAria": "Progreso hasta el siguiente nivel",',
]
NOVAS_FR = [
    '"home79.jogosCard.recompensa": "Jusqu\\u2019à {pontos} points par course",'.replace("\\u2019", "’"),
    '"home79.desportoCard.fonte": "Données : TheSportsDB",',
    '"reten.painel.titulo": "Ta progression",',
    '"reten.loop": "Joue aujourd’hui. Cumule des points. Débloque des prix.",',
    '"reten.painel.jogosGratis": "jeux gratuits",',
    '"reten.painel.premios": "Prix disponibles",',
    '"reten.painel.premios.vazia": "Aucun prix actif pour le moment",',
    '"reten.painel.verPremios": "Voir les prix",',
    '"reten.painel.jogarGratis": "Jouer gratuitement",',
    '"reten.painel.barraAria": "Progression vers le niveau suivant",',
]
NOVAS_HI = [
    '"home79.jogosCard.recompensa": "प्रति रेस {pontos} पॉइंट तक",',
    '"home79.desportoCard.fonte": "डेटा: TheSportsDB",',
    '"reten.painel.titulo": "आपकी प्रगति",',
    '"reten.loop": "आज खेलें। पॉइंट जमा करें। पुरस्कार अनलॉक करें।",',
    '"reten.painel.jogosGratis": "मुफ़्त गेम",',
    '"reten.painel.premios": "उपलब्ध पुरस्कार",',
    '"reten.painel.premios.vazia": "अभी कोई सक्रिय पुरस्कार नहीं",',
    '"reten.painel.verPremios": "पुरस्कार देखें",',
    '"reten.painel.jogarGratis": "मुफ़्त खेलें",',
    '"reten.painel.barraAria": "अगले स्तर तक प्रगति",',
]

# blocos em ordem de linha: en, pt, pt-BR, es, fr, hi
def idioma_do_indice(idx):
    if idx < 1540: return "en"
    if idx < 3009: return "pt"
    if idx < 4257: return "pt-BR"
    if idx < 5277: return "es"
    if idx < 6264: return "fr"
    return "hi"

CONJ = {"pt": NOVAS, "en": NOVAS_EN, "pt-BR": NOVAS_PTBR, "es": NOVAS_ES, "fr": NOVAS_FR, "hi": NOVAS_HI}
ordem = sorted(frase_idx)
mapa_bloco = [CONJ[idioma_do_indice(i)] for i in ordem]

inseridos = 0
# inserir baixo→cima para não invalidar índices
for idx, chaves in sorted(zip(ordem, mapa_bloco), reverse=True):
    # idempotente: as chaves novas já existem neste bloco?
    janela = "\n".join(lines[idx:idx + 40])
    if '"reten.painel.titulo"' in janela:
        print(f"bloco @linha {idx + 1}: já inserido, salto")
        continue
    indent = re.match(r"\s*", lines[idx]).group(0)
    bloco = [indent + k for k in chaves]
    lines[idx + 1:idx + 1] = bloco
    inseridos += 1
    print(f"bloco @linha {idx + 1}: +{len(bloco)} chaves ({idioma_do_indice(idx)})")

# ── 2) anúncio de lives: interpola {n} real em cada idioma ──
ANUNCIO = {
    "en": '"nav.announcement.text": "{n} live streams now — join and win real-time prizes!",',
    "pt": '"nav.announcement.text": "{n} transmissões ao vivo agora — participa e ganha prémios em tempo real!",',
    "pt-BR": '"nav.announcement.text": "{n} transmissões ao vivo agora — participe e ganhe prêmios em tempo real!",',
    "es": '"nav.announcement.text": "{n} transmisiones en vivo ahora — únete y gana premios en tiempo real!",',
    "fr": '"nav.announcement.text": "{n} directs en cours — participez et gagnez des prix en temps réel!",',
    "hi": '"nav.announcement.text": "{n} लाइव स्ट्रीम अभी — जुड़ें और रीयल-टाइम पुरस्कार जीतें!",',
}
valores = list(ANUNCIO.values())
# ocorrências SEM {n}, em ordem de bloco (en, pt, pt-BR, es, fr, hi)
ocorrencias = [i for i, l in enumerate(lines) if '"nav.announcement.text":' in l and "{n}" not in l]
assert len(ocorrencias) <= 6, f"esperava ≤6 anúncios, vi {len(ocorrencias)}"
for n, i in enumerate(sorted(ocorrencias)):
    indent = re.match(r"\s*", lines[i]).group(0)
    lines[i] = indent + valores[n]

open(F, "w", encoding="utf-8").write("\n".join(lines))
print(f"OK: {inseridos} blocos inseridos · {len(ocorrencias)} anúncios com {{n}}")
