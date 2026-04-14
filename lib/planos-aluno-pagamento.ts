import type { AlunoPagamentoPlanoStatus } from "@/lib/planos-tipos";

/** Considera o período pago até o dia do vencimento (inclusive); depois, pendente. */
export function statusPagamentoApartirDeVencimento(
  vencimentoIsoDate: string
): AlunoPagamentoPlanoStatus {
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  const ymd = vencimentoIsoDate.slice(0, 10);
  const v = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(v.getTime())) return "pendente";
  return hoje <= v ? "pago" : "pendente";
}
