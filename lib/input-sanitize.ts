/**
 * Sanitização defensiva no cliente (profundidade extra; validação definitiva fica no servidor).
 * Reduz risco de caracteres de controlo, bidi, bytes nulos e texto fora do esperado em campos simples.
 */

/** Tamanho máximo do nome do plano (alinhado ao backend). */
export const NOME_PLANO_MAX_LEN = 20;

/** Remove bytes nulos, caracteres de controlo C0/C1, BOM, invisíveis e overrides bidi. */
export function stripEntradaPerigosaBasica(raw: string): string {
  return raw
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\uFEFF/g, "")
    .replace(/[\u200B-\u200D\u2060]/g, "")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "");
}

/**
 * Nome do plano: letras (incl. acentos), números, espaço e pouca pontuação.
 * Bloqueia símbolos típicos de injeção / confusão em contextos HTML ou strings.
 */
export function sanitizarNomePlano(raw: string): string {
  let s = stripEntradaPerigosaBasica(raw).normalize("NFKC");
  s = s.replace(/[`´]/g, "'");
  s = s.replace(/[^\p{L}\p{N}\s'.-]/gu, "");
  s = s.replace(/\s+/g, " ").trim();
  return s.slice(0, NOME_PLANO_MAX_LEN);
}

/**
 * Durante a digitação: remove caracteres perigosos e limita o tamanho.
 * Não faz trim nem junta espaços — permite compor o nome com espaços livres.
 */
export function sanitizarNomePlanoDigitacao(raw: string): string {
  let s = stripEntradaPerigosaBasica(raw).normalize("NFKC");
  s = s.replace(/[`´]/g, "'");
  s = s.replace(/[^\p{L}\p{N}\s'.-]/gu, "");
  return s.slice(0, NOME_PLANO_MAX_LEN);
}

/** Apenas 1–7 (valor do select de aulas por semana). */
export function sanitizarRemadasPorSemana(raw: string): string {
  const t = stripEntradaPerigosaBasica(raw).trim();
  return /^[1-7]$/.test(t) ? t : "1";
}
