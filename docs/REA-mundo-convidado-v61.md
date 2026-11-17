# REA v61 — MUNDO 3D SEM REGISTO (item 2 do roadmap «Bateu corrections»)

Data: 2026-11-18 · Commit: v61 · Item do roadmap: «Make 3D World playable without registration; keep account-only rewards protected»

## 1. O que o item pedia e o que a verificação descobriu

O item pedia duas coisas: (a) o Mundo 3D jogável SEM registo e (b) as recompensas só-com-conta protegidas. A auditoria de rotas e fios descobriu que (a) **já era verdade por desenho** — e que a parte que faltava era a (b) *prova* e uma UI honesta:

- **Zero gates de login no caminho do mundo**: `/lives` e os aliases (`/mmorpg`, `/world`, `/mundo`, `/life`, `/vida`, `/bateulife`, `/jogos/mmorpg`) não têm `ProtectedRoute`; o único guard da app cobre esports/profile/wallet/dashboard/admin. O `?game=mmorpg|aetheria` abre o portal `fixed inset-0 z-[80]` do jogo sem tocar em auth.
- **O save do RPG é do APARELHO** (desde a v41): `bateu_rpg_save` em IndexedDB (`bateu_armazem`) + espelho localStorage, auto-save a cada 8 s, validador `validarPerfilRpg`; `BateuRPG.tsx` não importa supabase. O menu já dizia «Joga sem registo».
- **Os créditos/XP do jogo nunca saem do aparelho**: `PerfilRpg.creditos` é campo local; o leaderboard do hub é `liveLeaderboard` (localStorage); o kit universal é `bateu:kit-progress-v1` (localStorage); `reportUniversalScore` escreve no aparelho, nunca na rede.
- **A mentira estava no aviso**: o banner do hub dizia «Entra na tua conta **para guardar as tuas pontuações**» — FALSO (guardam-se no aparelho sem conta). Um aviso que mente sobre o que exige registo é a mesma falta de honestidade que um estado inventado.

## 2. O contrato (núcleo novo: `src/lib/mundoConvidado.ts`)

Módulo PURO (browser E Node, zero react/supabase — o MESMO padrão jogosLive.ts v60 / npcMp.ts v59 / iaHistorico.ts v58). É a FONTE ÚNICA que o LiveHub consome e as suítes provam:

- `modoDoUtilizador(user)` → `"convidado" | "conta"`: só um `id` VERIFICÁVEL (string não vazia após trim) é conta; qualquer objeto podre/sem id cai em convidado (padrão jogoValido: podre recusado; padrão v58: convidado = ZERO pedidos).
- `deveReportarUniversal(jogo)` → o fim de partida alimenta o kit universal EXCETO `mmorpg` (`JOGOS_SEM_KIT`) — o BATEU RPG tem progressão própria no aparelho. Extraída do LiveHub para poder ser provada em Node; `null` nunca reporta.
- `TABELAS_CONTA_APENAS` = `spin_wheel_games` (jogos do gestor) · `ia_historico` (v58, RLS+JWT) · `engagement_points` (leaderboard /pontos, concedido só pela edge function com JWT) · `rpg_characters` (futuro). `lives`/`profiles_public` NÃO são conta-apenas (leituras públicas de conteúdo).
- `tabelaDeRest(url)` · `eContaApenas(url)` · `eEscritaRest(url, metodo)` — classificação de pedidos PostgREST (GET/HEAD/OPTIONS são leitura; POST/PATCH/DELETE escrita).
- `FUNCOES_CONTA_APENAS` = as 10 funções edge que EXIGEM JWT (auditoria às 26 de `supabase/functions/`): `award-engagement-points`, `spin-wheel-spin`, `raffle-draw`, `mascot-chat`, `mascot-message`, `nemotron-chat`, `nemotron-embed`, `nemotron-visao`, `paypal-create-order`, `paypal-capture-order` — todas devolvem 401 sem sessão (provado no código de cada uma). PÚBLICAS por desenho: `paypal-config` (config do SDK), `track-ambassador-visit` (contador), `log-password-reset`; as admin/cron usam chaves de serviço no servidor (o browser do convidado nunca as conhece).
- `funcaoContaApenas(url)` — classificação por CAMINHO (mais estrita que por domínio).

## 3. Mudanças no app

- **LiveHub.tsx**: `modoMundo = modoDoUtilizador(user)`; o banner do convidado é agora HONESTO (emerald, não um aviso de perigo — convidado é UM MODO, não uma carência): título «A jogar como Convidado — o progresso é teu, neste aparelho», corpo que diz que o Mundo 3D guarda o progresso no aparelho sem registo e que a conta só é precisa para recompensas da plataforma (pontos, carteira, sorteios) · i18n ×6 com 4 chaves novas (`live.convidado.titulo/corpo/criar/entrar`, `scripts/add-mundo-i18n-v61.py`) · `data-testid="livehub-convidado"` · `recordScore` usa `deveReportarUniversal(active)` (comportamento idêntico, regra testável).
- **jogosLive.ts**: o único cast da casa tornou-se PROVADO — `includes(alvo) ? alvo : null` (o gate real, tsconfig.app.json, recusava `string → T` sem a prova; ver FURO 3).
- **Nenhuma mudança** no Motor, no BateuRPG, no AetheriaGame, no AuthContext, no ProtectedRoute ou nas edge functions — o perímetro de conta fica intacto por definição.

## 4. A prova (suíte nova `test-mundo-convidado-v61.mjs` — 65/65 ×2, 0 skips)

**A) Núcleo (Node) ×40**: modo ×8 (null/undefined/podre/vazio/número/espaços→convidado; uuid→conta) · kit ×8 (null, "", mmorpg fora, aetheria/tap dentro, exceções injetáveis, JOGOS_SEM_KIT) · perímetro de tabelas ×4 + publics ×2 · classificação ×13 (tabela de URL real, não-rest, vazio, 4 tabelas conta-apenas, GET não escrita, POST/PATCH/DELETE escritas, OPTIONS/HEAD não, escrita fora do rest) · funções edge ×7 (10 declaradas, 3 JWT provadas, paypal-config/track-visit PÚBLICAS, por caminho não por domínio).

**B) E2E (browser REAL, SEM login em lado nenhum) ×25**, com LEDGER de pedidos classificado pelo núcleo (o MESMO contrato, não reimplementação):
- B1 hub sem conta: banner visível e honesto (diz «aparelho», a mentira antiga «para guardar as tuas pontuações» SUMIU); aterrissagem com ZERO pedidos ao perímetro.
- B2 BATEU RPG sem conta: menu abre por `?game=mmorpg` · NOVA LENDA → jogando · andou · SAIR → hub · `bateu_rpg_save` EXISTE no aparelho · leaderboard LOCAL recebe a entrada · o kit NÃO recebe `mmorpg` (plays=0 — a regra extraída provada no vivo) · sessão inteira com ZERO rest-writes / ZERO tabelas conta-apenas / ZERO funções conta-apenas.
- B3 persistência: recarregar → CONTINUAR aparece (o save do aparelho lido) → jogando → saída limpa.
- B4 Aetheria sem conta: abrir, andar, voltar — perímetro ZERO; os 249 pedidos da janela são só públicos/locais.
- B5 recompensas de conta PROTEGIDAS: `/wallet` → `/login` e `/my-points` → `/login` (ProtectedRoute intacta) · o passeio completo do convidado: perímetro ZERO.
- B6 higiene: ZERO pageerror e ZERO console-error fora do ruído em TODA a sessão · shots-v61/ (hub com banner, RPG, Aetheria).

## 5. FUROS reais fechados (com repro)

1. **Contrato de funções edge era impreciso**: a 1.ª corrida do E2E falhou porque `paypal-config` (PÚBLICA, montada globalmente pelo PayPalProvider) disparava para o convidado. Auditoria às 26 funções → o perímetro passou a listar EXATAMENTE as 10 que exigem JWT; as públicas ficam no ledger como leituras públicas (6 chamadas de paypal-config no passeio — honestas, sem dado de conta).
2. **Flake pré-existente no B5 do test-world-v60** (provado por stash-bisect na árvore limpa: falha IDÊNTICA sem as mudanças v61): o clique no botão pausa perde-se DEPOIS de retomar + andar no raster ~2 fps do sandbox — probe `scripts/probe-pausa-v60.mjs`: pausa#1 abre em 400 ms; pausa#2 perde-se com `pausado:false, modal:false, hud:true, fase:"jogando"` (o handler nunca chega — o MESMO padrão da lição v57). Fix no HARNESS com tentativas honestas (abrir pausa até 4× com poll; sair até 3× com poll do hub; entrar até 3× com poll do fase) — a ASSERÇÃO continua estrita (ciclo completo ×2).
3. **O `tsc` do root era um NO-OP**: `tsconfig.json` tem `files: []` + references e o loop corria `tsc` sem `-b` — 0 erros triviais. O gate REAL (`tsc --noEmit -p tsconfig.app.json`) apanhou um genérico INSEGURO do v60 em `jogosLive.ts` (`string → T` sem prova). Fix com o cast mínimo PROVADO pela pertença; a partir da v61 o loop corre OS DOIS: `tsc -b` E `tsc --noEmit -p tsconfig.app.json`.
4. **Ambiente**: o vite lançado com `setsid … &` num Bash call MORRE quando esse call termina (sandaia do sandbox) — as suítes com E2E têm de correr no MESMO shell que lança o vite (já documentado nas lições v56/v59; agora com o mecanismo exato).

## 6. Regressão completa

test-rpg-v41 **157/0** · test-progressao-v38 **39/0** · test-cidade **37/0** · test-world-v60 **28/0** (com o fix de flake do FURO 2) · test-ia-v54 **37/0 +1skip** (--sem-e2e) · test-ia-v55 **62/0 +2skips** (--sem-e2e) · test-ia-v56 **54/0 +1skip** (full) · test-ia-v57 **54/0** · test-ia-v58 **76/0** (C real contra o Supabase vivo — migração aplicada) · test-ia-v59 **52/0** · **tsc -b 0** · **tsc app 0** · **build OK** («A jogar como Convidado» no bundle).

## 7. Honesto (o que fica)

- A progressão do convidado é DO APARELHO por desenho — sincronização entre dispositivos para convidados NÃO existe (seria uma funcionalidade de conta; o save do aparelho sobrevive a limpezas do localStorage via IndexedDB).
- O leaderboard do hub e o kit universal continuam locais para convidados (nunca recompensa de conta).
- A tabela `rpg_characters` (com policy para guest_id) existe na migração antiga mas NENHUM código a usa — a v61 não toca nela (passo futuro, declarado).
- A tradução EN do texto visível do mundo (strings PT hard-coded dos jogos) é o item 3 do roadmap.
- O `paypal-config` continua a disparar para convidados (config pública, inofensiva) — se um dia passar a exigir sessão, o ledger do E2E mostra-o imediatamente.
