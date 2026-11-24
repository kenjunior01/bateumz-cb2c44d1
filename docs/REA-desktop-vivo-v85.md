# REA — v85 «DESKTOP VIVO» (primeira dobra em duas colunas + números só reais)

**Data:** 2026-11-24 · **Base:** acd7758 (v84) · **Suíte:** test-desktop-v85.mjs — 46/46 no 1.º run

## 1. O pedido (feedback desktop, resumo)

O utilizador avaliou o desktop com **7/10**: «organizado, mas ainda não é suficientemente
aspiracional» — uma landing funcional e **vazia**. As 5 mudanças pedidas, por ordem:

1. **Primeira dobra em duas colunas**, com conteúdo visual à direita (o espaço vazio à
   direita do título deveria mostrar progresso/próxima live/prémio/ranking — «o desktop
   precisa de mostrar o motivo para regressar, não apenas os caminhos de navegação»).
2. **Pontos, níveis, missões e prémios visíveis imediatamente** — «Joga hoje. Acumula
   pontos. Desbloqueia prémios.» com Missão do dia / Próximo nível / Prémios disponíveis.
3. **Trocar cartões genéricos por conteúdo concreto** (BATEU KART com recompensa;
   próxima partida real de desporto — «o utilizador deve conseguir imaginar o que vai fazer»).
4. **Banner do BATEU KART com imagem real** e recompensa à vista (arte arcade premium,
   decisão: «ou o KART é apresentado como um jogo arcade premium, com arte mais forte»).
5. **Reduzir a altura das barras superiores**; a barra de live só quando houver live
   real; logótipo com mais presença; **prova de actividade com números SÓ reais**
   («Se não houver dados reais, não inventar»).

## 2. O que foi implementado

### 2.1 Dobra em duas colunas — `HeroDobra.tsx` NOVO

```
grid lg:grid-cols-[1.05fr_minmax(330px,0.95fr)] gap-8
├── ESQUERDA  HeroPrincipal (prop nova naDobra — sem section/container; a
│             moldura vem da dobra; MobileHomeApp mantém a moldura original)
└── DIREITA   BoasVindasRetencao variante="painel" (novo prop; "bloco" é o
              default — mobile intocado)
```

- `home85-dobra` no grid; teste A2 prova **2 colunas computadas** a 1280 e 1600
  (`getComputedStyle().gridTemplateColumns`); A6 prova o painel REALMENTE à direita
  (bounding boxes: frase.x=96 · painel.x=682).

### 2.2 Painel vivo de progressão (as duas variantes)

**Visitante** (`reten-bv-visitante`, SEM chip — v84 provado):
- título `reten.painel.titulo` («O teu progresso») + loop **`reten.loop`**
  («Joga hoje. Acumula pontos. Desbloqueia prémios.») com peso display;
- stats REAIS: `reten-stat-jogos` = `ALL_GAMES.length` (17) ·
  `reten-stat-premios` = `countRows("raffles"|"contests", status=active)` —
  o MESMO caminho partilhado do roll-up (cache 30 s, 1 pedido/tabela);
  no dev real devolveu **1** (fonte viva) · `null` (fontes indisponíveis) → «—»;
- missão do dia REAL do aparelho (núcleo v78 — o convidado já a pode cumprir grátis);
- notas honestas (sem conta = aparelho · com conta = segue a conta — verdade desde a v84)
  + 2 CTAs: **Criar conta** (`/register`) e **Jogar grátis** (`/jogos`).

**Registado** (`reten-bv-registado`):
- faixa Olá · nível · pontos · chip de sincronização v84 + [Continuar a jogar];
- **BARRA DE PROGRESSO REAL** `reten-barra`/`reten-barra-fill`:
  `pct = round(100·(pontos−base)÷(alvo−base))` com base = limiar do nível actual e
  `alvo = pontos + pontosFaltam` — os números VÊM do núcleo; semente 700 →
  `(700−500)/(2000−500) = 13%` e o teste compara `aria-valuenow === "13"` com
  `style.width === "13%"`;
- os 3 cartões do ciclo (missão · torneio · desbloqueios) — no painel empilham,
  no bloco mobile mantêm `sm:grid-cols-3`;
- **PRÉMIOS DISPONÍVEIS** `reten-premios` + contagem real + [Ver prémios] →
  `/premios` (só quando >0); **0 → texto honesto** («Sem prémios activos agora»);
  **null → a linha NEM aparece** (nunca um zero falso).

### 2.3 Cartões concretos — `DescobertaTres.tsx`

- **Jogos**: título mantém-se, mas o cartão mostra o JOGO (`BATEU KART`) + a
  recompensa (`home85-jogos-recompensa`, «Até {pontos} pontos por corrida» —
  `pontosMax` do catálogo) + «BATEU KART + {n} jogos…» e o botão leva **DIRETO
  a `/lives?game=kart`** (entrada real do jogo desde a v68a).
- **Lives**: contagem real de transmissões activas (fonte partilhada), estados
  honestos — sem «próxima live agendada» inventada (não existe fonte global).
- **Desporto**: PARTIDA REAL — `getStandings` → `currentRoundHint` → `getRound`
  (TheSportsDB, plano gratuito); 1.º evento com kickoff futuro (ou o 1.º da ronda);
  **fonte citada** (`home79.desportoCard.fonte`); qualquer falha → o texto honesto
  de sempre. No 1.º run a fonte respondeu de verdade:
  **«Premier League: Nottingham Forest vs Chelsea»** — teste E2 cobre os DOIS
  caminhos (partida real ou honesto) conforme a rede.

### 2.4 Banner KART — imagem real

- Arte gerada: `src/assets/kart-banner.png` (1344×768, arcade premium, sem texto
  na imagem); banner `home79-kart-destaque` com `<img home85-kart-img>` (240×128
  provado ≥140×112, `naturalWidth > 0` provado), badge, recompensa e botão
  **«Jogar agora»**.

### 2.5 Topo fino + logo

- `TrustBar`: `py-2→py-1`, 12→11 px, ícones 14→12 px → **27,3 px provados (≤34)**.
- `Navbar`: barra de anúncio **SÓ quando `liveCount > 0` REAL** (antes: FIXA e
  hardcoded «live-may2025»); texto com `{n}` interpolado; `nav-anuncio` testid;
  sem live activa a barra DESAPARECE (D2) e o navbar sobe para `top:0`;
- logo `h-9→h-11` (44 px provados), `gap-2.5→gap-2` (menos ar entre símbolo/nome);
- overflow horizontal: **zero a 1280 e a 1600** (D4/D6).

### 2.6 Ordenação da homepage

dobra → cartões → **Prémios** (roll-up) → Actividade real → Continuar a jogar →
Confiança — a ordem do feedback («Missão do dia / Jogos / Lives / Desporto /
Prémios / Actividade / Transparência»).

### 2.7 i18n ×6 (pt · pt-BR · en · es · fr · hi)

10 chaves novas (`home79.jogosCard.recompensa`, `home79.desportoCard.fonte`,
`reten.painel.{titulo,jogosGratis,premios,premios.vazia,verPremios,jogarGratis,barraAria}`,
`reten.loop`) + `nav.announcement.text` com `{n}` ×6 + **2 chaves que o hi NÃO
tinha** (`nav.announcement.text/cta`). Script `scripts/insere_i18n_v85.py`
(âncora `home79.frase` por bloco, baixo→cima, **corrido 2× para provar idempotência**).

## 3. Honestidade (regra do feedback: «só números reais»)

Nenhum número inventado no ecrã inteiro: 17 jogos e 120 pontos vêm do catálogo
(teste compara com bundle esbuild do `gamesCatalog.ts`); missão do núcleo v78;
prémios das tabelas activas; partida de liga real com fonte citada; contagem de
lives real. **«Jogadores activos hoje» NÃO é mostrado** — não existe fonte real
(nunca inventar). «Actividade recente» de utilizadores idem.

## 4. Provas

| Grupo | O que prova | Resultado |
| --- | --- | --- |
| A | dobra 2 colunas computadas; painel à direita (x); visitante honesto (sem chip/barra) | 14/14 |
| B | números do ecrã = catálogo EXATO (17 · 120); CTA direto ao jogo | 4/4 |
| C | imagem real carregada (`naturalWidth>0`); área de destaque; faixa inteira | 5/5 |
| D | trust 27,3 px; `nav-anuncio` ausente sem live real; logo 44 px; overflow zero 1280+1600 | 6/6 |
| E | desporto: partida real (fonte citada) OU honesto — ambos os caminhos cobertos | 4/4 |
| F | registado: 700 do servidor · faltam 1300 · aria-valuenow 13 = núcleo · missão 1/1 · chip «sincronizado» · prémios 0 → honesto · zero erros | 12/12 |
| G | zero pageerror /jogos /lives /desporto | 1/1 |

**Regressão:** nav-v79 83/0 · retencao-v83 39/0 · retencao-v84 67/0 · desktop-v74 42/0 ·
web-v262 11/0 · retencacao-v78 38/0 · desbloqueios-v80 38/0 · ciclo-v79 45/0 ·
home-dinamica 24/0 · `tsc -b` 0 · `tsc app` 0 · build OK · probe mobile
(`scripts/probe-v85-mobile-registado.mjs`) com shot do bloco registado 390 px.

**Shots:** `shots-v85/home-dobra-visitante.png` · `home-dobra-registado.png` ·
`kart-banner.png` · `mobile-bloco-registado.png`.

## 5. O que fica (próximas fatias naturais)

- «Próxima live agendada» no cartão de lives — quando existir uma fonte global de
  agenda (hoje as lives agendadas são por-empresa), entra com dados reais.
- Ranking/torneios no painel — a tabela `tournaments` ainda não existe no projeto
  (PGRST205 real, v84); quando existir, o cartão de torneio do painel ganha vida.
- O mesmo tratamento «concreto» pode estender-se ao roll-up de prémios (miniaturas).
