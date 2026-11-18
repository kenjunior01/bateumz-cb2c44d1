# REA v63 — ARENA DAS LENDAS: o RPG deixa de ser «Minecraft» e passa a League of Legends × hordes.io

> Pedido do utilizador (2026-11-18): «o rpg ta errado quero estilo league of legends então
> não quero nem tanto assim tipo minecraft — **apaga tudo de minecraft** — quero tipo
> hordes.io que permita **muitos usuários em simultâneo**».
> Referências de comportamento: League of Legends (câmara de topo, click-to-move, QWER,
> fonte da base, camps/jungle, Barão/Dragão) · hordes.io (MMO de mundo partilhado, mobs
> autoritativos, até 150+ heróis no mesmo mundo, chat global).
> **Nada é copiado** de código/assets externos — só padrões de comportamento, reconstruídos do zero.

## 1. O que foi APAGADO (o «Minecraft» saiu de vez)

| Removido | Motivo |
|---|---|
| `src/game/blocos/` (15 ficheiros — Motor voxel, texturas, chunks, workers, mobs, inventário, LEGO) | O motor voxel ERA o estilo «Minecraft» |
| `src/game/rpg/` (core, sistemaRpg, mundoRpg, terrenoRpg, nomes) | O RPG «Lendas» era construído sobre voxels |
| `src/game/cidade/` (mundo-âncora voxel) + `src/components/cidade/` + `src/pages/CidadeBateu.tsx` | Também era voxel |
| `server/cidade-servidor.mjs` | Servidor de presença do mundo voxel |
| Rota `/cidade` → agora redireciona para `/lives?game=mmorpg`; links no Navbar trocados por «Lendas da Arena» | Nenhum rasto de cidade voxel |
| i18n `rpg.*` ×146 + `cidade.*` ×216 removidas | UI que já não existe |
| Suítes/tasqueiras ligadas ao voxel (`test-rpg-v41`, `test-cidade`, `test-mp-*`, `test-world-v60`, `test-ia-v57/58/59`, `test-offline-v39`, `test-progressao-v38`, `test-corrections-v62`, `test-mundo-convidado-v61`, `test-apis-v34` + probes) → **arquivadas em `arquivado/voxel/`** (não apagadas — histórico preservado, honesto) | Testavam código que já não existe |
| Save antigo `bateu_rpg_save`/`bateu_armazem` do RPG voxel | O novo jogo tem o seu próprio save (`bateu_arena_save`) |

O **Aetheria** («Ilhas do Vento») NÃO é voxel (three.js próprio, ilha suave) — mantido intacto.

## 2. O que entrou (a ARENA DAS LENDAS)

### 2.1 Núcleo puro isomórfico — `src/game/arena/core.ts`
- **4 campeões** com papéis LoL: **Kaimu** (guerreiro melee), **Lyra** (maga AoE),
  **Vex** (atiradora DPS), **Nara** (curandeira suporte) — cada um com **Q/W/E/R**
  (cd · mana · alcance · dano/cura · área · projétil · dash/blink · lentidão), stats por
  nível (1–18) e história.
- **Itens/loja** (6, máx. 3 compras, custo ×1,4 por compra arredondado a 25).
- **Fórmulas LoL**: armadura `dmg×100/(100+arm)`, XP por nível `90+48·(n−1)`,
  `dpsTeto` (orçamento anti-abuso), `orcamentoMovimento` (predição no cliente,
  validação no servidor — padrão v37).
- **Validação/sanitização** (`validaOla`, `validaGolpe`, `limpaNome`, `limpaFala`,
  `falaPermitida`) — a MESMA função corre no cliente e no servidor.
- **9 camps** (lobos, raptors, golems, espectros, rapozas) + **Dragão** + **Barão**,
  posições determinísticas — fonte única para cliente e servidor.

### 2.2 Mundo e simulação — `mundo.ts` + `simulacao.ts`
- Mapa 220×220 estilo LoL: **Base das Lendas** com fonte regeneradora (60 hp/s),
  3 torres na lane, rio diagonal, arbustos, 150 árvores + 46 rochas low-poly
  (determinísticas), trilhos para os covis do Dragão (SE) e do Barão (NO).
- IA de mobs UMA SÓ (`passoMobs`): vago (vagar na âncora) → perseguir (aggro) →
  atacar (cd por ataquePS, dano já com armadura do alvo) → **leash honesto**
  (volta à âncora e regenera). O servidor corre-a a 30 TPS; o modo solo corre-a
  no aparelho — **zero divergência**.

### 2.3 Motor three.js — `motor.ts` (sem um só voxel)
- Câmara de topo estilo LoL (offset fixo ≈59°, lerp, zoom pela roda).
- Click-to-move + WASD + joystick móvel · auto-ataque parado · alvo por clique.
- Habilidades com **cooldown radial, mana, projéteis, cones, áreas, canalização
  (R da Vex em 4 pulsos), dash/blink, escudo com bolha, pressa**.
- Números de dano (pool de sprites), partículas, anéis de efeito, barras de vida
  com nome (canvas→sprite), minimapa 2D (terreno pré-renderizado + mobs + chefes
  + heróis + viewport).
- Terreno com cores por vértice (relva/selva/lane/areia/água/base), água SÓ no
  canal do rio, sombras PCF (o PCFSoft foi removido do three — lição v60).
- Modo **leve honesto** (`?arena-leve=1`): sem sombras, pixelRatio 1, sem AA —
  para aparelhos fracos/headless.
- `destruir()` dispose TUDO (geos, mats, texturas, renderer + forceContextLoss) —
  seguro 2× (lição v60). Ganchos E2E tipados `window.__arena`.

### 2.4 Multi-jogador real estilo hordes.io — `mp.ts` + `server/arena-servidor.mjs`
- Servidor Node **JS puro** (o Node não stripa tipos em .mjs) que importa os módulos
  TS puros (type-stripping Node ≥22) — o MESMO padrão do servidor da cidade (v37–v59).
- **30 TPS de simulação · snapshots a 10 Hz · raio de interesse 70 u** (só o que
  está perto viaja) · **cap 150 jogadores** · timeout de silêncio 30 s.
- Mobs AUTORITATIVOS no servidor: aggro→perseguir→atacar (evento `fere` ao alvo +
  `golpemob` visual aos outros) → morte por claim → `mobmorreu` com xp/essência.
- Anti-abuso com as regras do core: orçamento de movimento (teleporte → clamp +
  `corrigido rapido-demais`), dash/blink ≤9,2 u 1×/9 s, claims de dano por janela
  deslizante de `dpsTeto` (2 s), golpe fora de alcance recusado, fala ≤1/1,2 s,
  compra validada (essência/max/item), renascer SÓ na fonte.
- Cliente (`mp.ts`): ligação automática (`?mp=` > localStorage > `ws://host:8766`),
  reconexão com backoff, throttle 10 Hz de posições, **estado HONESTO** no HUD
  («N heróis online» × «Modo solo — servidor da arena não encontrado» × «A ligar»).
  Sem servidor o jogo fica 100% SOLO com a MESMA simulação — **nunca finge multi**.
- Changelog/chat global com sanitização partilhada.

### 2.5 UI — `BateuRPG.tsx` reescrito (HUD estilo LoL)
- Menu: 4 cartões de campeão (papel, história, stats, QWER) + nome do herói +
  progresso guardado + nota honesta sobre o solo.
- HUD: nível com anel de XP, essência/abates, **QWER com cooldown radial e custo**,
  barras HP/MP/escudo, minimapa, chat da arena, **loja da fonte** (B, só perto da
  fonte), morte com contagem de respawn (overlay NÃO bloqueia cliques), toasts
  (nível/abate/erros), flash de dano, pausa com controlos, estado do servidor +
  ping + fps.
- Móvel: joystick + 4 botões de habilidade (touch).
- i18n `arena.*` ×100 pt + ×100 en (habilidades, itens, mobs, controlos, avisos);
  `livehub.game.mmorpg` + `.desc` atualizados (en/pt) e PAR DUPLICADO pt removido.
- Catálogo `gamesCatalog.ts`: «MMO de arena… multiplayer real até 150 heróis».

## 3. Testes — `test-arena-rpg-v63.mjs` **77 verdes ×2 corridas consecutivas, 0 skips**

- **A) Núcleo (41)**: campeão/id/papéis · QWER completos · XP/níveis (saturação 18,
  subida exata) · stats por nível e itens (clamp 3) · custo/compra (×1,4, max,
  essência) · dano/cura escalados · fórmula LoL da armadura (100→50 %) · dpsTeto ·
  orçamento de movimento · mundo/clamp/reviver · sanitização (nome/fala/ola/golpe) ·
  rate-limit da fala · raio de interesse · CAMPS/totalMobs=20/chefes · IA (aggro→
  ataque com armadura, leash ≤4 u, morte+respawn, claims em mortos).
- **B) Servidor real (17)**: bemvindo com id · interesse (vê quem está perto, NÃO vê
  quem anda legalmente para longe) · mobs na snapshot · chat sanitizado A→B ·
  fala rápida → `corrigido` · golpe válido mata lobo → `mobmorreu` com xp/essência
  (chega a B — mundo partilhado) · teleporte → `corrigido rapido-demais` com posição
  recolhida · renasce fora da fonte → `corrigido` · pong com stats · servidor sobrevive
  a JSON podre · compra sem essência → `corrigido`.
  *(As caminhadas do teste são LEGAIS — passos ≤1 u dentro do orçamento; o servidor
  clampa teleportes de propósito e o teste respeita isso.)*
- **C) E2E Playwright ×2 browsers (19)**: aquecimento do vite (lição v62 — a 1.ª
  otimização de deps RECAREGA a página e apagava o `__arena` a meio do teste) · menu
  com 4 campeões · HUD LoL + minimapa · **motor ONLINE** contra o servidor real ·
  vida cheia na base · **click-to-move** (mostra d≈30 u em 5 s) · Q cast + cooldown
  (2.ª recusada) · chegada ao camp dos raptors · **combate real** (mob ferido/abatido
  ou camp respondeu — o log do servidor confirma «abateu espectro») · **browser B no
  mesmo mundo** (A vê B e B vê A) · **chat pela UI chega ao outro browser** · sair
  fecha o portal e volta ao hub · ZERO pageerror/console relevantes · screenshots
  `shots-v63/arena-menu|jogo|multi.png`.

REGRESSÃO: **test-web-v262 11/0** (navbar/navegação intatos) · **tsc -b 0** ·
**tsc app 0** · **build OK** (arena no bundle) · `npm run server:arena` novo.

## 4. Lições desta versão
1. **.mjs não stripa tipos** — o servidor tem de ser JS puro importando módulos TS com extensão explícita (`allowImportingTsExtensions`).
2. **A câmara de teste tem de andar como um jogador** — o servidor clampa teleportes DE PROPÓSITO; helper `andar()` com passos ≤1 u.
3. **vite WARM** (v62 confirmada): aquecer a rota com página descartável antes do E2E — a 1.ª carga recarrega e apaga o estado do jogo.
4. **SwiftShader** renderiza a 4-6 fps e compila shaders no 1.º frame — esperas do E2E têm de tolerar (`arena-leve` reduz custo; catch-up de dt até 0,25 s mantém a velocidade real do jogo).
5. **Ganchos E2E têm contratos** — o `mpEstado()` do gancho devolve STRING; testar o contrato, não a memória.

## 5. Honestidade (o que fica)
- Progresso do convidado é DO APARELHO (`bateu_arena_save`) — sincronizar entre
  dispositivos seria funcionalidade de conta (não existe).
- Sem servidor: modo SOLO honesto no HUD; chat local só mostra o que o próprio
  escreveu; contagem de «online» = 1.
- PvP NÃO existe nesta versão (co-op PvE) — passo futuro declarado; torres são
  decorativas; som ainda não entrou (nada finge som).
- O servidor valida movimento/dano/fala/compra mas a vida do herói é reportada
  pelo dono (PvE cooperativo — não há incentivo a batota contra o próprio time).
