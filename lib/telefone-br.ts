/** DDI do Brasil (E.164 sem +). */
export const TELEFONE_DDI_BR = "55";

/**
 * Extrai até 11 dígitos nacionais (DDD + assinante) a partir do valor guardado.
 * Aceita `21999999999`, `(21) 99999-9999` ou `+5521999999999`.
 */
export function digitosNacionaisTelefoneBr(
  stored: string | null | undefined
): string {
  let d = String(stored ?? "").replace(/\D/g, "");
  if (d.startsWith(TELEFONE_DDI_BR) && d.length >= 12) {
    d = d.slice(TELEFONE_DDI_BR.length);
  }
  return d.slice(0, 11);
}

/**
 * Máscara para o campo só com número brasileiro: (00) 00000-0000 ou (00) 0000-0000.
 */
export function formatarTelefoneNacionalInput(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (!d.length) return "";
  const ddd = d.slice(0, 2);
  if (d.length <= 2) return `(${d}`;
  const r = d.slice(2);
  if (!r.length) return `(${ddd}) `;
  if (d.length === 11) {
    return `(${ddd}) ${r.slice(0, 5)}-${r.slice(5)}`;
  }
  if (d.length === 10) {
    return `(${ddd}) ${r.slice(0, 4)}-${r.slice(4)}`;
  }
  if (r[0] === "9") {
    if (r.length <= 5) return `(${ddd}) ${r}`;
    return `(${ddd}) ${r.slice(0, 5)}-${r.slice(5)}`;
  }
  if (r.length <= 4) return `(${ddd}) ${r}`;
  return `(${ddd}) ${r.slice(0, 4)}-${r.slice(4)}`;
}

/** Valor para gravar no banco: `+55` + dígitos nacionais, ou `undefined` se vazio. */
export function telefoneBrasilParaArmazenar(nacionalFormatado: string): string | undefined {
  const d = nacionalFormatado.replace(/\D/g, "");
  if (!d.length) return undefined;
  return `+${TELEFONE_DDI_BR}${d}`;
}

/** Exibição com DDI: +55 (00) 00000-0000 */
export function formatarTelefoneBrasilExibicao(
  stored: string | null | undefined
): string {
  const d = digitosNacionaisTelefoneBr(stored);
  if (!d.length) return "";
  const ddd = d.slice(0, 2);
  const r = d.slice(2);
  if (d.length === 11) {
    return `+${TELEFONE_DDI_BR} (${ddd}) ${r.slice(0, 5)}-${r.slice(5)}`;
  }
  if (d.length === 10) {
    return `+${TELEFONE_DDI_BR} (${ddd}) ${r.slice(0, 4)}-${r.slice(4)}`;
  }
  if (d.length >= 2) {
    return `+${TELEFONE_DDI_BR} (${ddd}) ${r}`;
  }
  return `+${TELEFONE_DDI_BR} (${d}`;
}
