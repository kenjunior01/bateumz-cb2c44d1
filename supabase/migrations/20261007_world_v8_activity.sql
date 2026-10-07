-- ============================================================
-- BATEU WORLD v8 — SYNC TOTAL + registro de atividade do mundo
-- (execução idempotente; o cliente falha em silêncio se ainda
--  não tiver corrido, mantendo fila local até sincronizar)
-- ============================================================

-- 1. Diário do mundo: tudo o que acontece (caça, níveis, roubos,
--    descobertas, missões, interiores visitados, trocas...)
create table if not exists public.world_activity (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null,
  label text default '',
  value numeric default 0,
  created_at timestamptz not null default now()
);

alter table public.world_activity enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'world_activity' and policyname = 'world_activity_insert_own'
  ) then
    create policy world_activity_insert_own on public.world_activity
      for insert to authenticated, anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'world_activity' and policyname = 'world_activity_select_own'
  ) then
    create policy world_activity_select_own on public.world_activity
      for select to authenticated, anon
      using (user_id = auth.uid() or user_id is null);
  end if;
end $$;

create index if not exists world_activity_guest_idx on public.world_activity (guest_id, created_at desc);
create index if not exists world_activity_kind_idx on public.world_activity (kind, created_at desc);

-- 2. Colunas extra no espelho do herói (aditivo e idempotente)
alter table public.world_progress add column if not exists steals int default 0;
alter table public.world_progress add column if not exists duels int default 0;
alter table public.world_progress add column if not exists homes_visited int default 0;
alter table public.world_progress add column if not exists playtime_s int default 0;
alter table public.world_progress add column if not exists last_kind text default '';
