import { NumberField } from "@/components/NumberField";
import { ROOM_DIMENSION_LIMITS } from "@/lib/roomModel";
import type { RoomDimensions } from "@/types/room";

interface RoomControlsProps {
  room: RoomDimensions;
  onChangeDimension: (key: keyof RoomDimensions, value: number) => void;
}

/** Editable numeric fields for the room's physical dimensions. */
export function RoomControls({ room, onChangeDimension }: RoomControlsProps) {
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Room Settings
      </h2>
      <div className="flex flex-col gap-3">
        <NumberField
          label="Width"
          unit="m"
          value={room.width}
          min={ROOM_DIMENSION_LIMITS.width.min}
          max={ROOM_DIMENSION_LIMITS.width.max}
          onChange={(value) => onChangeDimension("width", value)}
        />
        <NumberField
          label="Length"
          unit="m"
          value={room.length}
          min={ROOM_DIMENSION_LIMITS.length.min}
          max={ROOM_DIMENSION_LIMITS.length.max}
          onChange={(value) => onChangeDimension("length", value)}
        />
        <NumberField
          label="Height"
          unit="m"
          value={room.height}
          min={ROOM_DIMENSION_LIMITS.height.min}
          max={ROOM_DIMENSION_LIMITS.height.max}
          onChange={(value) => onChangeDimension("height", value)}
        />
      </div>
    </section>
  );
}
