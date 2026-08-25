import type { DirectSoundView } from "@/lib/runDirectSound";

interface DirectSoundPanelProps {
  view: DirectSoundView;
}

/** Live readout of the speaker-to-listener direct path. */
export function DirectSoundPanel({ view }: DirectSoundPanelProps) {
  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Direct Sound
      </h2>
      {view.status === "ok" ? (
        <div className="flex flex-col gap-2">
          <dl className="flex flex-col gap-1 font-mono text-sm text-neutral-300">
            <div className="flex items-center justify-between">
              <dt className="text-neutral-500">Direct distance</dt>
              <dd>{view.result.directDistanceMeters.toFixed(2)} m</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-neutral-500">Arrival delay</dt>
              <dd>{view.result.propagationDelayMilliseconds.toFixed(2)} ms</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-neutral-500">Propagation time</dt>
              <dd>{view.result.propagationDelaySeconds.toFixed(5)} s</dd>
            </div>
          </dl>
          <p className="text-xs text-neutral-600">
            Heights assumed {view.assumedHeightMeters.toFixed(2)} m until 3D placement is
            available.
          </p>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">{view.message}</p>
      )}
    </section>
  );
}
