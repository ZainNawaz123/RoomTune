import type { Point3D, Room, RoomSurfaceId } from "./types.ts";

/** Axis-aligned plane that a named room surface lies on. */
export interface SurfacePlane {
  axis: "x" | "y" | "z";
  /** Plane equation: point[axis] = offset. */
  offset: number;
}

/** 3D Euclidean distance between two points, in meters. */
export function distanceMeters(a: Point3D, b: Point3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * The axis-aligned plane for a surface in this room's coordinate system:
 *   west    — x = 0
 *   east    — x = width
 *   north   — y = 0
 *   south   — y = length
 *   floor   — z = 0
 *   ceiling — z = height
 */
export function surfacePlane(surface: RoomSurfaceId, room: Room): SurfacePlane {
  switch (surface) {
    case "west":
      return { axis: "x", offset: 0 };
    case "east":
      return { axis: "x", offset: room.width };
    case "north":
      return { axis: "y", offset: 0 };
    case "south":
      return { axis: "y", offset: room.length };
    case "floor":
      return { axis: "z", offset: 0 };
    case "ceiling":
      return { axis: "z", offset: room.height };
  }
}

/**
 * Mirror a point across a room surface plane.
 * Reflected coordinate = 2 * offset - coordinate on the plane's axis;
 * the other two coordinates are unchanged.
 */
export function mirrorPointAcrossSurface(point: Point3D, surface: RoomSurfaceId, room: Room): Point3D {
  const { axis, offset } = surfacePlane(surface, room);
  return {
    x: axis === "x" ? 2 * offset - point.x : point.x,
    y: axis === "y" ? 2 * offset - point.y : point.y,
    z: axis === "z" ? 2 * offset - point.z : point.z,
  };
}

/**
 * Where the segment from an image source to the listener crosses the wall plane.
 *
 *   t = (offset - image[axis]) / (listener[axis] - image[axis])
 *   point = image + t * (listener - image)
 *
 * If both endpoints sit on the plane (denominator ≈ 0), returns the listener
 * position so the result stays finite.
 */
export function reflectionPointOnSurface(
  imageSource: Point3D,
  listener: Point3D,
  surface: RoomSurfaceId,
  room: Room,
): Point3D {
  const { axis, offset } = surfacePlane(surface, room);
  const imageCoord = imageSource[axis];
  const listenerCoord = listener[axis];
  const denominator = listenerCoord - imageCoord;

  if (Math.abs(denominator) < Number.EPSILON) {
    return { x: listener.x, y: listener.y, z: listener.z };
  }

  let t = (offset - imageCoord) / denominator;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;

  return {
    x: imageSource.x + t * (listener.x - imageSource.x),
    y: imageSource.y + t * (listener.y - imageSource.y),
    z: imageSource.z + t * (listener.z - imageSource.z),
  };
}
