import type { Position, RoomDimensions, RoomObject } from "@/types/room";

export const DEFAULT_ROOM: RoomDimensions = {
  width: 5.0,
  length: 4.0,
  height: 2.5,
};

/** Returns a fresh copy of the default room objects (speaker + listener). */
export function createDefaultObjects(): RoomObject[] {
  return [
    {
      id: "speaker-1",
      kind: "speaker",
      label: "Speaker",
      position: { x: 1.25, y: 2.0 },
    },
    {
      id: "listener-1",
      kind: "listener",
      label: "Listening Position",
      position: { x: 3.75, y: 2.0 },
    },
  ];
}

/** Reasonable min/max bounds for each room dimension, in meters. */
export const ROOM_DIMENSION_LIMITS: Record<keyof RoomDimensions, { min: number; max: number }> = {
  width: { min: 1, max: 30 },
  length: { min: 1, max: 30 },
  height: { min: 1, max: 6 },
};

/**
 * Clamps a candidate value for a room dimension into its valid range.
 * Returns `null` for values that can never be valid (NaN, infinite) so
 * callers can ignore the input rather than snapping to a bound.
 */
export function sanitizeRoomDimension(key: keyof RoomDimensions, value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const { min, max } = ROOM_DIMENSION_LIMITS[key];
  return Math.min(Math.max(value, min), max);
}

/** Minimum distance an object must keep from every wall, in meters. */
const OBJECT_WALL_MARGIN = 0.1;

/** Clamps a physical position so it stays inside `room`, with a small wall margin. */
export function clampPositionToRoom(position: Position, room: RoomDimensions): Position {
  const marginX = Math.min(OBJECT_WALL_MARGIN, room.width / 2);
  const marginY = Math.min(OBJECT_WALL_MARGIN, room.length / 2);
  return {
    x: clamp(position.x, marginX, room.width - marginX),
    y: clamp(position.y, marginY, room.length - marginY),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Corner points (in meters) of the room boundary. Milestone 0 only supports
 * rectangular rooms, but returning a point list (rather than e.g. a `<rect>`
 * width/height pair) keeps the boundary renderer agnostic to the room's
 * shape so it can later be swapped for an arbitrary polygon.
 */
export function getRoomBoundaryPoints(room: RoomDimensions): Position[] {
  return [
    { x: 0, y: 0 },
    { x: room.width, y: 0 },
    { x: room.width, y: room.length },
    { x: 0, y: room.length },
  ];
}
