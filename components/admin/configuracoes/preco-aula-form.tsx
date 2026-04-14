"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { salvarPrecoPorAula } from "@/app/actions/configuracoes";
import { InputMoedaBrl } from "@/components/ui/input-moeda-brl";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SEMANAS_REFERENCIA_MENSAL_PRECO_AULA } from "@/lib/estudio-config";
import { parseMoedaOpcional, valorPrecoParaInput } from "@/lib/plano-form";

type Props = {
  valorInicial: number | null;
  /** Chamado após guardar com sucesso no servidor. */
  onSalvo?: () => void;
};

export function PrecoAulaForm({ valorInicial, onSalvo }: Props) {
  const uid = useId();
  const idCampo = `${uid}-preco-aula`;
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startTransition] = useTransition();

  useEffect(() => {
    setValor(
      valorInicial != null && valorInicial > 0 ? valorPrecoParaInput(valorInicial) : ""
    );
  }, [valorInicial]);

  function handleSalvar() {
    setErro(null);
    const n = parseMoedaOpcional(valor);
    if (n == null || n <= 0) {
      setErro("Informe um preço por aula maior que zero.");
      return;
    }
    startTransition(async () => {
      try {
        await salvarPrecoPorAula(n);
        onSalvo?.();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível guardar.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={idCampo} className="text-sm">
          Preço por aula
        </Label>
        <InputMoedaBrl
          id={idCampo}
          className="h-9 max-w-xs"
          value={valor}
          onValueChange={setValor}
          placeholder="Ex.: R$ 50,00"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Usado como referência no plano (desconto do mensal e totais por quantidade de aulas na semana).
        A referência mensal do desconto considera {SEMANAS_REFERENCIA_MENSAL_PRECO_AULA} semanas sobre o
        total semanal (preço × aulas/semana).
      </p>
      {erro ? (
        <p className="text-sm text-destructive" role="alert">
          {erro}
        </p>
      ) : null}
      <Button type="button" disabled={salvando} onClick={() => void handleSalvar()}>
        {salvando ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Salvando...
          </>
        ) : (
          "Guardar"
        )}
      </Button>
    </div>
  );
}
