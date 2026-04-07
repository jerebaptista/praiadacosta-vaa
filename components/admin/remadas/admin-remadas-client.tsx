"use client";

import { useEffect, useMemo, useState } from "react";
import {
  format,
  getMonth,
  getYear,
  setMonth,
  setYear,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { CriarRemadaDialog } from "@/components/admin/remadas/criar-remada-dialog";
import { RemadasCalendarioView } from "@/components/admin/remadas/remadas-calendario-view";
import { RemadasTabela } from "@/components/admin/remadas/remadas-tabela";
import type { RemadaLinha, RemadaStatus } from "@/lib/remadas-geracao";

const MESES = Array.from({ length: 12 }, (_, i) => i);

type FiltroStatus = "todos" | RemadaStatus;

type Props = {
  initialRemadas: RemadaLinha[];  
};

export function AdminRemadasClient({ initialRemadas }: Props) {
  const [remadas, setRemadas] = useState<RemadaLinha[]>(initialRemadas);
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");

  useEffect(() => {
    setRemadas(initialRemadas);
  }, [initialRemadas]);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [aba, setAba] = useState<"tabela" | "calendario">("tabela");

  const anoAtual = getYear(new Date());

  const anosNoFiltro = useMemo(() => {
    const s = new Set<number>();
    for (const r of remadas) {
      s.add(getYear(new Date(r.data_hora)));
    }
    const arr = Array.from(s).sort((a, b) => a - b);
    return arr.length > 0 ? arr : [anoAtual];
  }, [remadas, anoAtual]);

  useEffect(() => {
    const y = getYear(mes);
    if (!anosNoFiltro.includes(y)) {
      const pick = anosNoFiltro[0] ?? anoAtual;
      setMes((m) => startOfMonth(setYear(m, pick)));
    }
  }, [anosNoFiltro, mes, anoAtual]);

  const filtradas = useMemo(() => {
    const y = getYear(mes);
    const m = getMonth(mes);
    return remadas.filter((r) => {
      const d = new Date(r.data_hora);
      if (d.getFullYear() !== y || d.getMonth() !== m) return false;
      if (filtroStatus !== "todos" && r.status !== filtroStatus) return false;
      return true;
    });
  }, [remadas, mes, filtroStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Remadas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Acompanhe e gerencie todas as remadas do mês.
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0 gap-2"
          onClick={() => setDialogAberto(true)}
        >
          <Plus className="size-4" />
          Criar remada
        </Button>
      </div>

      <CriarRemadaDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        onSalvar={(linhas) =>
          setRemadas((prev) => [...linhas, ...prev])
        }
      />

      <Tabs
        value={aba}
        onValueChange={(v) => setAba(v as "tabela" | "calendario")}
        className="w-full space-y-4 overflow-visible"
      >
        <div className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-2 overflow-visible py-1">
          <TabsList className="h-9 shrink-0 bg-muted">
            <TabsTrigger
              value="tabela"
              className="size-8 p-0 px-0"
              title="Tabela"
            >
              <Table2 className="size-4" />
              <span className="sr-only">Tabela</span>
            </TabsTrigger>
            <TabsTrigger
              value="calendario"
              className="size-8 p-0 px-0"
              title="Calendário"
            >
              <CalendarDays className="size-4" />
              <span className="sr-only">Calendário</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 overflow-visible sm:flex-nowrap">
            <Select
              value={String(getMonth(mes))}
              onValueChange={(v) =>
                setMes(startOfMonth(setMonth(mes, Number(v))))
              }
            >
              <SelectTrigger className="h-8 w-[6.5rem] shrink-0">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((i) => (
                  <SelectItem key={i} value={String(i)}>
                    {format(new Date(2024, i, 15), "LLLL", { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(getYear(mes))}
              onValueChange={(v) =>
                setMes(startOfMonth(setYear(mes, Number(v))))
              }
            >
              <SelectTrigger className="h-8 w-[6.5rem] shrink-0">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {anosNoFiltro.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filtroStatus}
              onValueChange={(v) => setFiltroStatus(v as FiltroStatus)}
            >
              <SelectTrigger className="h-8 w-[7.5rem] shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="agendada">Agendada</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="tabela" className="mt-0 outline-none">
          <RemadasTabela dados={filtradas} />
        </TabsContent>
        <TabsContent value="calendario" className="mt-0 outline-none">
          <RemadasCalendarioView
            mes={mes}
            onMesChange={setMes}
            filtradas={filtradas}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
