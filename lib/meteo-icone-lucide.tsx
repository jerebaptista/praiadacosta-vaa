import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function iconePorCodigoOpenWeather(codigo: string | null): LucideIcon {
  if (codigo == null || codigo === "") return Cloud;
  const c = codigo.slice(0, 3);
  switch (c) {
    case "01d":
      return Sun;
    case "01n":
      return Moon;
    case "02d":
      return CloudSun;
    case "02n":
      return Cloud;
    case "03d":
    case "03n":
      return Cloud;
    case "04d":
    case "04n":
      return Cloud;
    case "09d":
    case "09n":
      return CloudDrizzle;
    case "10d":
    case "10n":
      return CloudRain;
    case "11d":
    case "11n":
      return CloudLightning;
    case "13d":
    case "13n":
      return CloudSnow;
    case "50d":
    case "50n":
      return CloudFog;
    default:
      return Cloud;
  }
}

type Props = {
  codigo: string | null;
  className?: string;
};

/** Ícone Lucide (stack shadcn) a partir do código OpenWeather (ex.: `01d`, `10n`). */
export function MeteoIconeLucide({ codigo, className }: Props) {
  const Icon = iconePorCodigoOpenWeather(codigo);
  return (
    <Icon
      className={cn("size-3.5 shrink-0 text-muted-foreground", className)}
      aria-hidden
    />
  );
}
