# v82 — «A IA SUGERE, NUNCA DECIDE» + CONTEXTO — REA

> Breve do utilizador (passo 11, adiado da v81): «moderação / recomendações / comentador de desporto com NVIDIA (IA só sugere)» + «IA context-aware (abrir a página de um sorteio prepara o contexto desse sorteio)». A regra de produto veio da v81 e repete-se aqui: **a IA ajuda dentro das áreas; sugere; nunca decide.**

## 1. O contexto da IA (src/lib/iaContexto.ts — NOVO, puro)

Loja de UM slot + ouvintes, isomórfica (zero DOM/React, testável no Node, padrão v46–v59):

- `publicarContextoIa({tipo, id, titulo, rota, factos})` — só as PÁGINAS publicam, com dados REAIS já carregados. Saneamento com CAPs (8 factos · 200 caracteres/facto · título/rota truncados) e RECUSA de publicação sem título ou sem factos (nada de contexto vazio). Publicar substitui — o utilizador está num sítio de cada vez.
- **Sobrevive à navegação** (é esse o produto: abres o sorteio e a /ia CHEGA com o contexto preparado) mas morre com a sessão: `sessionStorage` (`bateu.ia.contexto.v82`), validado ao carregar (tipo no enum fechado, factos strings, TTL). Nada de localStorage — contexto de sessão.
- **TTL 15 min** (`contextoValido`), **X no chip** (`limparContextoIaTotal`) e substituição por nova página limitam a staleness — três mecanismos declarados.
- `contextoParaPrompt` injeta os factos no system com a regra explícita ao modelo: «usa os factos se relevantes; se a pergunta for outra, ignora-os. NUNCA inventes factos fora desta lista».
- `QUESTOES_POR_TIPO` — 3 perguntas i18n por tipo (5 tipos × 3 = 15 chaves × 6 línguas).

## 2. Páginas que publicam (dados reais de cada carregamento)

| Página | Rota | Factos publicados |
|---|---|---|
| RaffleDetail | `/raffle/:slug` | prémio (valor ou «oculto pelo organizador»), preço do bilhete (moeda do utilizador), bilhetes vendidos/total/disponíveis, data do fim, estado, tipo pontos |
| LeilaoDetalhe | `/leiloes/:id` | item, lance atual + próximo mínimo, comprar-agora, estado + fim, vendedor (verificado?) + localização, estado do item + categoria, nº de lances |
| ContestDetail | `/concursos/:id` | descrição, prémio, estado + avaliação, prazo, participações aprovadas + líder real com votos, máximo por utilizador |
| GameDetail | `/jogo/:id` | categoria/jogadores/dificuldade do catálogo, duração + pontos máximos, descrição, histórico REAL do aparelho («jogaste N× · melhor X» ou «nunca jogaste — honesto»), popularidade |
| DesportoHub | `/desporto` | competição + jornada, partidas com estado (NS/LIVE/HT/FT) e placar quando existe, top-5 real da classificação |

Publicam via `useEffect` nos dados já carregados — nunca na Render sem dados; a IA nunca recebe nada que o utilizador não veja na página.

## 3. A página /ia consome (IaBateu.tsx)

- `useSyncExternalStore(subscreverContextoIa, lerContextoIa)` (referência estável do store).
- **Chip no composer** («Contexto: …» + ícone por tipo + «abrir página» de volta à rota + X), **banner** no estado vazio («Vindo da página: …») e **3 perguntas sugeridas da entidade** (`ia-sugestao-ctx-1..3`) que SUBSTITUEM as de persona quando existe contexto (e voltam quando o X limpa).
- `systemPrompt` ganha o bloco `contextoParaPrompt` — o histórico vivo mantém-se intacto (o contexto entra como system atualizado a cada envio).

## 4. Moderação com IA (src/pages/admin/AdminModeracao.tsx — NOVO, rota `/admin/moderacao` + item na sidebar)

- Lista as últimas 30 `community_messages` (SELECT público — sem migração nova).
- **A IA TRIA**: `PROMPT_MODERADOR` (exige JSON exato `{"classificacao":"ok|dubio|suspeito","motivo","acao_sugerida":"manter|avisar|remover|escalar"}`, escala APENAS com evidência no texto — golpe/phishing, ódio, assédio, adulto, impersonação; sem evidência → ok/dubio) e termina com «o moderador DECIDE sempre; tu nunca decidis».
- `analisarVeredictoIA` (puro): extrai JSON tolerante a fence/texto à volta; **resposta sem JSON válido → «sem veredicto»** (nunca veredicto inventado); classificação inválida → null; sem ação → default por classificação; motivo truncado a 240.
- **A IA NÃO TEM BOTÃO**: os únicos botões são do moderador — «Analisar com IA» (individual) / «Analisar 10 seguintes» (lote sequencial, o portão de rate do cliente respeitado) e «Remover» em **confirmação de 2 passos** (a 1.ª virada só pergunta «Confirmar remoção»; a remoção usa a política RLS já existente `DELETE próprio OU has_role admin`).
- Badge da sugestão com cor por classificação (verde/âmbar/vermelho), motivo e «acção sugerida: … — decisão tua»; estatísticas honestas no topo (X mensagens · Y analisadas · Z por analisar · sugestões de remoção «a decisão é tua»).

## 5. Comentador de desporto (DesportoHub.tsx)

- Card «Comentário da IA da jornada» acima das abas, com rótulo permanente **«A IA comenta — não é conselho de aposta · 18+»**.
- `PROMPT_COMENTADOR`: usa SÓ os factos dados (partidas + top-5 reais da TheSportsDB já carregados); «se faltar informação, dizes «sem dados» em vez de inventar»; **NUNCA aconselha aposta, nunca «aposta em X», nunca promete resultado**; termina com uma linha de jogo responsável. Stream token a token com STOP honesto (parcial mantido).
- Cache por jornada com **fingerprint do conteúdo real** (`fingerprintEventos` — casa|fora|estado|placar): nova jornada/novo placar = chave nova (nunca comentário velho a fingir que é atual); TTL 3 h com «comentário em cache de HH:MM — regenera se quiseres»; cap de 12 entradas.
- Sem partidas → botão desativado + «Sem partidas nesta jornada — nada para comentar (honesto)». Erro real mostrado (HTTP + mensagem).

## 6. Recomendação de jogo (src/components/games/SugestaoIaJogo.tsx — NOVO, no hub /jogos)

- Card «A IA sugere um jogo» com rótulo «sugestão, não decisão · nunca promete pontos».
- **ZERO chamadas ao carregar a página** — só no clique (o E2E conta as chamadas: 0 antes, 1 depois). Factos reais: catálogo completo com rótulos EXACTOS, jogo do dia (núcleo determinístico v79), populares da semana, histórico REAL do aparelho.
- `PROMPT_SUGESTAO_JOGO` exige JSON `{"jogo":"<rótulo EXACTO>","razao"}` e proíbe inventar fora do catálogo e repetir o jogo do dia.
- **Validação dura** (`analisarSugestaoJogoIA`): rótulo tem de existir EXACTAMENTE no catálogo — nome inventado **nunca vira sugestão** (erro honesto «A IA respondeu fora do catálogo real — sem sugestão (honesto)»); sem razão → descartado; duplicado → 1; máx. 2; o jogo do dia é filtrado. Item renderizado liga a `/jogo/:id` real.

## 7. i18n

19 chaves novas ×6 línguas (en/pt/pt-BR/es/fr/hi) — `ia.ctx.banner/chip/abrir/limpar` + 15 perguntas (`ia.ctx.q.{tipo}.{1..3}`) via `scripts/add-ia-i18n-v82.py` (insert-after-block, idempotente por chave).

## 8. Testes

`test-ia-v82.mjs` NOVO — **72 verdes · 0 falhados**:

- **A) Núcleos no Node** (os MESMOS módulos do browser): loja de contexto (publicar/substituir/referência estável/notificações+desligar/CAPs/recusa de vazio/limpar por dona/limparTotal/TTL/prompt com «NUNCA inventes»/perguntas por tipo) · veredicto (JSON puro, fence, texto à volta, classificação inválida, JSON partido, vazio, defaults, truncamento) · factos de desporto (liga/jornada/placar/top-5/cap) · fingerprint (muda com placar) · cache sem DOM · sugestão de jogo (válida/inventada/sem razão/array→2/duplicado/partido) · os 3 prompts com as proibições do briefing («nunca decidis», «NUNCA aconselhas aposta», «rótulo EXACTO»).
- **B) E2E** (vite 8099 + interceção do endpoint NVIDIA com SSE mock em formato real): T1 contexto real `/jogo/kart` → `/ia` (chip com o título REAL + banner + link da rota + 3 perguntas ctx + X limpa + personas 4 de regressão) · T2 `/ia` fresco SEM chip · T3 `/desporto` (card + rótulo honesto + **ZERO chamadas antes do clique** + streaming mock renderizado + «Regenerar») · T4 `/jogos` (card + **0 chamadas ao carregar** + sugestão VALIDADA com jogo real do catálogo ≠ jogo do dia — o mock LÊ o pedido real para escolher) · T5 nome inventado → erro honesto, zero sugestão · T6 `/admin/moderacao` sem sessão → redirect honesto.

## 9. Regressão e gates

nav-v79 **78/0** · ciclo-v79 **45/0** · desporto **14/0** · marketplace **57/0** · home-dinamica **24/0** · desktop-v74 **42/0** · retenção-v78 **38/0** · desbloqueios-v80 **38/0** · auditoria-v40 **50/0** · arena **25/0** · ecosystem **29/0** · stories-plans **13/0** · web-v262 **11/0** · kart-v65 **65/0** · desafios-v70 **36/0** · som-v67 **58/0** · gfx-v69 **28/0** · classic-v72 **53/0** · regional-v73 **60/0** · kart-online-v66 **61/0** · kart-batalha-v68 **30/0** · kart-ia-v77 **26/0** · kart-ia-v76 **49/0** · `tsc -b` **0** · **build OK**.

Honesto declarado: `test-web-excellence` ficou **12✅/1❌** na asserção de performance do arranque (hero < 5000 ms) — medida também sobre a BASELINE v81 com `git stash` (**7049 ms idêntico**), ou seja, é o aparelho/sandbox desta sessão, não um recuo da v82; `test-ia-v54/55/56` testam a UI de 6 personas que a v81 removeu por design (não fazem parte da bateria mantida desde então). Screenshots v82 verificados visualmente: chip de contexto na /ia, card do comentador com dados reais da TheSportsDB, card de sugestão em /jogos.
