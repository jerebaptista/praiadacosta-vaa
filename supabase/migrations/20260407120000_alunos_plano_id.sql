-- Alinha bases antigas com schema.sql: vínculo opcional do aluno a um plano.
alter table public.alunos
  add column if not exists plano_id uuid references public.planos (id);
