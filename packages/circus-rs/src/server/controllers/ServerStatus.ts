import * as express from 'express';
import Logger from "../loggers/Logger";
import AsyncLruCache from '../../common/AsyncLruCache';
import DicomVolume from '../../common/DicomVolume';
import ImageEncoder from '../image-encoders/ImageEncoder';

const startUpTime: Date = new Date(); // The time this module was loaded

export function execute(
	logger: Logger, reader: AsyncLruCache<DicomVolume>, imageEncoder: ImageEncoder
): express.RequestHandler {
	return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
		const status = {
			status: 'Running',
			dicomReader: {
				count: reader.length,
				size: reader.getTotalSize()
			},
			process: {
				memoryUsage: process.memoryUsage(),
				upTime: process.uptime(),
				upSince: startUpTime.toISOString()
			},
			counter: req.app.locals.counter.getCounts(),
			loadedModules: req.app.locals.loadedModuleNames,
			authorization: { enabled: req.app.locals.authorizationEnabled }
		};
		res.json(status);
	};
}
