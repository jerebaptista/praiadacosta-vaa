"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { throwPostgrest } from "@/lib/supabase-error";

export async function atualizarPagamentoMensal(input: {
  alunoId: string;
  mes: string;
  status: "pendente" | "pago";
}) {
  const supabase = await createClient();
  const pagoEm = input.status === "pago" ? new Date().toISOString() : null;

  const { data: existing } = await supabase
    .from("pagamentos_mensais")
    .select("id")
    .eq("aluno_id", input.alunoId)
    .eq("mes", input.mes)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("pagamentos_mensais")
      .update({
        status: input.status,
        pago_em: pagoEm,
      })
      .eq("id", existing.id);
    if (error) throwPostgrest(error);
  } else {
    const { error } = await supabase.from("pagamentos_mensais").insert({
      aluno_id: input.alunoId,
      mes: input.mes,
      status: input.status,
      pago_em: pagoEm,
    });
    if (error) throwPostgrest(error);
  }

  revalidatePath("/pagamentos");
  revalidatePath(`/alunos/${input.alunoId}`);
}
