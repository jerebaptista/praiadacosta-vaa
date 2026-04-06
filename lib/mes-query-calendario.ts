import { startOfMonth } from "date-fns";

/** Interpreta `?mes=yyyy-MM` ou mês atual. */
export function mesDoParametro(raw: string | string[] | undefined): Date {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || !/^\d{4}-\d{2}/.test(v)) {
    return startOfMonth(new Date());
  }
  const [y, m] = v.split("-").map(Number);
  if (!y || m < 1 || m > 12) return startOfMonth(new Date());
  return startOfMonth(new Date(y, m - 1, 1));
}
