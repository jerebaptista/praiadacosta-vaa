"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { format, isValid, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { atualizarRemada } from "@/app/actions/remadas";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { RemadaLinha } from "@/lib/remadas-geracao";
import { normalizarVagas } from "@/lib/remadas-validacao";

const HORAS_00_23 = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MINUTOS_5 = [
  "00",
  "05",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
] as const;

function horaLocalRedonda5(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "04:00";
  let h = d.getHours();
  let m = d.getMinutes();
  const r = Math.round(m / 5) * 5;
  if (r === 60) {
    h = (h + 1) % 24;
    m = 0;
  } else {
    m = r;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function partesHora(hhmm: string): { hh: string; mm: string } {
  const [a, b] = hhmm.split(":");
  const h = Number.parseInt(a ?? "", 10);
  const hh = Number.isFinite(h)
    ? String(Math.min(23, Math.max(0, h))).padStart(2, "0")
    : "04";
  const mm = MINUTOS_5.includes((b ?? "") as (typeof MINUTOS_5)[number])
    ? b!
    : "00";
  return { hh, mm };
}

type Props = {
  remada: RemadaLinha | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditarRemadaDialog({ remada, open, onOpenChange }: Props) {
  const router = useRouter();
  const idData = useId();
  const idVagas = useId();

  const [dataInicio, setDataInicio] = useState("");
  const [hora, setHora] = useState("04:00");
  const [vagasStr, setVagasStr] = useState("5");
  const [erro, setErro] = useState<string | null>(null);
  const [popoverAberto, setPopoverAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open || !remada) return;
    setErro(null);
    const d = new Date(remada.data_hora);
    setDataInicio(isValid(d) ? format(d, "yyyy-MM-dd") : "");
    setHora(horaLocalRedonda5(remada.data_hora));
    setVagasStr(String(remada.vagas));
    setPopoverAberto(false);
  }, [open, remada]);

  const dataSelecionada = useMemo(() => {
    if (!dataInicio) return undefined;
    const d = parse(dataInicio, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [dataInicio]);

  const { hh: horaH, mm: horaM } = useMemo(() => partesHora(hora), [hora]);

  async function handleSalvar() {
    if (!remada) return;
    setErro(null);
    const vagas = normalizarVagas(vagasStr);
    if (vagas == null) {
      setErro("Vagas inválidas.");
      return;
    }
    setSalvando(true);
    try {
      await atualizarRemada(remada.id, {
        dataYmd: dataInicio,
        hora: `${horaH}:${horaM}`,
        vagas,
      });
      router.refresh();
      onOpenChange(false);
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível guardar alterações."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Editar remada</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="space-y-2">
            <Label htmlFor={idData}>Data</Label>
            <Popover open={popoverAberto} onOpenChange={setPopoverAberto}>
              <PopoverTrigger asChild>
                <Button
                  id={idData}
                  type="button"
                  variant="outline"
                  className="h-8 w-full justify-start gap-2 font-normal"
                >
                  <CalendarIcon className="size-4 opacity-60" />
                  {dataSelecionada
                    ? format(dataSelecionada, "dd/MM/yyyy", { locale: ptBR })
                    : "Escolher data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="z-[300] w-auto p-0 data-open:duration-100 data-closed:duration-100 data-open:zoom-in-100"
                align="start"
              >
                <Calendar
                  mode="single"
                  showOutsideDays={false}
                  locale={ptBR}
                  selected={dataSelecionada}
                  onSelect={(d) => {
                    if (d) {
                      setDataInicio(format(d, "yyyy-MM-dd"));
                      setPopoverAberto(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <span
              className="text-sm font-medium leading-none"
              id={`${idData}-hora`}
            >
              Horário
            </span>
            <div
              className="flex items-center gap-1.5"
              role="group"
              aria-labelledby={`${idData}-hora`}
            >
              <Select
                value={horaH}
                onValueChange={(h) => setHora(`${h}:${horaM}`)}
              >
                <SelectTrigger
                  className="h-8 min-w-0 flex-1"
                  aria-label="Hora"
                  showChevron={false}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[300] max-h-60">
                  {HORAS_00_23.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span
                className="shrink-0 text-sm text-muted-foreground"
                aria-hidden
              >
                :
              </span>
              <Select
                value={horaM}
                onValueChange={(m) => setHora(`${horaH}:${m}`)}
              >
                <SelectTrigger
                  className="h-8 min-w-0 flex-1"
                  aria-label="Minutos"
                  showChevron={false}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[300]">
                  {MINUTOS_5.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={idVagas}>Vagas</Label>
            <Input
              id={idVagas}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={2}
              className="h-8"
              value={vagasStr}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                setVagasStr(v);
              }}
            />
          </div>

          {erro ? (
            <p className="text-sm text-destructive" role="alert">
              {erro}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={salvando}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={salvando || !remada}
            onClick={() => void handleSalvar()}
          >
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
