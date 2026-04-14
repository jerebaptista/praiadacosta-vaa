/** Retorna o dia 1 do mês em YYYY-MM-DD (UTC). */
export function primeiroDiaDoMes(year: number, monthIndex0: number): string {
  const d = new Date(Date.UTC(year, monthIndex0, 1));
  return d.toISOString().slice(0, 10);
}

/** Próximo mês a partir de um YYYY-MM-DD (dia 1). */
export function mesAnterior(isoMes: string): string {
  const [y, m] = isoMes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 10);
}

export function mesSeguinte(isoMes: string): string {
  const [y, m] = isoMes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return d.toISOString().slice(0, 10);
}

/** Mês atual (dia 1) em YYYY-MM-DD. */
export function mesAtualPrimeiroDia(): string {
  const n = new Date();
  return primeiroDiaDoMes(n.getFullYear(), n.getMonth());
}

/** Último dia do próximo mês civil (a partir da data local de hoje). */
export function fimDoMesSeguintePadrao(): string {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const y = last.getFullYear();
  const mo = String(last.getMonth() + 1).padStart(2, "0");
  const da = String(last.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Data local de hoje em YYYY-MM-DD. */
export function hojeLocalISODate(): string {
  const n = new Date();
  const y = n.getFullYear();
  const mo = String(n.getMonth() + 1).padStart(2, "0");
  const da = String(n.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Soma meses a uma data `YYYY-MM-DD` em calendário local (ex.: anual a partir de hoje → +12 meses). */
export function adicionarMesesDataYmd(ymd: string, meses: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return ymd;
  }
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + meses);
  const yy = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const da = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mo}-${da}`;
}

export function formatarMesPt(isoMes: string): string {
  const [y, m] = isoMes.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
