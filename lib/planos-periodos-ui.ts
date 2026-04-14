import type { PlanoLinha } from "@/lib/planos-tipos";
import type { PeriodoContrato } from "@/lib/planos-aluno-vigencia";

export type OpcaoPeriodoPlano = {
  id: PeriodoContrato;
  label: string;
};

/** Períodos de cobrança disponíveis conforme preços definidos no plano (apenas se o plano estiver ativo). */
export function periodosDisponiveisDoPlano(plano: PlanoLinha): OpcaoPeriodoPlano[] {
  if (plano.status !== "ativo") return [];
  const out: OpcaoPeriodoPlano[] = [];
  if (plano.preco_mensal != null && plano.preco_mensal > 0) {
    out.push({ id: "mensal", label: "Mensal" });
  }
  if (plano.preco_trimestral != null) {
    out.push({ id: "trimestral", label: "Trimestral" });
  }
  if (plano.preco_semestral != null) {
    out.push({ id: "semestral", label: "Semestral" });
  }
  if (plano.preco_anual != null) {
    out.push({ id: "anual", label: "Anual" });
  }
  return out;
}

/** Converte rótulo exibido (ex.: "Mensal") para id de período. */
export function periodoIdAPartirDoRotulo(rotulo: string): PeriodoContrato {
  const t = rotulo.trim().toLowerCase();
  if (t.includes("trimestral")) return "trimestral";
  if (t.includes("semestral")) return "semestral";
  if (t.includes("anual")) return "anual";
  return "mensal";
}
