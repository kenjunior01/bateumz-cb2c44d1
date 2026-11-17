#!/usr/bin/env python3
# v62 — chaves auth.oauth.* (mensagens OAuth pela língua — item 5) em pt/en.
import json, sys

CAMINHO = "src/contexts/LanguageContext.tsx"

PT = {
  "auth.oauth.erro": "{provedor} recusou a ligação{detalhe} — permite pop-ups para este site e tenta de novo.",
  "auth.oauth.cancelado": "Ligação a {provedor} cancelada — quando quiseres, tenta de novo.",
  "auth.oauth.timeout": "{provedor} demorou demasiado a responder — verifica a internet e tenta de novo.",
}
EN = {
  "auth.oauth.erro": "{provedor} refused the connection{detalhe} — allow pop-ups for this site and try again.",
  "auth.oauth.cancelado": "Connection to {provedor} cancelled — try again whenever you're ready.",
  "auth.oauth.timeout": "{provedor} took too long to respond — check your connection and try again.",
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

with open(CAMINHO, "w", encoding="utf-8") as f:
    f.writelines(linhas)
print(f"TOTAL: {total}")
