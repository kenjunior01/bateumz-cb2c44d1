# REA MUITO AVANÇADO — BateuCraft: Mundo LEGO

**Data:** outubro de 2026 · **Âmbito:** reconstrução total do jogo de mundo aberto
**Decisão do utilizador:** os personagens são tipo LEGO, mas TODAS as propostas (mecânicas) são de Minecraft.
**Regra de ouro:** mecânicas e sensação inspiradas no género voxel/sandbox; código, texturas, nomes e modelos 100% originais — nada é copiado do jogo original.

---

## 1. Metodologia REA (Reflexão · Exploração · Ação)

| Passo | O que foi feito |
|---|---|
| **R — Reflexão** | O mundo "Mundo Bateu" (MMO estilo Hordes.io) não correspondia ao pedido. Corte radical: todo o código antigo foi apagado (`src/components/livegames/world/`, `VoxelWorld.tsx`, `MMORPGGame.tsx`) e o jogo foi reconstruído do zero. |
| **E — Exploração** | Decomposição das propostas que fazem o género voxel/sandbox ser o jogo mais jogado da história: (1) mundo em blocos infinito e modificável; (2) minerar → criar → construir; (3) sobrevivência (vida, fome, noite perigosa); (4) progressão por ferramentas e minérios; (5) mobs com IA simples mas memorável; (6) ciclo dia/noite como ritmo do jogo. |
| **A — Ação** | Cada proposta foi implementada de forma original no motor novo (`src/game/blocos/`), com testes E2E determinísticos (`test-blocos.mjs`) e APK v2.27. |

---

## 2. Propostas de Minecraft → Implementação original

| # | Proposta (benchmark do género) | Implementação no BateuCraft | Estado |
|---|---|---|---|
| 1 | **Mundo voxel procedural** com biomas, cavernas e minérios por profundidade | `world.ts`: chunks 16×16×80, ruído fBm original, biomas planície/deserto/floresta/montanha, cavernas 3D, carvão/ferro/ouro/diamante por camada, rocha-mãe | ✅ |
| 2 | **Quebrar blocos com tempo por dureza e ferramenta** | `engine.ts`: DDA raycast, barra de progresso, dureza por bloco, multiplicador por tier de picareta/pá, gating (pedra exige picareta de madeira; diamante exige ferro) | ✅ |
| 3 | **Colocar blocos** do inventário | Colocação adjacente ao bloco visado, sem colidir com o jogador; contagem decresce | ✅ |
| 4 | **Inventário + hotbar** com empilhamento | 36 posições (9 na barra), empilha até 64, seleção 1–9/roda/toque | ✅ |
| 5 | **Criação (crafting)** com receitas e mesa de criação | 14 receitas; básicas sempre, avançadas perto de uma mesa colocada (raio 4 blocos) | ✅ |
| 6 | **Fundição na fornalha** | Aba "Fundição": minério+carvão→barras, areia+carvão→vidro, carne crua→assada; exige fornalha | ✅ |
| 7 | **Vida, fome, regeneração, dano de queda, afogamento** | 10 corações, 10 de fome, ar subaquático, regen com fome ≥18, fome 0 drena vida | ✅ |
| 8 | **Ciclo dia/noite** como ritmo | 10 min/dia, céu gradiente dinâmico, sol/lua, noite escura com mobs hostis | ✅ |
| 9 | **Mobs passivos e hostis** | Porco (foge ao ataque, dropa carne), Zumbi LEGO (só à noite, persegue, queima ao amanhecer), Estourador (aproxima-se, sibila, explode e destrói terreno) | ✅ |
| 10 | **Progressão rara e difícil** | Ferramentas 4 tiers (madeira→pedra→ferro→diamante), diamante só abaixo do y=14 com picareta de ferro, tempos longos à mão | ✅ |
| 11 | **Construção livre** | Qualquer bloco colocável; guardar mundo editado (diff de blocos) no aparelho | ✅ |
| 12 | **1ª e 3ª pessoa** | Tecla F5 / botão da câmara; 3ª pessoa mostra o avatar LEGO completo | ✅ |
| 13 | **Sons sintetizados** | WebAudio: quebrar, colocar, passo?, dano, comer, explosão, sibilo (sem ficheiros externos) | ✅ |
| 14 | **Salvar e continuar** | Autosave 10 s + ao pausar; "Continuar" no menu | ✅ |

## 3. Personagens LEGO (identidade própria)

- **Avatar minifig**: cabeça cilíndrica amarela com cara desenhada em canvas, torso trapezoidal, braços articulados, mãos em C, pernas retangulares — animação de caminhada com balanço de braços/pernas.
- **Personalização**: 6 cores de torso, 6 de pernas, 4 cabeças (cabelo/boné/capacete).
- **Item na mão**: o bloco/ferramenta selecionado aparece na mão do avatar (cubo em miniatura ou ferramenta 3D simples).
- **Mobs LEGO**: Zumbi (pele verde, braços à frente), Porco (caixa rosa com focinho), Estourador (corpo verde alto, cara original).
- Nota de conformidade: proporções "minifig" são uma linguagem visual genérica de blocos de montar; todos os modelos, texturas e nomes são originais.

## 4. Regras da plataforma mantidas

- **Sem registo**: jogável de imediato com nome de visitante.
- **"Bem nítido"**: texturas 16×16 pixel-perfect (NearestFilter), AO por vértice, devicePixelRatio limitado a 2.
- **Mobile**: joystick + botões grandes, requestFullscreen, container 100dvh, HUD sem poluição.
- **100% português** em todos os ecrãs e testes.
- **Créditos → histórias → 1 GB**: conquistas dão créditos Bateu; a partir de 25 créditos aparece o CTA de WhatsApp (+258 84 854 7887) para reclamar o bónus de 1 GB.
- **E2E determinístico**: `window.__blocos.pump(n, dt)` bombeia o motor sem renderizar — asserts estáveis em headless.

## 5. Métricas de sucesso

| Métrica | Alvo |
|---|---|
| TypeScript | 0 erros |
| Build de produção | OK |
| E2E do jogo | 100% verdes |
| Regressão web (express + excellence) | 100% verdes |
| APK v2.27 (versionCode 27) | debug + release + aab em `download/` |

## 6. O que ficou de fora (e porquê)

- **Multijogador em tempo real**: o motor novo é solo; sincronização multiplayer voxel exigiria um servidor autoritativo próprio (backlog).
- **Iluminação propagada (flood-fill)**: substituída por escurecimento por profundidade + tochas emissivas — mesmo aspeto, custo mínimo em telemóveis de gama baixa.
- **Redstone/eletricidade**: backlog futuro.
