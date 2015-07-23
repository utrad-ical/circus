/**
 * prepare log4js object according to config.js
 *
 * usage:
 *  import logger = require('./Logger');
 *  logger.info('foo bar');
 */

import Configuration = require('./Configuration');
import log4js = require('log4js');
var config: Configuration = require('config');

class Logger {
	public static prepareLogger(): log4js.Logger {
		var logConfig: any[] = null;
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

var logger = Logger.prepareLogger();
export { logger as default };