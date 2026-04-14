"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { InputPercentual } from "@/components/ui/input-percentual";
import { InputMoedaBrl } from "@/components/ui/input-moeda-brl";
import { InputTextoLimitado } from "@/components/ui/input-texto-limitado";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PrecoAulaForm } from "@/components/admin/configuracoes/preco-aula-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NOME_PLANO_MAX_LEN } from "@/lib/input-sanitize";
import { valorSemanalAulas } from "@/lib/estudio-config";
import {
  contarPeriodosCobrancaAtivos,
  formatMoedaBRL,
  MESES_ANO,
  MESES_SEMESTRE,
  MESES_TRIMESTRE,
  MSG_PLANO_PRECISA_PERIODO_COBRANCA_ATIVO,
  parseMoedaOpcional,
  type PlanoFormEstado,
} from "@/lib/plano-form";
import { cn } from "@/lib/utils";

type PeriodoId = "trimestral" | "semestral" | "anual";

/** Períodos de cobrança no formulário (inclui mensal). */
export type PeriodoCobrancaFormId = "mensal" | PeriodoId;

const PERIODO_CFG: Record<
  PeriodoId,
  {
    titulo: string;
    descricao: string;
    precoKey: keyof PlanoFormEstado;
    pctKey: keyof PlanoFormEstado;
    ativoKey: keyof PlanoFormEstado;
  }
> = {
  trimestral: {
    titulo: "Preço trimestral",
    descricao: "Cobrança a cada 3 meses",
    precoKey: "precoTrimestral",
    pctKey: "pctTrimestral",
    ativoKey: "periodoTrimestralAtivo",
  },
  semestral: {
    titulo: "Preço semestral",
    descricao: "Cobrança a cada 6 meses",
    precoKey: "precoSemestral",
    pctKey: "pctSemestral",
    ativoKey: "periodoSemestralAtivo",
  },
  anual: {
    titulo: "Preço anual",
    descricao: "Cobrança a cada 12 meses",
    precoKey: "precoAnual",
    pctKey: "pctAnual",
    ativoKey: "periodoAnualAtivo",
  },
};

const MESES_POR_PERIODO: Record<PeriodoId, number> = {
  trimestral: MESES_TRIMESTRE,
  semestral: MESES_SEMESTRE,
  anual: MESES_ANO,
};

function CampoPrecoMensal({
  form,
  patch,
  precoPorAula,
  onPeriodoAtivoCheckedChange,
  acoesDesabilitadas,
}: {
  form: PlanoFormEstado;
  patch: (p: Partial<PlanoFormEstado>) => void;
  /** Da configuração do estúdio; `null` = não definido. */
  precoPorAula: number | null;
  /** Persistência imediata pelo pai (editar plano). */
  onPeriodoAtivoCheckedChange?: (checked: boolean) => void;
  acoesDesabilitadas?: boolean;
}) {
  const uid = React.useId();
  const switchId = `${uid}-mensal-ativo`;
  const ativo = form.periodoMensalAtivo;
  const impedirUltimoPeriodoAtivo =
    ativo && contarPeriodosCobrancaAtivos(form) === 1;
  const descontoLiberado = precoPorAula != null && precoPorAula > 0;

  const blocoAtivo = impedirUltimoPeriodoAtivo ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0">
          <Switch
            id={switchId}
            size="sm"
            checked={ativo}
            disabled
            aria-label="Único período de cobrança ativo no plano"
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px]">
        {MSG_PLANO_PRECISA_PERIODO_COBRANCA_ATIVO}
      </TooltipContent>
    </Tooltip>
  ) : (
    <Switch
      id={switchId}
      size="sm"
      className="shrink-0"
      checked={ativo}
      disabled={acoesDesabilitadas}
      onCheckedChange={(checked) =>
        onPeriodoAtivoCheckedChange
          ? onPeriodoAtivoCheckedChange(checked)
          : patch({ periodoMensalAtivo: checked })
      }
      aria-label="Período mensal ativo"
    />
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-sm">Preço mensal</Label>
          <InputMoedaBrl
            className="h-8 w-full"
            value={form.precoMensal}
            onValueChange={(next) => patch({ precoMensal: next })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Desconto</Label>
          <InputPercentual
            className="h-8 w-full"
            value={form.pctMensal}
            disabled={!descontoLiberado}
            readOnly={!descontoLiberado}
            aria-readonly={!descontoLiberado}
            onValueChange={(next) => patch({ pctMensal: next })}
          />
        </div>
        <div className="flex w-full min-w-0 flex-shrink-0 items-center justify-start gap-2 sm:h-8 sm:pb-px">
          {blocoAtivo}
          <Label
            htmlFor={switchId}
            className={cn(
              "min-w-[4.25rem] text-left text-sm font-normal",
              impedirUltimoPeriodoAtivo
                ? "text-muted-foreground"
                : "cursor-pointer"
            )}
          >
            {ativo ? "Ativo" : "Inativo"}
          </Label>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Referência para os descontos dos demais períodos
      </p>
    </div>
  );
}

function CampoPrecoPeriodo({
  id,
  form,
  patch,
  onPeriodoAtivoCheckedChange,
  acoesDesabilitadas,
}: {
  id: PeriodoId;
  form: PlanoFormEstado;
  patch: (p: Partial<PlanoFormEstado>) => void;
  onPeriodoAtivoCheckedChange?: (checked: boolean) => void;
  acoesDesabilitadas?: boolean;
}) {
  const cfg = PERIODO_CFG[id];
  const preco = form[cfg.precoKey] as string;
  const pct = form[cfg.pctKey] as string;
  const ativo = form[cfg.ativoKey] as boolean;
  const uid = React.useId();
  const switchId = `${uid}-${id}-ativo`;
  const impedirUltimoPeriodoAtivo =
    ativo && contarPeriodosCobrancaAtivos(form) === 1;
  const camposDesabilitados = !ativo;
  const meses = MESES_POR_PERIODO[id];
  const precoNum = parseMoedaOpcional(preco);
  const valorPorMes =
    precoNum != null && precoNum > 0 && meses > 0
      ? Math.round((precoNum / meses) * 100) / 100
      : 0;
  const textoPorMes = formatMoedaBRL(valorPorMes);

  const blocoAtivo = impedirUltimoPeriodoAtivo ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Switch
            id={switchId}
            size="sm"
            checked={ativo}
            disabled
            aria-label="Único período de cobrança ativo no plano"
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px]">
        {MSG_PLANO_PRECISA_PERIODO_COBRANCA_ATIVO}
      </TooltipContent>
    </Tooltip>
  ) : (
    <Switch
      id={switchId}
      size="sm"
      checked={ativo}
      disabled={acoesDesabilitadas}
      onCheckedChange={(checked) =>
        onPeriodoAtivoCheckedChange
          ? onPeriodoAtivoCheckedChange(checked)
          : patch({ [cfg.ativoKey]: checked } as Partial<PlanoFormEstado>)
      }
      aria-label="Período ativo"
    />
  );

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-sm">{cfg.titulo}</Label>
          <InputMoedaBrl
            className="h-8 w-full"
            value={preco}
            disabled={camposDesabilitados}
            onValueChange={(next) =>
              patch({ [cfg.precoKey]: next } as Partial<PlanoFormEstado>)
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Desconto</Label>
          <InputPercentual
            className="h-8 w-full"
            value={pct}
            disabled={camposDesabilitados}
            onValueChange={(next) =>
              patch({ [cfg.pctKey]: next } as Partial<PlanoFormEstado>)
            }
          />
        </div>
        <div className="flex w-full min-w-0 flex-shrink-0 items-center justify-start gap-2 sm:h-8 sm:pb-px">
          {blocoAtivo}
          <Label
            htmlFor={switchId}
            className={cn(
              "min-w-[4.25rem] text-left text-sm font-normal",
              impedirUltimoPeriodoAtivo
                ? "text-muted-foreground"
                : "cursor-pointer"
            )}
          >
            {ativo ? "Ativo" : "Inativo"}
          </Label>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {cfg.descricao} ({textoPorMes} /mês).
      </p>
    </div>
  );
}

type Props = {
  form: PlanoFormEstado;
  patch: (p: Partial<PlanoFormEstado>) => void;
  /** Sufixo para id do contador de caracteres (evitar duplicar id na página). */
  nomeContadorId: string;
  /** Erro exibido abaixo do nome (ex.: nome duplicado). */
  erroNome?: string | null;
  /** Exibe o switch de plano ativo/inativo (editar plano). No cadastro, omitir ou false. */
  mostrarStatusPlano?: boolean;
  /** Preço unitário por aula (Configurações). `null` se não definido. */
  precoPorAula: number | null;
  /**
   * Editar plano: persistência imediata do status ativo/inativo (sem Salvar).
   * Se definido, substitui o patch no switch do plano.
   */
  onPlanoAtivoCheckedChange?: (checked: boolean) => void;
  /**
   * Editar plano: persistência imediata ao ativar/inativar período (sem Salvar).
   */
  onPeriodoAtivoCheckedChange?: (
    periodo: PeriodoCobrancaFormId,
    checked: boolean
  ) => void;
  /** Desativa switches de ativo/inativo durante gravação em curso. */
  acoesDesabilitadas?: boolean;
};

export function PlanoFormFields({
  form,
  patch,
  nomeContadorId,
  erroNome,
  mostrarStatusPlano = false,
  precoPorAula,
  onPlanoAtivoCheckedChange,
  onPeriodoAtivoCheckedChange,
  acoesDesabilitadas = false,
}: Props) {
  const router = useRouter();
  const [editarPrecoAberto, setEditarPrecoAberto] = React.useState(false);
  const uid = React.useId();
  const nomeErroId = `${uid}-nome-erro`;
  const switchPlanoId = `${uid}-plano-ativo`;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-base font-semibold tracking-tight">Detalhes do plano</p>
        <div
          className={cn(
            "grid grid-cols-1 gap-4 sm:items-end",
            mostrarStatusPlano
              ? "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_9rem]"
              : "sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          )}
        >
        <div className="min-w-0 space-y-1.5">
          <Label className="text-sm">Nome do plano</Label>
          <InputTextoLimitado
            placeholder="Ex.: Iniciante"
            value={form.nome}
            maxLength={NOME_PLANO_MAX_LEN}
            contadorId={nomeContadorId}
            className={cn(erroNome ? "border-destructive" : undefined)}
            aria-describedby={erroNome ? nomeErroId : undefined}
            aria-invalid={erroNome ? true : undefined}
            onChange={(e) => patch({ nome: e.target.value })}
          />
          {erroNome ? (
            <p id={nomeErroId} className="text-sm text-destructive" role="alert">
              {erroNome}
            </p>
          ) : null}
        </div>
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm">Aulas por semana</Label>
            <button
              type="button"
              className="shrink-0 cursor-pointer text-sm text-primary no-underline hover:no-underline"
              onClick={() => setEditarPrecoAberto(true)}
            >
              Editar
            </button>
          </div>
          <Select value={form.remadasPorSemana} onValueChange={(v) => patch({ remadasPorSemana: v })}>
            <SelectTrigger className="h-8 w-full min-w-0 justify-between">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                const totalSemanal =
                  precoPorAula != null && precoPorAula > 0
                    ? valorSemanalAulas(precoPorAula, n)
                    : null;
                return (
                  <SelectItem key={n} value={String(n)}>
                    <span className="flex w-full min-w-0 items-center justify-between gap-4">
                      <span>
                        {n} {n === 1 ? "aula" : "aulas"}
                      </span>
                      {totalSemanal != null && totalSemanal > 0 ? (
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {formatMoedaBRL(totalSemanal)}
                        </span>
                      ) : null}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        {mostrarStatusPlano ? (
          <div className="flex w-full min-w-0 flex-shrink-0 items-center justify-start gap-2 sm:h-8 sm:pb-px">
            <Switch
              id={switchPlanoId}
              size="sm"
              className="shrink-0"
              checked={form.planoAtivo}
              disabled={acoesDesabilitadas}
              onCheckedChange={(checked) =>
                onPlanoAtivoCheckedChange
                  ? onPlanoAtivoCheckedChange(checked)
                  : patch({ planoAtivo: checked })
              }
              aria-label={form.planoAtivo ? "Plano ativo" : "Plano inativo"}
            />
            <label
              htmlFor={switchPlanoId}
              className="min-w-[4.25rem] shrink-0 cursor-pointer text-left text-sm font-normal text-foreground"
            >
              {form.planoAtivo ? "Ativo" : "Inativo"}
            </label>
          </div>
        ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-base font-semibold tracking-tight">Preços por período</p>
        <div className="flex flex-col gap-6">
          <CampoPrecoMensal
            form={form}
            patch={patch}
            precoPorAula={precoPorAula}
            onPeriodoAtivoCheckedChange={
              onPeriodoAtivoCheckedChange
                ? (c) => onPeriodoAtivoCheckedChange("mensal", c)
                : undefined
            }
            acoesDesabilitadas={acoesDesabilitadas}
          />
          <CampoPrecoPeriodo
            id="trimestral"
            form={form}
            patch={patch}
            onPeriodoAtivoCheckedChange={
              onPeriodoAtivoCheckedChange
                ? (c) => onPeriodoAtivoCheckedChange("trimestral", c)
                : undefined
            }
            acoesDesabilitadas={acoesDesabilitadas}
          />
          <CampoPrecoPeriodo
            id="semestral"
            form={form}
            patch={patch}
            onPeriodoAtivoCheckedChange={
              onPeriodoAtivoCheckedChange
                ? (c) => onPeriodoAtivoCheckedChange("semestral", c)
                : undefined
            }
            acoesDesabilitadas={acoesDesabilitadas}
          />
          <CampoPrecoPeriodo
            id="anual"
            form={form}
            patch={patch}
            onPeriodoAtivoCheckedChange={
              onPeriodoAtivoCheckedChange
                ? (c) => onPeriodoAtivoCheckedChange("anual", c)
                : undefined
            }
            acoesDesabilitadas={acoesDesabilitadas}
          />
        </div>
      </div>

      <Dialog open={editarPrecoAberto} onOpenChange={setEditarPrecoAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Preço por aula</DialogTitle>
            <DialogDescription>
              Valor de referência para calcular descontos no preço mensal e para exibir totais por aulas
              por semana na edição do plano.
            </DialogDescription>
          </DialogHeader>
          <PrecoAulaForm
            key={editarPrecoAberto ? "preco-aula-aberto" : "preco-aula-fechado"}
            valorInicial={precoPorAula}
            onSalvo={() => {
              router.refresh();
              setEditarPrecoAberto(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
