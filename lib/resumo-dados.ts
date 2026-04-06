import type { SupabaseClient } from "@supabase/supabase-js";
import { endOfMonth, startOfMonth } from "date-fns";
import { dateKeyLocal } from "@/lib/calendar-dates";

type RemadaRow = { data_hora: string; status?: string | null };

type AgRow = {
  status: string;
  remadas: { data_hora: string } | { data_hora: string }[] | null;
};

function remadaDataHora(ag: AgRow): string | null {
  const r = ag.remadas;
  if (!r) return null;
  if (Array.isArray(r)) return r[0]?.data_hora ?? null;
  return r.data_hora;
}

/** Dias do mês com remada no estúdio + agendamentos / comparecimento do aluno. */
export async function carregarDiasResumo(
  supabase: SupabaseClient,
  opts: { alunoId: string | null; mes: Date }
): Promise<{
  diasEstudio: string[];
  diasAgendados: string[];
  diasCompareceu: string[];
}> {
  const inicio = startOfMonth(opts.mes);
  const fim = endOfMonth(opts.mes);

  const { data: remadasList } = await supabase
    .from("remadas")
    .select("data_hora, status")
    .gte("data_hora", inicio.toISOString())
    .lte("data_hora", fim.toISOString());

  const diasEstudio = new Set<string>();
  for (const r of (remadasList ?? []) as RemadaRow[]) {
    const st = String(r.status ?? "").toLowerCase();
    if (st === "cancelada") continue;
    diasEstudio.add(dateKeyLocal(new Date(r.data_hora)));
  }

  const diasAgendados = new Set<string>();
  const diasCompareceu = new Set<string>();

  if (opts.alunoId) {
    const { data: ags } = await supabase
      .from("agendamentos")
      .select("status, remadas(data_hora)")
      .eq("aluno_id", opts.alunoId);

    for (const row of (ags ?? []) as AgRow[]) {
      const dh = remadaDataHora(row);
      if (!dh) continue;
      const d = new Date(dh);
      if (d < inicio || d > fim) continue;
      const key = dateKeyLocal(d);
      diasAgendados.add(key);
      const st = String(row.status ?? "").toLowerCase();
      if (st === "compareceu" || st === "checkin") {
        diasCompareceu.add(key);
      }
    }
  }

  return {
    diasEstudio: [...diasEstudio],
    diasAgendados: [...diasAgendados],
    diasCompareceu: [...diasCompareceu],
  };
}
