interface ListenerIconProps {
  selected?: boolean;
}

/**
 * Top-down listening-position glyph: a center point with two flanking arcs,
 * suggesting a listener's ears/head. Symbolic only.
 */
export function ListenerIcon({ selected = false }: ListenerIconProps) {
  const colorClass = selected ? "fill-accent stroke-accent" : "fill-object-listener stroke-object-listener";

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
      <circle r={5.5} fillOpacity={0.25} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <path
        d="M -6 -8 A 12 12 0 0 0 -6 8"
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M 6 -8 A 12 12 0 0 1 6 8"
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}
