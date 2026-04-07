"use server";

import { revalidatePath } from "next/cache";
import { useDataMock } from "@/lib/data-mock";
import {
  mockAlterarStatusAluno,
  mockApagarAluno,
  mockAtualizarAluno,
  mockBuscarAlunoFormData,
  mockBuscarAlunoPerfil,
  mockCriarAluno,
} from "@/lib/mock-data/server";
import { createClient } from "@/lib/supabase/server";
import { formatPostgrestError } from "@/lib/supabase-error";
import { fetchCreditosDoAluno } from "@/lib/fetch-creditos-aluno";
import { saldoCreditosAula } from "@/lib/creditos-aula-saldo";
import { saldoCreditos } from "@/lib/creditos-saldo";
import { creditoSortTime, linhasParaSaldo } from "@/lib/creditos-normalize";
import {
  futurasRemadasAluno,
  proximaRemadaExibicao,
  turmaResumoDeRemadas,
} from "@/lib/aluno-perfil-plano";
import { mesAtualPrimeiroDia } from "@/lib/dates";
import {
  formatarCpfExibicao,
  montarEnderecoUmaLinha,
} from "@/lib/aluno-perfil-exibicao";
import {
  alunoCriadoEmIso,
  rowToAlunoFormData,
  type AlunoFormData,
} from "@/lib/alunos-form-data";

/** `yyyy-mm-dd` — início como cliente (`data_inicio`) ou data de cadastro. */
function clienteDesdeIso(row: Record<string, unknown>): string | null {
  const di = row.data_inicio;
  if (di != null && String(di).trim() !== "") {
    return String(di).slice(0, 10);
  }
  const cad = alunoCriadoEmIso(row);
  return cad ? cad.slice(0, 10) : null;
}

export type AlunoPerfil = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  cpf: string | null;
  endereco_linha: string | null;
  plano_nome: string | null;
  plano_remadas_semana: number | null;
  turma_resumo: string | null;
  proxima_remada: { data: string; horario: string } | null;
  avatar_url: string | null;
  status: string;
  criado_em: string | null;
  pagamento: { status: "pago" | "pendente"; pago_em: string | null } | null;
  /** `yyyy-mm-dd` — exibir “Desde: …” no perfil */
  cliente_desde: string | null;
  /** Exibido como “Remadas extras”; saldo em `creditos` / `creditos_aula`. */
  creditos_extras_disponiveis: number;
  creditos_extras_erro: boolean;
  mes: string;
};

export async function buscarAlunoPerfil(id: string): Promise<AlunoPerfil | null> {
  if (useDataMock()) return mockBuscarAlunoPerfil(id);

  const supabase = await createClient();
  const mes = mesAtualPrimeiroDia();

  const { data: aluno, error: errAluno } = await supabase
    .from("alunos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (errAluno || !aluno) return null;

  const alunoRow = aluno as Record<string, unknown>;

  let plano_nome: string | null = null;
  let plano_remadas_semana: number | null = null;
  const pid = alunoRow.plano_id;
  if (pid != null && String(pid).trim() !== "") {
    const { data: planoRow } = await supabase
      .from("planos")
      .select("*")
      .eq("id", String(pid))
      .maybeSingle();
    if (planoRow) {
      const pr = planoRow as Record<string, unknown>;
      plano_nome = pr.nome != null ? String(pr.nome) : null;
      const rps = pr.remadas_por_semana ?? pr.frequencia_semanal;
      plano_remadas_semana =
        rps != null && String(rps).trim() !== "" ? Number(rps) : null;
      if (plano_remadas_semana != null && Number.isNaN(plano_remadas_semana)) {
        plano_remadas_semana = null;
      }
    }
  }

  const { data: pagamentoMes } = await supabase
    .from("pagamentos_mensais")
    .select("status, pago_em")
    .eq("aluno_id", id)
    .eq("mes", mes)
    .maybeSingle();

  type AgRow = { id: string; remada_id: string; status: string; criado_em: string | null; remadas?: unknown };
  const agRes = await supabase
    .from("agendamentos")
    .select("id, remada_id, status, criado_em, remadas(*)")
    .eq("aluno_id", id)
    .order("criado_em", { ascending: false, nullsFirst: false });

  const remadaMap = new Map<string, Record<string, unknown>>();
  let agRows: AgRow[] = [];

  if (!agRes.error && agRes.data) {
    agRows = agRes.data as AgRow[];
  } else {
    const plain = await supabase
      .from("agendamentos")
      .select("id, remada_id, status, criado_em")
      .eq("aluno_id", id)
      .order("criado_em", { ascending: false, nullsFirst: false });
    agRows = (plain.data ?? []) as AgRow[];
    const ids = [...new Set(agRows.map((a) => String(a.remada_id)).filter(Boolean))];
    if (ids.length) {
      const { data: rems } = await supabase.from("remadas").select("*").in("id", ids);
      rems?.forEach((r) => remadaMap.set(String(r.id), r as Record<string, unknown>));
    }
  }

  const futuras = futurasRemadasAluno(agRows, remadaMap);
  const turma_resumo = turmaResumoDeRemadas(futuras);
  const proxima_remada = proximaRemadaExibicao(futuras);

  const { rows: creditosRaw, erro: creditosErroObj, fonte } =
    await fetchCreditosDoAluno(supabase, id);
  const creditosList = [...creditosRaw].sort(
    (a, b) => creditoSortTime(b) - creditoSortTime(a)
  );
  const saldoCreditosLinha =
    fonte === "creditos_aula"
      ? saldoCreditosAula(creditosList)
      : saldoCreditos(linhasParaSaldo(creditosList));

  const cpfRaw =
    alunoRow.cpf != null && String(alunoRow.cpf).trim() !== ""
      ? String(alunoRow.cpf)
      : null;

  return {
    id: String(aluno.id),
    nome: String(aluno.nome ?? ""),
    email: aluno.email ? String(aluno.email) : null,
    telefone: aluno.telefone ? String(aluno.telefone) : null,
    data_nascimento: aluno.data_nascimento ? String(aluno.data_nascimento) : null,
    cpf: formatarCpfExibicao(cpfRaw),
    endereco_linha: montarEnderecoUmaLinha(alunoRow),
    plano_nome,
    plano_remadas_semana,
    turma_resumo,
    proxima_remada,
    avatar_url:
      alunoRow.avatar_url != null && String(alunoRow.avatar_url).trim() !== ""
        ? String(alunoRow.avatar_url)
        : null,
    status: String(aluno.status ?? "ativo"),
    criado_em: alunoCriadoEmIso(alunoRow),
    pagamento: pagamentoMes
      ? { status: pagamentoMes.status as "pago" | "pendente", pago_em: pagamentoMes.pago_em ?? null }
      : null,
    cliente_desde: clienteDesdeIso(alunoRow),
    creditos_extras_disponiveis:
      creditosErroObj !== null ? 0 : saldoCreditosLinha.disponiveis,
    creditos_extras_erro: creditosErroObj !== null,
    mes,
  };
}

export type AlunoStatus = "ativo" | "pendente" | "inativo" | "cancelado";

export type CriarAlunoInput = {
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  data_nascimento?: string;
  sexo?: "masculino" | "feminino";
  cep?: string;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  numero?: string;
  complemento?: string;
  plano_id?: string;
  turmas_ids?: string[];
  avatar_url?: string;
};

export async function criarAluno(input: CriarAlunoInput) {
  if (useDataMock()) {
    const { id } = mockCriarAluno(input);
    revalidatePath("/alunos");
    revalidatePath("/pagamentos");
    return { id };
  }

  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    nome: input.nome.trim(),
    status: "ativo",
  };

  if (input.cpf)            payload.cpf            = input.cpf;
  if (input.telefone)       payload.telefone       = input.telefone;
  if (input.email)          payload.email          = input.email;
  if (input.data_nascimento) payload.data_nascimento = input.data_nascimento;
  if (input.sexo)           payload.sexo           = input.sexo;
  if (input.cep)            payload.cep            = input.cep;
  if (input.logradouro)     payload.logradouro     = input.logradouro;
  if (input.bairro)         payload.bairro         = input.bairro;
  if (input.cidade)         payload.cidade         = input.cidade;
  if (input.estado)         payload.estado         = input.estado;
  if (input.numero)         payload.numero         = input.numero;
  if (input.complemento)    payload.complemento    = input.complemento;
  if (input.plano_id)       payload.plano_id       = input.plano_id;
  if (input.avatar_url)     payload.avatar_url     = input.avatar_url;

  const { data, error } = await supabase
    .from("alunos")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(formatPostgrestError(error));

  revalidatePath("/alunos");
  return { id: String(data.id) };
}

export async function alterarStatusAluno(id: string, status: AlunoStatus) {
  if (useDataMock()) {
    mockAlterarStatusAluno(id, status);
    revalidatePath("/alunos");
    revalidatePath("/pagamentos");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("alunos")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(formatPostgrestError(error));
  revalidatePath("/alunos");
}

export async function apagarAluno(id: string) {
  if (useDataMock()) {
    mockApagarAluno(id);
    revalidatePath("/alunos");
    revalidatePath("/pagamentos");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("alunos").delete().eq("id", id);
  if (error) throw new Error(formatPostgrestError(error));
  revalidatePath("/alunos");
  revalidatePath("/pagamentos");
  revalidatePath(`/alunos/${id}`);
}

export async function buscarAlunoFormData(id: string): Promise<AlunoFormData | null> {
  if (useDataMock()) return mockBuscarAlunoFormData(id);

  const supabase = await createClient();
  /* `*` para o formulário de edição trazer todas as colunas (cpf, endereço, plano_id, etc.).
   * A listagem continua com select mínimo em `app/alunos/page.tsx` para evitar 42703 em bases antigas. */
  const { data, error } = await supabase
    .from("alunos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(formatPostgrestError(error));
  if (!data) return null;
  return rowToAlunoFormData(data as Record<string, unknown>);
}

export async function atualizarAluno(id: string, input: Omit<CriarAlunoInput, "turmas_ids">) {
  if (useDataMock()) {
    mockAtualizarAluno(id, input);
    revalidatePath("/alunos");
    revalidatePath("/pagamentos");
    revalidatePath(`/alunos/${id}`);
    return;
  }

  const supabase = await createClient();

  const payload: Record<string, unknown> = {};
  if (input.nome)            payload.nome            = input.nome.trim();
  if (input.cpf !== undefined) payload.cpf           = input.cpf || null;
  if (input.telefone !== undefined) payload.telefone = input.telefone || null;
  if (input.email !== undefined)    payload.email    = input.email || null;
  if (input.data_nascimento !== undefined) payload.data_nascimento = input.data_nascimento || null;
  if (input.sexo !== undefined)     payload.sexo     = input.sexo || null;
  if (input.cep !== undefined)      payload.cep      = input.cep || null;
  if (input.logradouro !== undefined) payload.logradouro = input.logradouro || null;
  if (input.bairro !== undefined)   payload.bairro   = input.bairro || null;
  if (input.cidade !== undefined)   payload.cidade   = input.cidade || null;
  if (input.estado !== undefined)   payload.estado   = input.estado || null;
  if (input.numero !== undefined)   payload.numero   = input.numero || null;
  if (input.complemento !== undefined) payload.complemento = input.complemento || null;
  if (input.plano_id !== undefined) payload.plano_id = input.plano_id || null;

  const { error } = await supabase.from("alunos").update(payload).eq("id", id);
  if (error) throw new Error(formatPostgrestError(error));
  revalidatePath("/alunos");
  revalidatePath(`/alunos/${id}`);
}
