import { LABEL_DIA_SEMANA, ORDEM_DIA_SEMANA } from "@/lib/remadas-geracao";
import { pickRemadaDataHora } from "@/lib/remada-display";

/** Instantâneo da remada para ordenação (data_hora ISO ou data+horário). */
export function remadaInstanteMs(
  emb: Record<string, unknown> | null | undefined
): number | null {
  if (!emb || typeof emb !== "object") return null;
  const dh = emb.data_hora;
  if (dh != null && String(dh).trim() !== "") {
    const t = new Date(String(dh)).getTime();
    return Number.isNaN(t) ? null : t;
  }
  const rawD =
    (typeof emb.data === "string" && emb.data) ||
    (typeof emb.data_aula === "string" && emb.data_aula) ||
    null;
  const rawH = emb.horario ?? emb.hora_inicio ?? emb.hora ?? emb.inicio;
  if (!rawD || rawH == null || String(rawH).trim() === "") return null;
  const ds = String(rawD).slice(0, 10);
  const hs = String(rawH).slice(0, 5);
  const t = new Date(`${ds}T${hs}:00`).getTime();
  return Number.isNaN(t) ? null : t;
}

function remadaCancelada(emb: Record<string, unknown> | null): boolean {
  if (!emb) return true;
  const st = String(emb.status ?? "agendada").toLowerCase();
  return st.includes("cancel");
}

function agendamentoCancelado(agStatus: string): boolean {
  return String(agStatus).toLowerCase().includes("cancel");
}

export type EmbComInstante = {
  emb: Record<string, unknown> | null;
  instante: number;
};

/** Filtra remadas futuras (>= agora) e não canceladas. */
export function futurasRemadasAluno(
  agRows: { remada_id: string; status: string; remadas?: unknown }[],
  remadaMap: Map<string, Record<string, unknown>>
): EmbComInstante[] {
  const now = Date.now();
  const out: EmbComInstante[] = [];

  for (const ag of agRows) {
    if (agendamentoCancelado(ag.status)) continue;
    const emb =
      ag.remadas != null
        ? ((Array.isArray(ag.remadas) ? ag.remadas[0] : ag.remadas) as Record<
            string,
            unknown
          >)
        : remadaMap.get(ag.remada_id) ?? null;
    if (!emb || remadaCancelada(emb)) continue;
    const instante = remadaInstanteMs(emb);
    if (instante == null || instante < now) continue;
    out.push({ emb, instante });
  }

  out.sort((a, b) => a.instante - b.instante);
  return out;
}

/** Próxima remada para exibição (data e horário já formatados pt-BR). */
export function proximaRemadaExibicao(
  futuras: EmbComInstante[]
): { data: string; horario: string } | null {
  const first = futuras[0];
  if (!first) return null;
  return pickRemadaDataHora(first.emb);
}

/**
 * Resumo tipo "Seg, Qua · 07:00" a partir das próximas ocorrências.
 */
export function turmaResumoDeRemadas(futuras: EmbComInstante[]): string | null {
  if (futuras.length === 0) return null;

  const amostra = futuras.slice(0, 24);
  type Slot = { wd: number; hm: string };
  const vistos = new Map<string, Slot>();

  for (const { emb, instante } of amostra) {
    if (!emb) continue;
    const d = new Date(instante);
    const wd = d.getDay();
    const hm = d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const key = `${wd}-${hm}`;
    if (!vistos.has(key)) vistos.set(key, { wd, hm });
  }

  const porHora = new Map<string, number[]>();
  for (const { wd, hm } of vistos.values()) {
    const arr = porHora.get(hm) ?? [];
    if (!arr.includes(wd)) arr.push(wd);
    porHora.set(hm, arr);
  }

  const partes: string[] = [];
  const horasOrdenadas = [...porHora.keys()].sort();
  for (const hm of horasOrdenadas) {
    const dias = porHora.get(hm)!;
    const ordenados = [...dias].sort(
      (a, b) =>
        ORDEM_DIA_SEMANA.indexOf(a as (typeof ORDEM_DIA_SEMANA)[number]) -
        ORDEM_DIA_SEMANA.indexOf(b as (typeof ORDEM_DIA_SEMANA)[number])
    );
    const labels = ordenados.map((d) => LABEL_DIA_SEMANA[d]).join(", ");
    partes.push(`${labels} · ${hm}`);
  }

  return partes.length ? partes.join(" · ") : null;
}
