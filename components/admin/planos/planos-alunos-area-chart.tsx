"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  chaveSeriePlano,
  montarLinhasGraficoAlunosPorPlano,
  type PeriodoGraficoPlanos,
} from "@/lib/planos-alunos-chart-data";
import type { PlanoLinha } from "@/lib/planos-tipos";

const PERIODOS: { value: PeriodoGraficoPlanos; label: string }[] = [
  { value: "rolling12", label: "12 meses" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
];

/** Duração do morph do empilhamento (sem atraso entre séries — evita “onda” horizontal). */
const AREA_ANIM_DURATION_MS = 600;

/**
 * Tons mais claros (~400/300) para áreas e traços menos pesados no gráfico.
 */
const CORES_PLANOS: readonly string[] = [
  "#60a5fa", // blue-400
  "#fb923c", // orange-400
  "#c084fc", // purple-400
  "#f472b6", // pink-400
  "#2dd4bf", // teal-400
  "#fbbf24", // amber-400
  "#f87171", // red-400
  "#818cf8", // indigo-400
  "#22d3ee", // cyan-400
  "#e879f9", // fuchsia-400
  "#a3e635", // lime-400
  "#a78bfa", // violet-400
];

type Props = {
  planos: PlanoLinha[];
};

/**
 * `null` = todos os planos visíveis no gráfico.
 * `Set` = apenas as chaves presentes no conjunto.
 */
function alternarSelecaoLegenda(
  prev: Set<string> | null,
  key: string
): Set<string> | null {
  if (prev === null) {
    return new Set([key]);
  }
  if (prev.size === 1 && prev.has(key)) {
    return null;
  }
  const next = new Set(prev);
  if (next.has(key)) {
    next.delete(key);
    if (next.size === 0) {
      return null;
    }
    return next;
  }
  next.add(key);
  return next;
}

export function PlanosAlunosAreaChart({ planos }: Props) {
  const uid = useId().replace(/:/g, "");
  const [periodo, setPeriodo] = useState<PeriodoGraficoPlanos>("rolling12");
  const [selecao, setSelecao] = useState<Set<string> | null>(null);

  const planosOrdenados = useMemo(
    () => [...planos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [planos]
  );

  const dados = useMemo(
    () =>
      montarLinhasGraficoAlunosPorPlano(periodo, planosOrdenados.length),
    [periodo, planosOrdenados.length]
  );

  const coresPorIndice = useMemo(
    () =>
      planosOrdenados.map((_, i) => CORES_PLANOS[i % CORES_PLANOS.length]!),
    [planosOrdenados]
  );

  const chartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    planosOrdenados.forEach((p, i) => {
      cfg[chaveSeriePlano(i)] = {
        label: p.nome,
        color: coresPorIndice[i],
      };
    });
    return cfg;
  }, [planosOrdenados, coresPorIndice]);

  const planoVisivel = useCallback(
    (indice: number) => {
      const key = chaveSeriePlano(indice);
      return selecao === null || selecao.has(key);
    },
    [selecao]
  );

  const onLegendaClick = useCallback((key: string) => {
    setSelecao((prev) => alternarSelecaoLegenda(prev, key));
  }, []);

  const semPlanos = planosOrdenados.length === 0;

  /** Ordem da legenda = ordem de `planosOrdenados` (nome A→Z). */
  const indicesVisiveisLegenda = useMemo(() => {
    return planosOrdenados
      .map((_, i) => i)
      .filter((i) => planoVisivel(i));
  }, [planosOrdenados, planoVisivel]);

  /**
   * No Recharts, a primeira `Area` fica na base do stack e a última no topo.
   * Para o 1.º item da legenda permanecer sempre “por cima”, renderizamos na ordem inversa.
   */
  const indicesRenderArea = useMemo(
    () => [...indicesVisiveisLegenda].reverse(),
    [indicesVisiveisLegenda]
  );

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Alunos por plano
        </h2>
        <Select
          value={periodo}
          onValueChange={(v) => setPeriodo(v as PeriodoGraficoPlanos)}
        >
          <SelectTrigger
            className="h-9 w-full sm:w-[8.75rem] sm:shrink-0"
            aria-label="Período do gráfico"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {PERIODOS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[min(320px,50vh)] w-full min-h-[240px]"
      >
        <AreaChart
          accessibilityLayer
          data={dados}
          margin={{ left: 4, right: 4, top: 8, bottom: 0 }}
        >
          <defs>
            {planosOrdenados.map((_, i) => {
              const c = coresPorIndice[i];
              return (
                <linearGradient
                  key={`g-${i}`}
                  id={`${uid}-grad-${i}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={c} stopOpacity={0.38} />
                  <stop offset="55%" stopColor={c} stopOpacity={0.14} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.03} />
                </linearGradient>
              );
            })}
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="mesRotulo"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={36}
            allowDecimals={false}
            domain={semPlanos ? [0, 1] : undefined}
          />
            <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelClassName="w-full min-w-[13rem]"
                labelFormatter={(_, payload) => {
                  const items = payload ?? [];
                  const total = items.reduce((acc, item) => {
                    const v = item.value;
                    return (
                      acc +
                      (typeof v === "number" ? v : Number(v) || 0)
                    );
                  }, 0);

                  const raw = items[0]?.payload as
                    | { mesId?: string; mesRotulo?: string }
                    | undefined;

                  let tituloMes = "";
                  if (raw?.mesId) {
                    const [y, m] = raw.mesId.split("-");
                    if (y && m) {
                      const d = new Date(Number(y), Number(m) - 1, 1);
                      tituloMes = d.toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                      });
                    }
                  }
                  if (!tituloMes && raw?.mesRotulo) {
                    tituloMes = raw.mesRotulo;
                  }

                  return (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="min-w-0 flex-1 text-left leading-snug">
                        {tituloMes || "—"}
                      </span>
                      <span className="shrink-0 tabular-nums font-semibold text-foreground">
                        {total.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          {indicesRenderArea.map((i) => {
              const key = chaveSeriePlano(i);
              const stroke = coresPorIndice[i];
              return (
                <Area
                  key={key}
                  dataKey={key}
                  type="natural"
                  fill={`url(#${uid}-grad-${i})`}
                  fillOpacity={1}
                  stroke={stroke}
                  strokeWidth={0.85}
                  stackId="a"
                  isAnimationActive
                  animationDuration={AREA_ANIM_DURATION_MS}
                  animationEasing="ease-in-out"
                  animationBegin={0}
                />
              );
            })}
        </AreaChart>
      </ChartContainer>

      {!semPlanos && (
      <div
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-1"
        role="group"
        aria-label="Legenda dos planos — clique para filtrar"
      >
        {planosOrdenados.map((p, i) => {
          const key = chaveSeriePlano(i);
          const ativoNoGrafico = selecao === null || selecao.has(key);
          const c = coresPorIndice[i];
          return (
            <button
              key={key}
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs transition-opacity",
                "hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                !ativoNoGrafico && "opacity-35"
              )}
              onClick={() => onLegendaClick(key)}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: c }}
                aria-hidden
              />
              <span
                className={cn(
                  "text-muted-foreground",
                  ativoNoGrafico && "text-foreground"
                )}
              >
                {p.nome}
              </span>
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}
