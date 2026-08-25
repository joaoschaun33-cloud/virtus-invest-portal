type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return error;
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service: "virtus",
    environment: process.env.NODE_ENV ?? "development",
    message,
    ...context,
  };
  const serialized = JSON.stringify(payload, (_key, value) =>
    value instanceof Error ? normalizeError(value) : value
  );
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export const logger = {
  info(message: string, context?: LogContext) {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    write("warn", message, context);
  },
  error(message: string, error?: unknown, context: LogContext = {}) {
    write("error", message, { ...context, error: normalizeError(error) });
  },
};
