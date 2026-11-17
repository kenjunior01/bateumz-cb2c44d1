#!/usr/bin/env python3
# v59 — insere as chaves i18n da PRESENÇA DO NPC NO SERVIDOR MP (o passo
# anotado desde a v57/v58) nos 6 idiomas do LanguageContext. Padrão dos
# add-ia-i18n-v54..v58.py: inserção imediata a seguir à abertura de cada
# dicionário, 4 espaços (as chaves `cidade.mpEvNpc*` alimentam o painel
# «Praça em direto» — o CONTEÚDO da conversa nunca viaja, só quem fala).
import json, sys

CAMINHO = "src/contexts/LanguageContext.tsx"

PT = {"cidade.mpEvNpc": "está a falar com a Bateu IA",
      "cidade.mpEvNpcFim": "parou a conversa com a Bateu IA"}
EN = {"cidade.mpEvNpc": "is talking with the Bateu IA",
      "cidade.mpEvNpcFim": "stopped chatting with the Bateu IA"}
PTBR = {"cidade.mpEvNpc": "está conversando com a Bateu IA",
        "cidade.mpEvNpcFim": "parou a conversa com a Bateu IA"}
ES = {"cidade.mpEvNpc": "está hablando con la Bateu IA",
      "cidade.mpEvNpcFim": "dejó de hablar con la Bateu IA"}
FR = {"cidade.mpEvNpc": "parle avec la Bateu IA",
      "cidade.mpEvNpcFim": "a arrêté la conversation avec la Bateu IA"}
HI = {"cidade.mpEvNpc": "Bateu AI से बात कर रहा है",
      "cidade.mpEvNpcFim": "Bateu AI से बात करना बंद की"}

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
    bloco = "".join(f'    {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)},\n' for k, v in pares.items())
    linhas.insert(idx + 1, bloco)
    total += len(pares)
    print(f"  {chave_dict}: +{len(pares)} chaves")

with open(CAMINHO, "w", encoding="utf-8") as f:
    f.writelines(linhas)

print(f"TOTAL: {total} chaves inseridas")
