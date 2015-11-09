/**
 * prepare log4js object according to config.js
 *
 * usage:
 *  import logger = require('./Logger');
 *  logger.info('foo bar');
 */

import * as log4js from 'log4js';
let config: Configuration = require('config');

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
export { logger as default };
