// Extrae `const BANK` del HTML de referencia y lo guarda como JSON versionado
// en src/lib/dominio/kb/banco.json. Ejecutar: node scripts/extraer-banco.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";

const HTML =
  "c:\\Jose\\RepoSiginex\\reference\\siginex-autodiagnostico-500.html";
const OUT = resolve("src/lib/dominio/kb/banco.json");

const html = readFileSync(HTML, "utf8");
const raw = html
  .split("const BANK = ")[1]
  .split("</script>")[0]
  .trim()
  .replace(/;$/, "");
const bank = JSON.parse(raw);

// Normaliza a la forma que consume el orquestador.
const modulos = bank.modulos.map((m) => ({
  id: m.id,
  nombre: m.name ?? m.short ?? m.id,
  short: m.short ?? m.id,
  weight: m.weight,
  escala: m.escala ?? null,
  preguntas: m.preguntas.map((q) => ({
    id: q.id,
    pregunta: q.pregunta,
    norma: q.norma ?? "",
    articulo: q.articulo ?? "",
    requisito: q.requisito ?? "",
    criterio: q.criterio ?? "",
    peso: q.peso,
    recomendacion: q.recomendacion ?? {},
  })),
}));

const total = modulos.reduce((a, m) => a + m.preguntas.length, 0);
const checksum =
  "sha256:" +
  createHash("sha256").update(JSON.stringify(modulos)).digest("hex");

const salida = {
  kb_version: "3.0.0",
  total_preguntas: total,
  checksum,
  modulos,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(salida, null, 2), "utf8");

console.log(
  JSON.stringify(
    {
      escrito: OUT,
      total_preguntas: total,
      modulos: modulos.map((m) => ({ id: m.id, n: m.preguntas.length })),
      checksum,
    },
    null,
    2,
  ),
);
