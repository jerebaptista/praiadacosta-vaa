/** Erro típico retornado pelo cliente Supabase / PostgREST. */
export type PostgrestLikeError = {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

/** Falha antes de chegar ao PostgREST (rede, DNS, TLS, timeout do cliente HTTP). */
export function isLikelySupabaseNetworkError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("fetch failed") ||
    m.includes("connect timeout") ||
    m.includes("connection timed out") ||
    m.includes("und_err_") ||
    m.includes("econnrefused") ||
    m.includes("econnreset") ||
    m.includes("enotfound") ||
    m.includes("enetunreach") ||
    m.includes("getaddrinfo") ||
    m.includes("socket hang up") ||
    m.includes("network error")
  );
}

export function supabaseErroEhRede(e: PostgrestLikeError | null | undefined): boolean {
  if (!e) return false;
  if (e.message && isLikelySupabaseNetworkError(e.message)) return true;
  if (e.details && isLikelySupabaseNetworkError(String(e.details))) return true;
  return false;
}

/**
 * Texto único para logs, toasts e mensagens ao usuário.
 * Inclui código PostgreSQL/PostgREST quando existir (ex.: 23505, PGRST301).
 */
export function formatPostgrestError(e: PostgrestLikeError): string {
  const raw = e.message ?? "";
  const detalheStr = e.details ? String(e.details) : "";
  if (isLikelySupabaseNetworkError(raw) || isLikelySupabaseNetworkError(detalheStr)) {
    const detalhes = [raw, e.details].filter(Boolean).join("\n");
    return (
      "Falha de conexão com o Supabase (rede, firewall ou servidor indisponível). " +
      "A requisição não chegou ao banco — não é típico de RLS.\n\n" +
      `Detalhes técnicos:\n${detalhes}`
    );
  }
  const code = e.code?.trim() || "sem código";
  const parts: string[] = [`[${code}] ${raw}`];
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
