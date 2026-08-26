import assert from "node:assert/strict";
import { test } from "node:test";
import { createCsvAbsorptionResolver } from "./absorptionResolver.ts";
import { MaterialNotFoundError } from "./materials.ts";

test("resolves drywall_standard to the CSV alphas in ascending band order", () => {
  const resolve = createCsvAbsorptionResolver();
  assert.deepEqual(resolve("drywall_standard"), [0.3, 0.12, 0.08, 0.06, 0.06, 0.05]);
});

test("resolves vinyl_linoleum_floor alphas", () => {
  const resolve = createCsvAbsorptionResolver();
  assert.deepEqual(resolve("vinyl_linoleum_floor"), [0.02, 0.02, 0.03, 0.04, 0.04, 0.05]);
});

test("unknown material ids propagate MaterialNotFoundError", () => {
  const resolve = createCsvAbsorptionResolver();
  assert.throws(() => resolve("does_not_exist"), MaterialNotFoundError);
});
