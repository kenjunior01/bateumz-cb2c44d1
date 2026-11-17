#!/usr/bin/env python3
# v62 — chaves home.* da nova homepage (items 6+8) em pt/en; es/fr/hi caem
# no EN pela cascata e pt-BR no PT.
import json, sys

CAMINHO = "src/contexts/LanguageContext.tsx"

PT = {
  "home.cta.mundo": "Entrar no Mundo 3D",
  "home.cta.nota": "Grátis, sem registo — o progresso fica no teu aparelho",
  "home.sorteios.titulo": "Sorteios & Concursos",
  "home.sorteios.sub": "Descoberta com dados reais da plataforma — progresso e prazos à vista",
  "home.loja.titulo": "Loja & Mercado",
  "home.loja.sub": "O que as empresas verificadas estão a vender agora",
  "home.historias.sub": "Histórias do topo — criadores e plataforma, ao vivo",
  "home.atividade.titulo": "Atividade da plataforma",
  "home.atividade.sub": "Só acontecimentos reais: vencedores, prazos e sessões",
  "home.verTudo": "Ver tudo",
}
EN = {
  "home.cta.mundo": "Enter the 3D World",
  "home.cta.nota": "Free, no sign-up — your progress stays on this device",
  "home.sorteios.titulo": "Raffles & Contests",
  "home.sorteios.sub": "Discovery with real platform data — progress and deadlines in sight",
  "home.loja.titulo": "Shop & Market",
  "home.loja.sub": "What verified businesses are selling right now",
  "home.historias.sub": "Top stories — creators and the platform, live",
  "home.atividade.titulo": "Platform activity",
  "home.atividade.sub": "Only real events: winners, deadlines and sessions",
  "home.verTudo": "See all",
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
