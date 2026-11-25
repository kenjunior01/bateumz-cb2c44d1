# REA — v90 «DESKTOP AO TOQUE»: hover/foco reais na grelha de jogos + modo alto contraste

Data: 2026-11-26 · Pedido: continuação natural de «Quero no design da versao desktop melhore bastante» (v85/v88/v89) — as duas fatias pendentes declaradas no Stage Summary da v88: «pads de hover/estados de foco na grelha de jogos» e «modo alto contraste».

## 1. O pedido

O design desktop foi entregue em três fatias (v85 dobra viva na HOME, v88 furos de overflow/contraste, v89 progressão acima da dobra no HUB). O worklog da v88 deixou declaradas duas fatias naturais seguintes, ambas de «toque» — como o desktop RESPONDE ao utilizador:

1. **pads de hover/estados de foco na grelha de jogos**;
2. **modo alto contraste**.

## 2. Diagnóstico real (com o browser, não com confiança no código)

- **`.game-card-v2` era uma CLASSE MORTA**: usada em `AllGames.tsx` (grelha principal + rail de populares + CTA «contra o computador») e em `Contests.tsx`, mas com **ZERO definição CSS** em todo o repositório (`grep -rn ".game-card-v2 {" src/ → vazio`). O hover dos cartões de jogo dependia só de `card-hover-lift` (translateY genérico) e do glow do `HolographicCard`; a borda fantasma inline `rgba(255,255,255,0.05)` nunca reagia.
- **Foco por teclado sem identidade na grelha**: o anel global `:where(a,button…):focus-visible` (2px, `--ring`) existia, mas os cartões não tinham estado próprio nem testid para provar navegação por Tab.
- **Sem qualquer infra de alto contraste**: só `.dark` (2 blocos de variáveis) e `prefers-reduced-motion` (6 blocos). E o furo REAL: **75 ficheiros** usam `text-muted-foreground/20…/60` (texto-mudo com opacidade) — o valor mais comum (0,6 sobre `hsl(220 10% 40%)` em claro) fica **a ~3,3:1**, abaixo do AA 4,5:1 do WCAG para texto pequeno.

## 3. Implementação

### 3.1 Núcleo puro — `src/lib/contraste.ts` (NOVO)

Padrão da casa (desbloqueios.ts/iaContexto.ts): sem React, sem DOM real, tudo injetável e testável em Node. `estadoLido` (validação à prova de podre → `null` = «nunca escolheu»), `lerContraste`/`gravarContraste` (store `bateu_contraste_v1`, string simples), `alternarContraste` (inverte o estado EFETIVO; a escolha é sempre EXPLÍCITA e gravada), `sistemaPedeAltoContraste` (`prefers-contrast: more` do SO, respeitado **só** se o utilizador nunca escolheu) e `aplicarContraste` (lê → resolve → **UM atributo** `html[data-contraste="alto"]`; devolve o estado aplicado para o botão mostrar a verdade). A aplicação no boot é feita no `main.tsx` **antes da React montar** (zero FOUC).

### 3.2 CSS §v90 na `index.css`

- **Grelha de jogos**: `.game-card-v2` deixa de ser morta — transição de borda/sombra; `:hover` acende a borda (`hsl(var(--primary)/0.55)`, com `!important` honesto: os cartões trazem a borda INLINE fantasma) + sombra de profundidade; `:focus-visible` com anel de 3px; o CTA «JOGAR ▶» (novo classe `.jogos-cta`) escala 1,08 quando o CARTÃO é hovered/focado (não só o chip); `.jogos-accao-btn` dá hover real (brightness) aos «Desafiar»/«Detalhes».
- **Alto contraste**: dois blocos de variáveis — `html[data-contraste="alto"]:not(.dark)` (texto a preto puro, texto-mudo `0 0% 30%` = 7,4:1, bordas `220 13% 36%`, anel escuro) e `.dark` (branco puro, texto-mudo `0 0% 78%`, bordas `220 14% 48%`, anel branco) — e três regras de furo: `[class*="text-muted-foreground/"]` volta ao valor CHEIO da variável (mata as 75 ocorrências de opacidade), `.game-card-v2` ganha borda do tema (fim da borda fantasma) e `:focus-visible` a 3px no anel do tema.

### 3.3 UI — `Footer.tsx` + `AllGames.tsx`

- **Botão único no rodapé** (`data-testid="footer-contraste"`, `aria-pressed` sempre verdadeiro): o estado inicial vem da MESMA fonte do boot (`aplicarContraste`), o clique grava a escolha explícita e re-aplica; ouve `storage` para sincronizar entre abas. i18n `contraste.rotulo` ×5 dicionários (pt-BR herda pt pelo fallback do `t()`: en «High contrast» · pt/es «Alto contraste» · fr «Contraste élevé» · hi «उच्च कंट्रास्ट»).
- **`AllGames.tsx`**: testid novo `jogos-card-{id}` no Link da grelha (o kart e todos os jogos ficam endereçáveis), classes `.jogos-cta`/`.jogos-accao-btn` aplicadas.

## 4. Provas

- **test-desktop-v90.mjs NOVO — 38 verdes / 0 falhas ×3** (2 corridas consecutivas após o fix do flake de leitura do CTA + 1 final com shots melhorados):
  - **0. Núcleo em Node (11)** — import `.ts` direto (padrão v80): validação podre → null; ler/gravar; alternar; sistema sem matchMedia → false; `prefers-contrast: more` → true; aplicar sem escolha nem sistema → normal SEM atributo; sistema + sem escolha → alto AUTOMÁTICO; **escolha explícita vence o sistema**; gravar+aplicar → atributo no `<html>`.
  - **A. Grelha /jogos 1280×800 (7)** — zero overflow; `jogos-card-kart` presente; hover MUDA borda (`rgba(255,255,255,0.05)` → `rgba(255,255,255,0.55)` = a regra vence a inline) e sombra; CTA escala no hover por ciclo de coordenadas reais (banda 1,05–1,15); 34 botões de ação com hover real.
  - **B. Foco por teclado (3)** — Tab (máx. 120) chega a um `jogos-card-*` com `:focus-visible` sólido de 3px.
  - **C. Alto contraste (10)** — botão visível; `aria-pressed` falso→verdadeiro; atributo no html; store `bateu_contraste_v1=alto`; variável `--muted-foreground` muda (`220 10% 40%` → `0 0% 30%`); cor do texto-mudo muda DE VERDADE (`rgb(92,99,112)` → `rgb(77,77,77)`); **variante de opacidade volta ao valor CHEIO** (`rgba(92,99,112,0.6)` → `rgb(77,77,77)`); PERSISTE após reload; 2.ª pressão volta a normal.
  - **D. Sistema (2)** — `emulateMedia({contrast:"more"})` + nunca escolheu → alto AUTOMÁTICO (store null); 1.ª pressão grava a escolha real do utilizador (normal).
  - **E. Mobile 390 (3)** — sem overflow; botão presente; grelha intacta.
  - **F. i18n (1)** — EN «High contrast». **G (1)** — ZERO pageerror.
- **Flake fechado na própria suíte**: a 1.ª leitura do CTA (A6) era mid-flight (`matrix(1.04608…)` — a moldura HolographicCard anima em paralelo e a 2.ª entrada de hover nem sempre registou: `none → none`). Fix: UM ciclo de hover determinista por coordenadas reais (`mouse.move` ao centro com steps, settle 1 s) — **38/38 ×2 consecutivas** após o fix.
- **Regressão sobre a integração (15 suítes)**: nav-v79 **83/0** · desktop-v85 **46/0** · desktop-v88 **30/0** · desktop-v89 **37/0** · desktop-v74 **42/0** · trofeus-v87 **39/0** · esport-v86 **44/0** · retencacao-v78 **38/0** · retencao-v83 **39/0** · retencao-v84 **67/0** · home-dinamica **24/0** · web-v262 **11/0** · auditoria-v40 **50/0** · kart-v65 **65/0** (1.ª passagem 64/1 = o flake de itens documentado na v89, verde na re-prova). Padrão da casa confirmado: retencao-v83/v84 e desktop-v74 exigem corrida SOLO (corrida de portas do próprio vite em bateria — igual à v89.1).
- **GATES**: `tsc -b` 0 · `tsc -p tsconfig.app.json --noEmit` 0 · `npm run build` OK (**4522 módulos**, +1 pelo contraste.ts).
- **Shots** (`shots-v90/`): `grelha-hover-kart.png` (kart elevado, borda acesa, CTA maior), `home-normal.png` e `home-alto-contraste.png` (mesma dobra v85, texto-mudo cheio e legível em alto contraste). Shots das suítes de regressão regenerados (mostram a UI atual — padrão v81/v83/v89.1).

## 5. Honestidade (o que fica)

- O alto contraste muda as superfícies que usam as **VARIÁVEIS do tema** (texto, texto-mudo incl. variantes de opacidade, bordas, anel de foco). Cores **hard-coded** de arte/branding (o verde `#2ea043` da grelha, gradientes dos banners, chips pontuais) não mudam — declarado no próprio comentário CSS.
- O modo é **do aparelho** (`bateu_contraste_v1`), como a língua; segue a conta quando existir preferência de conta (fatia futura, mesmo padrão da v84).
- O `!important` da borda de hover existe para vencer a borda INLINE dos cartões — escolha documentada; a alternativa (apagar os estilos inline dos 2 ficheiros) mexeria nos concursos, fora do âmbito.
- Os nomes dos níveis continuam em PT em todas as línguas (dados do produto, nota já da v89); o flake de itens do kart-v65 continua «candidato a determinizar numa fatia futura».
