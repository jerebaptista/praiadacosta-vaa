-- Extensões (Supabase já costuma ter pgcrypto)
create extension if not exists "pgcrypto";

-- Planos
create table if not exists public.planos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor numeric(12, 2) not null default 0,
  frequencia_semanal int not null default 1,
  creditos_mensais int not null default 0
);

-- Alunos
create table if not exists public.alunos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  telefone text,
  data_nascimento date,
  data_inicio date default current_date,
  plano_id uuid references public.planos (id),
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'cancelado')),
  motivo_cancelamento text,
  created_at timestamptz not null default now()
);

-- Remadas (sessões no estúdio; `data_hora` em timestamptz)
create table if not exists public.remadas (
  id uuid primary key default gen_random_uuid(),
  data_hora timestamptz not null,
  vagas int not null check (vagas >= 1 and vagas <= 99),
  status text not null default 'agendada' check (status in ('agendada', 'concluida', 'concluido', 'realizada', 'finalizada', 'cancelada', 'cancelado')),
  created_at timestamptz not null default now()
);

create index if not exists idx_remadas_data_hora on public.remadas (data_hora);

-- Turmas (horários fixos semanais; as remadas são geradas a partir daqui)
create table if not exists public.turmas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dias_semana jsonb not null default '[]'::jsonb,
  hora time not null,
  vagas int not null check (vagas >= 1 and vagas <= 99),
  status text not null default 'ativa' check (status in ('ativa', 'inativa')),
  created_at timestamptz not null default now()
);

-- Agendamentos
create table if not exists public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  data date not null,
  horario time not null,
  status text not null default 'confirmado' check (status in ('confirmado', 'cancelado', 'compareceu'))
);

-- Créditos (lotes)
create table if not exists public.creditos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  quantidade int not null check (quantidade > 0),
  motivo text not null check (motivo in ('indicacao', 'retorno', 'bonificacao', 'outro')),
  origem text not null default 'acrescimo_manual',
  data_vencimento date,
  status text not null default 'disponivel' check (status in ('disponivel', 'usado', 'expirado')),
  created_at timestamptz not null default now()
);

-- Pagamentos mensais
create table if not exists public.pagamentos_mensais (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  mes date not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago')),
  pago_em timestamptz,
  observacao text,
  unique (aluno_id, mes)
);

create index if not exists idx_pagamentos_mes on public.pagamentos_mensais (mes);
create index if not exists idx_agendamentos_aluno on public.agendamentos (aluno_id);
create index if not exists idx_creditos_aluno on public.creditos (aluno_id);

-- Previsão meteo (preenchimento externo, ex. n8n 1x/dia)
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

-- Configuração global do estúdio (linha única id = 1)
create table if not exists public.estudio_config (
  id smallint primary key default 1 check (id = 1),
  preco_por_aula numeric(12, 2) not null default 0
);

insert into public.estudio_config (id, preco_por_aula)
values (1, 0)
on conflict (id) do nothing;

-- RLS: ajuste conforme autenticação do estúdio (política permissiva para desenvolvimento com anon)
alter table public.planos enable row level security;
alter table public.alunos enable row level security;
alter table public.remadas enable row level security;
alter table public.agendamentos enable row level security;
alter table public.creditos enable row level security;
alter table public.pagamentos_mensais enable row level security;
alter table public.turmas enable row level security;
alter table public.meteo_previsao_diaria enable row level security;
alter table public.estudio_config enable row level security;

create policy "planos_all" on public.planos for all using (true) with check (true);
create policy "alunos_all" on public.alunos for all using (true) with check (true);
create policy "remadas_all" on public.remadas for all using (true) with check (true);
create policy "agendamentos_all" on public.agendamentos for all using (true) with check (true);
create policy "creditos_all" on public.creditos for all using (true) with check (true);
create policy "pagamentos_all" on public.pagamentos_mensais for all using (true) with check (true);
create policy "turmas_all" on public.turmas for all using (true) with check (true);
create policy "meteo_previsao_all" on public.meteo_previsao_diaria for all using (true) with check (true);
create policy "estudio_config_all" on public.estudio_config for all using (true) with check (true);
