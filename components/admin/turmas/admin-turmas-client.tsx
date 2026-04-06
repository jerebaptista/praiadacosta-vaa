"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CriarTurmaDialog } from "@/components/admin/turmas/criar-turma-dialog";
import { TurmasTabela } from "@/components/admin/turmas/turmas-tabela";
import type { TurmaLinha } from "@/lib/turmas-tipos";

type Props = {
  initialTurmas: TurmaLinha[];
};

export function AdminTurmasClient({ initialTurmas }: Props) {
  const [turmas, setTurmas] = useState<TurmaLinha[]>(initialTurmas);
  const [criarAberto, setCriarAberto] = useState(false);

  function onCriada(t: TurmaLinha) {
    setTurmas((prev) => [...prev, t]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Turmas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Horários fixos semanais do estúdio.
          </p>
        </div>
        <Button size="sm" onClick={() => setCriarAberto(true)}>
          <Plus className="mr-1.5 size-4" />
          Nova turma
        </Button>
      </div>

      <TurmasTabela turmas={turmas} />

      <CriarTurmaDialog
        open={criarAberto}
        onOpenChange={setCriarAberto}
        onCriada={onCriada}
      />
    </div>
  );
}
