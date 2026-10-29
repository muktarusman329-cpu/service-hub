import type { LoggerService } from "@nestjs/common";

const sensitiveKey = /password|token|authorization|cookie|secret|phone|email|nin|otp/i;
function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (value instanceof Error) return { name: value.name, message: clean(value.message), stack: clean(value.stack) };
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sensitiveKey.test(key) ? "[REDACTED]" : clean(item)]));
  }
  if (typeof value !== "string") return value;
  return value
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/\b\d{6}\b/g, "[CODE]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[EMAIL]")
    .replace(/(?:\+?234|0)[789]\d{9}/g, "[PHONE]");
}

export class StructuredLogger implements LoggerService {
  log(message: unknown, context?: string) { this.write("info", message, context); }
  error(message: unknown, trace?: string, context?: string) { this.write("error", message, context, trace); }
  warn(message: unknown, context?: string) { this.write("warn", message, context); }
  debug(message: unknown, context?: string) { this.write("debug", message, context); }
  verbose(message: unknown, context?: string) { this.write("trace", message, context); }
  fatal(message: unknown, context?: string) { this.write("fatal", message, context); }
  private write(level: string, message: unknown, context?: string, trace?: string) {
    const record = { timestamp: new Date().toISOString(), level, context, message: clean(message), ...(trace ? { trace: clean(trace) } : {}) };
    const output = JSON.stringify(record);
    if (level === "error" || level === "fatal") console.error(output); else if (level === "warn") console.warn(output); else console.log(output);
  }
}
