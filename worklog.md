
---
Task ID: tdz-fix-social-feed
Agent: Super Z (main)
Task: Corrigir jogos que não abrem + MMORPG + redesign mobile estilo redes sociais

Work Log:
- REPRODUZIDO com Playwright: app inteiro em branco (root innerHTML=0) — "clicar nos jogos não faz nada" era o app todo crashado
- CAUSA RAIZ (TDZ): App.tsx chamava lazy() nas linhas 44-46 ANTES do import { lazy } from "react" na linha 47 — em dev/esbuild o binding atribui-se na posição do import → ReferenceError: Cannot access 'lazy' before initialization
- FIX: import do react movido para a linha 1 do App.tsx
- Verificado pós-fix: root=294KB, cliques em jogos navegam (/lives?game=ludo), MMORPG renderiza (8 zonas, PVP, bosses)
- Descoberta crítica: GitHub kenjunior01/bateumz foi revertido (provável sync Lovable) — checkout local = estado antigo com pop-ups; re-aplicadas limpezas (MascotBuddy sem auto-bubbles, removidos SupportChatbot/LivePulseBar/NotificationBell do shell)
- NOVO componente MobileSocialFeed.tsx (estilo TikTok/Instagram): cards imersivos sorteados reais (Supabase) + jogos + vencedores reais, duplo-toque ❤️ com explosão de corações persistida em localStorage, action rail lateral, tabs "Para Ti"/"Em Alta", prova social (avatares empilhados, contadores ao vivo), escassez (progresso+restam N), countdown FOMO, cartão final de streak/conversão
- FIX layout: cards com conteúdo absoluto colapsavam (h-full contra pai min-height) → h-[70svh] explícito no wrapper; sticky header removido (ancestrais com transform quebram sticky e flutuavam sobre cards)
- Index.tsx: feed injetado após o hero (md:hidden); secções de marketing longas agora só desktop (hidden md:block); Prova Social mantida no mobile
- BottomTabBar: agora visível também em /jogos e /esports (navegação app consistente)
- Testes Playwright mobile 390x844: feed OK, clique-navega OK, MMORPG OK, tabbar em /jogos OK, 0 pageerrors; tsc 0 erros

Stage Summary:
- App web mobile com experiência estilo app social (feed Para Ti) + bugs críticos de jogo resolvidos
- Nota: monitorizar reversões do repo no GitHub (sync Lovable pode ter force-push)

---
Task ID: merge-and-push
Agent: Super Z (main)
Task: Fundir com o histórico real do remote e publicar

Work Log:
- Descoberto que o checkout local era linha paralela obsoleta; remote tinha histórico completo (incluindo e56048b desta manhã) + 4 commits novos do utilizador (Lovable: "Corrigiu erro de login")
- Branch rebased-work a partir de FETCH_HEAD (7c274fe) + cherry-pick do fix TDZ+feed (f1ea531)
- 8 conflitos em Index.tsx resolvidos mantendo o remote; integração do feed re-aplicada depois (8239d61)
- Verificado: TDZ fix presente, popups limpos, MascotBuddy sem auto-bubbles, tabbar em /jogos
- Testes Playwright mobile na versão FUNDIDA: feed OK, cliques navegam, MMORPG OK, 0 pageerrors, tsc 0 erros
- Push 7c274fe..8239d61 → main (PAT do utilizador funciona para kenjunior01)

Stage Summary:
- GitHub main = código do utilizador + correções + feed social, tudo validado
- Commits: f1ea531 (fix TDZ + feed + popups), 8239d61 (integração homepage)

---
Task ID: voxel-world-minecraft
Agent: Super Z (main)
Task: Fortalecimento geral web+mobile, MMORPG estilo Minecraft integrado com a plataforma, sugestões do mundo

Work Log:
- Sync remote: 2 commits novos do utilizador (0c1f97c, 16f6bc5 "Corrigiu clique no MMORPG") — ff-pull aplicado
- NOVO src/components/livegames/VoxelWorld.tsx (~1570 linhas): mundo canvas 2D estilo Minecraft
  - Terreno procedural 180x80 blocos (relva/terra/pedra/areia/água/árvores/minérios por profundidade)
  - Texturas 8x8 procedurais, física (gravidade/pulo/colisão AABB/natação), ciclo dia/noite 4min com
    estrelas/sol/lua/nuvens/colinas parallax, escuridão noturna com luzes (tochas/portais/jogador)
  - Mineração com rachaduras por dureza + picaretas craftáveis (5 tiers), construção, zumbis noturnos
    (persegue/queima de dia), porcos (cura), partículas, textos flutuantes, sons WebAudio sintetizados
  - Mobile-first: joystick virtual, botões MINERAR/ATACAR/AÇÃO/SALTAR/PÔR, hotbar 11 slots, minimapa
  - Save localStorage (edits, inv, bilhetes, pos, hp, baús 24h)
  - INTEGRAÇÃO PLATAFORMA: Baús de Sorteio -> bilhetes+ouro+CTA /sorteios; Portal Arcade -> /jogos;
    Portal do Mercado -> /marketplace; Mercador NPC compra recursos; XP/ouro -> personagem RPG
    (handleVoxelReward com level-up + quests gold_earn/kill)
- MMORPGGame.tsx: tab "Voxel 3D" + banner MUNDO VOXEL no mapa
- BUG CRÍTICO PERF: PageTransition mantinha filter:blur(0px) inline na página inteira após animação
  (página toda numa layer GPU com blur por frame — ruim p/ APK WebView; quebrava screenshot headless)
  -> fix: filter limpo em onAnimationComplete + classe text-reveal removida do wrapper
- BUG CRÍTICO UI: 1364 sequências \uXXXX literais em 44 ficheiros mostravam lixo tipo "\u2500abates"
  na barra do MMORPG/AllGames/etc -> script fix-unicode-escapes.mjs decodificou tudo, tsc 0 erros
- Testes Playwright: test-voxel.mjs 14/14 PASS (desktop 1280x900 + mobile 390x844):
  criação char, tab voxel, canvas, HUD completa, mover+minerar, banner, feed, joystick, 0 pageerrors
  test-sanity.mjs 6/6 PASS (homepage, feed Para Ti, /jogos, sem \uXXXX literal, sem erros)
- Screenshots: /tmp/voxel-mobile-final.png (mobile excelente), /tmp/prop-4-opacity.png (desktop)
- NOTA ambiente: screenshots headless saem pretos por bug de composição (muitas layers full-viewport
  da app) — contornar com addStyleTag '* {opacity:1 !important; filter:none !important}'; browsers
  reais renderizam normal
- Commit 1b7c2cd criado; PUSH FALHOU: PAT anterior expirado/revogado ("Repository not found")
  -> pedir novo PAT ao utilizador (fino-grained com acesso a kenjunjunior01/bateumz-cb2c44d1)

Stage Summary:
- Mundo Voxel Minecraft-like completo e integrado (sorteios/jogos/mercado/economia RPG), mobile-first
- Perf crítica do APK melhorada (filter full-page removido) + lixo unicode eliminado em 44 ficheiros
- Pendente: push (novo PAT), depois APK build

---
Task ID: home-rollups-perf-mobile
Agent: Super Z (main)
Task: Página inicial em roll-ups (destaques→jogos→vendas→sorteios) + resolver "confusa" e "pesada no celular"

Work Log:
- Reescrevi o Index.tsx (v10 local) em homepage v3 roll-ups + feed; depois o fetch revelou que o REMOTE já tinha avançado 15 commits (v11-v17, com implementação própria de roll-ups fundida com mundo nítido/KI/mensalidade/stories/1GB) — rebase abortado, remote assumido como base
- Reaplicadas sobre o remote as 4 correções que faltavam:
  1) BackgroundDecorations: mobile = decoração ESTÁTICA (canvas O(n²) + 4 orbs blur-60px + 7 SVGs framer-motion removidos do celular — peso em TODAS as páginas)
  2) PageTransition: mobile = fade simples sem filter (blur de página inteira era o maior custo de render no WebView)
  3) BateuWorld: fix flexbox justify-center + overflow-y-auto (título/classes da criação de personagem empurrados para FORA do alcance do scroll no celular — bug clássico; usuário não conseguia tocar nos botões)
  4) PlatformFeed: cast seguro "tournaments" (tsc limpo de novo) + utilidades .cv-auto/.scrollbar-none
- Debugging profundo do "Guerreiro não clicável": 5 scripts Playwright até isolar a geometria impossível (botão a doc-y 391 dentro de contentor que começa em 689) → causa raiz = flex centering com overflow
- Investigado loading preso (73%): era transitório + 429 do ipwho.is (geo-IP, inofensivo); app carrega em ~9s no preview
- test-voxel.mjs estava ÓRFÃO (testava MMORPGGame que ninguém importa mais) → novo test-world3d.mjs (10 asserts) para o fluxo atual BateuWorld
- SUÍTES TODAS VERDES: test-world 141/141 · test-world-mobile 31/31 · test-ecosystem 33/33 · test-home-dinamica 22/22 · test-stories-plans 14/14 · test-home-v4 (novo, desktop+mobile) 22/22 · sanity 5/5 = 268 asserts
- Screenshots verificados: desktop (roll-ups com progress bar/setas/dots) e mobile (home nativa + Para Ti + tab bar)
- Commits: db73ffd (sobre v10, substituído pelo remote) → c0e0ba2 PUSHED para main (sobre 30335df)

Stage Summary:
- Página inicial organizada exatamente na ordem pedida: topo → Stories → roll-up Destaques & Features → roll-up Jogos & Torneios → roll-up Coisas à Venda → roll-up Sorteios & Concursos → Feed da Plataforma (desktop) e home nativa mobile com roll-ups de Jogos/Vendas + feed Para Ti
- Peso no celular resolvido na raiz: sem canvas de partículas, sem blurs animados, transições sem filter, DOM mobile ~1100 nós
- Bug real de UX corrigido (criação de personagem inalcançável no celular)
- Pendente: APK v2.16 (versionCode 16) na próxima ronda de build Android

---
Task ID: 20
Agent: Super Z (main)
Task: Jogos de Palco para empresas — REA da melhor roleta de lives + Quiz Milionário + Sorteio de Comentários, com controlo total, orçamento e conformidade social

Work Log:
- REA registado em docs/REA-JOGOS-DE-PALCO.md: roleta (wheelofnames/Uplup), quiz (WWTBAM/Kahoot modo apresentador), sorteio de comentários (commentpicker/Woorise), disclaimers oficiais Meta/TikTok/YouTube/Kwai
- NOVO motor src/lib/liveGameStudio.ts: pesos proporcionais com crypto.getRandomValues, odds honestas, orçamento MZN com teto e bloqueio, log auditável exportável (CSV), gerador de regulamento, checklist de conformidade, dedupe de comentários, escada do quiz
- NOVO palco /palco/:liveId (StageShow + StageWheel/StageQuiz/StagePicker): ecrã inteiro 100dvh, modo OBS (?clean=1), barra de espaço gira, modos Prémios/Participantes, ajudas 50:50/plateia/saltar, julgamento do apresentador, medidor de orçamento ao vivo
- NOVO estúdio /estudio-jogos/:liveId (GameStudio): personalização da marca (nome/slogan/logo/cor), editor de prémios e perguntas, controlo de gastos, regulamento e conformidade — sem login, sessão por liveId no dispositivo
- Integração: rotas no App.tsx, secção "Jogos de Palco" no LiveStudio (pré-live), tipo "live" no ActivityFeed/activityBus
- CORREÇÃO CRÍTICA (afetava TODO o dev): vite.config injetava __BUILD_ID__ com timestamp novo a cada load + self-heal lia a chave de sessionStorage errada → LOOP infinito de reloads em dev; agora BUILD_ID estável em dev + guard com o motivo correto
- Ferramentas de palco arrancam sem ecrã de loading (main.tsx + App.tsx isStageTool) — a empresa abre a meio da live real; toasts mantidos no palco (avisos de orçamento)
- E2E test-stage-games.mjs: 38/38 ✅ (estúdio, roleta, quiz, sorteio, bloqueio de orçamento, OBS, integração, mobile 390×844, 0 erros JS); suites web: test-web-excellence 23/23 ✅, test-rea-plataforma 31/32 (falha "Feed da Plataforma" JÁ EXISTIA na v21 limpa — depende de dados de rede)
- Versão android: versionCode 29 / versionName 2.29

Stage Summary:
- Empresas fazem lives super divertidas com controlo total: 3 jogos de palco REA dos melhores do mundo, orçamento com teto, log auditável e conformidade com as diretrizes das redes sociais
- Bug sistémico de reload em dev eliminado; palco arranca instantâneo
