// REA v73 — SERVIDOR REGIONAL + PONTE + TETRIS DUELO 2P + IA ESQUIVA
// ═══════════════════════════════════════════════════════════════
// Estudo de comportamento (Reverse Engineer Anything) dos líderes
// do nicho para as 4 entregas desta versão. Nada é copiado de
// código/assets externos — só comportamentos reconstruídos do zero.

// §1. PEDIDOS DO UTILIZADOR → ENTREGUES
// ──────────────────────────────────────────────────────────────
// · «aquele plano continua a implementar» — o plano é o da v72: os
//   «Honesto» pendentes eram (a) o estado regional vivia SÓ no
//   aparelho, (b) Tetris 2P, (c) inimigos que não esquivavam balas.
//   A v73 fecha os TRÊS:
//   (a) → SERVIDOR REGIONAL autoritativo + PONTE cliente (§2-4);
//   (b) → TETRIS DUELO 2P no mesmo ecrã (§5);
//   (c) → ESQUIVA de balas na Guerra Espacial (§6).
// · «o admin é o único que consiga ver tudo» → as permissões agora
//   são executadas NO SERVIDOR (não só na UI): gestor 403 ao
//   atravessar país; panorama 403 para quem não é admin (§3).

// §2. NÚCLEO REGIONAL PURO (src/lib/regionalCore.ts — NOVO)
// ──────────────────────────────────────────────────────────────
// Comportamento reconstruído dos líderes (playfab/clash Royale:
// «a MESMA lógica de jogo corre no cliente e no servidor — o
// servidor é a autoridade, o cliente é previsão»): extraímos TODO
// o regionalBranding v72 para um núcleo SEM localStorage, SEM DOM:
// · estadoPadrao() / hidratarEstado(cru) — nascer completo e
//   recuperação de JSON podre (o servidor lê ficheiro; o aparelho
//   lê localStorage — os DOIS passam pelo MESMO hidratar).
// · validarIdentidade + aplicarIdentidade — regras v72 intactas
//   (hex #rrggbb, nome 3-40, iniciais 2-3 uppercase, slogan 3-120).
// · validarAnuncio(entrada, estado) + aplicarAnuncio — título 3-40,
//   texto 3-120, etiqueta 2-24, URL INTERNA (sem «//»), teto de 12
//   por país VERIFICADO CONTRA O ESTADO recebido (é isto que deixa
//   o servidor aplicar o teto à maneira dele), janela inicia/termina.
// · agirAnuncioEm(estado, id, ação, paisDoGestor) — a PERMISSÃO
//   central: «TODOS» atravessa países; gestor só o SEU país.
// · registrarImpressaoEm / registrarCliqueEm / estatisticasPaisDe /
//   panoramaDe / urlSegura — stats honestas e visão total.
// O regionalBranding.ts ficou WRAPPER FINO: mesmas assinaturas,
// re-exporta tudo (v72 não muda UMA linha de chamada) — 53/53
// da suíte v72 provam a compatibilidade.

// §3. SERVIDOR REGIONAL (server/regional-servidor.mjs — NOVO)
// ──────────────────────────────────────────────────────────────
// HTTP puro (node:http — ZERO dependências novas), o MESMO padrão
// honesto do kart-servidor v66:
// · NÚCLEO IMPORTADO DO CLIENTE: o servidor importa
//   src/lib/regionalCore.ts (Node ≥22 stripa os tipos) —
//   impossível «no servidor vale outra regra».
// · PAPÉIS por token Bearer (operador define por env):
//   REGIAO_ADMIN_TOKEN (papel «TODOS»), REGIAO_GESTOR_<PAIS>
//   (papel do país). SEM tokens → modo SÓ-LEITURA declarado em
//   /saude (escritaAberta: false) — nunca «demo que deixa passar».
// · ROTAS públicas: /saude · /publico/:pais (ativos do país para
//   qualquer visitante) · /impressao · /clique (contagem honesta).
// · ROTAS autenticadas: /estado (gestor vê SÓ o seu país: papel,
//   identidade, anúncios, stats, teto; admin recebe o estado COMPLETO
//   + panorama) · /panorama (403 para quem não é admin — o ÚNICO
//   poder exclusivo) · /identidade · /anuncio · /acao (as permissões
//   do núcleo → 403 quando o gestor atravessa país, 422 com o motivo
//   do núcleo quando a validação recusa).
// · PERSISTÊNCIA honesta: server/data/regional-estado.json com
//   escrita ATÓMICA (tmp + rename) — a suíte MATA o servidor,
//   relança com o MESMO ficheiro e as stats sobrevivem (prova).
// · Higiene: corpo máx 16 KB, rate limit 180 req/min por IP,
//   CORS aberto para a plataforma, OPTIONS 204.
// · npm run server:regional (PORT default 8790 — longe do 8767 kart
//   e do 8798 online para nunca colidirem).

// §4. PONTE CLIENTE (src/lib/redeRegional.ts — NOVO)
// ──────────────────────────────────────────────────────────────
// Comportamento reconstruído dos líderes (supabase local-first:
// «escreve na rede, espelha no local, e se a rede cair o local é
// a verdade»): a ponte tenta o SERVIDOR primeiro (teto 1,8 s por
// pedido) e ESPELHA no aparelho — o hub (AdSlot) e os painéis
// continuam a ler do aparelho SEM saber disto:
// · carregarEstado() — admin: espelha o estado COMPLETO; gestor:
//   espelha identidade+anúncios do SEU país; sem servidor → estado
//   do aparelho com fonte: "aparelho" (NUNCA finge sincronização).
// · publicarIdentidade / publicarAnuncio / agirRemoto — servidor
//   primeiro; recusa DO SERVIDOR devolve o motivo do núcleo (não
//   cai para o aparelho — evita «no servidor 403 mas grava local»);
//   servidor INDISPONÍVEL → o aparelho resolve (nada se perde).
// · contarImpressao / contarClique — aparelho SEMPRE + servidor
//   fire-and-forget.
// · Config no aparelho (bateu_regional_url / bateu_regional_token)
//   + testarServidor() com mensagem honesta.
// INTEGRAÇÃO nos painéis: RegionalManagerPanel (aba Anúncios ganha
// o cartão «Servidor regional» com badge LIGADO/APARELHO + URL +
// token + Ligar) e AdminAds (badge SERVIDOR/APARELHO + cartão de
// ligação) — a FONTE é sempre VISÍVEL, nunca escondida.
// AdSlot passa a contar impressões/cliques pela ponte (aparelho +
// servidor quando existe).

// §5. TETRIS DUELO 2P (src/components/livegames/TetrisDuelo.tsx — NOVO)
// ──────────────────────────────────────────────────────────────
// Comportamento reconstruído do clássico «Tetris Battle»:
// · DOIS tabuleiros 10×20 no mesmo ecrã, cada um com o SEU saco
//   de 7, hold, fantasma, lock delay e nível próprio (gravidade
//   acelera por jogador).
// · TECLADO de sofá: P1 = WASD move/roda + S desce + ESPAÇO queda
//   dura + Q hold; P2 = SETAS + ENTER queda dura + M hold.
//   P pausa OS DOIS honestamente (fase congela).
// · O CORAÇÃO: LIXO — DOUBLE manda 1 linha, TRIPLE 2, TETRIS 4
//   (LIXO_POR_LINHA); cada linha é cinzenta («X») com UM furo
//   aleatório e SOBE do fundo do rival. Se as linhas de CIMA têm
//   blocos → K.O. IMEDIATO (terminar(1-de) — quem mandou vence,
//   não espera o próximo lock: furo real fechado com a suíte).
// · HUD: pontos/nível por jogador + «lixo enviado» honesto
//   (duelo-enviado-N) · K.O. em X por cima de quem morreu ·
//   overlay «JOGADOR N VENCEU» + revanche + voltar ao solo.
// · Entrada: botão «Duelo 2P — mesmo ecrã» no idle do Tetris solo
//   (lazy — o solo continua leve); telemóvel é honesto: o duelo
//   é de teclado, declarado no ecrã.
// · Gancho de teste HONESTO: ?duelo-teste=1 expõe __duelo com as
//   MESMAS funções dos jogadores (js, mandarLixo, fixar, terminar,
//   faseRef) — nunca em jogadas reais.

// §6. IA ESQUIVA — GUERRA ESPACIAL (src/game/space/ia.ts NOVO)
// ──────────────────────────────────────────────────────────────
// Comportamento reconstruído dos shmups arcade (Ikaruga/R-Type:
// «inimigos com piloto desviam-se dos tiros; tanques comem»):
// · decidirEsquiva(e, balas, larguraCampo) — PURO e DETERMINÍSTICO:
//   bala ABAIXO do inimigo (dy ≤ 150) e perto em x (size+46) →
//   merger PARA LONGE da bala mais próxima; bala CENTRADA (|dx|<10)
//   → foge para o lado com MAIS espaço no campo.
// · DESTREZA por tipo: scout 1.15 > fighter 0.95 > kamikaze 0.55 >
//   splitter 0.3 > tank/normal 0 (o TANK é um tanque — nunca desvia).
// · Merger DECIDIDO: duração 12 frames a 2.0 px/s × skill (não é
//   tremor); decidirEsquiva devolve 0 enquanto dodgeCd > 0.
// · Integração: no loop de inimigos, ANTES da IA por tipo da v72 —
//   scout continua zigue-zague e ainda desvia; kamikaze MERGE em
//   direção ao alvo e desvia um pouco; fighter strafa, atira E
//   desvia. Mini-splitters herdam kind "normal" → não desviam.
// · Legenda do ecrã de início: «fighters (atiram e ESQUIVAM!)».

// §7. FUROS REAIS fechados com repro (apanhados pela suíte)
// ──────────────────────────────────────────────────────────────
// · K.O. por lixo não terminava o duelo (esperava o próximo lock
//   e o morto continuava a simular) → mandarLixo chama terminar
//   JÁ; a suíte mata o P2 por lixo e exige «JOGADOR 1 VENCEU».
// · Wrapper regionalBranding importava o núcleo SEM «.ts» — o Node
//   da suíte não resolve (ERR_MODULE_NOT_FOUND) → import com
//   extensão (allowImportingTsExtensions no tsconfig).
// · Porto 8798 colidia com a sala C do kart online → regional
//   default agora é 8790 (kart 8767, online 8798, regional 8790).
// · Suíte: secção C deixa o ficheiro de estado PERSISTIDO (é a
//   prova de persistência) → secção D relança com ficheiro NOVO
//   para as contagens dos E2E serem exatas.

// §8. PROVA (test-regional-v73.mjs — 60 verdes ×2 corridas, 0 skips)
// ──────────────────────────────────────────────────────────────
// A núcleo 12 — estado de nascer 4 países/validações/perm/stats/
// panorama/urlSegura/hidratar podre/teto 12.
// B esquiva 8 — regras todas + destrezas + DETERMINISMO 2×.
// C servidor real 14 — /saude/401/papel/publicação/403 cruzado/
// panorama exclusivo/impressão-clique públicos//publico/422 motivo/
// teto 12/PERSISTÊNCIA morre-renasce/admin atravessa/SÓ-LEITURA.
// D E2E ponte 11 — badge LIGADO/linha no painel/anúncio NO
// SERVIDOR/espelho no aparelho/admin SERVIDOR+panorama+pausa
// atravessa (verificada no servidor)/modo APARELHO honesto.
// E duelo 7 — botão/2 tabuleiros/teclas dos dois/LIXO mata com
// K.O./revanche/pausa congela/ZERO pageerror.
// F guerra espacial 5 — início/legenda ESQUIVAM/HUD/3 s de
// combate/ZERO pageerror.
// REGRESSÃO: classic-v72 53/0 · desafios-v70 36/0 · kart-v65 65/0 ·
// online-v66 61/0 · batalha-v68 30/0 · gfx-v69 28/0 · som-v67 58/0 ·
// web-v262 11/0 · GATES: tsc -b 0 · tsc app 0 · build OK.

// §9. Honesto (o que fica)
// ──────────────────────────────────────────────────────────────
// · O servidor regional é um SERVIÇO DO OPERADOR (npm run
//   server:regional) — sem ele, TUDO continua no aparelho como
//   sempre (os badges declaram a fonte ativa).
// · Tokens por env (não há ainda contas supabase de co-fundador
//   ligadas ao servidor — é o próximo passo quando o backend
//   supabase regional existir).
// · O duelo é teclado-de-sofá (sem touch para 2 num só telemóvel).
// · Kamikaze desvia MENOS de propósito (dedicado) — o «esquivar
//   perfeito» de cada tipo é o próximo nível de IA.
