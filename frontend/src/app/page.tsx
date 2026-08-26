"use client";

import { useMemo, useState } from "react";
import { DirectSoundPanel } from "@/components/DirectSoundPanel";
import { Header } from "@/components/Header";
import { ObjectInspector } from "@/components/ObjectInspector";
import { ReflectionsDetailPanel } from "@/components/ReflectionsDetailPanel";
import { RoomCanvas } from "@/components/RoomCanvas";
import { RoomControls } from "@/components/RoomControls";
import { useRoomState } from "@/hooks/useRoomState";
import { runDirectSound } from "@/lib/runDirectSound";
import { runFirstOrderReflections } from "@/lib/runFirstOrderReflections";

export default function Home() {
  const {
    room,
    objects,
    selectedObjectId,
    selectedObject,
    updateRoomDimension,
    moveObject,
    selectObject,
    resetRoom,
  } = useRoomState();

  const [showCalculationDetails, setShowCalculationDetails] = useState(false);

  const directSound = useMemo(() => runDirectSound(room, objects), [room, objects]);
  const reflections = useMemo(() => runFirstOrderReflections(room, objects), [room, objects]);

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <Header onReset={resetRoom} />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:overflow-hidden">
          <main className="min-h-[420px] min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-950 lg:min-h-0">
            <RoomCanvas
              room={room}
              objects={objects}
              selectedObjectId={selectedObjectId}
              onSelectObject={selectObject}
              onMoveObject={moveObject}
            />
          </main>

          <aside className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0 lg:overflow-y-auto">
            <RoomControls room={room} onChangeDimension={updateRoomDimension} />
            <ObjectInspector object={selectedObject} />
            <DirectSoundPanel view={directSound} />
            <button
              type="button"
              onClick={() => setShowCalculationDetails((open) => !open)}
              className="rounded-md border border-neutral-700 px-3 py-2 text-left text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:text-neutral-100"
            >
              {showCalculationDetails ? "Hide calculation details" : "Show calculation details"}
              <span className="mt-0.5 block text-xs text-neutral-600">
                First-order paths, band amplitudes, energy totals
              </span>
            </button>
          </aside>
        </div>

        {showCalculationDetails ? (
          <div className="shrink-0 lg:max-h-[45vh] lg:overflow-y-auto">
            <ReflectionsDetailPanel view={reflections} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
