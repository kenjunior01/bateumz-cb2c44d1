# REA — Desporto Real (v24)

**REA (Reverse Engineer Anything / Referência de Excelência Aplicada)** — a última vertente do
pedido original (esportes · torneios · campeonatos · sorteios · competições · concursos) que tinha
ficado por construir: o **módulo de desporto com dados REAIS**, benchmark dos líderes mundiais,
sem uma linha de dados inventados (padrão de honestidade do REA v23).

---

## 1. BENCHMARK MUNDIAL → O QUE FOI APLICADO

### 1.1 HUB DE DESPORTO — benchmark: **SofaScore · FlashScore · 365Scores**
| Padrão dos líderes | Estado ANTES | AGORA na Bateu |
|---|---|---|
| Ligas grandes em chips com troca imediata | ❌ não existia módulo | ✅ 7 competições reais: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, NBA |
| Jornada como unidade de navegação | — | ✅ seletor de jornada (anterior/próxima) + **pista automática** da jornada atual (jogos disputados na classificação + 1) |
| Separar "próximas / a decorrer / resultados" | — | ✅ abas Partidas (futuras + ao vivo), Resultados (placar FT), Top 5, Meus Palpites |
| Estado do jogo honesto | — | ✅ `Agendado` / `A decorrer` / `Intervalo` / `Fim` / `Adiado` derivado do **status da fonte + relógio** — nunca minuto nem placar fabricados |
| Refresh em jogos ao vivo | — | ✅ polling `fresh` só quando há jogo a decorrer e a página está visível (respeita rate-limit) |
| Dados reais com atribuição | — | ✅ "Dados desportivos © TheSportsDB (plano gratuito)" no cabeçalho e rodapé |

**Fonte de dados**: TheSportsDB v1 (chave de teste pública `123`, CORS aberto, sem chave própria
necessária). Limites do plano gratuito respeitados e **comunicados na UI** (Top 5 da classificação;
sem minuto-a-minuto). Camadas de robustez no cliente:
- cache localStorage com TTL (jornada 5 min, classificação 30 min);
- dedupe de pedidos em voo + fila serializada (≤ 1 pedido/1,5 s → sobrevive ao limite de 30/min);
- fallback stale-on-error (offline/429 mostra o último dado válido em vez de ecrã vazio);
- estados de erro com "Tentar novamente" (padrão v23).

### 1.2 PALPITES — benchmark: **tote/parimutuel (tototurf) · Stake social · split-the-pot**
Aposta desportiva clássica exige odds de casa de apostas (licença + risco de tesouraria). O padrão
comunitário **parimutuel** é mais honesto e mais social — aplicado por inteiro:
| Padrão | AGORA |
|---|---|
| Pool comunitário por partida (1 · X · 2) | ✅ quem acertar divide **95% do prémio total** proporcional ao valor apostado (5% taxa da plataforma, igual aos duelos P2P) |
| Palpites fecham ao apito inicial | ✅ guard **server-side** (trigger Postgres rejeita INSERT com kickoff no passado) + validação no cliente |
| Escrow real na carteira | ✅ débito imediato na carteira de jogo (a mesma dos duelos P2P) com **rollback** se o registo falhar |
| Liquidação só pelo servidor | ✅ edge function `settle-sport-predictions`: RLS **sem UPDATE** para utilizadores; service_role liquida contra o resultado oficial da fonte |
| Prova social real | ✅ barras de distribuição do pool (nº de palpites e % por escolha) de uma view pública **agregada** (nunca dados de utilizadores) |
| Partida adiada/sem resultado | ✅ reembolso integral (void) — adiamento ou 7 dias sem resultado oficial |
| Transparência | ✅ 18+ e regras no modal; histórico "Meus Palpites" com status `Em jogo / +prémio / Perdido / Reembolsado` |

### 1.3 INTEGRAÇÃO NA PLATAFORMA
- Rota **`/desporto`** (lazy) com SEO dedicado (`useSEO`).
- **Navbar desktop**: item "⚽ Desporto Real" no grupo Entretenimento + ação rápida "Desporto" no menu.
- **Menu mobile**: "Desporto Real" no grupo Jogos (`desporto.real` traduzido PT/PT-BR/EN).
- Migração `20261101_sport_predictions.sql`: tabela + RLS (select/insert próprio, **sem** update/delete
  no cliente) + índices parciais + view pública de estatísticas + trigger anti-palpite-tardio.
- Edge function `settle-sport-predictions` (cron recomendado: 30 min via AdminCronJobs; `?dry_run=true`
  para auditoria sem escrita).

## 2. HONESTIDADE (o que NÃO foi feito)
- **Sem livescore falso**: não há "minuto 67'" nem placar ao vivo inventado — o plano gratuito da fonte
  não publica minuto-a-minuto, e a UI diz exatamente isso no rodapé.
- **Sem odds fabricadas**: não há casa de apostas com odds fixas; o prémio sai do pool real dos jogadores.
- **Sem Moçambola falsa**: a fonte não tem a liga moçambicana — não foi inventada. Quando houver
  fornecedor com Moçambola, entra como mais um chip.

## 3. VALIDAÇÃO
- `tsc -b --noEmit`: **0 erros**.
- Build de produção Vite: **OK**.
- E2E novo `test-desporto.mjs` (mock determinístico da fonte + smoke real): **14/14 ✅**.
- Sem regressões: `test-rea-plataforma` **33/33** · `test-home-dinamica` **22/22** ·
  `test-web-excellence` **23/23** — 0 pageerrors.
- Screenshots verificados (desktop 1280px + mobile 390px, dados reais da Premier League): cabeçalho,
  chips de liga, jornada, partidas com emblemas reais, Top 5 com formas recentes, atribuição da fonte.
