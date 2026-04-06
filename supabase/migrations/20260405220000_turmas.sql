-- Tabela de turmas (horários fixos semanais)
create table if not exists public.turmas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dias_semana jsonb not null default '[]'::jsonb,
  hora time not null,
  vagas int not null check (vagas >= 1 and vagas <= 99),
  status text not null default 'ativa' check (status in ('ativa', 'inativa')),
  created_at timestamptz not null default now()
);

alter table public.turmas enable row level security;
create policy "turmas_all" on public.turmas for all using (true) with check (true);
