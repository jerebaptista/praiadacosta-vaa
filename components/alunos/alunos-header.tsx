"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AlunosHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alunos</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Gerencie os alunos, planos e turmas inscritas.
        </p>
      </div>
      <Button className="shrink-0 gap-2">
        <Plus className="size-4" />
        Novo aluno
      </Button>
    </div>
  );
}
