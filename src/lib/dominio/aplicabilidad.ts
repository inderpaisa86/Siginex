import { z } from "zod";

/**
 * Perfil de aplicabilidad de una organización: los 4 flags que activan o
 * desactivan preguntas del banco (ver diagnostico-sgi y el resolver del
 * orquestador de referencia). Se usan estos nombres canónicos en todo el
 * código para que el motor de scoring los consuma directamente.
 *
 *  - permAmbiental: vertimientos / permisos ambientales (Res. 631/2015)
 *  - saglaft:       SAGRLAFT / SARLAFT
 *  - ptee:          Programa de Transparencia y Ética Empresarial (Ley 2195)
 *  - rnbd:          Registro Nacional de Bases de Datos
 */
export const aplicabilidadSchema = z
  .object({
    permAmbiental: z.boolean(),
    saglaft: z.boolean(),
    ptee: z.boolean(),
    rnbd: z.boolean(),
  })
  .partial();

export type Aplicabilidad = z.infer<typeof aplicabilidadSchema>;

/** Valores por defecto: todos los flags activos (perfil más exigente). */
export const APLICABILIDAD_DEFAULT: Required<Aplicabilidad> = {
  permAmbiental: true,
  saglaft: true,
  ptee: true,
  rnbd: true,
};
