import { useMemo } from "react";

type ChartPoint = {
  time: Date | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  sma20: number | null;
  sma200: number | null;
  rsi14: number | null;
};

function pathFor(values: Array<number | null>, x: (index: number) => number, y: (value: number) => number) {
  let drawing = false;
  return values.map((value, index) => {
    if (value === null) {
      drawing = false;
      return "";
    }
    const command = drawing ? "L" : "M";
    drawing = true;
    return `${command}${x(index).toFixed(1)},${y(value).toFixed(1)}`;
  }).filter(Boolean).join(" ");
}

export function MarketChart({ data, mode = "line" }: { data: ChartPoint[]; mode?: "line" | "candle" }) {
  const geometry = useMemo(() => {
    const safeData = data.length ? data : [{ time: new Date(), open: 0, high: 1, low: 0, close: .5, volume: 0, sma20: .5, sma200: .5, rsi14: 50 }];
    const width = 900;
    const height = 310;
    const padding = { left: 16, right: 16, top: 20, bottom: 60 };
    const chartHeight = 220;
    const lows = safeData.map(point => point.low);
    const highs = safeData.map(point => point.high);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const range = Math.max(max - min, Math.abs(max) * 0.04, 1);
    const x = (index: number) => padding.left + (index / Math.max(1, safeData.length - 1)) * (width - padding.left - padding.right);
    const y = (value: number) => padding.top + (1 - (value - (min - range * .08)) / (range * 1.16)) * chartHeight;
    const maxVolume = Math.max(...safeData.map(point => point.volume ?? 0), 1);
    return { safeData, width, height, padding, chartHeight, x, y, min, max, maxVolume };
  }, [data]);

  const { safeData, width, height, padding, chartHeight, x, y, min, max, maxVolume } = geometry;
  const visible = safeData.length > 160 ? safeData.slice(-160) : safeData;
  const candleWidth = Math.max(2.5, Math.min(10, (width - padding.left - padding.right) / visible.length * .58));
  const closes = visible.map(point => point.close);
  const sma20 = visible.map(point => point.sma20);
  const sma200 = visible.map(point => point.sma200);
  const rsiPath = visible.map(point => point.rsi14 === null ? null : 274 - (point.rsi14 / 100) * 28);

  return (
    <div className="w-full overflow-hidden rounded-xl bg-background/35 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-h-[240px] w-full" role="img" aria-label={`Gráfico ${mode === "candle" ? "candlestick" : "de linha"} com médias móveis`}>
        <defs>
          <linearGradient id="apexArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity=".24" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="apexVolume" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity=".35" />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity=".04" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map(row => {
          const lineY = padding.top + (chartHeight / 3) * row;
          return <line key={row} x1={padding.left} x2={width - padding.right} y1={lineY} y2={lineY} stroke="currentColor" strokeOpacity=".08" strokeDasharray="3 5" />;
        })}
        <path d={`${pathFor(closes, x, y)} L${x(visible.length - 1)},${padding.top + chartHeight} L${x(0)},${padding.top + chartHeight} Z`} fill="url(#apexArea)" />
        {mode === "candle" ? visible.map((point, index) => {
          const rising = point.close >= point.open;
          const candleTop = y(Math.max(point.open, point.close));
          const candleBottom = y(Math.min(point.open, point.close));
          const color = rising ? "var(--chart-2)" : "var(--destructive)";
          return (
            <g key={`${point.time}-${index}`}>
              <line x1={x(index)} x2={x(index)} y1={y(point.high)} y2={y(point.low)} stroke={color} strokeWidth="1.2" />
              <rect x={x(index) - candleWidth / 2} y={candleTop} width={candleWidth} height={Math.max(1.8, candleBottom - candleTop)} rx="1.5" fill={rising ? color : "transparent"} stroke={color} strokeWidth="1.2" />
            </g>
          );
        }) : <path d={pathFor(closes, x, y)} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        <path d={pathFor(sma20, x, y)} fill="none" stroke="var(--chart-3)" strokeOpacity=".92" strokeWidth="1.4" />
        <path d={pathFor(sma200, x, y)} fill="none" stroke="var(--chart-4)" strokeOpacity=".86" strokeWidth="1.4" strokeDasharray="5 4" />
        {visible.map((point, index) => point.volume === null ? null : <rect key={`v-${point.time}-${index}`} x={x(index) - candleWidth / 2} y={height - padding.bottom - (point.volume / maxVolume) * 42} width={candleWidth} height={(point.volume / maxVolume) * 42} fill="url(#apexVolume)" rx="1" />)}
        <line x1={padding.left} x2={width - padding.right} y1="274" y2="274" stroke="currentColor" strokeOpacity=".14" />
        <path d={pathFor(rsiPath, x, value => value)} fill="none" stroke="var(--chart-5)" strokeWidth="1.5" />
        <text x={padding.left} y={height - 12} className="fill-muted-foreground text-[10px]">RSI 14</text>
        <text x={width - padding.right} y={padding.top + 10} textAnchor="end" className="fill-muted-foreground text-[10px]">máx {max.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</text>
        <text x={width - padding.right} y={padding.top + chartHeight - 4} textAnchor="end" className="fill-muted-foreground text-[10px]">mín {min.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</text>
      </svg>
      <div className="flex flex-wrap items-center gap-4 px-3 pb-1 pt-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-primary" /> Fechamento</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[var(--chart-3)]" /> MM20</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-[var(--chart-4)]" /> MM200</span>
        <span className="ml-auto">Volume · RSI 14</span>
      </div>
    </div>
  );
}
