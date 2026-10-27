"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/components/ui/primitives";
import { percent, segmentPath } from "./scale";
import { ChartTooltip } from "./tooltip";
import { useWidth } from "./use-width";

export interface Segment {
  key: string;
  label: string;
  value: number;
  /** fill-* class for the mark */
  fill: string;
  /** bg-* class for legend swatch / tooltip key */
  swatch: string;
  /** Optional icon (status segments must carry one). */
  icon?: ReactNode;
}

const HEIGHT = 14;
const GAP = 2;

/**
 * Part-to-whole as one horizontal stacked bar: 2px surface gaps between
 * segments, square baseline, rounded data-end. Identity is never colour
 * alone: the legend lists every segment with value + share (and doubles as
 * the hover/focus target), and each segment has its own tooltip.
 */
export function StackedBar({ segments, unit }: { segments: Segment[]; unit: string }) {
  const { ref, width } = useWidth<HTMLDivElement>(360);
  const [active, setActive] = useState<string | null>(null);
  const total = segments.reduce((n, s) => n + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  const gaps = Math.max(0, visible.length - 1) * GAP;
  const usable = Math.max(0, width - gaps);

  const geometry = visible.reduce<Array<{ segment: Segment; x: number; w: number; last: boolean }>>((acc, s, i) => {
    const prev = acc[acc.length - 1];
    acc.push({
      segment: s,
      x: prev ? prev.x + prev.w + GAP : 0,
      w: total > 0 ? Math.max(2, (s.value / total) * usable) : 0,
      last: i === visible.length - 1,
    });
    return acc;
  }, []);
  const activeGeo = geometry.find((g) => g.segment.key === active);

  return (
    <div>
      <div ref={ref} className="relative">
        <svg viewBox={`0 0 ${width} ${HEIGHT}`} className="block h-3.5 w-full" role="img" aria-label={`Share of ${unit}`} onPointerLeave={() => setActive(null)}>
          {total === 0 && <rect x={0} y={0} width={width} height={HEIGHT} rx={4} className="fill-surface-2" />}
          {geometry.map((g) => (
            <path
              key={g.segment.key}
              d={segmentPath(g.x, 0, g.w, HEIGHT, g.last)}
              className={cn(g.segment.fill, "transition-opacity duration-150", active && active !== g.segment.key && "opacity-30")}
              onPointerEnter={() => setActive(g.segment.key)}
            />
          ))}
        </svg>
        {activeGeo && (
          <ChartTooltip
            x={activeGeo.x + activeGeo.w / 2}
            y={0}
            value={`${activeGeo.segment.value} ${unit}`}
            label={`${activeGeo.segment.label} · ${percent(activeGeo.segment.value, total)}`}
            keyClass={activeGeo.segment.swatch}
            align={activeGeo.x < 60 ? "start" : activeGeo.x + activeGeo.w > width - 60 ? "end" : "center"}
          />
        )}
      </div>

      <ul className="mt-4 space-y-1">
        {segments.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              onPointerEnter={() => setActive(s.key)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(s.key)}
              onBlur={() => setActive(null)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors duration-150 hover:bg-surface-2",
                active === s.key && "bg-surface-2",
              )}
            >
              <span aria-hidden className={cn("size-2.5 shrink-0 rounded-[3px]", s.swatch)} />
              {s.icon}
              <span className="min-w-0 flex-1 truncate text-ink">{s.label}</span>
              <span className="tabular font-medium text-ink">{s.value}</span>
              <span className="w-10 text-right tabular text-muted">{percent(s.value, total)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
