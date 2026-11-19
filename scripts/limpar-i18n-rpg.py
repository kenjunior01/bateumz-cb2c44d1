# -*- coding: utf-8 -*-
# v68 — limpeza i18n dos jogos RPG removidos (BATEU RPG/Aetheria/RPG Arena/Campanha RPG)
#  · remove TODAS as chaves "arena.*" e "aeth.*" (só eram usadas pelos jogos apagados)
#  · remove "livehub.game.{mmorpg,aetheria,rpgarena,campaignrpg}(.desc)"
#  · atualiza "live.convidado.corpo" (6 blocos) para o BATEU KART
#  · atualiza "home.cta.mundo" + "auth.boot.falha.corpo" (en/pt) para o BATEU KART
import re, io, sys

P = "src/contexts/LanguageContext.tsx"
src = io.open(P, encoding="utf-8").read()
linhas = src.split("\n")

re_apagar = re.compile(r'^\s*"(?:arena|aeth)\.[^"]*"\s*:')
re_hub = re.compile(r'^\s*"livehub\.game\.(?:mmorpg|aetheria|rpgarena|campaignrpg)(?:\.desc)?"\s*:')

n_arena, n_hub = 0, 0
fora = []
for ln in linhas:
    if re_apagar.match(ln):
        n_arena += 1
        continue
    if re_hub.match(ln):
        n_hub += 1
        continue
    fora.append(ln)
linhas = fora

txt = "\n".join(linhas)

trocas = [
    # live.convidado.corpo (6 blocos)
    ('"live.convidado.corpo": "The 3D World (BATEU RPG and Aetheria) saves progress on this device, no sign-up needed. An account is only required for platform rewards: points, wallet and raffles."',
     '"live.convidado.corpo": "The 3D World (BATEU KART) saves progress on this device, no sign-up needed. An account is only required for platform rewards: points, wallet and raffles."'),
    ('"live.convidado.corpo": "O Mundo 3D (BATEU RPG e Aetheria) guarda o progresso neste aparelho, sem registo. A conta só é precisa para as recompensas da plataforma: pontos, carteira e sorteios."',
     '"live.convidado.corpo": "O Mundo 3D (BATEU KART) guarda o progresso neste aparelho, sem registo. A conta só é precisa para as recompensas da plataforma: pontos, carteira e sorteios."'),
    ('"live.convidado.corpo": "O Mundo 3D (BATEU RPG e Aetheria) salva o progresso neste aparelho, sem cadastro. A conta só é necessária para as recompensas da plataforma: pontos, carteira e sorteios."',
     '"live.convidado.corpo": "O Mundo 3D (BATEU KART) salva o progresso neste aparelho, sem cadastro. A conta só é necessária para as recompensas da plataforma: pontos, carteira e sorteios."'),
    ('"live.convidado.corpo": "El Mundo 3D (BATEU RPG y Aetheria) guarda el progreso en este aparato, sin registro. La cuenta solo es necesaria para las recompensas de la plataforma: puntos, billetera y sorteos."',
     '"live.convidado.corpo": "El Mundo 3D (BATEU KART) guarda el progreso en este aparato, sin registro. La cuenta solo es necesaria para las recompensas de la plataforma: puntos, billetera y sorteos."'),
    ('"live.convidado.corpo": "Le Monde 3D (BATEU RPG et Aetheria) enregistre la progression sur cet appareil, sans inscription. Un compte n\'est requis que pour les récompenses de la plateforme : points, portefeuille et tirages."',
     '"live.convidado.corpo": "Le Monde 3D (BATEU KART) enregistre la progression sur cet appareil, sans inscription. Un compte n\'est requis que pour les récompenses de la plateforme : points, portefeuille et tirages."'),
    ('"live.convidado.corpo": "3D वर्ल्ड (BATEU RPG और Aetheria) प्रगति इस डिवाइस पर सहेजता है, पंजीकरण की ज़रूरत नहीं। खाता केवल प्लेटफ़ॉर्म पुरस्कारों के लिए चाहिए: पॉइंट, वॉलेट और लॉटरी।"',
     '"live.convidado.corpo": "3D वर्ल्ड (BATEU KART) प्रगति इस डिवाइस पर सहेजता है, पंजीकरण की ज़रूरत नहीं। खाता केवल प्लेटफ़ॉर्म पुरस्कारों के लिए चाहिए: पॉइंट, वॉलेट और लॉटरी।"'),
    # home.cta.mundo (en/pt)
    ('"home.cta.mundo": "Enter the 3D World"', '"home.cta.mundo": "Play BATEU KART"'),
    ('"home.cta.mundo": "Entrar no Mundo 3D"', '"home.cta.mundo": "Jogar BATEU KART"'),
    # auth.boot.falha.corpo (en/pt)
    ('"auth.boot.falha.corpo": "The server connection failed or took too long. The 3D World still works without an account — or try again."',
     '"auth.boot.falha.corpo": "The server connection failed or took too long. BATEU KART still works without an account — or try again."'),
    ('"auth.boot.falha.corpo": "A ligação ao servidor falhou ou demorou demasiado. O Mundo 3D continua a funcionar sem conta — ou tenta de novo."',
     '"auth.boot.falha.corpo": "A ligação ao servidor falhou ou demorou demasiado. O BATEU KART continua a funcionar sem conta — ou tenta de novo."'),
]

feitas = 0
for a, b in trocas:
    if a in txt:
        txt = txt.replace(a, b)
        feitas += 1
    else:
        print("AVISO: não encontrei:", a[:90])

io.open(P, "w", encoding="utf-8").write(txt)
print(f"chaves arena./aeth. removidas: {n_arena}")
print(f"chaves livehub.game RPG removidas: {n_hub}")
print(f"trocas de texto feitas: {feitas}/{len(trocas)}")
