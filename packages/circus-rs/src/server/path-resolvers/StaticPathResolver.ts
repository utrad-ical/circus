import PathResolver from './PathResolver';
import * as path from 'path';
import * as crypto from 'crypto';
import { Promise } from 'es6-promise';
import logger from '../Logger';

export default class StaticPathResolver extends PathResolver {
	public resolvePath(seriesUID: string): Promise<string> {
		var dcmdir: string = null;
		if (this.config.useHash) {
			var hash = crypto.createHash('sha256');
			hash.update(seriesUID);
			var hashStr = hash.digest('hex');
			dcmdir = path.join(this.config.dataDir, hashStr.substring(0, 2), hashStr.substring(2, 4), seriesUID);
		} else {
			dcmdir = path.join(this.config.dataDir, seriesUID);
		}
		return new Promise<string>((resolve: (string) => void, reject) => {
			setTimeout(() => resolve(dcmdir), 0);
		});
	}
}
