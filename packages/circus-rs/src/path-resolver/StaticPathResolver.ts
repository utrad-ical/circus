import PathResolver = require('./PathResolver');
import path = require('path');
import fs = require('fs');
import crypto = require('crypto');

import logger = require('../Logger');

export = StaticPathResolver;

class StaticPathResolver extends PathResolver {
	public resolvePath(seriesUID: string, callback: (dir: string) => void): void {
		var dcmdir: string = null;
		if (this.config.useHash) {
			var hash = crypto.createHash('sha256');
			hash.update(seriesUID);
			var hashStr = hash.digest('hex');
			dcmdir = path.join(this.config.dataDir, hashStr.substring(0, 2), hashStr.substring(2, 4), seriesUID);
		} else {
			dcmdir = path.join(this.config.dataDir, seriesUID);
		}
		fs.exists(dcmdir, exists => {
			if (exists) {
				callback(dcmdir);
			} else {
				logger.info('not exists:' + dcmdir);
				callback(null);
			}
		});
	}
}
