import type { SupabaseClient } from "@supabase/supabase-js";

/** Uma linha por dia (YYYY-MM-DD), como devolvido por `dateKeyLocal`. */
export type MeteoDiaSnapshot = {
  temperatura_c: number;
  icon: string | null;
};

/** Fuso usado para “hoje” e para a janela de previsão (alinhado ao n8n / estúdio). */
export const METEO_FUSO_PADRAO = "America/Sao_Paulo";

/** Dias a partir de hoje (inclui hoje) com previsão “válida”; o passado não tem limite. */
export const METEO_DIAS_SEGUINTES = 7;

/** Mesmo formato que `dateKeyLocal` (YYYY-MM-DD com zeros), para bater com o calendário. */
export function normalizarChaveYmd(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") {
    const m = raw.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    }
    return raw.trim().slice(0, 10);
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getUTCFullYear();
    const mo = String(raw.getUTCMonth() + 1).padStart(2, "0");
    const d = String(raw.getUTCDate()).padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  return normalizarChaveYmd(String(raw));
}

function civilYmdMaisDias(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d + delta);
  const nd = new Date(t);
  return `${nd.getUTCFullYear()}-${String(nd.getUTCMonth() + 1).padStart(2, "0")}-${String(nd.getUTCDate()).padStart(2, "0")}`;
}

export function hojeYmdNoFuso(fuso = METEO_FUSO_PADRAO): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Chaves `YYYY-MM-DD` do dia de hoje (no fuso) até hoje + (n − 1) dias. */
export function chavesProximosNDias(
  n: number,
  fuso = METEO_FUSO_PADRAO
): string[] {
  const hoje = hojeYmdNoFuso(fuso);
  return Array.from({ length: n }, (_, i) => civilYmdMaisDias(hoje, i));
}

/**
 * Para o calendário: **todo o passado** (dias &lt; hoje) entra se existir na origem;
 * **hoje e o futuro** ficam só nos próximos `diasSeguintes` dias (previsão).
 *
 * Passe `hojeYmd` igual a `dateKeyLocal(new Date())` no cliente para coincidir com as células do calendário.
 * Sem `hojeYmd`, usa o dia atual em `America/Sao_Paulo` (útil só em SSR isolado).
 */
export function filtrarPrevisaoMeteoJanela(
  record: Record<string, MeteoDiaSnapshot>,
  diasSeguintes = METEO_DIAS_SEGUINTES,
  hojeYmd?: string
): Record<string, MeteoDiaSnapshot> {
  const hoje =
    hojeYmd != null && hojeYmd.trim() !== ""
      ? normalizarChaveYmd(hojeYmd)
      : hojeYmdNoFuso(METEO_FUSO_PADRAO);
  const futuroPermitido = new Set(
    Array.from({ length: diasSeguintes }, (_, i) => civilYmdMaisDias(hoje, i))
  );
  const out: Record<string, MeteoDiaSnapshot> = {};
  for (const [kRaw, v] of Object.entries(record)) {
    const k = normalizarChaveYmd(kRaw);
    if (!k) continue;
    if (k < hoje) out[k] = v;
    else if (futuroPermitido.has(k)) out[k] = v;
  }
  return out;
}

export async function listarPrevisaoMeteoDiaria(
  supabase: SupabaseClient,
  localId = "default"
): Promise<Record<string, MeteoDiaSnapshot>> {
  const { data, error } = await supabase
    .from("meteo_previsao_diaria")
    .select("dia, temperatura_c, icon")
    .eq("local_id", localId)
    .order("dia", { ascending: true });

  if (error) {
    console.error("[meteo]", error.message);
    return {};
  }

  const out: Record<string, MeteoDiaSnapshot> = {};
  for (const row of data ?? []) {
    const dia = normalizarChaveYmd(row.dia);
    if (!dia) continue;
    out[dia] = {
      temperatura_c: Number(row.temperatura_c),
      icon: row.icon,
    };
  }
  return out;
}
