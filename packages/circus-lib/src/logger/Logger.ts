export type LogLevel =
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal'
  | 'silent';

interface LogMethod {
  (message: string): void;
  (fields: Record<string, unknown>, message: string): void;
}

export default interface Logger {
  trace: LogMethod;
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  fatal: LogMethod;
  child(
    fields: Record<string, unknown>,
    options?: { level?: LogLevel }
  ): Logger;
}
