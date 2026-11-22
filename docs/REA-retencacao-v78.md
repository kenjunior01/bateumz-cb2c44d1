// REA v78 — «JOGOS NO CENTRO DA RETENÇÃO»
// ═══════════════════════════════════════════════════════════════
// Estudo de comportamento (Reverse Engineer Anything) — nada é
// copiado de código/assets externos, só comportamento reconstruído.

// §1. PEDIDO DO UTILIZADOR → ENTREGUES NESTA VERSÃO
// ──────────────────────────────────────────────────────────────
// «Os jogos não são uma funcionalidade secundária: são o MOTOR DE
// RETENÇÃO do Bateu. Não eliminar os jogos — eliminar a
// DESORGANIZAÇÃO entre jogos, pontos, prémios, sorteios e mercado.
// Jogos geram pontos. Pontos geram progressão. Progressão
// desbloqueia prémios. Prémios dão motivo para regressar.»
// Entregues nesta v78 (fatia 1):
// (a) NÚCLEO PURO de progressão (pontos → níveis → missões →
//     recomendações) — isomórfico, determinístico, sem localStorage;
// (b) as QUATRO CARTEIRAS SEPARADAS no ecrã (Pontos ≠ Bilhetes ≠
//     Prémios ≠ Saldo — nunca misturadas, sem conversão implícita);
// (c) o ciclo REAL a funcionar: partida do KART → pontos (com teto
//     do catálogo) → missão «Joga BATEU KART» → reclamar → pontos;
// (d) banner honesto do CONVIDADO («Joga sem registo. Regista-te
//     para guardar os teus pontos e desbloquear prémios.»);
// (e) cartões de jogo com o BENEFÍCIO («Até 120 pontos») — o
//     catálogo ganhou minutos/pontosMax/dificuldade declarados.

// §2. NÚCLEO (src/lib/progressao.ts — NOVO, padrão regionalCore v73)
// ──────────────────────────────────────────────────────────────
// · NÍVEIS 1-5 (Novo jogador → Explorador → Competidor → Campeão →
//   Lenda Bateu) com limiares 0/500/2000/6000/15000 e desbloqueios
//   COSMÉTICOS/estruturais — a suíte PROVA que nenhum unlock contém
//   stats/moedas/velocidade (vantagem injusta é impossível por
//   construção); nível máximo devolve proximo: null (honesto).
// · PONTOS: registrarPontosDeJogo com TETO por jogo (do catálogo —
//   fonte única de verdade, pontosMaxDe) — relatório exagerado é
//   capado; negativo/teto inválido reusados com motivo. Os pontos
//   NUNCA expiram (não existe caminho que os retire).
// · MISSÕES DO DIA: 3/dia sorteadas por Fisher-Yates com xorshift32
//   semeado por (dia local + jogadorId) — o MESMO dia vê as MESMAS
//   missões em qualquer dispositivo; terminam 23:59:59.999 local;
//   re-agendamento NUNCA apaga progresso; expiradas saem do estado.
//   FURO CAÇADO PELA SUÍTE: a rotação por janela consecutiva
//   NUNCA juntava «Joga BATEU KART» + «2 jogos diferentes»
//   (combinações impossíveis = missões chatas) → embaralhamento.
// · registarEvento: jogo/vitória reais → progresso de missões com
//   alvo nunca ultrapassado; clamarMissao paga UMA vez (recusa
//   «ja»/«falta»/«expirada»/«inexistente»).
// · AVISO honesto de expiração (< 6 h → expiraBreve) — nada expira
//   sem aviso (regra do produto).
// · RECOMENDAÇÕES por REGRAS (NÃO IA): missão ativa 1.ª → convidado
//   → pouco tempo → nível ≤ 2 fáceis → nível ≥ 3 multiplayer →
//   teto 4, cada uma com razão HONESTA ligada a dados reais.
// · visaoCarteiras: monta a EXIBIÇÃO das 4 carteiras a partir das
//   FONTES reais de cada uma — o núcleo NÃO TEM API de conversão
//   pontos↔dinheiro (a suíte prova por ausência).
// · hidratarProgressao à prova de JSON podre (padrão v73).

// §3. INTEGRAÇÃO
// ──────────────────────────────────────────────────────────────
// · progressaoStore.ts (wrapper fino, padrão regionalBranding):
//   localStorage `bateu_progressao_v78` + hook useProgressao; TODA
//   mutação passa PELO NÚCLEO; registrarPartida = UMA transição
//   atómica (jogo + vitória + pontos com teto).
// · PainelProgressao.tsx NOVO no topo do hub (antes da grelha, em
//   telemóvel e desktop): faixa de progressão, missões do dia com
//   CLAIM, recomendações com razão, 4 carteiras, banner convidado.
//   É o ÚNICO dono da store; os jogos anunciam no bus do window
//   (`bateu:partida` { jogoId, vitoria, pontos }).
// · BateuKart.tsx: no payout, anuncia a partida (pontos por posição:
//   1.º=120 … 12.º=10, teto pontosMaxDe("kart")) — o jogo NUNCA
//   escreve estado da progressão diretamente.
// · gamesCatalog.ts: GameDef ganhou minutos/pontosMax/dificuldade
//   (declarações do produto exibidas ao jogador) + pontosMaxDe().

// §4. GUARDRAILS DO UTILIZADOR (as «coisas a evitar» → regras)
// ──────────────────────────────────────────────────────────────
// · pontos que expiram sem aviso → IMPOSSÍVEL (não expiram + aviso
//   nas missões);
// · missões impossíveis → IMPOSSÍVEL (alvos vêm de MODELOS
//   validados; a suíte prova);
// · misturar pontos com saldo financeiro → IMPOSSÍVEL (4 carteiras
//   separadas, sem conversão no núcleo);
// · IA a decidir benefícios → RECOMENDAÇÕES SÃO REGRAS (o produto
//   permite IA para TEXTO/assistência; a recompensa é sempre do
//   sistema).
// Fica para as próximas fatias (Honesto): assistente de prémios com
// dados reais da conta via ia-proxy; narrador de torneios; moderação
// que SÓ sinaliza (decisão final = regras + revisão humana);
// navegação global Início/Jogos/Ao vivo/Desporto/Prémios/Perfil;
// página Prémios com resgates e parceiros; bilhetes/prémios/saldo a
// alimentar as carteiras com as FONTES reais (hoje mostram 0 honesto).

// §5. PROVA
// ──────────────────────────────────────────────────────────────
// test-retencacao-v78.mjs NOVO 38/38 ×2 (núcleo 30 — níveis/limiares/
// desbloqueios sem stats · pontos teto+recusas · missões
// determinísticas/teto 3/modelos válidos/fim-de-dia/re-agendamento
// sem apagar progresso · progresso por eventos + claim único ·
// aviso de expiração · recomendações por regras · 4 carteiras +
// ausência de conversão · hidratar podre · E2E 8 — painel no hub ·
// banner convidado · 4 carteiras visíveis · nível com nome ·
// missões · cartão do kart «Até 120 pontos» · CICLO REAL partida →
// pontos → missão completa → reclamar → 220 pontos no aparelho ·
// recomendações ≤4 · ZERO pageerror).
// REGRESSÃO: desktop-v74 35/0 (hub com o painel novo) · kart-v65
// 65/0 · online-v66 61/0 · gfx-v69 28/0 · som-v67 58/0 ·
// desafios-v70 36/0 · web-v262 11/0 · GATES: tsc -b 0 · tsc app 0 ·
// build OK.
