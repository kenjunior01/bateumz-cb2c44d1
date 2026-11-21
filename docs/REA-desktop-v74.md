# REA v74 — DESKTOP REAL
## O que este documento regista
A v74 é a versão que leva a sério o ecrã grande. O pedido foi direto: «faz upgrade do visual da versão desktop também para que esteja muito bem». O desktop da plataforma ERA um telemóvel esticado: o navbar tinha classes CSS fantasma, o hub escondia os jogos, o menu do kart era uma coluna estreita no meio de um monitor de 1600px. Este REA regista cada furo fechado e cada decisão de layout, com a prova no fim.

## §1 — O diagnóstico (com screenshots ANTES)
Screenshots do estado anterior ficaram em `shots-v74/desktop-*.png` (primeira tanda, capturada antes das mudanças):
- **Home desktop**: o orb «ao vivo» do navbar partia em três linhas (`0 0` / `Ao` / `Vivo`) — o logo colidia com ele.
- **Hub desktop**: as Rádios PALOP nasciam ACIMA da grelha de jogos (os 21 jogos ficavam por baixo da dobra); o hero era `max-w-2xl` com a metade direita do ecrã MORTA; sem barra de pesquisa nenhuma (o `MobileDiscoveryHeader` é `md:hidden`).
- **Kart desktop**: menu de coluna única centrada, laterais vazias de 400px de cada lado.
- **Tetris/Espaço**: sem legenda de teclas num dispositivo cuja principal forma de input É o teclado.

## §2 — Navbar: as 8 classes fantasma (furo real, fechado)
O `Navbar.tsx` referenciava desde a v9: `navbar-spotlight`, `navbar-scroll-progress`, `navbar-aurora-strip`, `navbar-scrolled`, `navbar-logo-ring`, `navbar-brand-text`, `navbar-verified-dot`, `navbar-live-orb`, `navbar-live-orb-ring`, `navbar-trigger`, `navbar-group-icon` — **nenhuma tinha uma linha de CSS**. Implementação completa no bloco v74 do `src/index.css`:
- `.navbar-live-orb` — caixa pill de 30px de altura, `white-space: nowrap` (fim do wrap), gradiente rosa/violeta, borda, hover que levanta 1px. IMPORTANTE: não define `display` — o `hidden md:inline-flex` do tailwind manda, o mobile não vê orb nenhum.
- `.navbar-live-orb-ring` — ponto de 8px com anel de pulso em keyframes próprias (`navbar-orb-pulse`).
- `.navbar-logo-ring` — anel `conic-gradient` primário→acento em volta do logo, sombra que cresce no hover do grupo.
- `.navbar-verified-dot` — 15px, gradiente azul, sombra.
- `.navbar-spotlight` — halo radial no topo esquerdo (pointer-events: none).
- `.navbar-aurora-strip` — três orbes de cor difusos atrás do vidro.
- `.navbar-scroll-progress` — barra de 2px no rodapé, `transform-origin: 0 50%`, scaleX por motion.
- `.navbar-scrolled` — `blur(18px) saturate(1.4)` quando rolado.
- `.navbar-trigger`/`.navbar-group-icon` — ícone em caixa primária de 18px.
- `.desktop-ambient` — dois brilhos difusos com `ambient-drift` (14s/18s alternado), `hidden lg:block` no hub.

## §3 — Hub desktop (src/pages/LiveHub.tsx)
1. **Hero em 2 colunas ≥lg**: `lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]`. À direita, `livehub-hero-desktop`: cartão «Destaque de hoje» do BATEU KART (label/desc do próprio catálogo GAMES — nada hardcoded) + linha «12 pilotos · online partilhado · garagem com upgrades» + CTA JOGAR, e 3 atalhos (Tetris, Guerra Espacial, Xadrez) que chamam `setActive(id)` — abrir um clássico passou a custar UM clique a partir do hero.
2. **Ordem real de desktop**: a secção ganha `lg:flex lg:flex-col` e os filhos ganham `lg:order-*` — destaque kart (1) → grelha (2) → conteúdo do jogo (3) → desafios (4) → lives agora (5) → rádios (6). O DOM não mudou de sítio: no telemóvel a ordem original é mantida (flex só existe ≥lg). Prova por `boundingBox`: y do destaque 606 < y das rádios 4084.
3. **Pesquisa desktop**: `livehub-busca-desktop` (o desktop NÃO tinha pesquisa nenhuma) — filtra a grelha de verdade (`jogosFiltradosDesktop`, label+desc, useMemo) com contagem «21 de 21 jogos». Prova: escrever «Tetris» deixa 2 cartões.
4. **Grelha**: `xl:grid-cols-5` (5 colunas a 1600px, provado), cartões com `group hover:-translate-y-1` e chip «JOGAR ▶» que aparece no hover.

## §4 — Kart desktop (SÓ o menu; corrida/batalha/garagem intocadas)
Menu ≥lg em duas colunas (`max-w-6xl`, `lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]`): esquerda pistas+voltas+garagem+CORRER!+BATALHA; direita sala ONLINE + DESAFIOS DE EMPRESAS — os prémios patrocinados ficam VISÍVEIS no desktop (Δy entre colunas 39px, provado). Telemóvel mantém a coluna única; nenhum testid mudou (`kart-pista-*`, `kart-volta-*`, `kart-garagem`, `kart-entrar`, `kart-batalha`, `kart-online-painel`, `kart-desafios-painel`, `kart-save-info`).

## §5 — Tetris + Guerra Espacial desktop
- **Tetris** (`tetris-legenda-desktop`, `hidden lg:flex`): teclado completo em kbd chips (←→ mover, ↓ descer, ↑/X rodar, Z rodar←, Espaço queda dura, C hold, P pausa) + painel de pontuação clássica (1→100, 2→300, 3→500, TETRIS→800 × nível, COMBO +50×n, B2B ×1,5).
- **Guerra Espacial** (`espaco-legenda-desktop`, `hidden lg:grid` 3 cartões): controlos P1 (A/D+W) e P2 (←/→+↑), power-ups (M escudo, S duplo, L laser, D drone, tanque GARANTE um), IA dos 5 inimigos (scout zigue-zague · fighter ATIRA e desvia · tank 3 vidas · kamikaze mergulha · splitter divide-se).
- Telemóvel NÃO vê nenhuma (assert na suíte a 375px).

## §6 — Furos i18n fechados (apanhados pela prova visual)
- `livehub.game.kart`/`livehub.game.kart.desc` **não existiam em nenhum idioma** — o jogo PRINCIPAL da plataforma aparecia como chave crua «livehub.game.kart» no hub (grelha e cartão de destaque). Chaves adicionadas a en/pt/es («BATEU KART: Circuito das Lendas» + descrição).
- `livehub.game.snakesladders`/`.desc` idem — «Cobras e Escadas» + desc em en/pt/es.
- Suíte agora ASSERTA que nem o hero nem a grelha contêm «livehub.game.» cru.

## §7 — Prova (test-desktop-v74.mjs, 35 verdes ×2, 0 falhas, 0 skips)
- **A. Navbar (6)**: orb presente, altura 30.0px, `scrollWidth 99 ≤ clientWidth 99` (SEM wrap), border-radius de pill, anel com box-shadow, aurora+spotlight+progresso presentes.
- **B. Hub (12)**: hero ≥lg, kart destaque SEM chave crua, 3 atalhos, 5 colunas a 1600px, pesquisa visível e que filtra, ordem jogos<rádios e grelha<rádios por boundingBox.
- **C. Kart (9)**: wrapper com `display:grid` computado a 1600px, 7 testids visíveis, colunas lado a lado.
- **D. Legendas (2) + mobile intocado (4)**: legendas visíveis ≥lg; em 375px hero/pesquisa/orb/legendas INVISÍVEIS.
- **E. Estabilidade**: ZERO pageerror em home/lives/kart/tetris/espaco (desktop) e mobile.
- Shots em `shots-v74/` (5 ANTES + 5 DEPOIS).

## §8 — Regressão completa (a régua habitual)
test-classic-v72 **53/0** (a 1.ª corrida dentro do runner caiu por CORRIDA DE LAUNCHERS — a suíte classic faz `pkill` do seu próprio vite e o do runner o matou a meio; standalone 53/0, código nem tocado) · test-desafios-v70 **36/0** · test-kart-v65 **65/0** · test-kart-online-v66 **61/0** · test-kart-batalha-v68 **30/0** · test-gfx-v69 **28/0** · test-som-v67 **58/0** · test-regional-v73 **60/0** · test-web-v262 **11/0** · GATES: `tsc -b` 0 · `tsc app` 0 · `build` OK (52s).

## §9 — Honesto (o que fica)
`.desktop-ambient` é CSS puro (sem canvas pesado — a régua de performance dos jogos intocada); o painel de destaque lê o catálogo GAMES (se um jogo mudar de id, o painel deixa de o mostrar em vez de inventar); as rádios continuam lista vertical no desktop (abaixo da grelha já não enterram os jogos; grelha de rádios em 2 colunas é o passo seguinte se o utilizador pedir); `fr` não tem chaves `livehub.game.*` (cai no fallback de idioma, como desde a v72).
