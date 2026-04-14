"use client";

import { useId, useMemo, useState } from "react";
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
import {
  montarSerieCadastrosPorMes,
  type LinhaGraficoCadastroAlunos,
} from "@/lib/alunos-cadastro-chart-data";
import type { PeriodoGraficoPlanos } from "@/lib/planos-alunos-chart-data";

const PERIODOS: { value: PeriodoGraficoPlanos; label: string }[] = [
  { value: "rolling12", label: "12 meses" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
];

const AREA_ANIM_DURATION_MS = 600;

const chartConfig = {
  total: {
    label: "Alunos",
    /** `oklch` em `globals.css` — não usar `hsl(var(--primary))` (fica inválido no SVG). */
    color: "var(--primary)",
  },
} satisfies ChartConfig;

type Props = {
  cadastroMesIds: (string | null | undefined)[];
};

export function AlunosCadastroAreaChart({ cadastroMesIds }: Props) {
  const uid = useId().replace(/:/g, "");
  const [periodo, setPeriodo] = useState<PeriodoGraficoPlanos>("rolling12");

  const dados: LinhaGraficoCadastroAlunos[] = useMemo(
    () => montarSerieCadastrosPorMes(periodo, cadastroMesIds),
    [periodo, cadastroMesIds]
  );

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Alunos por mês
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
            <linearGradient
              id={`${uid}-grad-primary`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="var(--primary)"
                stopOpacity={0.32}
              />
              <stop
                offset="55%"
                stopColor="var(--primary)"
                stopOpacity={0.12}
              />
              <stop
                offset="100%"
                stopColor="var(--primary)"
                stopOpacity={0.03}
              />
            </linearGradient>
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
            domain={[0, "auto"]}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="dot"
                labelClassName="w-full min-w-[13rem]"
                labelFormatter={(_, payload) => {
                  const raw = payload?.[0]?.payload as
                    | { mesId?: string; mesRotulo?: string; total?: number }
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

                  const total =
                    typeof raw?.total === "number" ? raw.total : Number(raw?.total) || 0;

                  return (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="min-w-0 flex-1 text-left leading-snug capitalize">
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
          <Area
            dataKey="total"
            type="natural"
            fill={`url(#${uid}-grad-primary)`}
            fillOpacity={1}
            stroke="var(--primary)"
            strokeOpacity={0.55}
            strokeWidth={1}
            isAnimationActive
            animationDuration={AREA_ANIM_DURATION_MS}
            animationEasing="ease-in-out"
            animationBegin={0}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
