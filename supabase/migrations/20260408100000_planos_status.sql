alter table public.planos
  add column if not exists status text not null default 'ativo';

alter table public.planos
  drop constraint if exists planos_status_check;

alter table public.planos
  add constraint planos_status_check check (status in ('ativo', 'inativo'));

update public.planos set status = 'ativo' where status is null or status = '';
