import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { storeBytes } from "@/lib/media";
import type { PanoSlot } from "@/lib/plan-generator";

// Original illustrations (seed/images) used for sample listings and for AI-drafted
// listings until the owner uploads real photos. Every image is watermarked
// "Illustration — not a real photo" and flagged is_illustration in the database.

const DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "seed", "images");

export const PANO_FILES: Record<PanoSlot, [file: string, title: string]> = {
  living: ["pano-living.jpg", "Living room"],
  bedroom: ["pano-bedroom.jpg", "Master bedroom"],
  terrace: ["pano-terrace.jpg", "Terrace & pool"],
};

export function pickIllustrations(type: string, features: string[], seed: string): { photos: string[]; panos: PanoSlot[] } {
  const has = (f: RegExp) => features.some((x) => f.test(x));
  const pick = (opts: string[]) => opts[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % opts.length];
  const outdoor = has(/pool|garden|terrace/);
  switch (type) {
    case "Villa":
      return {
        photos: [pick(["villa-sand.jpg", "villa-white.jpg", "villa-terracotta.jpg", "villa-grey.jpg"]), "living-blue.jpg", "kitchen.jpg", "bedroom.jpg", ...(outdoor ? ["garden.jpg"] : [])],
        panos: ["living", "bedroom", ...(outdoor ? (["terrace"] as PanoSlot[]) : [])],
      };
    case "Townhouse":
      return { photos: [pick(["townhouses.jpg", "townhouses-modern.jpg"]), "living-sage.jpg", "bedroom-warm.jpg", "kitchen.jpg"], panos: ["living", "bedroom"] };
    case "Apartment":
    case "Penthouse":
      return {
        photos: [has(/sea|beach|marina/) ? "tower-marina.jpg" : has(/skyline/) ? "tower-night.jpg" : "tower-city.jpg", "living-blue.jpg", "bedroom.jpg", "kitchen-dark.jpg"],
        panos: ["living", "bedroom", ...(type === "Penthouse" || has(/terrace/) ? (["terrace"] as PanoSlot[]) : [])],
      };
    case "Land":
      return { photos: ["land.jpg"], panos: [] };
    default:
      return { photos: ["tower-city.jpg", "office.jpg"], panos: [] };
  }
}

/** Copies one illustration into uploads under a new name. */
export async function copyIllustration(file: string) {
  const stored = await storeBytes(new Uint8Array(await readFile(path.join(/* turbopackIgnore: true */ DIR, file))));
  if (!stored.ok) throw new Error(`Bad illustration ${file}`);
  return stored;
}
