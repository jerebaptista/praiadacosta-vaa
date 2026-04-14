import type {
  AlunoPerfil,
  AlunoStatus,
  CriarAlunoInput,
} from "@/app/actions/alunos";
import {
  formatarCpfExibicao,
  montarEnderecoUmaLinha,
} from "@/lib/aluno-perfil-exibicao";
import { rowToAlunoFormData, type AlunoFormData } from "@/lib/alunos-form-data";
import { mesAtualPrimeiroDia } from "@/lib/dates";
import {
  mapearLinhaRemadaAdmin,
  ordenarRemadasPorDataHora,
  statusValorGravarCancelamentoRemada,
  statusValorGravarConcluidaRemada,
} from "@/lib/remadas-db";
import type { RemadaLinha } from "@/lib/remadas-geracao";
import {
  combinarDataHoraLocal,
  LABEL_DIA_SEMANA,
  ORDEM_DIA_SEMANA,
} from "@/lib/remadas-geracao";
import { pickRemadaDataHora } from "@/lib/remada-display";
import { mapearLinhaTurma, type TurmaLinha, type TurmaStatus } from "@/lib/turmas-tipos";
import { normalizarDataYmd, normalizarHoraHm } from "@/lib/remadas-validacao";
import {
  REMADA_VAGAS_MAX,
  REMADA_VAGAS_MIN,
} from "@/lib/remadas-validacao";
import { enriquecerPlanosComAlunos } from "@/lib/planos-enriquecimento";
import { statusPagamentoApartirDeVencimento } from "@/lib/planos-aluno-pagamento";
import {
  periodoContratoParaAluno,
  rotuloPeriodoContrato,
  vencimentoAposInicio,
} from "@/lib/planos-aluno-vigencia";
import {
  existeOutroPlanoComMesmoNome,
  MSG_NOME_PLANO_DUPLICADO,
} from "@/lib/planos-nome";
import {
  LIMITE_PLANOS_TOTAL,
  MSG_LIMITE_PLANOS_TOTAL_CRIAR,
  MSG_NAO_PODE_REMOVER_PLANO_COM_ALUNOS_ATIVOS,
  type AlunoAtivoPlanoLinha,
  type PlanoLinha,
  type PlanoStatus,
} from "@/lib/planos-tipos";
import {
  getMockDb,
  mockNovoId,
  type MockPlanoRow,
  type MockRemadaRow,
  type MockTurmaRow,
} from "@/lib/mock-data/store";

function isoNow() {
  return new Date().toISOString();
}

function clienteDesdeMock(row: Record<string, unknown>): string | null {
  const di = row.data_inicio;
  if (di != null && String(di).trim() !== "") {
    return String(di).slice(0, 10);
  }
  const ce = row.criado_em;
  if (ce != null && String(ce).trim() !== "") {
    return String(ce).slice(0, 10);
  }
  return null;
}

/* ── Planos (listagem alunos) ── */
export function mockPlanosOrdenadosPreco() {
  return [...getMockDb().planos].sort((a, b) => {
    const ma = a.preco_mensal ?? Number.MAX_SAFE_INTEGER;
    const mb = b.preco_mensal ?? Number.MAX_SAFE_INTEGER;
    return ma - mb;
  });
}

function alunosMockParaPlanos() {
  return getMockDb().alunos.map((a) => ({
    id: String(a.id),
    nome: String(a.nome ?? ""),
    avatar_url: a.avatar_url != null ? String(a.avatar_url) : null,
    plano_id:
      a.plano_id != null && String(a.plano_id).trim() !== ""
        ? String(a.plano_id)
        : null,
    status: String(a.status ?? "ativo"),
  }));
}

export function mockListarPlanos(): PlanoLinha[] {
  const base = [...getMockDb().planos]
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      status: p.status,
      remadas_por_semana: p.remadas_por_semana,
      preco_mensal: p.preco_mensal,
      equivalente_mensal:
        p.preco_mensal != null && p.preco_mensal > 0
          ? null
          : p.valor != null && p.valor > 0
            ? p.valor
            : null,
      preco_trimestral: p.preco_trimestral ?? null,
      preco_semestral: p.preco_semestral ?? null,
      preco_anual: p.preco_anual ?? null,
    }));
  return enriquecerPlanosComAlunos(base, alunosMockParaPlanos());
}

export function mockContarPlanosAtivos(): number {
  return getMockDb().planos.filter((p) => p.status === "ativo").length;
}

export function mockAlterarStatusPlano(id: string, status: PlanoStatus): void {
  const p = getMockDb().planos.find((x) => x.id === id);
  if (!p) throw new Error("Plano não encontrado (mock).");
  p.status = status;
}

export function mockApagarPlano(id: string): void {
  const db = getMockDb();
  const idx = db.planos.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Plano não encontrado (mock).");
  const ativos = db.alunos.filter(
    (a) =>
      String(a.plano_id ?? "") === id && String(a.status ?? "") === "ativo"
  ).length;
  if (ativos > 0) {
    throw new Error(MSG_NAO_PODE_REMOVER_PLANO_COM_ALUNOS_ATIVOS);
  }
  for (const a of db.alunos) {
    if (String(a.plano_id ?? "") === id) {
      a.plano_id = null;
    }
  }
  db.planos.splice(idx, 1);
}

export function mockCriarPlano(row: {
  nome: string;
  remadas_por_semana: number;
  preco_mensal: number | null;
  preco_trimestral: number | null;
  preco_semestral: number | null;
  preco_anual: number | null;
  valor_equivalente_mensal: number;
}): { id: string } {
  if (getMockDb().planos.length >= LIMITE_PLANOS_TOTAL) {
    throw new Error(MSG_LIMITE_PLANOS_TOTAL_CRIAR);
  }
  if (
    existeOutroPlanoComMesmoNome(
      getMockDb().planos.map((p) => ({ id: p.id, nome: p.nome })),
      row.nome
    )
  ) {
    throw new Error(MSG_NOME_PLANO_DUPLICADO);
  }
  const db = getMockDb();
  const id = mockNovoId();
  const novo: MockPlanoRow = {
    id,
    nome: row.nome,
    status: "ativo",
    remadas_por_semana: row.remadas_por_semana,
    preco_mensal: row.preco_mensal,
    valor: row.valor_equivalente_mensal,
    preco_trimestral: row.preco_trimestral,
    preco_semestral: row.preco_semestral,
    preco_anual: row.preco_anual,
  };
  db.planos.push(novo);
  return { id };
}

export function mockAtualizarPlano(
  id: string,
  row: {
    nome: string;
    remadas_por_semana: number;
    preco_mensal: number | null;
    preco_trimestral: number | null;
    preco_semestral: number | null;
    preco_anual: number | null;
    valor_equivalente_mensal: number;
    status: PlanoStatus;
  }
): void {
  const p = getMockDb().planos.find((x) => x.id === id);
  if (!p) throw new Error("Plano não encontrado (mock).");
  if (
    existeOutroPlanoComMesmoNome(
      getMockDb().planos.map((pl) => ({ id: pl.id, nome: pl.nome })),
      row.nome,
      id
    )
  ) {
    throw new Error(MSG_NOME_PLANO_DUPLICADO);
  }
  p.nome = row.nome;
  p.remadas_por_semana = row.remadas_por_semana;
  p.preco_mensal = row.preco_mensal;
  p.valor = row.valor_equivalente_mensal;
  p.preco_trimestral = row.preco_trimestral;
  p.preco_semestral = row.preco_semestral;
  p.preco_anual = row.preco_anual;
  p.status = row.status;
}

function desdePlanoMockAluno(row: Record<string, unknown>): string {
  const di = row.data_inicio;
  if (di != null && String(di).trim() !== "") {
    return String(di).slice(0, 10);
  }
  const ce = row.criado_em;
  if (ce != null && String(ce).trim() !== "") {
    return String(ce).slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function mockListarAlunosAtivosPlano(planoId: string): AlunoAtivoPlanoLinha[] {
  const db = getMockDb();
  const linhas: AlunoAtivoPlanoLinha[] = [];
  for (const a of db.alunos) {
    const row = a as Record<string, unknown>;
    if (String(row.plano_id ?? "") !== planoId) continue;
    if (String(row.status ?? "") !== "ativo") continue;
    const desde = desdePlanoMockAluno(row);
    const idStr = String(row.id);
    const p = periodoContratoParaAluno(idStr);
    const vencimento = vencimentoAposInicio(desde, p);
    linhas.push({
      id: idStr,
      nome: String(row.nome ?? ""),
      avatar_url: row.avatar_url != null ? String(row.avatar_url) : null,
      desde,
      periodo: rotuloPeriodoContrato(p),
      vencimento,
      pagamento: statusPagamentoApartirDeVencimento(vencimento),
    });
  }
  return linhas.sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
}

/* ── Turmas ── */
export function mockListarTurmas(): TurmaLinha[] {
  return getMockDb()
    .turmas.map((r) => mapearLinhaTurma(r as unknown as Record<string, unknown>))
    .filter((r): r is TurmaLinha => r != null);
}

export function mockCriarTurma(row: Omit<MockTurmaRow, "id" | "created_at">): TurmaLinha {
  const db = getMockDb();
  const id = mockNovoId();
  const created_at = isoNow();
  const full: MockTurmaRow = { ...row, id, created_at };
  db.turmas.push(full);
  const linha = mapearLinhaTurma(full as unknown as Record<string, unknown>);
  if (!linha) throw new Error("Erro ao mapear turma mock.");
  return linha;
}

export function mockAtualizarTurma(
  id: string,
  patch: Pick<MockTurmaRow, "dias_semana" | "hora" | "vagas">
): void {
  const t = getMockDb().turmas.find((x) => x.id === id);
  if (!t) throw new Error("Turma não encontrada (mock).");
  Object.assign(t, patch);
}

export function mockAlterarStatusTurma(id: string, status: TurmaStatus): void {
  const t = getMockDb().turmas.find((x) => x.id === id);
  if (!t) throw new Error("Turma não encontrada (mock).");
  t.status = status;
}

export function mockApagarTurma(id: string): void {
  const db = getMockDb();
  db.turmas = db.turmas.filter((x) => x.id !== id);
}

/* ── Remadas ── */
function mockSincronizarAtrasadas() {
  mockSincronizarRemadasAtrasadasOnly();
}

/** Usado por `sincronizarRemadasAgendadasAtrasadas` em modo mock. */
export function mockSincronizarRemadasAtrasadasOnly(): void {
  const agora = Date.now();
  for (const r of getMockDb().remadas) {
    if (r.status === "agendada" && new Date(r.data_hora).getTime() <= agora) {
      r.status = statusValorGravarConcluidaRemada();
    }
  }
}

export function mockListarRemadasAdmin(): RemadaLinha[] {
  mockSincronizarAtrasadas();
  const agora = new Date();
  const linhas = getMockDb()
    .remadas.map((row) =>
      mapearLinhaRemadaAdmin(row as unknown as Record<string, unknown>, agora)
    )
    .filter((r): r is RemadaLinha => r != null);
  return ordenarRemadasPorDataHora(linhas);
}

export function mockCriarRemadasInsert(
  rows: { data_hora: string; vagas: number; status: string }[]
): RemadaLinha[] {
  const db = getMockDb();
  const agora = new Date();
  const criadas: RemadaLinha[] = [];
  for (const row of rows) {
    const id = mockNovoId();
    const mr: MockRemadaRow = {
      id,
      data_hora: row.data_hora,
      vagas: row.vagas,
      status: row.status,
      created_at: isoNow(),
    };
    db.remadas.push(mr);
    const m = mapearLinhaRemadaAdmin(mr as unknown as Record<string, unknown>, agora);
    if (m) criadas.push(m);
  }
  return ordenarRemadasPorDataHora(criadas);
}

export function mockApagarTodasRemadas(): void {
  getMockDb().remadas = [];
}

export function mockApagarRemada(id: string): void {
  const db = getMockDb();
  db.remadas = db.remadas.filter((r) => r.id !== id);
}

export function mockCancelarRemada(id: string): void {
  const r = getMockDb().remadas.find((x) => x.id === id);
  if (!r) throw new Error("Remada não encontrada (mock).");
  r.status = statusValorGravarCancelamentoRemada();
}

export function mockMarcarRemadaConcluida(id: string): void {
  const r = getMockDb().remadas.find((x) => x.id === id);
  if (!r) throw new Error("Remada não encontrada (mock).");
  r.status = statusValorGravarConcluidaRemada();
}

export function mockMarcarRemadaAgendada(id: string): void {
  const r = getMockDb().remadas.find((x) => x.id === id);
  if (!r) throw new Error("Remada não encontrada (mock).");
  if (new Date(r.data_hora).getTime() <= Date.now()) {
    throw new Error(
      "A data desta remada já passou — não é possível colocá-la como agendada."
    );
  }
  r.status = "agendada";
}

export function mockAtualizarRemada(
  id: string,
  input: { dataYmd: string; hora: string; vagas: number }
): void {
  const dataYmd = normalizarDataYmd(input.dataYmd);
  const hora = normalizarHoraHm(input.hora);
  if (!dataYmd || !hora) throw new Error("Data ou horário inválidos.");
  if (
    !Number.isInteger(input.vagas) ||
    input.vagas < REMADA_VAGAS_MIN ||
    input.vagas > REMADA_VAGAS_MAX
  ) {
    throw new Error(
      `Vagas deve ser entre ${REMADA_VAGAS_MIN} e ${REMADA_VAGAS_MAX}.`
    );
  }
  const base = combinarDataHoraLocal(dataYmd, hora);
  if (!base) throw new Error("Data ou horário inválidos.");
  const r = getMockDb().remadas.find((x) => x.id === id);
  if (!r) throw new Error("Remada não encontrada (mock).");
  r.data_hora = base.toISOString();
  r.vagas = input.vagas;
}

/* ── Alunos ── */
export function mockAlunosParaPaginaListagem() {
  const rows = [...getMockDb().alunos].sort((a, b) =>
    String(a.nome ?? "").localeCompare(String(b.nome ?? ""), "pt-BR")
  );
  return rows;
}

export function mockTurmasAtivasRaw() {
  return getMockDb().turmas.filter((t) => t.status === "ativa");
}

export function mockBuscarAlunoFormData(id: string): AlunoFormData | null {
  const row = getMockDb().alunos.find((a) => String(a.id) === id);
  if (!row) return null;
  return rowToAlunoFormData(row as Record<string, unknown>);
}

export function mockBuscarAlunoPerfil(id: string): AlunoPerfil | null {
  const row = getMockDb().alunos.find((a) => String(a.id) === id);
  if (!row) return null;
  const db = getMockDb();
  const mes = mesAtualPrimeiroDia();
  const pag = db.pagamentos.find(
    (p) => p.aluno_id === String(row.id) && p.mes === mes
  );
  const rec = row as Record<string, unknown>;
  const pid = row.plano_id != null ? String(row.plano_id) : "";
  const plano = pid ? db.planos.find((p) => p.id === pid) ?? null : null;
  const cpfRaw =
    row.cpf != null && String(row.cpf).trim() !== ""
      ? String(row.cpf)
      : null;

  let turma_resumo: string | null = null;
  const turma =
    db.turmas.find((t) => t.status === "ativa") ?? db.turmas[0] ?? null;
  if (turma) {
    const dias = [...(turma.dias_semana as number[])].sort(
      (a, b) =>
        ORDEM_DIA_SEMANA.indexOf(a as (typeof ORDEM_DIA_SEMANA)[number]) -
        ORDEM_DIA_SEMANA.indexOf(b as (typeof ORDEM_DIA_SEMANA)[number])
    );
    const labels = dias.map((d) => LABEL_DIA_SEMANA[d]).join(", ");
    turma_resumo = `${labels} · ${String(turma.hora).slice(0, 5)}`;
  }

  const now = Date.now();
  const futRem = db.remadas
    .filter(
      (r) =>
        new Date(r.data_hora).getTime() >= now - 60_000 &&
        String(r.status).toLowerCase().includes("agendad")
    )
    .sort(
      (a, b) =>
        new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
    )[0];
  const proxima_remada = futRem
    ? pickRemadaDataHora(futRem as unknown as Record<string, unknown>)
    : null;

  return {
    id: String(row.id),
    nome: String(row.nome ?? ""),
    email: row.email ? String(row.email) : null,
    telefone: row.telefone ? String(row.telefone) : null,
    data_nascimento: row.data_nascimento ? String(row.data_nascimento) : null,
    cpf: formatarCpfExibicao(cpfRaw),
    endereco_linha: montarEnderecoUmaLinha(rec),
    plano_nome: plano?.nome ?? null,
    plano_remadas_semana: plano?.remadas_por_semana ?? null,
    turma_resumo,
    proxima_remada,
    avatar_url:
      row.avatar_url != null && String(row.avatar_url).trim() !== ""
        ? String(row.avatar_url)
        : null,
    status: String(row.status ?? "ativo"),
    criado_em: row.criado_em ? String(row.criado_em) : null,
    pagamento: pag
      ? {
          status: pag.status,
          pago_em: pag.pago_em,
        }
      : null,
    cliente_desde: clienteDesdeMock(rec),
    creditos_extras_disponiveis: 0,
    creditos_extras_erro: false,
    mes,
  };
}

export function mockCriarAluno(input: CriarAlunoInput): { id: string } {
  const db = getMockDb();
  const id = mockNovoId();
  const row: Record<string, unknown> = {
    id,
    nome: input.nome.trim(),
    status: "ativo",
    cpf: input.cpf ?? null,
    telefone: input.telefone ?? null,
    email: input.email ?? null,
    data_nascimento: input.data_nascimento ?? null,
    sexo: input.sexo ?? null,
    cep: input.cep ?? null,
    logradouro: input.logradouro ?? null,
    bairro: input.bairro ?? null,
    cidade: input.cidade ?? null,
    estado: input.estado ?? null,
    numero: input.numero ?? null,
    complemento: input.complemento ?? null,
    plano_id: input.plano_id ?? null,
    avatar_url: input.avatar_url ?? null,
    criado_em: isoNow(),
  };
  db.alunos.push(row);
  return { id };
}

export function mockAtualizarAluno(
  id: string,
  input: Omit<CriarAlunoInput, "turmas_ids">
): void {
  const row = getMockDb().alunos.find((a) => String(a.id) === id);
  if (!row) throw new Error("Aluno não encontrado (mock).");
  if (input.nome) row.nome = input.nome.trim();
  if (input.cpf !== undefined) row.cpf = input.cpf || null;
  if (input.telefone !== undefined) row.telefone = input.telefone || null;
  if (input.email !== undefined) row.email = input.email || null;
  if (input.data_nascimento !== undefined)
    row.data_nascimento = input.data_nascimento || null;
  if (input.sexo !== undefined) row.sexo = input.sexo || null;
  if (input.cep !== undefined) row.cep = input.cep || null;
  if (input.logradouro !== undefined) row.logradouro = input.logradouro || null;
  if (input.bairro !== undefined) row.bairro = input.bairro || null;
  if (input.cidade !== undefined) row.cidade = input.cidade || null;
  if (input.estado !== undefined) row.estado = input.estado || null;
  if (input.numero !== undefined) row.numero = input.numero || null;
  if (input.complemento !== undefined) row.complemento = input.complemento || null;
  if (input.plano_id !== undefined) row.plano_id = input.plano_id || null;
}

export function mockAlterarStatusAluno(id: string, status: AlunoStatus): void {
  const row = getMockDb().alunos.find((a) => String(a.id) === id);
  if (!row) throw new Error("Aluno não encontrado (mock).");
  row.status = status;
}

export function mockApagarAluno(id: string): void {
  const db = getMockDb();
  db.alunos = db.alunos.filter((a) => String(a.id) !== id);
  db.pagamentos = db.pagamentos.filter((p) => p.aluno_id !== id);
}

/* ── Pagamentos ── */
export function mockAlunosParaPagamentos() {
  return mockAlunosParaPaginaListagem().map((a) => ({
    id: String(a.id),
    nome: String(a.nome ?? ""),
    email: a.email ? String(a.email) : null,
    telefone: a.telefone ? String(a.telefone) : null,
    status: String(a.status ?? "ativo"),
  }));
}

export function mockPagamentosDoMes(mes: string) {
  return getMockDb().pagamentos.filter((p) => p.mes === mes);
}

export function mockAtualizarPagamentoMensal(input: {
  alunoId: string;
  mes: string;
  status: "pendente" | "pago";
}): void {
  const db = getMockDb();
  const pagoEm = input.status === "pago" ? isoNow() : null;
  const existente = db.pagamentos.find(
    (p) => p.aluno_id === input.alunoId && p.mes === input.mes
  );
  if (existente) {
    existente.status = input.status;
    existente.pago_em = pagoEm;
  } else {
    db.pagamentos.push({
      aluno_id: input.alunoId,
      mes: input.mes,
      status: input.status,
      pago_em: pagoEm,
    });
  }
}

function arredondarMoedaMock(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Valor > 0 ou null se não definido no mock. */
export function mockObterPrecoPorAula(): number | null {
  const v = getMockDb().preco_por_aula;
  if (!Number.isFinite(v) || v <= 0) return null;
  return arredondarMoedaMock(v);
}

export function mockSalvarPrecoPorAula(valor: number): void {
  getMockDb().preco_por_aula = arredondarMoedaMock(valor);
}
