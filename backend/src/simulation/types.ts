/**
 * Canonical acoustic simulation model.
 *
 * Units: meters for every physical length; seconds for delay (milliseconds
 * are derived for display). Do not pass UI pixels into this module.
 *
 * Coordinate system (right-handed Cartesian, origin at a floor corner):
 *   x — room width  (0 at the west wall,  increasing toward x = width)
 *   y — room length (0 at the north wall, increasing toward y = length)
 *   z — height above the floor (0 on the floor, increasing toward z = height)
 *
 * "North/west" here name the room surfaces in this model, not geographic
 * heading. They match the SVG floor plan: y = 0 is the top edge of the
 * drawing, x = 0 is the left edge. The SVG's own top-left origin and
 * downward-increasing y are a rendering concern only
 * (see frontend/src/lib/coordinates.ts).
 *
 * Wall materials are optional on `Room.surfaces` and are ignored by the
 * direct-sound calculation. Direct sound does not strike a wall. A later
 * reflection/absorption step should look up `materialId` in
 * backend/data/roomtune_acoustic_materials.csv.
 */

/** Speed of sound used by the current direct-path model, in meters per second. */
export const SPEED_OF_SOUND_M_PER_S = 343;

/** A position in the canonical room coordinate system, in meters. */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Named rectangular-room surfaces. Mapping in this coordinate system:
 *   west    — x = 0
 *   east    — x = width
 *   north   — y = 0      (top edge of the SVG floor plan)
 *   south   — y = length (bottom edge of the SVG floor plan)
 *   floor   — z = 0
 *   ceiling — z = height
 */
export type RoomSurfaceId = "north" | "south" | "east" | "west" | "floor" | "ceiling";

/** A room surface that will later reference an acoustic material by id. */
export interface RoomSurface {
  materialId: string;
}

export type RoomSurfaces = Partial<Record<RoomSurfaceId, RoomSurface>>;

export interface Room {
  /** Extent along +x, in meters. Must be > 0. */
  width: number;
  /** Extent along +y, in meters. Must be > 0. */
  length: number;
  /** Extent along +z, in meters. Must be > 0. */
  height: number;
  /**
   * Optional per-surface material assignments. Unused by direct sound.
   * Direct sound does not depend on absorption; keep this off the
   * calculation path until reflections are implemented.
   */
  surfaces?: RoomSurfaces;
}

export interface Speaker {
  position: Point3D;
}

export interface Listener {
  position: Point3D;
}

export interface SimulationInput {
  room: Room;
  speaker: Speaker;
  listener: Listener;
}

export interface SimulationResult {
  /** Straight-line speaker-to-listener distance, in meters. */
  directDistanceMeters: number;
  /** Time for sound to travel that distance at 343 m/s, in seconds. */
  propagationDelaySeconds: number;
  /** Same delay expressed in milliseconds. */
  propagationDelayMilliseconds: number;
}

/** Octave-band center frequencies used by the first-order reflection model. */
export const BAND_FREQUENCIES_HZ = [125, 250, 500, 1000, 2000, 4000] as const;

/** Reference distance for inverse-distance attenuation (1 m). */
export const REFERENCE_DISTANCE_M = 1;

/** Six absorption / reflection / amplitude values, one per {@link BAND_FREQUENCIES_HZ}. */
export type BandValues = readonly [number, number, number, number, number, number];

/**
 * Default material ids when `Room.surfaces` omits a surface.
 * Walls and ceiling use drywall; floor uses vinyl/linoleum on concrete.
 */
export const DEFAULT_SURFACE_MATERIAL_IDS: Readonly<Record<RoomSurfaceId, string>> = {
  north: "drywall_standard",
  south: "drywall_standard",
  east: "drywall_standard",
  west: "drywall_standard",
  ceiling: "drywall_standard",
  floor: "vinyl_linoleum_floor",
};

/**
 * Injected so the simulation layer never touches the filesystem.
 * Returns absorption coefficients (alpha) at the six bands, ascending.
 */
export type AbsorptionResolver = (materialId: string) => BandValues;

/** Fixed iteration order for the six room surfaces. */
export const ROOM_SURFACE_IDS: readonly RoomSurfaceId[] = [
  "north",
  "south",
  "east",
  "west",
  "floor",
  "ceiling",
];

export type DirectPropagationPath = {
  kind: "direct";
  distanceMeters: number;
  delaySeconds: number;
  delayMilliseconds: number;
  distanceFactor: number;
  amplitudeByBand: BandValues;
};

export type ReflectionPropagationPath = {
  kind: "reflection";
  surface: RoomSurfaceId;
  materialId: string;
  imageSourcePosition: Point3D;
  reflectionPoint: Point3D;
  distanceMeters: number;
  delaySeconds: number;
  delayMilliseconds: number;
  distanceFactor: number;
  absorptionByBand: BandValues;
  /**
   * Energy reflection coefficient per band, `1 - alpha`: the fraction of
   * incident acoustic ENERGY reflected by the surface. This is what the UI's
   * "R" column displays. Do not use this directly as a pressure-amplitude
   * multiplier — see {@link pressureReflectionMagnitudeByBand}.
   */
  energyReflectionCoefficientByBand: BandValues;
  /**
   * Pressure reflection magnitude per band, `sqrt(1 - alpha)`. `amplitudeByBand`
   * (a PRESSURE amplitude) is `distanceFactor * pressureReflectionMagnitude`, so
   * that squaring it during energy summing restores the correct energy
   * reflection fraction `1 - alpha` rather than `(1 - alpha)^2`.
   */
  pressureReflectionMagnitudeByBand: BandValues;
  amplitudeByBand: BandValues;
};

export type PropagationPath = DirectPropagationPath | ReflectionPropagationPath;

export interface FirstOrderReflectionResult {
  direct: DirectPropagationPath;
  /** Exactly six first-order reflections, in {@link ROOM_SURFACE_IDS} order. */
  reflections: ReflectionPropagationPath[];
  /** Sum of squared path amplitudes per band (energy). */
  totalEnergyByBand: BandValues;
  /** sqrt of {@link totalEnergyByBand} (amplitude scale). */
  totalAmplitudeByBand: BandValues;
}
