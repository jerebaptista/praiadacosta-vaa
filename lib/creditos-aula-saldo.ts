/** Uma linha em `creditos_aula` = 1 crédito (unidade). */

import { hojeLocalISODate } from "@/lib/dates";

function sliceDia(v: unknown): string {
  if (v == null) return "";
  return String(v).slice(0, 10);
}

export function saldoCreditosAula(
  rows: Record<string, unknown>[]
): {
  disponiveis: number;
  usados: number;
  expirados: number;
} {
  const hoje = hojeLocalISODate();
  let disponiveis = 0;
  let usados = 0;
  let expirados = 0;

  for (const r of rows) {
    const usadoEm = r.usado_em;
    const usadoPorData =
      usadoEm != null && String(usadoEm).trim() !== "";
    const st = String(r.status ?? "").toLowerCase();
    const usadoPorStatus =
      st === "usado" || st === "consumido" || st === "utilizado";

    if (usadoPorData || usadoPorStatus) {
      usados += 1;
      continue;
    }

    const expira = sliceDia(r.expira_em);
    if (st === "expirado" || (expira && expira < hoje)) {
      expirados += 1;
      continue;
    }

    disponiveis += 1;
  }

  return { disponiveis, usados, expirados };
}
