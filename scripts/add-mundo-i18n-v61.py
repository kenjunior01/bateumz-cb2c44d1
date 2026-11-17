#!/usr/bin/env python3
# v61 — insere as chaves i18n do MUNDO 3D SEM REGISTO (item 2 do roadmap
# «Bateu corrections») nos 6 idiomas do LanguageContext. Padrão dos
# add-ia-i18n-v54..v59.py: inserção imediata a seguir à abertura de cada
# dicionário. 4 chaves: live.convidado.{titulo,corpo,criar,entrar} —
# o aviso HONESTO do hub (o convidado é UM MODO: o progresso do mundo
# fica no aparelho; a conta só é precisa para recompensas da plataforma).
import json, sys

CAMINHO = "src/contexts/LanguageContext.tsx"

PT = {"live.convidado.titulo": "A jogar como Convidado — o progresso é teu, neste aparelho",
      "live.convidado.corpo": "O Mundo 3D (BATEU RPG e Aetheria) guarda o progresso neste aparelho, sem registo. A conta só é precisa para as recompensas da plataforma: pontos, carteira e sorteios.",
      "live.convidado.criar": "Criar conta",
      "live.convidado.entrar": "Entrar"}
EN = {"live.convidado.titulo": "Playing as a Guest — your progress is yours, on this device",
      "live.convidado.corpo": "The 3D World (BATEU RPG and Aetheria) saves progress on this device, no sign-up needed. An account is only required for platform rewards: points, wallet and raffles.",
      "live.convidado.criar": "Create account",
      "live.convidado.entrar": "Sign in"}
PTBR = {"live.convidado.titulo": "Jogando como Convidado — o progresso é seu, neste aparelho",
        "live.convidado.corpo": "O Mundo 3D (BATEU RPG e Aetheria) salva o progresso neste aparelho, sem cadastro. A conta só é necessária para as recompensas da plataforma: pontos, carteira e sorteios.",
        "live.convidado.criar": "Criar conta",
        "live.convidado.entrar": "Entrar"}
ES = {"live.convidado.titulo": "Juegas como Invitado — el progreso es tuyo, en este aparato",
      "live.convidado.corpo": "El Mundo 3D (BATEU RPG y Aetheria) guarda el progreso en este aparato, sin registro. La cuenta solo es necesaria para las recompensas de la plataforma: puntos, billetera y sorteos.",
      "live.convidado.criar": "Crear cuenta",
      "live.convidado.entrar": "Entrar"}
FR = {"live.convidado.titulo": "Vous jouez en tant qu'Invité — votre progression reste sur cet appareil",
      "live.convidado.corpo": "Le Monde 3D (BATEU RPG et Aetheria) enregistre la progression sur cet appareil, sans inscription. Un compte n'est requis que pour les récompenses de la plateforme : points, portefeuille et tirages.",
      "live.convidado.criar": "Créer un compte",
      "live.convidado.entrar": "Se connecter"}
HI = {"live.convidado.titulo": "अतिथि के रूप में खेल रहे हैं — आपकी प्रगति इस डिवाइस पर है",
      "live.convidado.corpo": "3D वर्ल्ड (BATEU RPG और Aetheria) प्रगति इस डिवाइस पर सहेजता है, पंजीकरण की ज़रूरत नहीं। खाता केवल प्लेटफ़ॉर्म पुरस्कारों के लिए चाहिए: पॉइंट, वॉलेट और लॉटरी।",
      "live.convidado.criar": "खाता बनाएं",
      "live.convidado.entrar": "लॉग इन करें"}

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
    bloco = "".join(f'    {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)},\n' for k, v in pares.items())
    linhas.insert(idx + 1, bloco)
    total += len(pares)
    print(f"  {chave_dict}: +{len(pares)} chaves")

with open(CAMINHO, "w", encoding="utf-8") as f:
    f.writelines(linhas)

print(f"TOTAL: {total} chaves inseridas")
