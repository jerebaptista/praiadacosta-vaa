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
import { CalendarDays, ChevronDown, Plus, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { dateKeyLocal } from "@/lib/calendar-dates";
import {
  filtrarPrevisaoMeteoJanela,
  METEO_DIAS_SEGUINTES,
  type MeteoDiaSnapshot,
} from "@/lib/meteo";
import type { RemadaLinha, RemadaStatus } from "@/lib/remadas-geracao";
import { cn } from "@/lib/utils";

const ROTULO_STATUS_FILTRO: Record<RemadaStatus, string> = {
  agendada: "Agendadas",
  concluida: "Concluídas",
  cancelada: "Canceladas",
};

const MESES = Array.from({ length: 12 }, (_, i) => i);

type FiltroStatus = "todos" | RemadaStatus;

type Props = {
  initialRemadas: RemadaLinha[];
  /** Dados crus (Supabase + demo); o filtro usa o mesmo “hoje” que o calendário (`dateKeyLocal`). */
  previsaoMeteoBruta?: Record<string, MeteoDiaSnapshot>;
};

export function AdminRemadasClient({
  initialRemadas,
  previsaoMeteoBruta = {},
}: Props) {
  const [remadas, setRemadas] = useState<RemadaLinha[]>(initialRemadas);
  const [mes, setMes] = useState(() => startOfMonth(new Date()));
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");

  useEffect(() => {
    setRemadas(initialRemadas);
  }, [initialRemadas]);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [aba, setAba] = useState<"tabela" | "calendario">("calendario");

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

  const previsaoMeteo = useMemo(
    () =>
      filtrarPrevisaoMeteoJanela(
        previsaoMeteoBruta,
        METEO_DIAS_SEGUINTES,
        dateKeyLocal(new Date())
      ),
    [previsaoMeteoBruta]
  );

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
              value="calendario"
              className="size-8 p-0 px-0"
              title="Calendário"
            >
              <CalendarDays className="size-4" />
              <span className="sr-only">Calendário</span>
            </TabsTrigger>
            <TabsTrigger
              value="tabela"
              className="size-8 p-0 px-0"
              title="Tabela"
            >
              <Table2 className="size-4" />
              <span className="sr-only">Tabela</span>
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  aria-label="Filtrar por status"
                  className={cn(
                    "flex h-8 min-w-[7.5rem] shrink-0 items-center justify-between gap-1.5 rounded-lg border-input px-2.5 font-normal",
                    filtroStatus === "todos"
                      ? "text-muted-foreground"
                      : "text-foreground"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {filtroStatus === "todos"
                      ? "Status"
                      : ROTULO_STATUS_FILTRO[filtroStatus]}
                  </span>
                  <ChevronDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[7.5rem]" sideOffset={4}>
                <DropdownMenuRadioGroup
                  value={filtroStatus}
                  onValueChange={(v) => setFiltroStatus(v as FiltroStatus)}
                >
                  <DropdownMenuRadioItem value="todos">Todos</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="agendada">Agendadas</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="concluida">Concluídas</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="cancelada">Canceladas</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <TabsContent value="calendario" className="mt-0 outline-none">
          <RemadasCalendarioView
            mes={mes}
            onMesChange={setMes}
            filtradas={filtradas}
            previsaoPorDia={previsaoMeteo}
          />
        </TabsContent>
        <TabsContent value="tabela" className="mt-0 outline-none">
          <RemadasTabela dados={filtradas} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
