#!/usr/bin/env python3
"""Add MMORPG game translations to LanguageContext.tsx"""

import re

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/contexts/LanguageContext.tsx"
with open(FILE, "r") as f:
    content = f.read()

# We insert after each typingracer.desc line
insert_block = '''    "livehub.game.mmorpg": "MMORPG Bateu",
    "livehub.game.mmorpg.desc": "Mundo persistente! Duelos PVP, economia P2P, chat global!",'''

lines = content.split('\n')
result = []
inserted = 0
for line in lines:
    result.append(line)
    if '"livehub.game.typingracer.desc"' in line:
        result.append(insert_block)
        inserted += 1

content = '\n'.join(result)
with open(FILE, "w") as f:
    f.write(content)

print(f"Inserted MMORPG translations after {inserted} entries")
