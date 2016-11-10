import Logger from './Logger';
import * as log4js from 'log4js';
import * as path from 'path';

export default class Log4JsLogger extends Logger {

	private logger: log4js.Logger;

	protected initialize(): void {
		let appenders: any = [{ type: 'console' }];
		if (this.config && Array.isArray(this.config.appenders)) {
			appenders = this.config.appenders;
		}
		log4js.configure({ appenders });
		this.logger = log4js.getLogger();
	}

	public trace(message?: any, ...optionalParams: any[]): void {
		this.logger.trace.apply(this.logger, arguments);
	}

	public debug(message?: any, ...optionalParams: any[]): void {
		this.logger.debug.apply(this.logger, arguments);
	}

	public info(message?: any, ...optionalParams: any[]): void {
		this.logger.info.apply(this.logger, arguments);
	}

	public warn(message?: any, ...optionalParams: any[]): void {
		this.logger.warn.apply(this.logger, arguments);
	}

	public error(message?: any, ...optionalParams: any[]): void {
		this.logger.error.apply(this.logger, arguments);
	}

	public fatal(message?: any, ...optionalParams: any[]): void {
		this.logger.fatal.apply(this.logger, arguments);
	}

	public shutdown(): Promise<void> {
		return new Promise(resolve => log4js.shutdown(resolve));
	}

}
