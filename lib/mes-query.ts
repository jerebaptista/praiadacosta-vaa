import { mesAtualPrimeiroDia, primeiroDiaDoMes } from "@/lib/dates";

export function mesFromSearchParam(
  raw: string | string[] | undefined
): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return mesAtualPrimeiroDia();
  const [y, m] = v.split("-").map(Number);
  if (!y || m < 1 || m > 12) return mesAtualPrimeiroDia();
  return primeiroDiaDoMes(y, m - 1);
}
