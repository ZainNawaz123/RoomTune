import { SPEED_OF_SOUND_M_PER_S } from "./types.ts";
import type { SimulationInput, SimulationResult } from "./types.ts";
import { distanceMeters } from "./geometry.ts";
import { validateSimulationInput } from "./validate.ts";

/**
 * Direct-path (line-of-sight) propagation from one speaker to one listener.
 *
 * Distance is 3D Euclidean:
 *   d = sqrt((x_s - x_l)^2 + (y_s - y_l)^2 + (z_s - z_l)^2)
 *
 * Delay uses a constant speed of sound:
 *   t = d / 343
 *
 * Wall materials are not used: direct sound does not reflect.
 */
export function calculateDirectSound(input: SimulationInput): SimulationResult {
  validateSimulationInput(input);

  const directDistanceMeters = distanceMeters(input.speaker.position, input.listener.position);
  const propagationDelaySeconds = directDistanceMeters / SPEED_OF_SOUND_M_PER_S;
  const propagationDelayMilliseconds = propagationDelaySeconds * 1000;

  return {
    directDistanceMeters,
    propagationDelaySeconds,
    propagationDelayMilliseconds,
  };
}
