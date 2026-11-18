# REA — BATEU KART: Circuito das Lendas (v65)

**Data:** 2026-11-18 · **Pedido:** «Kart de corrida tipo Mario Kart, mas com longas corridas… onde cada um pode melhorar os carros e armas… e assim não teremos um jogo principal mas teremos vários jogos na plataforma — cria mesmo um tipo Mario Kart mas a melhor versão para se inspirar e ter como referência.»

## 1. O que é

O SEGUNDO mundo 3D da plataforma (a par da Arena das Lendas v63/v64): um kart racer
estilo Mario Kart com **corridas LONGAS** (3 pistas de 1,5-2 km, 3-5 voltas — 3,5-5,5 min
por corrida) e **GARAGEM**: as moedas ganhas em corrida melhoram o CARRO (motor, turbo,
pneus, blindagem) e as **ARMAS** (casca, casca-alvo, míssil, óleo, raio). 12 corredores
(jogador + 11 pilotos IA com personalidades e rubber-banding suave).

Referências de comportamento (padrão REA da casa — nada copiado, tudo reconstruído):
Mario Kart 8 (itens ponderados por POSIÇÃO — atrás = armas melhores; drift com
mini-turbo em 2 tiers; moedas que sobem a vel. máx.; rampas de turbo; grelha 2×6),
Trackmania (pistas longas com setores técnicos), hordes.io/arena v63 (núcleo isomórfico
puro pronto para um servidor autoritativo futuro).

## 2. Arquitetura (regra v63/v64 mantida)

- `src/game/kart/core.ts` — **NÚCLEO PURO** (browser E Node no MESMO código, zero
  imports): pistas Catmull-Rom fechadas reamostradas a ~2,5 u; física arcade (aceleração
  com teto por clamp, atrito 0,35/s, off-road a 42% do teto, barreiras macias a
  largura+9 u); **DERRAPAGEM** (grip do ângulo de movimento 0,42×, carga por tier
  0,9 s/2,0 s → MINI-TURBO azul/laranja); 8 itens com pesos por posição (`pesosItem`:
  o 1.º NUNCA recebe raio/míssil; os últimos recebem os melhores); projéteis (casca
  reta que morre fora da estrada, casca-alvo homing 3,5 rad/s, míssil homing 5,5 rad/s
  e stun 1,7 s), óleo (perigo estático, dono imune 1,5 s), raio (todos os outros, nunca
  o dono; escudo absorve), escudo 9 s, pacote de 3 cogumelos; moedas (+0,35 u/s de teto,
  cap +5); rampas de turbo; voltas por `sTotal` (grelha ATRÁS da linha, sTotal negativo
  → cruzar a linha = volta 1); posições por sTotal/tempo; recompensas por tabela
  (1.º = 400 + moedas×12 + bónus de voltas; XP 220 + moedas×4); garagem: 4 karts ×
  5 melhorias × 5 níveis (custos 140·238·405·688·1169), desbloqueio por nível+moedas;
  save validado (`validarSaveKart` — podre → omissão honesta); RNG determinística
  (mulberry32) para provas; `simularCorrida` (smoke test determinístico de corrida
  COMPLETA).
- `src/game/kart/motor.ts` — three.js SEM lógica própria: estrada/bordas por amostras
  (**fita com winding para cima + computeVertexNormals — a captura E2E apanhou a
  estrada invisível por winding invertido**), linha de partida em xadrez + portão,
  rampas com chevrons, caixas «?», moedas, decoração por tema (palmeiras/cactos/rochas
  e lava), 12 karts (corpo/cabine/piloto/4 rodas/alerão), chama de turbo, anel de
  faíscas de deriva por tier, escudo, projéteis e manchas de óleo dinâmicos, câmara de
  PERSEGUIÇÃO com FOV que abre com a velocidade, minimapa 2D, pausa honesta,
  `destruir()` dispose total e idempotente (lição v60), `?kart-leve=1` (pixelRatio
  1,25, metade da decoração), condução assistida (`dirigirAuto`) para telemóvel/E2E.
- `src/components/livegames/BateuKart.tsx` — menu (pistas bloqueadas por nível,
  voltas 3/4/5, cartão da garagem com stats vivos), garagem modal (karts com
  desbloqueio honesto + 5 linhas de melhorias com custo real), HUD arcade (posição
  «7º/12», volta, tempo, moedas, velocímetro km/h, slot de item, minimapa, contagem
  3-2-1-JÁ, «SENTIDO CONTRÁRIO!», flash de stun, toasts), pausa, resultados com payout
  + tabela de 12 + recorde, botões móveis grandes, save `bateu_kart_save` no aparelho
  (autosave no fim + no unmount), hooks E2E tipados `window.__kart`.
- **Integração na plataforma:** LiveHub — lazy import, `GameId` +`"kart"`, `GAME_DEFS`
  (🏎️, Flag), `isImmersiveWorld` +kart, portal `fixed inset-0` + `ToggleEcraInteiro` +
  `GameErrorBoundary`; `gamesCatalog.ts` (categoria nova «Corridas»,
  `LIVE_GAME_MODES` 84→85); `mundoConvidado.ts` — `JOGOS_SEM_KIT` +`"kart"`
  (progressão própria do aparelho, como o mmorpg); i18n `kart.*` ×64 chaves pt+en
  (es/fr/hi caem no EN pela cascata — padrão v62).

## 3. Honesto (o que fica)

- **Corridas são SOLO vs 11 IA** — corridas ONLINE são o passo seguinte DECLARADO
  (o HUD/menu diz-no; nada finge multiplayer). O núcleo já é isomórfico: um futuro
  `server/kart-servidor.mjs` reutilizaria `novaCorrida/passoCorrida` à mesma que o
  servidor da arena reutiliza o core do RPG.
- Progresso do convidado é DO APARELHO (moedas/XP/garagem/recordes em
  `bateu_kart_save`) — sincronizar entre dispositivos seria funcionalidade de conta.
- Sem som (nada finge som — mantido do v63/v64).
- A corrida termina quando o JOGADOR chega (padrão Mario Kart): os bots sem tempo
  ficam «—» na tabela, ordenados por progresso.
- As descrições das pistas e dos itens são PT canónico do motor com camada EN no i18n
  (padrão v62).

## 4. FUROS reais apanhados pelas provas (lições)

1. **Estrada INVISÍVEL na 1.ª captura** — o winding dos triângulos da fita estava
   virado para BAIXO (backface culled pela câmara de perseguição). A captura E2E
   (`shots-v65/kart-corrida.png` a mostrar só o chão azul) ERA a prova. Fix: winding
   para cima + `computeVertexNormals()` + `DoubleSide` nas fitas.
2. **Arrasto 1,1/s limitava a ~12 u/s** — o equilíbrio aceleração/atrito ficava MUITO
   abaixo do teto de 38 u/s (o clamp nunca atuava). Fix: atrito 0,35/s
   (equilíbrio ≈ 38,6 ≈ velMax) — o teto volta a ser o limitador, como desenhado.
3. **Projéteis morriam à nascença** — `amostraPerto(pista, x, z, 0)` com janela ±40 em
   volta do índice 0: um projétil disparado na fração 0.08 da pista «via» uma amostra
   a ~140 u e era morto como «fora da estrada». Fix: `ProjetilKart.iAmostra` próprio,
   atualizado a cada passo.
4. **Teleportes nos testes sem `iAmostra`** — a barreira macia puxava o kart de volta
   para a grelha (janela ±40 não vê saltos de 385 amostras). Os hooks de teste
   (`tpProgresso`, `tpCaixaMaisPerto`) e os setups sincronizam SEMPRE índice + sTotal.
5. **`dirigirAuto` apagava a pulsação do item** — o auto substituía `this.entrada`
   inteiro a cada frame; a pulsação de `usarItem` nunca chegava. Fix: a pulsação
   sobrevive à substituição.
6. **Pausa só React** — o botão abria o overlay mas o motor nunca parava. Fix:
   `useEffect([pausa]) → motor.pausar()`.
7. **`addInitScript` re-semeava o save no reload** — o teste de persistência lia o
   save semente, não o progresso. Fix: semear SÓ se a chave não existir.
8. **aetheria/MMORPG e o óleo da grelha** — o óleo largado atrás de um bot da grelha
   golpeava o vizinho da fila (4,5 u entre linhas): o teste move a mancha para um
   troço livre antes do passo (determinismo, não comportamento de jogo).
9. `arena-fade` (keyframes do flash de dano da ARENA, v63) **nunca existiu** no CSS —
   adicionado (o kart usa-o para o stun).

## 5. Provas (todas no estado final do código)

- **GATES:** `tsc -b` 0 · `tsc app` 0 · `build` OK (precache 311 entradas).
- **test-kart-v65.mjs NOVO — 65 verdes ×2 corridas consecutivas, 0 skips:**
  - A núcleo ×35: pistas longas ≥1500 u · determinismo · amostraPerto monotónica ·
    stats/custos/teto · XP inverso · recompensas · save sanitizado · desbloqueio ·
    pesos de itens por posição (2000 rolos) · grelha/contagem · teto/off-road ·
    DERIVA→MINI-TURBO · caixa/moeda · casca acerta · casca-alvo homing · míssil ·
    óleo · raio · escudo · 3 cogumelos · **corrida COMPLETA determinística** com
    payout/posicoes/recorde TRUE e FALSE.
  - B E2E ×30: menu no hub com nota honesta · garagem COMPRA de facto (LS −140) ·
    foguetinho bloqueado por nível · largada · 12 corredores · kart anda (vel > 20) ·
    caixa→item→uso com efeito real · pausa/retomar congela o motor · volta por
    progresso · **CHEGADA real** com resultados + payout + recorde · persistência
    após reload · ZERO pageerror · shots-v65/ (menu, corrida com estrada, resultados).
- **Regressão:** test-arena-rpg-v63 **77/0** · test-pvp-v64 **53/0** ·
  test-web-v262 **11/0** (com vite externo no 8099, padrão v61).

## 6. Passos futuros declarados

- Corridas ONLINE (servidor autoritativo a 30 TPS reutilizando o core — o mesmo
  caminho da arena v63→v64).
- PvP entre karts já existe via itens; um modo «torneio/copas» com várias pistas
  (padrão Mario Kart Grand Prix) é a extensão natural da garagem.
- Som (motor, itens, turbo) e equipa/pits decorativos.
