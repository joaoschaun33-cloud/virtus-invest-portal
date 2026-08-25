import { Link } from "wouter";
import {
  Command,
  Moon,
  Search,
  Sun,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Radio,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { formatPercent, formatPrice, optionalNumberValue } from "@/lib/formatters";
import { VirtusBrand } from "@/components/VirtusBrand";

export function Panel({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"section">) {
  return (
    <section {...props} className={cn("glass-panel rounded-2xl", className)}>
      {children}
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-[-0.045em] text-balance sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AppTopBar({ title = "Visão geral" }: { title?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="sticky top-0 z-30 mb-7 flex items-center justify-between border-b border-border/50 bg-background/78 px-1 py-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-3">
        <VirtusBrand
          variant="wordmark"
          className="h-6 w-[88px] sm:h-7 sm:w-[112px]"
        />
        <span
          className="hidden h-5 w-px bg-border/70 sm:block"
          aria-hidden="true"
        />
        <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="hidden items-center gap-2 rounded-xl border border-border/70 bg-card/50 px-3 py-2 text-xs text-muted-foreground transition hover:bg-accent sm:flex"
          aria-label="Abrir busca de ativos"
          aria-keyshortcuts="Meta+K Control+K"
          onClick={() => window.dispatchEvent(new Event("virtus:command-open"))}
        >
          <Search className="h-3.5 w-3.5" /> Buscar ativo{" "}
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/50 text-muted-foreground transition hover:bg-accent"
          aria-label="Alternar tema"
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card/50 text-muted-foreground transition hover:bg-accent sm:hidden"
          aria-label="Abrir busca de ativos"
          aria-keyshortcuts="Meta+K Control+K"
          onClick={() => window.dispatchEvent(new Event("virtus:command-open"))}
        >
          <Command className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

export function LiveBadge({ label = "Dados ao vivo" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
      <Radio className="h-3 w-3" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      {label}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  change,
  currency,
  note,
  accent = "default",
  footer,
}: {
  label: string;
  value: unknown;
  change?: number | null;
  currency?: string;
  note?: string;
  accent?: "default" | "blue" | "green" | "orange";
  footer?: React.ReactNode;
}) {
  if (optionalNumberValue(value) === null) return null;
  const positive = Number(change) > 0;
  const negative = Number(change) < 0;
  return (
    <div
      className={cn(
        "metric-card",
        accent === "blue" && "bg-blue-500/[0.06]",
        accent === "green" && "bg-emerald-500/[0.06]",
        accent === "orange" && "bg-orange-500/[0.06]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {change !== undefined && change !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-semibold",
              positive &&
                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              negative && "bg-rose-500/10 text-rose-700 dark:text-rose-300",
              !positive && !negative && "bg-muted text-muted-foreground"
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : negative ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {formatPercent(change)}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
        {currency ? formatPrice(value, currency) : String(value)}
      </p>
      {note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}

export function AssetLink({
  ticker,
  name,
  price,
  change,
  currency = "BRL",
}: {
  ticker: string;
  name?: string;
  price?: unknown;
  change?: unknown;
  currency?: string;
}) {
  const numericChange = optionalNumberValue(change);
  return (
    <Link
      href={`/asset/${encodeURIComponent(ticker)}`}
      className="group flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition hover:bg-accent/70"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold tracking-tight group-hover:text-primary">
          {ticker}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {name || "Ativo"}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold">{formatPrice(price, currency)}</p>
        <p
          className={cn(
            "text-xs font-medium",
            numericChange === null
              ? "text-muted-foreground"
              : numericChange >= 0
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-rose-700 dark:text-rose-300"
          )}
        >
          {numericChange !== null && numericChange >= 0 ? "+" : ""}
          {formatPercent(change)}
        </p>
      </div>
    </Link>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-background/30 p-6 text-center">
      <VirtusBrand variant="symbol" className="mb-4 h-8 w-8 opacity-90" />
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
