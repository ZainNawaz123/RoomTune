import type { Point3D, Room, SimulationInput } from "./types.ts";

/** Thrown when simulation input fails geometric validation. Values are not clamped. */
export class SimulationValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(issues.join(" "));
    this.name = "SimulationValidationError";
    this.issues = issues;
  }
}

/**
 * Validates that the room has positive finite dimensions and that both
 * endpoints lie inside the closed room volume [0, width] × [0, length] × [0, height].
 *
 * Throws {@link SimulationValidationError} listing every problem found.
 */
export function validateSimulationInput(input: SimulationInput): void {
  const issues: string[] = [];

  if (!input || typeof input !== "object") {
    throw new SimulationValidationError(["Simulation input is required."]);
  }

  const room = input.room;
  if (!room || typeof room !== "object") {
    issues.push("Room is required.");
  } else {
    assertPositiveDimension("width", room.width, issues);
    assertPositiveDimension("length", room.length, issues);
    assertPositiveDimension("height", room.height, issues);
  }

  assertPointInRoom("Speaker", input.speaker?.position, room, issues);
  assertPointInRoom("Listener", input.listener?.position, room, issues);

  if (issues.length > 0) {
    throw new SimulationValidationError(issues);
  }
}

function assertPositiveDimension(name: string, value: number, issues: string[]): void {
  if (!Number.isFinite(value)) {
    issues.push(`Room ${name} must be a finite number.`);
    return;
  }
  if (value <= 0) {
    issues.push(`Room ${name} must be greater than 0, received ${value}.`);
  }
}

function assertPointInRoom(
  label: "Speaker" | "Listener",
  point: Point3D | undefined,
  room: Room | undefined,
  issues: string[],
): void {
  if (!point || typeof point !== "object") {
    issues.push(`${label} position is required.`);
    return;
  }

  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) {
    issues.push(`${label} position must have finite x, y, and z coordinates.`);
    return;
  }

  if (point.z < 0) {
    issues.push(`${label} z=${point.z} is below the floor (z < 0).`);
  }

  if (!room) return;

  if (Number.isFinite(room.width) && room.width > 0 && (point.x < 0 || point.x > room.width)) {
    issues.push(`${label} x=${point.x} is outside the room [0, ${room.width}].`);
  }

  if (Number.isFinite(room.length) && room.length > 0 && (point.y < 0 || point.y > room.length)) {
    issues.push(`${label} y=${point.y} is outside the room [0, ${room.length}].`);
  }

  if (Number.isFinite(room.height) && room.height > 0 && point.z > room.height) {
    issues.push(`${label} z=${point.z} is above the ceiling (room height ${room.height}).`);
  }
}
