-- Preços por recorrência no mesmo plano (comparação na listagem admin).

alter table public.planos
  add column if not exists remadas_por_semana int;

alter table public.planos
  add column if not exists preco_mensal numeric(12, 2);

update public.planos
set
  remadas_por_semana = coalesce(remadas_por_semana, frequencia_semanal, 1),
  preco_mensal = coalesce(preco_mensal, valor, 0)
where true;

alter table public.planos
  alter column remadas_por_semana set default 1;

alter table public.planos
  alter column preco_mensal set default 0;

update public.planos
set remadas_por_semana = 1
where remadas_por_semana is null;

update public.planos
set preco_mensal = 0
where preco_mensal is null;

alter table public.planos
  alter column remadas_por_semana set not null;

alter table public.planos
  alter column preco_mensal set not null;

alter table public.planos
  add column if not exists preco_trimestral numeric(12, 2),
  add column if not exists preco_semestral numeric(12, 2),
  add column if not exists preco_anual numeric(12, 2);

-- Sugestão inicial: proporcional ao mensal (ajustável depois no admin).
update public.planos
set
  preco_trimestral = coalesce(preco_trimestral, round((preco_mensal * 3)::numeric, 2)),
  preco_semestral = coalesce(preco_semestral, round((preco_mensal * 6)::numeric, 2)),
  preco_anual = coalesce(preco_anual, round((preco_mensal * 12)::numeric, 2))
where preco_mensal is not null;
