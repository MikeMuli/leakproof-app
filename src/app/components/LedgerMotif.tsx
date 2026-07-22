/**
 * Abstract settlement-statement motif — stacked rows, one flagged in coral. Depicts
 * literally what the product does (find the one wrong line among many correct ones),
 * rather than a generic empty-box/illustration cliché.
 */
export default function LedgerMotif({ size = 64 }: { size?: number }) {
  const rows = [
    { w: 0.86, c: "var(--line-strong)" },
    { w: 0.62, c: "var(--line-strong)" },
    { w: 0.94, c: "var(--disputed)" },
    { w: 0.5, c: "var(--line-strong)" },
    { w: 0.74, c: "var(--line-strong)" },
  ];
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 64 48" fill="none" aria-hidden="true">
      {rows.map((r, i) => (
        <rect key={i} x={2} y={i * 9.5 + 2} width={r.w * 60} height={5} rx={2.5} fill={r.c} opacity={r.c === "var(--disputed)" ? 1 : 0.55} />
      ))}
    </svg>
  );
}
