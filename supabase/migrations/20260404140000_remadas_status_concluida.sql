-- Inclui status `concluida` nas remadas (alinhado à UI de admin).

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
