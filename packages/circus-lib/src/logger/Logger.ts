/**
 * Logger interface compatible with log4js.
 */
export default interface Logger {
  trace(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  fatal(message: string, ...args: any[]): void;

  /**
   * Flushes the log before exiting the program.
   */
  shutdown?: () => Promise<any>;
}
