#!/usr/bin/env python3
# v79 — i18n do CICLO À VISTA: destinos de topo «Prémios»/«Jogos» no navbar.
# Insere as chaves novas em TODOS os blocos de idioma, logo a seguir à âncora
# "nav.group.raffles" (presente nos 6 blocos). Per-key fallback cobre falhas.
import re, sys

PATH = "src/contexts/LanguageContext.tsx"

# idioma -> {chave: valor}
KEYS = {
    "en": {
        "nav.group.premios": "Prizes",
        "nav.group.jogos": "Games",
        "nav.premios.ciclo": "The prize cycle",
        "nav.premios.ciclo.desc": "Games earn points, points earn levels and levels unlock prizes — see the whole cycle",
        "nav.mypoints": "My points",
        "nav.mypoints.desc": "Your level, daily missions and progression on Bateu",
        "nav.quick.premios": "Prizes",
    },
    "pt": {
        "nav.group.premios": "Prémios",
        "nav.group.jogos": "Jogos",
        "nav.premios.ciclo": "O ciclo de prémios",
        "nav.premios.ciclo.desc": "Jogos geram pontos, pontos geram níveis e níveis desbloqueiam prémios — vê o ciclo completo",
        "nav.mypoints": "Os meus pontos",
        "nav.mypoints.desc": "O teu nível, as missões do dia e a tua progressão no Bateu",
        "nav.quick.premios": "Prémios",
    },
    "pt-BR": {
        "nav.group.premios": "Prêmios",
        "nav.group.jogos": "Jogos",
        "nav.premios.ciclo": "O ciclo de prêmios",
        "nav.premios.ciclo.desc": "Jogos geram pontos, pontos geram níveis e níveis desbloqueiam prêmios — veja o ciclo completo",
        "nav.mypoints": "Meus pontos",
        "nav.mypoints.desc": "Seu nível, as missões do dia e sua progressão no Bateu",
        "nav.quick.premios": "Prêmios",
    },
    "es": {
        "nav.group.premios": "Premios",
        "nav.group.jogos": "Juegos",
        "nav.premios.ciclo": "El ciclo de premios",
        "nav.premios.ciclo.desc": "Los juegos generan puntos, los puntos generan niveles y los niveles desbloquean premios — mira el ciclo completo",
        "nav.mypoints": "Mis puntos",
        "nav.mypoints.desc": "Tu nivel, las misiones del día y tu progresión en Bateu",
        "nav.quick.premios": "Premios",
    },
    "fr": {
        "nav.group.premios": "Prix",
        "nav.group.jogos": "Jeux",
        "nav.premios.ciclo": "Le cycle des prix",
        "nav.premios.ciclo.desc": "Les jeux génèrent des points, les points génèrent des niveaux et les niveaux débloquent des prix — voir le cycle complet",
        "nav.mypoints": "Mes points",
        "nav.mypoints.desc": "Ton niveau, les missions du jour et ta progression sur Bateu",
        "nav.quick.premios": "Prix",
    },
    "hi": {
        "nav.group.premios": "पुरस्कार",
        "nav.group.jogos": "गेम्स",
        "nav.premios.ciclo": "पुरस्कार चक्र",
        "nav.premios.ciclo.desc": "गेम्स पॉइंट देते हैं, पॉइंट लेवल देते हैं और लेवल पुरस्कार खोलते हैं — पूरा चक्र देखें",
        "nav.mypoints": "मेरे पॉइंट",
        "nav.mypoints.desc": "आपका लेवल, दिन के मिशन और Bateu पर आपकी प्रगति",
        "nav.quick.premios": "पुरस्कार",
    },
}

# ordem dos blocos no ficheiro
LANGS = ["en", "pt", "pt-BR", "es", "fr", "hi"]

def main():
    with open(PATH, "r", encoding="utf-8") as f:
        src = f.read()

    # localiza cada bloco:  "pt-BR": {  /  pt: {  (aspas opcionais)
    blocos = []
    for lang in LANGS:
        m = re.search(r'^(\s{2})"?%s"?: \{$' % re.escape(lang), src, flags=re.M)
        if not m:
            print(f"ERRO: bloco {lang} não encontrado"); sys.exit(1)
        blocos.append((lang, m.start(), m.end()))

    # insere de trás para frente (posições estáveis)
    linhas = src.split("\n")
    # trabalhamos por linha: encontra a linha âncora dentro de cada bloco
    def fim_do_bloco(idx_linha_inicio):
        i = idx_linha_inicio
        while i < len(linhas):
            if re.match(r'^\s{2}\},\s*$', linhas[i]):
                return i
            i += 1
        raise SystemExit("fim do bloco não encontrado")

    saida = list(linhas)
    for lang, ini, fim in reversed(blocos):
        # linha do início do bloco (0-based)
        li = src[:ini].count("\n")
        fj = fim_do_bloco(li)
        # âncora: "nav.group.raffles" dentro do bloco
        anc = None
        for i in range(li, fj):
            if '"nav.group.raffles"' in saida[i]:
                anc = i; break
        if anc is None:
            print(f"ERRO: âncora ausente no bloco {lang}"); sys.exit(1)
        vals = KEYS[lang]
        inserir = [f'    "{k}": {v!s},'.replace("'", '"') for k, v in vals.items()]
        # formata valores com aspas (strings já têm apóstrofos? não) — usa json-like
        inserir = ['    "%s": "%s",' % (k, vals[k]) for k in vals]
        saida[fj:fj] = inserir
        # comentário de topo
        saida[fj:fj] = ["    // v79 ciclo à vista — destinos de topo"]
        print(f"{lang}: +{len(vals)} chaves após linha {anc+1}")

    with open(PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(saida))
    print("OK — i18n v79 aplicado")

if __name__ == "__main__":
    main()
