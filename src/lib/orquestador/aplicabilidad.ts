import type { PreguntaKb } from "@/lib/dominio/kb/banco";
import type { Aplicabilidad } from "@/lib/dominio/aplicabilidad";

/**
 * Resolver de aplicabilidad (portado 1:1 de siginex_orchestrator.py::applicable).
 *
 * Devuelve false si la pregunta NO aplica según el perfil de la empresa.
 * El match se hace sobre el texto combinado de norma + articulo + requisito +
 * pregunta en minúsculas, contra las palabras clave de cada flag.
 *
 * Los flags no definidos se tratan como desactivados (igual que el .get() de
 * Python que devuelve falsy), lo que excluye las preguntas condicionadas.
 */
export function aplica(q: PreguntaKb, profile: Aplicabilidad): boolean {
  const s = [q.norma, q.articulo, q.requisito, q.pregunta]
    .join(" ")
    .toLowerCase();

  if (!profile.permAmbiental && (s.includes("631") || s.includes("vertimiento"))) {
    return false;
  }
  if (
    !profile.saglaft &&
    ["saglaft", "sarlaft", "supersociedades", "la/ft", "lavado"].some((t) =>
      s.includes(t),
    )
  ) {
    return false;
  }
  if (!profile.ptee && s.includes("ptee")) {
    return false;
  }
  if (!profile.rnbd && s.includes("rnbd")) {
    return false;
  }
  return true;
}
