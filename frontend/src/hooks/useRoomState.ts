"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_ROOM,
  clampPositionToRoom,
  createDefaultObjects,
  sanitizeRoomDimension,
} from "@/lib/roomModel";
import type { Position, RoomDimensions, RoomObject, SelectedObjectId } from "@/types/room";

/**
 * Owns all Milestone 0 application state: room dimensions, the objects
 * placed in the room, and the current selection. Kept separate from
 * rendering so the acoustic engine can later reuse or replace this model
 * without touching the SVG/UI layer.
 */
export function useRoomState() {
  const [room, setRoom] = useState<RoomDimensions>(DEFAULT_ROOM);
  const [objects, setObjects] = useState<RoomObject[]>(createDefaultObjects);
  const [selectedObjectId, setSelectedObjectId] = useState<SelectedObjectId>(null);

  const updateRoomDimension = useCallback((key: keyof RoomDimensions, value: number) => {
    const sanitized = sanitizeRoomDimension(key, value);
    if (sanitized === null) return;

    setRoom((prevRoom) => {
      const nextRoom = { ...prevRoom, [key]: sanitized };
      setObjects((prevObjects) =>
        prevObjects.map((object) => ({
          ...object,
          position: clampPositionToRoom(object.position, nextRoom),
        })),
      );
      return nextRoom;
    });
  }, []);

  const moveObject = useCallback(
    (id: string, position: Position) => {
      const clamped = clampPositionToRoom(position, room);
      setObjects((prevObjects) =>
        prevObjects.map((object) => (object.id === id ? { ...object, position: clamped } : object)),
      );
    },
    [room],
  );

  const selectObject = useCallback((id: SelectedObjectId) => {
    setSelectedObjectId(id);
  }, []);

  const resetRoom = useCallback(() => {
    setRoom(DEFAULT_ROOM);
    setObjects(createDefaultObjects());
    setSelectedObjectId(null);
  }, []);

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? null,
    [objects, selectedObjectId],
  );

  return {
    room,
    objects,
    selectedObjectId,
    selectedObject,
    updateRoomDimension,
    moveObject,
    selectObject,
    resetRoom,
  };
}
