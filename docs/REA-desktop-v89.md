# REA — v89 «DESKTOP DE PRODUTO» — a progressão sobe para o hero do hub + kart com ARTE real + conteúdo específico

## §1 — O pedido e a integração honesta

«**Quero no design da versão desktop melhore bastante**» — e a história desta
tarefa é a de uma REBASE honesta: o clone local da sandbox estava na v78
(reset para origin/main no arranque), mas o remoto já tinha evoluído até
**v88** (a sessão paralela fez a v85 «DESKTOP VIVO» — a dobra em duas colunas
na HOME com painel vivo de progressão — e a v88 «DESIGN DESKTOP» — overflow do
hub, contraste do rodapé, caixa preta do RollUp, folga de /tournaments). A
resposta correta NÃO foi fazer força (zero force-push): a v89 foi **rebasing
sobre a v88** e passou a conter SÓ o que ainda faltava no desktop do HUB
(/lives) — a superfície que a v85/v88 não tocaram:

1. **Progressão acima da dobra no hub** — painel compacto do ciclo Pontos →
   Nível → Missões → Prémios na coluna direita do hero do hub (na home a v85
   já tinha o painel vivo; no HUB o jogador continuava a ver os números só
   DEPOIS de rolar).
2. **Cartões genéricos → conteúdo específico no hub** — os três atalhos do
   hero diziam «clássico · direto» (igual ×3); agora dizem o que o jogo DÁ:
   minutos reais + teto de pontos + dificuldade, do CATÁLOGO (fonte única da
   v78 — nada inventado).
3. **KART do hero imagizado + prémio visível** — o emoji 🏎️ sai e entra a
   ARTE REAL (cena SVG `ArtKart` do catálogo) + chip do prémio «🏆 Até 120
   pontos» (teto `pontosMaxDe("kart")`).
4. **Topo do hub comprimido** — hero `py-12 → py-8` em ≥lg (a progressão cabe
   acima da dobra).
5. **Sync de estado entre superfícies** — o `gravar()` da store anuncia
   `bateu:progressao`; os ouvintes re-leem FRESCO da chave ativa (v84
   compatível — nenhuma segunda store, nenhum snapshot velho).
6. **FLAKE de data UTC fechado NA SUÍTE retencacao-v78** (o jogo nem tocou).

## §2 — O que foi construído

### §2.1 — `ProgressoHero.tsx` NOVO (`src/components/progressao/`)

Versão COMPACTA e **só-de-leitura** do ciclo para o hero do hub (≥lg): pontos
grandes, chip de nível com nome, barra até ao próximo nível, as TRÊS carteiras
separadas (Bilhetes ≠ Prémios ≠ Saldo — regra do produto), missão do dia com
estado real (`em curso`/`completa`/`reclamada`) e CTA «Ver progressão
completa» que rola ao painel completo. Regras da casa:

- LÊ a MESMA store via `useProgressao` — **não existe segunda store**;
- **NÃO reclama e NÃO ouve o bus `bateu:partida`** — o PainelProgressao
  continua o ÚNICO dono das mutações (uma partida nunca é registada duas
  vezes — a suíte C1-C3 PROVA: +120 IGUAIS nas duas superfícies);
- compatível com a store v84 (gestor da conta singleton): o hook continua a
  devolver `{ estado, nivel }` e a sincronização usa o anúncio novo;
- i18n ×6 (en, pt, pt-BR, es, fr, hi): 16 chaves novas `livehub.hero.*` +
  3 chaves `livehub.dif.*` nos 5 dicionários (pt-BR herda pt).

### §2.2 — Sync (`progressaoStore.ts`, delta mínimo sobre a v84)

`gravar()` dispara `bateu:progressao` DEPOIS de escrever; o `useProgressao`
ouvi-lo-á e re-lê com `ler(chaveAtiva(), usuarioAtivo)` — a leitura FRESCA da
v84, sem confiar em snapshots. A suíte C PROVA o ciclo completo numa página só
(uma partida anunciada no bus sobe os dois painéis juntos e IGUAIS).

### §2.3 — Hero do hub (LiveHub.tsx)

- Kart card: `GameArt` real (64 px, cena `ArtKart`) em vez do emoji, chip do
  prémio com o número REAL do catálogo; testids novos `livehub-hero-kart-art`
  e `livehub-hero-kart-pontos`.
- `ProgressoHero` entre o kart e os atalhos (testid `progressao-hero`, com
  `progressao-hero-pontos/nivel/barra/carteiras/missao/ver` — prefixo que NÃO
  colide com os do painel completo da v78).
- Atalhos tetris/spaceshooter/chess: `livehub-hero-atalho-info-{id}` com
  «Até 100 pts · ~5 min · Média» etc. — dados de `ALL_GAMES` (o `GAME_DEFS`
  local só tem id/icon/emoji/grad; o tsc apanhou o furo e a fonte certa é o
  catálogo).
- Hero container: `py-6 md:py-10 lg:py-8` (era `md:py-12`).
- As grelhas `minmax(0,1fr)_minmax(360px,440px)` (hero) e
  `minmax(0,1fr)_minmax(0,320px)` + `min-w-0` (game-content-area) da v85/v88
  ficam INTACTAS (a v89 não as toca — nota: a leitura do diff por texto solto
  chegou a sugerir um «inmax» sem `[`; verificado BYTE A BYTE com Python — o
  `[minmax` está correto no remoto; era um artefacto de renderização da saída,
  não um furo real).

### §2.4 — FIX de FLAKE na suíte v78 (honesto, sem alterar o jogo)

O `test-retencacao-v78` partia a 25/26-11 (36/2): as missões do dia são
semeadas por (dia LOCAL + jogadorId) e em headless o dia local é UTC — a
rotação do dia corrente não continha «joga-kart». **Provado com baseline**:
v78 LIMPO (7 ficheiros src revertidos com stash) falha EXATAMENTE o mesmo
36/2. Fix na SUÍTE (não no jogo): `Date.now()` fixo no dia autorado
(2026-11-22) por `addInitScript` → o CICLO é determinístico para sempre.
`test-home-dinamica` também falhava 17/5 em v78 limpo — suíte STALE da era
v26 (roll-ups «Bateu World 3D» removidos na v62/v68a; nunca esteve nas listas
de regressão recentes) — mantida como está, fora do âmbito.

## §3 — Provas

- **test-desktop-v89.mjs NOVO — 37 verdes ×2 corridas, 0 falhas, SOBRE A
  INTEGRAÇÃO (v88 + v89)** (A hub 1280×800: 13 — sem overflow, painel inteiro
  acima da dobra, pontos reais da store, nível, barra, 3 carteiras, missão,
  arte SVG do kart, prémio «120», 3 atalhos específicos, zero chaves cruas,
  painel completo presente · B hub 1600×900: sem overflow, grelha 5 colunas e
  ordem jogos-acima-das-rádios mantidas · C ciclo REAL: +120 IGUAIS no hero e
  no painel completo · D home 1600×900: sem overflow, dobra da v85 não nasce
  por baixo do navbar (y=139 ≥ fundo 74), dobra inteira acima de 900 px,
  TrustBar 27 px, navbar 74 px (reescrita v79-v88, fora do âmbito) · E mobile
  390: painel hero FORA, painel completo DENTRO, sem overflow · F i18n:
  «YOUR PROGRESSION»/«POINTS»/«Up to 120 points»/«Medium» em EN · G ZERO
  pageerror).
- **Regressão sobre a integração**: test-retencacao-v78 **38/0** ·
  test-desktop-v74 **42/0** (versão remota, com as verificações novas da
  v85/v88) · test-web-v262 **11/0** · test-kart-v65 **65/0 ×2** — a 1.ª corrida
  deu 63/2 («recolhe ITEM…», «item USADO…»): FLAKE de timing provado — o
  baseline em v88 LIMPO (branch checkout origin/main) correu **65/0** e a
  v89 correu **65/0** duas vezes seguidas SOBRE O MESMO CÓDIGO (nada mudou
  entre a corrida vermelha e as verdes; o diff da v89 não contém um ficheiro
  de kart). Padrão já visto na casa (v74: «corrida de launchers»).

- **GATES**: `tsc -b` 0 · `tsc -p tsconfig.app.json --noEmit` 0 · build OK.
- Shots em `shots-v89/` (hub 1600/1280, home 1600, telemóvel, painel EN).

## §4 — Honestidade (o que fica)

- O painel hero mostra os NÚMEROS REAIS da store do aparelho — numa conta
  nova são 0 pontos e carteiras a 0 (as fontes reais ligam nas fatias
  seguintes; nada foi inventado para «parecer vivo»).
- O chip «Até 120 pontos» é o TETO declarado do catálogo, não uma promessa de
  ganho por corrida; os nomes dos níveis continuam em PT em todas as línguas
  (dados do produto).
- O desktop do HUB ficou completo (progressão + arte + prémio + conteúdo
  específico); a HOME não foi mexida pela v89 — a v85 já entregou a dobra em
  duas colunas e a v88 os furos de contraste/overflow (a suíte D da v89 PASSA
  A PROVAR essa home com os testids atuais `home85-dobra` etc.).
- O flake de itens do kart-v65 foi provado COMO FLAKE (baseline 65/0 + 2×
  verdes sobre código idêntico) e não como regressão; os passos E2E de itens
  dependem de timing de corrida real e podem falhar sob carga da máquina —
  candidato natural a determinizar numa fatia futura.
- O flake de data (UTC vs dia local) foi fechado NA SUÍTE retencacao-v78; o
  mesmo padrão pode existir noutras suítes que dependam de «a missão de hoje
  é X» — não procurado ativamente nesta fatia.
