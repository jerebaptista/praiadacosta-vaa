import type { PlanoLinha } from "@/lib/planos-tipos";
import { referenciaMensalPrecoAula } from "@/lib/estudio-config";
import {
  sanitizarNomePlanoDigitacao,
  sanitizarRemadasPorSemana,
  stripEntradaPerigosaBasica,
} from "@/lib/input-sanitize";

const fmtMoedaBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Ex.: R$ 999.999,99 — sempre duas casas decimais. */
export function formatMoedaBRL(valor: number): string {
  return fmtMoedaBRL.format(valor);
}

/** Teto da máscara: `999.999,99` (8 dígitos = centavos, últimos 2 são decimais). */
const MAX_DIGITOS_MOEDA_PLANO = 8;

/**
 * Máscara de digitação: apenas dígitos, interpretados como centavos (últimos 2 = decimais).
 * Máximo numérico: **R$ 999.999,99** (6 dígitos na parte inteira + 2 decimais, p.ex. `000.000,00` … `999.999,99`).
 */
export function normalizarValorMoedaInput(raw: string): string {
  const digits = stripEntradaPerigosaBasica(raw)
    .replace(/\D/g, "")
    .slice(0, MAX_DIGITOS_MOEDA_PLANO);
  if (digits === "") return "";
  const centavos = parseInt(digits, 10);
  return formatMoedaBRL(centavos / 100);
}

/** Meses por período (referência = N × mensal). */
export const MESES_TRIMESTRE = 3;
export const MESES_SEMESTRE = 6;
export const MESES_ANO = 12;

/** Descontos sugeridos ao ativar “Preços por período” (sobre o valor de referência N × mensal). */
export const DESCONTO_TRIMESTRAL_PADRAO = 10;
export const DESCONTO_SEMESTRAL_PADRAO = 20;
export const DESCONTO_ANUAL_PADRAO = 30;

export type PlanoFormEstado = {
  nome: string;
  remadasPorSemana: string;
  /** Plano ativo na listagem (só persistido ao editar). */
  planoAtivo: boolean;
  /** Cobrança mensal ofertada no plano (pode ser desativada se só houver períodos longos). */
  periodoMensalAtivo: boolean;
  /** Período de cobrança trimestral (ou superior) disponível no plano. */
  periodoTrimestralAtivo: boolean;
  periodoSemestralAtivo: boolean;
  periodoAnualAtivo: boolean;
  precoMensal: string;
  precoTrimestral: string;
  precoSemestral: string;
  precoAnual: string;
  /** Desconto do mensal fixo em 0% (referência). */
  pctMensal: string;
  /** Percentuais de desconto (0–100) sobre a referência (meses × mensal). */
  pctTrimestral: string;
  pctSemestral: string;
  pctAnual: string;
};

/** Validação / tooltip: não desativar o último período nem persistir sem oferta. */
export const MSG_PLANO_PRECISA_PERIODO_COBRANCA_ATIVO =
  "O plano precisa de pelo menos um período de cobrança ativo.";

export function contarPeriodosCobrancaAtivos(form: PlanoFormEstado): number {
  let n = 0;
  if (form.periodoMensalAtivo) n++;
  if (form.periodoTrimestralAtivo) n++;
  if (form.periodoSemestralAtivo) n++;
  if (form.periodoAnualAtivo) n++;
  return n;
}

export const PLANO_FORM_VAZIO: PlanoFormEstado = {
  nome: "",
  remadasPorSemana: "1",
  planoAtivo: true,
  periodoMensalAtivo: true,
  periodoTrimestralAtivo: true,
  periodoSemestralAtivo: true,
  periodoAnualAtivo: true,
  precoMensal: "",
  precoTrimestral: "",
  precoSemestral: "",
  precoAnual: "",
  pctMensal: "0,00",
  pctTrimestral: "",
  pctSemestral: "",
  pctAnual: "",
};

export function valorPrecoParaInput(v: number | null | undefined): string {
  if (v == null || Number.isNaN(Number(v))) return "";
  return formatMoedaBRL(Math.round(Number(v) * 100) / 100);
}

function formatarPercentDoisDecimais(p: number): string {
  const abs = Math.abs(p);
  return abs.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Desconto (0–100%) a partir do preço cobrado e da referência N × mensal. */
export function descontoPercentualDePreco(preco: number, referencia: number): number {
  if (referencia <= 0 || !Number.isFinite(preco)) return 0;
  const d = (1 - preco / referencia) * 100;
  return Math.min(100, Math.max(0, d));
}

function descontoStrDePrecoRef(preco: number | null | undefined, mensal: number, meses: number): string {
  if (preco == null || Number.isNaN(preco) || mensal <= 0) return "";
  const ref = mensal * meses;
  if (ref <= 0) return "";
  const d = descontoPercentualDePreco(preco, ref);
  return formatarPercentDoisDecimais(d);
}

/** Valor mensal equivalente para cálculo de % (mensal do plano ou inferido de outro período). */
export function valorMensalReferenciaDePlanoLinha(
  plano: Pick<
    PlanoLinha,
    "preco_mensal" | "preco_trimestral" | "preco_semestral" | "preco_anual"
  > & { equivalente_mensal?: number | null }
): number | null {
  const pm = plano.preco_mensal;
  if (pm != null && pm > 0) return pm;
  const eq = plano.equivalente_mensal;
  if (eq != null && eq > 0) return eq;
  if (plano.preco_trimestral != null && plano.preco_trimestral > 0) {
    return plano.preco_trimestral / MESES_TRIMESTRE;
  }
  if (plano.preco_semestral != null && plano.preco_semestral > 0) {
    return plano.preco_semestral / MESES_SEMESTRE;
  }
  if (plano.preco_anual != null && plano.preco_anual > 0) {
    return plano.preco_anual / MESES_ANO;
  }
  return null;
}

export function planoLinhaParaFormEstado(plano: PlanoLinha): PlanoFormEstado {
  const pm = plano.preco_mensal;
  const mensalOfertado = pm != null && pm > 0;
  const tri = plano.preco_trimestral != null;
  const sem = plano.preco_semestral != null;
  const anu = plano.preco_anual != null;
  const mRef = valorMensalReferenciaDePlanoLinha(plano) ?? 0;
  const precoMensalCampo =
    pm != null && pm > 0
      ? pm
      : plano.equivalente_mensal != null && plano.equivalente_mensal > 0
        ? plano.equivalente_mensal
        : null;
  return {
    nome: sanitizarNomePlanoDigitacao(String(plano.nome ?? "")),
    remadasPorSemana: String(plano.remadas_por_semana),
    planoAtivo: plano.status === "ativo",
    periodoMensalAtivo: mensalOfertado,
    periodoTrimestralAtivo: tri,
    periodoSemestralAtivo: sem,
    periodoAnualAtivo: anu,
    precoMensal: valorPrecoParaInput(precoMensalCampo),
    precoTrimestral: valorPrecoParaInput(plano.preco_trimestral),
    precoSemestral: valorPrecoParaInput(plano.preco_semestral),
    precoAnual: valorPrecoParaInput(plano.preco_anual),
    pctMensal: "0,00",
    pctTrimestral:
      tri && mRef > 0
        ? descontoStrDePrecoRef(plano.preco_trimestral, mRef, MESES_TRIMESTRE)
        : "",
    pctSemestral:
      sem && mRef > 0
        ? descontoStrDePrecoRef(plano.preco_semestral, mRef, MESES_SEMESTRE)
        : "",
    pctAnual:
      anu && mRef > 0 ? descontoStrDePrecoRef(plano.preco_anual, mRef, MESES_ANO) : "",
  };
}

/**
 * Valor mensal de referência no formulário: primeiro o valor digitado em “Preço mensal”
 * (mesmo com o período inativo — só deixa de ser ofertado aos alunos);
 * se vazio, inferido do menor período longo com preço preenchido.
 */
export function valorReferenciaMensal(form: PlanoFormEstado): number | null {
  const m = parseMoedaOpcional(form.precoMensal);
  if (m != null && m > 0) return m;
  if (form.periodoTrimestralAtivo) {
    const t = parseMoedaOpcional(form.precoTrimestral);
    if (t != null && t > 0) return t / MESES_TRIMESTRE;
  }
  if (form.periodoSemestralAtivo) {
    const s = parseMoedaOpcional(form.precoSemestral);
    if (s != null && s > 0) return s / MESES_SEMESTRE;
  }
  if (form.periodoAnualAtivo) {
    const a = parseMoedaOpcional(form.precoAnual);
    if (a != null && a > 0) return a / MESES_ANO;
  }
  return null;
}

/** Parse de moeda para cálculos; vazio ou inválido → null. */
export function parseMoedaOpcional(raw: string): number | null {
  const t = stripEntradaPerigosaBasica(raw).trim();
  if (t === "") return null;
  try {
    return parseDecimalCampo(raw, "Valor");
  } catch {
    return null;
  }
}

/** Últimos 5 dígitos = centésimos de ponto percentual (ex.: 1050 → 10,50%). */
export function normalizarPercentInput(raw: string): string {
  const t = stripEntradaPerigosaBasica(raw).trim();
  const neg = t.startsWith("-");
  const digits = t.replace(/-/g, "").replace(/\D/g, "").slice(0, 5);
  if (digits === "") return neg ? "-" : "";
  const n = parseInt(digits, 10);
  const v = n / 100;
  const absStr = v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return neg ? `-${absStr}` : absStr;
}

export function parsePercentToNumber(raw: string): number | null {
  const t = stripEntradaPerigosaBasica(raw).trim();
  if (t === "" || t === "-") return null;
  const neg = t.startsWith("-");
  let s = neg ? t.slice(1) : t;
  s = s.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (s === "" || s === ".") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

function clampDescontoParaPreco(d: number): number {
  if (!Number.isFinite(d)) return 0;
  return Math.min(100, Math.max(0, d));
}

/** Preço cobrado = referência × (1 − desconto/100). */
export function precoDesdeDescontoSobreRef(referencia: number, descontoPct: number): number {
  const d = clampDescontoParaPreco(descontoPct);
  const v = referencia * (1 - d / 100);
  return Math.min(Math.max(0, v), 999_999.99);
}

export function precoStrDesdeMensalDesconto(
  mensal: number,
  meses: number,
  descontoStr: string
): string {
  const ref = mensal * meses;
  if (ref <= 0) return "";
  const d = parsePercentToNumber(descontoStr);
  if (d == null) return "";
  const valor = precoDesdeDescontoSobreRef(ref, d);
  return formatMoedaBRL(Math.round(valor * 100) / 100);
}

function aoAtivarPeriodo(
  next: PlanoFormEstado,
  prevAtivo: boolean,
  patchAtivo: boolean | undefined,
  meses: number,
  pctK: "pctTrimestral" | "pctSemestral" | "pctAnual",
  precoK: "precoTrimestral" | "precoSemestral" | "precoAnual",
  descontoPadrao: number
): void {
  if (patchAtivo !== true || prevAtivo) return;
  if (!next[pctK]?.trim()) {
    next[pctK] = formatarPercentDoisDecimais(descontoPadrao);
  }
  const ref = valorReferenciaMensal(next);
  if (ref == null || ref <= 0) return;
  next[precoK] = precoStrDesdeMensalDesconto(ref, meses, next[pctK]);
}

function atualizarDescontoDesdePreco(
  n: PlanoFormEstado,
  meses: number,
  precoK: "precoTrimestral" | "precoSemestral" | "precoAnual",
  pctK: "pctTrimestral" | "pctSemestral" | "pctAnual"
): void {
  const refM = valorReferenciaMensal(n);
  if (refM == null || refM <= 0) {
    n[pctK] = "";
    return;
  }
  const ref = refM * meses;
  const preco = parseMoedaOpcional(n[precoK]);
  if (preco == null) {
    n[pctK] = "";
    return;
  }
  const d = descontoPercentualDePreco(preco, ref);
  n[pctK] = formatarPercentDoisDecimais(d);
}

function atualizarPrecoDesdeDesconto(
  n: PlanoFormEstado,
  meses: number,
  precoK: "precoTrimestral" | "precoSemestral" | "precoAnual",
  pctK: "pctTrimestral" | "pctSemestral" | "pctAnual"
): void {
  const refM = valorReferenciaMensal(n);
  if (refM == null || refM <= 0) {
    n[precoK] = "";
    return;
  }
  n[precoK] = precoStrDesdeMensalDesconto(refM, meses, n[pctK]);
}

/**
 * Recalcula o % do período longo face ao mensal atual, **sem apagar** o % quando a referência
 * ou o preço ainda não são válidos (ex.: meio da digitação no mensal).
 */
function sincronizarPctLongoAposMudancaMensal(
  n: PlanoFormEstado,
  meses: number,
  precoK: "precoTrimestral" | "precoSemestral" | "precoAnual",
  pctK: "pctTrimestral" | "pctSemestral" | "pctAnual"
): void {
  const refM = valorReferenciaMensal(n);
  if (refM == null || refM <= 0) {
    return;
  }
  const refPeriodo = refM * meses;
  if (refPeriodo <= 0) {
    return;
  }
  const preco = parseMoedaOpcional(n[precoK]);
  if (preco == null) {
    return;
  }
  const d = descontoPercentualDePreco(preco, refPeriodo);
  n[pctK] = formatarPercentDoisDecimais(d);
}

/**
 * Quando o preço ou desconto **mensal** mudam: mantém os preços dos períodos longos e
 * recalcula só o % de desconto de cada um face à nova referência (mensal × meses).
 */
function atualizarApenasPctPeriodosLongosDesdeMensal(n: PlanoFormEstado): void {
  const refM = valorReferenciaMensal(n);
  if (refM == null || refM <= 0) {
    return;
  }
  if (n.periodoTrimestralAtivo) {
    sincronizarPctLongoAposMudancaMensal(n, MESES_TRIMESTRE, "precoTrimestral", "pctTrimestral");
  }
  if (n.periodoSemestralAtivo) {
    sincronizarPctLongoAposMudancaMensal(n, MESES_SEMESTRE, "precoSemestral", "pctSemestral");
  }
  if (n.periodoAnualAtivo) {
    sincronizarPctLongoAposMudancaMensal(n, MESES_ANO, "precoAnual", "pctAnual");
  }
}

export type ReduzirPlanoFormOpcoes = {
  /**
   * Preço por aula (configurações do estúdio).
   * Omitir a propriedade enquanto a config não carregou — não altera o % mensal.
   */
  precoPorAula?: number | null;
};

type ResolucaoPrecoPorAula = "omitido" | "sem_config" | number;

function resolverPrecoPorAulaParaForm(opts?: ReduzirPlanoFormOpcoes): ResolucaoPrecoPorAula {
  if (opts == null || !("precoPorAula" in opts)) return "omitido";
  const v = opts.precoPorAula;
  if (v == null || v <= 0) return "sem_config";
  return v;
}

/** Mantém % mensal e preço mensal alinhados à referência (preço/aula × aulas × semanas). */
function aplicarSincronizacaoMensalDesconto(
  next: PlanoFormEstado,
  patch: Partial<PlanoFormEstado>,
  opts?: ReduzirPlanoFormOpcoes
): void {
  const cfg = resolverPrecoPorAulaParaForm(opts);
  if (cfg === "omitido") {
    return;
  }
  if (cfg === "sem_config") {
    next.pctMensal = "0,00";
    return;
  }
  const rps = Number(next.remadasPorSemana);
  if (!Number.isInteger(rps) || rps < 1 || rps > 7) {
    next.pctMensal = "0,00";
    return;
  }
  const refMes = referenciaMensalPrecoAula(cfg, rps);
  if (refMes <= 0) {
    next.pctMensal = "0,00";
    return;
  }

  if (patch.pctMensal !== undefined) {
    const d = parsePercentToNumber(next.pctMensal);
    if (d == null) return;
    const v = precoDesdeDescontoSobreRef(refMes, d);
    next.precoMensal = valorPrecoParaInput(v);
    return;
  }

  if (
    patch.precoMensal !== undefined ||
    patch.remadasPorSemana !== undefined ||
    patch.periodoMensalAtivo !== undefined
  ) {
    const preco = parseMoedaOpcional(next.precoMensal);
    if (preco == null || preco <= 0) {
      next.pctMensal = "";
      return;
    }
    next.pctMensal = formatarPercentDoisDecimais(
      descontoPercentualDePreco(preco, refMes)
    );
  }
}

function finalizarSincronizacaoMensalEPeriodosLongos(
  next: PlanoFormEstado,
  patch: Partial<PlanoFormEstado>,
  opts?: ReduzirPlanoFormOpcoes
): void {
  aplicarSincronizacaoMensalDesconto(next, patch, opts);
  const mensalAlterou =
    patch.precoMensal !== undefined ||
    patch.periodoMensalAtivo !== undefined ||
    patch.pctMensal !== undefined;
  if (mensalAlterou && patch.periodoMensalAtivo !== false) {
    atualizarApenasPctPeriodosLongosDesdeMensal(next);
  }
}

/**
 * Atualiza o estado do formulário e mantém desconto % e preço alinhados.
 * Ao alterar o mensal, nos períodos longos mantêm-se os preços e atualizam-se só os %;
 * o preço de cada período longo só muda quando o utilizador altera o desconto desse período.
 */
export function reduzirPlanoForm(
  prev: PlanoFormEstado,
  patch: Partial<PlanoFormEstado>,
  opts?: ReduzirPlanoFormOpcoes
): PlanoFormEstado {
  const next: PlanoFormEstado = { ...prev, ...patch };

  if (patch.nome !== undefined) {
    next.nome = sanitizarNomePlanoDigitacao(patch.nome);
  }
  if (patch.remadasPorSemana !== undefined) {
    next.remadasPorSemana = sanitizarRemadasPorSemana(patch.remadasPorSemana);
  }

  if (patch.periodoMensalAtivo === true && !prev.periodoMensalAtivo) {
    const infer = valorReferenciaMensal({ ...next, periodoMensalAtivo: false });
    if (infer != null && infer > 0) {
      const atual = parseMoedaOpcional(next.precoMensal);
      if (atual == null || atual <= 0) {
        next.precoMensal = valorPrecoParaInput(infer);
      }
    }
  }

  if (patch.periodoTrimestralAtivo === false) {
    next.precoTrimestral = "";
    next.pctTrimestral = "";
  }
  if (patch.periodoSemestralAtivo === false) {
    next.precoSemestral = "";
    next.pctSemestral = "";
  }
  if (patch.periodoAnualAtivo === false) {
    next.precoAnual = "";
    next.pctAnual = "";
  }

  aoAtivarPeriodo(
    next,
    prev.periodoTrimestralAtivo,
    patch.periodoTrimestralAtivo,
    MESES_TRIMESTRE,
    "pctTrimestral",
    "precoTrimestral",
    DESCONTO_TRIMESTRAL_PADRAO
  );
  aoAtivarPeriodo(
    next,
    prev.periodoSemestralAtivo,
    patch.periodoSemestralAtivo,
    MESES_SEMESTRE,
    "pctSemestral",
    "precoSemestral",
    DESCONTO_SEMESTRAL_PADRAO
  );
  aoAtivarPeriodo(
    next,
    prev.periodoAnualAtivo,
    patch.periodoAnualAtivo,
    MESES_ANO,
    "pctAnual",
    "precoAnual",
    DESCONTO_ANUAL_PADRAO
  );

  if (patch.precoMensal !== undefined || patch.periodoMensalAtivo !== undefined) {
    finalizarSincronizacaoMensalEPeriodosLongos(next, patch, opts);
    return next;
  }

  if (patch.precoTrimestral !== undefined && next.periodoTrimestralAtivo) {
    atualizarDescontoDesdePreco(next, MESES_TRIMESTRE, "precoTrimestral", "pctTrimestral");
  } else if (patch.pctTrimestral !== undefined && next.periodoTrimestralAtivo) {
    atualizarPrecoDesdeDesconto(next, MESES_TRIMESTRE, "precoTrimestral", "pctTrimestral");
  }

  if (patch.precoSemestral !== undefined && next.periodoSemestralAtivo) {
    atualizarDescontoDesdePreco(next, MESES_SEMESTRE, "precoSemestral", "pctSemestral");
  } else if (patch.pctSemestral !== undefined && next.periodoSemestralAtivo) {
    atualizarPrecoDesdeDesconto(next, MESES_SEMESTRE, "precoSemestral", "pctSemestral");
  }

  if (patch.precoAnual !== undefined && next.periodoAnualAtivo) {
    atualizarDescontoDesdePreco(next, MESES_ANO, "precoAnual", "pctAnual");
  } else if (patch.pctAnual !== undefined && next.periodoAnualAtivo) {
    atualizarPrecoDesdeDesconto(next, MESES_ANO, "precoAnual", "pctAnual");
  }

  finalizarSincronizacaoMensalEPeriodosLongos(next, patch, opts);
  return next;
}

export function parseDecimalCampo(raw: string, rotulo: string): number {
  let s = stripEntradaPerigosaBasica(raw)
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/R\$\s*/gi, "")
    .trim()
    .replace(/\s/g, "");
  s = s.replace(/\./g, "").replace(",", ".");
  if (s === "" || s === ".") throw new Error(`${rotulo} é obrigatório.`);
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${rotulo} inválido.`);
  return Math.round(n * 100) / 100;
}

/** Monta os preços persistidos (null = período inativo / sem oferta). */
export function montarPrecosPlanoParaPersistir(form: PlanoFormEstado): {
  preco_mensal: number | null;
  preco_trimestral: number | null;
  preco_semestral: number | null;
  preco_anual: number | null;
  /** Coluna `valor`: referência mensal (sempre que haja ao menos um período válido). */
  valor_equivalente_mensal: number;
} {
  let preco_mensal: number | null = null;
  if (form.periodoMensalAtivo) {
    const pm = parseDecimalCampo(form.precoMensal, "Preço mensal");
    if (pm <= 0) throw new Error("O valor mensal deve ser maior que zero.");
    preco_mensal = pm;
  }

  const preco_trimestral = form.periodoTrimestralAtivo
    ? parseDecimalCampo(form.precoTrimestral, "Preço trimestral")
    : null;
  const preco_semestral = form.periodoSemestralAtivo
    ? parseDecimalCampo(form.precoSemestral, "Preço semestral")
    : null;
  const preco_anual = form.periodoAnualAtivo
    ? parseDecimalCampo(form.precoAnual, "Preço anual")
    : null;

  const temAlgum =
    (preco_mensal != null && preco_mensal > 0) ||
    (preco_trimestral != null && preco_trimestral > 0) ||
    (preco_semestral != null && preco_semestral > 0) ||
    (preco_anual != null && preco_anual > 0);
  if (!temAlgum) {
    throw new Error(MSG_PLANO_PRECISA_PERIODO_COBRANCA_ATIVO);
  }

  const refInferida = valorReferenciaMensal(form);
  if (refInferida == null || refInferida <= 0) {
    throw new Error(
      "Defina o preço mensal de referência ou preencha um período longo com valor válido."
    );
  }
  const valor_equivalente_mensal = arredondarMoeda(
    preco_mensal != null && preco_mensal > 0 ? preco_mensal : refInferida
  );

  return {
    preco_mensal,
    preco_trimestral,
    preco_semestral,
    preco_anual,
    valor_equivalente_mensal,
  };
}

function arredondarMoeda(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Preços enviados ao servidor quando o utilizador não ativa “Preços por período”. */
export function precosPeriodoPadraoDesdeMensal(preco_mensal: number): {
  preco_trimestral: number;
  preco_semestral: number;
  preco_anual: number;
} {
  const m = arredondarMoeda(preco_mensal);
  return {
    preco_trimestral: arredondarMoeda(m * MESES_TRIMESTRE * (1 - DESCONTO_TRIMESTRAL_PADRAO / 100)),
    preco_semestral: arredondarMoeda(m * MESES_SEMESTRE * (1 - DESCONTO_SEMESTRAL_PADRAO / 100)),
    preco_anual: arredondarMoeda(m * MESES_ANO * (1 - DESCONTO_ANUAL_PADRAO / 100)),
  };
}
