import {
  DEFAULT_SURFACE_MATERIAL_IDS,
  REFERENCE_DISTANCE_M,
  ROOM_SURFACE_IDS,
  SPEED_OF_SOUND_M_PER_S,
} from "./types.ts";
import type {
  AbsorptionResolver,
  BandValues,
  DirectPropagationPath,
  FirstOrderReflectionResult,
  ReflectionPropagationPath,
  SimulationInput,
} from "./types.ts";
import {
  distanceMeters,
  mirrorPointAcrossSurface,
  reflectionPointOnSurface,
} from "./geometry.ts";
import { SimulationValidationError, validateSimulationInput } from "./validate.ts";

function fillBand(value: number): BandValues {
  return [value, value, value, value, value, value];
}

/**
 * Energy reflection coefficient per band, `1 - alpha`: the fraction of
 * incident acoustic ENERGY reflected. Not a pressure-amplitude multiplier —
 * see {@link pressureReflectionMagnitudesFromEnergyReflection}.
 */
function energyReflectionCoefficientsFromAbsorption(absorption: BandValues): BandValues {
  return [
    1 - absorption[0],
    1 - absorption[1],
    1 - absorption[2],
    1 - absorption[3],
    1 - absorption[4],
    1 - absorption[5],
  ];
}

/**
 * Pressure reflection magnitude per band, `sqrt(1 - alpha)`. This is the
 * correct multiplier for PRESSURE amplitude `A`, so that energy summing
 * (`sum(A^2)`) restores the energy reflection fraction `1 - alpha` exactly
 * once rather than squaring it again.
 */
function pressureReflectionMagnitudesFromEnergyReflection(
  energyReflectionByBand: BandValues,
): BandValues {
  return [
    Math.sqrt(energyReflectionByBand[0]),
    Math.sqrt(energyReflectionByBand[1]),
    Math.sqrt(energyReflectionByBand[2]),
    Math.sqrt(energyReflectionByBand[3]),
    Math.sqrt(energyReflectionByBand[4]),
    Math.sqrt(energyReflectionByBand[5]),
  ];
}

function scaleBands(factors: BandValues, scale: number): BandValues {
  return [
    factors[0] * scale,
    factors[1] * scale,
    factors[2] * scale,
    factors[3] * scale,
    factors[4] * scale,
    factors[5] * scale,
  ];
}

/**
 * First-order image-source reflections: one direct path plus six single-bounce
 * paths (one per room face), each with a 6-band amplitude array.
 *
 * `amplitudeByBand` is a PRESSURE amplitude:
 *   direct:     A(b) = distanceFactor
 *   reflection: A(b) = distanceFactor * sqrt(1 - alpha(b))
 *
 * The absorption coefficient `alpha` is an ENERGY quantity, so `1 - alpha` is
 * the energy reflection fraction, not a pressure multiplier — the pressure
 * multiplier is its square root (see {@link pressureReflectionMagnitudesFromEnergyReflection}).
 * This keeps per-band totals, computed via energy summing, physically correct:
 *   E(b) = sum_i A_i(b)^2 = sum_i distanceFactor_i^2 * (1 - alpha_i(b))
 *   A(b) = sqrt(E(b))
 *
 * Absorption is supplied via {@link options.resolveAbsorption} so this module
 * never touches the filesystem.
 */
export function calculateFirstOrderReflections(
  input: SimulationInput,
  options: { resolveAbsorption: AbsorptionResolver },
): FirstOrderReflectionResult {
  validateSimulationInput(input);

  const speaker = input.speaker.position;
  const listener = input.listener.position;
  const room = input.room;

  const directDistance = distanceMeters(speaker, listener);
  if (directDistance === 0) {
    throw new SimulationValidationError([
      "Speaker and listener are at the same position; the 1 m reference-distance model is undefined.",
    ]);
  }

  const directDistanceFactor = REFERENCE_DISTANCE_M / directDistance;
  const directDelaySeconds = directDistance / SPEED_OF_SOUND_M_PER_S;
  const direct: DirectPropagationPath = {
    kind: "direct",
    distanceMeters: directDistance,
    delaySeconds: directDelaySeconds,
    delayMilliseconds: directDelaySeconds * 1000,
    distanceFactor: directDistanceFactor,
    amplitudeByBand: fillBand(directDistanceFactor),
  };

  const reflections: ReflectionPropagationPath[] = ROOM_SURFACE_IDS.map((surface) => {
    const imageSourcePosition = mirrorPointAcrossSurface(speaker, surface, room);
    const pathDistance = distanceMeters(imageSourcePosition, listener);
    const distanceFactor = REFERENCE_DISTANCE_M / pathDistance;
    const delaySeconds = pathDistance / SPEED_OF_SOUND_M_PER_S;
    const reflectionPoint = reflectionPointOnSurface(imageSourcePosition, listener, surface, room);

    const materialId =
      room.surfaces?.[surface]?.materialId ?? DEFAULT_SURFACE_MATERIAL_IDS[surface];
    const absorptionByBand = options.resolveAbsorption(materialId);
    const energyReflectionCoefficientByBand =
      energyReflectionCoefficientsFromAbsorption(absorptionByBand);
    const pressureReflectionMagnitudeByBand = pressureReflectionMagnitudesFromEnergyReflection(
      energyReflectionCoefficientByBand,
    );
    const amplitudeByBand = scaleBands(pressureReflectionMagnitudeByBand, distanceFactor);

    return {
      kind: "reflection",
      surface,
      materialId,
      imageSourcePosition,
      reflectionPoint,
      distanceMeters: pathDistance,
      delaySeconds,
      delayMilliseconds: delaySeconds * 1000,
      distanceFactor,
      absorptionByBand,
      energyReflectionCoefficientByBand,
      pressureReflectionMagnitudeByBand,
      amplitudeByBand,
    };
  });

  const energy: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
  for (const path of [direct, ...reflections]) {
    for (let b = 0; b < 6; b += 1) {
      const a = path.amplitudeByBand[b];
      energy[b] += a * a;
    }
  }

  const totalEnergyByBand: BandValues = [...energy];
  const totalAmplitudeByBand: BandValues = [
    Math.sqrt(energy[0]),
    Math.sqrt(energy[1]),
    Math.sqrt(energy[2]),
    Math.sqrt(energy[3]),
    Math.sqrt(energy[4]),
    Math.sqrt(energy[5]),
  ];

  return {
    direct,
    reflections,
    totalEnergyByBand,
    totalAmplitudeByBand,
  };
}
