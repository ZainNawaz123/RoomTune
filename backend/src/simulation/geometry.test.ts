import assert from "node:assert/strict";
import { test } from "node:test";
import {
  distanceMeters,
  mirrorPointAcrossSurface,
  reflectionPointOnSurface,
  surfacePlane,
} from "./geometry.ts";

const ROOM = { width: 8, length: 10, height: 3 };

test("mirror across west negates x; other coordinates unchanged", () => {
  const point = { x: 2, y: 4, z: 1.5 };
  const image = mirrorPointAcrossSurface(point, "west", ROOM);
  assert.deepEqual(image, { x: -2, y: 4, z: 1.5 });
});

test("mirror across ceiling gives 2H - z", () => {
  const point = { x: 2, y: 4, z: 1 };
  const image = mirrorPointAcrossSurface(point, "ceiling", ROOM);
  assert.deepEqual(image, { x: 2, y: 4, z: 5 });
});

test("mirror across east, south, north, and floor", () => {
  const point = { x: 2, y: 3, z: 1 };
  assert.deepEqual(mirrorPointAcrossSurface(point, "east", ROOM), { x: 14, y: 3, z: 1 });
  assert.deepEqual(mirrorPointAcrossSurface(point, "south", ROOM), { x: 2, y: 17, z: 1 });
  assert.deepEqual(mirrorPointAcrossSurface(point, "north", ROOM), { x: 2, y: -3, z: 1 });
  assert.deepEqual(mirrorPointAcrossSurface(point, "floor", ROOM), { x: 2, y: 3, z: -1 });
});

test("mirroring twice returns the original point", () => {
  const point = { x: 1.25, y: 7.5, z: 2.1 };
  for (const surface of ["north", "south", "east", "west", "floor", "ceiling"] as const) {
    const once = mirrorPointAcrossSurface(point, surface, ROOM);
    const twice = mirrorPointAcrossSurface(once, surface, ROOM);
    assert.deepEqual(twice, point, `surface ${surface}`);
  }
});

test("surfacePlane matches the room coordinate conventions", () => {
  assert.deepEqual(surfacePlane("west", ROOM), { axis: "x", offset: 0 });
  assert.deepEqual(surfacePlane("east", ROOM), { axis: "x", offset: 8 });
  assert.deepEqual(surfacePlane("north", ROOM), { axis: "y", offset: 0 });
  assert.deepEqual(surfacePlane("south", ROOM), { axis: "y", offset: 10 });
  assert.deepEqual(surfacePlane("floor", ROOM), { axis: "z", offset: 0 });
  assert.deepEqual(surfacePlane("ceiling", ROOM), { axis: "z", offset: 3 });
});

test("reflection point lies on the plane and inside wall bounds", () => {
  const speaker = { x: 2, y: 3, z: 1.2 };
  const listener = { x: 6, y: 7, z: 1.5 };

  for (const surface of ["north", "south", "east", "west", "floor", "ceiling"] as const) {
    const image = mirrorPointAcrossSurface(speaker, surface, ROOM);
    const hit = reflectionPointOnSurface(image, listener, surface, ROOM);
    const plane = surfacePlane(surface, ROOM);

    assert.ok(Math.abs(hit[plane.axis] - plane.offset) < 1e-12, `on plane ${surface}`);
    assert.ok(hit.x >= 0 && hit.x <= ROOM.width, `x in bounds ${surface}`);
    assert.ok(hit.y >= 0 && hit.y <= ROOM.length, `y in bounds ${surface}`);
    assert.ok(hit.z >= 0 && hit.z <= ROOM.height, `z in bounds ${surface}`);
  }
});

test("image-listener distance equals speaker-hit plus hit-listener", () => {
  const speaker = { x: 2, y: 3, z: 1.2 };
  const listener = { x: 6, y: 7, z: 1.5 };

  for (const surface of ["north", "south", "east", "west", "floor", "ceiling"] as const) {
    const image = mirrorPointAcrossSurface(speaker, surface, ROOM);
    const hit = reflectionPointOnSurface(image, listener, surface, ROOM);
    const viaImage = distanceMeters(image, listener);
    const viaHit = distanceMeters(speaker, hit) + distanceMeters(hit, listener);
    assert.ok(Math.abs(viaImage - viaHit) < 1e-9, `path length identity for ${surface}`);
  }
});

test("degenerate reflection when both endpoints share the plane axis value", () => {
  // Speaker and listener both on the floor (z = 0): the image coincides with
  // the speaker, so image.z === listener.z and the denominator is zero.
  const speaker = { x: 1, y: 1, z: 0 };
  const listener = { x: 4, y: 5, z: 0 };
  const image = mirrorPointAcrossSurface(speaker, "floor", ROOM);
  assert.equal(image.z, 0);
  const hit = reflectionPointOnSurface(image, listener, "floor", ROOM);
  assert.deepEqual(hit, listener);
});
