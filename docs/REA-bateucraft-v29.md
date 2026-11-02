# REA MUITO AVANÇADO — BateuCraft v29: Mundo Vivo

**Data:** novembro de 2026 · **Âmbito:** resposta direta a «Tentei jogar mas não está muito [bom]»
**Método:** jogar de verdade no browser (deep-link `/lives?game=mmorpg`), diagnosticar COMO JOGADOR, medir, corrigir, voltar a jogar.

---

## 1. Diagnóstico ao vivo (o que o jogador via)

| # | Problema encontrado | Evidência medida |
|---|---|---|
| 1 | **Nascias num deserto sem NENHUMA árvore** — a progressão (tronco → tábuas → mesa → picareta) começava bloqueada | Varredura espiral no motor: **0 troncos num raio de 400 blocos** do spawn; 93% do terreno à volta era deserto |
| 2 | **Mundo monótono e vazio** — planície = oliva chapada, deserto = nada, zero vegetação | 1 árvore por ~125 colunas na planície (0,8%); 0 decorações |
| 3 | **Riscos escuros no céu** em linhas e grelhas | Rastreados até às FOLHAS/TRONCOS: as faces amostravam texels de clamp na borda do atlas |
| 4 | FPS baixo em aparelhos fracos (10–18 no sandbox) | fps < 24 de forma sustentada sem qualquer adaptação do motor |
| 5 | Sem onboarding: 2 maçãs e… agora? | Nenhum aviso inicial |

## 2. Causa-raiz da #3 — o bug do atlas (desde a v26!)

`criarAtlas()` desenhava os tiles 8–15 (casca do tronco, folhas, tábuas, carvão, ferro, ouro, diamante) em **(col 8…15, linha 0)** — fora do atlas de 8 colunas (128 px). `putImageData` recusava silenciosamente: **a linha 1 do atlas nunca foi pintada**. As faces desses blocos caíam no clamp da borda → salpicos escuros alongados (os «riscos no céu») e troncos/folhas com textura errada desde o primeiro dia.

**Correção:** tiles 8–15 repintados em `(0,1)…(7,1)`; teste novo conta píxeis opacos por tile (8 tiles × 256 px ≥ 95% opacos).

## 3. O que mudou (tudo medido, nada inventado)

### 3.1 Spawn perto de floresta (`world.ts spawnPos()`)
Varredura em anéis determinísticos (r = 0→360, passo 8): devolve a **primeira coluna de FLORESTA** acima do nível do mar; se não houver até r=120, aceita planície; fallback honesto. Resultado: nasces sempre com árvores à vista (teste E2E: tronco < 64 blocos do spawn).

### 3.2 Mundo vivo — 4 blocos novos
- **Erva Alta** (id 21): cruz de 2 planos diagonais × 2 lados, sem colisão, parte num toque, **não dropa**; 7% nas planícies, 5,5% na floresta.
- **Flor Amarela / Flor Vermelha** (ids 22/23): cruz, dropa a si própria; ~0,9% nas relvas.
- **Cacto** (id 24): cubo sólido no deserto (1,4% das colunas de areia, altura 1–3), dropa a si próprio.
- Texturas 16×16 desenhadas em canvas com **fundo alfa verdadeiro** (novo `pintarAlfa`).
- Regra de **apoio**: quebrar o chão sob erva/flores/cacto parte o bloco (coluna toda no cacto); colocar sem chão sólido é recusado.

### 3.3 Mesher em cruz com recolha de UV (½ texel)
Sem recolha, o filtro vizinho-mais-próximo sangra o tile contíguo do atlas nas bordas de cada cruz → contornos escuros. Corrigido com inset de 0,5 texel (`0.5/(COLS_ATLAS*TILE)`).

### 3.4 Geração determinística por coluna (`noise.ts hashCol`)
Antes: árvores saíam de um PRNG partilhado (`rndArvores.proximo()`) cuja sequência **dependia da ordem em que os chunks eram gerados** — o mesmo mundo ficava diferente entre sessões e as construções podiam colidir com árvores «novas». Agora: hash inteiro por (x, z, sal) — o mesmo (x,z) dá SEMPRE a mesma árvore/erva/flor/cacto. Teste E2E: `gerarChunk(-9,-9)` duas vezes → dados idênticos.

### 3.5 Qualidade automática honesta (FPS)
Se fps < 24 durante 4 s: 1.º baixa a resolução (pixelRatio −0,5 até 1), depois o raio de render (3→2) — **sempre com aviso honesto ao jogador** («Desempenho baixo — resolução reduzida»). Máx. 4 passos; desligável (`motor.qualidadeAuto = false`).

### 3.6 Horizonte mais suave
Fog 30→90 passou a 24→76 — árvores/erva distantes diluem antes de virarem «palitos».

### 3.7 Nuvens em conjuntos
Cada nuvem = 2–4 blocos finos sobrepostos (0,9 de altura) em vez de 1 placa — menos «tabuleiro», mais céu.

### 3.8 Onboarding
Novo jogo em sobrevivência: «Soque um tronco para apanhar madeira!» (9 s) + «Constrói um abrigo antes do anoitecer…» (12 s).

## 4. Verificação (tudo verde)

| Suite | Resultado |
|---|---|
| `test-blocos.mjs` (10 asserts novos: spawn, decorações, determinismo, apoio, cruz, atlas) | **101/101** ✅ |
| `test-craft-camaras.mjs` (atualizado: 18 blocos criativos) | **63/63** ✅ |
| `test-desporto.mjs` / `test-rea-plataforma.mjs` / `test-home-dinamica.mjs` | 14/14 · 33/33 · 22/22 ✅ |
| `test-apis-publicas.mjs` / `test-stage-games.mjs` | 30/30 · 38/38 ✅ |
| `test-gamekit.mjs` | 9/10 (falha pré-existente «canvas do Bounce», confirmada também na árvore limpa v28) |
| `tsc --noEmit` | 0 erros |

Validação visual ao vivo: floresta no spawn com troncos/copa corretos + erva densa + flores; deserto com cactos espinhosos; **céu limpo sem riscos**.

## 5. O que ficou de fora (backlog honesto)

- Erva/flores não se espalham nem crescem (sem simulação de growth ticks).
- Cacto não causa dano ao tocar (o género usa ½ coração; fica para a v30).
- Sombra dinâmica real (shadow maps) — continua fora por custo em gama baixa.
