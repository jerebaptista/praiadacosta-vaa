/** Máximo de planos cadastrados (ativos + inativos). */
export const LIMITE_PLANOS_TOTAL = 7;

export const MSG_LIMITE_PLANOS_TOTAL_CRIAR =
  "Já existem 7 planos. Remova um plano para poder adicionar outro.";

/** Primeira frase — tooltip / title quando a remoção está bloqueada. */
export const MSG_NAO_PODE_REMOVER_PLANO_ALUNOS_TOOLTIP =
  "Não é possível remover o plano enquanto houver alunos ativos neste plano.";

/** Remoção do plano bloqueada enquanto existir aluno ativo neste vínculo (mensagem completa). */
export const MSG_NAO_PODE_REMOVER_PLANO_COM_ALUNOS_ATIVOS =
  `${MSG_NAO_PODE_REMOVER_PLANO_ALUNOS_TOOLTIP} Inative o plano ou altere o vínculo dos alunos antes de remover.`;

/** Texto do alerta de confirmação ao remover plano (drawer e tabela). */
export const DESCRICAO_ALERT_REMOVER_PLANO =
  "Atenção: esta ação é irreversível. O plano e todo o histórico de alunos e pagamentos serão excluídos permanentemente. " +
  "Recomendamos apenas ajustar os preços. Remova somente se o plano foi criado por engano.";

/** Linha de plano na listagem admin (preços por recorrência). */
export type PlanoStatus = "ativo" | "inativo";

/** Até 3 alunos para o AvatarGroup; o total pode ser maior. */
export type PlanoAlunoPreview = {
  id: string;
  nome: string;
  avatar_url: string | null;
};

/** Situação do pagamento do período atual (UI; pode evoluir para coluna persistida). */
export type AlunoPagamentoPlanoStatus = "pago" | "pendente";

/** Aluno ativo vinculado a um plano (drawer de edição). */
export type AlunoAtivoPlanoLinha = {
  id: string;
  nome: string;
  avatar_url: string | null;
  /** Início no plano: `data_inicio` do aluno ou, em falta, data de cadastro (`yyyy-mm-dd`). */
  desde: string;
  /** Período de cobrança da vigência atual (ex.: Mensal, Anual). */
  periodo: string;
  /** Data fim da vigência atual (`yyyy-mm-dd`) — ex.: início + 12 meses no anual. */
  vencimento: string;
  /** Em dia até o vencimento (inclusive); após a data, pendente. */
  pagamento: AlunoPagamentoPlanoStatus;
};

export type PlanoLinha = {
  id: string;
  nome: string;
  status: PlanoStatus;
  /** Quantidade de alunos com este plano. */
  alunos_total: number;
  /** Alunos com status ativo neste plano (ex.: bloquear remoção do plano). */
  alunos_ativos_no_plano: number;
  /** Primeiros alunos (máx. 3) para avatares, ordenados por nome. */
  alunos_preview: PlanoAlunoPreview[];
  remadas_por_semana: number;
  /** Null = período mensal não ofertado neste plano. */
  preco_mensal: number | null;
  /**
   * Equivalente mensal (coluna `valor`): referência quando o mensal não é ofertado
   * ou complemento legado; usado no formulário para o campo “Preço mensal”.
   */
  equivalente_mensal: number | null;
  preco_trimestral: number | null;
  preco_semestral: number | null;
  preco_anual: number | null;
};

export function formatarPrecoBrl(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return "—";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
