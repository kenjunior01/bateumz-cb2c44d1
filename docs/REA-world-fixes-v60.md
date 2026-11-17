# REA — v60 · 3D WORLD SÓLIDO (item 1 do roadmap «Bateu corrections»)

## O que era o pedido

O `roadmap.md` partilhado pelo utilizador («Bateu corrections», 12 itens,
commit 07973df) começa assim: **«Fix underlying 3D World execution/type
errors without disabling checks»** — corrigir os erros de execução e de
tipos do Mundo 3D (BateuRPG «Lendas» + Aetheria, o motor voxel partilhado
e a seleção do jogo no LiveHub) **SEM desativar checks**: nada de
`@ts-ignore`, nada de casts que escondam o problema, nada de
`eslint-disable` a silenciar o que devia ser corrigido.

## Mapeamento com repro (probe ANTES do fix)

`scripts/probe-world-v60.mjs` percorreu o mundo REAL no browser (entrar →
segurar W → blur → mapa → pausa → sair/reentrar → Aetheria) e PROVOU os
furos no código vivo:

1. **Teclas presas no blur** — `frente com W: 1 · APÓS blur: 1` (segurar
   W e perder o foco da janela ANDA SOZINHO para sempre — o `keyup` nunca
   chega). No RPG e no Aetheria.
2. **`THREE.WebGLShadowMap: PCFSoftShadowMap has been removed`** — o
   Aetheria usava uma constante REMOVIDA do three (fallback silencioso a
   cada montagem).
3. **Contextos WebGL acumulados** — o Motor não tinha `destruir()`: cada
   sair/reentrar no mundo deixava um contexto vivo (o navegador mata-os
   a todos com «Too many active WebGL contexts» em sessões longas).
4. **Dados externos sem validação** — `searchParams.get("game") as
   GameId`, `localStorage.getItem("liveActiveGame") as GameId`,
   `setActive(latest as GameId)` do bus: um valor podre deixava o hub com
   o painel vazio e o compilador sem poder dizer nada.
5. **`setActive(null as any)`** — o estado real «nenhum jogo aberto»
   (sair do mundo) era mentira no tipo.
6. **`gastarPonto(r as any)`** e **`(window as any).__rpg`** — o gancho
   E2E do RPG sem contrato; o Aetheria nem ganchos tinha (inverificável).
7. **Efeito dos créditos com `eslint-disable`** a esconder deps erradas.

## O que entrou

- **`src/lib/jogosLive.ts` NOVO** (puro, browser E Node): `jogoValido<T>(
  bruto: unknown, ids: readonly T[]): T | null` — a ÚNICA porta dos dados
  externos do jogo ativo. O LiveHub valida o URL `?game=`, o localStorage
  `liveActiveGame` e o evento `activeGame` do bus contra `IDS_GAMES`
  (derivado de GAME_DEFS). Valor podre → `null` → cai no `"wheel"` honesto
  em vez de estado fantasma.
- **`LiveHub.tsx`**: `active` é HONESTO (`GameId | null`) — `setActive(null)`
  sem cast ao sair do mundo; as publicações do bus guardam `null` (sem
  jogo não se publica «jogo ativo»); `startLive`/história usam `""` /
  `undefined` para «nenhum» (os tipos do bus/história já conheciam);
  `MobileDiscoveryHeader` recebe `active ?? ""` e valida o
  `onCategoryChange`; o efeito do bus tem deps completos com hidratação
  única por ref (o `eslint-disable` saiu).
- **`engine.ts`** (motor voxel partilhado): `renderer:
  THREE.WebGLRenderer | null = null` — o tipo MENTIA com definite
  assignment (o renderer não existe antes do `iniciar()` nem depois do
  `destruir()`); `render()` com guarda honesta; **`destruir()` NOVO** —
  workers desligados + dispose de geometrias/materiais da cena +
  `renderer.dispose()` + `forceContextLoss()` — seguro chamar 2× e antes
  do iniciar (no-op, provado em Node).
- **`BateuRPG.tsx`**: ganchos E2E **TIPADOS** — `type GanchosRpgE2E` com
  ~40 membros verificados pelo compilador contra o Motor/SistemaRPG reais
  (`ReturnType<Motor["captura"]>`, `ReturnType<SistemaRPG["novoJogo"]>`,
  …) + `declare global { interface Window { __rpg?: GanchosRpgE2E } }`;
  `gastarPonto(r: RamoRpg)` (o `as any` saiu); teclas largam no
  `blur`/`visibilitychange`; o unmount chama `motorRef.current.destruir()`;
  efeito dos créditos com deps honestos (`eslint-disable` saiu).
- **`AetheriaGame.tsx`**: `PCFSoftShadowMap` (removido do three) →
  `PCFShadowMap`; teclas no `blur`/`visibilitychange`; **`alternarVoo()`
  determinístico** (o ref manda e o estado segue o ref — antes o updater
  de estado tinha efeito secundário, o padrão que o StrictMode
  desencoraja); ganchos `window.__aetheria` TIPADOS; deps completos sem
  disable.
- **FURO introduzido e apanhado pela própria probe**: o array de deps
  avalia DURANTE o render — o efeito do mundo referia `alternarVoo` antes
  da inicialização → TDZ real («Cannot access 'alternarVoo' before
  initialization», apanhado pela probe antes de qualquer commit). Fix:
  declarar o `useCallback` ANTES do efeito. Lição: mover um callback para
  deps exige movê-lo para CIMA do efeito que o usa.

## Testes

`test-world-v60.mjs` NOVO — **28 verdes ×2 corridas, 0 skips**:
- **A núcleo (Node)**: `jogoValido` ×7 (null/número/vazio/espaços,
  case-sensitive, valor podre de localStorage, lista vazia, tipo T) ·
  Motor por bundle esbuild: `destruir()` ×2 idempotente sem throw,
  `render()`/`passo()` sem iniciar no-op com fase intacta, destruir não
  cria renderer.
- **B E2E (browser REAL)**: menu por `?game=mmorpg` → NOVA LENDA →
  jogando · W preso → blur → `frente = 0` (FIXADO) · aba escondida →
  `frente = 0` (FIXADO) · mapa pelo minimapa com TERRENO real (48 400
  amostras, ms>0) · pausa pelo botão HUD → RETOMAR · sair → hub →
  reentrar ×2 com **ZERO warns THREE/«Too many active WebGL contexts»** ·
  Aetheria: ganchos presentes, W preso → blur → teclas vazias, F ×2 voa e
  DESLIGA determinístico · ZERO pageerror em toda a sessão · ZERO
  console-error fora do ruído conhecido · `shots-v60/rpg-mundo.png` +
  `shots-v60/aetheria-mundo.png` (mundo a 60 fps com descobertas reais).

**REGRESSÃO**: test-rpg-v41 **157/0** · test-progressao-v38 **39/0** ·
test-cidade **37/0** · test-ia-v54 **37/0 +1skip** (--sem-e2e) ·
test-ia-v55 **62/0 +2skips** (--sem-e2e) · test-ia-v56 **54/0 +1skip**
(full) · test-ia-v57 **54/0 +0** (live NVIDIA + E2E da praça intatos) ·
test-ia-v58 **76/0 +0** — com a migração `ia_historico` já aplicada, a
secção C real desbloqueou: push→pull→re-push idempotente contra o
Supabase vivo, RLS a bloquear o anónimo · test-ia-v59 **52/0** ·
tsc **0 erros** · build **OK** (`jogoValido`, `__aetheria`,
`forceContextLoss` no bundle).

## Honesto (o que fica)

- **400/404 de rede no hub** (`/rest/v1/lives` 404 ·
  `/rest/v1/scheduled_lives` 400) existem ANTES da v60 e são da
  plataforma geral (consumo de lives no LiveHub contra o Supabase), não
  do 3D World — registados aqui para uma versão futura da plataforma.
- A validação do jogo ativo cobre o LiveHub; o catálogo GAMES vive no
  componente (ícones lucide) — extrair a LISTA para módulo puro é passo
  opcional futuro.
- Os itens 2–12 do roadmap continuam abertos; o próximo é «Make 3D World
  playable without registration; keep account-only rewards protected» —
  nota: o menu do RPG já anuncia «Joga sem registo» e o progresso fica no
  aparelho; o item pede VERIFICAÇÃO ponta a ponta + proteção das
  recompensas que só devem existir com conta.
