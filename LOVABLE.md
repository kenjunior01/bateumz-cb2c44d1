# Bateu — Configuração Lovable (sync via Git)

Este repositório está preparado para **editar no Lovable ou localmente e sincronizar via Git**.  
Push para o remote → Lovable importa automaticamente. Edge functions e migrations vão na pasta `supabase/`.

---

## Fluxo de trabalho

1. **Editar** no Lovable ou no Cursor/VS Code
2. **Commit + push** para o branch principal (ou o branch ligado ao Lovable)
3. **Lovable** sincroniza o código e publica (`Share → Publish`)
4. **Supabase** aplica migrations e edge functions (via integração Lovable ou CLI)

---

## Variáveis de ambiente — Frontend (Lovable)

Em **Lovable → Project → Settings → Environment Variables** (ou Secrets), configure:

| Variável | Obrigatório | Valor / notas |
|----------|-------------|---------------|
| `VITE_SUPABASE_URL` | Sim | `https://ngxrdpplyghlugoowjqj.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Sim | Anon key do Supabase |
| `VITE_SUPABASE_PROJECT_ID` | Sim | `ngxrdpplyghlugoowjqj` |
| `VITE_RAPIDAPI_KEY` | Sim (futebol) | Chave RapidAPI — [Free Live Football Data](https://rapidapi.com/Creativesdev/api/free-api-live-football-data) |
| `VITE_RAPIDAPI_FOOTBALL_HOST` | Não | `free-api-live-football-data.p.rapidapi.com` |
| `VITE_WORLD_CUP_LEAGUE_ID` | Não | `16` (ajustar quando WC 2026 estiver na API) |
| `VITE_FOOTBALL_SEASON` | Não | `2022` ou temporada disponível no plano free |
| `VITE_PUBLIC_BASE_URL` | Não | URL pública do site (partilhas/overlays) |

Copie de `.env.example` — **nunca commite `.env`** (está no `.gitignore`).

---

## Secrets — Supabase Edge Functions

Em **Supabase Dashboard → Edge Functions → Secrets** (project `ngxrdpplyghlugoowjqj`):

| Secret | Usado por |
|--------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY` | auto-draw, notify-raffle-ending, PayPal capture, spin-wheel, cron |
| `SUPABASE_ANON_KEY` | Auth JWT nas edge functions |
| `RAPIDAPI_KEY` | `fetch-football-data` (mesmo valor que `VITE_RAPIDAPI_KEY`) |
| `RAPIDAPI_FOOTBALL_HOST` | `fetch-football-data` |
| `PAYPAL_CLIENT_ID` | PayPal checkout |
| `PAYPAL_SECRET` | PayPal create/capture |
| `PAYPAL_ENV` | `sandbox` (testes) ou `live` (produção) |
| `LOVABLE_API_KEY` | mascot-chat, mascot-message, emails |

Após alterar secrets, **redeploy** das functions afectadas no Supabase.

---

## Edge functions incluídas (18)

Deploy automático quando Lovable/Supabase sincroniza `supabase/functions/`:

- **Pagamentos:** `paypal-config`, `paypal-create-order`, `paypal-capture-order`
- **Sorteios:** `check-ticket-threshold`, `auto-draw`, `draw-social-winner`
- **Notificações:** `notify-raffle-ending`, `notify-payment-receipt`, `process-email-queue`
- **Jogos:** `spin-wheel-spin`
- **Mundial:** `award-engagement-points`, `calculate-world-cup-points`, `fetch-football-data`
- **Admin:** `admin-cron-jobs`, `create-admin`, `track-ambassador-visit`
- **AI:** `mascot-chat`, `mascot-message`

### Cron jobs (opcional, uma vez)

No **Admin → Cron Jobs** da app, use **Test** para:
- `notify-raffle-ending-hourly`
- `auto-draw-check`

Ou execute o SQL comentado em `supabase/migrations/20260617120000_auto_draw_cron.sql` no SQL Editor do Supabase (requer vault com service role key — ver migration de email).

---

## Checklist pós-sync (primeira vez)

- [ ] Variáveis `VITE_*` no Lovable
- [ ] Secrets PayPal + RapidAPI no Supabase
- [ ] Testar compra PayPal em sandbox (`/raffle/:slug`)
- [ ] Testar `/mundial` (dados live)
- [ ] Testar `/mundial/quiz`, `/bolao`, `/fantasy`
- [ ] `PAYPAL_ENV=live` só quando for para produção

---

## Desenvolvimento local

```sh
cp .env.example .env
# Editar .env com as suas chaves
npm install
npm run dev
```

App em `http://localhost:8080`

```sh
npm run build   # validar produção
npm run lint
npm test
```

---

## Rotas novas (Mundial / futebol)

| Rota | Descrição |
|------|-----------|
| `/mundial` | Central do Mundial |
| `/bolao` | Previsões / bolão |
| `/fantasy` | Fantasy Football |
| `/mundial/quiz` | Quiz ao vivo (RapidAPI) |
| `/mundial/score-challenge` | Desafio de resultado |
| `/mundial/golden-boot` | Previsão artilheiro |
| `/jogos` | Hub de todos os jogos |

---

## Correções incluídas neste repo

- PayPal capture usa `ticket_price` (pagamentos funcionais)
- Sorteio automático (`auto-draw`) com auth service role
- Notificações fim de sorteio com auth corrigida
- Spin wheel autenticado via JWT
- API futebol unificada (RapidAPI)
- Upload imagens até 20MB, formatos alargados
- Analytics dashboard com dados reais
