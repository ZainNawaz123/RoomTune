/**
 * Node-only adapter: materials CSV -> AbsorptionResolver for the simulation layer.
 *
 * Kept outside `backend/src/simulation/` so `node:fs` never enters the
 * browser-bundled `@roomtune/simulation` package.
 */

import {
  BAND_FREQUENCIES_HZ,
  type AbsorptionResolver,
  type BandValues,
} from "../simulation/types.ts";
import {
  getMaterialById,
  loadMaterials,
  MEASURED_BAND_FREQUENCIES_HZ,
  MaterialDataError,
} from "./materials.ts";

function assertBandFrequenciesMatch(): void {
  if (MEASURED_BAND_FREQUENCIES_HZ.length !== BAND_FREQUENCIES_HZ.length) {
    throw new MaterialDataError(
      `Band frequency count mismatch: materials has ${MEASURED_BAND_FREQUENCIES_HZ.length}, simulation has ${BAND_FREQUENCIES_HZ.length}.`,
    );
  }
  for (let i = 0; i < BAND_FREQUENCIES_HZ.length; i += 1) {
    if (MEASURED_BAND_FREQUENCIES_HZ[i] !== BAND_FREQUENCIES_HZ[i]) {
      throw new MaterialDataError(
        `Band frequency mismatch at index ${i}: materials ${MEASURED_BAND_FREQUENCIES_HZ[i]} Hz vs simulation ${BAND_FREQUENCIES_HZ[i]} Hz.`,
      );
    }
  }
}

/**
 * Builds an {@link AbsorptionResolver} backed by the acoustic materials CSV.
 * Results from {@link loadMaterials} are cached; this wrapper only looks up
 * the six measured band alphas (no log-frequency interpolation).
 */
export function createCsvAbsorptionResolver(csvPath?: string): AbsorptionResolver {
  assertBandFrequenciesMatch();
  const materials = loadMaterials(csvPath);

  return (materialId: string): BandValues => {
    const material = getMaterialById(materials, materialId);
    if (material.bands.length !== 6) {
      throw new MaterialDataError(
        `Material "${materialId}" has ${material.bands.length} bands; expected 6.`,
      );
    }
    return [
      material.bands[0].alpha,
      material.bands[1].alpha,
      material.bands[2].alpha,
      material.bands[3].alpha,
      material.bands[4].alpha,
      material.bands[5].alpha,
    ];
  };
}
