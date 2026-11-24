# REA — v87 «TROFÉUS QUE SE MOSTRAM» (vitrine no perfil + caminho da eliminatória)

**Data:** 2026-11-24 · **Base:** e62e8cd (v86.1) · **Suíte:** test-trofeus-v87.mjs — 39/39 ×2

## 1. O pedido (resumo)

«Continue deixando a plataforma ainda muito melhor.» A fatia natural anotada no Stage
Summary da v86: **troféus cosméticos no perfil do campeão** + **brackets visuais da
eliminatória** — a fatia que FECHA o ciclo do e-sport: jogas → competes → és CAMPEÃO →
o troféu fica à vista no perfil. Regras de base intactas: números SÓ reais, data-testid +
i18n ×6 + suíte PW nova + regressão completa verde, «poucas opções principais» (nenhuma
entrada nova na navegação de topo — a vitrine vive no Perfil e o bracket no detalhe que
já existia).

## 2. O que foi implementado

### 2.1 Núcleo puro — `src/lib/trofeus.ts` NOVO

Zero React, Node-safe (padrão esport v86/desbloqueios v80). Deriva a vitrine da store
REAL do e-sport (`bateu_esport_v1`):

- **Troféu** = campeonato/liga FECHADA com «eu» em 1.º lugar — e as DUAS fontes têm de
  bater certo (`vencedorId/campeaoId === "eu"` E 1.º na ordem por pontos/vitórias, a
  MESMA regra que o núcleo esport usa para coroar). Se os dados ficarem incoerentes,
  NÃO há troféu — honesto por construção.
- **Pódio** = 2.º/3.º em campeonato/liga terminada. Eliminatória eliminada NÃO é pódio
  (não há jogo de 3.º lugar — regra declarada).
- **Competições** = torneios/ligas onde «eu» esteve inscrito.
- `fechadoEm` = 1.º evento do histórico com `em ≥ terminaEm` (o «Janela fechada —
  campeão: …» que o núcleo escreve); fallback terminaEm.
- **PUREZA provada**: NÃO chama `expirarPendentes` nem grava — a suíte prova a store
  byte-a-byte igual antes/depois de derivar.
- **Anti-podre**: entrada corrupta (null, id não-string, participantes não-array,
  organizador podre) é ignorada — nunca quebra a vitrine nem entra por engano.
- Ordenação por fecho desc (o troféu mais recente primeiro).

### 2.2 Vitrine no perfil — `src/components/perfil/VitrineTrofeus.tsx` NOVO

Montada no Profile (rota protegida) logo abaixo da Progressão:

- Cartões com a marca do organizador (cor/iniciais — empresa ou «Eu»), nome, jogo,
  formato (Eliminatória quando for o caso), data do fecho e prémio em Pontos Bateu;
  selo «Campeão» em cada cartão.
- Chips com os números do núcleo: `N troféus · N pódios (2.º/3.º) · N competições`.
- **Estado vazio honesto**: «Ainda sem troféus — Só vitórias REAIS entram aqui: fecha um
  torneio ou uma liga como 1.º classificado.» + CTA real para /tournaments.
- Nota honesta: «Troféus do aparelho — vivem neste dispositivo, como todo o e-sport do
  Bateu.» (esport.nota.aparelho alinhado).
- `perfil-trofeus*` em tudo (container, título, chips ×3, lista, cartão-{id},
  selo, prémio, vazio, CTA, nota) + `data-trofeu-tipo`.

### 2.3 Bracket honesto da eliminatória — `esport.ts` + `TorneioLocalDetalhe.tsx`

- **Núcleo**: `corteDeRonda(tamanho, ronda, rondasTotal)` (a final exige SEMPRE 1.º;
  rondas cortam top tamanho/2^r — `corteRonda` delega para não duplicar regra) e
  `estadosBracket(t)` que deriva o estado de CADA ronda do CAMINHO DO JOGADOR:
  `passou | emCurso | eliminado | campeao | pendente`, SÓ de estado real
  (`t.ronda`, `eu.rondaEliminado`, `vencedorId`).
- **HONESTIDADE CENTRAL**: o núcleo NÃO elimina bots ronda a ronda (o corte é a posição
  REAL do «eu» em cada corrida) — por isso o bracket é o PERCURSO DO JOGADOR, nunca uma
  árvore de 8 com eliminações de bots INVENTADAS. A nota na UI declara: «O caminho é o
  TEU: o corte é a TUA posição real em cada corrida — os rivais IA da grelha não são
  eliminados ronda a ronda.»
- **UI**: nós ligados por setas (Ronda 1 · corte top N → Final), cada nó com cor do
  estado (emerald passou, rose emCurso, red eliminado, amber campeao, muted pendente);
  substitui o chip de texto do v86. Testids: `torneio-local-bracket`,
  `torneio-local-bracket-r{n}` com `data-estado`, `torneio-local-bracket-nota`.
- Campeonato NÃO mostra bracket (`estadosBracket` devolve `[]` → null).

### 2.4 FURO REAL pré-existente fechado — overflow móvel no /profile

O probe (scripts/probe-overflow2-v87.mjs, com ancestrais) mostrou `scrollWidth=507` a
390px no /profile: a TabsList do «Área do Perfil» (w≈495px) empurrava o DOCUMENTO
(overflow-x-auto só rola o conteúdo — o ELEMENTO crescia sem `max-w-full`). FIX:
`max-w-full` na TabsList — agora rola POR DENTRO (sw=390=cw provado pela suíte B4).
Os círculos decorativos já estavam clipped (overflow-hidden) e não contribuem.

### 2.5 i18n ×6

20 chaves novas (pt·en·pt-BR·es·fr·hi): `esport.bracket.*` ×10 + `perfil.trofeus.*` ×10
— via scripts/add-i18n-v87.py (âncora na abertura de cada dicionário, padrão v86).

## 3. Provas (test-trofeus-v87.mjs — 39/39 ×2)

### A) Núcleo (18)

Store vazia → 0/0/0 · PUREZA byte-a-byte · campeão de campeonato com campo REAL F1
(duas vitórias 25+25=50 > Kudisso 36 — o troféu é o MESMO que o núcleo coroou) com
campos certos (tipo/id-prefijo/jogoLabel/formato/prémio/marca) · fechadoEm = evento do
histórico · campeã de liga (2.º troféu, ordenação desc) · bot campeão com eu 3.º →
0 troféu + 1 pódio · eliminado na r1 → 0 troféu · 0 pódio · competição conta ·
eliminatória campeã → 3.º troféu «eliminatoria» · competições = 5 · ANTI-PODRE
(entradas corruptas ignoradas, vitrine intacta) · corteDeRonda completa + delegação ·
estadosBracket para TODOS os estados ([] campeonato · [passou,campeao] ·
[eliminado,pendente] · [pendente,pendente] inscrição · [emCurso,pendente] ativo).

### B) E2E (21, sessão fake padrão v84 — /profile é rota protegida)

B1 vitrine VAZIA honesta (chips a ZERO + CTA /tournaments) · B2 seed REAL pelo núcleo
em aparelho NOVO (MEMORIA.clear — cada metade simula um dispositivo próprio) com 3
troféus · 1 pódio · 6 competições, lista com 3 cartões + selos + prémios, chips = números
do NÚCLEO · B3 bracket nos 3 estados (campeão [passou→campeao] + nota, ativo
[emCurso→pendente], eliminado [eliminado→pendente]) + campeonato SEM bracket · B4
1280px sem overflow ×2 + **390px sem overflow no perfil** (o furo real fechado) ·
B5 i18n EN sem chaves cruas nas duas superfícies («Trophy cabinet», «Knockout path») ·
ZERO pageerror em todos os blocos.

FUROS caçados pela própria suíte: (1) o passo de liga falhou na STRING da asserção —
o id do troféu é `liga-local-liga-chess-*` (prefixo + id com prefixo), não
`liga-local-chess-*`; (2) com eu 1.º+3.º o KUDISSO somava 43>40 — quem era campeão era
o bot (a suíte passou a provar campeão com duas vitórias 50>36); (3) uma partida
alimenta TODOS os torneios ATIVOS do mesmo jogo (por design do bus) — a seed deixava
torneios «ativos» expostos a partidas posteriores (o «ativo» ficava eliminado e o
«em curso» de A virava campeão pela seed de B) → seed de B2 em APARELHO NOVO e
eliminatória ATIVA criada por ÚLTIMO, sem partidas depois.

### Regressão completa (sandbox reciclado → fast-forward e62e8cd antes de editar)

test-trofeus-v87 **39/39 ×2** · esport-v86 **44/0** · retencao-v83 **39/0** ·
retencao-v84 **67/0** · nav-v79 **83/0** · retencacao-v78 **38/0** · web-v262 **11/0** ·
som-v67 **58/0** · kart-v65 **65/0** · kart-ia-v77 **26/0** · kart-batalha-v68 **30/0** ·
kart-online-v66 **61/0** · desktop-v85 **46/0** · `tsc -b` **0** · `tsc app` **0** ·
build OK.

## 4. Honestidade (o que fica)

- Só há troféu com CAMPEONATO/liga REALMENTE fechada e «eu» em 1.º pelas DUAS fontes —
  bot campeão NÃO dá troféu ao jogador (a vitrine não contradiz o coroamento do núcleo).
- Pódios contam só 2.º/3.º reais; eliminado em eliminatória não é pódio (declarado).
- Tudo no aparelho (mesma limitação honesta do v86 — a sincronização para o servidor
  continua na fatia da migração tournaments/leagues, PGRST205 real).
- O bracket não inventa eliminações de bots: mostra o percurso do jogador, com a nota
  na UI a declarar exatamente isso.
- Os troféus são HONESTOS mas não cosméticos-ainda: não desbloqueiam molduras/títulos
  (o catálogo v80 continua por NÍVEL de progressão) — ligar troféus a cosméticos é a
  fatia seguinte natural, junto dos brackets de 2+ humanos online.

## 5. shots-v87

scripts/shots-v87.mjs (padrão v84-v86.1) — 5 capturas verificadas a olho, dados REAIS
do núcleo (mesma ordem segura da suíte): vitrine com 3 troféus (desktop), bracket
campeão (Passaste → CAMPEÃO + claim), bracket ativo (emCurso), bracket eliminado
(eliminado honesto) e vitrine em móvel 390px.
