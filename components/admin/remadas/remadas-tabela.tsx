"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Ban,
  CalendarPlus,
  Check,
  MoreVertical,
  Pencil,
  Trash2,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RemadaLinha, RemadaStatus } from "@/lib/remadas-geracao";

type Props = {
  dados: RemadaLinha[];
};

const ORDEM_STATUS: Record<RemadaStatus, number> = {
  agendada: 0,
  concluida: 1,
  cancelada: 2,
};


function formatData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BadgeStatus({ status }: { status: RemadaStatus }) {
  if (status === "agendada") {
    return (
      <Badge
        variant="outline"
        className="border-transparent bg-muted font-normal text-muted-foreground"
      >
        Agendada
      </Badge>
    );
  }
  if (status === "concluida") {
    return (
      <Badge variant="secondary" className="font-normal">
        Concluída
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-red-200/70 bg-red-500/10 font-normal text-red-700 dark:border-red-900/40 dark:bg-red-500/15 dark:text-red-300"
    >
      Cancelada
    </Badge>
  );
}

function CabecalhoOrdenavel({
  title,
  sorted,
  onSort,
}: {
  title: string;
  sorted: false | "asc" | "desc";
  onSort: () => void;
}) {
  const ativo = sorted === "asc" || sorted === "desc";
  return (
    <Button
      type="button"
      variant="ghost"
      className="group/cab -ml-2 h-8 gap-1 px-2 font-medium hover:bg-muted"
      onClick={onSort}
      aria-sort={
        ativo ? (sorted === "asc" ? "ascending" : "descending") : "none"
      }
    >
      {title}
      <span
        className="inline-flex size-3.5 shrink-0 items-center justify-center"
        aria-hidden
      >
        {ativo ? (
          sorted === "asc" ? (
            <ArrowUp className="size-3.5 opacity-80" />
          ) : (
            <ArrowDown className="size-3.5 opacity-80" />
          )
        ) : (
          <ArrowDownUp className="size-3.5 opacity-0 transition-opacity group-hover/cab:opacity-45 group-focus-visible/cab:opacity-45" />
        )}
      </span>
    </Button>
  );
}

function CelulaAcoes({
  remada,
  onEditar,
}: {
  remada: RemadaLinha;
  onEditar: (r: RemadaLinha) => void;
}) {
  const router = useRouter();
  const [pendente, setPendente] = useState<string | null>(null);

  const { status, passou } = remada;
  const bloqueado = pendente !== null;

  // Agendada: Concluir, Cancelar
  // Concluída: Agendar (só se !passou), Cancelar
  // Cancelada: Agendar (só se !passou), Concluir
  const mostrarConcluir = status === "agendada" || status === "cancelada";
  const mostrarAgendar = !passou && (status === "concluida" || status === "cancelada");
  const mostrarCancelar = status === "agendada" || status === "concluida";

  async function run(
    chave: string,
    fn: () => Promise<void>
  ): Promise<void> {
    setPendente(chave);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Operação não foi concluída."
      );
    } finally {
      setPendente(null);
    }
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-8 shrink-0"
            aria-label="Ações da remada"
            disabled={bloqueado}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem
            disabled={bloqueado}
            onSelect={() => onEditar(remada)}
          >
            <Pencil className="size-4" />
            Editar
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {mostrarConcluir ? (
            <DropdownMenuItem
              disabled={bloqueado}
              onSelect={() => {
                void run("concluir", () =>
                  marcarRemadaConcluida(remada.id)
                );
              }}
            >
              <Check className="size-4" />
              Concluir
            </DropdownMenuItem>
          ) : null}

          {!passou && mostrarAgendar ? (
            <DropdownMenuItem
              disabled={bloqueado}
              onSelect={() => {
                void run("agendar", () =>
                  marcarRemadaAgendada(remada.id)
                );
              }}
            >
              <CalendarPlus className="size-4" />
              Agendar
            </DropdownMenuItem>
          ) : null}

          {mostrarCancelar ? (
            <DropdownMenuItem
              disabled={bloqueado}
              onSelect={() => {
                void run("cancelar", () => cancelarRemada(remada.id));
              }}
            >
              <Ban className="size-4" />
              Cancelar
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem
            variant="destructive"
            disabled={bloqueado}
            onSelect={() => {
              if (
                !window.confirm(
                  "Apagar esta remada permanentemente? Esta ação não pode ser desfeita."
                )
              ) {
                return;
              }
              void run("apagar", () => apagarRemada(remada.id));
            }}
          >
            <Trash2 className="size-4" />
            Apagar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function RemadasTabela({ dados }: Props) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "data_hora", desc: false },
  ]);
  const [remadaEditar, setRemadaEditar] = useState<RemadaLinha | null>(null);

  const colunas = useMemo<ColumnDef<RemadaLinha>[]>(
    () => [
      {
        id: "data_hora",
        accessorKey: "data_hora",
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Data"
            sorted={column.getIsSorted()}
            onSort={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => {
          const riscado = row.original.status === "cancelada";
          return (
            <span
              className={
                riscado ? "text-muted-foreground line-through" : undefined
              }
            >
              {formatData(row.original.data_hora)}
            </span>
          );
        },
        sortingFn: "alphanumeric",
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Status"
            sorted={column.getIsSorted()}
            onSort={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => <BadgeStatus status={row.original.status} />,
        sortingFn: (a, b) =>
          ORDEM_STATUS[a.original.status] - ORDEM_STATUS[b.original.status],
      },
      {
        id: "horario",
        accessorFn: (row) => {
          const d = new Date(row.data_hora);
          return d.getHours() * 60 + d.getMinutes();
        },
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Horário"
            sorted={column.getIsSorted()}
            onSort={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => {
          const riscado = row.original.status === "cancelada";
          return (
            <span
              className={
                riscado ? "text-muted-foreground line-through" : undefined
              }
            >
              {formatHora(row.original.data_hora)}
            </span>
          );
        },
        sortingFn: "basic",
      },
      {
        accessorKey: "vagas",
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Vagas"
            sorted={column.getIsSorted()}
            onSort={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => row.original.vagas,
      },
      {
        id: "acoes",
        header: () => (
          <span className="block pr-2 text-left text-sm font-medium">
            Ações
          </span>
        ),
        cell: ({ row }) => (
          <CelulaAcoes
            remada={row.original}
            onEditar={(r) => setRemadaEditar(r)}
          />
        ),
        enableSorting: false,
      },
    ],
    []
  );

  const table = useReactTable({
    data: dados,
    columns: colunas,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
  });

  return (
    <>
      <EditarRemadaDialog
        remada={remadaEditar}
        open={remadaEditar != null}
        onOpenChange={(aberto) => {
          if (!aberto) setRemadaEditar(null);
        }}
      />
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    className={
                      h.column.id === "acoes"
                        ? "w-[1%] min-w-[3.5rem] text-right"
                        : undefined
                    }
                  >
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colunas.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhuma remada neste mês.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "acoes" ? "text-right" : undefined
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
