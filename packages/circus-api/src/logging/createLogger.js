import * as log4js from 'log4js';
import * as path from 'path';

const logDir = path.resolve(__dirname, '../../store/logs');

export default function createLogger(category) {
	log4js.configure({
		appenders: {
			logFile: {
				type: 'dateFile',
				filename: path.join(logDir, 'circus-api.log'),
				keepFileExt: true,
				level: 'debug'
			},
			traceLog: {
				type: 'dateFile',
				filename: path.join(logDir, 'circus-api-trace.log'),
				keepFileExt: true,
				level: 'trace'
			},
			console: { type: 'console' },
			off: { type: 'logLevelFilter', appender: 'console', level: 'off' }
		},
		categories: {
			default: { appenders: ['logFile'], level: 'debug' },
			trace: { appenders: ['traceLog', 'logFile'], level: 'trace' },
			off: { appenders: ['off'], level: 'off' }
		}
	});
	const logger = log4js.getLogger(category);
	logger.level = 'debug';
	return logger;
}
