# Mobile Panels Redesign + Social Live Studio

## 1. Mobile Dashboard Shell (Empresa & Admin)

**DashboardLayout / AdminLayout** ganham:
- **Bottom nav próprio do dashboard** (visível só em mobile, sob `lg:hidden`): 5 tabs — Painel, Sorteios, Lives, Participantes, Mais. Substitui o `BottomTabBar` global no `/dashboard*` e `/admin*`.
- **Drawer secundário** (Sheet) acionado pelo botão "Mais", com pesquisa global, perfil, todas as secções (analytics sociais, prémios, white-label, embaixadores, prestações, notificações, configurações, sair).
- **Topbar mobile**: logo compacto + barra de pesquisa global (filtra rotas, sorteios e lives por título) + sino de notificações com dropdown (lista as últimas 5 e link para ver todas).
- **FAB "Nova Ação"** (canto inferior direito, acima do bottom nav): expande em arco com 4 atalhos — Novo Sorteio, Agendar Live, Ir Live Agora, Novo Prémio.

## 2. Painel Geral mobile redesenhado

- Strip horizontal de **KPI cards** (scroll-snap): Sorteios Ativos, Receita 7d, Bilhetes Vendidos, Lives Agendadas, Visitas de Embaixadores hoje, Pendentes de Aprovação.
- Mini sparkline (svg simples, sem libs novas) em cada KPI quando houver série temporal.
- Banner de **alertas inteligentes**: pagamentos pendentes, lives a começar nas próximas 2h, sorteios sem prémio, etc. Clicáveis.
- Lista compacta de **próximas lives** com botão direto "Abrir Studio".

## 3. Live Studio (gestão de lives nas redes sociais)

Nova página `/dashboard/live-studio/:id` com 3 tabs:

### Pré-Live
- Checklist editável (título OK, prémios definidos, links das plataformas, embaixadores ativados, post de aviso publicado).
- Editor de **links multiplataforma** (Instagram, TikTok, Facebook, YouTube, X, Outro): cada link guardado em `scheduled_live_links`. Mostra preview do botão público.
- **Geração de assets**: QR code do convite, imagem 9:16 partilhável (canvas), texto pronto para copiar.
- Atribuição de **prémios da live** (reaproveita `live_ambassador_prizes` com `scheduled_live_id`).

### Durante (modo Studio ao vivo)
- Botões grandes: **Ir Live** (status `live`), **Pausar**, **Encerrar**.
- Painel ao vivo com 3 colunas no desktop / abas no mobile:
  - **Ranking ao vivo** dos embaixadores (poll a cada 10s usando RPC já existente).
  - **Sondagens rápidas** (`live_polls`): criar com 2-4 opções, abrir/fechar, ver resultados em tempo real (Realtime).
  - **Anúncios** (`live_announcements`): empresa publica mensagens (ex: "Próximo prémio em 5 min"), aparecem no overlay público e no `ScheduledLivePage`.
- **Moderação de comentários** da comunidade da live (reusa `community_messages` filtrados por `raffle_id`/`scheduled_live_id` — adicionar coluna `scheduled_live_id`): aprovar/ocultar/banir.
- **Botão sortear prémio agora**: chama `award_ambassador_prize` e dispara anúncio + notificação automática.

### Pós-Live
- Resumo: visitas únicas, attendance confirmada, novos seguidores estimados, top 10 embaixadores, prémios atribuídos.
- Exportar CSV do ranking.
- Botão "Duplicar como nova live agendada".

## 4. Overlays públicos para OBS / partilhar no streaming

Nova rota pública `/overlay/live/:id?view=ranking|prizes|countdown|announcement` com tema transparente, otimizado 1920x1080 e 1080x1920. URL única gerada no Studio, copiável, para usar como Browser Source no OBS/StreamYard ou abrir em telemóvel para mostrar à câmara.

- **ranking**: top 5 embaixadores em tempo real (Realtime).
- **prizes**: lista dos prémios desta live (ainda por atribuir vs já entregues).
- **countdown**: contagem decrescente para o início ou para o próximo sorteio.
- **announcement**: último anúncio em destaque (full screen, animação).

## 5. Engajamento ao vivo (público)

`ScheduledLivePage` ganha:
- Tab de **sondagens ativas** (votar uma vez por user/dispositivo).
- Banner de **anúncios** em destaque animado.
- Lista de **prémios desta live** com posição atual no ranking.

## 6. Banco de dados (migration)

Novas tabelas:
- `scheduled_live_links` (id, scheduled_live_id, platform, url, label, is_primary). RLS: dono da live e admin gerem; público lê.
- `live_polls` (id, scheduled_live_id, question, options jsonb, is_open, created_at). RLS: dono cria/fecha; público lê abertos.
- `live_poll_votes` (poll_id, voter_hash, option_index, user_id?). UNIQUE (poll_id, voter_hash). Público insere via RPC anti-fraude.
- `live_announcements` (id, scheduled_live_id, message, kind, created_at). RLS: dono insere; público lê.
- `live_studio_checklist` (scheduled_live_id, item_key, done, updated_at). RLS: dono.

Alterações:
- `community_messages.scheduled_live_id` (nullable) + índice.
- `live_ambassador_prizes` já tem `scheduled_live_id` — apenas garantir uso.

RPCs:
- `cast_live_poll_vote(p_poll_id, p_voter_hash)` — anti-duplicação.
- `get_live_studio_summary(p_id)` — agrega visits, attendance, polls, prizes.

## 7. Detalhes técnicos

- Sem libs novas. Usar `framer-motion` e `recharts` (já presentes) para sparklines/KPIs. Realtime via Supabase channels existentes.
- Bottom nav e FAB respeitam `safe-area-inset-bottom`.
- Drawer usa `Sheet` shadcn.
- Pesquisa global é client-side: combina rotas estáticas + fetch leve de raffles/lives do user.
- Overlay público sem auth, RLS já permite leitura pública das tabelas envolvidas.
- Ficheiros novos:
  - `src/components/dashboard/DashboardBottomNav.tsx`
  - `src/components/dashboard/DashboardMobileTopbar.tsx`
  - `src/components/dashboard/DashboardFab.tsx`
  - `src/components/dashboard/DashboardMoreDrawer.tsx`
  - `src/pages/dashboard/LiveStudio.tsx` (+ subcomponentes em `src/components/dashboard/live-studio/`)
  - `src/pages/OverlayLive.tsx`
  - `src/lib/liveStudio.ts`
  - migration SQL.

## 8. Fora do escopo (para confirmar depois)

- Integração real com APIs do Instagram/TikTok/YouTube (apenas guardamos os links e abrimos).
- Streaming pela própria plataforma (continua a ser feito nas redes sociais).
- Versão admin do Live Studio (admins acompanham via `/admin/raffles` + view-only).
