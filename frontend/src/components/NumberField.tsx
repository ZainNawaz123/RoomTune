"use client";

import { useEffect, useRef, useState } from "react";

interface NumberFieldProps {
  label: string;
  value: number;
  unit?: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

/**
 * A numeric input that stays responsive while typing (so intermediate
 * strings like "0" or "" aren't fought by clamping) but only ever commits
 * finite, in-range values via `onChange`. The displayed text re-syncs to
 * the committed value on blur.
 */
export function NumberField({ label, value, unit, min, max, step = 0.1, onChange }: NumberFieldProps) {
  const [draft, setDraft] = useState(() => value.toFixed(2));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setDraft(value.toFixed(2));
    }
  }, [value]);

  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-neutral-400">{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={draft}
          onFocus={() => {
            isFocused.current = true;
          }}
          onChange={(event) => {
            const raw = event.target.value;
            setDraft(raw);
            const parsed = Number(raw);
            if (raw.trim() !== "" && Number.isFinite(parsed)) {
              onChange(parsed);
            }
          }}
          onBlur={() => {
            isFocused.current = false;
            setDraft(value.toFixed(2));
          }}
          className="w-20 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-right text-sm text-neutral-100 outline-none focus:border-accent"
        />
        {unit && <span className="w-4 text-sm text-neutral-500">{unit}</span>}
      </span>
    </label>
  );
}
