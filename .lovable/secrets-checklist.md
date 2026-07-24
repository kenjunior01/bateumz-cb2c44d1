# Secrets checklist (Lovable + Supabase)

Use this when syncing from Git. All code is in the repo; only secrets need one-time setup.

## Lovable Environment Variables

```
VITE_SUPABASE_URL=https://ngxrdpplyghlugoowjqj.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=ngxrdpplyghlugoowjqj
VITE_RAPIDAPI_KEY=<rapidapi key>
VITE_RAPIDAPI_FOOTBALL_HOST=free-api-live-football-data.p.rapidapi.com
VITE_WORLD_CUP_LEAGUE_ID=16
VITE_FOOTBALL_SEASON=2022
```

## Supabase Edge Secrets

```
RAPIDAPI_KEY=<same as VITE_RAPIDAPI_KEY>
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
PAYPAL_ENV=sandbox
LOVABLE_API_KEY=
```

Service role and anon keys are usually auto-configured by Lovable Supabase integration.
