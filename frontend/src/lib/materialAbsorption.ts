/**
 * Browser-safe absorption lookup keyed by material id.
 *
 * Mirrors the six octave-band alphas from
 * backend/data/roomtune_acoustic_materials.csv so the client can resolve
 * materials without touching node:fs. Keep in sync with the CSV when
 * presets change.
 */

import type { BandValues } from "@roomtune/simulation";

export const MATERIAL_ABSORPTION_BY_ID: Readonly<Record<string, BandValues>> = {
  drywall_standard: [0.3, 0.12, 0.08, 0.06, 0.06, 0.05],
  painted_plaster: [0.02, 0.02, 0.02, 0.02, 0.02, 0.02],
  concrete_smooth_painted: [0.01, 0.01, 0.01, 0.02, 0.02, 0.02],
  concrete_rough: [0.02, 0.03, 0.03, 0.03, 0.04, 0.07],
  brick_standard: [0.05, 0.04, 0.02, 0.04, 0.05, 0.05],
  ceramic_tile_smooth: [0.01, 0.01, 0.01, 0.02, 0.02, 0.02],
  wood_paneling: [0.15, 0.2, 0.1, 0.1, 0.1, 0.1],
  glass_single_6mm: [0.1, 0.06, 0.04, 0.03, 0.02, 0.02],
  glass_double: [0.15, 0.05, 0.03, 0.03, 0.02, 0.02],
  curtain_light: [0.05, 0.06, 0.39, 0.63, 0.7, 0.73],
  curtain_heavy_velour: [0.05, 0.25, 0.4, 0.5, 0.6, 0.5],
  acoustic_foam_25mm: [0.09, 0.22, 0.54, 0.76, 0.88, 0.93],
  acoustic_foam_50mm: [0.18, 0.56, 0.96, 1.0, 1.0, 1.0],
  fiberglass_panel_50mm: [0.27, 0.54, 0.94, 1.0, 0.96, 0.96],
  rockwool_panel_50mm: [0.11, 0.6, 0.96, 0.94, 0.92, 0.82],
  acoustic_timber_panel: [0.18, 0.34, 0.42, 0.59, 0.83, 0.68],
  wood_floor: [0.15, 0.11, 0.1, 0.07, 0.06, 0.07],
  vinyl_linoleum_floor: [0.02, 0.02, 0.03, 0.04, 0.04, 0.05],
  carpet_thin: [0.1, 0.15, 0.25, 0.3, 0.3, 0.3],
  carpet_standard_9mm: [0.08, 0.08, 0.3, 0.6, 0.75, 0.8],
  carpet_thick_15mm: [0.15, 0.25, 0.5, 0.6, 0.7, 0.7],
  stone_marble_floor: [0.01, 0.01, 0.01, 0.01, 0.02, 0.02],
  door_hollowcore_wood: [0.3, 0.25, 0.15, 0.1, 0.1, 0.07],
  door_solid_timber: [0.14, 0.1, 0.06, 0.08, 0.1, 0.1],
  ceiling_mineral_wool_tile: [0.42, 0.72, 0.83, 0.88, 0.89, 0.8],
};

export function resolveMaterialAbsorption(materialId: string): BandValues {
  const bands = MATERIAL_ABSORPTION_BY_ID[materialId];
  if (!bands) {
    throw new Error(`Unknown material id "${materialId}".`);
  }
  return bands;
}
