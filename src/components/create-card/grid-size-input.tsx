"use client";

import { useEffect, useId, useState } from "react";

export const GRID_SIZE_MIN = 2;
export const GRID_SIZE_MAX = 10;

function clampGridSize(value: number): number {
  if (Number.isNaN(value)) return GRID_SIZE_MIN;
  return Math.max(GRID_SIZE_MIN, Math.min(GRID_SIZE_MAX, value));
}

/** Champ numérique tolérant la saisie libre, borné au blur. */
export function GridSizeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-bold text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        className="input text-center"
        min={GRID_SIZE_MIN}
        max={GRID_SIZE_MAX}
        value={draft}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const parsed = parseInt(raw, 10);
          if (parsed >= GRID_SIZE_MIN && parsed <= GRID_SIZE_MAX) onChange(parsed);
        }}
        onBlur={() => {
          const next = clampGridSize(parseInt(draft, 10));
          setDraft(String(next));
          onChange(next);
        }}
      />
    </div>
  );
}
