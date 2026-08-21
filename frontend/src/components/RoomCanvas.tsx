"use client";

import { useEffect, useRef, useState } from "react";
import { computeRoomLayout, meterToPixel, type RoomLayout, type ViewportSize } from "@/lib/coordinates";
import { getRoomBoundaryPoints } from "@/lib/roomModel";
import type { Position, RoomDimensions, RoomObject, SelectedObjectId } from "@/types/room";
import { ObjectMarker } from "@/components/ObjectMarker";

interface RoomCanvasProps {
  room: RoomDimensions;
  objects: RoomObject[];
  selectedObjectId: SelectedObjectId;
  onSelectObject: (id: SelectedObjectId) => void;
  onMoveObject: (id: string, position: Position) => void;
}

/** Pixels of margin reserved around the room boundary for dimension labels. */
const CANVAS_PADDING = 44;

/**
 * Renders the room as SVG and hosts the draggable objects inside it.
 *
 * This component only knows how to turn a room + object list into pixels;
 * it has no acoustic knowledge. Direct sound paths, reflections, heatmaps,
 * etc. can later be added as additional SVG layers between the boundary and
 * the object markers without touching this coordinate/layout logic.
 */
export function RoomCanvas({ room, objects, selectedObjectId, onSelectObject, onMoveObject }: RoomCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setViewport({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const layout = computeRoomLayout(room, viewport, CANVAS_PADDING);
  const boundaryPoints = getRoomBoundaryPoints(room).map((point) => meterToPixel(point, layout));
  const boundaryAttr = boundaryPoints.map((point) => `${point.x},${point.y}`).join(" ");

  const gridLines = buildGridLines(room);

  const isReady = viewport.width > 0 && viewport.height > 0 && layout.scale > 0;

  return (
    <div ref={containerRef} className="relative h-full w-full min-h-0 min-w-0 overflow-hidden">
      {isReady && (
        <svg
          width={viewport.width}
          height={viewport.height}
          className="block"
          onPointerDown={() => onSelectObject(null)}
        >
          {/* Meter grid, purely a visual scale reference. */}
          <g className="stroke-neutral-800">
            {gridLines.map((line) => {
              const start = meterToPixel(line.from, layout);
              const end = meterToPixel(line.to, layout);
              return (
                <line
                  key={line.key}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </g>

          {/* Room boundary. Rendered as a polygon (not a <rect>) so an
              irregular/custom-drawn room shape can reuse this same path
              later by supplying different boundary points. */}
          <polygon
            points={boundaryAttr}
            className="fill-neutral-900/60 stroke-neutral-500"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />

          <RoomDimensionLabels room={room} layout={layout} />

          {objects.map((object) => (
            <ObjectMarker
              key={object.id}
              object={object}
              layout={layout}
              isSelected={object.id === selectedObjectId}
              onSelect={onSelectObject}
              onMove={onMoveObject}
            />
          ))}
        </svg>
      )}
    </div>
  );
}

interface RoomDimensionLabelsProps {
  room: RoomDimensions;
  layout: RoomLayout;
}

function RoomDimensionLabels({ room, layout }: RoomDimensionLabelsProps) {
  const widthLabelPos = meterToPixel({ x: room.width / 2, y: room.length }, layout);
  const lengthLabelPos = meterToPixel({ x: 0, y: room.length / 2 }, layout);

  return (
    <g className="fill-neutral-500 text-[11px] font-mono select-none">
      <text x={widthLabelPos.x} y={widthLabelPos.y + 20} textAnchor="middle">
        {room.width.toFixed(2)} m
      </text>
      <text
        x={lengthLabelPos.x - 14}
        y={lengthLabelPos.y}
        textAnchor="middle"
        transform={`rotate(-90, ${lengthLabelPos.x - 14}, ${lengthLabelPos.y})`}
      >
        {room.length.toFixed(2)} m
      </text>
    </g>
  );
}

interface GridLine {
  key: string;
  from: Position;
  to: Position;
}

/** Builds a light 1-meter reference grid spanning the room. */
function buildGridLines(room: RoomDimensions): GridLine[] {
  const lines: GridLine[] = [];

  for (let x = 1; x < room.width; x += 1) {
    lines.push({ key: `v-${x}`, from: { x, y: 0 }, to: { x, y: room.length } });
  }
  for (let y = 1; y < room.length; y += 1) {
    lines.push({ key: `h-${y}`, from: { x: 0, y }, to: { x: room.width, y } });
  }

  return lines;
}
