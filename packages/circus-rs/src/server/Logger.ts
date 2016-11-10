/**
 * prepare log4js object according to config.js
 *
 * usage:
 *  import logger = require('./Logger');
 *  logger.info('foo bar');
 */

import { Configuration } from './configuration';

import * as log4js from 'log4js';
const config: Configuration = require('./Config') as Configuration;

class Logger {
	public static prepareLogger(): log4js.Logger {
		let logConfig: any[] = null;
		if ('logs' in config && Array.isArray(config.logs)) {
			logConfig = config.logs;
		} else {
			logConfig = [
				{type: 'console'},
				{type: 'dateFile', filename: __dirname + '/../logs/debug.log', pattern: '-yyyyMMdd.log'}
			];
		}
		log4js.configure({appenders: logConfig});
		return log4js.getLogger();
	}
}

let logger = Logger.prepareLogger();
let shutdown = log4js.shutdown;
export { logger as default, shutdown };
