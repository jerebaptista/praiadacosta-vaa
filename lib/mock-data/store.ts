import { randomUUID } from "node:crypto";
import { mesAtualPrimeiroDia } from "@/lib/dates";

/**
 * Seed do modo `USE_DATA_MOCK=true` — não altera o Supabase.
 * Cenário fictício: estúdio Praia da Costa (Niterói).
 */

/** Linhas cruas alinhadas ao que o PostgREST devolveria */
export type MockPlanoRow = {
  id: string;
  nome: string;
  status: "ativo" | "inativo";
  remadas_por_semana: number;
  preco_mensal: number | null;
  /** Coluna `valor` (referência mensal). */
  valor?: number | null;
  preco_trimestral?: number | null;
  preco_semestral?: number | null;
  preco_anual?: number | null;
};

export type MockTurmaRow = {
  id: string;
  nome: string;
  dias_semana: number[];
  hora: string;
  vagas: number;
  status: "ativa" | "inativa";
  created_at: string;
};

export type MockAlunoRow = Record<string, unknown>;

export type MockRemadaRow = {
  id: string;
  data_hora: string;
  vagas: number;
  status: string;
  created_at: string;
};

export type MockPagamentoRow = {
  aluno_id: string;
  mes: string;
  status: "pago" | "pendente";
  pago_em: string | null;
};

type MockDb = {
  planos: MockPlanoRow[];
  turmas: MockTurmaRow[];
  alunos: MockAlunoRow[];
  remadas: MockRemadaRow[];
  pagamentos: MockPagamentoRow[];
  /** Configuração: valor unitário por aula (BRL). */
  preco_por_aula: number;
};

const G = globalThis as unknown as { __PRAIADACOSTA_MOCK_DB__?: MockDb };

const IDS = {
  plano1: "a1000000-0000-4000-8000-000000000001",
  plano2: "a1000000-0000-4000-8000-000000000002",
  plano3: "a1000000-0000-4000-8000-000000000003",
  turma1: "b2000000-0000-4000-8000-000000000001",
  turma2: "b2000000-0000-4000-8000-000000000002",
  turma3: "b2000000-0000-4000-8000-000000000003",
  aluno1: "c3000000-0000-4000-8000-000000000001",
  aluno2: "c3000000-0000-4000-8000-000000000002",
  aluno3: "c3000000-0000-4000-8000-000000000003",
  aluno4: "c3000000-0000-4000-8000-000000000004",
  aluno5: "c3000000-0000-4000-8000-000000000005",
  aluno6: "c3000000-0000-4000-8000-000000000006",
  aluno7: "c3000000-0000-4000-8000-000000000007",
  remada1: "d4000000-0000-4000-8000-000000000001",
  remada2: "d4000000-0000-4000-8000-000000000002",
  remada3: "d4000000-0000-4000-8000-000000000003",
  remada4: "d4000000-0000-4000-8000-000000000004",
  remada5: "d4000000-0000-4000-8000-000000000005",
  remada6: "d4000000-0000-4000-8000-000000000006",
} as const;

function iso(d: Date) {
  return d.toISOString();
}

function isoMesesRelativo(ref: Date, deltaMeses: number) {
  const d = new Date(ref);
  d.setMonth(d.getMonth() + deltaMeses);
  return d.toISOString();
}

function seed(): MockDb {
  const agora = new Date();
  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(7, 0, 0, 0);
  const emDoisDias = new Date(agora);
  emDoisDias.setDate(emDoisDias.getDate() + 2);
  emDoisDias.setHours(7, 0, 0, 0);
  const depois = new Date(agora);
  depois.setDate(depois.getDate() + 3);
  depois.setHours(18, 30, 0, 0);
  const sabado = new Date(agora);
  const diasAteSabado = (6 - sabado.getDay() + 7) % 7 || 7;
  sabado.setDate(sabado.getDate() + diasAteSabado);
  sabado.setHours(9, 0, 0, 0);
  const passada = new Date(agora);
  passada.setDate(passada.getDate() - 2);
  passada.setHours(7, 0, 0, 0);
  const passadaNoite = new Date(agora);
  passadaNoite.setDate(passadaNoite.getDate() - 1);
  passadaNoite.setHours(18, 30, 0, 0);

  const planos: MockPlanoRow[] = [
    {
      id: IDS.plano1,
      nome: "1× semana",
      status: "ativo",
      remadas_por_semana: 1,
      preco_mensal: 180,
      preco_trimestral: 510,
      preco_semestral: 990,
      preco_anual: 1836,
    },
    {
      id: IDS.plano2,
      nome: "2× semana",
      status: "ativo",
      remadas_por_semana: 2,
      preco_mensal: 280,
      preco_trimestral: 798,
      preco_semestral: 1540,
      preco_anual: 2856,
    },
    {
      id: IDS.plano3,
      nome: "3× semana",
      status: "inativo",
      remadas_por_semana: 3,
      preco_mensal: 360,
      preco_trimestral: 1026,
      preco_semestral: 1980,
      preco_anual: 3672,
    },
  ];

  const turmas: MockTurmaRow[] = [
    {
      id: IDS.turma1,
      nome: "Manhã — ter/qui",
      dias_semana: [2, 4],
      hora: "07:00",
      vagas: 12,
      status: "ativa",
      created_at: iso(agora),
    },
    {
      id: IDS.turma2,
      nome: "Noite — seg/quí/sex",
      dias_semana: [1, 3, 5],
      hora: "18:30",
      vagas: 10,
      status: "ativa",
      created_at: iso(agora),
    },
    {
      id: IDS.turma3,
      nome: "Sábado praia",
      dias_semana: [6],
      hora: "09:00",
      vagas: 14,
      status: "ativa",
      created_at: iso(agora),
    },
  ];

  const alunos: MockAlunoRow[] = [
    {
      id: IDS.aluno1,
      nome: "Ana Costa",
      cpf: "12345678901",
      telefone: "21988887777",
      email: "ana@email.com",
      data_nascimento: "1992-05-10",
      sexo: "feminino",
      cep: "24240000",
      logradouro: "Av. Atlântica",
      bairro: "Praia da Costa",
      cidade: "Vila Velha",
      estado: "ES",
      numero: "1200",
      complemento: "Apto 302",
      plano_id: IDS.plano2,
      data_inicio: "2024-01-15",
      avatar_url: null,
      status: "ativo",
      criado_em: iso(agora),
    },
    {
      id: IDS.aluno2,
      nome: "Bruno Lima",
      cpf: null,
      telefone: "21999996666",
      email: "bruno.lima@email.com",
      data_nascimento: "1995-03-18",
      sexo: "masculino",
      cep: "29055280",
      logradouro: "Rua Aleixo Netto",
      bairro: "Praia da Costa",
      cidade: "Vila Velha",
      estado: "ES",
      numero: "45",
      complemento: null,
      plano_id: IDS.plano3,
      avatar_url: null,
      status: "pendente",
      criado_em: isoMesesRelativo(agora, -2),
    },
    {
      id: IDS.aluno3,
      nome: "Carla Mendes",
      cpf: "98765432100",
      telefone: "21977775555",
      email: "carla@email.com",
      data_nascimento: "1988-11-22",
      sexo: "feminino",
      cep: null,
      logradouro: null,
      bairro: null,
      cidade: null,
      estado: null,
      numero: null,
      complemento: null,
      plano_id: null,
      avatar_url: null,
      status: "inativo",
      criado_em: isoMesesRelativo(agora, -6),
    },
    {
      id: IDS.aluno4,
      nome: "Diego Souza",
      cpf: null,
      telefone: "21966664444",
      email: null,
      data_nascimento: "2001-08-02",
      sexo: "masculino",
      cep: "24230161",
      logradouro: "Rua Nestor Gomes",
      bairro: "Citânia",
      cidade: "Vila Velha",
      estado: "ES",
      numero: "88",
      complemento: null,
      plano_id: IDS.plano1,
      data_inicio: "2023-06-01",
      avatar_url: null,
      status: "ativo",
      criado_em: isoMesesRelativo(agora, -10),
    },
  ];

  const remadas: MockRemadaRow[] = [
    {
      id: IDS.remada1,
      data_hora: iso(passada),
      vagas: 12,
      status: "concluido",
      created_at: iso(passada),
    },
    {
      id: IDS.remada4,
      data_hora: iso(passadaNoite),
      vagas: 10,
      status: "concluido",
      created_at: iso(passadaNoite),
    },
    {
      id: IDS.remada2,
      data_hora: iso(amanha),
      vagas: 12,
      status: "agendada",
      created_at: iso(agora),
    },
    {
      id: IDS.remada5,
      data_hora: iso(emDoisDias),
      vagas: 12,
      status: "agendada",
      created_at: iso(agora),
    },
    {
      id: IDS.remada3,
      data_hora: iso(depois),
      vagas: 10,
      status: "agendada",
      created_at: iso(agora),
    },
    {
      id: IDS.remada6,
      data_hora: iso(sabado),
      vagas: 14,
      status: "agendada",
      created_at: iso(agora),
    },
  ];

  const mes = mesAtualPrimeiroDia();
  const pagamentos: MockPagamentoRow[] = [
    { aluno_id: IDS.aluno1, mes, status: "pendente", pago_em: null },
    { aluno_id: IDS.aluno2, mes, status: "pago", pago_em: iso(agora) },
    { aluno_id: IDS.aluno4, mes, status: "pago", pago_em: iso(agora) },
  ];

  return {
    planos,
    turmas,
    alunos,
    remadas,
    pagamentos,
    preco_por_aula: 50,
  };
}

export function getMockDb(): MockDb {
  if (!G.__PRAIADACOSTA_MOCK_DB__) {
    G.__PRAIADACOSTA_MOCK_DB__ = seed();
  }
  return G.__PRAIADACOSTA_MOCK_DB__;
}

export function mockNovoId(): string {
  return randomUUID();
}
