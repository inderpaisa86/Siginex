"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { accionGuardarRespuestas, accionCalcular } from "../actions";

interface Pregunta {
  id: string;
  pregunta: string;
  norma: string;
}
interface Modulo {
  id: string;
  nombre: string;
  short: string;
  preguntas: Pregunta[];
}

const OPCIONES: Array<{ valor: string; label: string; color: string }> = [
  { valor: "0", label: "No cumple", color: "#C0433A" },
  { valor: "1", label: "Parcial", color: "#D8862B" },
  { valor: "2", label: "Cumple", color: "#2F8A66" },
  { valor: "na", label: "N/A", color: "#64748B" },
];

export function Cuestionario({
  diagnosticoId,
  modulos,
  respuestasIniciales,
}: {
  diagnosticoId: string;
  modulos: Modulo[];
  respuestasIniciales: Record<string, string>;
}) {
  const [respuestas, setRespuestas] =
    useState<Record<string, string>>(respuestasIniciales);
  const [moduloIdx, setModuloIdx] = useState(0);
  const [guardando, startGuardar] = useTransition();
  const [calculando, startCalcular] = useTransition();

  const modulo = modulos[moduloIdx];
  const totalPreguntas = useMemo(
    () => modulos.reduce((a, m) => a + m.preguntas.length, 0),
    [modulos],
  );
  const respondidas = Object.keys(respuestas).length;
  const progreso = Math.round((respondidas / totalPreguntas) * 100);

  function responder(preguntaId: string, valor: string) {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: valor }));
  }

  function guardarModulo() {
    const lote = modulo.preguntas
      .filter((q) => respuestas[q.id] !== undefined)
      .map((q) => ({ preguntaId: q.id, valor: respuestas[q.id] }));
    if (lote.length === 0) return;
    startGuardar(async () => {
      await accionGuardarRespuestas(diagnosticoId, lote);
    });
  }

  function siguiente() {
    guardarModulo();
    if (moduloIdx < modulos.length - 1) setModuloIdx((i) => i + 1);
  }
  function anterior() {
    if (moduloIdx > 0) setModuloIdx((i) => i - 1);
  }

  function calcular() {
    // Guarda todo lo respondido y calcula.
    const lote = Object.entries(respuestas).map(([preguntaId, valor]) => ({
      preguntaId,
      valor,
    }));
    startCalcular(async () => {
      if (lote.length) await accionGuardarRespuestas(diagnosticoId, lote);
      await accionCalcular(diagnosticoId);
    });
  }

  return (
    <div className="space-y-5">
      {/* Barra de progreso + navegación de módulos */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap gap-1.5">
          {modulos.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setModuloIdx(i)}
              className="rounded-[7px] px-2.5 py-1.5 font-[family-name:var(--font-plex-mono)] text-[11px] font-semibold transition-colors"
              style={
                i === moduloIdx
                  ? { background: "#2A4571", color: "#fff" }
                  : { background: "#EDF1F6", color: "#64748B" }
              }
            >
              {m.short}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-[7px] w-32 overflow-hidden rounded-full bg-[#D7DFEA]">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progreso}%`, background: "var(--gold)" }}
            />
          </div>
          <span className="font-[family-name:var(--font-plex-mono)] text-xs font-semibold text-muted-foreground">
            {respondidas}/{totalPreguntas}
          </span>
        </div>
      </div>

      {/* Preguntas del módulo */}
      <div className="rounded-[14px] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold">
          {modulo.nombre}
        </h3>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Módulo {moduloIdx + 1} de {modulos.length} · {modulo.preguntas.length}{" "}
          preguntas
        </p>

        <div className="divide-y divide-[color:var(--border)]">
          {modulo.preguntas.map((q, i) => (
            <div key={q.id} className="py-4">
              <div className="flex gap-3">
                <span className="pt-0.5 font-[family-name:var(--font-plex-mono)] text-xs font-semibold text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <p className="text-[14.5px] font-medium leading-snug">
                    {q.pregunta}
                  </p>
                  {q.norma && (
                    <p className="mt-1 font-[family-name:var(--font-plex-mono)] text-[11px] text-muted-foreground">
                      {q.norma}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {OPCIONES.map((op) => {
                      const sel = respuestas[q.id] === op.valor;
                      return (
                        <button
                          key={op.valor}
                          onClick={() => responder(q.id, op.valor)}
                          className="rounded-[9px] border-[1.5px] px-3.5 py-2 text-[12.5px] font-semibold transition-colors"
                          style={
                            sel
                              ? { background: op.color, borderColor: op.color, color: "#fff" }
                              : { background: "#fff", borderColor: "#E1E7F0", color: "#64748B" }
                          }
                        >
                          {op.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navegación */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            onClick={anterior}
            disabled={moduloIdx === 0}
            className="border border-border bg-white text-foreground hover:bg-muted disabled:opacity-40"
          >
            Anterior
          </Button>
          <div className="flex gap-3">
            <Button
              onClick={guardarModulo}
              disabled={guardando}
              className="border border-border bg-white text-foreground hover:bg-muted"
            >
              {guardando ? "Guardando…" : "Guardar"}
            </Button>
            {moduloIdx < modulos.length - 1 ? (
              <Button
                onClick={siguiente}
                className="bg-[color:var(--primary)] text-white hover:bg-[#2A4571]"
              >
                Siguiente módulo
              </Button>
            ) : (
              <Button
                onClick={calcular}
                disabled={calculando}
                className="bg-[color:var(--gold)] text-white hover:bg-[#a9781f]"
              >
                {calculando ? "Calculando…" : "Calcular diagnóstico"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
