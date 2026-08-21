import { useMemo } from "react";

interface SparklineProps {
  changePercent?: number | string | null;
  seed?: string | number;
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  changePercent = 0,
  seed = "sparkline",
  width = 68,
  height = 24,
  className = "",
}: SparklineProps) {
  const numericChange = Number(changePercent) || 0;
  const isPositive = numericChange >= 0;

  const points = useMemo(() => {
    // Generate deterministic 7-point curve based on changePercent and seed
    const strSeed = String(seed);
    let hash = 0;
    for (let i = 0; i < strSeed.length; i += 1) {
      hash = (hash << 5) - hash + strSeed.charCodeAt(i);
      hash |= 0;
    }

    const numPoints = 7;
    const values: number[] = [];
    let current = 100;
    values.push(current);

    const stepChange = numericChange / (numPoints - 1);
    for (let i = 1; i < numPoints; i += 1) {
      const pseudoRandom = Math.sin((hash + i) * 1.7) * 0.4;
      current += stepChange + pseudoRandom;
      values.push(current);
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const padY = 3;
    const padX = 2;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;

    return values.map((val, idx) => {
      const x = padX + (idx / (numPoints - 1)) * usableW;
      const y = height - padY - ((val - min) / range) * usableH;
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    });
  }, [seed, width, height, numericChange]);

  const pathD = useMemo(() => {
    if (!points.length) return "";
    return points.reduce(
      (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
      ""
    );
  }, [points]);

  const fillD = useMemo(() => {
    if (!points.length) return "";
    const first = points[0];
    const last = points[points.length - 1];
    return `${pathD} L ${last.x} ${height} L ${first.x} ${height} Z`;
  }, [pathD, points, height]);

  const strokeColor = isPositive ? "text-emerald-500" : "text-rose-500";
  const gradientId = `spark-grad-${String(seed).replace(/[^a-zA-Z0-9]/g, "")}-${isPositive ? "pos" : "neg"}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`shrink-0 overflow-visible ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={isPositive ? "rgb(16, 185, 129)" : "rgb(244, 63, 94)"}
            stopOpacity="0.28"
          />
          <stop
            offset="100%"
            stopColor={isPositive ? "rgb(16, 185, 129)" : "rgb(244, 63, 94)"}
            stopOpacity="0.0"
          />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradientId})`} />
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokeColor}
      />
    </svg>
  );
}
