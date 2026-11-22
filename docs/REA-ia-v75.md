// REA v75 — IA DE ELITE (2.ª vaga): XADREZ · BATALHA NAVAL · LUDO
// ═══════════════════════════════════════════════════════════════
// Estudo de comportamento (Reverse Engineer Anything) dos motores
// de referência do nicho para as 3 entregas desta versão. Nada é
// copiado de código/assets externos — só comportamentos reconstruídos
// do zero (tabelas e regras clássicas do domínio público do xadrez).

// §1. PEDIDO DO UTILIZADOR → ENTREGUE
// ──────────────────────────────────────────────────────────────
// «melhore a inteligência dos jogos» (plano) — a v72 levantou Damas
// (minimax α-β prof.5), Cobras (flood-fill) e a Guerra Espacial (5
// IAs); a v73 deu ESQUIVA aos inimigos e conect4 já tinha minimax d6.
// A auditoria v75 encontrou os TRÊS buracos que restavam:
//   (a) XADREZ: «facil» = aleatório puro, «medio» = guloso 1-ply,
//       «dificil» = minimax 2-ply SÓ material — a IA comia isco
//       defendido por efeito de horizonte (§2);
//   (b) BATALHA NAVAL: o «difícil» tinha mapa de densidade mas SEM
//       modo-alvo a valer — o +10 nos vizinhos continuava a gastar
//       tiros em volta de navios JÁ AFUNDADOS (§3);
//   (c) LUDO: ZERO IA — só hot-seat (passar o telemóvel), sem
//       adversário de máquina nenhum (§4).
// BÓNUS — FURO DE NAVEGAÇÃO fechado: Ludo e Batalha Naval tinham
// painel no hub (`active === "ludo"/"battleship"`) mas NÃO estavam no
// catálogo GAME_DEFS — o `?game=` era recusado pelo jogoValido() e
// TODOS os atalhos caíam no jogo errado. Entram agora na grelha (21→23).

// §2. XADREZ — MOTOR DE VERDADE (src/game/chess/ia.ts — NOVO)
// ──────────────────────────────────────────────────────────────
// Comportamento reconstruído dos motores de referência (Stockfish
// «eval = material + PST», CPW «negamax + quiescence + MVV-LVA»):
// · TUDO em OITAVOS (P=8 N=24 B=24 R=40 Q=72 K=800) para as tabelas
//   de posição clássicas (-50..+50) entrarem inteiras na conta.
// · PST por peça (peão/cavalo/bispo/torre/dama + REI com DUAS tabelas:
//   meio-jogo e FIM quando o material não-peão desce — o rei passa a
//   peça ativa em vez de esconder-se no canto).
// · Avaliação: material + PST + par de bispos + peões dobrados/
//   isolados/passados (por coluna, com «linha de avanço») + escudo
//   de peões do rei + direito de roque (só na abertura).
// · Busca: negamax alfa-beta com APROFUNDAMENTO ITERATIVO (cada
//   iteração completa guarda o melhor — se a seguinte estourar o
//   orçamento, fica a anterior), ORDENAÇÃO (promo-dama > capturas
//   MVV-LVA > roque > ganho de PST) e QUISCÊNCIA (só capturas, teto
//   6) — o fim do efeito de horizonte: o motor DEIXA de comer o
//   peão defendido (prova: posição Qxd5?? Nxd5, dificil recusa).
// · Orçamento de NÓS por dificuldade (facil 8k · medio 60k ·
//   dificil 300k) — nenhum lance passa de uma respiração, honesto
//   em aparelho fraco. Mate = MATE−ply (prefere o mate mais curto).
// · Dificuldades HONESTAS: facil = prof.1 + ERRO DE PROPÓSITO 35%
//   (jogável para principiantes); medio = prof.2 + quiscência;
//   dificil = prof.3 + quiscência. RNG mulberry32 com semente
//   opcional — os testes semeiam e esperam o MESMO lance; no ecrã
//   é Math.random (nada de padrão decorado).
// · ChessGame.tsx ficou SÓ interface: a lógica pura saiu TODA para
//   o módulo (mesmo contrato getBestMove → 0 linhas de chamada
//   mudadas; 1062→685 linhas de componente).

// §3. BATALHA NAVAL — MODO-ALVO + DENSIDADE (src/game/batalhanaval/ia.ts — NOVO)
// ──────────────────────────────────────────────────────────────
// Comportamento reconstruído dos bots de referência (naval «hunt/
// target com sunk-awareness», densidade por colocação):
// · dadosDaFrota(tabuleiroReal, tamanhosBase): componentes ligados
//   de células {ship,hit}; componente TODO-hit = navio AFUNDADO —
//   público como no jogo real («afundaste o meu cruzador!»), consome
//   UM tamanho da lista e marca as células para nunca mais atrair
//   tiro (navios que se tocaram fundem componentes — consome o
//   maior tamanho que caiba, fallback honesto).
// · MODO-ALVO: só hits de navios AINDA VIVOS guiam; as colocações
//   dos navios restantes que cobrem um hit vivo é que pontuam —
//   hit isolado abre os 4 eixos, dois hits em linha FIXAM o eixo e
//   a IA continua a linha até afundar (prova: hits (0,1)+(1,1) →
//   tiro em (2,1), não em (4,3)).
// · CAÇA: mapa de densidade COMPLETO (cada colocação válida de cada
//   navio restante conta 1 por célula vazia — sem sobrepor navios);
//   «médio» aplica PARIDADE (r+c) par (navios ≥2 nunca escapam a
//   escadas); «difícil» densidade pura; «facil» aleatório dentro do
//   legal. Determinística com semente (mulberry32).
// · BattleshipGame.tsx: os ~100 linhas de helpers locais saíram;
//   o efeito do bot passa dadosDaFrota + escolherTiro com rng
//   semeada por partida (reset re-semeia).

// §4. LUDO — ADVERSÁRIO DE MÁQUINA (src/game/ludo/ia.ts — NOVO)
// ──────────────────────────────────────────────────────────────
// O Ludo não tinha IA nenhum. Política reconstruída dos ludos de
// referência (prioridade clássica «terminar > capturar > fugir >»):
// · destinoValido = MESMA regra do canMove do componente (base -1
//   só sai com 6, coluna 52..57, fim 58, entrada por HE[jogador]) —
//   isolada pura para os testes.
// · pontuarJogada: TERMINAR +1000 · CAPTURAR +500 (fora de casa
//   segura) · FUGIR DO PERIGO +250 (sair de casa ameaçada por
//   inimigo a 1..6 passos atrás) · CASA SEGURA/coluna +120 · TIRAR
//   DA BASE +90 · progresso puro (0..58). Desempate com rng×4 —
//   menos robótico, semeável nos testes.
// · Modo «vs IA» NOVO no componente (além de 2J/4J): o Azul lança
//   (700 ms), escolhe com escolherPecaIA e joga (600 ms); o dado 6
//   dá a vez EXTRA exatamente como nas regras de sempre; sem lance,
//   o efeito de passar a vez trata (nada duplicado). O humano vê o
//   selo «IA» no cartão do Azul.

// §5. PROVAS
// ──────────────────────────────────────────────────────────────
// test-ia-v75.mjs NOVO: 40 verdes ×2 corridas consecutivas:
// · A) xadrez 12 — perft 20/20 (prof.2 = 400) · MATE EM 1 Qxf7#
//   com pontuação MATE−1 · xeque detetado · QUISCÊNCIA recusa o
//   peão defendido (Qxd5?? Nxd5) e o lance devolvido é SEMPRE legal
//   · abertura PST é uma das clássicas (e4/d4/Cf3/Cc3) · promoção
//   bxc8=DAMA a ganhar a torre · afogamento = lance null · «facil»
//   30 sementes → 7 lances diferentes, todos legais · determinismo
//   · orçamento de nós (≤300k, prof.3 real) · performance: 4 lances
//   dificil em 421 ms (nenhum > 1500 ms).
// · B) naval 8 — linha de hits continuada · afundado não atrai
//   (mapa soComHits sem vivos = zero) · hit vivo guia o mapa ·
//   densidade centro > canto · paridade no médio · facil dentro do
//   legal · dadosDaFrota consome tamanho · determinismo.
// · C) ludo 6 — terminar · capturar (com capturaEm verificado) ·
//   fugir · casa segura · sem lance = -1 · determinismo.
// · D) E2E 14 — xadrez: 2 rondas COMPLETAS contra o bot dificil
//   (1.e4 → resposta, 2.d4 → resposta — loop vivo, não resposta
//   única) · naval: ?game=battleship AGORA ABRE (furo do catálogo),
//   jogador dispara e o computador responde («Turno 3») · ludo:
//   ?game=ludo abre, modo IA, humano rola/move e a IA lança+joga+
//   devolve a vez (dado costurado 0.9999→sempre 6, SÓ nesta página,
//   zero sorte de teste) · ZERO pageerror nas três secções.

// §6. REGRESSÃO COMPLETA (todas as suítes, uma a uma)
// ──────────────────────────────────────────────────────────────
// classic-v72 53/0 · desafios-v70 36/0 · kart-v65 65/0 ·
// kart-online-v66 61/0 · kart-batalha-v68 30/0 · gfx-v69 28/0 ·
// som-v67 58/0 · regional-v73 60/0 · desktop-v74 35/0 ·
// web-v262 11/0 · tsc -b 0 · tsc app 0 · build OK 49 s.

// §7. HONESTO (o que fica)
// ──────────────────────────────────────────────────────────────
// · O motor de xadrez é prof.3 com quiscência — NÃO é Stockfish:
//   jogadores bons ainda ganham ao «dificil», mas ele nunca mais
//   come isco defendido nem desperdiça mate em 1.
// · A frota naval fundida (navios que se tocam) é aproximada por
//   componentes — o bot pode gastar 1-2 tiros extra nesses casos
//   raros (honesto: sem espiar o tabuleiro além do que o jogo real
//   anuncia).
// · A IA do Ludo não simula o adversário (1-ply ponderado) — o
//   dado é sorte e a política cobre as decisões que importam.
// · PongVS/TicTacToePro/Connect4/Damas/Cobras/Space/Kart já tinham
//   IA a valer (v54-v73) — nada foi mexido (65/61/53/… continuam
//   verdes).
// · «facil» do xadrez erra 35% de propósito — é DIFICULDADE, não
//   bug; o selo está na suíte (30 sementes, 7 lances diferentes).
