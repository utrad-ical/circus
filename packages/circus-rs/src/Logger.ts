/// <reference path="typings/log4js/log4js.d.ts" />
/**
 * prepare log4js object according to config.js
 *
 * usage:
 *  import Logger = require('./Logger');
 *  var logger = Logger.prepareLogger();
 *
 *  logger.info('foo bar');
 */

var argv = require('minimist')(process.argv.slice(2));

var configFile = typeof argv.config === 'string' ? argv.config : '../config';
var config: any = require(configFile);

import log4js = require('log4js');

export = Logger;

class Logger {
	public static prepareLogger(): log4js.Logger {
		var logConfig: any[] = null;
		if ('logs' in config && Array.isArray(config.logs)) {
			logConfig = config.logs;
		} else {
			logConfig = [
				{type: 'console'},
				{type: 'dateFile', filename: 'logs/debug.log', pattern: '-yyyyMMdd.log'}
			];
		}
		log4js.configure({appenders: logConfig});
		return log4js.getLogger();
	}
}
