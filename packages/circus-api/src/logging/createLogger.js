import * as log4js from 'log4js';
import * as path from 'path';

const logDir = path.resolve(__dirname, '../../store/logs');

export default function createLogger(category) {
	log4js.configure({
		appenders: {
			errorLog: {
				type: 'dateFile',
				filename: path.join(logDir, 'circus-api-error.log'),
				keepFileExt: true,
			},
			errorFilter: { type: 'loglevelFilter', appender: 'errorLog', level: 'error' },
			traceLog: {
				type: 'dateFile',
				filename: path.join(logDir, 'circus-api-trace.log'),
				keepFileExt: true,
			},
			console: { type: 'console' },
			off: { type: 'logLevelFilter', appender: 'console', level: 'off' }
		},
		categories: {
			default: { appenders: ['errorLog'], level: 'error' },
			trace: { appenders: ['traceLog', 'errorFilter'], level: 'trace' },
			off: { appenders: ['off'], level: 'off' }
		}
	});
	const logger = log4js.getLogger(category);
	// logger.level = 'debug';
	return logger;
}
