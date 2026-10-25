import type { AlgorithmConfig } from "./types";

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = stable(source[key]);
    }
    return sorted;
  }
  return value;
}

export function canonical(config: AlgorithmConfig): string {
  const { updatedAt: _updatedAt, status: _status, ...rest } = config;
  return JSON.stringify(stable(rest));
}
