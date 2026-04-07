"use server";

import { revalidatePath } from "next/cache";
import { useDataMock } from "@/lib/data-mock";
import {
  mockApagarRemada,
  mockApagarTodasRemadas,
  mockAtualizarRemada,
  mockCancelarRemada,
  mockCriarRemadasInsert,
  mockListarRemadasAdmin,
  mockMarcarRemadaAgendada,
  mockMarcarRemadaConcluida,
  mockSincronizarRemadasAtrasadasOnly,
} from "@/lib/mock-data/server";
import {
  combinarDataHoraLocal,
  gerarLinhasRemada,
  type RemadaLinha,
} from "@/lib/remadas-geracao";
import {
  linhaParaInsertRemada,
  validarPayloadCriacaoRemadas,
  type PayloadCriarRemadasBruto,
} from "@/lib/remadas-validacao";
import { createClient } from "@/lib/supabase/server";
import {
  formatPostgrestError,
  isPostgrestCheckConstraintViolation,
  type PostgrestLikeError,
} from "@/lib/supabase-error";
import {
  mapearLinhaRemadaAdmin,
  nomeColunaVagasRemada,
  ordenarRemadasPorDataHora,
  statusValorGravarCancelamentoRemada,
  statusValorGravarConcluidaRemada,
} from "@/lib/remadas-db";
import {
  REMADA_VAGAS_MAX,
  REMADA_VAGAS_MIN,
  normalizarDataYmd,
  normalizarHoraHm,
} from "@/lib/remadas-validacao";

/**
 * Marca como concluídas as remadas ainda agendadas cuja data/hora já passou.
 * Não falha a página se o `CHECK` da base não aceitar o valor — use migração SQL
 * ou `REMADAS_STATUS_AO_CONCLUIR` no `.env.local`.
 */
export async function sincronizarRemadasAgendadasAtrasadas(): Promise<void> {
  if (useDataMock()) {
    mockSincronizarRemadasAtrasadasOnly();
    return;
  }

  try {
    const supabase = await createClient();
    const agora = new Date().toISOString();
    const statusGravar = statusValorGravarConcluidaRemada();
    const { error } = await supabase
      .from("remadas")
      .update({ status: statusGravar })
      .eq("status", "agendada")
      .lte("data_hora", agora);

    if (error) {
      console.warn(
        "[remadas] Sincronização de atrasadas ignorada:",
        formatPostgrestError(error)
      );
    }
  } catch (e) {
    console.warn("[remadas] Sincronização de atrasadas:", e);
  }
}

export async function listarRemadasAdmin(): Promise<RemadaLinha[]> {
  try {
    await sincronizarRemadasAgendadasAtrasadas();
  } catch {
    // sync failure não deve bloquear a listagem
  }

  if (useDataMock()) {
    try {
      return mockListarRemadasAdmin();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[remadas mock]", msg);
      return [];
    }
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("remadas").select("*");

    if (error) throw new Error(formatPostgrestError(error));

    const agora = new Date();
    const linhas = (data ?? [])
      .map((row) => mapearLinhaRemadaAdmin(row as Record<string, unknown>, agora))
      .filter((r): r is RemadaLinha => r != null);

    return ordenarRemadasPorDataHora(linhas);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isRede =
      msg.includes("fetch failed") ||
      msg.includes("ECONNRESET") ||
      msg.includes("ConnectTimeout") ||
      msg.includes("UND_ERR");
    if (isRede) {
      console.warn("[remadas] Sem ligação ao Supabase — a devolver lista vazia.");
      return [];
    }
    throw e;
  }
}

/**
 * Valida no servidor, gera linhas e insere em `public.remadas`
 * (`data_hora`, `vagas`, `status` default no DB / explícito).
 */
export async function criarRemadasLote(
  raw: PayloadCriarRemadasBruto
): Promise<RemadaLinha[]> {
  const v = validarPayloadCriacaoRemadas(raw);
  if (!v.ok) {
    throw new Error(v.erro);
  }

  const linhas = gerarLinhasRemada(v.payload);
  if (linhas.length === 0) {
    throw new Error("Não foi possível gerar remadas. Verifique as datas.");
  }

  const colVagas = nomeColunaVagasRemada();
  const rows = linhas.map((l) => {
    const { vagas, ...rest } = linhaParaInsertRemada(l);
    return { ...rest, [colVagas]: vagas };
  });

  if (useDataMock()) {
    const criadas = mockCriarRemadasInsert(
      rows.map((r) => {
        const rec = r as Record<string, unknown>;
        return {
          data_hora: String(rec.data_hora),
          vagas: Number(rec[colVagas]),
          status: String(rec.status ?? "agendada"),
        };
      })
    );
    revalidatePath("/admin/remadas");
    return criadas;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("remadas")
    .insert(rows)
    .select("*");

  if (error) {
    throw new Error(formatPostgrestError(error));
  }

  revalidatePath("/admin/remadas");

  const agora = new Date();
  return (data ?? [])
    .map((row) =>
      mapearLinhaRemadaAdmin(row as Record<string, unknown>, agora)
    )
    .filter((r): r is RemadaLinha => r != null);
}

/**
 * Remove todas as linhas de `public.remadas`.
 * Falha se existir FK sem ON DELETE CASCADE (ex.: agendamentos a referenciar remada).
 */
export async function apagarTodasRemadas(): Promise<void> {
  if (useDataMock()) {
    mockApagarTodasRemadas();
    revalidatePath("/admin/remadas");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("remadas")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    throw new Error(formatPostgrestError(error));
  }

  revalidatePath("/admin/remadas");
}

const STATUS_CANCELAR_FALLBACK = [
  "cancelada",
  "cancelado",
  "cancelled",
  "canceled",
  "anulada",
] as const;

export async function cancelarRemada(remadaId: string): Promise<void> {
  const id = remadaId?.trim();
  if (!id) throw new Error("Remada inválida.");

  if (useDataMock()) {
    mockCancelarRemada(id);
    revalidatePath("/admin/remadas");
    return;
  }

  const supabase = await createClient();
  const preferido = statusValorGravarCancelamentoRemada();
  const ordem = [
    preferido,
    ...STATUS_CANCELAR_FALLBACK.filter((s) => s !== preferido),
  ];

  let ultimoErro: PostgrestLikeError | null = null;

  for (const status of ordem) {
    const { error } = await supabase
      .from("remadas")
      .update({ status })
      .eq("id", id);

    if (!error) {
      revalidatePath("/admin/remadas");
      return;
    }

    ultimoErro = error as PostgrestLikeError;
    if (!isPostgrestCheckConstraintViolation(error)) {
      throw new Error(formatPostgrestError(ultimoErro));
    }
  }

  throw new Error(
    `${ultimoErro ? formatPostgrestError(ultimoErro) : "Erro 23514."} ` +
      "Nenhum valor de cancelamento é aceite pelo CHECK `remadas_status_check`. " +
      "Corra o SQL em `supabase/fix-remadas-status-check.sql` no Supabase (SQL Editor) " +
      "ou ajuste o CHECK para incluir um dos valores que a app tenta gravar."
  );
}

export async function apagarRemada(remadaId: string): Promise<void> {
  const id = remadaId?.trim();
  if (!id) throw new Error("Remada inválida.");

  if (useDataMock()) {
    mockApagarRemada(id);
    revalidatePath("/admin/remadas");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("remadas").delete().eq("id", id);

  if (error) {
    throw new Error(formatPostgrestError(error));
  }

  revalidatePath("/admin/remadas");
}

export async function marcarRemadaConcluida(remadaId: string): Promise<void> {
  const id = remadaId?.trim();
  if (!id) throw new Error("Remada inválida.");

  if (useDataMock()) {
    mockMarcarRemadaConcluida(id);
    revalidatePath("/admin/remadas");
    return;
  }

  const supabase = await createClient();
  const preferido = statusValorGravarConcluidaRemada();
  const candidatos = [
    "concluida",
    "concluido",
    "realizada",
    "finalizada",
  ] as const;
  const ordem = [
    preferido,
    ...candidatos.filter((c) => c !== preferido),
  ] as readonly string[];

  let ultimoErro: PostgrestLikeError | null = null;

  for (const status of ordem) {
    const { error } = await supabase
      .from("remadas")
      .update({ status })
      .eq("id", id);

    if (!error) {
      revalidatePath("/admin/remadas");
      return;
    }

    ultimoErro = error as PostgrestLikeError;
    if (!isPostgrestCheckConstraintViolation(error)) {
      throw new Error(formatPostgrestError(ultimoErro));
    }
  }

  throw new Error(
    ultimoErro
      ? formatPostgrestError(ultimoErro)
      : "Não foi possível marcar como concluída (CHECK de status na base)."
  );
}

export async function marcarRemadaAgendada(remadaId: string): Promise<void> {
  const id = remadaId?.trim();
  if (!id) throw new Error("Remada inválida.");

  if (useDataMock()) {
    mockMarcarRemadaAgendada(id);
    revalidatePath("/admin/remadas");
    return;
  }

  const supabase = await createClient();

  // Verificar no servidor se a data já passou antes de marcar como agendada.
  const { data: row } = await supabase
    .from("remadas")
    .select("data_hora")
    .eq("id", id)
    .single();

  if (row && new Date(String(row.data_hora)).getTime() <= Date.now()) {
    throw new Error(
      "A data desta remada já passou — não é possível colocá-la como agendada."
    );
  }

  const { error } = await supabase
    .from("remadas")
    .update({ status: "agendada" })
    .eq("id", id);

  if (error) {
    throw new Error(formatPostgrestError(error));
  }

  revalidatePath("/admin/remadas");
}

export async function atualizarRemada(
  remadaId: string,
  input: { dataYmd: string; hora: string; vagas: number }
): Promise<void> {
  const id = remadaId?.trim();
  if (!id) throw new Error("Remada inválida.");

  const dataYmd = normalizarDataYmd(input.dataYmd);
  const hora = normalizarHoraHm(input.hora);
  if (!dataYmd || !hora) {
    throw new Error("Data ou horário inválidos.");
  }
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

  const colVagas = nomeColunaVagasRemada();

  if (useDataMock()) {
    mockAtualizarRemada(id, input);
    revalidatePath("/admin/remadas");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("remadas")
    .update({
      data_hora: base.toISOString(),
      [colVagas]: input.vagas,
    })
    .eq("id", id);

  if (error) {
    throw new Error(formatPostgrestError(error));
  }

  revalidatePath("/admin/remadas");
}
