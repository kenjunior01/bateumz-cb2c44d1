# REA — Apresentação da Página Inicial e Cada Funcionalidade
## Benchmark dos melhores do mundo → aplicado à versão web da Bateu

> REA (Referência de Excelência Aplicada): estudo dos líderes mundiais de cada tipo de
> funcionalidade, extração dos padrões que os fazem vencer, e aplicação integral na
> plataforma — principalmente na versão web, em todos os aspetos.

---

## 1. PÁGINA INICIAL — Benchmark: Steam · Epic Games Store · Roblox · Netflix · Twitch

| Padrão dos melhores | O que fazem | Estado na Bateu |
|---|---|---|
| Hierarquia de 3 camadas (Steam/Epic) | herói dominante → bloco secundário → CTA único acima da dobra | ✅ Hero com CTA "JOGAR AGORA — MUNDO BATEU" + CTAs de registo |
| Descoberta instantânea sem registo (Poki/CrazyGames) | "o que vais jogar hoje?" — categorias + jogar imediato | ✅ Chips de categorias com contagens + CTA central |
| Números ao vivo (Roblox) | contadores reais de jogadores/CCU | ✅ `hero-stats-live` com dados do Supabase |
| Roll-ups horizontais (Netflix) | fileiras com snap, setas, dots, auto-avanço | ✅ 5 roll-ups; **falta a11y de teclado + `prefers-reduced-motion` + dots clicáveis** → corrigido nesta ronda |
| Continuar a jogar (Steam) | "Continuar a jogar" personalizado | ✅ `ContinuePlayRail` |
| Prova social real (Twitch) | espectadores ao vivo nos cartões | ✅ contagens reais; sem números inventados |

**Melhorias aplicadas nesta ronda:** RollUp com `aria-roledescription="carousel"`, navegação por
teclado, dots clicáveis, respeito por `prefers-reduced-motion`, contador de itens; roll-ups
Destaques/Jogos com foco de teclado real (`tabIndex`, Enter/Espaço) e `data-testid`.

---

## 2. HUB DE JOGOS (/jogos) — Benchmark: CrazyGames · Poki · Steam

| Padrão | Aplicação |
|---|---|
| Pesquisa e título visíveis no telemóvel (CrazyGames) | **corrigido**: herói compacto no mobile com pesquisa acessível (`aria-label`) |
| CCU real por jogo (Steam) | **corrigido**: badge "X sessões · 24h" com dados reais de `game_sessions` |
| Empty state com ação (Poki) | **corrigido**: botão "Limpar filtros" + `data-testid` |
| Performance | **corrigido**: luz do rato com `requestAnimationFrame` (sem re-render por pixel) |

---

## 3. LIVE HUB (/lives) — Benchmark: Twitch

| Padrão | Aplicação |
|---|---|
| Descoberta de canais ao vivo com espectadores | secção "Lives agora" real (ver LivesAgora) linkada no topo do hub |
| Tudo em português | **corrigido**: `GameErrorBoundary` traduzido (era inglês) |
| Pesquisa funcional | **corrigido**: pesquisa do descobrimento mobile ligada à filtragem real |
| Catálogo completo | **corrigido**: seletor mostra o catálogo completo do switch (não só 17) |

---

## 4. MARKETPLACE/SORTEIOS (/marketplace) — Benchmark: Mercado Livre · Jumia · eBay

| Padrão | Aplicação |
|---|---|
| Skeletons de carregamento (Netflix/ML) | **corrigido**: grelha skeleton em vez de spinner genérico |
| CTA sempre visível no touch (ML) | **corrigido**: "Participar" nunca depende de hover |
| Urgência: countdown ao vivo (eBay) | **corrigido**: timer `DD:HH:MM:SS` + badge "QUASE ESGOTADO" quando ≥80% vendido |
| Prova social | **corrigido**: bilhetes vendidos em destaque |
| Testes | `data-testid` em todos os blocos-chave |

---

## 5. LEILÕES (/leiloes) — Benchmark: eBay (anti-snipe) · Steam Community Market

| Padrão | Aplicação |
|---|---|
| Números reais, nunca falsos | **corrigido**: "Licitadores" hardcoded → contagem real de lances |
| Histórico de lances (eBay) | **corrigido**: nº real de lances + "É teu!" quando o utilizador lidera |
| Empty state com ação | **corrigido**: CTA "Ver agendados" |
| Anti-snipe | ✅ já documentado na secção "Como funciona" |

---

## 6. CONCURSOS (/concursos) — Benchmark: Instagram (CTA touch) · YouTube (lazy)

| Padrão | Aplicação |
|---|---|
| Estados de carregamento honestos | **corrigido**: falso "vazio" no desktop durante loading → skeleton em todas as dimensões |
| CTA touch-first | **corrigido**: "Participar" sempre visível |
| Imagens lazy (Core Web Vitals) | **corrigido**: `loading="lazy"` em todas as imagens |

---

## 7. BATALHAS (/batalhas) — Benchmark: FACEIT · Challengermode

| Padrão | Aplicação |
|---|---|
| Zero números falsos (FACEIT) | **corrigido**: ticker/stats/derby → dados reais das batalhas abertas; quando vazio, "Sê o primeiro a criar" |
| HTML válido | **corrigido**: `DialogTrigger asChild` (botão aninhado removido) |
| Acessibilidade | `aria-label` nos botões icon-only |

---

## 8. PERFIL (/profile) — Benchmark: Steam · Discord

| Padrão | Aplicação |
|---|---|
| Estatísticas reais (Steam) | **corrigido**: tab "Estatísticas" mockada → dados reais (participações, gastos, confirmações do Supabase) |
| Integridade | nenhum número inventado na página pessoal do utilizador |

---

## 9. STORIES — Benchmark: Instagram · WhatsApp · Snapchat

| Padrão | Aplicação |
|---|---|
| Qualidade de código | **corrigido**: `@ts-nocheck` removido — verificação de tipos ativa em todo o ficheiro |
| Skeleton (Instagram) | **corrigido**: anéis skeleton enquanto carrega |
| Testes | `data-testid` nos anéis e no visualizador |

---

## 10. FEED — Benchmark: TikTok · Discord · Instagram

| Padrão | Aplicação |
|---|---|
| Acessibilidade de itens clicáveis | **corrigido**: `role="button"`, `tabIndex`, Enter/Espaço |
| "Ver mais" | **corrigido**: botão para expandir a lista |
| Testes | `data-testid` |

---

## Regras transversais desta ronda (aplicadas a tudo)

1. **Zero prova social falsa** — números fake substituídos por dados reais ou removidos.
2. **CTAs visíveis em touch** — nada de funcionalidade escondida atrás de hover.
3. **Estados honestos** — skeleton real durante loading; empty states com ação.
4. **Acessibilidade** — teclado, `aria-label`, `prefers-reduced-motion`.
5. **100% português** — nada de strings em inglês no interface.
6. **`data-testid`** — cada melhoria coberta por asserções E2E.
7. **Performance no telemóvel** — menos re-renders, imagens lazy, skeletons leves.
