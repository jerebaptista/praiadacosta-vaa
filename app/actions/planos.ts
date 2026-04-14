"use server";

import { revalidatePath } from "next/cache";
import { useDataMock } from "@/lib/data-mock";
import {
  mockApagarPlano,
  mockAlterarStatusPlano,
  mockAtualizarPlano,
  mockCriarPlano,
  mockListarAlunosAtivosPlano,
  mockListarPlanos,
} from "@/lib/mock-data/server";
import { enriquecerPlanosComAlunos } from "@/lib/planos-enriquecimento";
import type { PlanoSemAlunosAgregados } from "@/lib/planos-enriquecimento";
import {
  LIMITE_PLANOS_TOTAL,
  MSG_LIMITE_PLANOS_TOTAL_CRIAR,
  MSG_NAO_PODE_REMOVER_PLANO_COM_ALUNOS_ATIVOS,
  type AlunoAtivoPlanoLinha,
  type PlanoLinha,
  type PlanoStatus,
} from "@/lib/planos-tipos";
import { createClient } from "@/lib/supabase/server";
import { NOME_PLANO_MAX_LEN } from "@/lib/input-sanitize";
import { MSG_PLANO_PRECISA_PERIODO_COBRANCA_ATIVO } from "@/lib/plano-form";
import {
  existeOutroPlanoComMesmoNome,
  MSG_NOME_PLANO_DUPLICADO,
} from "@/lib/planos-nome";
import { statusPagamentoApartirDeVencimento } from "@/lib/planos-aluno-pagamento";
import {
  periodoContratoParaAluno,
  rotuloPeriodoContrato,
  vencimentoAposInicio,
} from "@/lib/planos-aluno-vigencia";
import { formatPostgrestError } from "@/lib/supabase-error";

function normalizarPlanoStatus(raw: unknown): PlanoStatus {
  const s = String(raw ?? "ativo").toLowerCase();
  return s === "inativo" ? "inativo" : "ativo";
}

function arredondarMoeda(n: number): number {
  return Math.round(n * 100) / 100;
}

const MESES_TRI = 3;
const MESES_SEM = 6;
const MESES_ANO = 12;

/** Coluna legada `valor`: referência mensal (oferta mensal ou valor explícito quando o mensal não é ofertado). */
function valorLegadoPlano(input: {
  preco_mensal: number | null;
  preco_trimestral: number | null;
  preco_semestral: number | null;
  preco_anual: number | null;
  valor_equivalente_mensal: number;
}): number {
  if (input.preco_mensal != null && input.preco_mensal > 0) {
    return input.preco_mensal;
  }
  if (input.valor_equivalente_mensal > 0) {
    return arredondarMoeda(input.valor_equivalente_mensal);
  }
  if (input.preco_trimestral != null && input.preco_trimestral > 0) {
    return arredondarMoeda(input.preco_trimestral / MESES_TRI);
  }
  if (input.preco_semestral != null && input.preco_semestral > 0) {
    return arredondarMoeda(input.preco_semestral / MESES_SEM);
  }
  if (input.preco_anual != null && input.preco_anual > 0) {
    return arredondarMoeda(input.preco_anual / MESES_ANO);
  }
  return 0;
}

function parsePrecoObrigatorio(v: unknown, rotulo: string): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${rotulo} inválido.`);
  }
  return arredondarMoeda(n);
}

export type CriarPlanoInput = {
  nome: string;
  remadas_por_semana: number;
  /** Null = período mensal não ofertado. */
  preco_mensal: number | null;
  preco_trimestral: number | null;
  preco_semestral: number | null;
  preco_anual: number | null;
  /** Referência mensal (coluna `valor`); obrigatório junto com os preços. */
  valor_equivalente_mensal: number;
};

export type AtualizarPlanoInput = CriarPlanoInput & {
  status: PlanoStatus;
};

function parsePrecoRecorrenciaOpcional(
  v: unknown,
  rotulo: string
): number | null {
  if (v === null || v === undefined) return null;
  return parsePrecoObrigatorio(v, rotulo);
}

function validarPayloadPlano(input: CriarPlanoInput): {
  nome: string;
  remadas_por_semana: number;
  preco_mensal: number | null;
  preco_trimestral: number | null;
  preco_semestral: number | null;
  preco_anual: number | null;
  valor_equivalente_mensal: number;
} {
  const nome = input.nome?.trim() ?? "";
  if (!nome) throw new Error("O nome é obrigatório.");
  if (nome.length > NOME_PLANO_MAX_LEN) {
    throw new Error(`O nome deve ter no máximo ${NOME_PLANO_MAX_LEN} caracteres.`);
  }

  const rps = Number(input.remadas_por_semana);
  if (!Number.isInteger(rps) || rps < 1 || rps > 7) {
    throw new Error("As aulas por semana devem ser entre 1 e 7.");
  }

  let preco_mensal: number | null = null;
  if (input.preco_mensal != null) {
    const pm = parsePrecoObrigatorio(input.preco_mensal, "Valor mensal");
    if (pm <= 0) {
      throw new Error("O valor mensal deve ser maior que zero.");
    }
    preco_mensal = pm;
  }

  const preco_trimestral = parsePrecoRecorrenciaOpcional(
    input.preco_trimestral,
    "Valor trimestral"
  );
  const preco_semestral = parsePrecoRecorrenciaOpcional(
    input.preco_semestral,
    "Valor semestral"
  );
  const preco_anual = parsePrecoRecorrenciaOpcional(input.preco_anual, "Valor anual");

  const valor_equivalente_mensal = parsePrecoObrigatorio(
    input.valor_equivalente_mensal,
    "Referência mensal"
  );
  if (valor_equivalente_mensal <= 0) {
    throw new Error("A referência mensal deve ser maior que zero.");
  }

  const temAlgum =
    (preco_mensal != null && preco_mensal > 0) ||
    (preco_trimestral != null && preco_trimestral > 0) ||
    (preco_semestral != null && preco_semestral > 0) ||
    (preco_anual != null && preco_anual > 0);
  if (!temAlgum) {
    throw new Error(MSG_PLANO_PRECISA_PERIODO_COBRANCA_ATIVO);
  }

  if (
    preco_mensal != null &&
    preco_mensal > 0 &&
    Math.abs(valor_equivalente_mensal - preco_mensal) > 0.02
  ) {
    throw new Error("A referência mensal deve coincidir com o preço mensal ofertado.");
  }

  return {
    nome,
    remadas_por_semana: rps,
    preco_mensal,
    preco_trimestral,
    preco_semestral,
    preco_anual,
    valor_equivalente_mensal,
  };
}

function validarAtualizarPlano(input: AtualizarPlanoInput): {
  nome: string;
  remadas_por_semana: number;
  preco_mensal: number | null;
  preco_trimestral: number | null;
  preco_semestral: number | null;
  preco_anual: number | null;
  valor_equivalente_mensal: number;
  status: PlanoStatus;
} {
  const { status: statusRaw, ...precos } = input;
  const base = validarPayloadPlano(precos);
  const status: PlanoStatus =
    statusRaw === "inativo" ? "inativo" : "ativo";
  return { ...base, status };
}

export async function criarPlano(input: CriarPlanoInput): Promise<{ id: string }> {
  const v = validarPayloadPlano(input);

  if (useDataMock()) {
    const { id } = mockCriarPlano(v);
    revalidatePath("/admin/planos");
    revalidatePath("/alunos");
    return { id };
  }

  const supabase = await createClient();
  const { count: totalGeral, error: errTotalGeral } = await supabase
    .from("planos")
    .select("id", { count: "exact", head: true });
  if (errTotalGeral) throw new Error(formatPostgrestError(errTotalGeral));
  if ((totalGeral ?? 0) >= LIMITE_PLANOS_TOTAL) {
    throw new Error(MSG_LIMITE_PLANOS_TOTAL_CRIAR);
  }

  const { data: nomesRows, error: errNomes } = await supabase
    .from("planos")
    .select("id, nome");
  if (errNomes) throw new Error(formatPostgrestError(errNomes));
  if (
    existeOutroPlanoComMesmoNome(
      (nomesRows ?? []).map((r) => {
        const row = r as Record<string, unknown>;
        return { id: String(row.id), nome: String(row.nome ?? "") };
      }),
      v.nome
    )
  ) {
    throw new Error(MSG_NOME_PLANO_DUPLICADO);
  }

  const payload: Record<string, unknown> = {
    nome: v.nome,
    remadas_por_semana: v.remadas_por_semana,
    preco_mensal: v.preco_mensal,
    preco_trimestral: v.preco_trimestral,
    preco_semestral: v.preco_semestral,
    preco_anual: v.preco_anual,
    status: "ativo",
    valor: valorLegadoPlano(v),
    frequencia_semanal: v.remadas_por_semana,
  };

  const { data, error } = await supabase
    .from("planos")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(formatPostgrestError(error));

  revalidatePath("/admin/planos");
  revalidatePath("/alunos");
  return { id: String(data.id) };
}

export async function atualizarPlano(id: string, input: AtualizarPlanoInput): Promise<void> {
  const pid = id?.trim();
  if (!pid) throw new Error("Plano inválido.");
  const v = validarAtualizarPlano(input);

  if (useDataMock()) {
    mockAtualizarPlano(pid, v);
    revalidatePath("/admin/planos");
    revalidatePath("/alunos");
    return;
  }

  const supabase = await createClient();

  const { data: nomesAtual, error: errNomes } = await supabase
    .from("planos")
    .select("id, nome");
  if (errNomes) throw new Error(formatPostgrestError(errNomes));
  if (
    existeOutroPlanoComMesmoNome(
      (nomesAtual ?? []).map((r) => {
        const row = r as Record<string, unknown>;
        return { id: String(row.id), nome: String(row.nome ?? "") };
      }),
      v.nome,
      pid
    )
  ) {
    throw new Error(MSG_NOME_PLANO_DUPLICADO);
  }

  const { error } = await supabase
    .from("planos")
    .update({
      nome: v.nome,
      remadas_por_semana: v.remadas_por_semana,
      preco_mensal: v.preco_mensal,
      preco_trimestral: v.preco_trimestral,
      preco_semestral: v.preco_semestral,
      preco_anual: v.preco_anual,
      status: v.status,
      valor: valorLegadoPlano(v),
      frequencia_semanal: v.remadas_por_semana,
    })
    .eq("id", pid);

  if (error) throw new Error(formatPostgrestError(error));

  revalidatePath("/admin/planos");
  revalidatePath("/alunos");
}

export async function listarAlunosAtivosDoPlano(
  planoId: string
): Promise<AlunoAtivoPlanoLinha[]> {
  const pid = planoId?.trim();
  if (!pid) throw new Error("Plano inválido.");

  if (useDataMock()) return mockListarAlunosAtivosPlano(pid);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("alunos")
    .select("id, nome, avatar_url, data_inicio, criado_em")
    .eq("plano_id", pid)
    .eq("status", "ativo");

  if (error) throw new Error(formatPostgrestError(error));

  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>;
    let desde = "";
    if (row.data_inicio != null && String(row.data_inicio).trim() !== "") {
      desde = String(row.data_inicio).slice(0, 10);
    } else if (row.criado_em != null && String(row.criado_em).trim() !== "") {
      desde = String(row.criado_em).slice(0, 10);
    } else {
      desde = new Date().toISOString().slice(0, 10);
    }
    const idStr = String(row.id);
    const p = periodoContratoParaAluno(idStr);
    const vencimento = vencimentoAposInicio(desde, p);
    return {
      id: idStr,
      nome: String(row.nome ?? ""),
      avatar_url: row.avatar_url != null ? String(row.avatar_url) : null,
      desde,
      periodo: rotuloPeriodoContrato(p),
      vencimento,
      pagamento: statusPagamentoApartirDeVencimento(vencimento),
    };
  });
}

function parsePrecoLinhaNullable(v: unknown): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return arredondarMoeda(n);
}

function rowParaPlanoSemAlunos(row: Record<string, unknown>): PlanoSemAlunosAgregados {
  const rps = row.remadas_por_semana ?? row.frequencia_semanal;
  const pm = parsePrecoLinhaNullable(row.preco_mensal);
  const eq = parsePrecoLinhaNullable(row.valor);
  return {
    id: String(row.id),
    nome: String(row.nome ?? ""),
    status: normalizarPlanoStatus(row.status),
    remadas_por_semana:
      rps != null && String(rps).trim() !== "" ? Number(rps) : 1,
    preco_mensal: pm,
    equivalente_mensal:
      pm != null && pm > 0
        ? null
        : eq != null && eq > 0
          ? eq
          : null,
    preco_trimestral:
      row.preco_trimestral != null && String(row.preco_trimestral).trim() !== ""
        ? Number(row.preco_trimestral)
        : null,
    preco_semestral:
      row.preco_semestral != null && String(row.preco_semestral).trim() !== ""
        ? Number(row.preco_semestral)
        : null,
    preco_anual:
      row.preco_anual != null && String(row.preco_anual).trim() !== ""
        ? Number(row.preco_anual)
        : null,
  };
}

export async function listarPlanos(): Promise<PlanoLinha[]> {
  if (useDataMock()) return mockListarPlanos();

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("planos")
      .select("*")
      .order("nome");

    if (error) {
      if ((error as { code?: string }).code === "42P01") return [];
      throw new Error(formatPostgrestError(error));
    }

    const planos = (data ?? []).map((r) =>
      rowParaPlanoSemAlunos(r as Record<string, unknown>)
    );

    const { data: alunosRows, error: errAlunos } = await supabase
      .from("alunos")
      .select("id, nome, avatar_url, plano_id, status");

    if (errAlunos) {
      console.warn("[planos] Alunos não carregados:", errAlunos.message);
      return enriquecerPlanosComAlunos(planos, []);
    }

    const alunos = (alunosRows ?? []).map((a) => {
      const row = a as Record<string, unknown>;
      return {
        id: String(row.id),
        nome: String(row.nome ?? ""),
        avatar_url:
          row.avatar_url != null ? String(row.avatar_url) : null,
        plano_id:
          row.plano_id != null && String(row.plano_id).trim() !== ""
            ? String(row.plano_id)
            : null,
        status: row.status != null ? String(row.status) : "ativo",
      };
    });

    return enriquecerPlanosComAlunos(planos, alunos);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isRede =
      msg.includes("fetch failed") ||
      msg.includes("ECONNRESET") ||
      msg.includes("ConnectTimeout") ||
      msg.includes("UND_ERR");
    if (isRede) {
      console.warn("[planos] Sem ligação ao Supabase — a devolver lista vazia.");
      return [];
    }
    throw e;
  }
}

export async function alterarStatusPlano(id: string, status: PlanoStatus): Promise<void> {
  const pid = id?.trim();
  if (!pid) throw new Error("Plano inválido.");
  if (status !== "ativo" && status !== "inativo")
    throw new Error("Status inválido.");

  if (useDataMock()) {
    mockAlterarStatusPlano(pid, status);
    revalidatePath("/admin/planos");
    revalidatePath("/alunos");
    return;
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("planos")
    .update({ status })
    .eq("id", pid);

  if (error) throw new Error(formatPostgrestError(error));
  revalidatePath("/admin/planos");
  revalidatePath("/alunos");
}

export async function apagarPlano(id: string): Promise<void> {
  const pid = id?.trim();
  if (!pid) throw new Error("Plano inválido.");

  if (useDataMock()) {
    mockApagarPlano(pid);
    revalidatePath("/admin/planos");
    revalidatePath("/alunos");
    return;
  }

  const supabase = await createClient();

  const { count: ativosNoPlano, error: errAtivos } = await supabase
    .from("alunos")
    .select("id", { count: "exact", head: true })
    .eq("plano_id", pid)
    .eq("status", "ativo");
  if (errAtivos) throw new Error(formatPostgrestError(errAtivos));
  if ((ativosNoPlano ?? 0) > 0) {
    throw new Error(MSG_NAO_PODE_REMOVER_PLANO_COM_ALUNOS_ATIVOS);
  }

  const { error: e1 } = await supabase
    .from("alunos")
    .update({ plano_id: null })
    .eq("plano_id", pid);
  if (e1) throw new Error(formatPostgrestError(e1));

  const { error: e2 } = await supabase.from("planos").delete().eq("id", pid);
  if (e2) throw new Error(formatPostgrestError(e2));

  revalidatePath("/admin/planos");
  revalidatePath("/alunos");
}
