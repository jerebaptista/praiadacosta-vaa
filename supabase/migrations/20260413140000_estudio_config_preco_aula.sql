-- Configuração global do estúdio (linha única id = 1)
create table if not exists public.estudio_config (
  id smallint primary key default 1 check (id = 1),
  preco_por_aula numeric(12, 2) not null default 0
);

insert into public.estudio_config (id, preco_por_aula)
select 1, 0
where not exists (select 1 from public.estudio_config where id = 1);

alter table public.estudio_config enable row level security;

create policy "estudio_config_all"
  on public.estudio_config for all
  using (true) with check (true);
