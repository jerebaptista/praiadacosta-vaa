-- Valores comuns para "remada concluída" (evita 23514 quando o CHECK só tinha agendada/cancelada).

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
