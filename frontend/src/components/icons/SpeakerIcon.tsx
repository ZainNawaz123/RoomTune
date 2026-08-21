interface SpeakerIconProps {
  selected?: boolean;
}

/**
 * Top-down speaker glyph: a cabinet with a driver and a couple of arcs
 * suggesting sound radiating outward. Purely decorative/symbolic — it does
 * not represent an actual physical footprint or directivity.
 */
export function SpeakerIcon({ selected = false }: SpeakerIconProps) {
  const colorClass = selected ? "fill-accent stroke-accent" : "fill-object-speaker stroke-object-speaker";

  return (
    <g className={colorClass}>
      {selected && (
        <circle
          r={16}
          fill="none"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <rect
        x={-8}
        y={-9}
        width={16}
        height={18}
        rx={2.5}
        fillOpacity={0.18}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={0} cy={-3.5} r={3} fill="none" strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
      <circle cx={0} cy={4.5} r={4.2} fill="none" strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
    </g>
  );
}
