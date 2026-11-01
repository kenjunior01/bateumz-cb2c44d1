# REA — Plataforma Bateu (v23)

**REA (Reverse Engineer Anything / Referência de Excelência Aplicada)** — auditoria completa à
plataforma: cada funcionalidade foi comparada com os líderes mundiais da sua categoria, os
padrões vencedores foram extraídos e aplicados, e o enchimento foi eliminado.

---

## 1. ELIMINADO — o que estava a encher a plataforma

### 1.1 Personalização de fundo/efeitos dos jogos (pedido direto)
| Superfície removida | Onde estava | Decisão |
|---|---|---|
| **"Identidade de Jogo"** (página inteira de 1.218 linhas: logo, fundo, cores por jogo) | `/dashboard/game-branding` + link na sidebar | Apagada — rota, página e link |
| Secção **"Imagem de Fundo"** (URL) das lives | LiveGameSettings (sheet `/lives`) + CompanyLiveManager | Removida |
| Tab **"Efeitos"** (partículas, confetti, brilho, velocidade) | LiveGameSettings | Removida — **ninguém consumia estes campos** (config escrita e nunca lida por nenhum jogo) |
| **Cor de Fundo + Imagem de Fundo** do Quiz Milionário | AdminMillionaireManager | Removidos — o jogo tem identidade fixa |
| **Cor de Fundo + Imagem de Fundo (Marca)** da roleta | AdminSpinWheelManager | Removidos — mantém-se só a cor da roda (visual do jogo em si) |

Os jogos mantêm identidade visual consistente e as leituras existentes na base de dados
continuam tolerantes (fallback para o design padrão) — nada quebra.

### 1.2 Teatro falso (pior que enchimento: era enganador)
| Removido | Problema |
|---|---|
| `ProvablyFair.tsx` (361 linhas) | 100% falso: seeds inventadas, "1.247 sorteios verificados" hardcoded, botão "Verificar" sem ação |
| `BlockchainVerification.tsx` (231 linhas) | Mostrava rede "polygon", block_number = unix timestamp e "hash" = soma de charCodes — dados fabricados |
| Fake hash no `draw-social-winner` | Substituído por **SHA-256 real** (Web Crypto) dos dados do sorteio, sem block number inventado |

### 1.3 Código morto (0 importações em todo o src/)
`SupportChatbot` (393) · `CrazyTimSpinWheel` (443) · `WhyDifferent` (563) · `MegaHero` (381) ·
`PlatformHub` (274) · `CTASection` (238) · `StatsBar` (281) · `AIRecommendations` (138) ·
`StayInLoop` (145) · `FeaturesGrid` (145) · `BlogNewsWidget` (135) · `LoyaltyBadge` (126) ·
`DesktopWidgets` (95) · `CountryRegionFilter` (55) · `ParticleField` raiz (91) ·
`GlowEffects` + `ConfettiSystem` + `LottieAnimation` (202) — **≈ 3.800 linhas**.
Hooks órfãos: `useGameSessionTracker`, `useHapticFeedback`, `useMicroInteractions`, `usePullToRefresh`.

### 1.4 Lixo do repositório (performance de repo + clareza)
`--timeout` (74 KB — era um PNG de um comando malformado) · `dev.log` · `homepage.png` (1,7 MB) ·
`empresas.png` (1,1 MB) · `empresas_scrolled.png` (380 KB) · `tool-results/` (14 despejos) ·
`download/` · 5 snapshots `bateu-*.json` (230 KB) · `shot-*.mjs`.
`.gitignore` atualizado para impedir a recorrência.

### 1.5 Performance (REA perf — todos os dispositivos)
- `BackgroundDecorations`: o canvas O(n²) de partículas (que continuava ativo no **desktop**) e os
  orbs com blur animado por framer-motion foram removidos — decoração **estática** em CSS puro,
  mesmo clima visual, zero custo por frame em todas as páginas.
- Fix de 3 erros TypeScript pré-existentes (StageQuiz `timeSeconds`, StageWheel `ts`) que
  bloqueavam builds estritos.
- `EmojiReactions` com handler vazio `() => {}` no ContestDetail — removido (botão decorativo).

---

## 2. BENCHMARK MUNDIAL → APLICADO

### 2.1 TORNEIOS — benchmark: **Battlefy · Challengermode · Toornament**
| Padrão dos líderes | Estado ANTES | AGORA na Bateu |
|---|---|---|
| Janela de **check-in** 15/30/60 min antes do início; só quem faz check-in é semeado (Battlefy) | ❌ não existia | ✅ RPC `check_in_tournament` (server-side), janela de 60 min, painel no detalhe do torneio + estado "confirmado" |
| Gestão de inscrições com cobrança automática | ✅ já existia (RPC `join_tournament`) | mantido |
| Estados de erro com ação (Challengermode) | ❌ `.catch(() => {})` engolia erros | ✅ estado de erro com botão "Tentar novamente" na lista e no detalhe |
| Urgência real (o que acaba primeiro em cima) | ❌ ordem por criação | ✅ ordenação por `end_date`/`start_date` |
| Coluna `checked_in_at` | — | ✅ migration incluída |

### 2.2 LIGAS/CAMPIONATOS — benchmark: **FACEIT (Elo/temporadas) · Swiss Systems · Challengermode**
| Padrão dos líderes | Estado ANTES | AGORA |
|---|---|---|
| Geração automática de calendário (round-robin) e bracket (eliminação direta com byes) | ❌ geradores existiam mas **nunca eram chamados** — tabela `league_matches` órfã | ✅ botão "Gerar calendário" (criador) que insere todos os jogos e liga `next_match_id` |
| Relatório de resultados que atualiza a classificação (FACEIT) | ❌ sem UI; standings estáticos | ✅ "Reportar resultado" (jogadores envolvidos ou criador) → pontos V/E/D + golos marcados/sofridos atualizados ao vivo |
| Avanço automático no bracket | ❌ inexistente | ✅ o vencedor ocupa automaticamente o lugar no jogo seguinte; byes avançam sozinhos |
| Bug `loser_id: data.winner_id ? undefined : undefined` | ❌ sempre `undefined` | ✅ corrigido — derivado dos `player1_id/player2_id` |
| Feed de atividade dos resultados | parcial | ✅ cada resultado publica na atividade da liga |

### 2.3 SORTEIOS — benchmark: **protocolo provably-fair (commit-reveal, FIPS 180-4) · Stake · tombola**
O problema mais grave da plataforma: **o vencedor era escolhido com `Math.random()` no browser**
e a "prova" era teatro. Padrão mundial aplicado integralmente:
| Padrão | AGORA |
|---|---|
| **Compromisso antes do sorteio**: `SHA-256(server_seed)` publicado e imutável | ✅ tabela `raffle_draw_commits` (leitura pública) + `raffle_draw_seeds` (privada, só service_role) |
| **Apuramento determinístico**: `HMAC-SHA256(server_seed, "client_seed:nonce") mod N` | ✅ edge function `raffle-draw` (Deno crypto) — nunca no browser |
| **Reveal**: o seed é revelado e qualquer participante **verifica no próprio dispositivo** | ✅ novo `DrawProofPanel` — recalcula SHA-256 + HMAC com **Web Crypto no browser**, mostra PROVA VERIFICADA ✓ ou falha |
| Servidor honesto no cron | ✅ `auto-draw` reescrito com commit-reveal (mesmo protocolo, multi-vencedor com nonce incrementado) |
| Live draw sem manipulação | ✅ `LiveDraw` chama commit → reveal server-side; a animação só apresenta o resultado — o cliente **nunca** escolhe |
| Auditoria social honesta | ✅ `draw-social-winner` com `crypto.getRandomValues` ponderado + hash SHA-256 real (`network: bateu-sha256`, sem "polygon" fictício) |

### 2.4 CONCURSOS — benchmark: **Gleam · Woorise · ShortStack**
| Padrão dos líderes | Estado ANTES | AGORA |
|---|---|---|
| Fecho com coroação transparente do líder real | ❌ vencedor só por escolha manual escondida no admin | ✅ banner pós-fim com o líder real (votos/views) + **"Coroar vencedor"** num clique (dono), grava `winner_submission_id` + `is_winner` |
| Moderação de submissões / anti-fraude básica | ✅ aprovação manual já existia | mantido |
| Participação por submissão + votação 1 voto/submissão | ✅ já existia | mantido |

### 2.5 DUELOS P2P — benchmark: **FACEIT hubs · Challengermode**
| Padrão | Estado ANTES | AGORA |
|---|---|---|
| Backend P2P real (`p2p_challenges`, escrow na carteira, taxa de plataforma) | ✅ construído (2.785 linhas) mas com **zero chamadores** | ✅ **ligado à UI**: criar duelo real com escrow, aceitar duelo real (débito em escrow de ambos), procurar por código de convite |
| Honestidade dos dados | ❌ arena 100% mock sem aviso | ✅ badge "● AO VIVO — DADOS REAIS" quando há duelos reais; prévia claramente marcada "◐ PRÉVIA" quando não há |

### 2.6 DESPORTO — benchmark: **SofaScore · 365Scores · FlashScore · Strava/Duolingo (competições)**
- A plataforma **não tinha qualquer módulo de desporto real** (só esports + mini-jogos).
- **Decisão honesta do REA**: não foi construído um livescore falso — dados desportivos reais
  exigem um fornecedor (API-Sports, SportMonks, etc.). A vertical competitiva existente
  (campeonatos esports, ligas, torneios, duelos, bolões do Mundial) cobre o ciclo
  competir → acompanhar → ganhar, e as categorias de concursos já incluem
  Futebol/Basquete/Atletismo.
- **Recomendação** (próxima ronda): integrar livescore + palpites desportivos via API de
  terceiros com cache e rate-limit; o padrão dos líderes (timeline ao vivo, lineups,
  notificações de golo) está documentado aqui para essa ronda.
- **Competições estilo Strava/Duolingo**: o padrão aplicado foi progresso visível + streaks +
  ligas semanais — já presente na Arena (missões diárias + ranking real de `engagement_points`),
  agora com os módulos acima ligados a dados reais.

---

## 3. GESTÃO & PARTICIPAÇÃO (transversal)
- **Gestão**: criadores de ligas geram calendário e recebem resultados; donos de torneios têm
  check-in dos participantes; donos de concursos coroam o vencedor com a contagem real;
  donos de sorteios têm o protocolo commit-reveal com provas auditáveis.
- **Participação**: check-in de torneio, reportar o teu próprio jogo, verificação do sorteio no
  teu dispositivo, entrada por código de convite em duelos reais — tudo com estados de erro
  claros em português (nunca ecrãs vazios silenciosos).

## 4. VALIDAÇÃO
- `tsc -b --noEmit`: **0 erros** (antes: 3 pré-existentes).
- Build de produção Vite: **OK (45s)**.
- E2E Playwright: `test-rea-plataforma` 33/33 · `test-ecosystem` 33/33 · `test-home-dinamica`
  22/22 · `test-web-excellence` 23/23 · `test-arena` 25/25 — **136 asserts verdes, 0 pageerrors**.
- Screenshots verificados: homepage, torneios (estado de erro com retry), concursos (dados reais).
