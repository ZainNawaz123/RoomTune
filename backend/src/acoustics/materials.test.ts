import assert from "node:assert/strict";
import { test } from "node:test";
import {
  InvalidFrequencyError,
  MaterialDataError,
  MaterialNotFoundError,
  getAbsorptionAt,
  getMaterialById,
  loadMaterials,
  parseMaterialsCsv,
} from "./materials.ts";

const MINIMAL_HEADER =
  "material_id,display_name,category,alpha_125_hz,alpha_250_hz,alpha_500_hz,alpha_1000_hz,alpha_2000_hz,alpha_4000_hz";

function csvWithRows(...rows: string[]): string {
  return [MINIMAL_HEADER, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// Loading the real CSV
// ---------------------------------------------------------------------------

test("loadMaterials loads and caches the real CSV", () => {
  const materials = loadMaterials();
  assert.ok(materials.length > 0);

  const drywall = getMaterialById(materials, "drywall_standard");
  assert.equal(drywall.displayName, "Drywall");
  assert.equal(drywall.category, "wall");
  assert.deepEqual(
    drywall.bands.map((band) => band.frequencyHz),
    [125, 250, 500, 1000, 2000, 4000],
  );
  assert.equal(getAbsorptionAt(drywall, 500), 0.08);

  // Calling again should return the same cached array instance.
  assert.equal(loadMaterials(), materials);
});

test("getMaterialById throws MaterialNotFoundError for an unknown id", () => {
  const materials = loadMaterials();
  assert.throws(() => getMaterialById(materials, "does_not_exist"), MaterialNotFoundError);
});

// ---------------------------------------------------------------------------
// Exact-band lookup and log-frequency interpolation
// ---------------------------------------------------------------------------

test("exact frequency matches return the stored alpha directly", () => {
  const [material] = parseMaterialsCsv(
    csvWithRows("m1,Material One,wall,0.10,0.20,0.30,0.40,0.50,0.60"),
  );

  for (const [frequencyHz, expected] of [
    [125, 0.1],
    [250, 0.2],
    [500, 0.3],
    [1000, 0.4],
    [2000, 0.5],
    [4000, 0.6],
  ] as const) {
    assert.equal(getAbsorptionAt(material, frequencyHz), expected);
  }
});

test("interpolates in log-frequency space between two bands", () => {
  const [material] = parseMaterialsCsv(
    csvWithRows("m1,Material One,wall,0.10,0.20,0.30,0.40,0.50,0.60"),
  );

  // Geometric mean of 250 and 500 Hz is the exact log-midpoint (r = 0.5).
  const midpoint = Math.sqrt(250 * 500);
  const expected = 0.2 + 0.5 * (0.3 - 0.2);
  assert.ok(Math.abs(getAbsorptionAt(material, midpoint) - expected) < 1e-9);
});

test("clamps to the 125 Hz band below the measured range", () => {
  const [material] = parseMaterialsCsv(
    csvWithRows("m1,Material One,wall,0.10,0.20,0.30,0.40,0.50,0.60"),
  );

  assert.equal(getAbsorptionAt(material, 20), 0.1);
  assert.equal(getAbsorptionAt(material, 125), 0.1);
});

test("clamps to the 4000 Hz band above the measured range", () => {
  const [material] = parseMaterialsCsv(
    csvWithRows("m1,Material One,wall,0.10,0.20,0.30,0.40,0.50,0.60"),
  );

  assert.equal(getAbsorptionAt(material, 4000), 0.6);
  assert.equal(getAbsorptionAt(material, 16000), 0.6);
});

test("rejects invalid frequencies", () => {
  const [material] = parseMaterialsCsv(
    csvWithRows("m1,Material One,wall,0.10,0.20,0.30,0.40,0.50,0.60"),
  );

  for (const badFrequency of [0, -100, NaN, Infinity, -Infinity]) {
    assert.throws(() => getAbsorptionAt(material, badFrequency), InvalidFrequencyError);
  }
});

// ---------------------------------------------------------------------------
// CSV parsing and validation
// ---------------------------------------------------------------------------

test("parses quoted fields with embedded commas", () => {
  const [material] = parseMaterialsCsv(
    csvWithRows('m1,"Material, With Comma",wall,0.1,0.1,0.1,0.1,0.1,0.1'),
  );
  assert.equal(material.displayName, "Material, With Comma");
});

test("skips rows whose column count doesn't match the header (e.g. footnotes)", () => {
  const materials = parseMaterialsCsv(
    csvWithRows(
      "m1,Material One,wall,0.1,0.1,0.1,0.1,0.1,0.1",
      '"Alpha = 0 (full reflectivity), Alpha = 1 (full absorption)"',
    ),
  );
  assert.equal(materials.length, 1);
});

test("rejects a CSV missing a required column", () => {
  const csv = "material_id,display_name,alpha_125_hz,alpha_250_hz,alpha_500_hz,alpha_1000_hz,alpha_2000_hz,alpha_4000_hz\n" +
    "m1,Material One,0.1,0.1,0.1,0.1,0.1,0.1";
  assert.throws(() => parseMaterialsCsv(csv), MaterialDataError);
});

test("rejects a non-numeric alpha value", () => {
  assert.throws(
    () => parseMaterialsCsv(csvWithRows("m1,Material One,wall,not-a-number,0.1,0.1,0.1,0.1,0.1")),
    MaterialDataError,
  );
});

test("rejects an alpha value outside [0, 1]", () => {
  assert.throws(
    () => parseMaterialsCsv(csvWithRows("m1,Material One,wall,1.5,0.1,0.1,0.1,0.1,0.1")),
    MaterialDataError,
  );
  assert.throws(
    () => parseMaterialsCsv(csvWithRows("m1,Material One,wall,-0.1,0.1,0.1,0.1,0.1,0.1")),
    MaterialDataError,
  );
});

test("rejects duplicate material ids", () => {
  assert.throws(
    () =>
      parseMaterialsCsv(
        csvWithRows(
          "dup,Material One,wall,0.1,0.1,0.1,0.1,0.1,0.1",
          "dup,Material Two,wall,0.2,0.2,0.2,0.2,0.2,0.2",
        ),
      ),
    MaterialDataError,
  );
});

test("rejects a missing material_id", () => {
  assert.throws(
    () => parseMaterialsCsv(csvWithRows(",Material One,wall,0.1,0.1,0.1,0.1,0.1,0.1")),
    MaterialDataError,
  );
});
