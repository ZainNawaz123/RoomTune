import type { Position, RoomDimensions } from "@/types/room";

/** Pixel size of the SVG viewport the room is rendered into. */
export interface ViewportSize {
  width: number;
  height: number;
}

/**
 * Describes how physical (meter) coordinates map onto the current SVG
 * viewport: a uniform scale (pixels per meter) plus an offset so the room
 * is centered and its aspect ratio is preserved regardless of the room's
 * or the viewport's proportions.
 */
export interface RoomLayout {
  /** Pixels per meter. */
  scale: number;
  offsetX: number;
  offsetY: number;
  roomPixelWidth: number;
  roomPixelHeight: number;
}

const EMPTY_LAYOUT: RoomLayout = {
  scale: 0,
  offsetX: 0,
  offsetY: 0,
  roomPixelWidth: 0,
  roomPixelHeight: 0,
};

/**
 * Computes the scale/offset needed to fit `room` (in meters) inside
 * `viewport` (in pixels), preserving the room's physical aspect ratio and
 * leaving `padding` pixels of margin (used for boundary labels, etc.).
 */
export function computeRoomLayout(
  room: RoomDimensions,
  viewport: ViewportSize,
  padding: number,
): RoomLayout {
  if (viewport.width <= 0 || viewport.height <= 0 || room.width <= 0 || room.length <= 0) {
    return EMPTY_LAYOUT;
  }

  const availableWidth = Math.max(viewport.width - padding * 2, 1);
  const availableHeight = Math.max(viewport.height - padding * 2, 1);

  const scale = Math.min(availableWidth / room.width, availableHeight / room.length);
  const roomPixelWidth = room.width * scale;
  const roomPixelHeight = room.length * scale;

  const offsetX = padding + (availableWidth - roomPixelWidth) / 2;
  const offsetY = padding + (availableHeight - roomPixelHeight) / 2;

  return { scale, offsetX, offsetY, roomPixelWidth, roomPixelHeight };
}

/** Converts a physical position (meters) to a pixel position using `layout`.
 * Simulation x/y are the same meters the acoustic engine uses. SVG y grows
 * downward, so larger physical y appears lower on screen; z is not drawn.
 */
export function meterToPixel(position: Position, layout: RoomLayout): Position {
  return {
    x: layout.offsetX + position.x * layout.scale,
    y: layout.offsetY + position.y * layout.scale,
  };
}

/** Converts a pixel position (relative to the SVG viewport) to meters using `layout`. */
export function pixelToMeter(pixel: Position, layout: RoomLayout): Position {
  if (layout.scale === 0) return { x: 0, y: 0 };
  return {
    x: (pixel.x - layout.offsetX) / layout.scale,
    y: (pixel.y - layout.offsetY) / layout.scale,
  };
}
