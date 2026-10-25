import type { ReactNode } from "react";

export function NumberField({
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <input
      className="num"
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={min}
      max={max}
      onChange={(event) => {
        const next = Number(event.target.value);
        if (Number.isFinite(next)) onChange(next);
      }}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
