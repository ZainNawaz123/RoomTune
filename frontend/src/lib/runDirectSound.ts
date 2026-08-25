import {
  calculateDirectSound,
  SimulationValidationError,
  type SimulationInput,
  type SimulationResult,
} from "@roomtune/simulation";
import type { RoomDimensions, RoomObject } from "@/types/room";

/**
 * Temporary default z (meters) used while the editor is 2D. Typical seated
 * ear / tweeter height. The simulation engine does not hard-code this;
 * it always uses the z supplied on each endpoint.
 */
export const DEFAULT_OBJECT_HEIGHT_M = 1.2;

/** A z that stays inside the room so the default never fails validation. */
export function defaultObjectHeightMeters(roomHeight: number): number {
  if (!(roomHeight > 0)) return DEFAULT_OBJECT_HEIGHT_M;
  return Math.min(DEFAULT_OBJECT_HEIGHT_M, roomHeight);
}

export type DirectSoundView =
  | { status: "ok"; result: SimulationResult; assumedHeightMeters: number }
  | { status: "error"; message: string }
  | { status: "unavailable"; message: string };

/**
 * Maps the 2D editor state (meters on the floor plan) onto the 3D
 * simulation input and runs the backend direct-sound engine.
 *
 * Pixel coordinates never enter this function; `useRoomState` already
 * stores positions in meters.
 */
export function runDirectSound(room: RoomDimensions, objects: RoomObject[]): DirectSoundView {
  const speaker = objects.find((object) => object.kind === "speaker");
  const listener = objects.find((object) => object.kind === "listener");

  if (!speaker || !listener) {
    return {
      status: "unavailable",
      message: "Place a speaker and a listener to calculate direct sound.",
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
      result: calculateDirectSound(input),
      assumedHeightMeters,
    };
  } catch (error) {
    if (error instanceof SimulationValidationError) {
      return { status: "error", message: error.message };
    }
    const message = error instanceof Error ? error.message : "Direct-sound calculation failed.";
    return { status: "error", message };
  }
}
