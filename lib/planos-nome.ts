/** Mensagem quando o nome coincide com outro plano (comparação sem diferenciar maiúsculas/minúsculas). */
export const MSG_NOME_PLANO_DUPLICADO =
  "Já existe um plano com este nome.";

export function nomesPlanoEquivalentes(a: string, b: string): boolean {
  const x = a.trim();
  const y = b.trim();
  if (x === "" || y === "") return false;
  return x.localeCompare(y, "pt-BR", { sensitivity: "base" }) === 0;
}

/** Indica se outro plano (além de `excluirPlanoId`, se houver) já usa o mesmo nome. */
export function existeOutroPlanoComMesmoNome(
  planos: { id: string; nome: string }[],
  nomeCandidato: string,
  excluirPlanoId?: string
): boolean {
  const t = nomeCandidato.trim();
  if (t === "") return false;
  return planos.some(
    (p) =>
      (excluirPlanoId == null || p.id !== excluirPlanoId) &&
      nomesPlanoEquivalentes(p.nome, t)
  );
}
