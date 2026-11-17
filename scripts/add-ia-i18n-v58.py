#!/usr/bin/env python3
# v58 — insere as chaves i18n do HISTÓRICO DA IA NO SERVIDOR (sincronização
# entre dispositivos — o passo anotado desde a v54) nos 6 idiomas do
# LanguageContext. Padrão dos add-ia-i18n-v54..v57.py: inserção imediata a
# seguir à abertura de cada dicionário, 4 espaços. As chaves `ia.sinc.*`
# são partilhadas pela página /ia (badge) e pelo NPC da Cidade (chip).
import json, sys

CAMINHO = "src/contexts/LanguageContext.tsx"

def K(**kw):  # mantém a ordem de inserção
    return list(kw.items())

PT = K(
    **{"ia.sinc.on": "Histórico no servidor", "ia.sinc.convidado": "Só neste dispositivo — entra para sincronizar"},
    **{"ia.sinc.erro": "Servidor não respondeu — histórico só aqui", "ia.sinc.migracao": "Sincronização pendente da migração"},
    **{"ia.sinc.aSincronizar": "A sincronizar histórico…"},
)

EN = K(
    **{"ia.sinc.on": "History on the server", "ia.sinc.convidado": "This device only — sign in to sync"},
    **{"ia.sinc.erro": "Server not responding — history here only", "ia.sinc.migracao": "Sync pending migration"},
    **{"ia.sinc.aSincronizar": "Syncing history…"},
)

PTBR = K(
    **{"ia.sinc.on": "Histórico no servidor", "ia.sinc.convidado": "Só neste dispositivo — entre para sincronizar"},
    **{"ia.sinc.erro": "Servidor não respondeu — histórico só aqui", "ia.sinc.migracao": "Sincronização pendente da migração"},
    **{"ia.sinc.aSincronizar": "Sincronizando histórico…"},
)

ES = K(
    **{"ia.sinc.on": "Historial en el servidor", "ia.sinc.convidado": "Solo en este dispositivo — inicia sesión para sincronizar"},
    **{"ia.sinc.erro": "El servidor no responde — historial solo aquí", "ia.sinc.migracao": "Sincronización pendiente de migración"},
    **{"ia.sinc.aSincronizar": "Sincronizando historial…"},
)

FR = K(
    **{"ia.sinc.on": "Historique sur le serveur", "ia.sinc.convidado": "Sur cet appareil seulement — connecte-toi pour synchroniser"},
    **{"ia.sinc.erro": "Le serveur ne répond pas — historique ici seulement", "ia.sinc.migracao": "Synchronisation en attente de migration"},
    **{"ia.sinc.aSincronizar": "Synchronisation de l'historique…"},
)

HI = K(
    **{"ia.sinc.on": "सर्वर पर इतिहास", "ia.sinc.convidado": "सिर्फ़ इस डिवाइस पर — सिंक के लिए साइन इन करें"},
    **{"ia.sinc.erro": "सर्वर जवाब नहीं दे रहा — इतिहास सिर्फ़ यहीं", "ia.sinc.migracao": "सिंक माइग्रेशन का इंतज़ार कर रहा है"},
    **{"ia.sinc.aSincronizar": "इतिहास सिंक हो रहा है…"},
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
