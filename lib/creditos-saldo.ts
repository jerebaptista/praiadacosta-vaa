export type CreditoRow = {
  quantidade: number;
  status: string;
  data_vencimento: string | null;
};

function hojeLocalISO(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function saldoCreditos(rows: CreditoRow[]): {
  disponiveis: number;
  usados: number;
  expirados: number;
} {
  const hoje = hojeLocalISO();
  let disponiveis = 0;
  let usados = 0;
  let expirados = 0;

  for (const r of rows) {
    if (r.status === "usado") {
      usados += r.quantidade;
      continue;
    }
    if (r.status === "expirado") {
      expirados += r.quantidade;
      continue;
    }
    if (r.status === "disponivel") {
      const v = r.data_vencimento;
      if (v && v < hoje) {
        expirados += r.quantidade;
      } else {
        disponiveis += r.quantidade;
      }
    }
  }

  return { disponiveis, usados, expirados };
}
