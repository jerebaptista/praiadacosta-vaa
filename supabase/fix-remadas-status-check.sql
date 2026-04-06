-- =============================================================================
-- Corrige CHECK de `public.remadas.status` quando o cancelar/concluir falha com
-- erro PostgreSQL 23514 (nenhum valor gravado pela app é aceite).
--
-- Como usar: Supabase → SQL Editor → colar e executar (uma vez).
-- =============================================================================

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
      'cancelado',
      'cancelled',
      'canceled',
      'anulada'
    )
  );
