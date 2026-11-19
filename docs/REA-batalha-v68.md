# REA v68 — Limpeza RPG + BATALHA DE BALÕES (BATEU KART)

Pedido do utilizador (2026-11-19): «apaga aquele jogo tipo RPG, todos os jogos desse género que já criamos não quero mais» + «continua a melhorar o jogo tipo Mario Kart».

## §1 — Limpeza RPG (commit v68a, `ba42e12`)

Os quatro jogos do género RPG saíram POR INTEIRO da plataforma:

| Jogo | Id no hub | O que foi removido |
| --- | --- | --- |
| BATEU RPG: Lendas da Arena | `mmorpg` | `BateuRPG.tsx` + núcleo `src/game/arena/{core,motor,mp,mundo,simulacao}.ts` + `server/arena-servidor.mjs` + script `server:arena` + suítes `test-arena-rpg-v63.mjs` (77) e `test-pvp-v64.mjs` (53) |
| Aetheria: Ilhas do Vento | `aetheria` | `AetheriaGame.tsx` + `AetheriaGame.css` |
| RPG Arena Battle | `rpgarena` | `RpgArenaBattle.tsx` |
| Campanha RPG | `campaignrpg` | `CampaignRPGGame.tsx` |

O **BATEU KART** assumiu todos os espaços de destaque: banner do hub, grid featured, destaque de `/jogos` (nova cena vetorial `ArtKart`), navbar ×2, drawer móvel, tab bar móvel (fab «KART»), busca global, CTA da homepage, e TODOS os redirects legados (`/mmorpg`, `/world`, `/mundo`, `/cidade`, `/life`, `/vida`, `/bateulife`, `/jogos/mmorpg` → `/lives?game=kart`). `gamesCatalog` sem as entradas RPG, categoria «Mundo Aberto» removida, `LIVE_GAME_MODES` 85→81 (mesma contagem honesta, −4). `mundoConvidado.JOGOS_SEM_KIT = ["kart"]`. i18n: **338 chaves fora** (324 `arena.*` + 14 `livehub.game.*` RPG) ×6 idiomas + 4 grupos de textos reescritos (`live.convidado.corpo`, `home.cta.mundo`, `auth.boot.falha.corpo`, `mh.world*`). `Arena.tsx` (hub competitivo — NÃO é RPG): missão «Herói do Mundo» → «Piloto de Elite» alimentada pelo save real do kart. Suítes ajustadas com honestidade: `test-som-v67` −secção C (arena), `test-v31` −secção 6 (clima vivia no RPG), `test-gamekit` §5 → kart. Histórico (shots-v63/v64, docs/REA-arena-*, worklog) fica imutável.

## §2 — Batalha de Balões: núcleo (`src/game/kart/batalha.ts`)

- **Arena Coliseu das Lendas** (`ARENA_BATALHA` no core): anel Catmull-Rom fechado ~612 u com meia-largura 11 (a pista mais larga do jogo), tema vulcão. FORA de `PISTAS` — o menu de corridas fica intato; `pistaPorId("coliseu")` resolve para o motor.
- **Regras**: 12 pilotos × 3 balões; arma que acerta (casca/casca-alvo/míssil/óleo/raio) estoura 1 balão; janela de invulnerabilidade 2,2 s; a zero balões o kart vira **wreck** (sem controlo/itens, não volta a ser atingido, corpo cinzento); **fim por último-de-pé** ou **teto de 180 s**; ranking = balões ↓ → golpes ↓ → progresso ↓, com eliminados por ordem REVERSA; `recompensaBatalha` = tabela 120…8 + bónus ≤ 3×10.
- **Isomórfico**: `passoBatalha` corre `passoCorrida` (física/itens/IA do core, ZERO alterações) com `voltas=999` e traduz os eventos `golpe`/`raio`/`escudo` do core em balões. Os restantes eventos de corrida ficam na fila para o motor (som/v67).

## §3 — Motor + UI

- `motor.ts`: `batalha?: boolean` — o motor possui o `EstadoBatalha` e corre `passoBatalha`; 3 balões 3D por kart (esferas na cor do piloto, bob); wreck cinzento; HUD com posição/classificação de balões; `ganchos.batalha()` tipado para E2E.
- `BateuKart.tsx`: botão «🎈 BATALHA DE BALÕES» no menu; HUD de batalha (balões ×N, «N de pé», teto em contagem); resultados com coluna de balões; toasts de balão perdido/eliminação (meu + dos outros, com agressor); i18n `batalha.*` ×10 pt+en.

## §4 — Furos reais fechados com repro

1. **Clamp das voltas** — `novaCorrida` clampeia a `VOLTAS_MAX=5`: o «999» entrava como 5 e a batalha ACABAVA por distância (5 voltas do anel, jogador «terminou» aos 49,7 s). FIX: `cor.voltas` definido DEPOIS da construção; a suíte prova `999` vs `VOLTAS_MAX===5`.
2. **Janela de eventos** — `passoBatalha` processava só `[antes, fim)` do passo: eventos residuais (pré-injetados) nunca eram consumidos. FIX: processa TODOS os pendentes (`slice()` completo); invariante de produção = o motor drena a fila por frame (a suíte drena igual).
3. **Bónus de balões sem teto** — `recompensaBatalha` clampeia a `BALOES_INICIAIS` (3).

## §5 — Prova

- `test-kart-batalha-v68.mjs` **30/30 ×2 corridas consecutivas, 0 skips**: A núcleo 20 (arena determinística; 12×3; clamp provado; duto golpe→balão; invuln; raio+escudo; eliminação+wreck; recompensa; ranking sintético; **batalha completa determinística com valores EXATOS** da seed 20261119 — último-de-pé aos 82,5 s com 33 golpes e 11 eliminados, jogador 2.º com payout 85/51; determinismo 2×; teto de 180 s com balões de pé) · B E2E 10 (menu 🎈; Coliseu arranca 12×3; contagem; movimento real; HUD «×3 · 12 de pé»; teto decrescente; pausa congela; balões estouram em campo; ZERO pageerror) — `shots-v68/batalha-arena.png`.
- Regressão: `test-kart-v65` **65/0** (solo intato) · `test-kart-online-v66` **61/0** · `test-som-v67` **53/0** · `test-web-v262` **11/0** · GATES: `tsc -b` 0 · `tsc app` 0 · build OK.

## §6 — Honesto (o que fica)

Batalha SOLO contra 11 IA (a sala online continua só de corridas — batalha online é o passo seguinte natural e o núcleo já é isomórfico); arena única sem seleção; sem colisão-destrutiva por choque (só armas estouram balões — padrão Mario Kart clássico); o wreck fica em campo como obstáculo; sem sons novos (o duto v67 já toca golpe/uso via eventos do core).
