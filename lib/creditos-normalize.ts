import type { CreditoRow } from "@/lib/creditos-saldo";

/** Tenta mapear uma linha (creditos ou creditos_aula) para o formato do saldo. */
export function normalizarLinhaParaSaldo(
  row: Record<string, unknown>
): CreditoRow | null {
  const rawQ =
    row.quantidade ??
    row.qtd ??
    row.creditos ??
    row.quantidade_creditos;
  if (rawQ == null) return null;
  const quantidade = Number(rawQ);
  if (!Number.isFinite(quantidade) || quantidade < 0) return null;

  let status = String(row.status ?? "disponivel").toLowerCase();
  if (status === "consumido" || status === "utilizado") status = "usado";
  else if (status === "ativo") status = "disponivel";
  else if (!["disponivel", "usado", "expirado"].includes(status)) {
    status = "disponivel";
  }

  const v = row.data_vencimento ?? row.validade ?? row.data_validade;
  const data_vencimento =
    v == null || v === "" ? null : String(v).slice(0, 10);

  return { quantidade, status, data_vencimento };
}

export function linhasParaSaldo(rows: Record<string, unknown>[]): CreditoRow[] {
  return rows
    .map(normalizarLinhaParaSaldo)
    .filter((x): x is CreditoRow => x != null);
}

export function creditoSortTime(row: Record<string, unknown>): number {
  const t = row.criado_em ?? row.created_at;
  if (t == null) return 0;
  const n = new Date(String(t)).getTime();
  return Number.isFinite(n) ? n : 0;
}
