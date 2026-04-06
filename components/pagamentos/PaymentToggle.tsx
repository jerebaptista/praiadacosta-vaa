"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { atualizarPagamentoMensal } from "@/app/actions/pagamentos";

type Props = {
  alunoId: string;
  mes: string;
  initialStatus: "pendente" | "pago";
};

export function PaymentToggle({ alunoId, mes, initialStatus }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const isPago = initialStatus === "pago";

  function toggle() {
    setErro(null);
    const next = isPago ? "pendente" : "pago";
    startTransition(async () => {
      try {
        await atualizarPagamentoMensal({
          alunoId,
          mes,
          status: next,
        });
        router.refresh();
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Erro ao atualizar pagamento.";
        setErro(msg);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={isPago}
        aria-describedby={erro ? `pay-err-${alunoId}` : undefined}
        disabled={pending}
        onClick={toggle}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 ${
          isPago ? "bg-emerald-500" : "bg-red-400"
        }`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
            isPago ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
      {erro && (
        <p
          id={`pay-err-${alunoId}`}
          className="max-w-[14rem] text-right text-[10px] leading-tight text-red-600"
          role="alert"
        >
          {erro}
        </p>
      )}
    </div>
  );
}
