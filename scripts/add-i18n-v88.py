#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v88 DESIGN DESKTOP: insere as chaves i18n novas ×6 (rg.actividade.*) no LanguageContext.
Âncora: abertura de cada dicionário (mesmo padrão add-i18n-v87.py)."""
import io

CTX = "/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx"

# As 3 chaves novas do cartão «Resumo de Actividade» tema-consciente e HONESTO:
# números REAIS da progressão do aparelho (bateu_progressao_v78) — fim do mock 47min/820.
BLOCOS = {
  "en": '''
    // ===== v88 DESIGN DESKTOP: responsible gaming readable + honest on every theme =====
    "rg.actividade.partidas": "Games played today",
    "rg.actividade.jogos": "Different games today",
    "rg.actividade.nota": "Real data from this device",
''',
  "pt": '''
    // ===== v88 DESIGN DESKTOP: jogo responsável legível e honesto em qualquer tema =====
    "rg.actividade.partidas": "Partidas jogadas hoje",
    "rg.actividade.jogos": "Jogos distintos hoje",
    "rg.actividade.nota": "Dados reais deste aparelho",
''',
  "pt-BR": '''
    // ===== v88 DESIGN DESKTOP: jogo responsável legível e honesto em qualquer tema =====
    "rg.actividade.partidas": "Partidas jogadas hoje",
    "rg.actividade.jogos": "Jogos distintos hoje",
    "rg.actividade.nota": "Dados reais deste aparelho",
''',
  "es": '''
    // ===== v88 DESIGN DESKTOP: juego responsable legible y honesto en cualquier tema =====
    "rg.actividade.partidas": "Partidas jugadas hoy",
    "rg.actividade.jogos": "Juegos distintos hoy",
    "rg.actividade.nota": "Datos reales de este aparato",
''',
  "fr": '''
    // ===== v88 DESIGN DESKTOP: jeu responsable lisible et honnête sur tous les thèmes =====
    "rg.actividade.partidas": "Parties jouées aujourd'hui",
    "rg.actividade.jogos": "Jeux différents aujourd'hui",
    "rg.actividade.nota": "Données réelles de cet appareil",
''',
  "hi": '''
    // ===== v88 DESIGN DESKTOP: ज़िम्मेदार गेमिंग हर थीम में पढ़ने योग्य और ईमानदार =====
    "rg.actividade.partidas": "आज खेले गए मैच",
    "rg.actividade.jogos": "आज के अलग-अलग गेम",
    "rg.actividade.nota": "इस डिवाइस का वास्तविक डेटा",
''',
}

# cada dicionário começa com "  <lang>: {" — inserimos logo A SEGUIR (topo do dict)
import re
with io.open(CTX, "r", encoding="utf-8") as f:
    texto = f.read()

for lang, bloco in BLOCOS.items():
    alvo = lang if lang != "pt-BR" else '"pt-BR"'
    ancora = re.search(r'(^  %s: \{)$' % re.escape(alvo), texto, re.M)
    if not ancora:
        raise SystemExit(f"Âncora não encontrada para {lang}")
    pos = ancora.end()
    # a secção deste dicionário vai até à abertura do dicionário seguinte —
    # a verificação «já presente» é SÓ dentro da secção (evita colidir com
    # chaves iguais de outras línguas já inseridas)
    seguinte = re.search(r'(^  "?[a-zA-Z-]+"?: \{)$', texto[pos:], re.M)
    fim = pos + (seguinte.start() if seguinte else len(texto) - pos)
    chave_marca = [l for l in bloco.strip().splitlines() if '"rg.actividade.nota"' in l][0].strip()
    if chave_marca in texto[pos:fim]:
        print(f"{lang}: chaves já presentes — a saltar")
        continue
    texto = texto[:pos] + "\n" + bloco + texto[pos:]
    print(f"{lang}: +3 chaves inseridas no topo")

with io.open(CTX, "w", encoding="utf-8") as f:
    f.write(texto)
print("OK — LanguageContext.tsx actualizado")
