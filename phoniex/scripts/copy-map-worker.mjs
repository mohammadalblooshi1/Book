// Copies MapLibre's web worker into public/ so the browser can load it
// (bundlers cannot resolve the worker URL MapLibre computes at runtime).
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
const src = "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs";
if (existsSync(src)) {
  mkdirSync("public/maplibre", { recursive: true });
  copyFileSync(src, "public/maplibre/maplibre-gl-worker.mjs");
}
