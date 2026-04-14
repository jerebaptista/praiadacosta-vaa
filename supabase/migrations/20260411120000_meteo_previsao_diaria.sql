-- Previsão diária (7 linhas atualizadas 1x/dia pelo n8n, ex. às 05:00 local).
-- Temperatura = valor previsto para o horário de referência (ex.: 05:00) em cada dia civil local.

create table if not exists public.meteo_previsao_diaria (
  id uuid primary key default gen_random_uuid(),
  local_id text not null default 'default',
  dia date not null,
  temperatura_c numeric(5, 2) not null,
  hora_referencia text not null default '05:00',
  icon text,
  descricao_curta text,
  atualizado_em timestamptz not null default now(),
  unique (local_id, dia)
);

create index if not exists idx_meteo_previsao_local_dia
  on public.meteo_previsao_diaria (local_id, dia);

comment on table public.meteo_previsao_diaria is
  'Preenchido pelo n8n (cron diário). Uma linha por dia civil; manter ~7 linhas por local_id.';

alter table public.meteo_previsao_diaria enable row level security;

create policy "meteo_previsao_all" on public.meteo_previsao_diaria
  for all using (true) with check (true);
