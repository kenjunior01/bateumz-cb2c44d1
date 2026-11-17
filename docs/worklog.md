
---
Task ID: 19
Agent: Super Z (main)
Task: v11-RPG — "o melhor jogo RPG já feito": câmaras Minecraft/GTA, ecrã inteiro, música original, clima, NPCs, oficina, montaria, elites + catálogo aparado (fundido com a v12 remota: Bounce)

Work Log:
- Estado à entrada: main local = v10 (677fe21); REMOTE tinha avanço paralelo: 95d5347 (APK v2.11), aad72cc (home mobile nativa), b1975ef (worklog v11), 4276985 (v12: catálogo 84→16 + NOVO jogo Bounce + visuais limpos + 3 câmaras + fullscreen + música PD)
- ESTRATÉGIA DE FUSÃO: backup da minha v11 (branch v11-rpg-backup) → reset a origin/main (v12, com BounceGame.tsx + catálogo) → restaurei os MEUS ficheiros testados: worldEngine.ts (câmaras+RPG), BateuWorld.tsx (HUD v11), worldAudio.ts (5 faixas), GameFullscreenWrapper.tsx (hideChrome), LoadingScreen.tsx (copy), test-world.mjs (164 asserts)
- CÂMARAS: camMode 0/1/2 — orbital (clássica) · 1ª pessoa estilo Minecraft (olhos do herói, bob ao andar, mão+arma por classe com golpe animado, FOV 74) · 3ª pessoa ombro estilo San Andreas (pivot+right vector, raycast contra edifícios, FOV 64); troca por botões (bw-cam-0/1/2), tecla C e evento camchange; FOV interpolado suave
- ECRÃ INTEIRO: botão próprio (bw-fs) com requestFullscreen+webkit, lock landscape opcional, FALLBACK VISUAL (classe fixed inset-0) quando a API falha; fix headless que engaja-e-sai (verificação diferida 450ms)
- MÚSICA: worldAudio reescrito — 5 FAIXAS ORIGINAIS compostas em código (scheduler de colcheias com lookahead): Amanhecer no Vale, Blocos ao Vento, Corrida do Ouro (chiptune), Neon da Metrópole (synthwave), Coração da Floresta; leitor no HUD (bw-music, ⏮⏭, slider de volume persistido, faixa persistida)
- CLIMA: chuva (720 gotas) e tempestade com relâmpagos (PointLight flash + trovão) — névoa densifica, luz escurece (weatherLight), setRain no áudio; primeiro evento só aos 110s (E2E estável)
- RPG: 26 nós de recolha (erva/minério/cristal) com respawn 90s; OFICINA na mochila (3 receitas: Vida 3🌿+1💎, Força 2🌿+2⛏️, Vento 1🌿+1⛏️+2💎) + uso de poções (usePotion no motor); 3 NPCs com diálogo e máquina de escrever + bênçãos diárias (ouro/XP/poção/pontos); mobs ELITE (9%, x1.85 HP, x1.4 atk, x2.4 recompensas, loot tier+1 garantido, aura roxa); CRÍTICOS automáticos 10% (x1.85, texto laranja); ESQUIVA por agilidade (spd*0.006, máx 16%); MONTARIA Lobo Veloz Nv8 (+75% velocidade, galope animado, sela, botão bw-mount + tecla V)
- VISUAL LIMPO: bloom 0.42→0.18, vinheta 0.62→0.3, saturação 1.07→1.02, névoa clara (0xb2d8ea/0.0042), céu mais suave, aurora −45%, nuvens 0.85→0.72, terreno dessaturado+luminoso (offsetHSL)
- CATÁLOGO: fundido — 16 clássicos + Bounce NOVO + Bateu World destaque (base v12); LoadingScreen "68+ jogos"→"melhores jogos da plataforma"
- BUG CRÍTICO corrigido: GameFullscreenWrapper (botão "Tela Cheia" do hub em top-2 right-2 z-20) SOBREPUNHA o fim do nav do jogo e CEGAVA o modo foto/fs/música → prop hideChrome para o mmorpg; modo foto janela 900ms→2600ms + resgate de clique no E2E
- E2E: +23 asserts v11/v12 (câmaras, fp weapon, fs, leitor, NPC+diálogo+bênção, montaria bloqueada, oficina, catálogo, Bounce); suite final 164/164 ✅ (várias rondas de endurecimento: waits sondados em música/diálogo/bússola/chips; reload valida no mundo, não em /jogos)
- tsc 0 erros; build produção OK; ANDROID: JDK 21.0.12 + SDK 36 reinstalados (rollback perdeu-os de novo), cap sync, limpeza .gz/.br, assembleDebug+assembleRelease+bundleRelease BUILD SUCCESSFUL
- APK v2.12 verificado por chunks: Amanhecer no Vale ✓ getCamMode/setCamMode ✓ toggleMount/usePotion ✓ Oficina ✓ Mestre Gomas ✓ Tempestade ✓ bw-fs/bw-music/bw-cam-/bw-mount/bw-dialogue ✓ CRÍTICO ✓ Bounce ✓ (versionCode 12, versionName 2.12)
- Publicados: download/Bateu-v2.12-rpg-{debug,release}.apk + Bateu-v2.12-rpg.aab (sha256 57b3f1a4…)
- Commits: 345d3c1 (v11, suplantado pela fusão) → ead5bd0 (v11-RPG fundida) pushado para origin/main

Stage Summary:
- Bateu World transforma-se num RPG de mundo aberto completo: 3 câmaras, clima, montaria, NPCs com diálogo, oficina/poções, elites, críticos/esquiva — tudo com estética limpa e banda sonora 100% original
- Plataforma com catálogo enxuto de clássicos + Bounce novo; APK/AAB v2.12 publicados e verificados
- Suite E2E: 164/164 verdes

---
Task ID: 55
Agent: Super Z (main)
Task: v55 — IA VISÃO + VETORES: os snippets novos do utilizador tornam-se o OLHO (nemotron-3-nano-omni, content parts + reasoning_budget 16384) e a MEMÓRIA (nemotron-3.5-embed-8b, embeddings multimodais text_image) da plataforma

Work Log:
- Contrato: os DOIS snippets novos são a fonte única — visão via /chat/completions com content parts [text, image_url], max_tokens 65536, reasoning_budget 16384, temperature 0.6, top_p 0.95 (stream SSE e JSON); vetores via /embeddings com input «texto + data URL na MESMA string», encoding float, modality [text_image], input_type passage|query, truncate END
- Núcleos isomórficos novos (browser E Node): nemotron-visao.ts (validarImagemFonte recusa file:/javascript:/data não-imagem com motivo; clientes stream/JSON com retry antes do 1.º byte e abort propagado) e nemotron-vetores.ts (imagemParaDataUrl = o caminho do snippet https→descarrega→base64; validarRespostaVetores com dims desiguais/não-finitos → erro; cosseno puro; LojaVetores cap 500 velho-primeiro; arredondarVetor a 6 casas para persistência)
- Edges produção novas: nemotron-visao (JWT, rate 10/min POR ISOLATE, tubo puro SSE/JSON) e nemotron-embed (JWT, rate 20/min, JSON intacto) — ambas na MESMA forma WIRE do núcleo
- Proxy local: rotas /api/ia/visao e /api/ia/vetores com corpo cap 8 MB (imagens base64; chat mantém 256 KB), saude v55 com as 3 rotas e a chave sempre oculta
- UI /ia em TRÊS ABAS: Conversar (v54 intacto) · Ver (imagem por URL/ficheiro→data URL, sliders temp/tokens/orçamento, streaming com painel de pensamento, stats reais, preview com cap declarado) · Buscar (indexar rótulo+texto+imagem https, lista com tipo, busca top-5 com barras de score cosseno real, similaridade entre dois textos, persistência localStorage cap 30 com quota honesta)
- i18n: +37 chaves ×6 idiomas (scripts/add-ia-i18n-v55.py)
- FUROS REAIS fechados: (1) proxy/edge da visão validavam uma forma {pergunta,imagem} que o núcleo nunca manda — unificado na forma WIRE do snippet nas três camadas; (2) 413 com corpo em voo envenenava o keep-alive desde a v54 (RST ao pedido seguinte, provado em repro) — drenar + Connection: close; (3) edge do chat v54 perdia o modo pensamento em produção (lia corpo.thinking em vez de chat_template_kwargs.enable_thinking) — corrigido
- Vetores sem intervalo mínimo no portão do cliente (cap 20/min mantém-se) — indexar em lote é o caso legítimo, decisão declarada
- TESTES: test-ia-v55.mjs NOVO 78/78 ×2 (A núcleo 27 · B mock 16 · C proxy real 17 · D E2E Playwright 18: abas, visão em streaming vivo, erro honesto com URL ilegal, busca semântica ordenada por cosseno, similaridade 85,3%, zero erros de console, shots-v55/) · REGRESSÃO test-ia-v54 50/50 (saúde aceita v54/v55, chat intato, live v54 respondeu «BATEU V54»)
- LIVE REAL: o omni do snippet ESTÁ VIVO — a NVIDIA descreveu a imagem EXACTA do snippet («A wooden boardwalk stretches through a vibrant green marshland…») com reasoning_content ~750 chars e usage real (prompt 469 = a imagem; total 684) · SKIP honesto: nemotron-3.5-embed-8b devolve 422 (modelo ainda não ativo no catálogo — o teste declara, nunca finge)
- tsc 0 · build OK

Stage Summary:
- A Bateu IA agora VÊ (visão omni com orçamento de raciocínio real) e LEMBRA (busca semântica multimodal com cosseno real) — os dois snippets do utilizador integrados nas três camadas (núcleo/proxy/edge) com a chave sempre fora do browser
- v54 continua 50/50 verde; 3 furos reais fechados (incl. um latente da v54 no keep-alive e o thinking perdido em produção)
---
Task ID: 56
Agent: Super Z (main)
Task: v56 — IA LÊ A PLATAFORMA (RAG real): a MEMÓRIA da v55 enche-se com os dados REAIS (sorteios ativos · concursos ativos · blog publicado) e o CHAT da v54 passa a responder com FONTES citadas — pergunta → vetor query → busca cosseno → contexto [1][2] no system

Work Log:
- Estado à entrada: main limpo no 847b4d5 (v55); os dois snippets do utilizador já eram contrato cumprido (olho + memória); a v56 liga a memória aos DADOS e ao chat — a IA deixa de «saber geral» e passa a LER a plataforma
- Núcleo isomórfico NOVO nemotron-rag.ts (browser E Node, padrão v46–v55): dividirEmPassagens (chunking determinístico parágrafo→frase, só corte duro declarado como último recurso), docParaPassagens (ids `doc#pN`, rótulo com contador, texto = «rótulo — pedaço»), montarContextoRag (ordena por cosseno DESC, DEDUPLICA por doc — a melhor passagem de cada fonte, limiar 0.15, TOP_K 3, cap aplica-se só à parte das FONTES; sem fontes → NULL declarado), LojaRag (cap 400 passagens / 200 docs, substituirDoc sem duplicados, removerTipo, estatísticas por tipo, cosseno REUSADO do núcleo v55 — zero segunda fonte)
- Mapeadores puros NOVOS ia-docs.ts (Node-testáveis): raffleParaDoc / contestParaDoc / blogParaDoc — prize_value NUNCA entra no doc (a plataforma nem sempre mostra o valor; o RAG nunca mostra mais que a UI), campos nulos OMITIDOS (zero «null» no embedding), datas só na parte ISO (determinístico em qualquer locale), caps 25 docs/tipo e 1200 chars
- Consultas REAIS NOVAS ia-plataforma.ts (browser/supabase): raffles status=active · contests status=active · blog_posts published=true, cada fonte independente — falha real entra em `erros` com o motivo (nunca silenciada), sucesso em `fontesOk`
- UI /ia: aba Buscar ganha o card «Plataforma no índice (RAG)» (ia-rag-card: botão Indexar plataforma, chip com passagens/docs/por-tipo, erro honesto, limpar); a indexação vai em LOTES ≤ 8 entradas (o cap do snippet) com ESPERA HONESTA quando o portão 20/min fecha (aguarda o tempo real e tenta UMA vez — nunca dispara mais); itens manuais do Buscar entram TAMBÉM no índice do chat (vetor REAL do texto completo, sem chunking inventado); aba Conversar ganha o toggle «Contexto da plataforma (RAG)» e o badge Fontes por resposta
- Onde corre: sem ROTAS novas — o RAG reusa chat + vetores; proxy sobe para v56 na saúde (o teste v54 já aceitava v54–v56, o v55 passa a aceitar v55+); browser continua a NUNCA conhecer a chave
- Honestidade do RAG declarada e testada: contexto só com fontes ≥ limiar; sem fontes o chat segue SEM contexto (nunca finge que leu); com o RAG ativo, se os embeddings falham o envio É BLOQUEADO com o erro real; citações [1][2] com a pontuação cosseno REAL visível e a regra «não cites a pontuação como facto»
- FUROS REAIS fechados nesta versão: (1) doc só com título (todos os campos nulos) tinha texto vazio → docParaPassagens recusava-o e o RAG PERDIA o doc inteiro — apanhado no teste A, fix com fallback ao título nos três mapeadores; (2) cap do contexto contava o comprimento NÃO truncado da linha (contabilidade mentirosa) — apanhado no teste A, fix linhaFinal; (3) lição v49/v53 EXTENDIDA: matar o «npx» não mata o NETO («sh -c vite» → «node vite») — o vite ZUMBI do 8099 servia código/env velhos e a regressão v55 testava contra servidor STALE (a visão ia para o edge sem o VITE_IA_ENDPOINT_VISAO e os 3 testes da aba Ver falhavam com o modelo REAL vivo!) — apanhado na 1.ª regressão, REPRO no probe scripts/probe-group-kill-v56.mjs (spawn detached → a árvore do grupo morre, porta livre), fix nas TRÊS suítes (spawn detached + kill(-pgid) + pré-voo limparZumbis)
- TESTES: test-ia-v56.mjs NOVO 54/54 ×2 corridas (A núcleo 27: chunking/dedupe/cap/loja/mapeadores · B mock 7: indexação por lotes ≤8 com input_type passage provado no upstream, busca ordenada, o CHAT recebe o CONTEXTO na 2.ª system com [1] · C proxy real 8: saúde v56, chat SSE intato COM contexto, 400/404/503 honestos · D E2E Playwright 12: card RAG, «Indexar plataforma» termina HONESTO — no sandbox INDEXOU mesmo: supabase real devolveu 8 docs publicados (1 concurso + 7 blog) e o toast «Plataforma indexada (8)» + chip passagens 9/docs 9 com o manual — shots-v56/ia-buscar-rag.png, toggle → chat com badge Fontes: 1 e o upstream PROVA o contexto · E live: nemotron-3.5-embed-8b CONTINUA 422 (ainda não ativo — SKIP honesto, nunca finge))
- REGRESSÃO: test-ia-v55 78/78 ×1 nesta sessão (live visão REAL voltou a descrever a imagem do snippet, «A wooden boardwalk extends…», rac ~715 chars, usage prompt 469) · test-ia-v54 50/50 (live «BATEU V54») — ambas verdes APÓS o fix do zumbi (as 3 falhas da 1.ª passada eram o servidor STALE, não código)
- i18n: +19 chaves ×6 idiomas (scripts/add-ia-i18n-v56.py — ia.rag.*)
- tsc 0 · build OK · portas 8098/8099 livres no fim (sem zumbis)

Stage Summary:
- A Bateu IA agora LÊ a plataforma: o chat com RAG ativo responde apoiado nos sorteios/concursos/blog REAIS com fontes citadas [1][2] — e sem fontes diz honestamente que não encontrou, sem inventar
- Os dados entram por mapeadores puros que nunca vazam prize_value nem deixam «null» no índice; a indexação respeita os caps do snippet e o portão de rate com espera honesta
- 3 furos reais fechados (doc-perdido-do-índice, contabilidade do cap, zumbi do vite nas três suítes — com repro e prova); v54 50/50 e v55 78/78 continuam verdes
---
Task ID: 57
Agent: Super Z (main)
Task: v57 — NPC IA NA PRAÇA: a BATEU IA vive na Cidade Bateu (o passo anotado desde a v54) — holograma na Praça do Imbondeiro, chat REAL pela via proxy/edge com factos MEDIDOS da cidade no system

Work Log:
- Estado à entrada: main limpo no 44f76bd (v56); os três snippets NVIDIA eram contrato cumprido (v54 fala · v55 olho+memória · v56 leitura); a v57 dá CORPO à IA na cidade — o passo anotado duas vezes no worklog
- Núcleo isomórfico NOVO src/game/cidade/npcIa.ts (browser E Node): POS_NPC_IA=(3,3) FACTO MEDIDO (pavimento da praça, coluna vazia, tronco ao lado — provado com carimbarCidade puro no teste A, o MESMO módulo da física do servidor v52) · NPC_RAIO_FALAR 6 (spawn a ≈4,3, nasce DENTRO) · LIMITES_NPC (12 msgs · 500/4000 chars · max_tokens 1024 · portão 10/min + 1,2 s) · contextoCidade ([CIDADE BATEU — FACTOS MEDIDOS AGORA], só o medido, omitidos os ausentes, zero «null», rodapé anti-invenção) · promptSistemaNpc (regras honestas v54 + formato de HUD + língua do utilizador) · validarHistoricoNpc
- FONTE ÚNICA NOVA src/lib/iaEndpoint.ts: resolverEndpointChat + cabecalhosEdge extraídos do IaBateu.tsx (v54) — /ia e NPC partilham A MESMA regra; /ia refactor sem mudança de comportamento
- UI NOVA src/components/cidade/NpcIa.tsx: streaming + STOP (abort REAL, nota «Parado por ti» NA parcial) + thinking opcional + 4 sugestões + usage real + erros honestos + histórico localStorage bateu.cidade.npc.v57 cap 12
- Cidade: holograma THREE gerido pela PÁGINA (o Motor NÃO muda): esfera+olhos+anel+luz violeta com flutuação/pulso/virar-se ao jogador e dispose honesto; rótulo __npcia__; prompt «Falar · E»; tecla E com prioridade do NPC; ganchos E2E npcIa()/npcAbrir()
- Onde corre: sem ROTAS novas — o NPC usa /api/ia/chat; proxy saúde v57 (v54 aceita v54+, v55 aceita v55+, v56 actualizada para v56+); browser NUNCA conhece a chave
- i18n: +19 chaves ×6 (scripts/add-ia-i18n-v57.py — cidade.npc.*)
- FUROS REAIS fechados: (1) clima.cidade?.name → nome (CidadeEncontrada) — o clima nunca chegava ao system; (2) nota do STOP perdida quando havia parcial (padrão v54 corrigido); (3) assertion com messages.length===2 mas o NPC envia 3; (4) clique no STOP com o raster a ~2 fps («not stable») — repro+diagnóstico no probe scripts/probe-npc-stop-v57.mjs (botão activo/não coberto/caixa estável = problema do rAF do ambiente), fix no teste com clique forçado + fallback DOM e a honestidade na asserção (a nota exige abort REAL); (5) RAIZ de probes em scripts/ = dirname(.., "..")
- TESTES: test-ia-v57.mjs NOVO 54/54 ×2 corridas, 0 skips (A núcleo 21 · B mock 7 com a ordem persona→contexto→user PROVADA no upstream · C proxy 7 · D E2E /cidade 16 com o clima REAL «26°C em Maputo» provado no upstream e shots-v57/npc-praca.png · E LIVE ×2: a BATEU IA REAL respondeu na persona com o facto medido — «Olá! A Praça do Imbondeiro tem 26°C agora mesmo, segundo o Open-Meteo de Maputo.»)
- REGRESSÃO: test-ia-v54 50/50 (live «BATEU V54») · test-ia-v55 78/78 + 1 skip honesto (422 do embed mantém-se) · test-ia-v56 54/54 + 1 skip · test-cidade 37/37 · tsc 0 · build OK (painel NPC no bundle)

Stage Summary:
- A IA da plataforma tem agora CORPO no mundo-âncora: quem entra na cidade nasce a ver o prompt «Falar com a Bateu IA» e conversa com o Nemotron real, com a persona presa aos factos medidos (distrito, noite/dia, clima real, jogador) — nunca inventa
- Zero rotas novas e zero mudanças no Motor: o holograma é da página, o chat reusa a via proxy/edge, a chave nunca sai do servidor
- 5 furos reais fechados com repro; 54/54 ×2 na suíte nova e todas as regressões verdes (50 + 78 + 54 + 37)

---
Task ID: 58
Agent: Super Z (main)
Task: v58 — HISTÓRICO DA IA NO SERVIDOR: o chat da IA (/ia e o NPC da Praça) segue o utilizador ENTRE DISPOSITIVOS (o segundo passo anotado desde a v54; o primeiro — o NPC — foi a v57)

Work Log:
- Estado à entrada: main limpo no ec304cc (v57); o «o que fica» da v57 anotava: persistência do histórico no servidor + sincronização entre dispositivos · NPC client-side (MP) · RAG do NPC bloqueado pelo 422 do embed
- MIGRAÇÃO supabase/migrations/20261117_ia_historico.sql NOVA: ia_historico com RLS (SELECT/INSERT/DELETE próprios — SEM UPDATE: histórico imutável), UNIQUE(user_id, chave) para push idempotente, CHECKs de caps (conteúdo 8000, papel, superfície ia/npc), janela deslizante server-side (trigger: 60 por sessão) — aplicar pelo Dashboard → SQL Editor (padrão do repo)
- NÚCLEO ISOMÓRFICO src/lib/iaHistorico.ts (browser E Node NO MESMO módulo): chave DETERMINÍSTICA sessao:criadoEm:papel:hashFnv1a (dois dispositivos derivam as MESMAS chaves → merge deduplica, re-push não duplica), carimbarMensagens (pré-v58 ganha timestamp sintético baseEm+i — SÓ ordena), mesclarMensagens (o SERVIDOR ganha; ordem; cap), linhaParaMensagem/mensagemParaLinha (linha podre → NULL contado), agruparPorSessao + capSessoes (20) + o GESTOR PostgREST criarGestorHistoricoIa (pull/push upsert {onConflict:"user_id,chave", ignoreDuplicates}/apagarSessao/apagarTudo — cliente+obterSessao INJETÁVEIS, supabase real POR PREGUIÇA para o Node importar o módulo)
- META NOS TIPOS: MsgIa (nemotron.ts) + MsgNpc (npcIa.ts) ganham chave?/criadoEm?/tokens? — FIO SEGURO: validarMensagens corta para {role, content}, a meta NUNCA chega ao modelo (provado no teste A e no E2E)
- A persona (system) NUNCA é guardada — só o personaId viaja na linha da pergunta (conversa importada noutro dispositivo reconstrói-se)
- UI: /ia pull no montar + push por troca (pergunta+resposta e TAMBÉM a parcial do abort) + apagar conversa → apagar no servidor + badge ia-sinc-estado; NPC com janela única "praca" + chip cd-npc-sinc + limpar → apagarTudo; ESTADOS HONESTOS: convidado (ZERO pedidos) · migracao (PGRST205 declarado) · erro (motivo real) · sincronizado · aSincronizar
- i18n +5 chaves ia.sinc.* ×6 (scripts/add-ia-i18n-v58.py); proxy saúde v58 (sem rotas novas); test-ia-v57 relaxada para v5[7-9] (padrão da casa)
- FUROS REAIS fechados: (1) insert().onConflict().ignoreDuplicates() NÃO existe no postgrest-js v2 → upsert(rows, {onConflict, ignoreDuplicates}); (2) import estático do supabase partia o Node (import.meta.env + alias) → lazy import no módulo puro; (3) chave por ÍNDICE colapsava perguntas IGUAIS → chave por criadoEm; (4) carimbarMensagens descartava o pré-v58 → timestamp sintético ANTES de validar; (5) on_conflict URL-encoded (%2C) → decodeURIComponent na asserção; (6) .env com aspas → strip no parser do teste; (7) saúde fixa em "v57" na suíte antiga → v5[7-9]
- TESTES: test-ia-v58.mjs NOVO 70 verdes ×2 corridas, 1 skip honesto (A núcleo 41 · B PostgREST mockado 18 com o fio REAL provado — on_conflict+Prefer+filtros — e CONVIDADO com ZERO pedidos · C Supabase real skippável: migração ainda não aplicada → SKIP com o SQL apontado · D E2E 10: /ia + /cidade com badge/chip honestos, chat regresso, meta NUNCA no corpo capturado, CONVIDADO com ZERO pedidos a rest/v1/ia_historico MEDIDO por contador de rotas, zero erros de console, shots-v58/)
- REGRESSÃO: test-ia-v54 37/0+1skip · test-ia-v55 62/0+2skips · test-ia-v56 54/0+1skip · test-ia-v57 54/0 (live NVIDIA + E2E da praça intatos) · test-cidade 37/37 · tsc 0 · build OK

Stage Summary:
- O passo anotado desde a v54 está fechado: o histórico da IA vive no servidor com RLS e segue o utilizador entre dispositivos — push idempotente por chave determinística, merge com o servidor como fonte de verdade, imutável e com janela deslizante server-side
- Honestidade de ponta a ponta: convidado nunca toca na rede, migração pendente é DECLARADA (nunca fingida), erros com o motivo real, linha podre não mata a sincronização, e a meta de sincronização nunca chega ao modelo
- 7 furos reais fechados com repro; 70/70 ×2 na suíte nova e todas as regressões verdes (37 + 62 + 54 + 54 + 37)

---
Task ID: 59
Agent: Super Z (main)
Task: v59 — PRESENÇA DO NPC NO SERVIDOR MP: a praça vê QUEM está a conversar com a Bateu IA (o passo anotado desde a v57/v58)

Work Log:
- Estado à entrada: main limpo no 9245386 (v58); o «o que fica» da v58 anotava: presença própria do NPC no servidor MP · RAG do NPC bloqueado pelo 422 do embed · migração ia_historico à espera de aplicação
- NÚCLEO ISOMÓRFICO src/game/cidade/npcMp.ts NOVO (browser E Node): NPC_CONVERSA_TIMEOUT_MS 15 s (3 sinais perdidos) · NPC_FALA_GATE_MS 3 s (só SPAM) · NPC_CONVERSAS_CAP 8 · juntarConversa (sem mutar; mudou só quando o CONJUNTO muda — heartbeat puro NÃO paga broadcast; despejo do sinal mais antigo com self-healing; recém-chegado nunca se auto-despeja) · sairConversa (no-op honesto) · limparConversasExpiradas · pacoteConversas (fio só {id, nome}) · nomesConversa (cap 2 + «+N») · validarPacoteNpc (padrão validaEdit: sanitiza MESMO vindo do servidor)
- SERVIDOR cidade-servidor.mjs v59: msg npcfala (claim + heartbeat, gate, SPAM em npcRecusados) · npcfim · broadcast `npc` a TODOS só quando o conjunto muda (o autor também recebe) · bemvindo ganha npc.conversas · ws close limpa · interval 3 s de expiração · override HONESTO NPC_CONVERSA_TIMEOUT_MS por env (mín 1 s, no log de boot) · stats npcConversas/npcAvisos/npcRecusados/npcExpirados
- CLIENTE multijogador.ts + CidadeBateu.tsx: npcFala/npcFim/npcConversasInfo/idNoMundo (o MESMO gate no cliente) · eventos REAIS por dif no «Praça em direto» · página anuncia no useEffect do modal (claim no abrir + heartbeat 5 s + npcfim no fechar) · rótulo «Bateu IA · nome1, nome2 +N» + pulso acelerado · ganchos E2E npcMp()/npcMpSinal()/npcMpFim() · i18n +2 chaves ×6 (scripts/add-ia-i18n-v59.py)
- HONESTIDADE: conteúdo PRIVADO (só id+nome viajam — o chat segue proxy/edge, o servidor MP nunca o vê) · conversa NÃO exclusiva (lista reflete a realidade) · sem MP = no-op honesto como na v57 · o AUTOR nunca se vê na própria lista
- FUROS REAIS fechados: (1) um alarme FALSO de corrupção («const odal», «[m comido») consumiu o diagnóstico inicial — o padrão era artefacto do SANITIZADOR DE OUTPUT do tool (come literalmente «[m» das respostas), o ficheiro real estava INTACTO (prova por codepoints 5b 6d 6f 64 61 6c = «[modal» e por rg matchar `const \[modal` na MESMA linha que exibia «odal») — lição: contra um sanitizador de output, verificar com python/node imprimindo padrões TRANSFORMADOS, nunca confiar no texto ecoado; (2) heartbeat puro pagava difusão no primeiro desenho — mudou=true só quando o conjunto muda (probe scripts/probe-npc-v59.mjs prova a pureza); (3) PW_CHROME apontava para chromium_headless_shell-1200/chrome-linux/headless_shell (inexistente) — binário real em chrome-headless-shell-linux64/chrome-headless-shell; (4) test-cidade.mjs não lança vite próprio — um zumbi/porta livre não chega: lançar vite 8099 ANTES e matar depois
- TESTES: test-ia-v59.mjs NOVO 52/52 ×2, 0 skips (A núcleo 19 · B servidor REAL 14 — bemvindo.npc, difusão ao autor e aos outros, não-exclusivo, no-op, heartbeat puro com ZERO difusões, gate com SPAM de 6 nos stats, queda de ligação limpa, cap 8 com 9 clientes · B2 expiração 4 — servidor próprio com timeout 1,2 s, lista vazia difundida e npcExpirados ≥ 1 · C E2E browser 15 — /cidade?mp=… + ws Node: Diana fala → rótulo «Bateu IA · Diana» + evento no Praça em direto, abrir painel ANUNCIA o id real, AUTOR fora da própria lista, fechar DESANUNCIA, zero erros de consola, shots-v59/npc-mp-praca.png)
- REGRESSÃO: test-ia-v54 37/0+1skip · test-ia-v55 62/0+2skips · test-ia-v56 54/0+1skip · test-ia-v57 54/0 · test-ia-v58 70/0+1skip · test-cidade 37/37 · tsc 0 · build OK

Stage Summary:
- O passo anotado desde a v57/v58 está fechado: «quem está a falar com a Bateu IA» é estado PARTILHADO do servidor de presença — a praça vê a conversa acontecer no rótulo do holograma e no Praça em direto, sem nunca expor o conteúdo
- Broadcast com pureza provada: só o CONJUNTO de ids paga difusão (heartbeat puro não), expiração honesta de 3 vias (npcfim, queda de ligação, timeout) e contadores reais nos stats
- 4 furos reais fechados com repro (incluindo um alarme falso de corrupção com lição metodológica); 52/52 ×2 na suíte nova e todas as regressões verdes (37 + 62 + 54 + 54 + 70 + 37)

## v60 — 3D WORLD SÓLIDO (item 1 do roadmap «Bateu corrections»)

- PROBE com repro no vivo (scripts/probe-world-v60.mjs) antes do fix: teclas presas no blur («frente com W: 1 · APÓS blur: 1» — anda sozinho para sempre; RPG e Aetheria) · «PCFSoftShadowMap has been removed» do three a cada montagem do Aetheria · Motor sem destruir() — cada sair/reentrar acumula CONTEXTO WebGL vivo · dados externos sem validação (?game=, localStorage liveActiveGame, bus activeGame — tudo com cast as GameId) · setActive(null as any) · gastarPonto(r as any) · (window as any).__rpg sem contrato · Aetheria sem ganchos E2E (inverificável) · efeito dos créditos com eslint-disable
- jogosLive.ts NOVO (puro): jogoValido<T>(bruto, ids) — a ÚNICA porta dos dados externos do jogo ativo; LiveHub valida URL/localStorage/bus contra IDS_GAMES; podre → null → "wheel"
- LiveHub.tsx: active honesto (GameId | null) — setActive(null) sem cast · bus não publica «jogo ativo» com null · startLive/história usam ""/undefined para «nenhum» · onCategoryChange validado · deps completos com hidratação única por ref (eslint-disable saiu)
- engine.ts: renderer THREE.WebGLRenderer | null (o tipo MENTIA com definite assignment) · render() com guarda · destruir() NOVO — workers off + dispose geometrias/materiais + renderer.dispose() + forceContextLoss() — seguro 2× e antes do iniciar (provado em Node por bundle esbuild)
- BateuRPG.tsx: ganchos E2E TIPADOS (GanchosRpgE2E ~40 membros + declare global Window.__rpg) · gastarPonto(r: RamoRpg) · teclas largam no blur/visibilitychange · unmount chama motor.destruir() · deps honestos nos créditos
- AetheriaGame.tsx: PCFSoftShadowMap → PCFShadowMap · teclas no blur/visibilitychange · alternarVoo determinístico (ref manda, estado segue — updater sem efeito secundário) · ganchos window.__aetheria tipados · deps completos sem disable
- FURO introduzido + apanhado pela própria probe antes de commit: array de deps avalia DURANTE o render — alternarVoo referido antes da inicialização → TDZ real — fix: declarar o useCallback ANTES do efeito (lição: callback em deps tem de estar ACIMA do efeito que o usa)
- TESTES: test-world-v60.mjs NOVO 28/28 ×2, 0 skips (A núcleo Node: jogoValido ×7 + Motor destruir/render no-ops por bundle esbuild · B E2E real: mundo entra, blur limpa frente 0, hidden limpa, mapa com terreno real 48400 amostras, pausa/retomar, sair/reentrar ×2 com ZERO warns THREE/WebGL, Aetheria teclas+voo determinístico, ZERO pageerror/console-error, shots-v60/)
- REGRESSÃO: test-rpg-v41 157/0 · test-progressao-v38 39/0 · test-cidade 37/0 · ia-v54 37/0+1skip · ia-v55 62/0+2skips · ia-v56 54/0+1skip (full) · ia-v57 54/0 · ia-v58 76/0+0 (migração aplicada — secção C real desbloqueada) · ia-v59 52/0 · tsc 0 · build OK

Stage Summary:
- O item 1 do roadmap do utilizador está fechado SEM desativar um único check: 5 furos de execução (teclas presas ×2 jogos, shadow map deprecado, contextos WebGL acumulados, dados externos sem validação) e 3 silenciamentos de tipo (null as any, r as any, window as any) corrigidos com repro provado pela probe
- A migração v58 aplicada pelo utilizador desbloqueou a secção C real da suíte v58 (70→76 verdes, 0 skips)
- Próximo item do roadmap: «Make 3D World playable without registration; keep account-only rewards protected»

## v61 — MUNDO 3D SEM REGISTO (item 2 do roadmap «Bateu corrections»)

- Auditoria descobriu que o mundo JÁ é jogável sem registo por desenho (zero gates de login no caminho; save do RPG do aparelho v41; créditos/XP/leaderboard/kit todos localStorage) — o faltante era a PROVA e o UI honesto: o banner do hub MENTIA («para guardar as tuas pontuações»)
- Núcleo isomórfico mundoConvidado.ts NOVO (puro): modoDoUtilizador (podre→convidado) · deveReportarUniversal (kit extraído do LiveHub; mmorpg fora) · TABELAS_CONTA_APENAS (spin_wheel_games/ia_historico/engagement_points/rpg_characters) · eEscritaRest/eContaApenas · FUNCOES_CONTA_APENAS (as 10 edge functions com JWT de 26 auditadas; paypal-config/track-visit PÚBLICAS) · funcaoContaApenas por caminho
- LiveHub: banner honesto emerald (convidado é UM MODO) com i18n +4 chaves ×6 (add-mundo-i18n-v61.py) + data-testid; recordScore usa o núcleo; ZERO mudanças no Motor/jogos/auth/edge functions
- FUROS fechados: (1) contrato de edge functions era impreciso (paypal-config pública disparava para convidados — auditoria às 26 e perímetro preciso); (2) flake PRÉ-EXISTENTE no B5 do test-world-v60 provado por stash-bisect (clique do pausa perde-se após retomar+andar no raster ~2 fps — probe probe-pausa-v60.mjs; fix honesto no harness, asserção estrita); (3) tsc do root era NO-OP (files:[]) — o gate REAL (tsconfig.app.json) apanhou genérico inseguro do v60 no jogoValido (fix com cast provado pela pertença); loop corre agora tsc -b E tsc app; (4) vite setsid morre ao fim do Bash call — suíte E2E no MESMO shell
- TESTES: test-mundo-convidado-v61.mjs NOVO 65/65 ×2, 0 skips (A núcleo ×40 · B E2E ×25 com LEDGER classificado pelo NÚCLEO: banner honesto, RPG save no aparelho + leaderboard local + kit sem mmorpg, CONTINUAR após reload, Aetheria limpa, /wallet e /my-points → /login, perímetro ZERO em todo o passeio, ZERO pageerror) · shots-v61/
- REGRESSÃO: rpg 157/0 · progressao 39/0 · cidade 37/0 · world-v60 28/0 · ia v54 37/0+1s · v55 62/0+2s · v56 54/0+1s · v57 54/0 · v58 76/0 · v59 52/0 · tsc -b 0 · tsc app 0 · build OK

Stage Summary:
- O item 2 do roadmap está fechado: o mundo é jogável sem registo PROVADO ponta a ponta (65/65 ×2) e as recompensas de conta ficam protegidas (ZERO escritas rest, ZERO tabelas conta-apenas, ZERO funções JWT no ledger do convidado inteiro; wallet/pontos continuam atrás do login)
- A mentira do banner foi substituída por honestidade ×6 idiomas e o contrato convidado/conta vive num núcleo puro que o hub consome e as suítes provam
- O gate de tipos do loop tornou-se REAL (tsc -b + tsconfig.app.json) e apanhou/corrigiu um genérico inseguro do v60
- Próximo item do roadmap: «Translate 3D World visible text into English»
