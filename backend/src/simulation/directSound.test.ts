import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateDirectSound } from "./directSound.ts";
import { SPEED_OF_SOUND_M_PER_S } from "./types.ts";
import { SimulationValidationError } from "./validate.ts";

const ROOM = { width: 10, length: 10, height: 10 };

test("3-4-5 triangle on the floor is 5 m and 5/343 s", () => {
  const result = calculateDirectSound({
    room: ROOM,
    speaker: { position: { x: 0, y: 0, z: 0 } },
    listener: { position: { x: 3, y: 4, z: 0 } },
  });

  assert.equal(result.directDistanceMeters, 5);
  assert.equal(result.propagationDelaySeconds, 5 / SPEED_OF_SOUND_M_PER_S);
  assert.equal(result.propagationDelayMilliseconds, (5 / SPEED_OF_SOUND_M_PER_S) * 1000);
  assert.equal(result.propagationDelayMilliseconds.toFixed(2), "14.58");
});

test("3D Euclidean distance includes z", () => {
  const result = calculateDirectSound({
    room: ROOM,
    speaker: { position: { x: 0, y: 0, z: 0 } },
    listener: { position: { x: 1, y: 2, z: 2 } },
  });

  assert.equal(result.directDistanceMeters, 3);
  assert.equal(result.propagationDelaySeconds, 3 / 343);
});

test("coincident speaker and listener yield zero delay", () => {
  const result = calculateDirectSound({
    room: ROOM,
    speaker: { position: { x: 1, y: 1, z: 1 } },
    listener: { position: { x: 1, y: 1, z: 1 } },
  });

  assert.equal(result.directDistanceMeters, 0);
  assert.equal(result.propagationDelaySeconds, 0);
  assert.equal(result.propagationDelayMilliseconds, 0);
});

test("rejects negative and zero room dimensions", () => {
  const validEndpoints = {
    speaker: { position: { x: 1, y: 1, z: 1 } },
    listener: { position: { x: 2, y: 2, z: 1 } },
  };

  assert.throws(
    () => calculateDirectSound({ room: { width: -5, length: 4, height: 2.5 }, ...validEndpoints }),
    SimulationValidationError,
  );
  assert.throws(
    () => calculateDirectSound({ room: { width: 5, length: 0, height: 2.5 }, ...validEndpoints }),
    SimulationValidationError,
  );
  assert.throws(
    () => calculateDirectSound({ room: { width: 5, length: 4, height: -1 }, ...validEndpoints }),
    SimulationValidationError,
  );
});

test("rejects speaker or listener coordinates outside the room", () => {
  assert.throws(
    () =>
      calculateDirectSound({
        room: ROOM,
        speaker: { position: { x: 11, y: 1, z: 1 } },
        listener: { position: { x: 1, y: 1, z: 1 } },
      }),
    SimulationValidationError,
  );
  assert.throws(
    () =>
      calculateDirectSound({
        room: ROOM,
        speaker: { position: { x: 1, y: 1, z: 1 } },
        listener: { position: { x: 1, y: -0.1, z: 1 } },
      }),
    SimulationValidationError,
  );
});

test("rejects z below the floor or above the ceiling", () => {
  assert.throws(
    () =>
      calculateDirectSound({
        room: ROOM,
        speaker: { position: { x: 1, y: 1, z: -0.01 } },
        listener: { position: { x: 2, y: 2, z: 1 } },
      }),
    SimulationValidationError,
  );
  assert.throws(
    () =>
      calculateDirectSound({
        room: ROOM,
        speaker: { position: { x: 1, y: 1, z: 1 } },
        listener: { position: { x: 2, y: 2, z: 10.01 } },
      }),
    SimulationValidationError,
  );
});

test("positions on the room faces are accepted", () => {
  const result = calculateDirectSound({
    room: ROOM,
    speaker: { position: { x: 0, y: 0, z: 0 } },
    listener: { position: { x: 10, y: 10, z: 10 } },
  });

  assert.equal(result.directDistanceMeters, Math.sqrt(300));
});
