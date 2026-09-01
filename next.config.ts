import type { NextConfig } from "next";

// En Vercel NO usamos output:standalone (Vercel hace su propio empaquetado y
// el modo standalone provoca errores de traza .nft.json). El standalone solo
// se activa fuera de Vercel, para el build de Docker (VM propia / local).
const esVercel = !!process.env.VERCEL;

const nextConfig: NextConfig = {
  ...(esVercel ? {} : { output: "standalone" as const }),
};

export default nextConfig;
