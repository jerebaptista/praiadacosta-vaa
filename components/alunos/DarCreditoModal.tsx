"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  darCredito,
  type MotivoCredito,
} from "@/app/actions/creditos";
import { fimDoMesSeguintePadrao } from "@/lib/dates";

const MOTIVOS: { value: MotivoCredito; label: string }[] = [
  { value: "indicacao", label: "Indicação" },
  { value: "retorno", label: "Retorno" },
  { value: "bonificacao", label: "Bonificação" },
  { value: "outro", label: "Outro" },
];

type Props = { alunoId: string };

export function DarCreditoModal({ alunoId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantidade, setQuantidade] = useState("1");
  const [motivo, setMotivo] = useState<MotivoCredito>("bonificacao");
  const [dataVencimento, setDataVencimento] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function abrir() {
    setErro(null);
    setQuantidade("1");
    setMotivo("bonificacao");
    setDataVencimento(fimDoMesSeguintePadrao());
    setOpen(true);
  }

  function fechar() {
    setOpen(false);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const q = Number(quantidade);
    if (!Number.isFinite(q) || q < 1) {
      setErro("Informe uma quantidade válida (mínimo 1).");
      return;
    }
    const venc =
      dataVencimento.trim() === "" ? null : dataVencimento.trim();

    startTransition(async () => {
      try {
        await darCredito({
          alunoId,
          quantidade: q,
          motivo,
          dataVencimento: venc,
        });
        fechar();
        router.refresh();
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao salvar.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={abrir}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
      >
        Dar crédito
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) fechar();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dar-credito-titulo"
      >
        <h2
          id="dar-credito-titulo"
          className="text-lg font-semibold text-zinc-900"
        >
          Dar crédito
        </h2>
        <form onSubmit={enviar} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="qtd"
              className="block text-sm font-medium text-zinc-700"
            >
              Quantidade de créditos
            </label>
            <input
              id="qtd"
              type="number"
              min={1}
              step={1}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label
              htmlFor="motivo"
              className="block text-sm font-medium text-zinc-700"
            >
              Motivo
            </label>
            <select
              id="motivo"
              value={motivo}
              onChange={(e) =>
                setMotivo(e.target.value as MotivoCredito)
              }
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {MOTIVOS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="venc"
              className="block text-sm font-medium text-zinc-700"
            >
              Data de vencimento (opcional)
            </label>
            <p className="mt-0.5 text-xs text-zinc-500">
              Padrão ao abrir: fim do mês seguinte. Se deixar em branco, no banco{" "}
              <code className="rounded bg-zinc-100 px-0.5">creditos_aula</code>{" "}
              gravamos validade longa (2099) para satisfazer{" "}
              <code className="rounded bg-zinc-100 px-0.5">expira_em</code>.
            </p>
            <input
              id="venc"
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              className="mt-1 text-xs text-teal-700 underline"
              onClick={() => setDataVencimento("")}
            >
              Limpar (sem vencimento)
            </button>
          </div>
          {erro && (
            <p className="text-sm text-red-600" role="alert">
              {erro}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={fechar}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {pending ? "Salvando…" : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
