type Props = {
  title?: string;
  message: string;
  contexto?: string;
  /** Quando a falha é rede/timeout (não chegou ao PostgREST). */
  erroRede?: boolean;
};

/**
 * Erro vindo de GET/SSR no Supabase: mensagem legível + bloco técnico para debug.
 */
export function QueryErrorPanel({
  title = "Não foi possível carregar os dados",
  message,
  contexto,
  erroRede = false,
}: Props) {
  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50/90 p-5 text-red-950 shadow-sm"
      role="alert"
    >
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-2 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
        {message}
      </p>
      {contexto && (
        <p className="mt-3 text-xs text-red-800/90">{contexto}</p>
      )}
      {erroRede ? (
        <p className="mt-4 text-xs text-red-800/80">
          Dica: confira sua conexão com a internet, VPN, firewall corporativo e se o
          projeto está ativo no painel do Supabase. Em desenvolvimento local, confira
          também <code className="rounded bg-red-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code>.
        </p>
      ) : (
        <p className="mt-4 text-xs text-red-800/80">
          Dica: erros com código{" "}
          <code className="rounded bg-red-100 px-1">42501</code> ou menção a{" "}
          <strong>RLS</strong> costumam ser política de segurança no Supabase.
          Códigos como <code className="rounded bg-red-100 px-1">23503</code>{" "}
          indicam problema de chave estrangeira.
        </p>
      )}
    </div>
  );
}
