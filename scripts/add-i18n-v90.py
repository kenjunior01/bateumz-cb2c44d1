#!/usr/bin/env python3
# v90 — i18n: 1 chave contraste.rotulo ×5 dicionários (en, pt, es, fr, hi;
# pt-BR herda pt pelo fallback do t()). Âncora: a linha footer.protection
# de CADA dicionário (o pt-BR é saltado pela janela de linhas).
import re

F = "src/contexts/LanguageContext.tsx"
VALORES = {
    "en": "High contrast",
    "pt": "Alto contraste",
    "es": "Alto contraste",
    "fr": "Contraste élevé",
    "hi": "उच्च कंट्रास्ट",
}
# janelas (linha início do dict, linha início do dict seguinte)
DICTS = [("en", 11, 1675), ("pt", 1675, 3279), ("es", 4642, 5797),
         ("fr", 5797, 6919), ("hi", 6919, 999999)]

with open(F, "r", encoding="utf-8") as f:
    linhas = f.readlines()

insercoes = []  # (nº linha onde a âncora está, dict, valor)
for nome, ini, fim in DICTS:
    achou = False
    for i in range(ini - 1, min(fim - 1, len(linhas))):
        m = re.match(r'\s*"footer\.protection":\s*".*",\s*$', linhas[i])
        if m:
            insercoes.append((i, nome))
            achou = True
            break
    if not achou:
        raise SystemExit(f"ERRO: âncora footer.protection não achada em {nome}")

# inserir de baixo para cima para não deslocar as linhas
for i, nome in sorted(insercoes, reverse=True):
    chave = '"contraste.rotulo"'
    # recusar duplicado no dicionário (verificação por-secção, padrão v88)
    ini, fim = next((a, b) for (n, a, b) in DICTS if n == nome)
    seg = "".join(linhas[ini - 1:min(fim - 1, len(linhas))])
    if chave in seg:
        print(f"SKIP {nome}: chave já existe no dicionário")
        continue
    valor = VALORES[nome]
    nova = f'    {chave}: "{valor}",\n'
    linhas.insert(i + 1, nova)
    print(f"OK {nome}: inserida após footer.protection (linha {i + 1})")

with open(F, "w", encoding="utf-8") as f:
    f.writelines(linhas)
print("feito")
