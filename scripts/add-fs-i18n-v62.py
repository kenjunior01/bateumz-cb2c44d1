#!/usr/bin/env python3
# v62 — chaves world.fs.* (ecrã inteiro — roadmap item 4) em pt/en.
import json, sys

CAMINHO = "src/contexts/LanguageContext.tsx"

PT = {
  "world.fs.entrar": "Ecrã inteiro",
  "world.fs.sair": "Sair do ecrã inteiro (Esc)",
}
EN = {
  "world.fs.entrar": "Fullscreen",
  "world.fs.sair": "Exit fullscreen (Esc)",
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
