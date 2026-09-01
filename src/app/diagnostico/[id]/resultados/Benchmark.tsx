"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { accionRegistrarBenchmark } from "../../actions";

interface BenchmarkData {
  nivel_empresa: number;
  promedio_mercado: number;
  rango_mercado: [number, number];
  herramientas_por_encima: number;
  brecha_al_lider: number;
  recomendacion: string;
}

const NIVELES: Array<{ n: number; label: string }> = [
  { n: 1, label: "Manual / papel" },
  { n: 2, label: "Digital básico (Excel)" },
  { n: 3, label: "Plataforma integrada" },
  { n: 4, label: "Automatizado" },
  { n: 5, label: "Inteligencia / IA" },
];

export function Benchmark({
  diagnosticoId,
  inicial,
}: {
  diagnosticoId: string;
  inicial: BenchmarkData | null;
}) {
  const [data, setData] = useState<BenchmarkData | null>(inicial);
  const [nivel, setNivel] = useState<number>(inicial?.nivel_empresa ?? 3);
  const [guardando, start] = useTransition();

  function registrar() {
    start(async () => {
      await accionRegistrarBenchmark(diagnosticoId, nivel);
      // Cálculo local para feedback inmediato (mismo que el servidor).
      setData(calcularLocal(nivel));
    });
  }

  return (
    <section className="rounded-[14px] border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <h3 className="mb-1 font-[family-name:var(--font-space-grotesk)] text-lg font-semibold">
        Benchmark de mercado
      </h3>
      <p className="mb-4 text-[12px] text-muted-foreground">
        Compara tu nivel tecnológico con las herramientas del mercado.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label className="mb-1.5 block text-[11.5px] font-semibold text-muted-foreground">
            Nivel tecnológico de tu empresa
          </label>
          <select
            value={nivel}
            onChange={(e) => setNivel(Number(e.target.value))}
            className="w-full rounded-[9px] border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-[color:var(--ring)] focus:ring-2 focus:ring-[color:var(--ring)]/30"
          >
            {NIVELES.map((n) => (
              <option key={n.n} value={n.n}>
                {n.n} · {n.label}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={registrar}
          disabled={guardando}
          className="bg-[color:var(--primary)] text-white hover:bg-[#2A4571]"
        >
          {guardando ? "Calculando…" : "Comparar"}
        </Button>
      </div>

      {data && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Tu nivel" valor={String(data.nivel_empresa)} />
            <Stat label="Promedio mercado" valor={String(data.promedio_mercado)} />
            <Stat
              label="Por encima de ti"
              valor={`${data.herramientas_por_encima} / 9`}
            />
            <Stat label="Brecha al líder" valor={String(data.brecha_al_lider)} />
          </div>
          <div className="rounded-[11px] border border-[#F3E7CC] bg-[#FFF7E6] px-4 py-3 text-[13px] leading-relaxed text-[#7a5b18]">
            <strong className="font-semibold">Recomendación.</strong>{" "}
            {data.recomendacion}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-[11px] border border-border bg-[#F8FAFC] p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.4px] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-space-grotesk)] text-[22px] font-bold leading-none">
        {valor}
      </p>
    </div>
  );
}

/** Réplica del cálculo del servidor para feedback inmediato en el cliente. */
const BENCH_NIVELES = [3, 3, 2, 2, 4, 4, 5, 4, 5];
const BENCH_RECO: Record<number, string> = {
  1: "Digitalice el SGI: pase de papel/Excel a una plataforma integrada.",
  2: "Consolide en una sola plataforma integrada (nivel 3) y elimine silos.",
  3: "Automatice flujos, alertas e indicadores (nivel 4) e incorpore analítica.",
  4: "Incorpore inteligencia (nivel 5): IA para vigilancia, priorización y recomendaciones.",
  5: "Manténgase a la vanguardia: orqueste IA sobre los datos del SGI (predicción y benchmarking).",
};
function calcularLocal(nivel: number): BenchmarkData {
  const prom = BENCH_NIVELES.reduce((a, b) => a + b, 0) / BENCH_NIVELES.length;
  return {
    nivel_empresa: nivel,
    promedio_mercado: Math.round(prom * 10) / 10,
    rango_mercado: [Math.min(...BENCH_NIVELES), Math.max(...BENCH_NIVELES)],
    herramientas_por_encima: BENCH_NIVELES.filter((x) => x > nivel).length,
    brecha_al_lider: Math.max(...BENCH_NIVELES) - nivel,
    recomendacion: BENCH_RECO[nivel] ?? "",
  };
}
