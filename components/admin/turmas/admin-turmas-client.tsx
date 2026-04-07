"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Plus, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CriarTurmaDialog } from "@/components/admin/turmas/criar-turma-dialog";
import { TurmasTabela } from "@/components/admin/turmas/turmas-tabela";
import { TurmasSemanaView } from "@/components/admin/turmas/turmas-semana-view";
import { type TurmaLinha, type TurmaStatus } from "@/lib/turmas-tipos";

type FiltroStatus = "todas" | TurmaStatus;

type Props = {
  initialTurmas: TurmaLinha[];
};

export function AdminTurmasClient({ initialTurmas }: Props) {
  const [turmas, setTurmas] = useState<TurmaLinha[]>(initialTurmas);
  const [criarAberto, setCriarAberto] = useState(false);
  const [aba, setAba] = useState<"tabela" | "calendario">("tabela");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todas");

  function onCriada(t: TurmaLinha) {
    setTurmas((prev) => [...prev, t]);
  }

  const filtradas = useMemo(() => {
    if (filtroStatus === "todas") return turmas;
    return turmas.filter((t) => t.status === filtroStatus);
  }, [turmas, filtroStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Turmas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Aulas recorrentes com dias e horários fixos na semana.
          </p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => setCriarAberto(true)}>
          <Plus className="size-4" />
          Nova turma
        </Button>
      </div>

      <CriarTurmaDialog
        open={criarAberto}
        onOpenChange={setCriarAberto}
        onCriada={onCriada}
        turmasExistentes={turmas}
      />

      <Tabs
        value={aba}
        onValueChange={(v) => setAba(v as "tabela" | "calendario")}
        className="w-full space-y-4 overflow-visible"
      >
        <div className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-2 overflow-visible py-1">
          <TabsList className="h-9 shrink-0 bg-muted">
            <TabsTrigger value="tabela" className="size-8 p-0 px-0" title="Tabela">
              <Table2 className="size-4" />
              <span className="sr-only">Tabela</span>
            </TabsTrigger>
            <TabsTrigger value="calendario" className="size-8 p-0 px-0" title="Calendário">
              <CalendarDays className="size-4" />
              <span className="sr-only">Calendário</span>
            </TabsTrigger>
          </TabsList>

          <Select
            value={filtroStatus}
            onValueChange={(v) => setFiltroStatus(v as FiltroStatus)}
          >
            <SelectTrigger className="h-8 w-[7.5rem] shrink-0">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="inativa">Inativa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="tabela" className="mt-0 outline-none">
          <TurmasTabela turmas={filtradas} turmasExistentes={turmas} />
        </TabsContent>
        <TabsContent value="calendario" className="mt-0 outline-none">
          <TurmasSemanaView filtradas={filtradas} turmasExistentes={turmas} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
