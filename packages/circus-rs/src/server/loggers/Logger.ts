export default class Logger {
	protected config: any = null;

	constructor(config: any) {
		this.config = config;
		this.initialize();
	}

	protected initialize(): void {
		// do nothing
	}

	public trace(any): void { /* do nothing */ }
	public debug(any): void { /* do nothing */ }
	public info(any): void { /* do nothing */ }
	public warn(any): void { /* do nothing */ }
	public error(any): void { /* do nothing */ }
	public fatal(any): void { /* do nothing */ }

	public shutdown(): Promise<void> {
		return Promise.resolve();
	}

}
