/**
 * Tiny, dependency-free SVG charts. Geometry lives in SVG attributes (not
 * inline styles), so the strict CSP needs no 'unsafe-inline'.
 */

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const width = 240;
  const height = 56;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => [i * step, height - 4 - (v / max) * (height - 10)] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="h-14 w-full overflow-visible" preserveAspectRatio="none">
      <polygon points={area} className="fill-accent/35" />
      <polyline points={line} fill="none" className="stroke-ink" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {last && <circle cx={last[0]} cy={last[1]} r={3} className="fill-ink" />}
    </svg>
  );
}

/** Horizontal proportion bars with labels and values (plans, countries). */
export function BarList({ items, total }: { items: Array<{ label: string; value: number; hint?: string }>; total?: number }) {
  const max = Math.max(1, total ?? Math.max(...items.map((i) => i.value)));
  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-ink">
              {item.label}
              {item.hint && <span className="ml-2 font-mono text-[11px] text-muted">{item.hint}</span>}
            </span>
            <span className="font-mono tabular text-ink-2">{item.value}</span>
          </div>
          <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="h-1.5 w-full" aria-hidden>
            <rect x={0} y={0} width={100} height={6} rx={3} className="fill-surface-2" />
            <rect x={0} y={0} width={Math.max(item.value > 0 ? 2 : 0, (item.value / max) * 100)} height={6} rx={3} className="fill-ink" />
          </svg>
        </li>
      ))}
    </ul>
  );
}
