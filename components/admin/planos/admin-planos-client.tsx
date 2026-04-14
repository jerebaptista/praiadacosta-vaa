"use client";

import { useState } from "react";
import { Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanoCadastroDrawer } from "@/components/admin/planos/plano-cadastro-drawer";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PlanosAlunosAreaChart } from "@/components/admin/planos/planos-alunos-area-chart";
import { PlanosTabela } from "@/components/admin/planos/planos-tabela";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  LIMITE_PLANOS_TOTAL,
  MSG_LIMITE_PLANOS_TOTAL_CRIAR,
  type PlanoLinha,
} from "@/lib/planos-tipos";

type Props = {
  initialPlanos: PlanoLinha[];
  /** Preço por aula (Configurações). */
  precoPorAula: number | null;
};

export function AdminPlanosClient({ initialPlanos, precoPorAula }: Props) {
  const [criarAberto, setCriarAberto] = useState(false);

  const totalPlanos = initialPlanos.length;
  const limiteTotalAtingido = totalPlanos >= LIMITE_PLANOS_TOTAL;

  const abrirNovoPlano = () => {
    if (limiteTotalAtingido) return;
    setCriarAberto(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Preços por recorrência (mensal, trimestral, semestral e anual) e aulas
            por semana de cada plano.
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex shrink-0",
                limiteTotalAtingido && "cursor-not-allowed"
              )}
            >
              <Button
                className="gap-2"
                type="button"
                disabled={limiteTotalAtingido}
                onClick={abrirNovoPlano}
              >
                <Plus className="size-4" />
                Novo plano
              </Button>
            </span>
          </TooltipTrigger>
          {limiteTotalAtingido ? (
            <TooltipContent side="bottom">{MSG_LIMITE_PLANOS_TOTAL_CRIAR}</TooltipContent>
          ) : null}
        </Tooltip>
      </div>

      <PlanoCadastroDrawer
        open={criarAberto}
        onOpenChange={setCriarAberto}
        planosExistentes={initialPlanos}
        precoPorAula={precoPorAula}
      />

      {initialPlanos.length > 0 ? (
        <>
          <PlanosAlunosAreaChart planos={initialPlanos} />
          <PlanosTabela planos={initialPlanos} precoPorAula={precoPorAula} />
        </>
      ) : (
        <Empty className="border border-dashed border-border bg-muted/20 py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers className="size-4" />
            </EmptyMedia>
            <EmptyTitle>Nenhum plano</EmptyTitle>
            <EmptyDescription>
              Cadastre o primeiro plano para definir aulas por semana e valores
              por período.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "inline-flex",
                    limiteTotalAtingido && "cursor-not-allowed"
                  )}
                >
                  <Button
                    type="button"
                    className="gap-2"
                    disabled={limiteTotalAtingido}
                    onClick={abrirNovoPlano}
                  >
                    <Plus className="size-4" />
                    Novo plano
                  </Button>
                </span>
              </TooltipTrigger>
              {limiteTotalAtingido ? (
                <TooltipContent side="bottom">
                  {MSG_LIMITE_PLANOS_TOTAL_CRIAR}
                </TooltipContent>
              ) : null}
            </Tooltip>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
