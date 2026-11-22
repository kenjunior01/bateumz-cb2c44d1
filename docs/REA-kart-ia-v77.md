// REA v77 — UNIÃO DA IA DO CIRCUITO: CÉREBRO DE CORRIDA (v75 local)
//                + ELITE DE DEFESA (v76 remota), NUM SÓ CÉREBRO
// ═══════════════════════════════════════════════════════════════
// Estudo de comportamento (Reverse Engineer Anything). Nada é copiado
// de código/assets externos — só comportamentos reconstruídos do zero.

// §1. O QUE ACONTECEU
// ──────────────────────────────────────────────────────────────
// Duas frentes chegaram ao mesmo destino por caminhos diferentes:
// a v75 local reescreveu o iaDecidir como CÉREBRO DE CORRIDA (linha
// de corrida, frenagem por janela, itens com intenção, bloqueio do
// líder, leque de skill) e a v76 remota deu DEFESA DE ELITE (esquiva
// dinâmica com o campo iaDesvio, óleo, trânsito, escudo inteligente,
// reação à largada com iaLargada). A união v77 é UMA função só, sem
// duplicações, que mantém TODAS as capacidades das duas.

// §2. O QUE A UNIÃO MANTÉM DA v76 (intacto, provado por 49/49)
// ──────────────────────────────────────────────────────────────
// · iaDesvio com dinâmica (sobe 9 u/s sob ameaça, relaxa 2,2 u/s,
//   teto 5,8 u, troca de lado quando a berma morde) — projéteis >
//   óleo > trânsito; olhar encolhe a 55% sob ameaça.
// · ESCUDO inteligente (fica no bolso com teleguiado longe, levanta
//   a < 28 u — o golpe MORRE nele).
// · REAÇÃO À LARGADA (iaLargada): fórmula RECALIBRADA para o leque
//   largo — reflexo pela DESTREZA (0,25…1): 0,30 − destreza×0,22 +
//   rng×0,05 → 0,08-0,35 s (a fórmula v76 com skill 0,70 punha
//   0,54 s — fora do intervalo honesto 0,04-0,4 que a suíte v76
//   exige). Humanos com 0.
// · Óleo só com rival colado atrás (< 55 u, rolo 75%); turbo para as
//   retas (curvaFrente(16) < 0,0028) + v77: ou a fugir de perseguidor
//   colado (< 14 u).
// · Servidor late-join: iaDesvio/iaLargada a zeros (v76) + leque
//   0,70-0,97 (v77).

// §3. O QUE A UNIÃO ACRESCENTA (o cérebro v77)
// ──────────────────────────────────────────────────────────────
// · LINHA DE CORRIDA (exportada pura): interior = −sinal × largura ×
//   peso do PICO de curvatura na janela (o apex manda); retas = centro.
// · FRENAGEM por JANELA 12-40 amostras (cresce com vel E destreza) em
//   vez da amostra única a +14 da v65/v76.
// · DERIVA no cotovelo (curvaMax > 0,014) — o mini-turbo de saída.
// · MOEDAS nas retas (peso 0,6, para em 10) — bots passaram de 0 moedas
//   a 6+ por corrida; o traçado nunca é trocado por moeda.
// · BLOQUEIO do líder (destreza > 0,88 espelha o 2.º, provado contra
//   CONTROLO da mesma seed).
// · ITENS: cone de tiro da verde (8-80 u, ±3,2), cascaAlvo < 150,
//   missil < 200, raio atrás no pelotão (posicao ≥ 5), NADA em alvo
//   escudado (v76) — e ZERO respingos: sem alvo/condição, o item fica
//   guardado (a v76 já era assim; a v75 local tinha respingos 0,08-0,25
//   que a união REMOVEU — guardar é a decisão inteligente).
// · LEQUE DE SKILL 0,70-0,97 (era 0,82-0,95) — de «Turbo Tia» a pro;
//   a destreza v76 escala as esquivas deles e a v77 escala linha,
//   frenagem, bloco e virada.
// · FUROS DO SLOT/ID (v77): rubber-banding online media o gap contra
//   corredores[6] (um bot em SLOTS_REDE) → primeiro humano (eJogador).

// §4. PROVA
// ──────────────────────────────────────────────────────────────
// · test-kart-ia-v76.mjs 49/49 ×2 SOBRE O CÉREBRO UNIDO (a defesa v76
//   sobrevive à união sem uma linha alterada).
// · test-kart-ia-v77.mjs NOVO 26/26 ×2 (linha interior/centro · leque
//   0,70-0,97 + largada honesta · corrida completa com moedas ≥6 e
//   combate · casca no cone dispara / sem alvo guarda 6 s · míssil
//   375 u guarda vs 40 u dispara · raio atrás · turbo por perseguição
//   vs cotovelo guardado · rubber ONLINE pelo humano (repro do furo) ·
//   bloqueio com controlo · HOMING por ID no ONLINE (míssil alvo=0
//   acerta o bot do slot 3, não o humano do slot 0 — repro do furo
//   que só o estado online revela) · E2E bots correm/apanham/vivos).
// · REGRESSÃO: kart-v65 65/0 (§9 do teste ganhou isolamento honesto:
//   com bots a correr a LINHA o piloto-de-prova ficava preso no
//   pelotão — o teste prova FÍSICA, não trânsito: bots estacionados
//   fora da volta) · online-v66 61/0 · batalha-v68 30/0 (impressões
//   re-pinadas 3.ª vez: seed 20261119 → vencedor bot 11 com 1 balão,
//   jogador 2.º por wreck, 35 golpes) · som 58/0 · gfx 28/0 ·
//   desafios 36/0 · classic 53/0 (com o fix do anúncio-futuro da v75
//   local, mantido) · regional 60/0 · desktop 35/0 · web 11/0 ·
//   tsc -b 0 · tsc app 0 · build OK.
