"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Ban,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  apagarRemada,
  cancelarRemada,
  marcarRemadaAgendada,
  marcarRemadaConcluida,
} from "@/app/actions/remadas";
import { EditarRemadaDialog } from "@/components/admin/remadas/editar-remada-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { dateKeyLocal } from "@/lib/calendar-dates";
import type { RemadaLinha, RemadaStatus } from "@/lib/remadas-geracao";
import { cn } from "@/lib/utils";

const DIAS_CABECALHO = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MAX_VISIVEIS = 3;

function formatHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function chipClasses(status: RemadaStatus): string {
  if (status === "agendada")
    return "bg-muted/60 text-muted-foreground hover:bg-muted";
  if (status === "concluida")
    return "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30";
  return "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30";
}

function ChipIcon({ status }: { status: RemadaStatus }) {
  if (status === "concluida")
    return <Check className="size-3 shrink-0" strokeWidth={2.5} />;
  if (status === "cancelada")
    return <X className="size-3 shrink-0" strokeWidth={2.5} />;
  return <Clock className="size-3 shrink-0" strokeWidth={2.5} />;
}

function BadgeStatus({ status }: { status: RemadaStatus }) {
  if (status === "agendada")
    return (
      <Badge variant="outline" className="border-transparent bg-muted font-normal text-muted-foreground">
        Agendada
      </Badge>
    );
  if (status === "concluida")
    return <Badge variant="secondary" className="font-normal">Concluída</Badge>;
  return (
    <Badge variant="outline" className="border-red-200/70 bg-red-500/10 font-normal text-red-700 line-through dark:border-red-900/40 dark:bg-red-500/15 dark:text-red-300">
      Cancelada
    </Badge>
  );
}

/* ── Popover de ações ao clicar num evento ── */
function EventoPopover({
  remada,
  onEditar,
  children,
}: {
  remada: RemadaLinha;
  onEditar: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendente, setPendente] = useState<string | null>(null);
  const bloqueado = pendente !== null;

  const { status, passou } = remada;
  const mostrarConcluir = status === "agendada" || status === "cancelada";
  const mostrarAgendar = !passou && (status === "concluida" || status === "cancelada");
  const mostrarCancelar = status === "agendada" || status === "concluida";

  async function run(chave: string, fn: () => Promise<void>) {
    setPendente(chave);
    try {
      await fn();
      router.refresh();
      setOpen(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Operação não concluída.");
    } finally {
      setPendente(null);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="z-[200] w-64 p-0"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        {/* Topo: status + menu */}
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1">
          <BadgeStatus status={remada.status} />
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7 shrink-0 -mr-1"
                disabled={bloqueado}
                aria-label="Ações"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[300] min-w-44">
              <DropdownMenuItem
                disabled={bloqueado}
                onSelect={() => { setOpen(false); onEditar(); }}
              >
                <Pencil className="size-4" />
                Editar
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {mostrarConcluir && (
                <DropdownMenuItem
                  disabled={bloqueado}
                  onSelect={() => void run("concluir", () => marcarRemadaConcluida(remada.id))}
                >
                  <Check className="size-4" />
                  Concluir
                </DropdownMenuItem>
              )}

              {mostrarAgendar && (
                <DropdownMenuItem
                  disabled={bloqueado}
                  onSelect={() => void run("agendar", () => marcarRemadaAgendada(remada.id))}
                >
                  <CalendarPlus className="size-4" />
                  Agendar
                </DropdownMenuItem>
              )}

              {mostrarCancelar && (
                <DropdownMenuItem
                  disabled={bloqueado}
                  onSelect={() => void run("cancelar", () => cancelarRemada(remada.id))}
                >
                  <Ban className="size-4" />
                  Cancelar
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                variant="destructive"
                disabled={bloqueado}
                onSelect={() => {
                  if (!window.confirm("Apagar esta remada permanentemente?")) return;
                  void run("apagar", () => apagarRemada(remada.id));
                }}
              >
                <Trash2 className="size-4" />
                Apagar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Info */}
        <div className="flex flex-col pb-3">
          <div className="flex items-center gap-2.5 px-4 py-1.5 text-sm">
            <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
            {format(new Date(remada.data_hora), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </div>
          <div className="flex items-center gap-2.5 px-4 py-1.5 text-sm">
            <Clock className="size-3.5 shrink-0 text-muted-foreground" />
            {formatHora(remada.data_hora)}
          </div>
          <div className="flex items-center gap-2.5 px-4 py-1.5 text-sm">
            <Users className="size-3.5 shrink-0 text-muted-foreground" />
            {remada.vagas} vagas · {Math.max(0, remada.vagas - remada.preenchidas)} disponíveis
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ── Chip de evento ── */
function EventoChip({
  remada,
  onEditar,
}: {
  remada: RemadaLinha;
  onEditar: () => void;
}) {
  return (
    <EventoPopover remada={remada} onEditar={onEditar}>
      <button
        className={cn(
          "flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-xs font-medium transition-colors",
          chipClasses(remada.status)
        )}
      >
        <ChipIcon status={remada.status} />
        <span className="min-w-0 flex-1 truncate">{formatHora(remada.data_hora)}</span>
        <span className="shrink-0 opacity-60">
          {remada.preenchidas}/{remada.vagas}
        </span>
      </button>
    </EventoPopover>
  );
}

/* ── Célula de um dia ── */
function CelulaoDia({
  dia,
  remadas,
  desteMes,
  onEditar,
}: {
  dia: Date;
  remadas: RemadaLinha[];
  desteMes: boolean;
  onEditar: (r: RemadaLinha) => void;
}) {
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const hoje = isToday(dia);
  const visiveis = mostrarTodos ? remadas : remadas.slice(0, MAX_VISIVEIS);
  const ocultos = remadas.length - MAX_VISIVEIS;

  return (
    <div
      className={cn(
        "flex min-h-[7rem] flex-col gap-1 border-b border-r border-border p-1.5",
        !desteMes && "bg-muted/20"
      )}
    >
      {/* Número do dia */}
      <span
        className={cn(
          "mb-0.5 flex size-6 shrink-0 items-center justify-center self-start rounded-full text-xs font-medium",
          hoje
            ? "bg-primary text-primary-foreground"
            : desteMes
              ? "text-foreground"
              : "text-muted-foreground/50"
        )}
      >
        {format(dia, "d")}
      </span>

      {/* Eventos */}
      <div className="flex flex-col gap-0.5">
        {visiveis.map((r) => (
          <EventoChip key={r.id} remada={r} onEditar={() => onEditar(r)} />
        ))}
      </div>

      {/* Overflow */}
      {!mostrarTodos && ocultos > 0 && (
        <button
          onClick={() => setMostrarTodos(true)}
          className="mt-0.5 truncate rounded px-1.5 py-0.5 text-left text-xs text-muted-foreground hover:bg-muted"
        >
          +{ocultos} mais
        </button>
      )}
      {mostrarTodos && remadas.length > MAX_VISIVEIS && (
        <button
          onClick={() => setMostrarTodos(false)}
          className="mt-0.5 truncate rounded px-1.5 py-0.5 text-left text-xs text-muted-foreground hover:bg-muted"
        >
          Mostrar menos
        </button>
      )}
    </div>
  );
}

/* ── Componente principal ── */
type Props = {
  mes: Date;
  onMesChange: (d: Date) => void;
  filtradas: RemadaLinha[];
};

export function RemadasCalendarioView({ mes, filtradas }: Props) {
  const [remadaEditar, setRemadaEditar] = useState<RemadaLinha | null>(null);

  /* Grid: semana começa na segunda */
  const inicio = startOfWeek(startOfMonth(mes), { weekStartsOn: 1 });
  const fim = endOfWeek(endOfMonth(mes), { weekStartsOn: 1 });
  const dias = eachDayOfInterval({ start: inicio, end: fim });

  /* Agrupar remadas por dia local */
  const porDia = new Map<string, RemadaLinha[]>();
  for (const r of filtradas) {
    const k = dateKeyLocal(new Date(r.data_hora));
    const lista = porDia.get(k) ?? [];
    lista.push(r);
    porDia.set(k, lista);
  }
  /* Ordenar eventos de cada dia por hora */
  for (const lista of porDia.values()) {
    lista.sort(
      (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()
    );
  }

  return (
    <>
      <EditarRemadaDialog
        remada={remadaEditar}
        open={remadaEditar != null}
        onOpenChange={(o) => { if (!o) setRemadaEditar(null); }}
      />

      <div className="overflow-hidden rounded-lg border border-border">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {DIAS_CABECALHO.map((d) => (
            <div
              key={d}
              className="border-r border-border px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid de dias */}
        <div className="grid grid-cols-7">
          {dias.map((dia, i) => {
            const key = dateKeyLocal(dia);
            const remadas = porDia.get(key) ?? [];
            const desteMes = isSameMonth(dia, mes);
            /* Remove borda direita na última coluna e borda inferior na última linha */
            const ultimaCol = (i + 1) % 7 === 0;
            const ultimaLinha = i >= dias.length - 7;

            return (
              <div
                key={key}
                className={cn(
                  ultimaCol && "[&>div]:border-r-0",
                  ultimaLinha && "[&>div]:border-b-0"
                )}
              >
                <CelulaoDia
                  dia={dia}
                  remadas={remadas}
                  desteMes={desteMes}
                  onEditar={setRemadaEditar}
                />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
