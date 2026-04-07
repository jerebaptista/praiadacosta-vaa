"use client";

import { useTransition } from "react";
import {
  Ban,
  MoreHorizontal,
  Pencil,
  UserCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { alterarStatusAluno, type AlunoStatus } from "@/app/actions/alunos";
import type { AlunoFormData } from "@/lib/alunos-form-data";
import { formatarTelefoneBrasilExibicao } from "@/lib/telefone-br";

export type AlunoLinha = {
  id: string;
  nome: string;
  telefone: string | null;
  status: string;
  plano: string | null;
  turmas: { dias: string; hora: string }[];
  avatar_url?: string | null;
  /** Dados já carregados na página — evita nova ida ao servidor ao abrir “Editar”. */
  dadosEdicao?: AlunoFormData;
};

/* ── Badge de status ── */
function BadgeStatus({ status }: { status: string }) {
  if (status === "ativo")
    return (
      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 font-normal text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400">
        Ativo
      </Badge>
    );
  if (status === "pendente")
    return (
      <Badge variant="outline" className="border-amber-200 bg-amber-50 font-normal text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-400">
        Pendente
      </Badge>
    );
  if (status === "inativo")
    return (
      <Badge variant="outline" className="border-red-200 bg-red-50 font-normal text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
        Inativo
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-border bg-muted/60 font-normal text-muted-foreground">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

/* ── Avatar com iniciais ── */
function AlunoAvatar({ nome, avatarUrl }: { nome: string; avatarUrl?: string | null }) {
  const iniciais = nome.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  return (
    <Avatar>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={nome} /> : null}
      <AvatarFallback className="text-xs font-medium">{iniciais || <UserCircle className="size-4" />}</AvatarFallback>
    </Avatar>
  );
}

/* ── Turmas em linha ── */
function CelulaTurmas({ turmas }: { turmas: AlunoLinha["turmas"] }) {
  if (turmas.length === 0)
    return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {turmas.map((t, i) => (
        <span key={i} className="inline-flex items-center rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {t.dias} {t.hora}
        </span>
      ))}
    </div>
  );
}

/* ── Célula de acções ── */
function CelulaAcoes({
  aluno,
  onDetalhes,
  onEditar,
}: {
  aluno: AlunoLinha;
  onDetalhes: () => void;
  onEditar: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const isAtivo = aluno.status === "ativo";

  function inativar() {
    const novo: AlunoStatus = isAtivo ? "inativo" : "ativo";
    startTransition(async () => {
      await alterarStatusAluno(aluno.id, novo);
    });
  }

  return (
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
        <DropdownMenuItem onSelect={onDetalhes}>
          <UserCircle className="size-4" />
          Ver perfil
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onEditar}>
          <Pencil className="size-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem disabled={pending} onSelect={inativar}>
          <Ban className="size-4" />
          {isAtivo ? "Inativar" : "Ativar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Componente principal ── */
type Props = {
  alunos: AlunoLinha[];
  onVerDetalhes: (id: string) => void;
  onEditar: (id: string) => void;
};

export function AlunosTabela({ alunos, onVerDetalhes, onEditar }: Props) {
  if (alunos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
        <p className="text-sm">Nenhum aluno cadastrado.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Turmas</TableHead>
            <TableHead className="w-[1%] min-w-[3rem]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {alunos.map((a) => (
            <TableRow key={a.id} className="group/row">
              {/* Avatar clicável */}
              <TableCell>
                <button
                  type="button"
                  className="cursor-pointer rounded-full transition-opacity hover:opacity-80"
                  onClick={() => onVerDetalhes(a.id)}
                  aria-label={`Ver perfil de ${a.nome}`}
                >
                  <AlunoAvatar nome={a.nome} avatarUrl={a.avatar_url} />
                </button>
              </TableCell>
              {/* Nome clicável */}
              <TableCell>
                <button
                  type="button"
                  className="cursor-pointer font-medium hover:underline"
                  onClick={() => onVerDetalhes(a.id)}
                >
                  {a.nome}
                </button>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {a.telefone ? formatarTelefoneBrasilExibicao(a.telefone) : "—"}
              </TableCell>
              <TableCell>
                <BadgeStatus status={a.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {a.plano ?? "—"}
              </TableCell>
              <TableCell>
                <CelulaTurmas turmas={a.turmas} />
              </TableCell>
              <TableCell className="text-right">
                <CelulaAcoes aluno={a} onDetalhes={() => onVerDetalhes(a.id)} onEditar={() => onEditar(a.id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
