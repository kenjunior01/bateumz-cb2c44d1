# Bateu — Sorteios Premium

Plataforma de sorteios, jogos ao vivo, Mundial 2026, PayPal e dashboard empresarial.

**Stack:** Vite + React + TypeScript + Supabase + Lovable

**Supabase project:** `ngxrdpplyghlugoowjqj`

---

## Sync com Lovable

1. Push deste repositório para o remote ligado ao Lovable
2. Lovable importa as alterações automaticamente
3. Publicar em **Share → Publish**

Configuração completa (env vars, secrets, cron, checklist): **[LOVABLE.md](./LOVABLE.md)**

---

## Setup local

```sh
git clone <URL_DO_REPO>
cd bateumz
cp .env.example .env
# Preencher .env (ver LOVABLE.md)
npm install
npm run dev
```

Servidor: `http://localhost:8080`

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build produção |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

---

## Estrutura

```
src/                 Frontend React
supabase/functions/  Edge Functions (API)
supabase/migrations/ Schema PostgreSQL
LOVABLE.md           Guia deploy Lovable + secrets
.env.example         Template de variáveis (copiar para .env)
```

---

## Documentação adicional

- [LOVABLE.md](./LOVABLE.md) — deploy, secrets, checklist
- [WORLD_CUP_FEATURES.md](./WORLD_CUP_FEATURES.md) — funcionalidades Mundial
