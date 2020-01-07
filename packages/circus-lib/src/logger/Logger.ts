/**
 * Logger interface.
 */
export default interface Logger {
  trace(...args: any[]): void;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  fatal(...args: any[]): void;

  /**
   * Call this before exiting the program.
   */
  shutdown: () => Promise<void>;
}
