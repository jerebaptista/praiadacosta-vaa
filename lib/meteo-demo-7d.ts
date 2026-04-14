import type { MeteoDiaSnapshot } from "@/lib/meteo";
import {
  chavesProximosNDias,
  METEO_DIAS_SEGUINTES,
  METEO_FUSO_PADRAO,
} from "@/lib/meteo";

const ICONES_DEMO = ["01d", "02d", "03d", "04d", "10d"] as const;

/** Só para dev quando não há linhas no Supabase; cobre a janela de previsão (hoje + próximos). */
export function previsaoDemoMeteoJanela(
  fuso = METEO_FUSO_PADRAO
): Record<string, MeteoDiaSnapshot> {
  const keys = chavesProximosNDias(METEO_DIAS_SEGUINTES, fuso);
  const out: Record<string, MeteoDiaSnapshot> = {};
  keys.forEach((key, idx) => {
    const i = idx % ICONES_DEMO.length;
    out[key] = {
      temperatura_c: 22 + (idx % 9) + (idx % 3) * 0.5,
      icon: ICONES_DEMO[i],
    };
  });
  return out;
}
