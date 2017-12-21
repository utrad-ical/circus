export default class Logger {
  protected config: any = null;

  constructor(config: any) {
    this.config = config;
    this.initialize();
  }

  protected initialize(): void {
    // do nothing
  }

  public trace(message?: any, ...optionalParams: any[]): void {
    /* do nothing */
  }
  public debug(message?: any, ...optionalParams: any[]): void {
    /* do nothing */
  }
  public info(message?: any, ...optionalParams: any[]): void {
    /* do nothing */
  }
  public warn(message?: any, ...optionalParams: any[]): void {
    /* do nothing */
  }
  public error(message?: any, ...optionalParams: any[]): void {
    /* do nothing */
  }
  public fatal(message?: any, ...optionalParams: any[]): void {
    /* do nothing */
  }

  public shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
