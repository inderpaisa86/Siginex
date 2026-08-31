import { createHash } from "node:crypto";
import type { Kb } from "@/lib/dominio/kb/banco";
import { aplica } from "./aplicabilidad";
import type { OrquestadorCompany, ValorRespuesta } from "./tipos";

/**
 * Generador de datos sintéticos deterministas (portado de _demo() de la
 * referencia). Útil como fixture de pruebas: NO es parte del runtime de
 * producción. Genera una respuesta por hash MD5 del id de pregunta.
 */
export function demo(kb: Kb): {
  company: OrquestadorCompany;
  answers: Record<string, ValorRespuesta>;
} {
  const company: OrquestadorCompany = {
    nombre: "Manufacturas del Valle S.A.S.",
    sector: "Manufactura / Industria",
    tamano: "mediana",
    nivel_tecnologico: 2,
    aplicabilidad: { permAmbiental: true, saglaft: false, ptee: true, rnbd: false },
  };

  const answers: Record<string, ValorRespuesta> = {};
  for (const m of kb.modulos) {
    for (const q of m.preguntas) {
      if (!aplica(q, company.aplicabilidad)) continue;
      // int(md5, 16) % 10, con BigInt para replicar exactamente al Python.
      const hex = createHash("md5").update(q.id).digest("hex");
      const hv = Number(BigInt("0x" + hex) % 10n);
      answers[q.id] = hv >= 6 ? 2 : hv >= 3 ? 1 : 0;
    }
  }
  return { company, answers };
}
