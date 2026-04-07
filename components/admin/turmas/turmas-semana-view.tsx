"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
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
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { alterarStatusTurma, apagarTurma } from "@/app/actions/turmas";
import { LABEL_DIA_SEMANA, ORDEM_DIA_SEMANA } from "@/lib/remadas-geracao";
import {
  type TurmaAluno,
  type TurmaLinha,
  type TurmaStatus,
} from "@/lib/turmas-tipos";
import { EditarTurmaDialog } from "@/components/admin/turmas/editar-turma-dialog";
import { cn } from "@/lib/utils";

/* ── helpers ── */

function chipClasses(status: TurmaStatus): string {
  if (status === "ativa")
    return "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30";
  return "bg-muted/60 text-muted-foreground hover:bg-muted";
}

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function labelDias(dias: number[]): string {
  return (
    ORDEM_DIA_SEMANA.filter((d) => dias.includes(d))
      .map((d) => LABEL_DIA_SEMANA[d])
      .join(", ") || "—"
  );
}

/* ── Badge de status ── */
function BadgeStatusTurma({ status }: { status: TurmaStatus }) {
  if (status === "inativa")
    return (
      <Badge
        variant="outline"
        className="border-border bg-muted/60 font-normal text-muted-foreground"
      >
        Inativa
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="border-emerald-200 bg-emerald-50 font-normal text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400"
    >
      Ativa
    </Badge>
  );
}

/* ── Avatar group de alunos ── */
function AlunosGroup({ alunos }: { alunos: TurmaAluno[] }) {
  if (alunos.length === 0)
    return <span className="text-xs text-muted-foreground">Sem alunos</span>;
  const MAX = 3;
  const visiveis = alunos.slice(0, MAX);
  const extra = alunos.length - MAX;
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

/* ── Popover de detalhes/acções ── */
function TurmaPopover({
  turma,
  onEditar,
  turmasExistentes,
  children,
}: {
  turma: TurmaLinha;
  onEditar: () => void;
  turmasExistentes: TurmaLinha[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendente, startTransition] = useTransition();

  function toggleStatus() {
    const novo: TurmaStatus = turma.status === "ativa" ? "inativa" : "ativa";
    startTransition(async () => {
      await alterarStatusTurma(turma.id, novo);
      router.refresh();
      setOpen(false);
    });
  }

  function handleApagar() {
    if (!window.confirm("Apagar esta turma permanentemente?")) return;
    startTransition(async () => {
      await apagarTurma(turma.id);
      router.refresh();
      setOpen(false);
    });
  }

  // turmasExistentes used by EditarTurmaDialog (passed via onEditar → parent)
  void turmasExistentes;

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
          <BadgeStatusTurma status={turma.status} />
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="-mr-1 size-7 shrink-0"
                disabled={pendente}
                aria-label="Ações"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[300] min-w-44">
              <DropdownMenuItem
                disabled={pendente}
                onSelect={() => {
                  setOpen(false);
                  onEditar();
                }}
              >
                <Pencil className="size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={pendente} onSelect={toggleStatus}>
                {turma.status === "ativa" ? (
                  <>
                    <Ban className="size-4" />
                    Desativar
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    Ativar
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={pendente}
                onSelect={handleApagar}
              >
                <Trash2 className="size-4" />
                Apagar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Informação */}
        <div className="flex flex-col pb-3">
          <div className="flex items-center gap-2.5 px-4 py-1.5 text-sm">
            <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
            {labelDias(turma.dias_semana)}
          </div>
          <div className="flex items-center gap-2.5 px-4 py-1.5 text-sm">
            <Clock className="size-3.5 shrink-0 text-muted-foreground" />
            {turma.hora}
          </div>
          <div className="flex items-center gap-2.5 px-4 py-1.5 text-sm">
            <Users className="size-3.5 shrink-0 text-muted-foreground" />
            {turma.vagas} vagas
          </div>
          <div className="flex items-center gap-2.5 px-4 py-1.5 text-sm">
            {/* espaço para alinhar com os ícones */}
            <span className="size-3.5 shrink-0" aria-hidden />
            <AlunosGroup alunos={turma.alunos} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ── Chip de evento numa célula ── */
function TurmaChip({
  turma,
  onEditar,
  turmasExistentes,
}: {
  turma: TurmaLinha;
  onEditar: () => void;
  turmasExistentes: TurmaLinha[];
}) {
  return (
    <TurmaPopover
      turma={turma}
      onEditar={onEditar}
      turmasExistentes={turmasExistentes}
    >
      <button
        className={cn(
          "flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-xs font-medium transition-colors",
          chipClasses(turma.status)
        )}
      >
        <span className="min-w-0 flex-1 truncate">{turma.hora}</span>
        {turma.alunos.length > 0 && (
          <span className="shrink-0 opacity-60">{turma.alunos.length}</span>
        )}
      </button>
    </TurmaPopover>
  );
}

/* ── Componente principal ── */
type Props = {
  filtradas: TurmaLinha[];
  turmasExistentes: TurmaLinha[];
};

export function TurmasSemanaView({ filtradas, turmasExistentes }: Props) {
  const [turmaEditando, setTurmaEditando] = useState<TurmaLinha | null>(null);

  /* agrupar por dia da semana e ordenar por hora */
  const porDia = new Map<number, TurmaLinha[]>(
    ORDEM_DIA_SEMANA.map((d) => [d, []])
  );
  for (const t of filtradas) {
    for (const dia of t.dias_semana) {
      porDia.get(dia)?.push(t);
    }
  }
  for (const lista of porDia.values()) {
    lista.sort((a, b) => a.hora.localeCompare(b.hora));
  }

  return (
    <>
      <EditarTurmaDialog
        turma={turmaEditando}
        open={turmaEditando != null}
        onOpenChange={(o) => {
          if (!o) setTurmaEditando(null);
        }}
        turmasExistentes={turmasExistentes}
      />

      <div className="overflow-hidden rounded-lg border border-border">
        {/* Cabeçalho */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {ORDEM_DIA_SEMANA.map((dia) => (
            <div
              key={dia}
              className="border-r border-border px-2 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground last:border-r-0"
            >
              {LABEL_DIA_SEMANA[dia]}
            </div>
          ))}
        </div>

        {/* Colunas */}
        <div className="grid grid-cols-7">
          {ORDEM_DIA_SEMANA.map((dia, idx) => {
            const lista = porDia.get(dia) ?? [];
            const isUltimo = idx === ORDEM_DIA_SEMANA.length - 1;
            return (
              <div
                key={dia}
                className={cn(
                  "flex min-h-[8rem] flex-col gap-0.5 border-r border-border p-1.5",
                  isUltimo && "border-r-0"
                )}
              >
                {lista.length === 0 ? (
                  <span className="m-auto text-xs text-muted-foreground/30">
                    —
                  </span>
                ) : (
                  lista.map((t) => (
                    <TurmaChip
                      key={t.id}
                      turma={t}
                      onEditar={() => setTurmaEditando(t)}
                      turmasExistentes={turmasExistentes}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
