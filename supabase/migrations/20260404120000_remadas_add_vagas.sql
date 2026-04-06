-- Adiciona coluna `vagas` se a tabela `remadas` existir sem ela (erro PostgREST 42703).
-- Execute no SQL Editor do Supabase ou via CLI: supabase db push

alter table public.remadas
  add column if not exists vagas integer;

update public.remadas
set vagas = 5
where vagas is null;

alter table public.remadas
  alter column vagas set default 5,
  alter column vagas set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'remadas_vagas_check'
      and conrelid = 'public.remadas'::regclass
  ) then
    alter table public.remadas
      add constraint remadas_vagas_check check (vagas >= 1 and vagas <= 99);
  end if;
end $$;
