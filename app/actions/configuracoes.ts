"use server";

import { revalidatePath } from "next/cache";
import { useDataMock } from "@/lib/data-mock";
import {
  mockObterPrecoPorAula,
  mockSalvarPrecoPorAula,
} from "@/lib/mock-data/server";
import { createClient } from "@/lib/supabase/server";
import { formatPostgrestError } from "@/lib/supabase-error";

function arredondarMoeda(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Valor unitário por aula ou null se não configurado (≤ 0). */
export async function obterPrecoPorAula(): Promise<number | null> {
  if (useDataMock()) {
    return mockObterPrecoPorAula();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("estudio_config")
    .select("preco_por_aula")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(formatPostgrestError(error));
  const row = data as { preco_por_aula?: unknown } | null;
  const v = row?.preco_por_aula != null ? Number(row.preco_por_aula) : 0;
  if (!Number.isFinite(v) || v <= 0) return null;
  return arredondarMoeda(v);
}

export async function salvarPrecoPorAula(valor: number): Promise<void> {
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("O preço por aula deve ser maior que zero.");
  }
  const v = arredondarMoeda(n);
  if (v > 999_999.99) {
    throw new Error("Valor demasiado alto.");
  }

  if (useDataMock()) {
    mockSalvarPrecoPorAula(v);
    revalidatePath("/admin/configuracoes");
    revalidatePath("/admin/planos");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("estudio_config").upsert(
    { id: 1, preco_por_aula: v },
    { onConflict: "id" }
  );

  if (error) throw new Error(formatPostgrestError(error));

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/planos");
}
