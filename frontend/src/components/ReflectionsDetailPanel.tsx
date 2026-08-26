import {
  BAND_FREQUENCIES_HZ,
  type BandValues,
  type DirectPropagationPath,
  type ReflectionPropagationPath,
} from "@roomtune/simulation";
import type { FirstOrderReflectionsView } from "@/lib/runFirstOrderReflections";

interface ReflectionsDetailPanelProps {
  view: FirstOrderReflectionsView;
}

const BAND_LABELS = BAND_FREQUENCIES_HZ.map((hz) =>
  hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`,
);

function formatBandRow(values: BandValues, digits = 4): string[] {
  return values.map((value) => value.toFixed(digits));
}

function PathAmplitudeRows({
  label,
  materialId,
  distanceMeters,
  delayMilliseconds,
  distanceFactor,
  energyReflectionCoefficientByBand,
  amplitudeByBand,
}: {
  label: string;
  materialId?: string;
  distanceMeters: number;
  delayMilliseconds: number;
  distanceFactor: number;
  energyReflectionCoefficientByBand?: BandValues;
  amplitudeByBand: BandValues;
}) {
  return (
    <tr className="border-t border-neutral-800 align-top">
      <td className="sticky left-0 bg-neutral-950 py-2 pr-3 font-medium text-neutral-200">
        {label}
        {materialId ? (
          <div className="mt-0.5 font-mono text-[10px] font-normal text-neutral-500">
            {materialId}
          </div>
        ) : null}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums">{distanceMeters.toFixed(3)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{delayMilliseconds.toFixed(2)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{distanceFactor.toFixed(4)}</td>
      {energyReflectionCoefficientByBand
        ? formatBandRow(energyReflectionCoefficientByBand).map((cell, index) => (
            <td key={`r-${index}`} className="py-2 pr-3 text-right tabular-nums text-neutral-400">
              {cell}
            </td>
          ))
        : BAND_LABELS.map((_, index) => (
            <td key={`r-${index}`} className="py-2 pr-3 text-right tabular-nums text-neutral-600">
              —
            </td>
          ))}
      {formatBandRow(amplitudeByBand).map((cell, index) => (
        <td key={`a-${index}`} className="py-2 pr-3 text-right tabular-nums text-neutral-200">
          {cell}
        </td>
      ))}
    </tr>
  );
}

function TotalsTable({
  energy,
  amplitude,
}: {
  energy: BandValues;
  amplitude: BandValues;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left text-xs">
        <thead>
          <tr className="text-neutral-500">
            <th className="pb-2 pr-3 font-medium">Summing</th>
            {BAND_LABELS.map((label) => (
              <th key={label} className="pb-2 pr-3 text-right font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono text-neutral-300">
          <tr className="border-t border-neutral-800">
            <td className="py-2 pr-3 text-neutral-400">Energy (Σ a²)</td>
            {formatBandRow(energy).map((cell, index) => (
              <td key={index} className="py-2 pr-3 text-right tabular-nums">
                {cell}
              </td>
            ))}
          </tr>
          <tr className="border-t border-neutral-800">
            <td className="py-2 pr-3 text-neutral-200">Amplitude √(Σ a²)</td>
            {formatBandRow(amplitude).map((cell, index) => (
              <td key={index} className="py-2 pr-3 text-right tabular-nums text-neutral-100">
                {cell}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PathsTable({
  direct,
  reflections,
}: {
  direct: DirectPropagationPath;
  reflections: ReflectionPropagationPath[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
        <thead>
          <tr className="text-neutral-500">
            <th className="sticky left-0 bg-neutral-950 pb-2 pr-3 font-medium">Path</th>
            <th className="pb-2 pr-3 text-right font-medium">Distance (m)</th>
            <th className="pb-2 pr-3 text-right font-medium">Delay (ms)</th>
            <th className="pb-2 pr-3 text-right font-medium">1/d</th>
            {BAND_LABELS.map((label) => (
              <th key={`rf-${label}`} className="pb-2 pr-3 text-right font-medium">
                R {label}
              </th>
            ))}
            {BAND_LABELS.map((label) => (
              <th key={`amp-${label}`} className="pb-2 pr-3 text-right font-medium">
                A {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono text-neutral-300">
          <PathAmplitudeRows
            label="Direct"
            distanceMeters={direct.distanceMeters}
            delayMilliseconds={direct.delayMilliseconds}
            distanceFactor={direct.distanceFactor}
            amplitudeByBand={direct.amplitudeByBand}
          />
          {reflections.map((path) => (
            <PathAmplitudeRows
              key={path.surface}
              label={path.surface}
              materialId={path.materialId}
              distanceMeters={path.distanceMeters}
              delayMilliseconds={path.delayMilliseconds}
              distanceFactor={path.distanceFactor}
              energyReflectionCoefficientByBand={path.energyReflectionCoefficientByBand}
              amplitudeByBand={path.amplitudeByBand}
            />
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-neutral-600">
        R = energy reflection coefficient (1 − α) per band. A = pressure amplitude = (1/d) ×
        √R (direct uses R = 1).
      </p>
    </div>
  );
}

function ReflectionHitsTable({ reflections }: { reflections: ReflectionPropagationPath[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <thead>
          <tr className="text-neutral-500">
            <th className="pb-2 pr-3 font-medium">Surface</th>
            <th className="pb-2 pr-3 text-right font-medium">Hit x (m)</th>
            <th className="pb-2 pr-3 text-right font-medium">Hit y (m)</th>
            <th className="pb-2 pr-3 text-right font-medium">Hit z (m)</th>
            <th className="pb-2 pr-3 text-right font-medium">Image x</th>
            <th className="pb-2 pr-3 text-right font-medium">Image y</th>
            <th className="pb-2 pr-3 text-right font-medium">Image z</th>
          </tr>
        </thead>
        <tbody className="font-mono text-neutral-300">
          {reflections.map((path) => (
            <tr key={path.surface} className="border-t border-neutral-800">
              <td className="py-2 pr-3 capitalize text-neutral-200">{path.surface}</td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {path.reflectionPoint.x.toFixed(3)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {path.reflectionPoint.y.toFixed(3)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {path.reflectionPoint.z.toFixed(3)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {path.imageSourcePosition.x.toFixed(3)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {path.imageSourcePosition.y.toFixed(3)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {path.imageSourcePosition.z.toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Expandable debug-style readout of first-order reflection engine output. */
export function ReflectionsDetailPanel({ view }: ReflectionsDetailPanelProps) {
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        First-order reflections
      </h2>
      <p className="mb-4 text-xs text-neutral-600">
        Direct path plus six single-bounce image sources. Band totals use energy summing.
      </p>

      {view.status === "ok" ? (
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Energy-summed totals
            </h3>
            <TotalsTable
              energy={view.result.totalEnergyByBand}
              amplitude={view.result.totalAmplitudeByBand}
            />
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Paths (7 × 6 bands)
            </h3>
            <PathsTable direct={view.result.direct} reflections={view.result.reflections} />
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Reflection / image points
            </h3>
            <ReflectionHitsTable reflections={view.result.reflections} />
          </div>

          <p className="text-xs text-neutral-600">
            Heights assumed {view.assumedHeightMeters.toFixed(2)} m. Defaults: drywall walls &amp;
            ceiling, vinyl/linoleum floor.
          </p>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">{view.message}</p>
      )}
    </section>
  );
}
