/** Extrai data/hora exibíveis de uma linha de `remadas` (nomes de coluna variados). */
export function pickRemadaDataHora(
  r: Record<string, unknown> | null | undefined
): { data: string; horario: string } {
  if (!r || typeof r !== "object") {
    return { data: "—", horario: "—" };
  }

  const dh = r.data_hora;
  if (dh != null && dh !== "") {
    const d = new Date(String(dh));
    if (!Number.isNaN(d.getTime())) {
      return {
        data: d.toLocaleDateString("pt-BR"),
        horario: d.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    }
  }

  const rawData =
    (typeof r.data === "string" && r.data) ||
    (typeof r.data_aula === "string" && r.data_aula) ||
    (typeof r.dia === "string" && r.dia) ||
    null;

  let data = "—";
  if (rawData) {
    data = rawData.includes("T")
      ? new Date(rawData).toLocaleDateString("pt-BR")
      : new Date(rawData + "T12:00:00").toLocaleDateString("pt-BR");
  }

  const rawH = r.horario ?? r.hora_inicio ?? r.hora ?? r.inicio;
  let horario = "—";
  if (rawH != null && rawH !== "") {
    const s = String(rawH);
    horario = s.length >= 5 ? s.slice(0, 5) : s;
  }

  return { data, horario };
}
