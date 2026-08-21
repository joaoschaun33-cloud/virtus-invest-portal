import { formatCompact, formatPercent } from "@/lib/formatters";

type FinancialPoint = {
  label: string;
  periodEnd: string;
  revenue: number;
  netIncome: number | null;
  netMargin: number | null;
};

export function FinancialHistoryChart({ data }: { data: FinancialPoint[] }) {
  const points = data.slice(-8);
  const width = 820;
  const height = 300;
  const padding = { left: 50, right: 24, top: 30, bottom: 58 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;
  const values = points.flatMap(point => [point.revenue, point.netIncome ?? 0]);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(1, ...values);
  const range = Math.max(1, maxValue - minValue);
  const y = (value: number) => padding.top + ((maxValue - value) / range) * chartHeight;
  const baseline = y(0);
  const groupWidth = chartWidth / Math.max(points.length, 1);
  const barWidth = Math.min(28, groupWidth * 0.26);
  const margins = points.map(point => point.netMargin).filter((value): value is number => value !== null);
  const marginMin = Math.min(0, ...margins);
  const marginMax = Math.max(1, ...margins);
  const marginRange = Math.max(1, marginMax - marginMin);
  const marginY = (value: number) =>
    padding.top + ((marginMax - value) / marginRange) * chartHeight;
  const x = (index: number) => padding.left + groupWidth * index + groupWidth / 2;
  let hasMarginPoint = false;
  const marginPath = points
    .map((point, index) => {
      if (point.netMargin === null) return null;
      const command = hasMarginPoint ? "L" : "M";
      hasMarginPoint = true;
      return `${command}${x(index).toFixed(1)},${marginY(point.netMargin).toFixed(1)}`;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <div className="overflow-hidden rounded-xl bg-background/35 p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto min-h-[250px] w-full"
        role="img"
        aria-label="Evolução trimestral de receita, lucro líquido e margem líquida"
      >
        {[0, 1, 2, 3].map(row => {
          const gridY = padding.top + (chartHeight / 3) * row;
          return (
            <line
              key={row}
              x1={padding.left}
              x2={width - padding.right}
              y1={gridY}
              y2={gridY}
              stroke="currentColor"
              strokeOpacity=".09"
              strokeDasharray="3 5"
            />
          );
        })}
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={baseline}
          y2={baseline}
          stroke="currentColor"
          strokeOpacity=".24"
        />
        {points.map((point, index) => {
          const center = x(index);
          const revenueY = y(point.revenue);
          const incomeY = point.netIncome === null ? baseline : y(point.netIncome);
          return (
            <g key={point.periodEnd}>
              <rect
                x={center - barWidth - 2}
                y={Math.min(revenueY, baseline)}
                width={barWidth}
                height={Math.max(1, Math.abs(baseline - revenueY))}
                rx="4"
                fill="var(--primary)"
                opacity=".82"
              />
              {point.netIncome !== null && (
                <rect
                  x={center + 2}
                  y={Math.min(incomeY, baseline)}
                  width={barWidth}
                  height={Math.max(1, Math.abs(baseline - incomeY))}
                  rx="4"
                  fill="var(--chart-3)"
                  opacity=".9"
                />
              )}
              <text
                x={center}
                y={height - 25}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {point.label}
              </text>
            </g>
          );
        })}
        {marginPath && (
          <path
            d={marginPath}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {points.map((point, index) =>
          point.netMargin === null ? null : (
            <circle
              key={`margin-${point.periodEnd}`}
              cx={x(index)}
              cy={marginY(point.netMargin)}
              r="3.5"
              fill="var(--background)"
              stroke="var(--foreground)"
              strokeWidth="2"
            />
          )
        )}
      </svg>
      <div className="flex flex-wrap items-center gap-4 px-3 pb-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-sm bg-primary" /> Receita
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-sm bg-[var(--chart-3)]" /> Lucro líquido
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-0.5 w-3 bg-foreground" /> Margem líquida
        </span>
      </div>
      <table className="sr-only">
        <caption>Valores trimestrais oficiais apresentados no gráfico</caption>
        <thead>
          <tr><th>Período</th><th>Receita</th><th>Lucro líquido</th><th>Margem</th></tr>
        </thead>
        <tbody>
          {points.map(point => (
            <tr key={`table-${point.periodEnd}`}>
              <td>{point.label}</td>
              <td>{formatCompact(point.revenue)}</td>
              <td>{point.netIncome === null ? "não disponível" : formatCompact(point.netIncome)}</td>
              <td>{point.netMargin === null ? "não disponível" : formatPercent(point.netMargin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
