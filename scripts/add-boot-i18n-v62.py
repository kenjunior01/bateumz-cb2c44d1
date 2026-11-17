#!/usr/bin/env python3
# v62 — chaves auth.boot.* (estado de recuperação do arranque — item 10) e
# world.fs já aplicado noutro script. pt/en.
import json, sys

CAMINHO = "src/contexts/LanguageContext.tsx"

PT = {
  "auth.boot.falha.titulo": "Não conseguimos ligar à tua conta",
  "auth.boot.falha.corpo": "A ligação ao servidor falhou ou demorou demasiado. O Mundo 3D continua a funcionar sem conta — ou tenta de novo.",
  "auth.boot.falha.tentar": "Tentar de novo",
  "auth.boot.falha.convidado": "Continuar como convidado",
}
EN = {
  "auth.boot.falha.titulo": "We couldn't reach your account",
  "auth.boot.falha.corpo": "The server connection failed or took too long. The 3D World still works without an account — or try again.",
  "auth.boot.falha.tentar": "Try again",
  "auth.boot.falha.convidado": "Continue as guest",
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
