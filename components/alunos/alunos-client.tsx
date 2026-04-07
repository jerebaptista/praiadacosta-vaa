"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Filter, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlunosTabela, type AlunoLinha } from "@/components/alunos/alunos-tabela";
import { AlunoFormDrawer } from "@/components/alunos/aluno-form-drawer";
import { AlunoDrawer } from "@/components/alunos/aluno-drawer";
import type { PlanoOpcao, TurmaSlot } from "@/components/alunos/criar-aluno-dialog";
import { LABEL_DIA_SEMANA, ORDEM_DIA_SEMANA } from "@/lib/remadas-geracao";
import { cn } from "@/lib/utils";

/* ── Opções de turmas disponíveis para filtro ── */
type TurmaOpcao = {
  dias: number[];
  hora: string;
};

/* ── Filtro de Turma (Popover com dia + horário) ── */
function FiltroTurmas({
  turmas,
  filtroDia,
  filtroHora,
  onDiaChange,
  onHoraChange,
}: {
  turmas: TurmaOpcao[];
  filtroDia: string;
  filtroHora: string;
  onDiaChange: (v: string) => void;
  onHoraChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  /* dias únicos presentes nas turmas */
  const diasDisponiveis = useMemo(() => {
    const set = new Set<number>();
    turmas.forEach((t) => t.dias.forEach((d) => set.add(d)));
    return ORDEM_DIA_SEMANA.filter((d) => set.has(d));
  }, [turmas]);

  /* horários únicos ordenados */
  const horasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    turmas.forEach((t) => set.add(t.hora.slice(0, 5)));
    return Array.from(set).sort();
  }, [turmas]);

  const ativo = filtroDia !== "todos" || filtroHora !== "todos";

  /* label resumida no trigger */
  const label = useMemo(() => {
    const partes: string[] = [];
    if (filtroDia !== "todos") partes.push(LABEL_DIA_SEMANA[Number(filtroDia)] ?? filtroDia);
    if (filtroHora !== "todos") partes.push(filtroHora);
    return partes.length > 0 ? partes.join(" · ") : "Turma";
  }, [filtroDia, filtroHora]);

  function limpar() {
    onDiaChange("todos");
    onHoraChange("todos");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 text-sm font-normal",
            ativo && "border-primary/50 bg-primary/5 text-primary"
          )}
        >
          <Filter className="size-3.5 shrink-0" />
          <span className="max-w-[120px] truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start" sideOffset={4}>
        <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Filtrar por turma
        </p>
        <div className="flex flex-col gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Dia da semana</label>
            <Select value={filtroDia} onValueChange={onDiaChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os dias</SelectItem>
                {diasDisponiveis.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {LABEL_DIA_SEMANA[d]}
                  </SelectItem>
                ))}
                {diasDisponiveis.length === 0 && (
                  <SelectItem value="todos" disabled>
                    Nenhuma turma
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Horário</label>
            <Select value={filtroHora} onValueChange={onHoraChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Qualquer horário</SelectItem>
                {horasDisponiveis.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h}
                  </SelectItem>
                ))}
                {horasDisponiveis.length === 0 && (
                  <SelectItem value="todos" disabled>
                    Nenhuma turma
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {ativo && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-7 gap-1.5 text-xs text-muted-foreground"
              onClick={limpar}
            >
              <X className="size-3" />
              Limpar filtro
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ── Props e componente principal ── */
type Props = {
  initialAlunos: AlunoLinha[];
  turmasOpcoes: TurmaOpcao[];
  planosOpcoes: string[];
  planos: PlanoOpcao[];
  turmaSlots: TurmaSlot[];
};

export function AlunosClient({ initialAlunos, turmasOpcoes, planosOpcoes, planos, turmaSlots }: Props) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroPlano, setFiltroPlano] = useState("todos");
  const [filtroDia, setFiltroDia] = useState("todos");
  const [filtroHora, setFiltroHora] = useState("todos");
  const [drawerAlunoId, setDrawerAlunoId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formAlunoId, setFormAlunoId] = useState<string | null>(null);

  function abrirFormCriar() { setFormAlunoId(null); setFormOpen(true); }
  function abrirFormEditar(id: string) { setFormAlunoId(id); setFormOpen(true); }

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase().replace(/\D/g, "") || busca.trim().toLowerCase();
    return initialAlunos.filter((a) => {
      /* busca: nome, telefone (só dígitos para comparar) */
      if (termo) {
        const nomeOk = a.nome.toLowerCase().includes(termo);
        const telOk = (a.telefone ?? "").replace(/\D/g, "").includes(termo);
        if (!nomeOk && !telOk) return false;
      }
      /* status */
      if (filtroStatus !== "todos" && a.status !== filtroStatus) return false;
      /* plano */
      if (filtroPlano !== "todos" && a.plano !== filtroPlano) return false;
      /* turma: dia e/ou horário */
      if (filtroDia !== "todos" || filtroHora !== "todos") {
        const temTurma = a.turmas.some((t) => {
          const diaOk = filtroDia === "todos" || t.dias === LABEL_DIA_SEMANA[Number(filtroDia)];
          const horaOk = filtroHora === "todos" || t.hora === filtroHora;
          return diaOk && horaOk;
        });
        if (!temTurma) return false;
      }
      return true;
    });
  }, [initialAlunos, busca, filtroStatus, filtroPlano, filtroDia, filtroHora]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alunos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gerencie os alunos, planos e turmas inscritas.
          </p>
        </div>
        <Button className="shrink-0 gap-2" onClick={abrirFormCriar}>
          <Plus className="size-4" />
          Novo aluno
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 overflow-visible py-1">
        {/* Busca */}
        <div className="relative h-8 min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-sm"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Status */}
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="h-8 w-[7.5rem] shrink-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        {/* Plano */}
        <Select value={filtroPlano} onValueChange={setFiltroPlano}>
          <SelectTrigger className="h-8 w-[7.5rem] shrink-0">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {planosOpcoes.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Turma */}
        <FiltroTurmas
          turmas={turmasOpcoes}
          filtroDia={filtroDia}
          filtroHora={filtroHora}
          onDiaChange={setFiltroDia}
          onHoraChange={setFiltroHora}
        />
      </div>

      <AlunosTabela
        alunos={filtrados}
        onVerDetalhes={setDrawerAlunoId}
        onEditar={abrirFormEditar}
      />

      <AlunoDrawer
        alunoId={drawerAlunoId}
        onClose={() => setDrawerAlunoId(null)}
        onEditar={(id) => { setDrawerAlunoId(null); abrirFormEditar(id); }}
      />

      <AlunoFormDrawer
        alunoId={formAlunoId}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          /* Ao fechar edição (cancelar, X, overlay): voltar ao perfil. Criar aluno (sem id) não abre perfil. */
          if (!open && formAlunoId != null) {
            setDrawerAlunoId(formAlunoId);
          }
        }}
        planos={planos}
        turmaSlots={turmaSlots}
        initialFormData={
          formAlunoId
            ? initialAlunos.find((a) => a.id === formAlunoId)?.dadosEdicao ?? null
            : null
        }
      />
    </div>
  );
}
