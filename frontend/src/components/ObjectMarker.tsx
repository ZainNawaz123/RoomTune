import { useEffect, useRef } from "react";
import { meterToPixel, pixelToMeter, type RoomLayout } from "@/lib/coordinates";
import type { Position, RoomObject } from "@/types/room";
import { ListenerIcon } from "@/components/icons/ListenerIcon";
import { SpeakerIcon } from "@/components/icons/SpeakerIcon";

interface ObjectMarkerProps {
  object: RoomObject;
  layout: RoomLayout;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, position: Position) => void;
}

/**
 * A single draggable room object rendered in SVG space. Generic over
 * `RoomObjectKind` so adding new kinds (microphones, additional speakers,
 * ...) later only requires extending the icon lookup below.
 *
 * Dragging is tracked via window-level pointer listeners (rather than
 * relying solely on `setPointerCapture`) so movement is never lost even if
 * the pointer moves faster than the marker's small hit area.
 */
export function ObjectMarker({ object, layout, isSelected, onSelect, onMove }: ObjectMarkerProps) {
  const pixelPosition = meterToPixel(object.position, layout);
  const isDragging = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    function handleWindowPointerMove(event: PointerEvent) {
      if (!isDragging.current || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const pixelPos: Position = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      onMove(object.id, pixelToMeter(pixelPos, layout));
    }
    function stopDragging() {
      isDragging.current = false;
    }

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [layout, object.id, onMove]);

  const handlePointerDown = (event: React.PointerEvent<SVGGElement>) => {
    event.stopPropagation();
    svgRef.current = event.currentTarget.ownerSVGElement;
    isDragging.current = true;
    onSelect(object.id);
  };

  return (
    <g
      transform={`translate(${pixelPosition.x}, ${pixelPosition.y})`}
      className="cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      role="button"
      aria-label={object.label}
      tabIndex={-1}
    >
      {object.kind === "speaker" ? (
        <SpeakerIcon selected={isSelected} />
      ) : (
        <ListenerIcon selected={isSelected} />
      )}
    </g>
  );
}
