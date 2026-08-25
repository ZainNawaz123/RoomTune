/**
 * Core domain types for RoomTune.
 *
 * All physical quantities (positions, dimensions) are stored in meters.
 * Pixel/screen coordinates only exist at the rendering boundary (see
 * `src/lib/coordinates.ts`) and never leak into application state.
 */

/** A physical position within the room, in meters. Floor-plan (x, y) only;
 * height is supplied as z when calling the 3D simulation engine. */
export interface Position {
  x: number;
  y: number;
}

/** Physical dimensions of the room, in meters. */
export interface RoomDimensions {
  width: number;
  length: number;
  height: number;
}

/**
 * Kind of object that can be placed in the room. Using a discriminant here
 * (rather than separate `speaker`/`listener` fields on the state) makes it
 * straightforward to later support multiple speakers, microphones, etc.
 * without changing the shape of the state or the rendering/dragging logic.
 */
export type RoomObjectKind = "speaker" | "listener";

/** An object placed in the room (speaker, listening position, ...). */
export interface RoomObject {
  id: string;
  kind: RoomObjectKind;
  label: string;
  position: Position;
}

/** Id of the currently selected room object, or `null` if none selected. */
export type SelectedObjectId = string | null;
