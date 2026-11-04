#!/usr/bin/env python3
# v37 — insere chaves do chat da praça (cidade.mpChat*/mpCorrigido) após
# "cidade.mpNota" nas 6 línguas, pela ordem do ficheiro (padrão v36).
import re

P = "src/contexts/LanguageContext.tsx"
s = open(P, encoding="utf-8").read()

TRADS = {  # ordem no ficheiro: en, pt, pt-BR, es, fr, hi
    "en": ('"cidade.mpChatFala": "Talk to the square…", "cidade.mpChatEnviar": "Send", "cidade.mpChatVazio": "Square chat — say hello!", "cidade.mpChatLimitada": "One message at a time — wait a moment", "cidade.mpCorrigido": "Shared world: position adjusted by the server"'),
    "pt": ('"cidade.mpChatFala": "Fala com a praça…", "cidade.mpChatEnviar": "Enviar", "cidade.mpChatVazio": "Chat da praça — diz olá!", "cidade.mpChatLimitada": "Uma fala de cada vez — espera um instante", "cidade.mpCorrigido": "Mundo partilhado: posição ajustada pelo servidor"'),
    "pt-BR": ('"cidade.mpChatFala": "Fale com a praça…", "cidade.mpChatEnviar": "Enviar", "cidade.mpChatVazio": "Chat da praça — diga olá!", "cidade.mpChatLimitada": "Uma mensagem por vez — espere um instante", "cidade.mpCorrigido": "Mundo compartilhado: posição ajustada pelo servidor"'),
    "es": ('"cidade.mpChatFala": "Habla con la plaza…", "cidade.mpChatEnviar": "Enviar", "cidade.mpChatVazio": "Chat de la plaza — ¡di hola!", "cidade.mpChatLimitada": "Un mensaje a la vez — espera un instante", "cidade.mpCorrigido": "Mundo compartido: posición ajustada por el servidor"'),
    "fr": ('"cidade.mpChatFala": "Parle à la place…", "cidade.mpChatEnviar": "Envoyer", "cidade.mpChatVazio": "Chat de la place — dis bonjour !", "cidade.mpChatLimitada": "Un message à la fois — attends un instant", "cidade.mpCorrigido": "Monde partagé : position ajustée par le serveur"'),
    "hi": ('"cidade.mpChatFala": "प्राज़ा से बात करें…", "cidade.mpChatEnviar": "भेजें", "cidade.mpChatVazio": "प्राज़ा चैट — नमस्ते कहें!", "cidade.mpChatLimitada": "एक बार में एक ही संदेश — थोड़ा रुकें", "cidade.mpCorrigido": "साझी दुनिया: सर्वर द्वारा स्थिति समायोजित"'),
}

ordem = ["en", "pt", "pt-BR", "es", "fr", "hi"]
it = iter(ordem)

def ins(m):
    ling = next(it)
    return m.group(1) + ", " + TRADS[ling]

s2, n = re.subn(r'("cidade\.mpNota":\s*"[^"]*")', ins, s)
assert n == 6, f"esperava 6 âncoras, achei {n}"
open(P, "w", encoding="utf-8").write(s2)
print("OK — chaves v37 do chat inseridas nas", n, "línguas")
