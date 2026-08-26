import {
  calculateFirstOrderReflections,
  SimulationValidationError,
  type FirstOrderReflectionResult,
  type SimulationInput,
} from "@roomtune/simulation";
import type { RoomDimensions, RoomObject } from "@/types/room";
import { defaultObjectHeightMeters } from "@/lib/runDirectSound";
import { resolveMaterialAbsorption } from "@/lib/materialAbsorption";

export type FirstOrderReflectionsView =
  | { status: "ok"; result: FirstOrderReflectionResult; assumedHeightMeters: number }
  | { status: "error"; message: string }
  | { status: "unavailable"; message: string };

/**
 * Maps 2D editor state onto the first-order reflection engine using the
 * browser-safe material absorption table (defaults: drywall walls/ceiling,
 * vinyl floor).
 */
export function runFirstOrderReflections(
  room: RoomDimensions,
  objects: RoomObject[],
): FirstOrderReflectionsView {
  const speaker = objects.find((object) => object.kind === "speaker");
  const listener = objects.find((object) => object.kind === "listener");

  if (!speaker || !listener) {
    return {
      status: "unavailable",
      message: "Place a speaker and a listener to calculate first-order reflections.",
    };
  }

  const assumedHeightMeters = defaultObjectHeightMeters(room.height);
  const input: SimulationInput = {
    room: {
      width: room.width,
      length: room.length,
      height: room.height,
    },
    speaker: {
      position: { x: speaker.position.x, y: speaker.position.y, z: assumedHeightMeters },
    },
    listener: {
      position: { x: listener.position.x, y: listener.position.y, z: assumedHeightMeters },
    },
  };

  try {
    return {
      status: "ok",
      result: calculateFirstOrderReflections(input, {
        resolveAbsorption: resolveMaterialAbsorption,
      }),
      assumedHeightMeters,
    };
  } catch (error) {
    if (error instanceof SimulationValidationError) {
      return { status: "error", message: error.message };
    }
    const message =
      error instanceof Error ? error.message : "First-order reflection calculation failed.";
    return { status: "error", message };
  }
}
