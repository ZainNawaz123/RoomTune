import type { RoomObject } from "@/types/room";

interface ObjectInspectorProps {
  object: RoomObject | null;
}

/** Displays live physical coordinates of the currently selected room object. */
export function ObjectInspector({ object }: ObjectInspectorProps) {
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Object Inspector
      </h2>
      {object ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-neutral-100">{object.label}</p>
          <dl className="flex flex-col gap-1 font-mono text-sm text-neutral-300">
            <div className="flex items-center justify-between">
              <dt className="text-neutral-500">X</dt>
              <dd>{object.position.x.toFixed(2)} m</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-neutral-500">Y</dt>
              <dd>{object.position.y.toFixed(2)} m</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">
          Select the speaker or listening position to view its coordinates.
        </p>
      )}
    </section>
  );
}
