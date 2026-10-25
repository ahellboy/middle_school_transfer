export function formatScore(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function signedScore(n: number): string {
  const text = formatScore(Math.abs(n));
  if (n > 0) return `+${text}`;
  if (n < 0) return `−${text}`;
  return "0";
}
