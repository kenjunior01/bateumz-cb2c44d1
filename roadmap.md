# Bateu corrections

- [x] Fix underlying 3D World execution/type errors without disabling checks. (v60 — docs/REA-world-fixes-v60.md: teclas presas no blur, PCFSoftShadowMap removido do three, Motor.destruir() para o contexto WebGL, dados externos validados via jogosLive.ts, ganchos E2E tipados, ZERO casts/eslint-disable novos; test-world-v60.mjs 28/28 ×2, regressão 157+39+37+37+62+54+54+76+52, tsc 0, build OK)
- [x] Make 3D World playable without registration; keep account-only rewards protected. (v61 — docs/REA-mundo-convidado-v61.md: mundo já era jogável sem registo por desenho — agora PROVADO ponta a ponta; banner do hub HONESTO ×6 idiomas; núcleo mundoConvidado.ts com o perímetro conta-apenas (4 tabelas + 10 edge functions JWT); E2E com ledger: ZERO escritas rest/tabelas conta/funções JWT para o convidado; /wallet e /my-points → /login; test-mundo-convidado-v61.mjs 65/65 ×2, regressão 157+39+37+28+37+62+54+54+76+52, tsc -b + tsc app 0, build OK)
- [x] Translate 3D World visible text into English. (v62 — docs/REA-corrections-v62.md)
- [x] Fix fullscreen entry, exit, resizing and mobile use. (v62 — docs/REA-corrections-v62.md)
- [x] Verify and correct managed Google/Apple registration and signup errors. (v62 — docs/REA-corrections-v62.md)
- [x] Replace homepage with shop/raffle discovery and top stories after visual direction selection. (v62 — docs/REA-corrections-v62.md)
- [x] Use four mobile navigation destinations plus a central World action. (v62 — docs/REA-corrections-v62.md)
- [x] Improve readability and colors in the selected public design. (v62 — docs/REA-corrections-v62.md)
- [x] Verify guest gameplay and available registration flows end to end. (v62 — docs/REA-corrections-v62.md)
- [x] Add audit P0 loading recovery: render app shell promptly, cap blocking startup waits, and provide navigable retry/fallback states. (v62 — docs/REA-corrections-v62.md)
- [x] Surface only verifiable trust and responsible-play information; do not invent licensing, operators, support contacts, payment terms, odds, or audit claims. (v62 — docs/REA-corrections-v62.md)

## v63 — Pivó do mundo 3D a pedido do utilizador (2026-11-18)

- [x] Apagar tudo o que é estilo «Minecraft» (motor voxel dos blocos, RPG voxel, cidade voxel, servidor da cidade, i18n obsoleta, rotas/links) — docs/REA-arena-v63.md §1, arquivado/voxel/.
- [x] Reconstruir o RPG como MMO de arena em vista de topo estilo League of Legends (campeões QWER, click-to-move, fonte/camps/Barão/Dragão) — docs/REA-arena-v63.md §2.
- [x] Multi-jogador real estilo hordes.io (servidor autoritativo 30 TPS, raio de interesse, cap 150, chat global, honesto online×solo) — docs/REA-arena-v63.md §2.4.
- [x] Prova: test-arena-rpg-v63.mjs 77/77 ×2 (núcleo + servidor real + E2E com 2 browsers no mesmo mundo) · test-web-v262 11/0 · tsc 0 · build OK.

## v64 — PvP da arena (2026-11-18)

- [x] Dano PvP AUTORITATIVO: o cliente só declara alvo+slot — o valor é do servidor (danoAtaqueBasico/danoHabilidade × reduzArmadura), campo `dano` do pacote é ignorado — docs/REA-arena-v64.md §1-2.
- [x] Vida/mana/escudo/progresso AUTORITATIVOS no servidor: pos sem progresso, regeneração no tick, morte e renascimento declarados pelo servidor, recompensas de abate/mob pelo servidor — docs/REA-arena-v64.md §1.
- [x] Regras LoL: fonte como zona segura para os dois lados, cadência de básico por ataquePS, cast com cd/mana autoritativos, um cast = um alvo, recompensa por abate escala com a vítima — docs/REA-arena-v64.md §2.
- [x] Cliente: alvo-herói com prioridade de clique + pursuit + auto-attack, habilidades/projéteis detetam heróis, kill feed, overlay «Abatido por X», nota PvP no menu — docs/REA-arena-v64.md §3.
- [x] Prova: test-pvp-v64.mjs 53/53 ×2 (núcleo + servidor real com anti-batota provado + E2E com 2 browsers a lutar até à morte) · test-arena-rpg-v63 77/0 · test-web-v262 11/0 · tsc 0 · build OK — docs/REA-arena-v64.md §5.

## v65 — BATEU KART: Circuito das Lendas (2026-11-18)

- [x] Kart racer estilo Mario Kart com CORRIDAS LONGAS (3 pistas de 1,5-2 km × 3-5 voltas, 12 corredores) — docs/REA-kart-v65.md §1-2.
- [x] Garagem: moedas melhoram o CARRO (motor/turbo/pneus/blindagem) e as ARMAS (casca/casca-alvo/míssil/óleo/raio) — 4 karts desbloqueáveis × 5 melhorias × 5 níveis — docs/REA-kart-v65.md §2.
- [x] Núcleo isomórfico puro pronto para servidor futuro + itens ponderados por posição, drift com mini-turbo, rampas, moedas, off-road — docs/REA-kart-v65.md §2.
- [x] Plataforma: LiveHub (?game=kart, portal imersivo, ecrã inteiro), catálogo com categoria «Corridas», i18n kart.* ×64 pt+en, progresso do aparelho — docs/REA-kart-v65.md §2.
- [x] Prova: test-kart-v65.mjs 65/65 ×2 (núcleo + E2E com chegada real e persistência) · regressão arena 77/0 · pvp 53/0 · web 11/0 · tsc 0 · build OK — docs/REA-kart-v65.md §5.

## v66 — BATEU KART ONLINE: sala de corridas partilhada (2026-11-19)

- [x] Servidor autoritativo de corridas (server/kart-servidor.mjs, npm run server:kart): o cliente manda APENAS intenção (ent ~30 Hz + uso EDGE) — o SERVIDOR simula com o MESMO núcleo do solo a 30 TPS; anti-batota por design (ninguém manda posição) — docs/REA-kart-online-v66.md §2.
- [x] Sala com rondas automáticas: lobby (countdown só com gente) → corrida (humanos nos slots de rede 6,8,10… + bots) → resultados → lobby; quem entra a MEIO espera e entra na próxima; quem desliga vira piloto-IA; teto de tempo honesto — docs/REA-kart-online-v66.md §2-3.
- [x] Núcleo multi isomórfico: passoCorpo extraído do passoCorrida (solo intato — 35 testes verdes), novaCorridaOnline, passoCorridaMulti (fim quando todos os humanos chegam + fimSala), validaOlaKart no core — docs/REA-kart-online-v66.md §2.
- [x] Cliente: RedeKart (backoff, estados honestos), motor com mirror + interpolação 10→60 fps (a entrada vai para o servidor), UI «CORRER ONLINE» com lobby/badge, payout DO APARELHO — docs/REA-kart-online-v66.md §4.
- [x] Prova: test-kart-online-v66.mjs 61/61 ×2 (núcleo + servidor real + E2E com 2 browsers na MESMA sala) · regressão kart solo 65/0 · arena 77/0 · pvp 53/0 · web 11/0 · tsc 0 · build OK — docs/REA-kart-online-v66.md §5.

## v67 — SOM E MÚSICA + furos reais de física (2026-11-19)

- [x] Motor de som 100% sintetizado (src/game/som.ts, ZERO assets): 30 efeitos + loops (motor/derrapagem do kart com pitch pela velocidade) + música procedural (menu/corrida/arena), mudo persistido no aparelho, política de autoplay respeitada — docs/REA-som-v67.md §2.
- [x] Kart com som completo: contagem 3-2-1-JÁ, motor/derrapagem por frame (solo E rede), caixa/moeda/itens/hits/mini-turbo/rampa/fanfarra de chegada, botão SOM no menu e na pausa — docs/REA-som-v67.md §3.
- [x] Arena com som: dano/nível/abate/cura/erro/chat/morte/respawn + música ambiente, botão SOM no menu — docs/REA-som-v67.md §4.
- [x] Furos reais fechados com repro: entrada online ONE-SHOT aliaseia com o tick (FIX LATCH), colisão kart-kart drenava por step de contacto contínuo e congelava pilhas nos cotovelos (FIX: só perde na aproximação), variante caixa morta, addInitScript no reload, pausa re-alimentava o pitch — docs/REA-som-v67.md §5.
- [x] Prova: test-som-v67.mjs 59/59 ×2 · kart online 61/0 ×2 · kart solo 65/0 ×2 · arena 77/0 · pvp 53/0 · web 11/0 · tsc 0 · build OK — docs/REA-som-v67.md §6.

## v68 — Limpeza RPG + Batalha de Balões (2026-11-19)

- [x] Apagar TODOS os jogos do género RPG a pedido do utilizador: BATEU RPG «Lendas da Arena» (componente + núcleo arena/* + servidor + 2 suítes), Aetheria, RPG Arena Battle e Campanha RPG — com o BATEU KART a assumir o destaque em todo o hub/rotas/i18n (338 chaves fora ×6 idiomas) — docs/REA-batalha-v68.md §1.
- [x] Modo BATALHA DE BALÕES no BATEU KART: núcleo isomórfico (batalha.ts) sobre o core intato — arena Coliseu, 12×3 balões, invulnerabilidade, wreck, último-de-pé ou teto de 180 s, ranking balões→golpes, recompensa própria — docs/REA-batalha-v68.md §2.
- [x] Motor + UI: balões 3D por kart, wreck cinzento, HUD de batalha, resultados com coluna de balões, botão 🎈 no menu, toasts de eliminação, i18n batalha.* pt+en — docs/REA-batalha-v68.md §3.
- [x] Furos reais fechados com repro: clamp das voltas (999→5), janela de eventos do core (residuais nunca processados), teto do bónus de balões no payout — docs/REA-batalha-v68.md §4.
- [x] Prova: test-kart-batalha-v68.mjs 30/30 ×2 (núcleo com batalha completa determinística de valores exatos + E2E no Coliseu) · regressão kart solo 65/0 · kart online 61/0 · som 53/0 · web 11/0 · tsc 0 · build OK — docs/REA-batalha-v68.md §5.

## v69 — Gráficos de próxima geração + música por pista (2026-11-19)

- [x] Motor visual com DOIS caminhos honestos: ALTA (composer Bloom+ACES+vinheta, sombras dinâmicas que seguem o jogador, cúpula de céu shader por tema, Phong/HDR) e LEVE (o caminho v65 intacto — `?kart-leve=1` força, botão GFX no menu persiste `bateu_gfx`) — docs/REA-graficos-v69.md §2-3.
- [x] Sistema de PARTÍCULAS de pool fixo (particulas.ts NOVO): fumo de derrapagem, chamas HDR de turbo, poeira off-road por tema, faíscas de golpe, mini-turbo azul/laranja, bursts de caixa/rampa, CONFETTI na chegada e brasas no vulcão — docs/REA-graficos-v69.md §3.
- [x] Sensação de velocidade: asfalto com tracejado/linhas (UV na fita), água da praia com caustics animadas, lava HDR pulsante, riscos de velocidade (>50% vel máx), rolagem bancária em deriva e TREMOR de impacto — docs/REA-graficos-v69.md §3.
- [x] Música POR PISTA (praia 126 tropical com onda do mar · deserto 142 frígio · vulcão 152 menor · batalha 160 diminuto — timbres por tema) + fanfarra de PÓDIO (31.º efeito da tabela) para 1.º/2.º/3.º — docs/REA-graficos-v69.md §4.
- [x] Prova: test-gfx-v69.mjs 26/26 ×2 (núcleo do pool + E2E ALTA com fumo/riscos/tremor/confetti reais + E2E LEVE intato) · regressão kart solo 65/0 · online 61/0 ×2 (com fix do piloto de pickup) · batalha 30/0 · som 58/0 · web 11/0 · tsc 0 · build OK — docs/REA-graficos-v69.md §7.

## v70 — Desafios de Empresas: prémios patrocinados (2026-11-19)

- [x] Núcleo isomórfico desafios.ts: empresas fictícias do lançamento (8), metas ×7 alimentadas por dados reais do jogo (pódio/corridas/vitórias/moedas-corrida/caixas/balões/online), estado no aparelho, CLAMAR 1× com congelamento e tetos honestos — docs/REA-desafios-v70.md §2.
- [x] BATEU KART: o fim de cada corrida/batalha/online alimenta os desafios com o resultado REAL (caixas, mini-turbos, balões, posição) e o menu ganha a secção com cartões de marca, prémio e CLAMAR — docs/REA-desafios-v70.md §3.
- [x] Plataforma: PainelDesafios no LiveHub com a SALA DE PATROCÍNIOS (formulário completo de criação de desafio por empresas) e o MESMO estado do aparelho — docs/REA-desafios-v70.md §4.
- [x] FURO REAL fechado: modal `fixed` sob ancestral com transform (framer-motion) ficava fora do ecrã (1.º clique morria) → createPortal(document.body); LIMPEZA RPG final nas Ligas (formato rpg_championship, género, colunas de classe e payloads fora) — docs/REA-desafios-v70.md §4-5.
- [x] Prova: test-desafios-v70.mjs 36/36 ×2 (núcleo 27 + E2E 9 com corrida real a alimentar progresso e claim a pagar moedas) · regressão kart solo 65/0 · online 61/0 ×2 (alvoCaixa) · batalha 30/0 · gfx 26/0 · som 58/0 · web 11/0 · tsc 0 · build OK — docs/REA-desafios-v70.md §6.

## v71 — Painéis de Marcas no Circuito (2026-11-19)

- [x] Painéis de publicidade 3D das marcas DESAFIO no circuito: textura-canvas com cor/iniciais/nome/tagline/prémio, 8 do catálogo v70 + 4 custom da Sala de Patrocínios, nos caminhos ALTA e LEVE, com sombra dinâmica no ALTA — docs/REA-paineis-v71.md §1-2.
- [x] Gancho honesto graficos().paineisMarcas + limpeza em destruir() — docs/REA-paineis-v71.md §1.
- [x] Prova: test-gfx-v69 28/0 ×2 (+2 asserções ALTA+LEVE) · regressão desafios-v70 36/0 · kart-v65 65/0 · batalha-v68 30/0 · som-v67 58/0 · online-v66 61/0 · web-v262 11/0 · tsc 0 · build OK — docs/REA-paineis-v71.md §3.

## v75 — IA de elite (2.ª vaga): xadrez motor de verdade + naval modo-alvo + ludo «vs IA» (2026-11-22)

- [x] XADREZ: src/game/chess/ia.ts NOVO (puro) — material×8 + PST por peça (rei com tabelas meio-jogo/FIM), par de bispos, peões dobrados/isolados/passados, escudo do rei, roque; negamax alfa-beta com aprofundamento iterativo + ordenação MVV-LVA + QUISCÊNCIA (fim do efeito de horizonte) + orçamento de nós por dificuldade; facil erra 35% de propósito — ChessGame.tsx vira SÓ interface (1062→685 linhas) — docs/REA-ia-v75.md §2.
- [x] BATALHA NAVAL: src/game/batalhanaval/ia.ts NOVO — dadosDaFrota() marca navios AFUNDADOS (público) e tira-os dos «hits vivos»; MODO-ALVO continua a linha (hits em linha fixam o eixo); caça = densidade completa com paridade no «médio» + semente determinística — §3.
- [x] LUDO «vs IA»: src/game/ludo/ia.ts NOVO — política terminar +1000 > capturar +500 > fugir +250 > casa segura +120 > base +90 > progresso; modo 3.º botão no componente (o Azul lança/joga sozinho, dado 6 dá vez extra como sempre, selo «IA» no cartão) — §4.
- [x] FURO DE NAVEGAÇÃO fechado: ludo e battleship tinham painel no hub mas NÃO estavam no catálogo GAME_DEFS (?game= recusado — atalhos mortos); entram na grelha (21→23 jogos).
- [x] Prova: test-ia-v75.mjs 40/40 ×2 (xadrez 12: mate em 1 Qxf7#, quiscência recusa isco defendido, promoção bxc8=Q, afogamento, facil honesto, orçamento+performance; naval 8; ludo 6; E2E 14: 2 rondas completas vs bot, ?game=battleship abre, IA do ludo lança+joga+devolve a vez — zero pageerror) · regressão classic 53/0 · desafios 36/0 · kart 65/0 · online 61/0 · batalha 30/0 · gfx 28/0 · som 58/0 · regional 60/0 · desktop 35/0 · web 11/0 · tsc 0 · build OK 49 s — worklog v75.

## v74 — Desktop real: navbar com CSS a valer + hub/kart/tetris/espaço de ecrã grande (2026-11-21)

- [x] NAVBAR: as 8 classes navbar-* usadas desde a v9 SEM CSS ganham implementação (orb pill 1 linha, anel do logo, verified dot, aurora/spotlight/progresso/scrolled/trigger) + .desktop-ambient só ≥lg — src/index.css.
- [x] HUB: hero 2 colunas ≥lg com «Destaque de hoje» (kart) + 3 atalhos · ordem desktop real (jogos ANTES das rádios, telemóvel intacto) · pesquisa desktop que FILTRA a grelha · grelha xl:grid-cols-5 com hover+JOGAR.
- [x] KART: menu ≥lg em 2 colunas (pistas/garagem/arrancar | online/desafios) — telemóvel coluna única, testids intocados.
- [x] TETRIS/ESPAÇO: legendas ≥lg (teclado+pontuação clássica · controlos P1/P2+power-ups+IA dos 5 inimigos) — invisíveis em 375px.
- [x] FUROS i18n fechados: livehub.game.kart(.desc) e livehub.game.snakesladders(.desc) não existiam — chaves cruas no ecrã; adicionadas a en/pt/es.
- [x] Prova: test-desktop-v74.mjs 35/35 ×2 (navbar 6 · hub 12 · kart 9 · legendas+mobile 6 · zero pageerror) · regressão classic 53/0 · desafios 36/0 · kart 65/0 · online 61/0 · batalha 30/0 · gfx 28/0 · som 58/0 · regional 60/0 · web 11/0 · tsc 0 · build OK — worklog v74.

## v73 — Servidor regional + ponte + Tetris Duelo 2P + IA esquiva (2026-11-21)

- [x] NÚCLEO REGIONAL PURO: regionalCore.ts NOVO (sem localStorage/DOM) — identidade, anúncios, teto 12 contra o estado, permissões («TODOS» atravessa), stats/CTR, panorama, hidratarEstado à prova de JSON podre; regionalBranding.ts wrapper fino com assinaturas intactas (v72 53/0) — docs/REA-regional-v73.md §2.
- [x] SERVIDOR REGIONAL autoritativo: server/regional-servidor.mjs NOVO (npm run server:regional, porto 8790) — O MESMO núcleo no servidor; papéis por token (admin «TODOS» · gestor por país); públicos /saude /publico/:pais /impressao /clique; /estado, /panorama (exclusivo do admin), /identidade, /anuncio, /acao com 403/422 do núcleo; persistência atómica (morre e renasce, stats sobrevivem); sem tokens → SÓ-LEITURA declarado — docs/REA-regional-v73.md §3.
- [x] PONTE CLIENTE redeRegional.ts NOVO: servidor primeiro (teto 1,8 s), espelha no aparelho, recusa do servidor devolve o motivo SEM cair local, sem servidor fonte honesta «APARELHO»; cartão «Servidor regional» + badge LIGADO/APARELHO no painel do co-fundador e badge SERVIDOR/APARELHO no AdminAds; AdSlot conta pela ponte — docs/REA-regional-v73.md §4.
- [x] TETRIS DUELO 2P: TetrisDuelo.tsx NOVO (botão no idle do solo, lazy) — 2 tabuleiros com saco/hold/nível próprios, WASD+Espaço+Q vs Setas+Enter+M, LIXO DOUBLE 1/TRIPLE 2/TETRIS 4 com furo, K.O. por topo imediato, revanche, pausa honesta dos DOIS, gancho ?duelo-teste=1 — docs/REA-regional-v73.md §5.
- [x] IA ESQUIVA na Guerra Espacial: src/game/space/ia.ts NOVO puro/determinístico — merger para longe da bala (dy≤150, x size+46, centrada → lado com mais espaço), destreza scout 1.15 > fighter 0.95 > kamikaze 0.55 > splitter 0.3 > tank/normal 0, merger 12 frames ×2.0; legenda «atiram e ESQUIVAM!» — docs/REA-regional-v73.md §6.
- [x] Prova: test-regional-v73.mjs 60/60 ×2 (núcleo 12 + esquiva 8 + servidor real 14 + E2E ponte 11 + duelo 7 + guerra 5) · regressão classic-v72 53/0 · desafios-v70 36/0 · kart-v65 65/0 · online-v66 61/0 · batalha-v68 30/0 · gfx-v69 28/0 · som-v67 58/0 · web-v262 11/0 · tsc 0 · build OK — docs/REA-regional-v73.md §7-8.

## v72 — Clássico Tetris + Guerra Espacial avançada + IA de verdade + Co-fundadores regionais (2026-11-19)

- [x] TETRIS CLÁSSICO: saco de 7, hold, fantasma, kicks, combos, B2B, níveis com curva de gravidade, partículas/tremor/flash, recorde no aparelho, teclado+móvel, pausa honesta — docs/REA-classicos-v72.md §2.
- [x] GUERRA ESPACIAL MEGA: 5 tipos de inimigo com IA (scout/fighter-que-atira/tank/kamikaze-que-mergulha/splitter), flash de dano, COMBO ×4 visível, LASER de coluna + DRONE aliado, balas inimigas, HIPERSALTO de onda — docs/REA-classicos-v72.md §3.
- [x] IA DE VERDADE: Damas minimax alfa-beta prof.5 (por dificuldade, avaliação de material/avanço/retaguarda/centro) · Cobras flood-fill de sobrevivência (fim do suicídio nos becos) — docs/REA-classicos-v72.md §4.
- [x] CO-FUNDADORES REGIONAIS MZ·AO·BR·PT: regionalBranding.ts (identidade visual + anúncios com agendamento, teto 12/país, url interna só, impressões/cliques honestos), aba Anúncios no painel regional, FaixaAnuncios+Cartão no hub, AdminAds (visão total + pausa atravessa países) — docs/REA-classicos-v72.md §5-6.
- [x] FURO REAL pré-existente fechado: painel regional crashava com Intl «Invalid currency code : MZ» (país passado como moeda) → mapa COUNTRIES — docs/REA-classicos-v72.md §7.
- [x] Prova: test-classic-v72.mjs 53/53 ×2 (núcleo 24 + E2E 29 com auth mockada nos painéis) · regressão desafios-v70 36/0 · kart-v65 65/0 · online-v66 61/0 · batalha-v68 30/0 · som-v67 58/0 · web-v262 11/0 · tsc 0 · build OK — docs/REA-classicos-v72.md §8.

## v77 — UNIÃO DA IA DO CIRCUITO: cérebro de corrida + elite de defesa num só iaDecidir (2026-11-22)

- [x] União das duas frentes que chegaram em paralelo: a ELITE v76 (esquiva dinâmica iaDesvio, óleo, trânsito, escudo inteligente, reação à largada) + o CÉREBRO DE CORRIDA (linha de corrida pelo PICO de curvatura, frenagem por JANELA 12-40 amostras, deriva no cotovelo, MOEDAS nas retas, BLOQUEIO do líder, leque de iaSkill 0,70-0,97) — uma função só, ZERO respingos de itens (guardar é a decisão inteligente) — docs/REA-kart-ia-v77.md §2-3.
- [x] iaLargada recalibrada pela DESTREZA para o leque largo: 0,30 − destreza×0,22 + rng×0,05 → 0,08-0,35 s (a fórmula v76 punha 0,54 s no piloto fraco — fora do intervalo honesto 0,04-0,4) — docs/REA-kart-ia-v77.md §2.
- [x] FURO do slot/id fechado com repro NO ONLINE: rubber-banding media o gap contra corredores[6] (um bot em SLOTS_REDE) → primeiro humano (eJogador); HOMING por id já da v76 mantido e PROVADO no estado online (míssil alvo=0 acerta o bot do slot 3) — docs/REA-kart-ia-v77.md §3.
- [x] test-kart-ia-v77.mjs NOVO 26/26 ×2 (linha/skill+larg honesta/corrida com moedas/casca cone+guarda/míssil alcance/raio atrás/turbo por perseguição/rubber ONLINE/bloqueio com controlo/homing online/E2E) · test-kart-ia-v76 49/49 ×2 SOBRE O CÉREBRO UNIDO · regressão kart-v65 65/0 (§9 com isolamento honesto: o teste prova FÍSICA, não trânsito) · online-v66 61/0 · batalha-v68 30/0 (impressões 3.ª re-pin: vencedor bot 11, jogador 2.º wreck, 35 golpes) · som 58/0 · gfx 28/0 · desafios 36/0 · classic 53/0 · regional 60/0 · desktop 35/0 · web 11/0 · tsc 0 · build OK — docs/REA-kart-ia-v77.md §4.

## v76 — IA de elite do circuito (2026-11-22) (2026-11-22)

- [x] ESQUIVA: projéteis (casca reta 46 u · casca-alvo/míssil teleguiados 62 u) e óleo (48 u) com lateral dinâmica iaDesvio (teto ±5,8 u, troca de lado na berma), escala pela destreza iaSkill (0,25…1) — docs/REA-kart-ia-v76.md §1-2.
- [x] ESCUDO INTELIGENTE + ITENS COM CABEÇA: escudo guardado com míssil à vista e levantado a < 28 u; turbo só na reta (curvaFrente < 0,0028); armas não desperdiçadas em alvo com escudo; óleo só com rival colado atrás; trânsito desvia do choque; reação à largada iaLargada 0,08…0,37 s (humano 0) — docs/REA-kart-ia-v76.md §1.
- [x] FURO REAL v65 fechado: homing indexava o ARRAY com um ID (em ONLINE o míssil perseguia o kart ERRADO) → find por id; direção com olhar encolhido 55% sob ameaça (o desvio passa à frente da direção na iaDecidir) — docs/REA-kart-ia-v76.md §3.
- [x] Prova: test-kart-ia-v76.mjs 49/0 ×2 (largada/esquiva/óleo/escudo/itens/trânsito/relaxa/rubber-band/determinismo/corrida completa nas 3 pistas) · regressão kart 65+61+30 · gfx 28 · som 58 · desafios 36 · classic 53 · regional 60 · desktop 35 · web 11 · tsc 0 · build OK — docs/REA-kart-ia-v76.md §4-5.
