/** Erro típico retornado pelo cliente Supabase / PostgREST. */
export type PostgrestLikeError = {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

/**
 * Texto único para logs, toasts e mensagens ao usuário.
 * Inclui código PostgreSQL/PostgREST quando existir (ex.: 23505, PGRST301).
 */
export function formatPostgrestError(e: PostgrestLikeError): string {
  const code = e.code?.trim() || "sem código";
  const parts: string[] = [`[${code}] ${e.message}`];
  if (e.details) parts.push(`Detalhes: ${e.details}`);
  if (e.hint) parts.push(`Dica: ${e.hint}`);
  return parts.join(" ");
}

export function throwPostgrest(e: PostgrestLikeError): never {
  throw new Error(formatPostgrestError(e));
}

/** PostgreSQL 23514 = violação de CHECK. */
export function isPostgrestCheckConstraintViolation(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const o = e as { code?: string; message?: string };
  if (o.code === "23514") return true;
  const msg = (o.message ?? "").toLowerCase();
  return (
    msg.includes("23514") ||
    msg.includes("check constraint") ||
    msg.includes("violates check constraint")
  );
}
