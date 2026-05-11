
# Lives Agendadas + Embaixadores com Ranking

Permite que empresas agendem uma live (interna no LiveHub ou link externo: YouTube, IG, TikTok, FB) e que qualquer utilizador autenticado gere um link único para partilhar nas redes. Quem mais convidados levar à live (visita + entrada efetiva confirmada) sobe no ranking e ganha os prémios definidos pela empresa.

## 1. Base de dados

Nova tabela `scheduled_lives`:
- `business_user_id`, `title`, `description`, `cover_url`
- `source_type`: `internal` | `external`
- `live_code` (FK lógico para o LiveHub) **OU** `external_url` + `external_platform` (youtube/instagram/tiktok/facebook/other)
- `scheduled_at` (timestamptz), `ends_at` (opcional)
- `status`: `draft` | `scheduled` | `live` | `ended` | `cancelled`
- `slug` único para URL pública amigável
- `count_rule`: fixo `visit_and_attendance` (visita + entrada confirmada)

Estender `live_ambassador_visits` com:
- `scheduled_live_id` (FK opcional)
- `attended_at` (timestamptz, null até confirmação) — só conta para ranking quando preenchido

Estender `live_ambassador_prizes` com:
- `scheduled_live_id` (FK opcional) — reaproveita estrutura de prémios existente

Função RPC `get_scheduled_live_ranking(p_scheduled_live_id, p_limit, p_offset)` — `SECURITY DEFINER`, paginada, conta apenas visitas com `attended_at IS NOT NULL`.

Função RPC `confirm_live_attendance(p_visit_token)` — marca `attended_at = now()` quando o convidado abre a página da live no horário (`scheduled_at - 30min` até `ends_at + 2h`).

Cron leve (a cada 5 min) que muda `status` para `live` ou `ended` conforme o tempo, e dispara `award_ambassador_prize` para todos os prémios da live ao terminar.

## 2. Frontend — Empresa

Nova página `src/pages/dashboard/DashboardScheduledLives.tsx`:
- Lista das lives agendadas (próximas/passadas)
- Botão "Agendar live" → wizard 3 passos: origem (interna/externa) → detalhes (título, capa, data/hora) → prémios de embaixador (1º, 2º, 3º…)
- Para cada live: copiar URL pública, ver ranking, editar prémios, cancelar

Adicionar item "Lives agendadas" em `DashboardSidebar.tsx`.

## 3. Frontend — Público

Nova página `src/pages/ScheduledLivePage.tsx` em `/live-evento/:slug`:
- Hero com capa + countdown grande até `scheduled_at` (ou "AO VIVO AGORA" / "Terminou")
- Botão "Entrar na live" — abre `external_url` em nova aba ou redirecciona para `/lives?code=...`. Ao clicar, dispara `confirm_live_attendance` se o visitante chegou via link de embaixador (token em sessionStorage)
- CTA "Convidar amigos e ganhar prémios" → ativa embaixador e mostra link único + botões de partilha (reaproveita `AmbassadorPanel`)
- Ranking ao vivo (top 10 + posição do utilizador) com auto-refresh
- Lista de prémios definidos
- Estado pós-live: vencedores destacados

Atualizar `AmbassadorRedirect.tsx` (`/e/:businessId/:refCode?live=...`):
- Quando vier com `?sl=<scheduled_live_id>`, guarda visit token em sessionStorage para confirmar attendance ao clicar "Entrar na live"
- Redireciona para a `ScheduledLivePage` em vez do hub directamente

## 4. Biblioteca

`src/lib/scheduledLives.ts` com helpers: `createScheduledLive`, `listScheduledLives`, `fetchScheduledLive(slug)`, `fetchScheduledLiveRanking`, `buildScheduledLiveUrl(slug)`, `buildScheduledAmbassadorUrl(businessId, refCode, scheduledLiveId)`, `confirmAttendance`.

Estender `ambassador.ts` para suportar `scheduledLiveId` no fluxo de partilha.

## 5. Notificações & integração

- Notificação ao vencedor (já existe via `award_ambassador_prize`) — passar contexto da live
- Em `LiveHub.tsx` (host), se a live atual pertencer a uma `scheduled_live`, mostrar painel com ranking dos embaixadores dessa live agendada (reutiliza `AmbassadorPanel` com novo prop `scheduledLiveId`)

## 6. Segurança

- `scheduled_lives` RLS: SELECT público para `status IN ('scheduled','live','ended')`; INSERT/UPDATE/DELETE só pelo `business_user_id` ou admin
- `confirm_live_attendance` valida janela temporal e que o visit token pertence ao IP/UA atual
- Manter REVOKE PUBLIC + GRANT a anon/authenticated nas RPCs `SECURITY DEFINER`
- Atualizar memória de segurança com a nova superfície pública

## Diagrama do fluxo

```text
Empresa agenda live ──> /live-evento/:slug (público, countdown)
       │                       │
       │                       ├─ Utilizador X clica "Convidar"
       │                       │     └─> gera /e/:biz/:ref?sl=<id>
       │                       │
       │                       └─ Convidado clica link partilhado
       │                             ├─ regista visita (dedup IP+UA+dia)
       │                             ├─ guarda token em sessionStorage
       │                             └─ aterra na ScheduledLivePage
       │                                  └─ clica "Entrar na live"
       │                                        └─ confirm_attendance()
       │                                              └─ visita conta no ranking
       ▼
Cron termina live ──> award_ambassador_prize() para cada posição
                            └─ notifica vencedores em tempo real
```
