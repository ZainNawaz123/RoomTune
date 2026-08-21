"use client";

import { Header } from "@/components/Header";
import { ObjectInspector } from "@/components/ObjectInspector";
import { RoomCanvas } from "@/components/RoomCanvas";
import { RoomControls } from "@/components/RoomControls";
import { useRoomState } from "@/hooks/useRoomState";

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

  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <Header onReset={resetRoom} />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:overflow-hidden">
        <main className="min-h-[420px] min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-950 lg:min-h-0">
          <RoomCanvas
            room={room}
            objects={objects}
            selectedObjectId={selectedObjectId}
            onSelectObject={selectObject}
            onMoveObject={moveObject}
          />
        </main>

        <aside className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          <RoomControls room={room} onChangeDimension={updateRoomDimension} />
          <ObjectInspector object={selectedObject} />
        </aside>
      </div>
    </div>
  );
}
