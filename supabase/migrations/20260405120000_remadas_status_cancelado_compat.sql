-- Compatível com bases que usam `cancelado` em vez de `cancelada` (ex.: alinhado a `alunos`/`agendamentos`).
-- Corrige também o erro 23514 ao cancelar uma remada.

alter table public.remadas drop constraint if exists remadas_status_check;

alter table public.remadas
  add constraint remadas_status_check
  check (
    status in (
      'agendada',
      'concluida',
      'concluido',
      'realizada',
      'finalizada',
      'cancelada',
      'cancelado'
    )
  );
