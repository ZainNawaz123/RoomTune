import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateFirstOrderReflections } from "./reflections.ts";
import {
  DEFAULT_SURFACE_MATERIAL_IDS,
  ROOM_SURFACE_IDS,
  type AbsorptionResolver,
  type BandValues,
  type SimulationInput,
} from "./types.ts";
import { SimulationValidationError } from "./validate.ts";

const DRYWALL_ALPHA: BandValues = [0.3, 0.12, 0.08, 0.06, 0.06, 0.05];
const VINYL_ALPHA: BandValues = [0.02, 0.02, 0.03, 0.04, 0.04, 0.05];
// Energy reflection coefficient, 1 - alpha (fraction of incident ENERGY reflected).
const DRYWALL_ENERGY_REFLECTION: BandValues = [0.7, 0.88, 0.92, 0.94, 0.94, 0.95];
const VINYL_ENERGY_REFLECTION: BandValues = [0.98, 0.98, 0.97, 0.96, 0.96, 0.95];
// Pressure reflection magnitude, sqrt(1 - alpha) — the correct amplitude multiplier.
const DRYWALL_PRESSURE_REFLECTION: BandValues = DRYWALL_ENERGY_REFLECTION.map(Math.sqrt) as unknown as BandValues;
const VINYL_PRESSURE_REFLECTION: BandValues = VINYL_ENERGY_REFLECTION.map(Math.sqrt) as unknown as BandValues;

const stubResolver: AbsorptionResolver = (materialId) => {
  if (materialId === "drywall_standard") return DRYWALL_ALPHA;
  if (materialId === "vinyl_linoleum_floor") return VINYL_ALPHA;
  if (materialId === "fully_absorptive") return [1, 1, 1, 1, 1, 1];
  if (materialId === "carpet_standard_9mm") return [0.08, 0.08, 0.3, 0.6, 0.75, 0.8];
  throw new Error(`Unexpected material id in stub: ${materialId}`);
};

const centeredInput: SimulationInput = {
  room: { width: 10, length: 10, height: 4 },
  speaker: { position: { x: 5, y: 5, z: 2 } },
  listener: { position: { x: 5, y: 5, z: 2 } },
};

// Centered speaker/listener share a point — reflections engine rejects that.
// Use a near-center offset for symmetry tests instead.
const symmetricInput: SimulationInput = {
  room: { width: 10, length: 10, height: 4 },
  speaker: { position: { x: 4, y: 5, z: 2 } },
  listener: { position: { x: 6, y: 5, z: 2 } },
};

test("returns 1 direct + 6 reflections, each with 6 band amplitudes", () => {
  const result = calculateFirstOrderReflections(symmetricInput, {
    resolveAbsorption: stubResolver,
  });

  assert.equal(result.direct.kind, "direct");
  assert.equal(result.reflections.length, 6);
  assert.equal(result.direct.amplitudeByBand.length, 6);

  for (const reflection of result.reflections) {
    assert.equal(reflection.kind, "reflection");
    assert.equal(reflection.amplitudeByBand.length, 6);
    assert.equal(reflection.absorptionByBand.length, 6);
    assert.equal(reflection.energyReflectionCoefficientByBand.length, 6);
    assert.equal(reflection.pressureReflectionMagnitudeByBand.length, 6);
  }

  const totalAmplitudes =
    result.direct.amplitudeByBand.length +
    result.reflections.reduce((sum, path) => sum + path.amplitudeByBand.length, 0);
  assert.equal(totalAmplitudes, 42);

  assert.deepEqual(
    result.reflections.map((path) => path.surface),
    [...ROOM_SURFACE_IDS],
  );
});

test("symmetric west/east and north/south path lengths", () => {
  // Speaker and listener on the room center line in y and z, mirrored in x.
  const result = calculateFirstOrderReflections(symmetricInput, {
    resolveAbsorption: stubResolver,
  });

  const bySurface = Object.fromEntries(
    result.reflections.map((path) => [path.surface, path.distanceMeters]),
  );

  assert.equal(bySurface.west, bySurface.east);
  assert.equal(bySurface.north, bySurface.south);
});

test("default materials: drywall walls/ceiling, vinyl floor", () => {
  const result = calculateFirstOrderReflections(
    {
      room: { width: 8, length: 6, height: 3 },
      speaker: { position: { x: 2, y: 2, z: 1.2 } },
      listener: { position: { x: 5, y: 4, z: 1.2 } },
    },
    { resolveAbsorption: stubResolver },
  );

  for (const surface of ["north", "south", "east", "west", "ceiling"] as const) {
    const path = result.reflections.find((r) => r.surface === surface)!;
    assert.equal(path.materialId, DEFAULT_SURFACE_MATERIAL_IDS[surface]);
    assert.deepEqual(path.energyReflectionCoefficientByBand, DRYWALL_ENERGY_REFLECTION);
    for (let b = 0; b < 6; b += 1) {
      assert.ok(
        Math.abs(path.pressureReflectionMagnitudeByBand[b] - DRYWALL_PRESSURE_REFLECTION[b]) < 1e-12,
      );
    }
  }

  const floor = result.reflections.find((r) => r.surface === "floor")!;
  assert.equal(floor.materialId, "vinyl_linoleum_floor");
  assert.deepEqual(floor.energyReflectionCoefficientByBand, VINYL_ENERGY_REFLECTION);
  for (let b = 0; b < 6; b += 1) {
    assert.ok(
      Math.abs(floor.pressureReflectionMagnitudeByBand[b] - VINYL_PRESSURE_REFLECTION[b]) < 1e-12,
    );
  }
});

test("explicit room.surfaces overrides defaults", () => {
  const result = calculateFirstOrderReflections(
    {
      room: {
        width: 8,
        length: 6,
        height: 3,
        surfaces: {
          floor: { materialId: "carpet_standard_9mm" },
          west: { materialId: "fully_absorptive" },
        },
      },
      speaker: { position: { x: 2, y: 2, z: 1.2 } },
      listener: { position: { x: 5, y: 4, z: 1.2 } },
    },
    { resolveAbsorption: stubResolver },
  );

  const floor = result.reflections.find((r) => r.surface === "floor")!;
  assert.equal(floor.materialId, "carpet_standard_9mm");
  const carpetAlpha: BandValues = [0.08, 0.08, 0.3, 0.6, 0.75, 0.8];
  for (let b = 0; b < 6; b += 1) {
    assert.ok(
      Math.abs(floor.energyReflectionCoefficientByBand[b] - (1 - carpetAlpha[b])) < 1e-12,
    );
    assert.ok(
      Math.abs(floor.pressureReflectionMagnitudeByBand[b] - Math.sqrt(1 - carpetAlpha[b])) < 1e-12,
    );
  }

  const west = result.reflections.find((r) => r.surface === "west")!;
  assert.equal(west.materialId, "fully_absorptive");
  assert.deepEqual(west.energyReflectionCoefficientByBand, [0, 0, 0, 0, 0, 0]);
  assert.deepEqual(west.pressureReflectionMagnitudeByBand, [0, 0, 0, 0, 0, 0]);
  assert.deepEqual(west.amplitudeByBand, [0, 0, 0, 0, 0, 0]);
});

test("fully absorptive surfaces leave total amplitude equal to direct", () => {
  const allAbsorptive: AbsorptionResolver = () => [1, 1, 1, 1, 1, 1];
  const result = calculateFirstOrderReflections(symmetricInput, {
    resolveAbsorption: allAbsorptive,
  });

  assert.deepEqual(result.totalAmplitudeByBand, result.direct.amplitudeByBand);
  const expectedEnergy: BandValues = [
    result.direct.amplitudeByBand[0] ** 2,
    result.direct.amplitudeByBand[1] ** 2,
    result.direct.amplitudeByBand[2] ** 2,
    result.direct.amplitudeByBand[3] ** 2,
    result.direct.amplitudeByBand[4] ** 2,
    result.direct.amplitudeByBand[5] ** 2,
  ];
  assert.deepEqual(result.totalEnergyByBand, expectedEnergy);
});

test("energy summing matches hand-computed sqrt(sum of squares)", () => {
  const result = calculateFirstOrderReflections(symmetricInput, {
    resolveAbsorption: stubResolver,
  });

  for (let b = 0; b < 6; b += 1) {
    let energy = result.direct.amplitudeByBand[b] ** 2;
    for (const path of result.reflections) {
      energy += path.amplitudeByBand[b] ** 2;
    }
    assert.ok(Math.abs(result.totalEnergyByBand[b] - energy) < 1e-12);
    assert.ok(Math.abs(result.totalAmplitudeByBand[b] - Math.sqrt(energy)) < 1e-12);
    assert.ok(result.totalAmplitudeByBand[b] >= result.direct.amplitudeByBand[b]);
  }
});

test("every reflected path is longer than the direct path", () => {
  const result = calculateFirstOrderReflections(
    {
      room: { width: 8, length: 6, height: 3 },
      speaker: { position: { x: 2, y: 2, z: 1.2 } },
      listener: { position: { x: 5, y: 4, z: 1.5 } },
    },
    { resolveAbsorption: stubResolver },
  );

  for (const path of result.reflections) {
    assert.ok(path.distanceMeters > result.direct.distanceMeters);
    assert.ok(path.delaySeconds > result.direct.delaySeconds);
  }
});

test("rejects coincident speaker and listener", () => {
  assert.throws(
    () =>
      calculateFirstOrderReflections(centeredInput, {
        resolveAbsorption: stubResolver,
      }),
    SimulationValidationError,
  );
});

test("pressure amplitude uses sqrt(1 - alpha), not (1 - alpha) directly", () => {
  // 3m x 3m room, speaker (1,1), listener (2,1): north-wall image source is
  // at (1,-1), giving distance sqrt((2-1)^2 + (1-(-1))^2) = sqrt(5).
  const room: SimulationInput["room"] = { width: 3, length: 3, height: 3 };
  const speaker = { position: { x: 1, y: 1, z: 1.5 } };
  const listener = { position: { x: 2, y: 1, z: 1.5 } };

  const energyReflection070: AbsorptionResolver = () => [0.3, 0.3, 0.3, 0.3, 0.3, 0.3];
  const result070 = calculateFirstOrderReflections(
    { room, speaker, listener },
    { resolveAbsorption: energyReflection070 },
  );
  const north070 = result070.reflections.find((r) => r.surface === "north")!;

  const expectedDistance = Math.sqrt(5);
  const expectedDistanceFactor = 1 / expectedDistance;
  const expectedPressureReflection070 = Math.sqrt(0.7);
  const expectedAmplitude070 = expectedDistanceFactor * expectedPressureReflection070;

  assert.ok(Math.abs(north070.distanceMeters - expectedDistance) < 1e-9);
  assert.ok(Math.abs(north070.distanceFactor - expectedDistanceFactor) < 1e-9);
  for (let b = 0; b < 6; b += 1) {
    assert.ok(Math.abs(north070.energyReflectionCoefficientByBand[b] - 0.7) < 1e-12);
    assert.ok(
      Math.abs(north070.pressureReflectionMagnitudeByBand[b] - expectedPressureReflection070) <
        1e-12,
    );
    assert.ok(Math.abs(north070.amplitudeByBand[b] - expectedAmplitude070) < 1e-9);
    // The incorrect formula (distanceFactor * (1 - alpha)) would give ~0.3130,
    // not the correct ~0.3742 — make sure we're not accidentally matching it.
    const incorrectAmplitude = expectedDistanceFactor * 0.7;
    assert.ok(Math.abs(north070.amplitudeByBand[b] - incorrectAmplitude) > 1e-3);
  }
  assert.ok(Math.abs(expectedAmplitude070 - 0.3742) < 1e-3);

  const energyReflection088: AbsorptionResolver = () => [0.12, 0.12, 0.12, 0.12, 0.12, 0.12];
  const result088 = calculateFirstOrderReflections(
    { room, speaker, listener },
    { resolveAbsorption: energyReflection088 },
  );
  const north088 = result088.reflections.find((r) => r.surface === "north")!;
  const expectedPressureReflection088 = Math.sqrt(0.88);
  const expectedAmplitude088 = expectedDistanceFactor * expectedPressureReflection088;

  for (let b = 0; b < 6; b += 1) {
    assert.ok(Math.abs(north088.amplitudeByBand[b] - expectedAmplitude088) < 1e-9);
  }
  assert.ok(Math.abs(expectedAmplitude088 - 0.4195) < 1e-3);
});

test("energy summing squares pressure amplitudes without reapplying (1 - alpha)", () => {
  const room: SimulationInput["room"] = { width: 3, length: 3, height: 3 };
  const speaker = { position: { x: 1, y: 1, z: 1.5 } };
  const listener = { position: { x: 2, y: 1, z: 1.5 } };
  const resolver: AbsorptionResolver = () => [0.3, 0.3, 0.3, 0.3, 0.3, 0.3];

  const result = calculateFirstOrderReflections(
    { room, speaker, listener },
    { resolveAbsorption: resolver },
  );
  const north = result.reflections.find((r) => r.surface === "north")!;

  // Squaring the (correct) pressure amplitude should restore distanceFactor^2 * (1 - alpha),
  // i.e. the energy reflection fraction exactly once — not (1 - alpha)^2.
  for (let b = 0; b < 6; b += 1) {
    const expectedEnergyContribution = north.distanceFactor ** 2 * 0.7;
    assert.ok(Math.abs(north.amplitudeByBand[b] ** 2 - expectedEnergyContribution) < 1e-9);
  }
});

test("direct path amplitude equals 1/d with no reflection factor", () => {
  const result = calculateFirstOrderReflections(symmetricInput, {
    resolveAbsorption: stubResolver,
  });
  const expected = 1 / result.direct.distanceMeters;
  assert.equal(result.direct.distanceFactor, expected);
  assert.deepEqual(result.direct.amplitudeByBand, [
    expected,
    expected,
    expected,
    expected,
    expected,
    expected,
  ]);
});
