"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hojeLocalISODate } from "@/lib/dates";
import { formatPostgrestError } from "@/lib/supabase-error";

export type MotivoCredito = "indicacao" | "retorno" | "bonificacao" | "outro";

const EXPIRA_LONGA = "2099-12-31";

export async function darCredito(input: {
  alunoId: string;
  quantidade: number;
  motivo: MotivoCredito;
  dataVencimento: string | null;
}) {
  if (!Number.isFinite(input.quantidade) || input.quantidade < 1) {
    throw new Error("Quantidade inválida");
  }

  const supabase = await createClient();
  const qtd = Math.floor(input.quantidade);

  const payloadLegado = {
    aluno_id: input.alunoId,
    quantidade: qtd,
    motivo: input.motivo,
    origem: "acrescimo_manual",
    data_vencimento: input.dataVencimento,
    status: "disponivel",
  };

  const r1 = await supabase.from("creditos").insert(payloadLegado);
  if (!r1.error) {
    revalidatePath(`/alunos/${input.alunoId}`);
    return;
  }

  const expiraEm =
    input.dataVencimento != null && input.dataVencimento.trim() !== ""
      ? input.dataVencimento.trim().slice(0, 10)
      : EXPIRA_LONGA;

  const desde = hojeLocalISODate();
  const linhas = Array.from({ length: qtd }, () => ({
    aluno_id: input.alunoId,
    status: "disponivel",
    disponivel_a_partir_de: desde,
    expira_em: expiraEm,
    tipo: input.motivo,
    motivo: "acrescimo_manual",
  }));

  const r2 = await supabase.from("creditos_aula").insert(linhas);
  if (r2.error) {
    throw new Error(
      `${formatPostgrestError(r1.error)} · Fallback creditos_aula: ${formatPostgrestError(r2.error)}`
    );
  }

  revalidatePath(`/alunos/${input.alunoId}`);
}
