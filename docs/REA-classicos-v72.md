// REA v72 — CLÁSSICOS + GUERRA ESPACIAL + CO-FUNDADORES
// ═══════════════════════════════════════════════════════════════
// Estudo de comportamento (Reverse Engineer Anything) dos líderes
// do nicho para as 4 entregas desta versão. Nada é copiado de
// código/assets externos — só comportamentos reconstruídos do zero.

// §1. PEDIDOS DO UTILIZADOR → ENTREGUES
// ──────────────────────────────────────────────────────────────
// · «apaga todos de mundo aberto» → FECHADO na v68a; v72 re-verifica
//   por grep: zero componentes/rotas/catálogo (só redirects legados
//   /mmorpg → /lives?game=kart intencionais).
// · «cria os clássicos que as pessoas mais jogam, podes criar o
//   tetris» → Tetris clássico completo (§2).
// · «batalha espacial melhora muito mais — mais animado, avançado,
//   animações, divertido, gráficos» → mega upgrade (§3).
// · «melhore a inteligência dos jogos» → Damas minimax, Cobras
//   flood-fill, IA nova da Guerra Espacial (§4).
// · «painel do admin robusto e completo» + «co-fundadores por país
//   (MZ·AO·BR·PT) gerem de forma independente — identidade visual +
//   anúncios por região — o admin é o único que vê tudo» (§5-6).

// §2. TETRIS — o comportamento do clássico mundial (Tetris Effect/
//     Puyo/Tetris.com) reconstruído com honestidade:
// · SACO DE 7: embaralhamento Fisher-Yates de 7 peças, reposto ao
//   esvaziar — distribuição honesta (nunca 5 peças sem a I).
// · HOLD: 1× por peça (holdUsado), troca devolve a peça ao topo.
// · GHOST: a fantasma desenha-se na posição de queda (y máximo).
// · KICKS: [0,0],[-1,0],[1,0],[0,-1],[-2,0],[2,0],[0,-2] — roda
//   perto de parede/pilha.
// · LOCK DELAY 500 ms re-armazenado por movimento/rotação (padrão
//   guideline) — a suíte prova a pausa a CONGELAR os pontos.
// · PONTOS: linha 100/300/500/800 × nível; soft 1/cela; dura 2/cela;
//   COMBO +50×(n-1) com quebra honesta quando não limpa; B2B ×1,5.
// · NÍVEL: 10 linhas cada; gravidade 800×0,85^(n-1) ms, piso 80.
// · JUICE: partículas por cela limpa, flash de TETRIS, tremor
//   proporcional, toast flutuante SINGLE→TETRIS!/COMBO/NÍVEL.
// · SONS: tabela fechada do kit (coin/combo/levelup/explosion/
//   powerup/lose) — mapeados no SOM{} local, nada inventado.
// · MOVEL: 6 botões pointerdown + teclado completo; recorde no
//   aparelho (`bateu_tetris_recorde`).

// §3. GUERRA ESPACIAL — comportamentos de Galaga/Space Invaders
//     modernos (Vampire Survivors-juice) sobre a base v20 intata:
// · 5 TIPOS com IA real (roleta ponderada por onda):
//   scout (velocidade ×1,75 + zigue-zague ×4) · fighter (altitude
//   de combate, strafe com rebote, TIRO MIRADO no vivo, foge ao
//   cumprir missão) · tank (hp3, ×0,45 vel, drop GARANTIDO) ·
//   kamikaze (steering para o vivo + aceleração até 5,2) ·
//   splitter (hp2 → 2 mini ao morrer).
// · FLASH DE DANO + barras de vida nos resistentes.
// · COMBO: janela 120 frames, multiplicador +0,25/abate até ×4,
//   chips no HUD + texto flutuante colorido por tier.
// · POWER-UPS ×5: shield/rapid/life (v20) + laser (raio de coluna
//   que fura TODOS, cd 16, feixe com orbem) + drone (orbita, dispara
//   no mais próximo acima, 1 por jogador).
// · HIPERSALTO: estrelas → riscos ×7 na troca de onda + banner.
// · TANK morre com explosão bónus + tremor; chefe v20 intato.

// §4. IA DE VERDADE (o «melhore a inteligência dos jogos»)
// ──────────────────────────────────────────────────────────────
// · DAMAS: minimax alfa-beta — prof 1/3/5 por dificuldade com ruído
//   no fácil/médio (erro HONESTO, não burrice); avaliação = material
//   (peão 3,4/rei 8) + avanço + defesa da retaguarda + centro.
// · COBRAS: flood-fill de sobrevivência — espaço < corpo = morte
//   evitada; nota = espaço×1,6 + distância à comida; médio usa BFS
//   com verificação de espaço; difícil usa flood-fill direto.
// · CONNECT4/XADREZ: já tinham minimax/lichess — intatos (sem
//   regressão, ganho de IA onde faltava).

// §5. CO-FUNDADORES REGIONAIS (MZ·AO·BR·PT)
// ──────────────────────────────────────────────────────────────
// Comportamento dos líders regionais (Roblox regional MPL, WinZO
// por estado) reconstruído com a REGRA DA CASA (honestidade):
// · NÚCLEO puro (regionalBranding.ts) seguro em Node — igual aos
//   desafios v70: estado no APARELHO, nada finge backend, a nota
//   está na UI dos painéis.
// · IDENTIDADE VISUAL por país (cores hex + tema + iniciais +
//   slogan) → aplicação IMEDIATA nas CSS vars --region-* — o
//   co-fundador VÊ a marca dele em toda a plataforma no ato.
// · ANÚNCIOS: 2 tipos (faixa no topo do hub / destaque na grelha),
//   agendamento (iniciaEm/terminaEm), teto 12/país, CTA SÓ caminho
//   interno (urlSegura bloqueia https:// externo e javascript:),
//   impressões/cliques honestos com CTR real.
// · PERMISSÕES no NÚCLEO (não na UI): agirAnuncio recusa que o
//   co-fundador atravesse países; «TODOS» é só do admin.
// · UI: aba Anúncios no RegionalManagerPanel (KPIs + formulário
//   com validação recusada com motivo + lista com ações); AdminAds
//   (/admin/ads) = PANORAMA dos 4 países + todos os anúncios +
//   pausa/reativar/remover em QUALQUER país + filtros/busca.

// §6. INTEGRAÇÃO NA PLATAFORMA
// ──────────────────────────────────────────────────────────────
// · LiveHub: FaixaAnunciosRegionais no topo + CartaoAnuncioRegional
//   na grelha (o país do jogador vê a publicidade DO SEU país).
// · Tetris no GameId/GAME_DEFS/lazy/boundary + gamesCatalog +
//   i18n livehub.game.tetris (pt+en) + LIVE_GAME_MODES 81→82.
// · AdminDashboard: Ação Rápida «Anúncios Regionais (MZ·AO·BR·PT)».
// · RegionalManagerPanel: branding salvo → gravarIdentidade + CSS
//   vars já (mesmo sem backend responde).

// §7. FUROS REAIS FECHADOS COM REPRO
// ──────────────────────────────────────────────────────────────
// 1. PAINEL REGIONAL INTEIRO CRASHAVA (pré-existente, apanhado pela
//    suíte E2E com auth mockada): formatMoney(x, cc) recebia o
//    CÓDIGO DE PAÍS «MZ» como moeda → Intl.RangeError «Invalid
//    currency code : MZ» no dashboard/aprovações/financeiro → FIX:
//    moeda do mapa COUNTRIES (MZ→MZN, AO→AOA, BR→BRL, PT→EUR).
// 2. TETRIS: tabuleiro nascia vazio → render antes do 1.º Jogar →
//    TypeError por frame → grelha inicializada de uma vez.
// 3. TESTE: addInitScript re-semeava a loja regional a cada
//    navegação — o clique do anúncio era apagado pelo reload do
//    destino → semente SÓ na 1.ª carga.
// 4. TESTE: innerText respeita text-transform:uppercase — asserts
//    do HUD case-insensitive.

// §8. PROVA (test-classic-v72.mjs, 53 verdes ×2, 0 skips)
// ──────────────────────────────────────────────────────────────
// A núcleo 24 · B E2E anúncios hub 6 · C E2E Tetris 8 · D E2E
// Guerra 5 · E E2E painéis auth-mockada 10. Shots ×5 (hub/tetris/
// guerra/cofundador/admin). REGRESSÃO: desafios 36/0 · kart 65/0 ·
// online 61/0 · batalha 30/0 · som 58/0 · web 11/0 · tsc -b 0 ·
// tsc app 0 · build OK.
