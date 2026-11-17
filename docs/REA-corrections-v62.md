# REA v62 — FINALIZAÇÃO DO ROADMAP «Bateu corrections» (itens 3–11)

Data: 2026-11-18 · Princípio da casa: sonda → fix real → E2E honesto → gates → registo.

## Contexto

O `roadmap.md` partilhado pelo utilizador tinha 12 itens; v60 (item 1) e v61 (item 2) fecharam os dois primeiros. Esta versão fecha os NOVE restantes — cada um com o que o item realmente pede, sem fingir o que não existe.

## Item 3 — «Translate 3D World visible text into English»

**Arquitetura: PT canónico no motor, EN como CAMADA DE EXIBIÇÃO.** Os 157 testes do núcleo RPG (que afirmam textos PT nos avisos) ficam intatos por desenho:

- `src/game/rpg/nomes.ts` NOVO (puro browser+Node, padrão dos núcleos v58–v61): catálogo EN completo — 6 regiões + descrições, 8 POIs + descrições, 3 dificuldades (NORMAL/HARD/LEGEND) + descrições, 6 capítulos da história + objetivos, títulos das 6 diárias, 3 ramos de habilidade + efeitos, 6 causas de morte, os 60 itens/blocos do catálogo partilhado (ids reais B.0–29 + I.100–131), rótulos do mapa (Wilderness/Lv). `coberturaEnCompleta()` prova a cobertura no teste.
- `core.ts`: `textoObjetivo(tipo, alvo, qtd, lingua="pt")` e `missoesDiarias(dia, dif, lingua="pt")` — PT por omissão (mesma assinatura, mesmos testes), EN com os MESMOS ids/qtds/recompensas.
- `sistemaRpg.ts`: campo `lingua: LinguaRpg = "pt"`; os 20 avisos do HUD passam por `txt(pt, en)`; espólio/loot/recolha usam `nomeItem(id, lingua)`.
- `BateuRPG.tsx`: `useLanguage()` — **159 substituições verificadas** (script com contagem exata): menu, HUD, 6 modais, ajuda completa, forja, mochila, mapa, pausa, morte; canvas do mapa usa `nomeRegiao/nomePoi/rotuloMapa` (deps `[lingua]`); nomes de itens vistos (`mirando`, inventário, forja) pelo catálogo EN; `cap.causaMorte` traduzido por mapa; clima real com `wmoDescricaoEn` NOVO no openMeteo.
- `AetheriaGame.tsx`: 45 substituições — intro, classes, HUD, missão, mochila, avisos (deps honestos `[t]` nos callbacks).
- `LiveHub.tsx`: rótulo/descrição do Aetheria deixam de ser PT fixo → `livehub.game.aetheria(.desc)`.
- i18n: `rpg.*` ×146, `aeth.*` ×57, `home.*` ×10, `world.fs.*` ×2, `auth.*` ×6+4+8, `livehub.game.aetheria` ×2 — **pt + en** completos; es/fr/hi caem no EN e pt-BR no PT pela cascata do `t()` (comportamento declarado).
- E2E: `bateu_lang=en` → menu «BATEU RPG: LEGENDS» / «NEW LEGEND» / «NORMAL», HUD «QUESTS», modal «WORLD MAP», pausa «EXIT TO THE PLATFORM»; regressão PT byte-a-byte («NOVA LENDA», «MÉDIO»).

**Honesto (o que fica):** as descrições das RECEITAS da forja (`receita.desc`) continuam PT canónico (dados do motor partilhado com a cidade — passo futuro declarado); a tradução EN das mensagens de ERRO do motor de física partilhado segue PT canónico (mesmo motivo).

## Item 4 — «Fix fullscreen entry, exit, resizing and mobile use»

O furo real: `hideChrome` escondia TODO o chrome do wrapper nos mundos imersivos — e os mundos NÃO tinham botão próprio: **fullscreen era inalcançável no BATEU RPG e no Aetheria**. Além disso os portais vivem `createPortal(…, document.body)` (fixed z-80) — FORA da stacking context do wrapper: o botão tem de viver NO portal.

- `ToggleEcraInteiro` NOVO (export de GameFullscreenWrapper.tsx): botão DENTRO do portal (RPG + Aetheria), pede fullscreen para o ancestral `.fixed`; `fullscreenchange` sincroniza o estado; dispara `window.resize` no rAF seguinte (o `Motor.redimensionar()` e o ResizeObserver do Aetheria apanham sem esperar o intervalo de 800 ms).
- Mobile/webviews SEM API (`fullscreenEnabled=false`): modo PSEUDO honesto — o portal já é fixed inset-0, o botão passa a anunciar SAÍDA e sai pelo mesmo caminho; **sem API o botão não se auto-oculta** (não há overlay do navegador para o devolver).
- Wrapper (jogos não-imersivos): mantém o botão, o pseudo-mode com scroll lock, ESC no pseudo e o resize no fullscreenchange; `hideChrome` volta a esconder o chrome (o caminho dos imersivos é o toggle no portal).
- **FURO REAL encontrado a meio:** o bar de ANÚNCIOS do navbar (v26) tinha `top: 38` FIXO no navbar mas o bar real mede 45 px e vive no fluxo (desce com o TrustBar) — SOBREPUNHA os itens do navbar e INTERCEPTAVA hover/cliques (repro: `page.hover` → «subtree intercepts pointer events»). Fix: altura REAL medida por ResizeObserver → o nav desce até ao `bottom` do bar (85 px medidos). Item 8 também.
- E2E: fullscreen real (fullscreenElement = portal, resize ≥1, canvas = viewport), saída pela API (o headless não tem UI de browser para o ESC — anotado), pseudo entra/sai.

## Item 5 — «Verify and correct managed Google/Apple registration and signup errors»

**FUROS REAIS com repro:**
1. **O retorno do provedor com erro morria calado.** `?error=access_denied&…` / `#error=…` chegavam à homepage sem uma palavra. Fix: `src/lib/oauthReturn.ts` NOVO (puro browser+Node) — `erroOAuthDoUrl` lê query E fragmento; captura INLINE no `index.html` (window.__oauthRetorno) — **o gtag do Google também faz `history.replaceState` para limpar params e, em corrida com o bundle, APAGAVA o erro** (repro: /login?error=… com o gtag em cache → 50% das corridas); validação de forma no módulo; limpeza do URL DIFERIDA (250 ms) para remounts imediatos.
2. **«A ligar...» podia ficar preso para sempre** — o SDK managed não respondia (webview/popup morto). Fix: `comTimeoutOAuth` (15 s) com erro honesto e reset do loading em TODOS os caminhos.
3. **Clique real → `/~oauth/initiate` 404 seco em dev** (rota só existe na produção Lovable). Fix: `OAuthDevFallback.tsx` NOVO na rota `/~oauth/initiate` — explica que o OAuth gerido corre na produção e devolve à autenticação (navegável).
4. **`authErrors.ts`**: `email_exists` devolvia `action: "signup"` (mostrar «criar conta» a quem JÁ tem conta) → `reset_password` (entrar/recuperar).
5. Mensagens OAuth pela língua do utilizador (`auth.oauth.erro/cancelado/timeout` ×2).

## Item 6+8 — «Homepage shop/raffle discovery + top stories» + «readability/colors»

Direção visual escolhida (declarada): **«editorial limpa»** — fundo da plataforma, cartões com bordo nítido, tipografia contrastante; zero partículas/neon/confetti.

- `Index.tsx` REESCRITO: de 829 linhas (com `@ts-nocheck` — check desativado, contra as regras da casa) para ~160 limpas SEM `@ts-nocheck`. Composição: TrustBar → HeroAgora (v39, entradas honestas) → CTA central do Mundo 3D (mesmo testid `home-cta-jogar-central`) → ContinuePlayRail (só com jogo real) → **SorteiosConcursosRollUp** (descoberta de sorteios/concursos, dados reais) → **VendasRollUp** (loja) → **StoriesCarousel** (histórias reais) → PlatformFeed (atividade real) → Footer. Mobile mantém o MobileHomeApp (v26, já com descoberta).
- Legibilidade: todos os cabeçalhos com `SectionHeader` (ícone + título + subtítulo + «Ver tudo»), cores pelos tokens da plataforma (`text-foreground`/`text-muted-foreground`/`border-border`), placeholders de Suspense com altura fixa (sem saltos de layout).
- E2E: hero honesto + CTA + secções presentes + trust bar; zero pageerror.

## Item 7 — «Four mobile navigation destinations plus a central World action»

`BottomTabBar.tsx`: de 5 destinos + World para **4 destinos (Início · Loja · Arena · Perfil) + ação central WORLD** — os sorteios saem da barra porque a homepage é a descoberta (item 6); `/concursos` continua pelo menu e pelas secções. E2E mobile 390×844: 4 tabs + `mob-tab-world` + sem `mob-tab-concursos`.

## Item 9 — «Verify guest gameplay and available registration flows end to end»

Coberto pela secção E2E da suíte v62 + regressão da v61 (65/0): banner do convidado honesto no hub, RPG jogável sem conta, `/wallet`→`/login`, botões Google/Apple presentes em `/login` e `/register`, fallback OAuth navegável, zero pageerror na sessão inteira.

## Item 10 — «Audit P0 loading recovery»

O buraco real: o `loading` do AuthContext não tinha teto — getSession/perfil presos = spinner infinito nas rotas protegidas.

- `AuthContext.tsx`: teto ABSOLUTO do boot (6 s) → `bootErro` honesto; cap de 6 s na leitura do perfil (a leitura continua em segundo plano); `tentarNovamente()` re-corre o boot real.
- `ProtectedRoute.tsx`: estado de RECUPERAÇÃO navegável (`auth-boot-fallback`) — retry real + «Continuar como convidado» para `/`; NUNCA redireciona um boot falhado como se fosse convidado.
- O shell já renderiza cedo (v26: LoadingScreen com teto); o v62 garante que o AUTH nunca é o bloqueio infinito.

## Item 11 — «Surface only verifiable trust and responsible-play information»

**Inventado e REMOVIDO:**
- `/transparencia`: «100% sorteios na blockchain», «Polygon (Proof-of-Stake)», «hash de transação público», «Certified RNG», «CSPRNG… impossível prever», «AES-256 em repouso», «RGPD», «autenticação de dois fatores», «24/7», «0 incidentes», «encriptação de grau bancário» — **nenhuma destas coisas existe no código**. `transparencyContent` REESCRITO (en+pt) com o que é REAL e verificável: **commit-reveal SHA-256** (compromisso publicado ANTES do sorteio — `getDrawCommit`), **prova verificada NO BROWSER com Web Crypto** (`verifyDrawProof`/DrawProofPanel), **apuramento server-side** (edge function `raffle-draw`), registos de auditoria (`lib/audit.ts`), histórico de vencedores público, resultados em direto, aprovação de sorteios empresariais, suporte por email, +18 nos Termos.
- SEO da /transparencia: «sistema provably fair» → compromisso SHA-256 + prova no browser.
- Badges (footer/TrustSignals, ×6 línguas): «SSL 256-bit» → «Ligação segura (HTTPS)»; «Blockchain Verified» → «Prova de sorteio (SHA-256)» (chave renomeada `footer.prova`); «Certified RNG» → «Apuramento server-side» (`footer.apuramento`).
- Logos de pagamento: Visa/Mastercard/Amex eram decorativos SEM integração → **PayPal · M-Pesa · e-Mola** (o que existe de facto — edge functions PayPal + confirmação manual local, Termos §4).
- Suporte (`Suporte.tsx`) já era honesto por desenho (v39) — verificado, nada inventado a acrescentar.

## FUROS fechados a meio (lições)

1. **O gtag limpa os params de erro OAuth em corrida com o bundle** — captura INLINE no index.html resolve (determinístico: corre no parse do HTML).
2. **Remount inicial descarta o estado do erro** (flag one-shot em módulo era a metade do bug) — espelho em sessionStorage com janela de 30 s + limpeza diferida do URL.
3. **O bar de anúncios sobrepunha o navbar** (top fixo 38 vs bar real de 45 px que desce com o TrustBar) — altura/posição real medida por ResizeObserver.
4. **Servidor vite STALE/WARM:** suítes E2E contra um servidor com horas de compilações on-demand produzem 500/pageerror aleatórios (v61 «explodiu» com SecurityError de documento de erro) — aquecer as rotas ANTES de cada suíte e reiniciar o servidor entre blocos.
5. **O sanitizador de output come acentos no eco** (lição v59 reconfirmada) — verificar por padrões transformados/codepoints, nunca pelo texto ecoado.

## TESTES

`test-corrections-v62.mjs` NOVO — **91 verdes ×3 corridas consecutivas, 0 skips**:
- A núcleo (52): nomes.ts (cobertura EN completa, EN≠PT, reverse maps, causas, rótulos do mapa) · core (diárias PT canónico + EN com os MESMOS ids/recompensas) · sistemaRpg (`lingua` default pt — os 157 testes intatos; «en» muda captura e avisos) · oauthReturn (query+fragmento, timeout honesto, erro do SDK sem rejeitar, Node no-op) · **cobertura i18n: 222 chaves usadas nos componentes, todas existem em pt E en** · authErrors corrigido.
- B E2E (39): homepage nova (CTA/hero/secções) · mundo EM INGLÊS (LEGENDS/NEW LEGEND/NORMAL/QUESTS/WORLD MAP) · fullscreen REAL no portal (elemento=portal, resize disparado, canvas=viewport) + PSEUDO entra/sai · regressão PT byte-a-byte · OAuth (erro mostrado UMA vez, URL limpo com limpeza diferida, clique real → fallback honesto de dev navegável) · barra mobile 4+World · fluxos de registo com Google/Apple · convidado (banner honesto, /wallet→/login) · ZERO pageerror/consola fora do ruído.

REGRESSÃO completa: test-rpg-v41 **157/0** · test-progressao-v38 **39/0** · test-cidade **37/0** · test-world-v60 **28/0** · test-ia-v54 36+1skip (**live NVIDIA: chave em .env.ia passou a devolver «Unauthorized access» — falha de CREDENCIAL do ambiente, não regressão**; núcleo/proxy/mock intatos) · test-ia-v55 **62/0**+2skips · test-ia-v56 **54/0**+1skip · test-ia-v57 **54/0** · test-ia-v58 **76/0** · test-ia-v59 **52/0** · test-mundo-convidado-v61 **65/0** · test-web-v262 **11/0** (com o fix do hover do navbar + espera de assentamento no harness).

GATES: **tsc -b 0** · **tsc app 0** · **build OK** (NEW LEGEND/Wilderness/BATEU RPG: LEGENDS no bundle).

Honesto (o que fica): descrições das receitas da forja e mensagens de causa do MOTOR partilhado continuam PT canónico (dados do motor da cidade — passo futuro declarado); a chave NVIDIA de .env.ia precisa de renovação para o teste LIVE voltar; o fallback `/~oauth/initiate` só aparece em dev (na produção o Lovable trata a rota); a tradução es/fr/hi do mundo cai no EN pela cascata do `t()` (traduções próprias ficam para passo futuro).
