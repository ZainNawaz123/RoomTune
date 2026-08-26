/**
 * Acoustic material lookup and absorption interpolation.
 *
 * Scope: `materialId + frequencyHz -> alpha(f)` only. This module knows
 * nothing about reflection coefficients, attenuation, SPL, or impulse
 * responses — it purely resolves the absorption coefficient `alpha`
 * (dimensionless, 0 = fully reflective, 1 = fully absorptive) for a named
 * material at a requested frequency, from measured octave-band data in
 * `backend/data/roomtune_acoustic_materials.csv`.
 *
 * The CSV stores alpha at six measured bands: 125, 250, 500, 1000, 2000,
 * and 4000 Hz. Frequencies that don't land exactly on a measured band are
 * interpolated in log-frequency space between the two nearest bands;
 * frequencies outside the measured range are clamped to the nearest edge
 * band (see {@link getAbsorptionAt}).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One measured absorption coefficient at a specific frequency band. */
export interface AbsorptionBand {
  readonly frequencyHz: number;
  /** Absorption coefficient, 0 (fully reflective) to 1 (fully absorptive). */
  readonly alpha: number;
}

/** A single acoustic material and its measured absorption bands. */
export interface AcousticMaterial {
  /** Stable identifier used for lookup (the CSV's `material_id` column). */
  readonly materialId: string;
  readonly displayName: string;
  readonly category: string;
  /** Measured bands, sorted ascending by {@link AbsorptionBand.frequencyHz}. */
  readonly bands: readonly AbsorptionBand[];
}

/** The measured frequency bands present in the source CSV, ascending. */
export const MEASURED_BAND_FREQUENCIES_HZ = [125, 250, 500, 1000, 2000, 4000] as const;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Thrown when the materials CSV itself is missing, malformed, or fails validation. */
export class MaterialDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MaterialDataError";
  }
}

/** Thrown by {@link getMaterialById} when no material has the requested id. */
export class MaterialNotFoundError extends Error {
  readonly materialId: string;

  constructor(materialId: string, knownIds: readonly string[]) {
    super(
      `Unknown material id "${materialId}". Known ids: ${knownIds.length > 0 ? knownIds.join(", ") : "(none loaded)"}.`,
    );
    this.name = "MaterialNotFoundError";
    this.materialId = materialId;
  }
}

/** Thrown by {@link getAbsorptionAt} when the requested frequency is not usable. */
export class InvalidFrequencyError extends Error {
  readonly frequencyHz: unknown;

  constructor(frequencyHz: unknown) {
    super(`Invalid frequency ${String(frequencyHz)} Hz: must be a finite number greater than 0.`);
    this.name = "InvalidFrequencyError";
    this.frequencyHz = frequencyHz;
  }
}

// ---------------------------------------------------------------------------
// CSV loading
// ---------------------------------------------------------------------------

const DEFAULT_CSV_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "data",
  "roomtune_acoustic_materials.csv",
);

const REQUIRED_COLUMNS = ["material_id", "display_name", "category"] as const;

const BAND_COLUMNS: readonly { readonly column: string; readonly frequencyHz: number }[] =
  MEASURED_BAND_FREQUENCIES_HZ.map((frequencyHz) => ({
    column: `alpha_${frequencyHz}_hz`,
    frequencyHz,
  }));

const materialsCacheByPath = new Map<string, AcousticMaterial[]>();

/**
 * Loads and parses the acoustic materials CSV, validating every row.
 * Results are cached per resolved file path (the CSV is static data read
 * from disk; there's no reason to re-parse it on every call).
 */
export function loadMaterials(csvPath: string = DEFAULT_CSV_PATH): AcousticMaterial[] {
  const resolvedPath = path.resolve(csvPath);
  const cached = materialsCacheByPath.get(resolvedPath);
  if (cached) return cached;

  let csvText: string;
  try {
    csvText = readFileSync(resolvedPath, "utf8");
  } catch (error) {
    throw new MaterialDataError(
      `Could not read materials CSV at "${resolvedPath}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const materials = parseMaterialsCsv(csvText);
  materialsCacheByPath.set(resolvedPath, materials);
  return materials;
}

/**
 * Parses already-loaded CSV text into validated {@link AcousticMaterial}
 * records. Exposed separately from {@link loadMaterials} so callers can
 * test parsing/validation without touching the filesystem.
 *
 * Rows whose column count doesn't match the header (e.g. the trailing
 * single-cell footnote row in the current CSV) are treated as comments
 * and skipped, as are fully blank rows.
 */
export function parseMaterialsCsv(csvText: string): AcousticMaterial[] {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new MaterialDataError("Materials CSV is empty.");
  }

  const [header, ...dataRows] = rows;
  const columnIndex = new Map(header.map((name, index) => [name.trim(), index]));

  for (const column of REQUIRED_COLUMNS) {
    if (!columnIndex.has(column)) {
      throw new MaterialDataError(`Materials CSV is missing required column "${column}".`);
    }
  }
  for (const { column } of BAND_COLUMNS) {
    if (!columnIndex.has(column)) {
      throw new MaterialDataError(`Materials CSV is missing required column "${column}".`);
    }
  }

  const materials: AcousticMaterial[] = [];
  const seenIds = new Set<string>();

  dataRows.forEach((row, dataRowIndex) => {
    if (row.length !== header.length) return; // comment/footnote row, not data
    if (row.every((cell) => cell.trim() === "")) return; // blank line

    const rowNumber = dataRowIndex + 2; // +1 for the header row, +1 for 1-based numbering

    const materialId = readCell(row, columnIndex, "material_id").trim();
    if (materialId === "") {
      throw new MaterialDataError(`Materials CSV row ${rowNumber}: "material_id" is required.`);
    }
    if (seenIds.has(materialId)) {
      throw new MaterialDataError(`Materials CSV row ${rowNumber}: duplicate material_id "${materialId}".`);
    }
    seenIds.add(materialId);

    const displayName = readCell(row, columnIndex, "display_name").trim();
    const category = readCell(row, columnIndex, "category").trim();

    const bands: AbsorptionBand[] = BAND_COLUMNS.map(({ column, frequencyHz }) => {
      const raw = readCell(row, columnIndex, column).trim();
      const alpha = Number(raw);

      if (raw === "" || !Number.isFinite(alpha)) {
        throw new MaterialDataError(
          `Materials CSV row ${rowNumber} (${materialId}): "${column}" must be a finite number, received "${raw}".`,
        );
      }
      if (alpha < 0 || alpha > 1) {
        throw new MaterialDataError(
          `Materials CSV row ${rowNumber} (${materialId}): "${column}" alpha ${alpha} is outside the valid range [0, 1].`,
        );
      }

      return { frequencyHz, alpha };
    });

    materials.push({ materialId, displayName, category, bands });
  });

  return materials;
}

function readCell(row: readonly string[], columnIndex: ReadonlyMap<string, number>, column: string): string {
  const index = columnIndex.get(column);
  return index === undefined ? "" : row[index] ?? "";
}

/**
 * Minimal RFC 4180-style CSV parser: handles quoted fields (including
 * embedded commas and newlines) and `""` as an escaped quote. Deliberately
 * dependency-free since this module must stay small and self-contained.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // ignore; \n (below) terminates the line
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

/** Finds a material by its stable id. Throws {@link MaterialNotFoundError} if not found. */
export function getMaterialById(materials: readonly AcousticMaterial[], materialId: string): AcousticMaterial {
  const material = materials.find((candidate) => candidate.materialId === materialId);
  if (!material) {
    throw new MaterialNotFoundError(
      materialId,
      materials.map((candidate) => candidate.materialId),
    );
  }
  return material;
}

// ---------------------------------------------------------------------------
// Absorption at a requested frequency
// ---------------------------------------------------------------------------

/**
 * Returns the absorption coefficient `alpha` for `material` at
 * `frequencyHz`.
 *
 * - Exact matches to a measured band return the stored alpha directly.
 * - Frequencies at or below the lowest measured band (125 Hz) return that
 *   band's alpha; frequencies at or above the highest band (4000 Hz)
 *   return that band's alpha (edge clamping, no extrapolation).
 * - Frequencies between two measured bands are interpolated in
 *   log-frequency space:
 *     `r = (log2(f) - log2(f1)) / (log2(f2) - log2(f1))`
 *     `alpha(f) = alpha1 + r * (alpha2 - alpha1)`
 *
 * Throws {@link InvalidFrequencyError} for frequencies that are `<= 0`,
 * `NaN`, or infinite.
 */
export function getAbsorptionAt(material: AcousticMaterial, frequencyHz: number): number {
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) {
    throw new InvalidFrequencyError(frequencyHz);
  }

  const bands = material.bands;
  const lowestBand = bands[0];
  const highestBand = bands[bands.length - 1];

  if (frequencyHz <= lowestBand.frequencyHz) return lowestBand.alpha;
  if (frequencyHz >= highestBand.frequencyHz) return highestBand.alpha;

  for (let i = 0; i < bands.length - 1; i += 1) {
    const lower = bands[i];
    const upper = bands[i + 1];

    if (frequencyHz === lower.frequencyHz) return lower.alpha;
    if (frequencyHz === upper.frequencyHz) return upper.alpha;

    if (frequencyHz > lower.frequencyHz && frequencyHz < upper.frequencyHz) {
      return interpolateLogFrequency(lower, upper, frequencyHz);
    }
  }

  // Unreachable: the edge checks above guarantee frequencyHz falls within
  // [lowestBand, highestBand], so some pair above must have matched.
  throw new MaterialDataError(`Failed to locate absorption band for ${frequencyHz} Hz.`);
}

function interpolateLogFrequency(lower: AbsorptionBand, upper: AbsorptionBand, frequencyHz: number): number {
  const r = (Math.log2(frequencyHz) - Math.log2(lower.frequencyHz)) / (Math.log2(upper.frequencyHz) - Math.log2(lower.frequencyHz));
  return lower.alpha + r * (upper.alpha - lower.alpha);
}
