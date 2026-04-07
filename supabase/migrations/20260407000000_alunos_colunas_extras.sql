-- Colunas adicionais para o cadastro completo de alunos
alter table public.alunos
  add column if not exists cpf            text,
  add column if not exists sexo           text check (sexo in ('masculino', 'feminino')),
  add column if not exists cep            text,
  add column if not exists logradouro     text,
  add column if not exists bairro         text,
  add column if not exists cidade         text,
  add column if not exists estado         char(2),
  add column if not exists numero         text,
  add column if not exists complemento    text,
  add column if not exists avatar_url     text;

-- Permitir status 'pendente' (cobrado mensalmente mas ainda não pago)
alter table public.alunos
  drop constraint if exists alunos_status_check;

alter table public.alunos
  add constraint alunos_status_check
  check (status in ('ativo', 'pendente', 'inativo', 'cancelado'));
