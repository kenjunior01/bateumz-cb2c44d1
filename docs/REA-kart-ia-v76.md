# REA v76 — IA DE ELITE DO CIRCUITO (BATEU KART)

**Pedido-mãe:** «melhore a inteligência dos jogos» (linha contínua desde a v72) — a v72 deu IA de verdade a Damas/Cobras, a v73 deu IA ESQUIVA à Guerra Espacial; o BATEU KART era o último flagship sem uma passada de IA dedicada desde a v65. A v76 fecha esse buraco: os 11 bots agora CONDUZEM contra os perigos em vez de os comer todos.

## 1. O que mudou (em 6 capacidades novas)

1. **ESQUIVA DE PROJÉTEIS** — casca reta (atenção ≤ 46 u), casca-alvo e míssil teleguiados (atenção ≤ 62 u — «vem atira-se-me»): o bot cria uma lateral DINÂMICA (`iaDesvio`, novo campo de `Corredor`) PARA LONGE da lateral do perigo, com teto ±5,8 u (dentro da estrada; `fugirDe` troca de lado quando o lado natural morde a berma). O míssil conta 1,0 · casca-alvo 0,85 · casca 0,7.
2. **DESVIO DE ÓLEO** — mancha na linha (lateral < 4,4 u, alcance 48 u) → contorno com força 1,0; a mancha do PRÓPRIO bot é ignorada só nas primeiras 2 s (a física perdoa 1,5 s — o bot contorna a própria a partir das 2).
3. **TRÂNSITO** — kart colado à frente (≤ 14 u) na mesma linha (lateral < 3,4 u) → desvio lateral fraco (0,55) que evita o choque (que custa velocidade aos DOIS) e toma a linha por fora.
4. **ESCUDO INTELIGENTE** — com míssil/casca-alvo no bolso do radar, o escudo NÃO é gasto à toa: fica guardado até o perigo chegar a < 28 u, e o golpe MORRE nele.
5. **ITENS COM CABEÇA** — turbo só na RETA (`curvaFrente(16) < 0,0028`, régua calibrada nas 3 pistas: as retas mais limpas medem 0,0017-0,0019); casca/casca-alvo/míssil não desperdiçados em alvo COM escudo; óleo só largado com alguém colado atrás (< 55 u de sTotal).
6. **REAÇÃO À LARGADA** — `iaLargada` novo: bots arrancam 0,08…0,37 s depois do «JÁ» (melhor `iaSkill` → reflexo mais curto); humanos têm 0 — o jogador bem afinado GANHA a largada de facto.

A destreza (`skill = clamp((iaSkill-0,78)/0,17, 0,25, 1)`) escala TODA a esquiva: a frota tem personalidade — bots fracos (0,82) esquivam a 25%, os de elite (0,95) a 100%.

## 2. Como está feito (tudo no NÚCLEO PURO)

- `src/game/kart/core.ts` — `iaDecidir` reordenada: largada → rubber-band → **DESVIO (projéteis > óleo > trânsito)** → direção → travagem/deriva → itens. O desvio é calculado ANTES da direção e, com ameaça ativa, o olhar ENCOLHE para 55% (`lookEfetivo`) — o volante responde à fuga AGORA em vez de surrar um ponto 50 u à frente. Dinâmica do desvio: sobe a 9 u/s com ameaça, relaxa a 2,2 u/s sem ela. Tudo determinístico (só matemática sobre o estado; os 4 campos novos `iaDesvio`/`iaLargada` nascem nas duas fábricas, `novaCorrida` e `novaCorridaOnline`).
- `server/kart-servidor.mjs` — os 2 sítios que convertem humano desligado em piloto-IA ganham `iaDesvio = 0; iaLargada = 0` (a meio da corrida não há largada a esperar).
- `src/components/livegames/BateuKart.tsx` + `LanguageContext.tsx` (pt/en) — linha de legenda `kart.menu.ia` no menu («IA ELITE (v76)…»), testid `kart-menu-ia`.

## 3. FURO REAL PRÉ-EXISTENTE fechado

**O míssil/casca-alvo perseguiam o kart ERRADO em ONLINE.** `passoCorpo` fazia `e.corredores[p.alvo]` — indexava o ARRAY com um ID de corredor. Em solo id === índice e ninguém via; em ONLINE os ids vêm de `SLOTS_REDE` (slot 6 → corredor id 1), por isso o míssil disparado ao corredor da frente homingava para OUTRO kart qualquer sentado nesse índice. Fix: `e.corredores.find((cc) => cc.id === p.alvo)` — semântica por ID a valer nos dois modos. Apanhado pela suíte nova (secção D: o míssil fugia para longe em vez de perseguir).

## 4. Prova — `test-kart-ia-v76.mjs` (NOVO, puro Node, 49 verdes ×2 corridas)

- **A) Largada (7):** 12 bots sem humanos; `iaLargada` ∈ (0,04; 0,4); SOLO jogador 0; todos parados no instante zero; rápido (0,05 s) acelera aos 0,10 s enquanto o lento (0,30 s) está parado; aos 0,50 s todos arrancaram.
- **B) Esquiva (8):** míssil teleguiado 40 u atrás com lateral +2 → `iaDesvio` > 1 e para o lado CONTRÁRIO; teto 5,8 respeitado; elite 0,95 desvia mais que fraco 0,82; integração: casca reta disparada 20 u atrás num troço reto de 100 u → bot esquivou (desvio máx > 1), NENHUM golpe, casca expirou sem vítima.
- **C) Óleo (4):** mancha 30 u à frente na linha → desvio acordou, o bot cruzou o troço SEM cair, mancha sobrevive.
- **D) Escudo (4):** míssil a 40 u → escudo fica no bolso (sem «uso»); míssil a 10 u → levantado na hora; o míssil chega e MORRE no escudo (evento `escudo`, sem stun).
- **E) Itens (6):** turbo gasto na reta / guardado na curva (régua = a do bot); casca-alvo guardada com alvo com escudo e disparada sem; óleo guardado sem ninguém atrás e largado com rival colado (rolo 75% determinístico ≤ 6 tentativas).
- **F) Trânsito (2):** desvio lateral acordou com kart colado à frente; nenhum golpe.
- **G) Relaxa (2):** desvio sobe com ameaça e volta a ≈0 em 1 s de pista livre.
- **H) Rubber-band intacto (2):** 1,07 / 0,93 exatos.
- **I) Determinismo (2):** mesma semente → hash de posições idêntico em 5 s; progresso real.
- **J) Corrida completa (12):** as 3 pistas terminam com a IA nova, 12 posições únicas com nomes, payout honesto, SEM NaN.

## 5. Regressão completa (sobre o código final)

test-kart-v65 **65/0** · test-kart-online-v66 **61/0** · test-kart-batalha-v68 **30/0** · test-gfx-v69 **28/0** · test-som-v67 **58/0** · test-desafios-v70 **36/0** · test-classic-v72 **53/0** · test-regional-v73 **60/0** · test-desktop-v74 **35/0** · test-web-v262 **11/0** · GATES: `tsc -b` 0 · `tsc app` 0 · build OK.

## 6. Honesto (o que fica)

- A esquiva é LATERAL sobre a linha pessoal — não há antecipação de trajetória de casca (a casca reta que passa longe da linha nem acorda o bot; é intencional, poupa CPU).
- Bots de destreza baixa COMEM óleo e cascas com frequência real — é a personalidade da frota (o jogador sobe de nível e os rivais melhoram na média pela mistura de karts).
- Com destreza de elite + pista larga, um míssil teleguiado pode orbitar e expirar sem acertar (a física do homing tem raio de volta 10 u) — escudo e timing continuam a ser a resposta certa; o jogador NÃO esquiva (as entradas são dele).
- `iaLargada` não existe para humanos de propósito: a largada do jogador continua a ser o seu reflexo, sem minijogo novo.
