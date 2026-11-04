#!/usr/bin/env python3
# v36 — insere chaves MP (cidade.mp*) após "cidade.aqiIndisp" nas 6 línguas, pela ordem do ficheiro
import re

P = "src/contexts/LanguageContext.tsx"
s = open(P, encoding="utf-8").read()

TRADS = {  # ordem no ficheiro: en, pt, pt-BR, es, fr, hi
    "en": ('"cidade.mpLigando": "Connecting to the shared world…", "cidade.mpErro": "Shared world offline — solo mode", "cidade.mpNoMundo": "in the world", "cidade.mpNota": "v36: test shared presence with ?mp=ws://server — without it, the city stays fully local."'),
    "pt": ('"cidade.mpLigando": "A ligar ao mundo partilhado…", "cidade.mpErro": "Mundo partilhado offline — modo solo", "cidade.mpNoMundo": "no mundo", "cidade.mpNota": "v36: presença partilhada de teste com ?mp=ws://servidor — sem isso, a cidade fica 100% local."'),
    "pt-BR": ('"cidade.mpLigando": "Conectando ao mundo compartilhado…", "cidade.mpErro": "Mundo compartilhado offline — modo solo", "cidade.mpNoMundo": "no mundo", "cidade.mpNota": "v36: presença compartilhada de teste com ?mp=ws://servidor — sem isso, a cidade fica 100% local."'),
    "es": ('"cidade.mpLigando": "Conectando al mundo compartido…", "cidade.mpErro": "Mundo compartido sin conexión — modo solo", "cidade.mpNoMundo": "en el mundo", "cidade.mpNota": "v36: presencia compartida de prueba con ?mp=ws://servidor — sin eso, la ciudad queda 100% local."'),
    "fr": ('"cidade.mpLigando": "Connexion au monde partagé…", "cidade.mpErro": "Monde partagé hors ligne — mode solo", "cidade.mpNoMundo": "dans le monde", "cidade.mpNota": "v36 : présence partagée de test avec ?mp=ws://serveur — sans ça, la ville reste 100 % locale."'),
    "hi": ('"cidade.mpLigando": "साझी दुनिया से जुड़ रहे हैं…", "cidade.mpErro": "साझी दुनिया ऑफ़लाइन — सोलो मोड", "cidade.mpNoMundo": "दुनिया में", "cidade.mpNota": "v36: ?mp=ws://server के साथ परीक्षण साझी उपस्थिति — इसके बिना शहर पूरी तरह लोकल रहती है।"'),
}

ordem = ["en", "pt", "pt-BR", "es", "fr", "hi"]
it = iter(ordem)

def ins(m):
    ling = next(it)
    return m.group(1) + ", " + TRADS[ling]

s2, n = re.subn(r'("cidade\.aqiIndisp":\s*"[^"]*")', ins, s)
assert n == 6, f"esperava 6 âncoras, achei {n}"
open(P, "w", encoding="utf-8").write(s2)
print("OK — chaves MP inseridas nas", n, "línguas")
