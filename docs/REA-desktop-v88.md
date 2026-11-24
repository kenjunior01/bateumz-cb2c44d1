# REA — v88 «DESIGN DESKTOP» (o desktop deixa de ter defeitos visuais)

**Data:** 2026-11-24 · **Base:** 26bece8 (v87.1) · **Suíte:** test-desktop-v88.mjs — 30/30

## 1. O pedido (resumo)

«Quero no design da versao desktop melhore bastante.» — a versão desktop tinha, para
além da primeira dobra reformada (v85), **defeitos visuais REAIS** encontrados por
diagnóstico com browser em 6 rotas: um furo de **360px** no /lives, um furo de **1px**
no /jogos, **texto invisível** (branco sobre branco) no jogo responsável do rodapé de
TODAS as páginas claras, uma **caixa preta gigante** na secção de sorteios da homepage
e o título «Torneios» **cortado pela navbar fixa**. E ainda um problema de HONESTIDADE:
o «Resumo de Actividade» mostrava números MOCK (47 min / 820 moedas) com a nota
«Dados calculados neste dispositivo» — FALSO.

## 2. Diagnóstico (com o browser a ver, não com confiança no código)

| Rota | Defeito | Causa raiz |
| --- | --- | --- |
| /lives | `sw=1640` (360px de scroll horizontal) | `lg:grid-cols-[1fr_320px]`: o `1fr` = `minmax(auto,1fr)` cresce com o min-content dos jogos (roda/canvas `max-w-7xl`) e empurra a página inteira |
| /jogos | `sw=1281` (1px) | `CardTilt` borderGlow com `-inset-px` — a caixa do brilho ultrapassa o pai 1px de cada lado |
| rodapé claro (todas as páginas) | títulos/texto do RG INVISÍVEIS | `ResponsibleGaming.tsx` usa `text-white` — desenhado para fundo escuro, renderiza em rodapé claro |
| homepage | «caixa preta» de ~520px de altura com 1 cartão solitário | `RollUp` com fundo `linear-gradient(#050508…)` hard-coded numa página clara |
| /tournaments | «Torneios» cortado pela navbar | container com `py-8` sem folga para a navbar FIXA |
| todas | honestidade | `MOCK_ACTIVITY = { timeSpentToday: 47, coinsUsedThisWeek: 820 }` com nota «Dados calculados neste dispositivo» |

## 3. O que foi implementado

### 3.1 Furo de 360px morto — `LiveHub.tsx`

`#game-content-area`: `lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]` (a pista `1fr`
simples deixava o conteúdo crescer para o min-content) + `min-w-0` nos dois filhos
(coluna do jogo e aside). A correção canónica de CSS grid: a pista deixa de crescer e
o jogo (roda/canvas) encolhe para dentro da coluna. PROVADO: `sw=1280` em /lives.

### 3.2 Furo de 1px morto — `CardTilt.tsx`

borderGlow `-inset-px` → `inset-0`: o `boxShadow` espalha VISUALMENTE sem participar no
layout/scrollWidth. PROVADO: `sw=1280` em /jogos.

### 3.3 Jogo responsável legível EM QUALQUER TEMA — `ResponsibleGaming.tsx`

Todos os tokens de cor dos 4 cartões passam a tema-conscientes: `text-white` →
`text-foreground`, `text-white/40` → `text-muted-foreground`, chevrons/legendas →
`text-muted-foreground/60-70`, acentos `text-sky-400` → `text-sky-600 dark:text-sky-400`,
sucessos `text-amber-300/red-300` → `text-amber-600 dark:text-amber-300`. Os dois
DIÁLOGOS mantêm o fundo escuro intencional (`bg-emerald-950/95` — branco sobre escuro,
correto nos dois temas). data-testid novos: `rg-tempo-card`, `rg-moedas-card`,
`rg-pausa-card`, `rg-exclusao-card`, `rg-actividade-card`.

### 3.4 HONESTIDADE: fim do mock 47min/820

O «Resumo de Actividade» agora mostra a progressão REAL do aparelho
(`bateu_progressao_v78` via `useProgressao`): **partidas jogadas hoje** (`corridas`) e
**jogos distintos hoje** (`jogosHoje.length`), com a nota i18n «Dados reais deste
aparelho» (chave nova ×6: `rg.actividade.partidas|jogos|nota`). Número a zero num
aparelho novo — VERDADE, não 47 min inventados. **Aprendizagem registada**: o
timestamp é ESTÁVEL (`useState(() => Date.now())`, padrão dos consumidores
BoasVindasRetencao/Premios/Profile) — `Date.now()` inline re-agendava as missões a
CADA render (loop de re-render que quebrou o nav-v79 na primeira corrida).

### 3.5 Fim da caixa preta — `RollUp.tsx` + `SorteiosConcursosRollUp.tsx`

O RollUp ganha `tonal?: "escuro" | "claro"` (padrão «escuro» — zero mudança para os
outros consumidores). No «claro»: fundo transparente, brilho radial OFF, título
`text-foreground`, subtítulo `text-muted-foreground`, setas com `hsl(var(--card))` +
borda do tema, fades das bordas OFF (inventariam cor de página), trilho/dots com
`hsl(var(--border))`. A homepage passa `tonal="claro"` — a secção de sorteios respira
na página clara; os CARTÕES continuam premium escuros (legíveis nos dois temas).

### 3.6 «Torneios» abaixo da navbar — `TournamentsList.tsx`

`py-8` → `pt-24 pb-8`: o h1 nasce sempre abaixo da navbar fixa (PROVADO: top do h1
≥ fundo da nav, ~100px).

### 3.7 Dobra premium — `HeroDobra.tsx` + `HeroPrincipal.tsx`

Ambiente decorativo (`home88-ambiente`, só ≥lg): dois radares suaves nas cores da
marca (`--primary` à esquerda, `--accent` à direita) — profundidade SEM imagens
inventadas nem números falsos. Tipografia: h1 `lg:text-5xl` (48px no desktop, provado)
e subtítulo `lg:text-lg`. A grelha de 2 colunas da v85 mantém-se byte-a-byte.

## 4. Provas

- **test-desktop-v88.mjs NOVO — 30/30**: (A) zero overflow nas 6 rotas a 1280px ·
  (B) RG legível no rodapé claro (cor ≠ branco) + números reais + nota honesta + mock
  eliminado · (C) rollup-claro com fundo transparente e título do tema · (D) h1 de
  /tournaments abaixo da navbar · (E) ambiente presente + h1 a 48px + 2 colunas
  mantidas · (F) 390px sem regressão de overflow + i18n EN sem chaves cruas ·
  zero pageerror em tudo.
- **Regressão**: desktop-v85 **46/0** · nav-v79 **83/0** · esport-v86 **44/0** ·
  retencao-v83 **39/0** · retencao-v84 **67/0** · retencacao-v78 **38/0** ·
  web-v262 **11/0** · kart-v65 **65/0**.
- **tsc**: `tsc -b` 0 · `tsc -p tsconfig.app.json --noEmit` 0 · **build OK** (4520 módulos).

## 5. Honestidade

- O RG deixa de inventar minutos/moedas: mostra contadores REAIS do aparelho.
- Nenhum número novo inventado no hero/ambiente — são decorações CSS sem texto.
- O subtítulo da secção de sorteios continua a contar o que EXISTE
  («0 sorteio(s) ativo(s) · 1 concurso(s) aberto(s)»).
- A nota do aparelho («Dados reais deste aparelho») é agora VERDADEIRA.
