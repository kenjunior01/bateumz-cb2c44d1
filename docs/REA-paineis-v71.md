# REA v71 — PAINÉIS DE MARCAS NO CIRCUITO (a plataforma VIVA no mundo 3D)

Pedido de origem (2026-11-19): «…empresas podem lançar um desafio ou uma espécie de prémios para o jogo». A v69/v70 (neste ramo) trouxe os gráficos de próxima geração e o sistema de DESAFIOS DE EMPRESAS (catálogo + Sala de Patrocínios no hub). A v71 fecha o círculo que faltava: **as marcas anunciam os desafios DENTRO do circuito 3D** — quem corre vê a publicidade da empresa que paga o prémio.

## §1 — O que foi adicionado

- **`texturaPainelMarca(d)`** (motor.ts): quadro canvas 256×128 com a cor da marca (`empresa.cor` CSS hex), **logótipo gerado** (iniciais num disco), nome, tagline, título do desafio e faixa «DESAFIO +N moedas» — a mesma identidade que os cartões do menu/hub, agora no mundo.
- **`construirPaineisMarcas(def)`**: 8 painéis do `CATALOGO_DESAFIOS` + **os 4 desafios CUSTOM mais recentes da Sala de Patrocínios** (`lerCustom().slice(-4)` — teto honesto de 12), espaçados ao longo da pista por amostras, lados alternados, `largura + 4,6 u` de lateral, com pernas; `rotation.y` orienta a face do texto PARA a estrada (BoxGeometry com material por face — texto na +z, costas escuras sem texto espelhado).
- **Nos DOIS caminhos** (ALTA e LEVE): os painéis são **conteúdo da plataforma, não um efeito de qualidade gráfica** — o jogador de telemóvel/APK/`?kart-leve=1` vê a mesma publicidade. No ALTA `castShadow/receiveShadow = true` (as marcas também lançam sombra dinâmica).
- **Gancho honesto**: `graficos().paineisMarcas` (nº de painéis) + limpeza em `destruir()` (`paineisMarcas = []`; geometrias/materiais/texturas pelos registos existentes).

## §2 — Integração com o sistema v70

- O motor importa `CATALOGO_DESAFIOS` e `lerCustom` de `src/lib/desafios.ts` (núcleo puro, seguro em Node — a suíte gfx importa o motor no browser apenas).
- **A Sala de Patrocínios fica REAL no mundo**: um desafio criado por uma «empresa» no hub aparece como painel publicitário na pista da corrida seguinte. Nada de backend inventado — o conteúdo vive no aparelho como o resto, declarado na UI da v70.
- As metas continuam as 7 da v70 (pódio por pista/modo, corridas, vitórias, moedas numa corrida, caixas «?», balões, online) — os painéis são PUBLICIDADE, não alteram contagens.

## §3 — Prova

- `test-gfx-v69.mjs` 26→**28 verdes ×2 corridas consecutivas** (+2 asserções: `paineisMarcas === 8` em ALTA e em LEVE via `graficos()`) — shots `shots-v69/kart-alta-corrida.png` (painel legível em jogo, com bloom/sombras).
- Regressão completa re-feita sobre o código final: `test-desafios-v70` **36/0** · `test-kart-v65` **65/0** · `test-kart-batalha-v68` **30/0** · `test-som-v67` **58/0** · `test-kart-online-v66` **61/0** · `test-web-v262` **11/0** · GATES: `tsc -b` 0 · `tsc app` 0 · build OK.

## §4 — Honesto (o que fica)

- As marcas são fictícias (catálogo v70) e a UI já o declara; os painéis 3D usam as MESMAS marcas fictícias — nenhum contrato real é simulado.
- Teto de 12 painéis (8 catálogo + 4 custom recentes): draw calls e texturas limitados de forma honesta; desafios custom mais antigos continuam no hub/menu (apenas NÃO ganham painel).
- FURO de caminho apanhado pelo tsc: `../lib/desafios.ts` de `src/game/kart/` não resolve — o import correto é `../../lib/desafios.ts`.
