"use client";

import { useEffect, useLayoutEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { apagarPlano, alterarStatusPlano } from "@/app/actions/planos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlanoEdicaoDrawer } from "@/components/admin/planos/plano-edicao-drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  DESCRICAO_ALERT_REMOVER_PLANO,
  formatarPrecoBrl,
  LIMITE_PLANOS_TOTAL,
  type PlanoLinha,
  type PlanoStatus,
} from "@/lib/planos-tipos";

type VarianteColunaPlano = "header" | "body";

/**
 * Larguras em % (somam ~100%). Com `min-w` na tabela, o contentor ganha scroll horizontal.
 * Coluna `acoes`: sticky à direita, fundo sólido e sombra para o scroll passar por baixo.
 */
function classNameLarguraColunaPlano(
  columnId: string,
  variante: VarianteColunaPlano = "body"
): string {
  const compact = "px-1.5 py-2 sm:px-2";
  switch (columnId) {
    case "acoes":
      return cn(
        compact,
        "w-10 min-w-10 max-w-10 shrink-0",
        "sticky right-0 z-20 shadow-[-8px_0_12px_-6px_rgba(0,0,0,0.08)] dark:shadow-[-8px_0_12px_-6px_rgba(0,0,0,0.25)]",
        variante === "header"
          ? "bg-background"
          : "bg-background group-hover/row:bg-muted/50"
      );
    case "nome":
      return cn(compact, "w-[24%] min-w-0");
    case "status":
      return cn(compact, "w-[11%] min-w-0");
    case "alunos":
      return cn(compact, "w-[9%] min-w-0");
    case "remadas_por_semana":
      return cn(compact, "w-[8%] min-w-0");
    case "preco_mensal":
    case "preco_trimestral":
    case "preco_semestral":
    case "preco_anual":
      return cn(compact, "w-[11%] min-w-0");
    default:
      return cn(compact, "min-w-0");
  }
}

/** Mesmo padrão de `remadas-tabela`: ícone neutro só no hover; coluna ativa mostra seta. */
function CabecalhoOrdenavel({
  title,
  sorted,
  onSort,
  contagemResumo,
  contagemResumoTooltip,
  titleTooltip,
}: {
  title: string;
  sorted: false | "asc" | "desc";
  onSort: () => void;
  /** Ex.: `4/5` ao lado do título (ex.: coluna Status). */
  contagemResumo?: string;
  /** Texto do tooltip da contagem. */
  contagemResumoTooltip?: string;
  /** Tooltip ao pairar no título (ex.: título abreviado "Aulas"). */
  titleTooltip?: string;
}) {
  const ativo = sorted === "asc" || sorted === "desc";
  const temContagem =
    contagemResumo != null &&
    contagemResumo !== "" &&
    contagemResumoTooltip != null &&
    contagemResumoTooltip !== "";
  return (
    <Button
      type="button"
      variant="ghost"
      className="group/cab -ml-2 h-auto min-h-8 gap-1 px-2 py-1 font-medium hover:bg-muted"
      onClick={onSort}
      aria-sort={
        ativo ? (sorted === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0">
        <span>
          {titleTooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>{title}</span>
              </TooltipTrigger>
              <TooltipContent side="top">{titleTooltip}</TooltipContent>
            </Tooltip>
          ) : (
            title
          )}
        </span>
        {temContagem ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="tabular-nums font-normal text-muted-foreground"
                aria-label={contagemResumoTooltip}
              >
                {contagemResumo}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">{contagemResumoTooltip}</TooltipContent>
          </Tooltip>
        ) : null}
      </span>
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

function comparePrecoNullable(
  a: PlanoLinha,
  b: PlanoLinha,
  key: "preco_trimestral" | "preco_semestral" | "preco_anual"
): number {
  const va = a[key];
  const vb = b[key];
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  return va - vb;
}

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function BadgeStatusPlano({ status }: { status: PlanoStatus }) {
  if (status === "inativo") {
    return (
      <Badge
        variant="outline"
        className="border-border bg-muted/60 font-normal text-muted-foreground"
      >
        Inativo
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-emerald-200 bg-emerald-50 font-normal text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400"
    >
      Ativo
    </Badge>
  );
}

function CelulaAlunosPlano({
  total,
  preview,
}: {
  total: number;
  preview: PlanoLinha["alunos_preview"];
}) {
  if (total === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const MAX = 3;
  const visiveis = preview.slice(0, MAX);
  const extra = total > MAX ? total - MAX : 0;

  return (
    <AvatarGroup>
      {visiveis.map((a) => (
        <Avatar key={a.id} size="sm">
          {a.avatar_url ? (
            <AvatarImage src={a.avatar_url} alt={a.nome} />
          ) : null}
          <AvatarFallback className="text-[10px]">{iniciais(a.nome)}</AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <AvatarGroupCount className="size-6 text-xs">+{extra}</AvatarGroupCount>
      )}
    </AvatarGroup>
  );
}

function CelulaAcoes({
  plano,
  onEditar,
}: {
  plano: PlanoLinha;
  onEditar: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmRemover, setConfirmRemover] = useState(false);
  const [segundosConfirmarRemocao, setSegundosConfirmarRemocao] = useState(0);
  const [confirmarInativarPlano, setConfirmarInativarPlano] = useState(false);
  const [erroInativar, setErroInativar] = useState<string | null>(null);
  const [erroRemover, setErroRemover] = useState<string | null>(null);
  const isAtivo = plano.status === "ativo";
  const podeRemoverPelaTabela = plano.alunos_ativos_no_plano === 0;
  function executarAtivarPlano() {
    startTransition(async () => {
      try {
        await alterarStatusPlano(plano.id, "ativo");
        router.refresh();
      } catch (e) {
        setErroInativar(
          e instanceof Error ? e.message : "Não foi possível alterar o status."
        );
      }
    });
  }

  function confirmarInativarPlanoExecutar() {
    startTransition(async () => {
      try {
        await alterarStatusPlano(plano.id, "inativo");
        setConfirmarInativarPlano(false);
        router.refresh();
      } catch (e) {
        setConfirmarInativarPlano(false);
        setErroInativar(
          e instanceof Error ? e.message : "Não foi possível alterar o status."
        );
      }
    });
  }

  function aoAlternarStatus() {
    if (isAtivo) {
      setConfirmarInativarPlano(true);
    } else {
      executarAtivarPlano();
    }
  }

  function remover() {
    startTransition(async () => {
      try {
        await apagarPlano(plano.id);
        setConfirmRemover(false);
        router.refresh();
      } catch (e) {
        setConfirmRemover(false);
        setErroRemover(
          e instanceof Error ? e.message : "Não foi possível remover o plano."
        );
      }
    });
  }

  useLayoutEffect(() => {
    if (!confirmRemover) {
      setSegundosConfirmarRemocao(0);
      return;
    }
    setSegundosConfirmarRemocao(5);
  }, [confirmRemover]);

  useEffect(() => {
    if (!confirmRemover) return;
    let restante = 5;
    const id = window.setInterval(() => {
      restante -= 1;
      setSegundosConfirmarRemocao(restante);
      if (restante <= 0) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [confirmRemover]);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 opacity-0 transition-opacity group-hover/row:opacity-100 data-[state=open]:opacity-100"
            disabled={pending}
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onSelect={onEditar}>
            <Pencil className="size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={pending}
            onSelect={aoAlternarStatus}
          >
            {isAtivo ? (
              <>
                <Ban className="size-4" />
                Inativar
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Ativar
              </>
            )}
          </DropdownMenuItem>
          {podeRemoverPelaTabela ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={pending}
                onSelect={() => setConfirmRemover(true)}
              >
                <Trash2 className="size-4" />
                Remover
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmarInativarPlano} onOpenChange={setConfirmarInativarPlano}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar plano?</AlertDialogTitle>
            <AlertDialogDescription>
              O plano deixará de estar disponível para novas matrículas enquanto estiver inativo.
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                void confirmarInativarPlanoExecutar();
              }}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Salvando...
                </>
              ) : (
                "Inativar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRemover} onOpenChange={setConfirmRemover}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover plano?</AlertDialogTitle>
            <AlertDialogDescription>{DESCRICAO_ALERT_REMOVER_PLANO}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/10 hover:text-destructive active:bg-destructive active:text-destructive-foreground dark:bg-destructive dark:text-destructive-foreground dark:hover:bg-destructive/10 dark:hover:text-destructive dark:active:bg-destructive dark:active:text-destructive-foreground"
              disabled={pending || segundosConfirmarRemocao > 0}
              onClick={(e) => {
                e.preventDefault();
                void remover();
              }}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> A remover…
                </>
              ) : segundosConfirmarRemocao > 0 ? (
                "Aguarde..."
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={erroRemover != null} onOpenChange={(o) => !o && setErroRemover(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Não foi possível remover o plano</AlertDialogTitle>
            <AlertDialogDescription>{erroRemover}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction type="button" onClick={() => setErroRemover(null)}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={erroInativar != null} onOpenChange={(o) => !o && setErroInativar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Não foi possível alterar o status</AlertDialogTitle>
            <AlertDialogDescription>{erroInativar}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction type="button" onClick={() => setErroInativar(null)}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type Props = {
  planos: PlanoLinha[];
  precoPorAula: number | null;
};

export function PlanosTabela({ planos, precoPorAula }: Props) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "nome", desc: false },
  ]);
  const [planoEditando, setPlanoEditando] = useState<PlanoLinha | null>(null);

  /** Mantém o drawer alinhado aos dados após `router.refresh()`. */
  const planoParaEdicao = useMemo(() => {
    if (!planoEditando) return null;
    return planos.find((p) => p.id === planoEditando.id) ?? planoEditando;
  }, [planos, planoEditando]);

  const colunas = useMemo<ColumnDef<PlanoLinha>[]>(
    () => [
      {
        id: "alunos",
        accessorKey: "alunos_total",
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Alunos"
            sorted={column.getIsSorted()}
            onSort={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => (
          <CelulaAlunosPlano
            total={row.original.alunos_total}
            preview={row.original.alunos_preview}
          />
        ),
        sortingFn: "basic",
      },
      {
        id: "nome",
        accessorKey: "nome",
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Nome"
            sorted={column.getIsSorted()}
            onSort={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => (
          <button
            type="button"
            className="-mx-1.5 inline-flex min-w-0 max-w-full rounded-md px-1.5 py-0.5 text-left font-medium text-foreground hover:bg-muted hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => setPlanoEditando(row.original)}
          >
            <span className="min-w-0 truncate">{row.original.nome}</span>
          </button>
        ),
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
            contagemResumo={`${planos.length}/${LIMITE_PLANOS_TOTAL}`}
            contagemResumoTooltip={`${planos.length} de ${LIMITE_PLANOS_TOTAL} planos`}
          />
        ),
        cell: ({ row }) => <BadgeStatusPlano status={row.original.status} />,
        sortingFn: (a, b) =>
          a.original.status.localeCompare(b.original.status, "pt-BR"),
      },
      {
        id: "remadas_por_semana",
        accessorKey: "remadas_por_semana",
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Aulas"
            titleTooltip="Aulas por semana"
            sorted={column.getIsSorted()}
            onSort={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.remadas_por_semana}
          </span>
        ),
        sortingFn: "basic",
      },
      {
        id: "preco_mensal",
        accessorKey: "preco_mensal",
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Mensal"
            sorted={column.getIsSorted()}
            onSort={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatarPrecoBrl(row.original.preco_mensal)}
          </span>
        ),
        sortingFn: "basic",
      },
      {
        id: "preco_trimestral",
        accessorFn: (row) => row.preco_trimestral,
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Trimestral"
            sorted={column.getIsSorted()}
            onSort={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatarPrecoBrl(row.original.preco_trimestral)}
          </span>
        ),
        sortingFn: (a, b) =>
          comparePrecoNullable(a.original, b.original, "preco_trimestral"),
      },
      {
        id: "preco_semestral",
        accessorFn: (row) => row.preco_semestral,
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Semestral"
            sorted={column.getIsSorted()}
            onSort={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatarPrecoBrl(row.original.preco_semestral)}
          </span>
        ),
        sortingFn: (a, b) =>
          comparePrecoNullable(a.original, b.original, "preco_semestral"),
      },
      {
        id: "preco_anual",
        accessorFn: (row) => row.preco_anual,
        header: ({ column }) => (
          <CabecalhoOrdenavel
            title="Anual"
            sorted={column.getIsSorted()}
            onSort={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatarPrecoBrl(row.original.preco_anual)}
          </span>
        ),
        sortingFn: (a, b) =>
          comparePrecoNullable(a.original, b.original, "preco_anual"),
      },
      {
        id: "acoes",
        header: () => null,
        cell: ({ row }) => (
          <CelulaAcoes
            plano={row.original}
            onEditar={() => setPlanoEditando(row.original)}
          />
        ),
        enableSorting: false,
      },
    ],
    [setPlanoEditando, planos]
  );

  const table = useReactTable({
    data: planos,
    columns: colunas,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
  });

  if (planos.length === 0) {
    return null;
  }

  return (
    <>
      <div className="min-w-0 overflow-hidden rounded-lg border border-border">
        <Table
          containerClassName="overflow-x-auto"
          className="table-fixed w-full min-w-[52rem] text-xs sm:text-sm"
        >
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    className={classNameLarguraColunaPlano(String(h.column.id), "header")}
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
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="group/row">
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      classNameLarguraColunaPlano(String(cell.column.id), "body"),
                      cell.column.id === "nome" && "max-w-0"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PlanoEdicaoDrawer
        plano={planoParaEdicao}
        todosPlanos={planos}
        precoPorAula={precoPorAula}
        onFechar={() => setPlanoEditando(null)}
      />
    </>
  );
}
